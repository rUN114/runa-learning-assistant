// 由 src/task-metadata.ts 构建。请修改 TypeScript 源文件后运行 npm run build。
"use strict";
// MAIN 世界只读取平台附件的最小任务信息；不返回请求、账户或媒体 URL。
// 此函数由 executeScript 序列化，必须保持自包含。
function readPlatformTasks() {
    if (!/(^|\.)(chaoxing\.com|xuexitong\.com|edu\.cn|org\.cn|xueyinonline\.com|hnsyu\.net|qutjxjy\.cn|ynny\.cn|hnvist\.cn|fjlecb\.cn|gdhkmooc\.com|cugbonline\.cn|zjelib\.cn|cqrspx\.cn|neauce\.com|zhihui-yun\.com|cqie\.cn|ccqmxx\.com|jxgmxy\.com|jnzyjsxy\.cn|smjyxy\.cn|sslibrary\.com|xuexi365\.com)$/.test(location.hostname) || !/\/knowledge\/cards(?:\/|$)/.test(location.pathname))
        return { tasks: [] };
    const input = globalThis.attachments;
    if (!Array.isArray(input))
        return { tasks: [] };
    const id = (value) => typeof value === 'string' || typeof value === 'number' ? String(value).slice(0, 160) : '';
    const tasks = [];
    for (const item of input.slice(0, 300)) {
        if (!item || typeof item !== 'object')
            continue;
        const property = item.property;
        if (!property || typeof property !== 'object')
            continue;
        const jobId = id(property._jobid || item.jobid), contentId = id(property.mid || property.objectid);
        if (!jobId && !contentId)
            continue;
        tasks.push({ jobId, contentId, module: id(property.module), required: item.job === true, passed: item.isPassed === true,
            name: [property.name, property.title, property.bookname].find(value => typeof value === 'string' && value.trim())?.slice(0, 120) || '' });
    }
    return { tasks };
}
function matchPlatformTask(ref, frame, frames) {
    if (!ref.jobId && !ref.contentId)
        return null;
    const matches = frames.filter(parent => parent.frameId === frame.frameId ||
        (parent.order || []).length < (frame.order || []).length && parent.order.every((part, i) => frame.order[i] === part))
        .flatMap(parent => parent.metadata || []).filter(task => ref.jobId ? task.jobId === ref.jobId : task.contentId === ref.contentId);
    // 同一 ID 的冲突信息不能靠“第一个匹配”猜测完成状态。
    const unique = new Map(matches.map(task => [task.jobId + ':' + task.contentId, task]));
    if (unique.size !== 1 || matches.some(task => task.passed !== matches[0].passed || task.module !== matches[0].module))
        return null;
    return unique.values().next().value;
}
function applyPlatformTasks(frames) {
    for (const frame of frames)
        frame.mediaFrames = (frame.mediaFrames || []).filter(item => !item.unclassified ||
            ['insertvideo', 'insertaudio'].includes(matchPlatformTask(item, frame, frames)?.module));
    for (const frame of frames)
        for (const item of [...frame.videos, ...(frame.players || []), ...(frame.mediaFrames || [])]) {
            const task = matchPlatformTask(item, frame, frames);
            if (!task || !['insertvideo', 'insertaudio'].includes(task.module))
                continue;
            item.jobId = task.jobId;
            item.contentId = task.contentId;
            item.required = task.required;
            // isPassed 仅作为音视频任务点证据，不作为测验提交证据。
            item.jobDone ||= task.passed;
        }
    for (const frame of frames)
        for (const doc of frame.documents || []) {
            const task = matchPlatformTask(doc, frame, frames);
            if (task && task.module !== 'work') {
                doc.required = task.required;
                doc.jobDone ||= task.passed;
            }
        }
}
function refreshTaskInventory(state, pageKey, frames) {
    const old = state.taskInventory || {}, inventory = Object.fromEntries(Object.entries(old).filter(([, task]) => task.pageKey !== pageKey));
    const record = (task, fallback) => {
        const key = pageKey + ':' + (task.jobId ? 'job:' + task.jobId : task.contentId ? 'content:' + task.contentId : 'dom:' + fallback);
        const previous = old[key];
        const mediaStatus = { pending: 0, 'platform-passed': 1, playing: 2, ended: 3 };
        if (task.type !== 'work' && inventory[key] && mediaStatus[inventory[key].status] > mediaStatus[task.status])
            return;
        if (task.type === 'work' && previous && ['saved', 'submitted', 'skipped'].includes(previous.status) && task.status === 'pending')
            task.status = previous.status;
        inventory[key] = task;
    };
    const now = Date.now();
    for (const frame of frames)
        for (const task of frame.metadata || []) {
            const type = task.module === 'insertvideo' ? 'video' : task.module === 'insertaudio' ? 'audio' : task.module === 'work' ? 'work' : 'other';
            const passed = matchPlatformTask(task, frame, frames)?.passed === true;
            record({ ...task, pageKey, type, status: type !== 'work' && passed ? 'platform-passed' : 'pending', source: 'platform', observedAt: now }, '');
        }
    for (const frame of frames)
        for (const media of frame.videos) {
            const task = matchPlatformTask(media, frame, frames);
            // 课件内音频是附件的一部分，音频 ended 不能替代整个课件的完成状态。
            if (task && !['insertvideo', 'insertaudio'].includes(task.module))
                continue;
            record({ jobId: media.jobId, contentId: media.contentId, pageKey, type: task?.module === 'insertaudio' ? 'audio' : 'video', name: task?.name || '',
                status: media.ended ? 'ended' : !media.paused ? 'playing' : media.jobDone ? 'platform-passed' : 'pending',
                source: task ? 'platform' : 'dom', observedAt: now }, frame.frameId + ':' + media.id);
        }
    for (const frame of frames)
        for (const doc of frame.documents || []) {
            const task = matchPlatformTask(doc, frame, frames);
            record({ jobId: doc.jobId, contentId: doc.contentId, pageKey, type: 'other', name: task?.name || ({ slides: 'PPT 课件', reading: '阅读', 'timed-reading': '定时阅读', link: '链接任务' })[doc.type],
                status: doc.jobDone ? 'platform-passed' : 'pending', source: task ? 'platform' : 'dom', observedAt: now }, frame.frameId + ':' + doc.id);
        }
    for (const frame of frames.filter(frame => frame.submitted || frame.questions.some(question => !question.isVideo))) {
        const ref = (frame.taskRefs || []).find(ref => matchPlatformTask(ref, frame, frames)?.module === 'work') || { jobId: '', contentId: '' };
        record({ ...ref, pageKey, type: 'work', name: '章节测验', status: frame.submitted ? 'submitted' : 'pending',
            source: ref.jobId || ref.contentId ? 'platform' : 'dom', observedAt: now }, 'work:' + frame.frameId);
    }
    state.taskInventory = inventory;
}
function recordWorkOutcome(state, status) {
    for (const record of Object.values(state.questionRecords || {}))
        if (record.pageKey === state.pageKey && !record.isVideo) {
            record.outcome = status;
            record.updatedAt = Date.now();
        }
    for (const task of Object.values(state.taskInventory || {}))
        if (task.pageKey === state.pageKey && task.type === 'work') {
            task.status = status;
            task.observedAt = Date.now();
        }
}
function missingMediaTasks(frames) {
    return frames.flatMap(parent => (parent.metadata || []).filter(task => {
        if (task.passed || !['insertvideo', 'insertaudio'].includes(task.module))
            return false;
        return !frames.some(frame => (parent.frameId === frame.frameId || parent.order.length < frame.order.length && parent.order.every((part, i) => frame.order[i] === part)) &&
            [...frame.videos, ...(frame.players || []), ...(frame.mediaFrames || [])].some(item => task.jobId ? item.jobId === task.jobId : item.contentId === task.contentId));
    }));
}
