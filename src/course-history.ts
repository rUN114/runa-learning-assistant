// 借鉴 OCS 的目录任务组织和逐题 upsert 思路；持久恢复独立实现，不保留旧文档操作目标。
function courseRouteMode(settings: CourseSettings): string {
  return [settings.video, settings.answer, settings.videoAnswer, settings.workAction].join(':');
}

function nextCourseChapter(chapters: CourseChapter[], current: string, visited: string[]): CourseChapter {
  const index = chapters.findIndex(chapter => chapter.id === current);
  if (index < 0) return null;
  // 从当前节向后，再检查前面的章节；目录 √ 不参与测验完成判断。
  return [...chapters.slice(index + 1), ...chapters.slice(0, index)]
    .find(chapter => !chapter.locked && !visited.includes(chapter.id)) || null;
}

function recordQuestion(state: CourseState, key: string, q: CourseQuestion, patch: Partial<QuestionRecord> = {}): QuestionRecord {
  const records = state.questionRecords ||= {};
  const record = records[key] ||= { key, pageKey: state.pageKey, text: q.text.slice(0, 6000),
    options: (q.options || []).slice(0, 26).map(option => ({ letter: option.letter, text: option.text.slice(0, 1000) })),
    type: q.type || 'unsupported', isVideo: q.isVideo, status: 'detected', updatedAt: Date.now(), attempts: [] };
  const actualChoices = (q.options || []).filter(option => option.selected).map(option => option.letter);
  const options = (q.options || []).slice(0, 26).map(option => ({ letter: option.letter, text: option.text.slice(0, 1000) }));
  const changed = Object.entries(patch).some(([field, value]) => JSON.stringify(record[field as keyof QuestionRecord]) !== JSON.stringify(value)) ||
    JSON.stringify(record.actualChoices) !== JSON.stringify(actualChoices) || JSON.stringify(record.options) !== JSON.stringify(options);
  Object.assign(record, patch, { actualChoices, options });
  if(q.matching){record.matching=q.matching.slice(0,26).map(row=>({label:row.label.slice(0,1000),selected:row.selected.slice(0,100),choices:row.choices.slice(0,26).map(choice=>({value:choice.value.slice(0,100),text:choice.text.slice(0,1000)}))}));record.actualMatches=q.matching.map(row=>row.selected);}
  if (changed) record.updatedAt = Date.now();
  // 保留最近 200 道题；不作为答案缓存，不据此跳过新页面的题目。
  for (const id of Object.keys(records).slice(0, Math.max(0, Object.keys(records).length - 200))) delete records[id];
  return record;
}

function recordDecision(record: QuestionRecord, decision: AnswerDecision): void {
  const shortAnswer = (answer: ModelAnswer): ModelAnswer => answer ? { uncertain: answer.uncertain, verdict: answer.verdict,
    choices: answer.choices, matches: answer.matches, blanks: answer.blanks?.map(value => value.slice(0, 6000)), text: answer.text?.slice(0, 6000),
    reason: answer.reason?.slice(0, 1000), verified: answer.verified } : null;
  record.answer = shortAnswer(decision.answer);
  record.reason = (decision.reason || decision.answer?.reason || '').slice(0, 1000);
  record.updatedAt = Date.now();
  record.attempts.push({ at: Date.now(), answer: record.answer, singleModel: !!decision.singleModel, options: record.options.map(option => ({ ...option })),matching:record.matching,
    reason: record.reason, votes: (decision.votes || []).map(vote => ({ ...shortAnswer(vote as ModelAnswer),
      model: vote.model, error: vote.error?.slice(0, 500) })) });
  record.attempts = record.attempts.slice(-2);
}

function courseCheckpointKey(scope: string, url: string): string {
  // cpi 存在时区分同一课程的不同学生；仅存于扩展本地可信存储。
  return 'course-checkpoint:' + encodeURIComponent(scope + '&student=' + (new URL(url).searchParams.get('cpi') || ''));
}

function chapterUrl(currentUrl: string, chapterId: string): string {
  const url = new URL(currentUrl);
  if (!/^\d{1,30}$/.test(chapterId)) throw new Error('无法识别要恢复的章节。');
  url.searchParams.set(url.searchParams.has('knowledgeid') && !url.searchParams.has('chapterId') ? 'knowledgeid' : 'chapterId', chapterId);
  return url.href;
}

const persistedCheckpoints = new Map<string, string>();
async function persistCourse(state: CourseState): Promise<void> {
  if (!state.scope || !state.checkpointKey) return;
  const pending = Object.fromEntries(Object.entries(state.pending || {}).map(([id, item]) => {
    const { url: _url, ...data } = item; return [id, data];
  }));
  // 不持久化 frameId、documentId、待确认请求、运行标志或原始带签名 URL。
  const checkpoint: CourseCheckpoint = { schema: 1, at: Date.now(), scope: state.scope, pageKey: state.retryTarget?.pageKey || state.pageKey, settings: state.settings,
    phase: state.phase, answered: state.answered, pending, questionRecords: state.questionRecords || {},
    logs: state.logs, route: state.route, discussionRecords:state.discussionRecords||{},active: state.resumeTarget?.active ?? state.retryTarget?.active ?? state.currentActive,
    uncertainAction: state.waiting && !state.waiting.video ? { kind: state.waiting.save ? 'save' : 'submit', pageKey: state.pageKey } : state.uncertainAction };
  const content = JSON.stringify({ ...checkpoint, at: 0 });
  if (persistedCheckpoints.get(state.checkpointKey) === content) { state.historyWarning = ''; return; }
  try { await chrome.storage.local.set({ [state.checkpointKey]: checkpoint }); persistedCheckpoints.set(state.checkpointKey, content); state.historyWarning = ''; }
  catch { state.historyWarning = '本地进度保存失败，本次流程仍在运行；关闭浏览器前请导出记录。'; }
}

async function restoreCourse(tabId: number): Promise<CourseState> {
  const context = await courseContext(tabId); if (!context) return null;
  const url = new URL(context.url), scope = context.scope;
  const checkpointKey = courseCheckpointKey(scope, url.href), saved = (await chrome.storage.local.get(checkpointKey))[checkpointKey] as CourseCheckpoint;
  if (!saved || saved.schema !== 1 || saved.scope !== scope || typeof saved.pageKey !== 'string' || !saved.settings) return null;
  const chapterId = saved.pageKey.split(':')[0];
  if (!/^\d{1,30}$/.test(chapterId)) return null;
  const pending: Record<string, PendingQuestion> = {};
  for (const [id, item] of Object.entries(saved.pending || {}) as [string, PendingQuestion][]) {
    if (typeof item.pageKey !== 'string' || !/^\d{1,30}$/.test(item.pageKey.split(':')[0])) continue;
    pending[id] = { ...item, url: chapterUrl(url.href, item.pageKey.split(':')[0]) };
  }
  const finished = ['finished', 'finished-pending'].includes(saved.phase);
  return { running: false, phase: finished ? saved.phase : 'paused', scope, pageKey: saved.pageKey,
    checkpointKey, restored: !finished, resumeTarget: finished ? undefined : { chapterId, active: Number.isInteger(saved.active) ? saved.active : -1 },
    settings: saved.settings, answered: saved.answered || 0, logs: saved.logs || [], pending,
    questionRecords: saved.questionRecords || {}, discussionRecords:saved.discussionRecords||{},route: saved.route, uncertainAction: saved.uncertainAction, solved: {}, dispositions: {} };
}
