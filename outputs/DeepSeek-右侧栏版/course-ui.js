// 由 src/course-ui.ts 构建。请修改 TypeScript 源文件后运行 npm run build。
"use strict";
(() => {
    'use strict';
    const nativeSidebar = location.protocol === 'chrome-extension:' && location.pathname === '/sidepanel.html';
    if (window !== window.top || (!nativeSidebar && (location.protocol === 'chrome-extension:' || !/(^|\.)(chaoxing\.com|xuexitong\.com|edu\.cn|org\.cn|xueyinonline\.com|hnsyu\.net|qutjxjy\.cn|ynny\.cn|hnvist\.cn|fjlecb\.cn|gdhkmooc\.com|cugbonline\.cn|zjelib\.cn|cqrspx\.cn|neauce\.com|zhihui-yun\.com|cqie\.cn|ccqmxx\.com|jxgmxy\.com|jnzyjsxy\.cn|smjyxy\.cn|sslibrary\.com|xuexi365\.com)$/.test(location.hostname) || !/studentstudy/.test(location.pathname))))
        return;
    const root = document.querySelector('[data-local-study-host]')?.shadowRoot;
    if (!root)
        return;
    const qa = root.querySelector('.body'), foot = root.querySelector('.foot');
    const style = document.createElement('style');
    style.textContent = `
    .modes{display:flex;border-bottom:1px solid #e2ebef;padding:8px 16px;gap:8px;flex-shrink:0}.modes button{border-color:transparent;padding:5px 12px;font-size:13px}.modes button.active{background:#edf1ff;color:#375dff}
    .course-body>*{flex-shrink:0}.course-summary{padding:10px 12px;background:#f7f9fc;border-left:3px solid #375dff}.course-summary strong{font-size:16px}.course-summary p{margin:3px 0 0;font-size:12px;color:#657389}
    .course-options{display:grid;gap:12px;padding:4px 0}.course-field{display:grid;grid-template-columns:76px minmax(0,1fr);align-items:center;gap:10px;font-size:13px}.course-field select{min-width:0;width:100%;padding:7px 8px;font:inherit}.course-hint{margin:0;font-size:12px;color:#657389;line-height:1.7}
    .course-details{border-top:1px solid #e5eaf2;padding-top:10px}.course-details summary{cursor:pointer;font-size:12px;color:#657389}.course-details[open] summary{margin-bottom:12px}.course-video-options{display:grid;gap:12px}.course-toggle{display:flex;gap:8px;align-items:center;font-size:13px}.course-toggle input{width:16px;height:16px;margin:0;accent-color:#375dff}
    .course-buttons{display:flex;gap:8px}.course-buttons .primary{flex:1}.course-skip{font-size:12px}.course-error{font-size:12px;color:#a5352b;white-space:pre-wrap;margin:0}.course-error:empty{display:none}.native .course-body .course-log,.course-log{margin:0;padding-left:20px;font-size:12px;line-height:1.9;min-height:90px;max-height:180px;overflow:auto}.course-body [hidden]{display:none!important}
    #course-answers-list{font-size:12px;line-height:1.75;overflow-wrap:anywhere}#course-answers-list details{border-bottom:1px solid #e5eaf2;padding:10px 0}#course-export{font-size:12px;margin-bottom:6px}
  `;
    root.append(style);
    const modes = document.createElement('div');
    modes.className = 'modes';
    modes.innerHTML = '<button id="mode-qa" class="active">搜题</button><button id="mode-course">课程助手</button>';
    qa.before(modes);
    const body = document.createElement('div');
    body.className = 'body course-body';
    body.hidden = true;
    body.innerHTML = `
    <div class="course-summary"><strong id="course-phase">尚未启动</strong><p id="course-progress">在章节学习页点击开始。</p></div>
    <div class="course-options">
      <label class="course-field" for="course-task">学习内容<select id="course-task"><option value="both">视频 + 章节测验</option><option value="video">只看视频，跳过测验</option><option value="quiz">只做章节测验</option></select></label>
      <label class="course-field" id="course-action-row" for="course-work-action">测验处理<select id="course-work-action"><option value="submit">提交答案</option><option value="save">暂存答案</option><option value="review">仅填写，等我检查</option></select></label>
      <label class="course-field" for="course-next"><span id="course-next-label">提交后</span><select id="course-next"><option value="continue">继续下一项或下一节</option><option value="stay">留在本节</option></select></label>
      <p class="course-hint" id="course-plan-hint"></p>
    </div>
    <details class="course-details" id="course-advanced"><summary>播放设置</summary><div class="course-video-options">
      <label class="course-field" for="course-popup">视频弹题<select id="course-popup"><option value="auto">AI 解答并提交</option><option value="review">AI 填写，等我提交</option><option value="manual">由我手动处理</option></select></label>
      <label class="course-field" for="course-rate">播放速度<select id="course-rate"><option value="1">1 倍速</option><option value="1.25">1.25 倍速</option><option value="1.5">1.5 倍速</option><option value="2">2 倍速</option></select></label>
      <label class="course-toggle"><input id="course-muted" type="checkbox" checked>静音播放</label>
    </div></details>
    <details class="course-details"><summary>讨论设置</summary><label class="course-field" for="course-discussion">教师话题<select id="course-discussion"><option value="off">不处理讨论</option><option value="draft">生成草稿，留待检查</option><option value="publish">自动回复教师话题</option></select></label><p class="course-hint">本节任务处理后参与讨论。只回复已识别的教师话题；保留已有回复，发布结果不明时不重发。文字用主模型生成一次。</p></details>
    <div class="course-buttons"><button id="course-start" class="primary">开始学习助手</button><button id="course-stop" class="primary" disabled hidden>暂停</button></div>
    <button class="course-skip" id="course-skip" hidden>跳过本次测验并继续</button>
    <p class="course-error" id="course-error" role="status" aria-live="polite"></p>
    <details class="course-details" id="course-pending" hidden><summary id="course-pending-summary">待处理项目</summary><ol class="course-log" id="course-pending-list"></ol></details>
    <details class="course-details" id="course-inventory" hidden><summary id="course-inventory-summary">当前页面任务</summary><ol class="course-log" id="course-inventory-list"></ol></details>
    <details class="course-details" id="course-answers" hidden><summary id="course-answers-summary">答题记录</summary><button id="course-export">导出记录</button><div id="course-answers-list"></div></details>
    <details class="course-details" id="course-records"><summary>运行记录</summary><ol class="course-log" id="course-log"></ol></details>`;
    const discussionRecords = document.createElement('details');
    discussionRecords.className = 'course-details';
    discussionRecords.id = 'course-discussion-records';
    discussionRecords.hidden = true;
    discussionRecords.innerHTML = '<summary>讨论记录与草稿</summary><div id="course-discussion-list"></div>';
    body.append(discussionRecords);
    qa.after(body);
    const $ = (id) => root.getElementById(id);
    let state = { running: false, phase: 'idle', answered: 0, logs: [] }, tickPending = false, uiVisible = false, settingsAppliedRunId;
    async function message(data) { if (nativeSidebar)
        data = { ...data, tabId: globalThis.__localSidebarContext?.tabId }; const result = await chrome.runtime.sendMessage(data); if (!result?.ok)
        throw new Error(result?.error || '扩展连接失败，请刷新课程页。'); return result; }
    function mode(course) { uiVisible = course; qa.hidden = course; body.hidden = !course; $('mode-qa').classList.toggle('active', !course); $('mode-course').classList.toggle('active', course); foot.textContent = course ? 'AI 题目使用你的接口与额度。任务完成以学习通为准。' : '使用你自己的接口与额度。只发送上面的题目文字。'; }
    $('mode-qa').addEventListener('click', () => mode(false));
    $('mode-course').addEventListener('click', () => mode(true));
    function syncPlan() {
        const task = $('course-task').value, action = $('course-work-action').value, stay = $('course-next').value === 'stay';
        $('course-action-row').hidden = task === 'video';
        $('course-advanced').hidden = task === 'quiz';
        const manual = task !== 'video' && action === 'review';
        $('course-next-label').textContent = task === 'video' ? '视频结束后' : action === 'save' ? '暂存后' : manual ? '检查后' : '提交后';
        $('course-next').options[0].textContent = manual ? '我保存或提交后继续' : '继续下一项或下一节';
        $('course-plan-hint').textContent = task === 'video' ? `跳过章节测验；视频结束后${stay ? '停留' : '继续'}。` : manual ? `填写后先停下检查；${stay ? '留在本节，由你手动切换。' : '你保存或提交成功后继续。'}` : task === 'quiz' ? `跳过视频；测验${action === 'save' ? '暂存' : '提交'}成功后${stay ? '停留' : '继续'}。` : `视频后进入测验；${action === 'save' ? '暂存' : '提交'}成功后${stay ? '停留' : '继续'}。`;
    }
    function settingsFromForm() {
        const task = $('course-task').value, next = $('course-next').value === 'continue', action = $('course-work-action').value, popup = $('course-popup').value;
        return { video: task !== 'quiz', answer: task !== 'video', videoAnswer: task !== 'quiz' && popup !== 'manual', submit: task !== 'quiz' && popup === 'auto', next, followManual: next && task !== 'video', workAction: task === 'video' ? 'skip' : action === 'save' && !next ? 'save-stay' : action, muted: $('course-muted').checked, rate: Number($('course-rate').value), discussion: $('course-discussion').value };
    }
    for (const id of ['course-task', 'course-work-action', 'course-next'])
        $(id).addEventListener('change', syncPlan);
    syncPlan();
    const phases = { idle: '尚未启动', scanning: '识别当前任务', answering: 'AI 正在解题', verifying: 'AI 正在复核答案', video: '正在播放视频', 'loading-course': '等待章节页面加载', 'loading-video': '等待视频加载', 'waiting-platform': '等待任务点确认', 'loading-task': '等待任务框架', 'waiting-submit': '等待提交结果', 'waiting-save': '等待保存结果', saved: '已暂存，未提交', switching: '切换下一项', review: '需要检查', paused: '已暂停', stopped: '已停止', finished: '到达目录末尾', 'finished-pending': '自动流程结束，有待处理项目' };
    function render(next) {
        state = next;
        $('course-phase').textContent = phases[state.phase] || state.phase || '尚未启动';
        $('course-progress').textContent = (['video', 'loading-video', 'waiting-platform'].includes(state.phase) && state.videoText ? state.videoText + ' · ' : '') + `本次已填写 ${state.answered || 0} 道题${Object.keys(state.pending || {}).length ? ' · 待核对 ' + Object.keys(state.pending).length + ' 项' : ''}`;
        $('course-start').disabled = state.running;
        $('course-stop').disabled = !state.running;
        $('course-start').textContent = state.restored ? '继续上次进度' : ['review', 'paused', 'stopped', 'saved'].includes(state.phase) ? '继续运行' : '开始学习助手';
        if (state.restored)
            $('course-progress').textContent += ' · 已找回上次记录，点击继续后恢复';
        $('course-start').hidden = state.running;
        $('course-stop').hidden = !state.running;
        for (const input of body.querySelectorAll('input,select'))
            input.disabled = state.running;
        $('course-skip').hidden = state.taskType !== 'work' || state.settings?.workAction === 'skip' || ['loading-course', 'finished', 'finished-pending'].includes(state.phase);
        $('course-skip').disabled = state.phase === 'waiting-submit';
        if (state.settings && !state.running && settingsAppliedRunId !== (state.runId || state.checkpointKey)) {
            const s = state.settings;
            $('course-task').value = s.workAction === 'skip' || s.answer === false ? 'video' : s.video === false ? 'quiz' : 'both';
            $('course-work-action').value = s.workAction === 'save-stay' ? 'save' : ['submit', 'save', 'review'].includes(s.workAction) ? s.workAction : 'submit';
            $('course-next').value = s.workAction === 'save-stay' || s.next === false ? 'stay' : 'continue';
            $('course-popup').value = s.videoAnswer === false ? 'manual' : s.submit ? 'auto' : 'review';
            $('course-muted').checked = s.muted !== false;
            $('course-rate').value = String(s.rate);
            $('course-discussion').value = s.discussion || 'off';
            settingsAppliedRunId = state.runId || state.checkpointKey;
            syncPlan();
        }
        $('course-log').replaceChildren(...(state.logs || []).map(log => { const li = document.createElement('li'); li.textContent = new Date(log.time).toLocaleTimeString('zh-CN', { hour12: false }) + ' ' + log.text; return li; }));
        const pending = Object.values(state.pending || {});
        $('course-pending').hidden = !pending.length;
        $('course-pending-summary').textContent = '待处理项目（' + pending.length + '）';
        $('course-pending-list').replaceChildren(...pending.map(q => { const li = document.createElement('li'); li.textContent = q.text + ' — ' + q.reason; return li; }));
        const tasks = Object.values(state.taskInventory || {}).filter(task => task.pageKey === state.pageKey);
        const taskStatuses = { pending: '等待处理', playing: '播放中', ended: '播放结束', saved: '已暂存', submitted: '已提交', skipped: '已跳过', 'platform-passed': '平台任务点已完成' };
        const taskTypes = { video: '视频', audio: '音频', work: '章节测验', other: '其他任务' };
        $('course-inventory').hidden = !tasks.length;
        $('course-inventory-summary').textContent = '当前页面任务（' + tasks.length + '）';
        $('course-inventory-list').replaceChildren(...tasks.map((task, index) => { const li = document.createElement('li'); li.textContent = (task.name || taskTypes[task.type] + ' ' + (index + 1)) + ' · ' + taskStatuses[task.status]; return li; }));
        const records = Object.values(state.questionRecords || {});
        $('course-answers').hidden = !records.length;
        const discussions = Object.values(state.discussionRecords || {});
        $('course-discussion-records').hidden = !discussions.length;
        const discussionLabels = { draft: '草稿待检查', publishing: '发布结果待核对', published: '已确认发布', manual: '保留已有回复', pending: '待处理', ignored: '未自动参与' };
        $('course-discussion-list').replaceChildren(...discussions.map(record => { const item = document.createElement('div'); const title = document.createElement('p'); title.textContent = record.title + ' · ' + discussionLabels[record.status]; const text = document.createElement('p'); text.textContent = record.text || record.reason || ''; text.style.whiteSpace = 'pre-wrap'; item.append(title, text); if (record.text) {
            const copy = document.createElement('button');
            copy.textContent = '复制草稿';
            copy.addEventListener('click', async () => { await navigator.clipboard.writeText(record.text); copy.textContent = '已复制'; });
            item.append(copy);
        } return item; }));
        $('course-answers-summary').textContent = '答题记录（最近 ' + records.length + ' 道）';
        if ($('course-answers').open)
            renderAnswers();
        $('course-error').textContent = state.historyWarning || (state.phase === 'review' ? state.logs?.at(-1)?.text || '' : '');
        if (state.running && $('panel').hidden)
            $('launcher').textContent = 'Runa · 课程运行中';
        else if (!state.running)
            $('launcher').innerHTML = '学习助手<small>Runa</small>';
    }
    let answerRenderKey = '';
    function renderAnswers() {
        const renderKey = JSON.stringify(Object.values(state.questionRecords || {}).map(record => [record.key, record.status, record.updatedAt, record.outcome]));
        if (renderKey === answerRenderKey)
            return;
        answerRenderKey = renderKey;
        const expanded = new Set([...$('course-answers-list').querySelectorAll('details[open]')].map(detail => detail.dataset.key));
        const statuses = { detected: '已识别', answering: '判断中', filled: '已填写', manual: '页面已有答案', pending: '待核对', blocked: '需要手动处理' };
        const outcomes = { saved: '已暂存', submitted: '已提交', skipped: '已跳过' };
        $('course-answers-list').replaceChildren(...Object.values(state.questionRecords || {}).toReversed().map(record => {
            const detail = document.createElement('details'), summary = document.createElement('summary'), text = document.createElement('p');
            detail.dataset.key = record.key;
            detail.open = expanded.has(record.key);
            summary.textContent = record.text.slice(0, 65) + ' · ' + statuses[record.status] + (record.outcome ? ' · ' + outcomes[record.outcome] : '');
            const optionLabel = (letter) => { const option = record.options.find(option => option.letter === letter); return letter + '. ' + (option?.text || '').replace(/^[A-Z][、.．)）:：\s]+/i, ''); };
            const answer = record.answer, label = answer?.choices?.map(optionLabel).join('；') || answer?.matches?.map((value, i) => (record.matching?.[i]?.label || '第 ' + (i + 1) + ' 项') + ' → ' + (record.matching?.[i]?.choices.find(choice => choice.value === value)?.text || value)).join('；') || answer?.blanks?.join('；') || answer?.text || '未采用答案';
            text.textContent = record.text + '\n选项：' + record.options.map(option => optionLabel(option.letter)).join('；') + '\nAI 采用：' + label + (record.actualChoices?.length ? '\n页面选中：' + record.actualChoices.map(optionLabel).join('；') : '') + '\n依据：' + (record.reason || '暂无');
            text.style.whiteSpace = 'pre-wrap';
            detail.append(summary, text);
            for (const attempt of record.attempts) {
                const votes = document.createElement('p');
                votes.textContent = '本轮判断' + (attempt.singleModel ? '（同一模型不同角度）' : '') + '：\n' + (attempt.options ? '当时选项：' + attempt.options.map(option => option.text).join('；') + '\n' : '') + attempt.votes.map(vote => vote.model + '：' + (vote.error || vote.choices?.join(',') || vote.matches?.join('；') || vote.text || vote.blanks?.join('；') || '无法确定') + '；' + (vote.reason || '')).join('\n');
                votes.style.whiteSpace = 'pre-wrap';
                detail.append(votes);
            }
            return detail;
        }));
    }
    $('course-answers').addEventListener('toggle', () => { if ($('course-answers').open)
        renderAnswers(); });
    $('course-export').addEventListener('click', () => {
        const data = { version: chrome.runtime.getManifest().version, exportedAt: new Date().toISOString(), records: Object.values(state.questionRecords || {}) };
        const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })), link = document.createElement('a');
        link.href = url;
        link.download = 'Runa答题记录.json';
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
    async function start(event) {
        if (!event.isTrusted)
            return;
        $('course-error').textContent = '';
        $('course-start').disabled = true;
        try {
            if (nativeSidebar)
                await globalThis.__refreshLocalSidebar();
            render((await message({ type: 'COURSE_START', settings: settingsFromForm() })).state);
            await pump();
        }
        catch (e) {
            $('course-error').textContent = e.message;
            $('course-start').disabled = false;
        }
    }
    $('course-start').addEventListener('click', start);
    if (nativeSidebar) {
        window.addEventListener('local-sidebar-tab-changed', () => { settingsAppliedRunId = undefined; render({ running: false, phase: 'idle', answered: 0, logs: [] }); });
    }
    $('course-stop').addEventListener('click', async (event) => { if (!event.isTrusted)
        return; try {
        render((await message({ type: 'COURSE_STOP' })).state);
    }
    catch (e) {
        $('course-error').textContent = e.message;
    } });
    $('course-skip').addEventListener('click', async (event) => { if (!event.isTrusted)
        return; try {
        if (nativeSidebar)
            await globalThis.__refreshLocalSidebar();
        render((await message({ type: 'COURSE_SKIP' })).state);
        await pump();
    }
    catch (e) {
        $('course-error').textContent = e.message;
    } });
    if (!nativeSidebar)
        document.addEventListener('click', event => {
            if (event.isTrusted && event.target.closest?.('.popBottom .nextChapter'))
                message({ type: 'COURSE_USER_NEXT', pageKey: state.pageKey }).catch(() => { });
        }, true);
    async function pump() {
        try {
            if (nativeSidebar)
                await globalThis.__refreshLocalSidebar();
            render((await message({ type: 'COURSE_STATE' })).state);
            if (state.running && !tickPending) {
                tickPending = true;
                message({ type: 'COURSE_TICK' }).then(r => render(r.state)).catch(e => { $('course-error').textContent = e.message; }).finally(() => tickPending = false);
            }
        }
        catch (e) {
            if (uiVisible)
                $('course-error').textContent = e.message;
        }
    }
    const timer = setInterval(pump, 2500);
    window.addEventListener('pagehide', () => clearInterval(timer));
    pump();
})();
