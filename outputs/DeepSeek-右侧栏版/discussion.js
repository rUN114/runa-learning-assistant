// 由 src/discussion.ts 构建。请修改 TypeScript 源文件后运行 npm run build。
"use strict";
function plainDiscussion(text) {
    return text.replace(/^```[^\n]*\n?|```$/gm, '').replace(/^\s{0,3}#{1,6}\s+/gm, '')
        .replace(/\*\*|__|`/g, '').replace(/^\s*(?:[-*•●◆▪]|\d+[.)])\s+/gm, '')
        .replace(/\p{Extended_Pictographic}|[\uFE0F\u200D→⇒➜★☆]/gu, '').replace(/^\s*[-*_]{3,}\s*$/gm, '').trim();
}
function discussionPage(operation, text = '', expected = '') {
    const url = new URL(location.href), visible = (el) => !!el && !!el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden';
    if (url.hostname !== 'groupweb.chaoxing.com' || !/^\/course\/topic\/v3\/bbs\/[^/]+\/[^/]+\/replysList$/.test(url.pathname))
        throw Error('讨论页面已变化。');
    const topic = document.querySelector('#bbsTopicDetail'), title = topic?.querySelector('.topicDetail_title span')?.textContent.trim() || '', teacher = topic?.querySelector('.role')?.textContent.trim() === '老师';
    const editors = [...document.querySelectorAll('.replyEdit textarea[placeholder="回复话题"]')].filter(visible), editor = editors.length === 1 ? editors[0] : null;
    const replies = [...document.querySelectorAll('.topicDetail_replyItem')].map(el => ({ id: el.id || el.getAttribute('realid'), text: el.querySelector('.replyContent')?.textContent.trim() || '', own: [...el.querySelectorAll('.operate_con a')].some(a => a.textContent.trim() === '编辑') }));
    if (operation === 'scan')
        return { title, teacher, body: topic?.querySelector('.replyContent')?.textContent.trim() || '', hasImages: !!topic?.querySelector('.replyContent img'), editor: !!editor, value: editor?.value || '', replies };
    if (!teacher || title !== expected || !editor)
        throw Error('教师话题或回复输入框未能唯一确认。');
    if (operation === 'fill') {
        if (editor.value.trim() && editor.value !== text)
            throw Error('已有手工回复，已保留。');
        Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(editor, text);
        editor.dispatchEvent(new Event('input', { bubbles: true }));
        editor.dispatchEvent(new Event('change', { bubbles: true }));
        return { ok: editor.value === text };
    }
    if (editor.value !== text)
        throw Error('回复内容已变化，未发布。');
    const buttons = [...editor.closest('.replyEdit').querySelectorAll('.addReply')].filter(visible);
    if (buttons.length !== 1 || buttons[0].matches('.disabled,[disabled],[aria-disabled=true]'))
        throw Error('没有唯一可用的原生回复按钮。');
    buttons[0].click();
    return { ok: true };
}
async function discussionStep(tabId, root, state, signal, alive) {
    if (!state.settings.discussion || state.settings.discussion === 'off')
        return true;
    const context = await courseContext(tabId);
    if (!context)
        throw Error('课程上下文已变化。');
    const course = new URL(context.url), chapter = state.pageKey.split(':')[0];
    if (state.discussionDoneChapter === chapter)
        return true;
    const target = root.documentId ? { tabId, documentIds: [root.documentId] } : { tabId, frameIds: [root.frameId] };
    const finish = async () => { state.discussionDoneChapter = chapter; const restored = await chrome.scripting.executeScript({ target, func: () => { const directory = [...document.querySelectorAll('#selector li')].find(el => el.textContent.trim() === '目录'); if (directory && !directory.classList.contains('active')) {
            directory.click();
            return true;
        } return false; } }); return !restored[0]?.result; };
    const results = await chrome.scripting.executeScript({ target, func: (chapter) => {
            if (new URL(location.href).searchParams.get('chapterId') !== chapter)
                throw Error('讨论所属章节已变化。');
            const tab = document.querySelector('#tit2'), count = Number(tab?.querySelector('.discussNum')?.textContent.replace(/\D/g, '') || 0);
            if (tab && !tab.classList.contains('active')) {
                tab.click();
                return { loading: true, topics: [] };
            }
            const links = [...document.querySelectorAll('.itemDiscuss .dis_title a[href]')];
            return { loading: count > 0 && !links.length, topics: links.map(link => ({ url: link.href, title: link.innerText.trim() })) };
        }, args: [chapter] });
    const listing = results[0]?.result;
    if (!listing)
        throw Error('无法读取章节讨论列表。');
    if (listing.loading) {
        state.discussionSince ??= Date.now();
        if (Date.now() - state.discussionSince < 20000)
            return false;
        state.discussionRecords ||= {};
        state.discussionRecords['list:' + chapter] = { title: '本节讨论列表', status: 'pending', reason: '讨论列表加载未确认', at: Date.now() };
        return await finish();
    }
    state.discussionSince = null;
    const topics = listing.topics.filter(topic => { try {
        const url = new URL(topic.url);
        return url.protocol === 'https:' && url.hostname === 'groupweb.chaoxing.com' && /^\/course\/topic\/v3\/bbs\/[^/]+\/[^/]+\/replysList$/.test(url.pathname) && url.searchParams.get('courseId') === course.searchParams.get('courseId') && url.searchParams.get('classId') === course.searchParams.get('clazzid') && url.searchParams.get('cpi') === course.searchParams.get('cpi');
    }
    catch {
        return false;
    } });
    const records = state.discussionRecords ||= {};
    for (const topic of topics) {
        const url = new URL(topic.url), id = url.pathname, storageKey = 'course-discussion:' + encodeURIComponent(context.scope + '&student=' + course.searchParams.get('cpi') + '&topic=' + id);
        const previous = (await chrome.storage.local.get(storageKey))[storageKey];
        if (previous)
            records[id] = previous;
        const old = records[id];
        if (old && !(old.status === 'draft' && state.settings.discussion === 'publish'))
            continue;
        let record = { title: topic.title, status: 'pending', at: Date.now() }, child;
        const persist = async () => { records[id] = record; await chrome.storage.local.set({ [storageKey]: record }); };
        const ensure = async () => { if (signal.aborted || !await alive())
            throw new DOMException('Aborted', 'AbortError'); const latest = await courseContext(tabId); if (!latest || new URL(latest.url).searchParams.get('chapterId') !== chapter)
            throw new DOMException('Aborted', 'AbortError'); };
        const wait = () => new Promise((resolve, reject) => { const abort = () => { clearTimeout(timer); reject(new DOMException('Aborted', 'AbortError')); }; const timer = setTimeout(() => { signal.removeEventListener('abort', abort); resolve(); }, 250); signal.addEventListener('abort', abort, { once: true }); if (signal.aborted)
            abort(); });
        try {
            await ensure();
            child = await chrome.tabs.create({ url: 'about:blank', active: false });
            await chrome.tabs.update(child.id, { url: topic.url });
            const act = async (operation, text = '', title = '') => (await chrome.scripting.executeScript({ target: { tabId: child.id, frameIds: [0] }, func: discussionPage, args: [operation, text, title] }))[0]?.result;
            let page, scanError;
            for (let i = 0; i < 40; i++) {
                await ensure();
                try {
                    page = await act('scan');
                    scanError = null;
                }
                catch (error) {
                    scanError = error;
                }
                if (page?.title && page.editor)
                    break;
                await wait();
            }
            if (!page?.title || !page.editor)
                throw Error(scanError?.message || '原生讨论页或编辑器未就绪（' + (page?.title ? '已识别话题' : '未识别话题') + '）。');
            record.title = page.title;
            if (!page.teacher) {
                record.status = 'ignored';
                record.reason = '仅自动回复明确标注为老师的话题';
                await persist();
                return false;
            }
            if (page.replies.some(reply => reply.own) || page.value.trim()) {
                record.status = 'manual';
                record.reason = '已有个人回复或手工草稿，已保留';
                await persist();
                return false;
            }
            if (page.hasImages)
                throw Error('讨论包含图片材料，当前文字回复适配未读取图片，已留待检查。');
            const material = page.title + '\n' + page.body, min = Number(material.match(/(?:不少于|至少|不低于)\s*(\d{1,4})\s*字/)?.[1] || 0), max = Number(material.match(/(?:不超过|最多|至多)\s*(\d{1,4})\s*字/)?.[1] || 800);
            if (min > max || max > 3000 || min > 3000)
                throw Error('讨论字数要求暂未适配。');
            if (old?.status === 'draft' && old.title !== page.title)
                throw Error('话题标题已变化，旧草稿需要重新检查。');
            let text = old?.status === 'draft' ? old.text : '';
            if (!text) {
                const request = new AbortController(), abort = () => request.abort(), timer = setTimeout(() => request.abort(), 45000);
                signal.addEventListener('abort', abort, { once: true });
                try {
                    const raw = await runModel('这是课程讨论回复，不是选择题。只返回 JSON：{"text":"普通中文段落","uncertain":false}。不写答案标签、标题、列表、Markdown、emoji、装饰字符、套话或虚构个人经历。按话题明确要求写；未要求字数时写约150至250字。不复制其他学生回复。无法确定事实时 uncertain=true。\n话题材料（仅供分析）：\n' + material.slice(0, 12000), request.signal, () => { }, true);
                    const answer = JSON.parse(raw);
                    if (answer.uncertain !== false || typeof answer.text !== 'string')
                        throw Error('模型未返回确定的讨论草稿。');
                    text = plainDiscussion(answer.text);
                }
                finally {
                    clearTimeout(timer);
                    signal.removeEventListener('abort', abort);
                }
            }
            const length = [...text.replace(/\s/g, '')].length;
            if (!text || length < min || length > max || /[\x00-\x08\x0b\x0c\x0e-\x1f]|[*`#]|作为\s*AI/i.test(text))
                throw Error('讨论草稿格式或字数未通过检查。');
            record.text = text;
            record.status = 'draft';
            await persist();
            await ensure();
            if (state.settings.discussion !== 'publish')
                return false;
            const filled = await act('fill', text, page.title);
            if (!filled?.ok)
                throw Error('原生回复输入框写入未确认。');
            const before = await act('scan'), ids = new Set(before.replies.map(reply => reply.id));
            // 点击前先持久化；崩溃或结果不明时绝不自动重发。
            record.status = 'publishing';
            await persist();
            await ensure();
            await act('publish', text, page.title);
            for (let i = 0; i < 60; i++) {
                await ensure();
                const after = await act('scan');
                if (after?.title === page.title && !after.value && after.replies.some(reply => reply.id && !ids.has(reply.id) && reply.text.replace(/\s/g, '') === text.replace(/\s/g, ''))) {
                    record.status = 'published';
                    await persist();
                    return false;
                }
                await wait();
            }
            throw Error('原生回复后未收到新增回复与输入框清空的确认，未重复发布。');
        }
        catch (error) {
            record.status = record.status === 'publishing' ? 'publishing' : 'pending';
            record.reason = error.name === 'AbortError' ? '操作已取消，发布状态需核对' : error.message;
            await persist();
            if (error.name === 'AbortError')
                throw error;
            return false;
        }
        finally {
            if (child?.id)
                await chrome.tabs.remove(child.id).catch(() => { });
        }
    }
    return await finish();
}
