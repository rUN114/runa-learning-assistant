// 由 src/course-context.ts 构建。请修改 TypeScript 源文件后运行 npm run build。
"use strict";
// 学习通学校域名来自已核对的 OCS cx.ts；只认章节路径，拒绝考试及任意网页。
function isCourseHost(host) {
    return /(^|\.)(chaoxing\.com|xuexitong\.com|edu\.cn|org\.cn|xueyinonline\.com|hnsyu\.net|qutjxjy\.cn|ynny\.cn|hnvist\.cn|fjlecb\.cn|gdhkmooc\.com|cugbonline\.cn|zjelib\.cn|cqrspx\.cn|neauce\.com|zhihui-yun\.com|cqie\.cn|ccqmxx\.com|jxgmxy\.com|jnzyjsxy\.cn|smjyxy\.cn|sslibrary\.com|xuexi365\.com)$/.test(host);
}
async function courseContext(tabId) {
    const tab = await chrome.tabs.get(tabId);
    const frames = chrome.webNavigation?.getAllFrames ? await chrome.webNavigation.getAllFrames({ tabId }) : [{ frameId: 0, url: tab.url }];
    const roots = (frames || []).filter(frame => {
        try {
            const url = new URL(frame.url);
            return isCourseHost(url.hostname) && /(?:^|\/)studentstudy(?:\/|$)/.test(url.pathname);
        }
        catch {
            return false;
        }
    });
    // 多个课程嵌在同一标签时不能猜当前任务。
    if (roots.length !== 1)
        return null;
    const root = roots[0], url = new URL(root.url);
    return { url: url.href, frameId: root.frameId, hasCourseFrame: false,
        scope: url.origin + url.pathname + '?course=' + (url.searchParams.get('courseId') || url.searchParams.get('courseid') || '') + '&class=' + (url.searchParams.get('clazzid') || ''),
        pageKey: (url.searchParams.get('chapterId') || url.searchParams.get('knowledgeid') || '') + ':' };
}
async function navigateCourse(tabId, url) {
    const current = await courseContext(tabId);
    if (!current)
        throw new Error('没有唯一的章节学习页。');
    const target = new URL(url), old = new URL(current.url);
    if (target.origin !== old.origin || target.pathname !== old.pathname || ['courseId', 'courseid', 'clazzid', 'cpi'].some(key => target.searchParams.get(key) !== old.searchParams.get(key)))
        throw new Error('目标章节不属于当前课程。');
    if (current.frameId === 0) {
        await chrome.tabs.update(tabId, { url });
        return;
    }
    await chrome.scripting.executeScript({ target: { tabId, frameIds: [current.frameId] }, func: (url) => location.assign(url), args: [url] });
}
