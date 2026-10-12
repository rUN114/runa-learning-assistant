type CoursePhase = 'idle' | 'scanning' | 'answering' | 'verifying' | 'video' | 'loading-course' | 'loading-video' | 'waiting-platform' | 'loading-task' | 'waiting-submit' | 'waiting-save' | 'saved' | 'switching' | 'review' | 'paused' | 'stopped' | 'finished' | 'finished-pending';
type WorkAction = 'submit' | 'save' | 'save-stay' | 'review' | 'skip';
type CourseOperation = 'scan' | 'readImages' | 'readSlide' | 'readPage' | 'readBook' | 'openLink' | 'prepareMedia' | 'reloadMedia' | 'play' | 'pause' | 'fill' | 'submitQuiz' | 'continueQuiz' | 'submitWork' | 'saveWork' | 'confirmWork' | 'nextCard' | 'nextChapter' | 'openChapter' | 'continueIncomplete';
type QuestionType = 'judge' | 'single' | 'multiple' | 'blank' | 'text' | 'matching' | 'unsupported';
interface ModelConfig { baseUrl: string; model: string; reviewModel: string; apiKey?: string }
interface ModelEvent { type: 'START' | 'DELTA' | 'THINKING' | 'NOTICE' | 'DONE' | 'ERROR'; text?: string; error?: string }
interface ModelAnswer { uncertain: boolean; reason?: string; verdict?: boolean; choices?: string[]; blanks?: string[]; matches?: string[]; text?: string; verified?: boolean }
interface ModelVote extends Partial<ModelAnswer> { model: string; error?: string }
interface AnswerDecision { answer: ModelAnswer; votes?: ModelVote[]; models?: string[]; singleModel?: boolean; reason?: string }
interface QuestionOption { letter: string; text: string; verdict: boolean; selected: boolean }
interface QuestionImage { label: string; data: string }
interface MatchRow { label: string; choices: {value:string;text:string}[]; selected:string }
interface CourseQuestion { id?: string; text: string; options: QuestionOption[]; type: QuestionType; matching?: MatchRow[]; isVideo: boolean; signature: string; hasImages: boolean; images?: QuestionImage[]; imageError?: string; encoded: boolean; answered: boolean }
interface CourseSettings { video: boolean; answer: boolean; videoAnswer: boolean; next: boolean; followManual: boolean; submit: boolean; workAction: WorkAction; muted: boolean; rate: number; discussion?:'off'|'draft'|'publish' }
interface CourseMessage { type: string; settings?: Partial<CourseSettings> & { submitWork?: boolean }; pageKey?: string; tabId?: number }
interface AssistantMessage extends CourseMessage { text?: string; baseUrl?: string; model?: string; reviewModel?: string; apiKey?: string; clearKey?: boolean; result?: WorkReceipt }
interface OrderedTask { order?: number[]; frame?: FrameScan; index?: number; id?: number; jobId?: string }
interface ActionResult { ok: boolean; error?: string; pending?: boolean; recheck?: boolean; ended?: boolean; images?: QuestionImage[]; imageSources?: {label:string;url:string}[] }
interface CourseArgs { fontMap?: Record<number, string>; expectedPageKey?: string; expectedPath?: string; id?: number; index?: number; chapterId?: string; muted?: boolean; rate?: number; runId?: string; questionId?: string; signature?: string; answer?: ModelAnswer; allowPartial?: boolean; allowIncomplete?: boolean }
interface PlayAttempt { runId: string; at: number; pending: boolean; promise?: Promise<ActionResult> }
interface Element { __localStudyId?: number; __localStudyBoot?: number; __localStudyPlay?: PlayAttempt }
interface TaskReference { jobId: string; contentId: string }
interface TaskInfo extends TaskReference { required: boolean; jobDone: boolean }
interface MediaSlot extends TaskInfo { id: number; order: number[]; index?: number; unclassified?: boolean }
interface CourseMedia extends MediaSlot { index: number; paused: boolean; ended: boolean; time: number; duration: number; error: number }
interface PlatformTask extends TaskReference { module: string; required: boolean; passed: boolean; name: string }
interface CourseDocument extends TaskInfo { id: number; type: 'slides' | 'reading' | 'timed-reading' | 'link'; position: number; total: number; canNext: boolean; waitSeconds?:number; legacy?:boolean }
interface FrameScan {
  top: boolean; scope: string; pageKey: string; path: string; order: number[]; frameId?: number; documentId?: string; parentFrameId?: number;
  children?: {url: string; order: number; visible: boolean; ref: TaskReference}[];
  mediaFrames: MediaSlot[]; players: MediaSlot[]; documents?: CourseDocument[]; exam: boolean; taskRefs?: TaskReference[]; metadata?: PlatformTask[];
  tabs: { index: number; text: string; active: boolean; id: string }[]; active: number; questions: CourseQuestion[];
  submitted: boolean; videos: CourseMedia[]; jobs: { done: boolean; type: string; condition: string }[];
  fontBase64: string; fontMap?: Record<number, string>; confirmWork: { text: string }; saveConfirmed: boolean;
  receiptObserved: boolean; incompletePrompt: boolean; quizRejected: boolean; knowledgeBack: boolean;
  hasCourseFrame: boolean; continueQuiz: boolean; nextEnabled: boolean;
  chapters?: CourseChapter[];
}
interface CourseChapter { id: string; title: string; locked: boolean }
interface CourseRoute { mode: string; visited: string[] }
interface CourseCheckpoint extends Pick<CourseState, 'scope' | 'pageKey' | 'settings' | 'phase' | 'answered' | 'logs' | 'route' | 'questionRecords' | 'uncertainAction' | 'discussionRecords'> {
  schema: number; at: number; active?: number; pending: Record<string, Omit<PendingQuestion, 'url'>>;
}
interface QuestionRecord {
  key: string; pageKey: string; text: string; options: { letter: string; text: string }[]; type: QuestionType; isVideo: boolean;
  status: 'detected' | 'answering' | 'filled' | 'manual' | 'pending' | 'blocked'; updatedAt: number;
  answer?: ModelAnswer; actualChoices?: string[]; reason?: string; outcome?: 'saved' | 'submitted' | 'skipped';
  matching?:MatchRow[]; actualMatches?:string[];
  attempts: { at: number; answer: ModelAnswer; votes: ModelVote[]; reason: string; singleModel: boolean; options: QuestionRecord['options']; matching?:MatchRow[] }[];
}
type CoursePage = Pick<FrameScan, 'scope' | 'pageKey' | 'hasCourseFrame'>;
interface WorkReceipt { kind: 'save' | 'submit'; success: boolean; at: number; started: number; frameId?: number; documentId?: string; chapter?: string }
interface PendingQuestion { pageKey: string; url: string; active: number; text: string; reason: string; pass: number; isVideo: boolean; task?: boolean; rejected?: boolean; votes?: ModelVote[] }
interface Disposition { kind?: 'save' | 'submit' | 'skip'; allowIncomplete: boolean }
interface RetryTarget { pageKey: string; url: string; active: number }
interface TaskRecord extends TaskReference {
  pageKey: string; type: 'video' | 'audio' | 'work' | 'other'; name: string;
  status: 'pending' | 'playing' | 'ended' | 'saved' | 'submitted' | 'skipped' | 'platform-passed';
  source: 'platform' | 'dom'; observedAt: number;
}
interface CourseState {
  running: boolean; phase: CoursePhase; logs: { time: number; text: string }[]; answered: number;
  runId?: string; scope?: string; pageKey?: string; settings?: CourseSettings; pageStarted?: number; pageLoadingSince?: number;
  solved?: Record<string, boolean>; pending?: Record<string, PendingQuestion>; dispositions?: Record<string, Disposition>;
  taskInventory?: Record<string, TaskRecord>; retryOnly?: boolean; retryTodo?: RetryTarget[]; retryTarget?: RetryTarget;
  waiting?: { frameId: number; documentId?: string; signature?: string; video?: boolean; save?: boolean; watching?: boolean; since: number; requestSince?: number; confirmed?: boolean };
  transition?: { pageKey: string; since: number; allowIncomplete: boolean; confirmed?: boolean };
  progress?: { key: string; position: number; since: number }; currentMediaKey?: string;
  mediaDiscovery?: { signature: string; since: number }; mediaLoad?: { key: string; since: number };
  documentProgress?: { key: string; position: number; since: number; clickedAt?: number }; taskWait?: { key: string; since: number };
  videoText?: string; taskType?: 'work' | 'video'; lastReceipt?: number; manualReceipt?: WorkReceipt;
  documentRetrySince?: number;
  discussionSince?:number; discussionDoneChapter?:string; discussionRecords?:Record<string,DiscussionRecord>;
  mediaRetries?: Record<string,{count:number;at:number}>;
  route?: CourseRoute; checkpointKey?: string; restored?: boolean; resumeTarget?: { chapterId: string; active: number; since?: number };
  currentActive?: number; uncertainAction?: { kind: 'save' | 'submit'; pageKey: string };
  questionRecords?: Record<string, QuestionRecord>; historyWarning?: string;
  lastAnswer?: { question: string; choices: string[]; reason: string }; lastConsensus?: { models: string[]; votes: number; singleModel: boolean };
}
interface SidebarContext { tabId: number; course: boolean; title?: string; selection?: string }
declare var __localStudySequence: number;
declare var __localSidebarContext: SidebarContext;
declare var __refreshLocalSidebar: () => Promise<SidebarContext>;
declare var __localWorkEvents: boolean;
declare var __localWorkObserver: boolean;
declare var __localStudyAssistant: boolean;
declare const LOCAL_FONT_TABLE: Record<string, number>;
declare function md5(text: string): string;
declare const Typr: { parse(buffer: ArrayBuffer): unknown[]; U: { codeToGlyph(font: unknown, code: number): number; glyphToPath(font: unknown, glyph: number): unknown } };
declare namespace chrome.sidePanel { function close(options: { tabId: number }): Promise<void> }
interface StudyControls {
  'launcher': HTMLButtonElement; 'panel': HTMLElement; 'settings': HTMLButtonElement; 'close': HTMLButtonElement;
  'question': HTMLTextAreaElement; 'questions': HTMLSelectElement; 'ask': HTMLButtonElement; 'stop': HTMLButtonElement;
  'status': HTMLElement; 'answer': HTMLElement; 'model-line': HTMLElement; 'selection': HTMLButtonElement;
  'extract': HTMLButtonElement; 'clear': HTMLButtonElement; 'copy': HTMLButtonElement; 'page-tools': HTMLElement;
  'mode-qa': HTMLButtonElement; 'mode-course': HTMLButtonElement; 'course-phase': HTMLElement; 'course-progress': HTMLElement;
  'course-task': HTMLSelectElement; 'course-work-action': HTMLSelectElement; 'course-next': HTMLSelectElement;
  'course-action-row': HTMLElement; 'course-advanced': HTMLDetailsElement; 'course-next-label': HTMLElement;
  'course-plan-hint': HTMLElement; 'course-popup': HTMLSelectElement; 'course-rate': HTMLSelectElement; 'course-muted': HTMLInputElement;
  'course-start': HTMLButtonElement; 'course-stop': HTMLButtonElement; 'course-skip': HTMLButtonElement;
  'course-error': HTMLElement; 'course-log': HTMLOListElement; 'course-pending': HTMLDetailsElement;
  'course-pending-summary': HTMLElement; 'course-pending-list': HTMLOListElement; 'course-records': HTMLDetailsElement;
  'course-inventory': HTMLDetailsElement; 'course-inventory-list': HTMLOListElement; 'course-inventory-summary': HTMLElement;
  'course-answers': HTMLDetailsElement; 'course-answers-summary': HTMLElement; 'course-answers-list': HTMLElement;
  'course-export': HTMLButtonElement;
  'course-discussion': HTMLSelectElement; 'course-discussion-records': HTMLDetailsElement; 'course-discussion-list': HTMLElement;
}
interface SettingsControls {
  'settings': HTMLFormElement; 'status': HTMLElement; 'base-url': HTMLInputElement; 'model': HTMLInputElement;
  'review-model': HTMLInputElement; 'model-plan': HTMLElement; 'key': HTMLInputElement; 'key-state': HTMLElement;
  'show-key': HTMLButtonElement; 'clear-key': HTMLButtonElement; 'open-assistant': HTMLButtonElement; 'test': HTMLButtonElement;
}
