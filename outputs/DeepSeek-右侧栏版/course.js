// 由 src/course.ts 构建。请修改 TypeScript 源文件后运行 npm run build。
'use strict';
// 注入每个可访问框架，调用页面已有的播放器和按钮，不调用学习时长上报接口。
function courseFrame(operation, args = {}) {
    const provider = /(^|\.)(chaoxing\.com|xuexitong\.com|edu\.cn|org\.cn|xueyinonline\.com|hnsyu\.net|qutjxjy\.cn|ynny\.cn|hnvist\.cn|fjlecb\.cn|gdhkmooc\.com|cugbonline\.cn|zjelib\.cn|cqrspx\.cn|neauce\.com|zhihui-yun\.com|cqie\.cn|ccqmxx\.com|jxgmxy\.com|jnzyjsxy\.cn|smjyxy\.cn|sslibrary\.com|xuexi365\.com)$/.test(location.hostname);
    if (!provider)
        return null;
    const visible = (el) => { if (!el || !el.getClientRects().length)
        return false; for (let n = el; n; n = n.parentElement) {
        const s = getComputedStyle(n);
        if (s.display === 'none' || s.visibility === 'hidden' || s.contentVisibility === 'hidden' || s.opacity === '0')
            return false;
    } return true; };
    const order = [];
    let frameWrapper = null;
    const taskRefs = [];
    const reference = (el) => {
        let data = {};
        try {
            const value = JSON.parse(el?.getAttribute('data') || '{}');
            if (value && typeof value === 'object')
                data = value;
        }
        catch { }
        const property = data.property && typeof data.property === 'object' ? data.property : {};
        const id = (value) => typeof value === 'string' || typeof value === 'number' ? String(value).slice(0, 160) : '';
        return { jobId: id(data._jobid || data.jobid || data.jobId || property._jobid || el?.getAttribute('data-jobid')),
            contentId: id(data.mid || data.objectid || property.mid || property.objectid || el?.getAttribute('data-objectid')) };
    };
    // 同源框架按页面顺序定位，逐层检查祖先，排除已隐藏的旧任务。
    try {
        for (let win = window; win !== win.top;) {
            const frame = win.frameElement;
            if (!frame)
                break;
            if (!visible(frame))
                return null;
            taskRefs.push(reference(frame));
            order.unshift([...frame.ownerDocument.querySelectorAll('iframe,video,audio,.video-js')].indexOf(frame));
            frameWrapper ||= frame.closest('.ans-attach-ct');
            win = frame.ownerDocument.defaultView;
        }
    }
    catch { }
    const orderedNodes = [...document.querySelectorAll('iframe,video,audio,.video-js')];
    const identity = (el) => el.__localStudyId ||= (globalThis.__localStudySequence = (globalThis.__localStudySequence || 0) + 1);
    const judgeValue = (text) => { const value = String(text).normalize('NFKC').replace(/^[A-Z][、.．)）:：\s]+/i, '').trim().toLowerCase(); if (/^(错|错误|错误的|不对|不正确|不正确的|否|不是|false|f|no|×|✕|✗|x|0)$/.test(value))
        return false; if (/^(对|对的|正确|正确的|是|是的|true|t|yes|√|✓|✔|1)$/.test(value))
        return true; return null; };
    const undecoded = (el) => { if (!el)
        return false; const clone = el.cloneNode(true); clone.querySelectorAll('script,style,.newAnswerBx,.correctAnswerBx,.myAllAnswerBx,.mark_answer,.answerDiv,.analysis').forEach(node => node.remove()); return [...(clone.matches('.font-cxsecret') ? [clone] : []), ...clone.querySelectorAll('.font-cxsecret')].some(node => [...(node.textContent || '')].some(ch => ch.charCodeAt(0) >= 19968 && ch.charCodeAt(0) < 40870 && !args.fontMap?.[ch.charCodeAt(0)])); };
    const clean = (el) => {
        if (!el)
            return '';
        const clone = el.cloneNode(true);
        clone.querySelectorAll('script,style,button,input,textarea,select,.newAnswerBx,.correctAnswerBx,.myAllAnswerBx,.mark_answer,.answerDiv,.analysis').forEach(n => n.remove());
        if (args.fontMap) {
            const walker = document.createTreeWalker(clone, NodeFilter.SHOW_TEXT);
            let node;
            while (node = walker.nextNode())
                if (node.parentElement?.closest('.font-cxsecret'))
                    node.textContent = [...(node.textContent || '')].map(ch => args.fontMap[ch.charCodeAt(0)] || ch).join('');
        }
        return (clone.textContent || '').replace(/\s+/g, ' ').trim();
    };
    const optionNodes = (el) => {
        for (const selector of ['.ans-videoquiz-opt', '.Zy_ulTop li', '.qtDetail li', 'span.saveSingleSelect', '.answerBg .answer_p', 'ul li .after,ul li label:not(.before)', '.before-after-checkbox', '.before-after', '.option']) {
            const nodes = [...el.querySelectorAll(selector)].filter(visible);
            if (nodes.length)
                return nodes;
        }
        return [];
    };
    const selected = (el) => { const input = el.querySelector('input[type=radio],input[type=checkbox]'); if (input)
        return input.checked; return el.matches('.check_answer,.check_answer_dx,.onChecked,[aria-checked=true]') || !!el.querySelector('.check_answer,.check_answer_dx,.onChecked,[aria-checked=true]') || el.closest('li')?.getAttribute('aria-checked') === 'true'; };
    const editorFields = (el) => {
        const frames = [...el.querySelectorAll('iframe')].filter(visible);
        const bodies = [];
        for (const frame of frames)
            try {
                const body = frame.contentDocument?.body;
                if (body?.isContentEditable || body?.getAttribute('contenteditable') === 'true')
                    bodies.push(body);
            }
            catch { }
        // 编辑器的隐藏 textarea 是提交载体，不另算一个空。
        const fields = [...el.querySelectorAll('textarea,input[type=text],[contenteditable=true],.InpDIV')].filter(visible)
            .filter(field => !field.parentElement?.closest('[contenteditable=true],.InpDIV'));
        return [...fields, ...bodies];
    };
    const fieldText = (el) => ('value' in el ? String(el.value) : el.innerText || el.textContent || '').trim();
    const matchingBoxes = (el) => [...el.querySelectorAll('.thirdUlList .dept_select,.line_answer_ct .selectBox')];
    const matchingRows = (el) => matchingBoxes(el).map((box, index) => {
        const select = box.matches('select') ? box : box.querySelector('select');
        const choices = select ? [...select.options].filter(option => option.value && !/请选择/.test(option.text)).map(option => ({ value: option.value, text: option.text })) : [...box.querySelectorAll('li[data]')].map(option => ({ value: option.getAttribute('data'), text: clean(option) }));
        const sink = el.querySelectorAll('.line_answer input[name^=answer]')[index];
        const label = clean(el.querySelectorAll('.firstUlList li,.line_wid_half.fl li')[index]) || '第 ' + (index + 1) + ' 项';
        return { label, choices, selected: select?.value || sink?.value || '' };
    });
    const describe = (el) => {
        const isVideo = !!el.closest('.ans-videoquiz');
        // 视频的 tkTopic_title 通常只是“判断题”；保留题干，单独移除选项和按钮。
        const videoStem = isVideo ? el.cloneNode(true) : null;
        videoStem?.querySelectorAll('.ans-videoquiz-opt,#videoquiz-submit,#videoquiz-continue,#knowledgeBack,#spanNotBackPoint,#spanNot').forEach(n => n.remove());
        let title = (isVideo ? videoStem : el.querySelector('.newZy_TItle,.Zy_TItle,.qtContent,.mark_name,.question-title,.question-stem'));
        if (!title) {
            title = el.cloneNode(true);
            title.querySelectorAll('.Zy_ulTop,.qtDetail,.answerBg,span.saveSingleSelect,.before-after-checkbox,.before-after,.option,.textDIV,.eidtDiv').forEach(node => node.remove());
        }
        const text = clean(title), nodes = optionNodes(el);
        const options = nodes.map((n, i) => { const text = clean(n), label = text || n.getAttribute('aria-label') || n.getAttribute('title') || n.querySelector('img[alt]')?.alt || ''; return { letter: (n.getAttribute('data')?.match(/^[A-Z]$/i)?.[0] || text.match(/^([A-Z])(?:[、.．)）:：\s]|$)/i)?.[1] || String.fromCharCode(65 + i)).toUpperCase(), text: label, verdict: judgeValue(label), selected: selected(n) }; });
        const judgement = /判断|是非题/.test(text) || (options.length === 2 && options.some(o => o.verdict === true) && options.some(o => o.verdict === false));
        const value = el.querySelector('input[id^=answertype]')?.value;
        const declared = { '0': 'single', '1': 'multiple', '2': 'text', '3': 'judge', '4': 'blank', '5': 'text', '6': 'text', '7': 'text', '8': 'blank', '9': 'text', '10': 'text', '11': 'matching', '14': 'unsupported', '15': 'unsupported' };
        const textFields = editorFields(el);
        let type = declared[value] || (judgement ? 'judge' : /多选/.test(text) || el.querySelector('input[type=checkbox],.before-after-checkbox') ? 'multiple' : options.length ? 'single' : /填空/.test(text) ? 'blank' : textFields.length ? 'text' : 'unsupported');
        const matching = type === 'matching' ? matchingRows(el) : undefined;
        if (type === 'matching' && (!matching.length || matching.some(row => !row.choices.length || new Set(row.choices.map(choice => choice.value)).size !== row.choices.length)))
            type = 'unsupported';
        if (type === 'matching')
            options.length = 0;
        const nonEmpty = textFields.length > 0 && textFields.every(field => fieldText(field));
        let imageHash = 0;
        for (const img of el.querySelectorAll('img'))
            for (const ch of img.currentSrc || img.src)
                imageHash = Math.imul(imageHash, 31) + ch.charCodeAt(0) | 0;
        return { text, options, type, matching, isVideo, signature: text + '\n' + options.map(o => o.letter + '. ' + o.text).join('\n') + (matching ? JSON.stringify(matching.map(({ selected, ...row }) => row)) : '') + (el.querySelector('img') ? '\nimage:' + imageHash : ''), hasImages: !!el.querySelector('img'), encoded: undecoded(el), answered: type === 'matching' ? matching.every(row => row.choices.some(choice => choice.value === row.selected)) : options.length ? options.some(o => o.selected) : nonEmpty };
    };
    const roots = [...document.querySelectorAll('.ans-videoquiz')].filter(visible).filter(n => n.querySelector('.tkTopic'));
    const works = [...document.querySelectorAll('.singleQuesId,.TiMu,.questionLi')].filter(visible)
        .filter(el => !el.parentElement?.closest('.singleQuesId,.TiMu,.questionLi'));
    const workElements = new Map();
    const workQuestions = works.flatMap((el, index) => {
        const parts = [...el.querySelectorAll('.reading_answer,.filling_answer')].filter(visible)
            .filter(part => !part.parentElement?.closest('.reading_answer,.filling_answer'));
        if (!parts.length) {
            const id = 'work:' + index;
            workElements.set(id, el);
            return [{ id, ...describe(el) }];
        }
        const shared = el.cloneNode(true);
        shared.querySelectorAll('.reading_answer,.filling_answer').forEach(part => part.remove());
        const passage = clean(shared);
        return parts.map((part, sub) => {
            const id = 'work:' + index + ':' + sub, question = describe(part);
            workElements.set(id, part);
            question.text = passage + '\n小题 ' + (sub + 1) + '：' + question.text;
            question.signature = question.text + '\n' + question.options.map(option => option.letter + '. ' + option.text).join('\n');
            question.hasImages ||= !!shared.querySelector('img');
            question.encoded ||= undecoded(shared);
            return { id, ...question };
        });
    });
    const questions = [...roots.map((el, index) => ({ id: 'video:' + index, ...describe(el) })), ...workQuestions];
    const url = new URL(location.href), chapter = url.searchParams.get('chapterId') || url.searchParams.get('knowledgeid') || '';
    const tabs = [...document.querySelectorAll('#prev_tab li')].map((el, index) => ({ index, text: el.getAttribute('title') || el.innerText.trim(), active: el.classList.contains('active'), id: el.id }));
    const active = tabs.find(t => t.active);
    const top = /(?:^|\/)studentstudy(?:\/|$)/.test(url.pathname);
    const scope = url.origin + url.pathname + '?course=' + (url.searchParams.get('courseId') || url.searchParams.get('courseid') || '') + '&class=' + (url.searchParams.get('clazzid') || '');
    const pageKey = chapter + ':' + (active?.id || '');
    // 仅解析目录提供的章节标识，不 eval onclick；不把完成图标当作测验状态。
    const chapterNodes = [...document.querySelectorAll('[onclick^="getTeacherAjax"],[data-chapter-id]')];
    const chapters = [];
    const chapterTargets = new Map();
    for (const el of chapterNodes) {
        const call = el.getAttribute('onclick') || '', values = [...call.matchAll(/['"]([^'"]*)['"]/g)].map(match => match[1]);
        const id = el.dataset.chapterId || (/^getTeacherAjax\s*\(/.test(call) ? values[2] : '');
        if (!/^\d{1,30}$/.test(id || ''))
            continue;
        if (values.length >= 3 && ((url.searchParams.get('courseId') && values[0] !== url.searchParams.get('courseId')) || (url.searchParams.get('clazzid') && values[1] !== url.searchParams.get('clazzid'))))
            continue;
        const locked = !!el.closest('[aria-disabled="true"],.disabled,.locked,[data-locked="true"]');
        const previous = chapters.find(item => item.id === id);
        if (previous) {
            previous.locked ||= locked;
            continue;
        }
        chapters.push({ id, title: (el.getAttribute('title') || el.innerText || '章节 ' + id).trim().slice(0, 120), locked });
        chapterTargets.set(id, el);
    }
    if (args.expectedPageKey && pageKey !== args.expectedPageKey)
        return { ok: false, error: '章节或任务已切换，已取消旧操作。' };
    if (args.expectedPath && url.pathname !== args.expectedPath)
        return { ok: false, error: '框架页面已变化，已取消旧操作。' };
    const taskInfo = (el) => {
        const wrapper = el.closest('.ans-attach-ct') || frameWrapper;
        const ref = [reference(el), reference(wrapper), ...taskRefs].find(ref => ref.jobId || ref.contentId) || { jobId: '', contentId: '' };
        return { ...ref, required: wrapper ? !!wrapper.querySelector('.ans-job-icon') : null, jobDone: !!wrapper?.classList.contains('ans-job-finished') };
    };
    const mediaElements = [...document.querySelectorAll('video,audio')].filter(el => visible(el) || visible(el.closest('.video-js')) || el.tagName === 'AUDIO' && visible(el.closest('.swiper-slide-active')));
    const videos = mediaElements.map((el, index) => ({ id: identity(el), index, order: [...order, orderedNodes.indexOf(el)], paused: el.paused, ended: el.ended, time: el.currentTime, duration: Number.isFinite(el.duration) ? el.duration : 0, error: el.error?.code || 0, ...taskInfo(el) }));
    const players = [...document.querySelectorAll('.video-js')].filter(visible).filter(el => !el.querySelector('video,audio')).map(el => ({ id: identity(el), order: [...order, orderedNodes.indexOf(el)], ...taskInfo(el) }));
    const mediaFrames = [...document.querySelectorAll('iframe')].flatMap((el, index) => {
        if (!visible(el))
            return [];
        const info = taskInfo(el), knownMedia = /\/modules\/(video|audio)\//.test(el.getAttribute('src') || '') || /insertvideo|insertaudio/.test(el.getAttribute('data-module') || el.getAttribute('data') || '');
        if (!knownMedia && !info.jobId && !info.contentId)
            return [];
        return [{ id: identity(el), order: [...order, orderedNodes.indexOf(el)], ...info, unclassified: !knownMedia }];
    });
    const jobs = [...document.querySelectorAll('.ans-job-icon')].filter(visible).map(el => ({ done: !!el.closest('.ans-job-finished'), type: el.className, condition: el.getAttribute('aria-label') || el.innerText.slice(0, 100) }));
    const documentElements = [...document.querySelectorAll('.swiper-container,#img.imglook,iframe[name=bookifame][src*=timing],#hyperlink,#reader,#ReadWeb')].filter(visible);
    const documents = documentElements.map(el => {
        const slides = [...el.querySelectorAll('.swiper-slide:not(.swiper-slide-duplicate)')];
        const jumper = document.querySelector('#pagejump');
        const position = slides.length ? slides.findIndex(slide => slide.classList.contains('swiper-slide-active')) : el.matches('#reader,#ReadWeb') && jumper ? jumper.selectedIndex : -1;
        const next = el.querySelector('.swiper-button-next') || document.querySelector('.swiper-button-next');
        const type = el.matches('.swiper-container') ? 'slides' : el.matches('#hyperlink') ? 'link' : el.matches('iframe,#reader') ? 'timed-reading' : 'reading';
        const timing = Number(new URL(location.href).searchParams.get('timing') || '60');
        return { id: identity(el), type, position, legacy: el.matches('#ReadWeb') && !jumper, total: slides.length || ((el.matches('#reader,#ReadWeb') && jumper) ? jumper.options.length : 0), waitSeconds: type === 'timed-reading' ? Math.max(3, Number.isFinite(timing) ? timing : 60) : 3, canNext: slides.length ? visible(next) && !next.matches('.swiper-button-disabled,[aria-disabled=true],[disabled]') : !!jumper && jumper.selectedIndex < jumper.options.length - 1, ...taskInfo(el) };
    });
    const submitted = !!document.querySelector('.testTit_status_complete') || /待批阅/.test(document.querySelector('.testTit_status')?.innerText || '');
    const fontStyle = [...document.querySelectorAll('style')].find(el => el.textContent.includes('font-cxsecret') && el.textContent.includes('base64,'));
    const fontBase64 = fontStyle?.textContent.match(/base64,([A-Za-z0-9+/=]+)/)?.[1] || '';
    const confirmWork = visible(document.getElementById('workpop')) && visible(document.getElementById('popok')) ? { text: document.getElementById('popcontent')?.innerText || '' } : null;
    const quizRejected = ['spanNotBackPoint', 'spanNot'].some(id => visible(document.getElementById(id)));
    const knowledgeBack = visible(document.getElementById('knowledgeBack'));
    const notice = [...document.querySelectorAll('.layui-layer-content,.toast,.message,.ant-message-notice-content,#saveStatus,#popcontent')].filter(visible).map(n => n.innerText).join(' ');
    const saveConfirmed = /保存成功|已保存|暂存成功/.test(notice), receiptObserved = !!globalThis.__localWorkEvents;
    const incompleteButton = document.querySelector('.popBottom .nextChapter');
    const incompletePrompt = visible(incompleteButton);
    const children = [...document.querySelectorAll('iframe')].map(el => ({ url: el.src, order: orderedNodes.indexOf(el), visible: visible(el), ref: reference(el) }));
    if (operation === 'scan')
        return { children, top, scope, pageKey, path: url.pathname, order, taskRefs, mediaFrames, players, documents, exam: /\/exam-ans\//.test(url.pathname), tabs, chapters, active: active?.index ?? -1, questions: submitted ? [] : questions, submitted, videos, jobs, fontBase64, confirmWork, saveConfirmed, receiptObserved, incompletePrompt, quizRejected, knowledgeBack, hasCourseFrame: !!document.querySelector('#iframe'), continueQuiz: visible(document.getElementById('videoquiz-continue')), nextEnabled: visible(document.getElementById('prevNextFocusNext')) && !document.getElementById('prevNextFocusNext')?.classList?.contains('disabled') };
    if (operation === 'readImages')
        return (async () => {
            const q = questions.find(q => q.id === args.questionId);
            if (!q || q.signature !== args.signature)
                return { ok: false, error: '图片题已变化。' };
            const el = q.isVideo ? roots[Number(q.id.split(':')[1])] : workElements.get(q.id);
            const shared = el.closest('.singleQuesId,.TiMu,.questionLi');
            const source = [...el.querySelectorAll('img'), ...(shared && shared !== el ? [...shared.querySelectorAll('img')].filter(img => !img.closest('.reading_answer,.filling_answer')) : [])];
            if (!source.length || source.length > 8)
                return { ok: false, error: '图片数量超出支持范围。' };
            const images = [], imageSources = [];
            let bytes = 0;
            for (const img of source) {
                if (!img.complete || img.naturalWidth < 3 || img.naturalHeight < 3 || img.naturalWidth > 8192 || img.naturalHeight > 8192)
                    return { ok: false, error: '题目图片未加载、无有效像素或尺寸过大。' };
                const canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                const option = optionNodes(el).findIndex(node => node.contains(img)), label = option >= 0 ? '选项 ' + q.options[option].letter + ' 的图片' : '题干或共同材料图片 ' + (images.length + imageSources.length + 1);
                try {
                    canvas.getContext('2d').drawImage(img, 0, 0);
                    const data = canvas.toDataURL('image/png');
                    bytes += data.length;
                    if (bytes > 8000000)
                        return { ok: false, error: '题目图片超过本地 8 MB 限制。' };
                    images.push({ label, data });
                }
                catch {
                    imageSources.push({ label, url: img.currentSrc || img.src });
                }
            }
            if (describe(el).signature !== q.signature && !q.id.includes(':', 5))
                return { ok: false, error: '读取图片时题目已变化。' };
            return { ok: true, images, imageSources };
        })();
    if (operation === 'readSlide') {
        const doc = documents.find(doc => doc.id === args.id), el = documentElements.find(el => el.__localStudyId === args.id);
        if (!doc || doc.type !== 'slides' || doc.position !== args.index)
            return { ok: true, recheck: true };
        const local = el.querySelector('.swiper-button-next');
        const outside = [...document.querySelectorAll('.swiper-button-next')].filter(visible);
        const button = local || (outside.length === 1 ? outside[0] : null);
        if (!visible(button) || button.matches('.swiper-button-disabled,[aria-disabled=true],[disabled]'))
            return { ok: false, error: '课件没有唯一可用的原生下一页按钮，请手动翻页。' };
        button.click();
        return { ok: true };
    }
    if (operation === 'readPage') {
        const doc = documents.find(doc => doc.id === args.id), el = documentElements.find(el => el.__localStudyId === args.id), jumper = document.querySelector('#pagejump');
        if (!doc || !el?.matches('#reader,#ReadWeb') || doc.position !== args.index)
            return { ok: true, recheck: true };
        if (!jumper || doc.position < 0)
            return { ok: false, error: '阅读器页码未识别。' };
        if (doc.position < doc.total - 1) {
            const option = jumper.options[doc.position + 1];
            if (!option || option.disabled)
                return { ok: false, error: '阅读器下一页不可用。' };
            jumper.value = option.value;
            jumper.dispatchEvent(new Event('change', { bubbles: true }));
            return { ok: true };
        }
        const buttons = [...document.querySelectorAll('.readerPager')].filter(button => visible(button) && getComputedStyle(button).zIndex === '101');
        if (buttons.length !== 1)
            return { ok: false, error: '没有唯一的阅读完成按钮，请检查平台提示。' };
        buttons[0].click();
        return { ok: true };
    }
    if (operation === 'openLink') {
        const el = documentElements.find(el => el.__localStudyId === args.id);
        if (!el?.matches('#hyperlink'))
            return { ok: true, recheck: true };
        const link = el.matches('a') ? el : el.querySelector('a[href]');
        if (!link || !/^https?:$/.test(new URL(link.href).protocol))
            return { ok: false, error: '链接任务没有可用的原生链接。' };
        link.click();
        return { ok: true };
    }
    if (operation === 'readBook') {
        const readers = documentElements.filter(el => el.matches('#ReadWeb'));
        if (readers.length !== 1)
            return { ok: false, error: '没有唯一的原生书籍阅读器。' };
        const native = globalThis;
        if (typeof native.readweb?.goto !== 'function' || native.epage === undefined)
            return { ok: true, pending: true };
        const end = Number(native.epage);
        if (!Number.isInteger(end) || end < 1 || end > 100000)
            return { ok: false, error: '书籍阅读器的末页未能安全识别。' };
        // OCS 的普通书籍兼容入口；调用页面 API 后仍等待平台确认，不调用任务上报接口。
        native.readweb.goto(end);
        return { ok: true };
    }
    if (operation === 'reloadMedia') {
        const el = mediaElements.find(el => el.__localStudyId === args.id);
        if (!el)
            return { ok: true, recheck: true };
        el.pause();
        el.load();
        return { ok: true };
    }
    if (operation === 'prepareMedia') {
        const el = [...document.querySelectorAll('iframe,.video-js')].find(el => el.__localStudyId === args.id && visible(el));
        if (!el)
            return { ok: false, error: '待加载的播放器已变化。' };
        el.scrollIntoView({ block: 'nearest' });
        if (el.matches('.video-js') && !el.querySelector('video,audio')) {
            const button = [...el.querySelectorAll('.vjs-big-play-button,.vjs-play-control')].find(visible);
            if (button && (!el.__localStudyBoot || Date.now() - el.__localStudyBoot > 3000)) {
                el.__localStudyBoot = Date.now();
                button.click();
            }
        }
        return { ok: true };
    }
    if (operation === 'play') {
        const el = args.id === undefined ? mediaElements[args.index] : mediaElements.find(el => el.__localStudyId === args.id);
        if (!el)
            return { ok: true, recheck: true };
        if (el.ended)
            return { ok: true, ended: true };
        el.muted = !!args.muted;
        el.playbackRate = args.rate;
        if (!el.paused)
            return { ok: true };
        // 有些播放器点击中央按钮后才设置媒体源。先走原生按钮，再等待 play()；
        // 未加载完成的 Promise 不占住整个课程调度，也不重复点击仍在启动的播放器。
        let attempt = el.__localStudyPlay;
        if (!attempt || attempt.runId !== args.runId || (!attempt.pending && Date.now() - attempt.at >= 3000)) {
            attempt = { runId: args.runId, at: Date.now(), pending: true };
            el.__localStudyPlay = attempt;
            const player = el.closest('.video-js');
            const button = player && [...player.querySelectorAll('.vjs-big-play-button,.vjs-play-control')].find(visible);
            if (button)
                button.click();
            el.muted = !!args.muted;
            el.playbackRate = args.rate;
            try {
                attempt.promise = Promise.resolve(el.play()).then(() => ({ ok: true })).catch(error => {
                    if (error.name === 'AbortError' || (error.name === 'NotSupportedError' && !el.error && el.readyState === 0))
                        return { ok: true, pending: true };
                    return { ok: false, error: error.name === 'NotAllowedError' ? '浏览器阻止了自动播放，请在课程播放器点击一次播放，再继续运行。' : '播放器启动失败，请检查页面中的播放提示。' };
                }).finally(() => { attempt.pending = false; });
            }
            catch {
                attempt.pending = false;
                return { ok: false, error: '播放器启动失败，请检查页面中的播放提示。' };
            }
        }
        let timer;
        return Promise.race([attempt.promise, new Promise(resolve => { timer = setTimeout(() => resolve({ ok: true, pending: true }), 750); })]).finally(() => clearTimeout(timer));
    }
    if (operation === 'pause') {
        document.querySelectorAll('video,audio').forEach(el => { if (args.id === undefined || el.__localStudyId === args.id) {
            el.pause();
            delete el.__localStudyPlay;
        } });
        return { ok: true };
    }
    if (operation === 'fill') {
        const q = questions.find(q => q.id === args.questionId);
        if (!q || q.signature !== args.signature)
            return { ok: false, error: '题目已变化，已取消填写。' };
        if (q.answered)
            return { ok: false, error: '题目已有答案，已保留原填写内容。' };
        const el = q.isVideo ? roots[Number(q.id.split(':')[1])] : workElements.get(q.id);
        const nodes = optionNodes(el), answer = args.answer;
        if (q.type === 'matching') {
            if (q.matching.some(row => row.selected))
                return { ok: false, error: '连线题已有部分答案，未覆盖。' };
            const values = answer.matches;
            if (!Array.isArray(values) || values.length !== q.matching.length || values.some((value, i) => q.matching[i].choices.filter(choice => choice.value === value).length !== 1))
                return { ok: false, error: '连线答案未能唯一对应每一行。' };
            const boxes = matchingBoxes(el);
            for (let i = 0; i < boxes.length; i++) {
                const box = boxes[i], select = box.matches('select') ? box : box.querySelector('select');
                if (select) {
                    select.value = values[i];
                    select.dispatchEvent(new Event('change', { bubbles: true }));
                }
                else {
                    const items = [...box.querySelectorAll('li[data]')].filter(item => item.getAttribute('data') === values[i]);
                    if (items.length !== 1)
                        return { ok: false, error: '连线原生选项不唯一。' };
                    (items[0].querySelector('a') || items[0]).click();
                }
            }
            if (JSON.stringify(matchingRows(el).map(row => row.selected)) !== JSON.stringify(values))
                return { ok: false, error: '连线选择后未得到页面确认。' };
        }
        else if (q.options.length) {
            const letters = answer.choices;
            if (!Array.isArray(letters) || !letters.length || new Set(letters).size !== letters.length || letters.some(letter => q.options.filter(o => o.letter === letter).length !== 1) || (q.type !== 'multiple' && letters.length !== 1))
                return { ok: false, error: '答案与页面选项不匹配。' };
            for (let i = 0; i < nodes.length; i++) {
                const want = letters.includes(q.options[i].letter), input = nodes[i].querySelector('input[type=radio],input[type=checkbox]');
                if (want !== selected(nodes[i]) && (want || q.type === 'multiple'))
                    (input || nodes[i].querySelector('[name^=answer]') || nodes[i]).click();
            }
            const actual = nodes.map((n, i) => selected(n) ? q.options[i].letter : null).filter(Boolean).sort();
            if (JSON.stringify(actual) !== JSON.stringify([...letters].sort()))
                return { ok: false, error: '选项点击后没有得到页面确认。' };
        }
        else {
            const values = q.type === 'blank' ? answer.blanks : [answer.text];
            if (!Array.isArray(values) || !values.length || values.some(v => typeof v !== 'string' || !v.trim()))
                return { ok: false, error: '文字答案缺失。' };
            const fields = editorFields(el);
            if (values.length !== fields.length)
                return { ok: false, error: '答案数量与输入框数量不一致，未填写。' };
            if (fields.some(field => fieldText(field)))
                return { ok: false, error: '部分输入框已有答案，请手动核对；未覆盖已有内容。' };
            for (let i = 0; i < fields.length; i++) {
                const field = fields[i];
                if ('value' in field) {
                    const proto = field.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
                    Object.getOwnPropertyDescriptor(proto, 'value').set.call(field, values[i]);
                }
                else {
                    const editors = globalThis.UE?.instants;
                    const editor = Object.values(editors || {}).find(editor => editor.body === field);
                    if (editor?.setContent) {
                        const safe = values[i].replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
                        editor.setContent(safe);
                        editor.sync?.();
                    }
                    else
                        field.textContent = values[i];
                }
                const view = field.ownerDocument.defaultView || window;
                field.dispatchEvent(new view.Event('input', { bubbles: true }));
                field.dispatchEvent(new view.Event('change', { bubbles: true }));
                field.dispatchEvent(new view.Event('blur', { bubbles: true }));
                if (fieldText(field) !== values[i].trim())
                    return { ok: false, error: '输入框未保留填写内容。' };
                const editorFrame = field.ownerDocument.defaultView?.frameElement;
                if (editorFrame && el.contains(editorFrame)) {
                    const sink = editorFrame.parentElement?.querySelector('textarea');
                    if (sink) {
                        Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(sink, values[i]);
                        sink.dispatchEvent(new Event('input', { bubbles: true }));
                        sink.dispatchEvent(new Event('change', { bubbles: true }));
                        if (sink.value !== values[i])
                            return { ok: false, error: '编辑器的提交内容未同步。' };
                    }
                }
            }
        }
        return { ok: true };
    }
    if (operation === 'submitQuiz') {
        const q = questions.find(q => q.id === args.questionId);
        if (!q || !q.isVideo || q.signature !== args.signature)
            return { ok: false, error: '视频弹题已变化。' };
        if (!q.answered)
            return { ok: false, error: '视频弹题尚未填写，不提交空答案。' };
        const button = document.getElementById('videoquiz-submit');
        if (!visible(button))
            return { ok: false, error: '未找到视频弹题提交按钮。' };
        button.click();
        return { ok: true };
    }
    if (operation === 'continueQuiz') {
        if (quizRejected || knowledgeBack)
            return { ok: false, error: '视频弹题未通过，请检查答案和回看提示。' };
        const button = document.getElementById('videoquiz-continue');
        if (!visible(button))
            return { ok: false, error: '视频弹题尚未确认通过。' };
        button.click();
        return { ok: true };
    }
    if (operation === 'submitWork') {
        if (/\/exam-ans\//.test(url.pathname))
            return { ok: false, error: '当前是考试页，请手动核对并提交。' };
        if (!works.length || questions.some(q => !q.answered))
            return { ok: false, error: '测验中存在未填写的题目。' };
        const button = document.querySelector('a.btnSubmit.workBtnIndex');
        if (!visible(button))
            return { ok: false, error: '未找到已适配的章节测验提交按钮。' };
        document.activeElement?.blur();
        document.querySelector('.ZY_sub.clearfix')?.click();
        button.click();
        return { ok: true };
    }
    if (operation === 'saveWork') {
        if (/\/exam-ans\//.test(url.pathname))
            return { ok: false, error: '考试页请手动保存。' };
        if (!works.length || (!args.allowPartial && questions.some(q => !q.answered)))
            return { ok: false, error: '测验中存在未填写的题目。' };
        const adapted = [...document.querySelectorAll('.btnSave.workBtnIndex')].filter(visible);
        const buttons = adapted.length ? adapted : [...document.querySelectorAll('a,button,input[type=button]')].filter(visible).filter(n => /^(暂时保存|暂存|保存)$/.test((n.innerText || n.value || '').trim()));
        if (buttons.length !== 1)
            return { ok: false, error: '没有找到唯一的“暂时保存”按钮，请手动保存。' };
        document.activeElement?.blur();
        document.querySelector('.ZY_sub.clearfix')?.click();
        buttons[0].click();
        return { ok: true };
    }
    if (operation === 'confirmWork') {
        if (!confirmWork || /未做完|未达到及格线|错误|失败|异常/.test(confirmWork.text))
            return { ok: false, error: '测验提交弹窗需要手动检查。' };
        document.getElementById('popok').click();
        return { ok: true };
    }
    if (operation === 'nextCard') {
        const el = document.querySelectorAll('#prev_tab li')[args.index];
        if (!visible(el) || el.classList.contains('active'))
            return { ok: false, error: '下一项任务不存在或已切换。' };
        el.click();
        return { ok: true };
    }
    if (operation === 'nextChapter') {
        const el = document.getElementById('prevNextFocusNext');
        if (!visible(el) || el.classList.contains('disabled'))
            return { ok: false, error: '没有可用的下一节。' };
        el.click();
        return { ok: true };
    }
    if (operation === 'openChapter') {
        const target = chapters.find(item => item.id === args.chapterId);
        if (!target || target.locked || target.id === chapter)
            return { ok: false, error: '目录中没有可进入的目标章节。' };
        const el = chapterTargets.get(target.id);
        if (!el)
            return { ok: false, error: '章节目录已变化。' };
        el.scrollIntoView({ block: 'nearest' });
        el.click();
        return { ok: true };
    }
    if (operation === 'continueIncomplete') {
        if (!args.allowIncomplete || !incompletePrompt)
            return { ok: false, error: '没有已授权跳过的未完成任务提示。' };
        incompleteButton.click();
        return { ok: true };
    }
    return { ok: false, error: '未知课程操作。' };
}
const CourseEngine = (() => {
    const locks = new Map(), receiptWrites = new Map();
    const documentChanged = (error) => /frame.*removed|No frame|No document|document.*unload/i.test(error.message || '');
    const key = (tabId) => 'course-run-' + tabId;
    const receiptKey = (tabId) => 'course-receipts-' + tabId;
    const load = async (tabId) => {
        const current = (await chrome.storage.session.get(key(tabId)))[key(tabId)];
        if (current)
            return current;
        const restored = await restoreCourse(tabId);
        if (restored) {
            await chrome.storage.session.set({ [key(tabId)]: restored });
            return restored;
        }
        return { running: false, phase: 'idle', logs: [], answered: 0 };
    };
    const save = async (tabId, state) => { const old = await load(tabId); if (old.runId && old.runId !== state.runId)
        return false; await persistCourse(state); const latest = await load(tabId); if (latest.runId && latest.runId !== state.runId)
        return false; await chrome.storage.session.set({ [key(tabId)]: state }); return true; };
    const log = (state, text) => { if (state.logs.at(-1)?.text === text)
        return; state.logs.push({ time: Date.now(), text }); state.logs = state.logs.slice(-12); };
    const learningPage = courseContext;
    const scan = async (tabId, decodeFonts = true) => {
        let results;
        try {
            results = await chrome.scripting.executeScript({ target: { tabId, allFrames: true }, func: courseFrame, args: ['scan'] });
        }
        catch (error) {
            // 整页切换时旧框架可能先被移除；下一轮重新扫描，不沿用旧文档执行操作。
            const tab = await chrome.tabs.get(tabId);
            if (tab.status === 'loading' || documentChanged(error))
                return [];
            throw error;
        }
        const frames = results.filter(f => f.result).map(f => ({ ...f.result, frameId: f.frameId, documentId: f.documentId }));
        for (let i = 0; i < frames.length; i++)
            if (decodeFonts && frames[i].fontBase64 && frames[i].questions.some(q => q.encoded)) {
                const frame = frames[i];
                let fontMap = {};
                try {
                    fontMap = localFontMap(frame.fontBase64);
                }
                catch { }
                const target = frame.documentId ? { tabId, documentIds: [frame.documentId] } : { tabId, frameIds: [frame.frameId] };
                const chars = frame.questions.filter(q => q.encoded).map(q => q.text + q.options.map(option => option.text).join('')).join('');
                if ([...chars].some(ch => ch.charCodeAt(0) >= 19968 && ch.charCodeAt(0) < 40870 && !fontMap[ch.charCodeAt(0)]))
                    try {
                        await chrome.scripting.executeScript({ target, files: ['glyph.js'] });
                        const mapped = await chrome.scripting.executeScript({ target, func: async (base64, chars, url) => RunaGlyph(base64, chars, url), args: [frame.fontBase64, chars, chrome.runtime.getURL('lib/font_ref_cx.bin')] });
                        fontMap = { ...fontMap, ...mapped[0]?.result };
                    }
                    catch (error) {
                        if (documentChanged(error))
                            throw error;
                    }
                const result = await chrome.scripting.executeScript({ target, func: courseFrame, args: ['scan', { fontMap }] });
                if (result[0]?.result)
                    frames[i] = { ...result[0].result, frameId: frame.frameId, documentId: frame.documentId, fontMap };
            }
        const cards = frames.filter(frame => /\/knowledge\/cards(?:\/|$)/.test(frame.path));
        if (cards.length) {
            try {
                const target = cards.every(frame => frame.documentId) ? { tabId, documentIds: cards.map(frame => frame.documentId) } : { tabId, frameIds: cards.map(frame => frame.frameId) };
                const metadata = await chrome.scripting.executeScript({ target, world: 'MAIN', func: readPlatformTasks });
                for (const result of metadata) {
                    const frame = cards.find(frame => frame.frameId === result.frameId && frame.documentId === result.documentId);
                    if (frame && Array.isArray(result.result?.tasks))
                        frame.metadata = result.result.tasks;
                }
            }
            catch (error) {
                if (!documentChanged(error))
                    throw error;
            }
        }
        if (chrome.webNavigation?.getAllFrames) {
            const tree = await chrome.webNavigation.getAllFrames({ tabId });
            const normalize = (frame, seen = new Set()) => {
                if (seen.has(frame.frameId))
                    return;
                seen.add(frame.frameId);
                const node = tree?.find(node => node.frameId === frame.frameId && (!frame.documentId || node.documentId === frame.documentId));
                frame.parentFrameId = node?.parentFrameId;
                const parent = frames.find(parent => parent.frameId === node?.parentFrameId);
                if (!parent || frame.top)
                    return;
                normalize(parent, seen);
                if (!parent.path) {
                    frame.path = '';
                    frame.questions = [];
                    frame.videos = [];
                    frame.players = [];
                    frame.mediaFrames = [];
                    frame.documents = [];
                    return;
                }
                const links = (parent.children || []).filter(link => link.url === node.url);
                if (links.length !== 1) {
                    // 同 URL 可以出现多个附件。同源已读到真实 DOM 顺序时保留它，不能用 frameId 改序。
                    if (!frame.order.length)
                        frame.order = [...parent.order, Number.MAX_SAFE_INTEGER, frame.frameId];
                    return;
                }
                const link = links[0];
                if (!link.visible) {
                    frame.path = '';
                    frame.questions = [];
                    frame.videos = [];
                    frame.players = [];
                    frame.mediaFrames = [];
                    frame.documents = [];
                    return;
                }
                const old = frame.order;
                frame.order = [...parent.order, link.order];
                for (const item of [...frame.videos, ...(frame.players || []), ...(frame.mediaFrames || [])])
                    item.order = [...frame.order, ...item.order.slice(old.length)];
                frame.taskRefs = [link.ref, ...(parent.taskRefs || []), ...(frame.taskRefs || [])];
                for (const item of [...frame.videos, ...(frame.players || []), ...(frame.documents || [])])
                    if (!item.jobId && !item.contentId) {
                        const ref = frame.taskRefs.find(ref => ref.jobId || ref.contentId);
                        if (ref)
                            Object.assign(item, ref);
                    }
            };
            frames.forEach(frame => normalize(frame));
            const root = frames.filter(frame => frame.top);
            if (root.length !== 1)
                return [];
            const inRoot = (frame) => frame === root[0] || frames.some(parent => parent.frameId === frame.parentFrameId && parent !== frame && inRoot(parent));
            const selected = frames.filter(frame => frame.path && inRoot(frame));
            applyPlatformTasks(selected);
            return selected;
        }
        applyPlatformTasks(frames);
        return frames;
    };
    const act = async (tabId, frame, operation, args = {}) => {
        const target = frame.documentId ? { tabId, documentIds: [frame.documentId] } : { tabId, frameIds: [frame.frameId] };
        const results = await chrome.scripting.executeScript({ target, ...(['fill', 'readBook'].includes(operation) ? { world: 'MAIN' } : {}), func: courseFrame, args: [operation, { ...args, fontMap: frame.fontMap, expectedPath: frame.path, ...(frame.top ? { expectedPageKey: frame.pageKey } : {}) }] });
        const result = results[0]?.result;
        if (!result?.ok)
            throw new Error(result?.error || '页面在操作过程中发生了变化。');
        return result;
    };
    const pause = async (tabId, state, text, phase = 'review') => { state.running = false; state.phase = phase === 'finished' && Object.values(state.discussionRecords || {}).some(record => ['pending', 'publishing'].includes(record.status)) ? 'finished-pending' : phase; log(state, text); await save(tabId, state); return state; };
    const digest = (text) => { let hash = 2166136261; for (const char of text) {
        hash ^= char.charCodeAt(0);
        hash = Math.imul(hash, 16777619);
    } return (hash >>> 0).toString(16); };
    const pendingKey = (pageKey, q) => pageKey + ':' + q.id + ':' + digest(q.text + '\n' + (q.options || []).map(o => o.text.replace(/^[A-Z][、.．)）:：\s]+/i, '')).sort().join('\n'));
    const parseAnswer = (raw, q) => {
        let data;
        try {
            data = JSON.parse(raw.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, ''));
        }
        catch {
            throw new Error('模型未返回可填写的 JSON 答案。');
        }
        if (data.uncertain !== false)
            throw new Error('模型无法确定答案，请手动检查。');
        if (q.type === 'judge') {
            if (typeof data.verdict !== 'boolean' || q.options.length !== 2 || q.options.some(o => typeof o.verdict !== 'boolean') || q.options[0].verdict === q.options[1].verdict)
                throw new Error('判断题缺少明确对错或选项语义，请手动检查。');
            const letter = q.options.find(o => o.verdict === data.verdict).letter;
            if (data.choices !== undefined && JSON.stringify(data.choices) !== JSON.stringify([letter]))
                throw new Error('模型的对错结论与选项字母冲突，未填写。');
            data.choices = [letter];
        }
        if (q.type === 'matching') {
            if (!Array.isArray(data.matches) || data.matches.length !== q.matching?.length || data.matches.some((value, i) => typeof value !== 'string' || q.matching[i].choices.filter(choice => choice.value === value).length !== 1))
                throw new Error('连线题答案无法唯一对应每一行。');
        }
        else if (q.options.length) {
            if (!Array.isArray(data.choices) || !data.choices.length || data.choices.some(s => typeof s !== 'string') || new Set(data.choices).size !== data.choices.length || data.choices.some(c => q.options.filter(o => o.letter === c).length !== 1) || (q.type !== 'multiple' && data.choices.length !== 1))
                throw new Error('模型答案无法唯一匹配选项。');
        }
        else if (q.type === 'blank') {
            if (!Array.isArray(data.blanks) || !data.blanks.length || data.blanks.some(s => typeof s !== 'string' || !s.trim()))
                throw new Error('填空答案格式不正确。');
        }
        else if (typeof data.text !== 'string' || !data.text.trim())
            throw new Error('没有返回文字答案。');
        return data;
    };
    async function solve(q, prompt, signal, progress = async () => { }) {
        const c = await config(), official = new URL(c.baseUrl).hostname === 'api.deepseek.com';
        const canonical = (name) => official ? /^deepseek-(?:v4-)?flash(?:-vision-exp)?$/i.test(name) ? 'flash' : name === 'deepseek-v4-pro' ? 'pro' : name : name;
        const second = c.reviewModel || c.model;
        // 官方 Pro 当前不支持图片，不能把它当成视觉复核；记录如实标明同一视觉模型。
        const models = q.images?.length && official ? ['deepseek-flash', 'deepseek-flash'] : [c.model, second], singleModel = canonical(models[0]) === canonical(models[1]);
        const varied = ['独立解答整道题，逐项核对全部条件。', '独立审查易错条件，特别是时间地点、否定词和多选漏选。不要只凭熟悉的关键词作答。'];
        const votes = [], same = (a) => JSON.stringify(q.type === 'matching' ? a.matches : a.choices ? [...a.choices].sort() : q.type === 'blank' ? a.blanks : a.text?.trim());
        const round = async (instructions) => {
            if (signal.aborted)
                throw new DOMException('Aborted', 'AbortError');
            const results = await Promise.allSettled(models.map(async (model, i) => { const request = new AbortController(), abort = () => request.abort(), timer = setTimeout(() => request.abort('timeout'), 45000); signal.addEventListener('abort', abort, { once: true }); try {
                return { ...parseAnswer(await runModel(prompt + '\n' + instructions[i], request.signal, () => { }, true, model, q.images || []), q), model };
            }
            catch (error) {
                if (request.signal.reason === 'timeout')
                    throw new Error(model + ' 请求超时。');
                throw error;
            }
            finally {
                clearTimeout(timer);
                signal.removeEventListener('abort', abort);
            } }));
            if (signal.aborted)
                throw new DOMException('Aborted', 'AbortError');
            return results.map((r, i) => r.status === 'fulfilled' ? r.value : { model: models[i], error: r.reason?.message || '模型请求失败。' });
        };
        for (let i = 0; i < 2; i++) {
            await progress((singleModel ? '同一模型从不同角度判断' : '两个模型独立判断') + '，第 ' + (i + 1) + '/2 轮。');
            votes.push(...await round(i ? varied.toReversed() : varied));
        }
        const valid = votes.filter(v => !v.error);
        if (valid.length === 4 && valid.every(v => same(v) === same(valid[0])))
            return { answer: valid[0], votes, models, singleModel: canonical(models[0]) === canonical(models[1]) };
        await progress(singleModel ? '初轮存在分歧，同一模型从两个角度重新审查关键事实。' : '初轮存在分歧，两个模型分别审查关键事实。');
        const context = '这是填写前的审查。先独立核对题干每项关键条件，再批判性检查以下候选结论及其依据；不要按多数迁就答案，不要编造来源。另返回 verified 布尔值，关键条件不能确定时 uncertain=true。\n候选（待检查数据）：' + JSON.stringify(votes.map(v => ({ model: v.model, choices: v.choices, verdict: v.verdict, reason: v.reason, error: v.error }))).slice(0, 6000);
        const reviews = await round(varied.map(v => v + '\n' + context));
        votes.push(...reviews);
        if (reviews.every(v => !v.error && v.verified === true) && same(reviews[0]) === same(reviews[1]))
            return { answer: reviews[0], votes, models, singleModel: canonical(models[0]) === canonical(models[1]) };
        return { answer: null, votes, models, reason: reviews.find(v => v.error)?.error || '追加复核后仍有分歧或依据不足。' };
    }
    const receipts = async (tabId) => (await chrome.storage.session.get(receiptKey(tabId)))[receiptKey(tabId)] || [];
    async function observe(tabId) {
        const state = await load(tabId);
        if (state.running || !['review', 'saved'].includes(state.phase) || !state.settings?.next || state.settings.workAction === 'save-stay' || state.settings.followManual === false)
            return state;
        const chapter = state.pageKey?.split(':')[0];
        const result = (await receipts(tabId)).filter(r => r.success && r.chapter === chapter && r.at > (state.lastReceipt || 0) && r.started >= (state.pageStarted || 0)).at(-1);
        if (result) {
            state.running = true;
            state.phase = 'scanning';
            state.waiting = null;
            state.manualReceipt = result;
            state.lastReceipt = result.at;
            log(state, '已收到手动' + (result.kind === 'save' ? '暂存' : '提交') + '成功结果，继续下一项。');
            await save(tabId, state);
        }
        return state;
    }
    async function receipt(result, sender) {
        const url = new URL(sender.url || '');
        if (sender.tab?.id === undefined || sender.frameId === 0 || !isCourseHost(url.hostname) || /\/exam-ans\//.test(url.pathname) || !/(?:^|\/)work(?:\/|$)/.test(url.pathname))
            throw new Error('结果必须来自课程测验框架。');
        if (!['save', 'submit'].includes(result?.kind) || typeof result.success !== 'boolean' || !Number.isFinite(result.at) || !Number.isFinite(result.started) || result.at < result.started || Math.abs(Date.now() - result.at) > 30000)
            throw new Error('无效的保存或提交结果。');
        const tabId = sender.tab.id;
        const writing = (receiptWrites.get(tabId) || Promise.resolve()).catch(() => { }).then(async () => {
            const list = await receipts(tabId);
            list.push({ ...result, frameId: sender.frameId, chapter: url.searchParams.get('knowledgeid') || url.searchParams.get('chapterId') || '', documentId: sender.documentId });
            await chrome.storage.session.set({ [receiptKey(tabId)]: list.slice(-20) });
        });
        receiptWrites.set(tabId, writing);
        try {
            await writing;
            return { ok: true };
        }
        finally {
            if (receiptWrites.get(tabId) === writing)
                receiptWrites.delete(tabId);
        }
    }
    async function tick(tabId) {
        if (locks.has(tabId))
            return load(tabId);
        const controller = new AbortController();
        locks.set(tabId, controller);
        // 侧栏和网页都可能触发 tick；先获取锁，再等待存储读取。
        let state;
        try {
            state = await observe(tabId);
        }
        catch (error) {
            if (locks.get(tabId) === controller)
                locks.delete(tabId);
            throw error;
        }
        if (!state.running) {
            if (locks.get(tabId) === controller)
                locks.delete(tabId);
            return state;
        }
        const timeout = setTimeout(() => controller.abort('timeout'), 180000);
        const alive = async () => !controller.signal.aborted && (await load(tabId)).runId === state.runId && (await load(tabId)).running;
        const perform = async (frame, operation, args = {}) => { if (!await alive())
            throw new DOMException('Aborted', 'AbortError'); const result = await act(tabId, frame, operation, args); state.documentRetrySince = null; return result; };
        try {
            const frames = await scan(tabId), top = frames.find(f => f.top);
            if (!await alive())
                return load(tabId);
            if (!top || !top.hasCourseFrame || !/studentstudy/.test(top.path)) {
                const page = await learningPage(tabId);
                if (!await alive())
                    return load(tabId);
                if (!page)
                    return await pause(tabId, state, '已离开学习通章节学习页，助手已停止。', 'stopped');
                if (page.scope !== state.scope)
                    return await pause(tabId, state, '已离开当前课程，学习助手已停止。', 'stopped');
                state.pageLoadingSince ??= Date.now();
                if (Date.now() - state.pageLoadingSince > 60000)
                    return await pause(tabId, state, '章节学习页一分钟内仍未加载完成，请检查网络或刷新课程页。');
                state.phase = 'loading-course';
                log(state, '正在加载章节学习页，等待新页面就绪。');
                await save(tabId, state);
                return state;
            }
            if (top.scope !== state.scope)
                return await pause(tabId, state, '已离开当前课程，学习助手已停止。', 'stopped');
            if (!await alive())
                return load(tabId);
            state.pageLoadingSince = null;
            state.pending ||= {};
            state.currentActive = top.active;
            if (state.resumeTarget) {
                const target = state.resumeTarget;
                if (Date.now() - (target.since || Date.now()) > 60000)
                    return await pause(tabId, state, '上次章节或任务一分钟内仍未恢复，请检查页面；本次没有重复提交。');
                if (top.pageKey.split(':')[0] !== target.chapterId) {
                    state.pageLoadingSince ??= Date.now();
                    state.phase = 'loading-course';
                    await save(tabId, state);
                    return state;
                }
                if (target.active >= 0 && top.active !== target.active && top.tabs[target.active]) {
                    await perform(top, 'nextCard', { index: target.active });
                    state.phase = 'switching';
                    await save(tabId, state);
                    return state;
                }
                state.resumeTarget = null;
            }
            if (state.retryTarget) {
                if (top.pageKey.split(':')[0] !== state.retryTarget.pageKey.split(':')[0]) {
                    state.phase = 'loading-course';
                    await save(tabId, state);
                    return state;
                }
                if (top.active !== state.retryTarget.active && state.retryTarget.active >= 0 && top.tabs[state.retryTarget.active]) {
                    await perform(top, 'nextCard', { index: state.retryTarget.active });
                    state.phase = 'switching';
                    await save(tabId, state);
                    return state;
                }
                state.retryTarget = null;
            }
            if (state.pageKey !== top.pageKey) {
                state.pageKey = top.pageKey;
                state.pageStarted = Date.now();
                state.waiting = null;
                state.transition = null;
                state.phase = 'scanning';
                state.progress = null;
                state.currentMediaKey = null;
                state.mediaDiscovery = null;
                state.mediaLoad = null;
                state.documentProgress = null;
                state.taskWait = null;
                if (state.dispositions)
                    delete state.dispositions[top.pageKey];
                log(state, '读取当前任务：' + (top.tabs[top.active]?.text || '章节内容'));
            }
            refreshTaskInventory(state, top.pageKey, frames.filter(frame => !frame.top && !frame.exam));
            if (state.transition?.pageKey === top.pageKey) {
                if (top.incompletePrompt) {
                    if (!state.transition.allowIncomplete)
                        return await pause(tabId, state, '平台仍提示未完成任务；可点击“跳过本次测验并继续”。');
                    if (!state.transition.confirmed) {
                        await perform(top, 'continueIncomplete', { allowIncomplete: true });
                        state.transition.confirmed = true;
                        state.transition.since = Date.now();
                        await save(tabId, state);
                    }
                    return state;
                }
                if (Date.now() - state.transition.since > 15000)
                    return await pause(tabId, state, '任务切换未成功，请检查页面提示；可点击跳过继续。');
                return state;
            }
            const revisitNext = async () => {
                let target;
                while (state.retryTodo?.length && !target) {
                    const candidate = state.retryTodo.shift();
                    if (Object.values(state.pending).some(q => q.pageKey === candidate.pageKey))
                        target = candidate;
                }
                if (!target)
                    return await pause(tabId, state, Object.keys(state.pending).length ? '自动处理与追加复核已结束，仍有 ' + Object.keys(state.pending).length + ' 项待核对内容；这些题未自动提交。' : '课程目录与待复核队列已处理，请核对平台任务点。', Object.keys(state.pending).length ? 'finished-pending' : 'finished');
                const url = new URL(target.url), scope = url.origin + url.pathname + '?course=' + (url.searchParams.get('courseId') || url.searchParams.get('courseid') || '') + '&class=' + (url.searchParams.get('clazzid') || '');
                if (scope !== state.scope || !/^https?:$/.test(url.protocol))
                    throw new Error('待复核页面不属于当前课程。');
                state.retryTarget = target;
                state.transition = null;
                state.waiting = null;
                state.pageKey = '';
                state.pageLoadingSince = Date.now();
                state.phase = 'loading-course';
                log(state, '返回待复核章节，自动追加一轮判断。');
                await save(tabId, state);
                if (!await alive())
                    return load(tabId);
                await navigateCourse(tabId, target.url);
                return state;
            };
            const beginRevisit = async () => { state.retryOnly = true; state.retryTodo = [...new Map(Object.values(state.pending).map(q => [q.pageKey, { pageKey: q.pageKey, url: q.url, active: q.active }])).values()]; return await revisitNext(); };
            const advance = async (disposition) => {
                const nextTab = top.tabs[top.active + 1];
                if (!nextTab && state.settings.discussion && state.settings.discussion !== 'off') {
                    state.phase = 'waiting-platform';
                    state.videoText = '处理本节教师讨论';
                    if (!await discussionStep(tabId, top, state, controller.signal, alive)) {
                        await save(tabId, state);
                        return state;
                    }
                }
                const continueToWork = state.settings.answer && state.settings.workAction !== 'skip' && !/测验|作业/.test(top.tabs[top.active]?.text || '') && /测验|作业/.test(nextTab?.text || '');
                if (!state.settings.next && !continueToWork)
                    return await pause(tabId, state, Object.values(state.pending).some(item => item.pageKey === top.pageKey) ? '本节有待处理项目，按设置停留。' : '本节已处理，按设置停留。', 'paused');
                if (state.retryOnly)
                    return await revisitNext();
                state.phase = 'switching';
                state.transition = { pageKey: top.pageKey, since: Date.now(), allowIncomplete: !!disposition?.allowIncomplete || (!state.settings.video && state.settings.answer) };
                await save(tabId, state);
                if (top.active >= 0 && top.active + 1 < top.tabs.length) {
                    log(state, '进入下一项：' + top.tabs[top.active + 1].text);
                    await save(tabId, state);
                    await perform(top, 'nextCard', { index: top.active + 1 });
                }
                else if ((top.chapters || []).some(chapter => chapter.id === top.pageKey.split(':')[0])) {
                    const chapterId = top.pageKey.split(':')[0];
                    state.route ||= { mode: courseRouteMode(state.settings), visited: [] };
                    if (!state.route.visited.includes(chapterId))
                        state.route.visited.push(chapterId);
                    const target = nextCourseChapter(top.chapters, chapterId, state.route.visited);
                    if (target) {
                        log(state, '检查目录中的下一节：' + target.title);
                        await save(tabId, state);
                        await perform(top, 'openChapter', { chapterId: target.id });
                    }
                    else if (Object.keys(state.pending).length)
                        return await beginRevisit();
                    else
                        return await pause(tabId, state, '可进入章节已检查完，请核对已暂存、跳过或锁定的任务。', 'finished');
                }
                else if (top.nextEnabled) {
                    log(state, '进入下一节。');
                    await save(tabId, state);
                    await perform(top, 'nextChapter');
                }
                else if (Object.keys(state.pending).length)
                    return await beginRevisit();
                else
                    return await pause(tabId, state, '课程目录已遍历完，请核对已暂存或跳过的测验及任务点。', 'finished');
                return state;
            };
            const content = frames.filter(f => !f.top && !f.exam);
            const taskKey = (identity) => top.pageKey + ':task:' + identity;
            const taskDeferred = (identity) => state.pending[taskKey(identity)]?.pass === (state.retryOnly ? 1 : 0);
            const deferTask = async (identity, name, reason) => {
                const context = await courseContext(tabId);
                if (!context)
                    throw new Error('章节页面已变化。');
                state.pending[taskKey(identity)] = { task: true, pageKey: top.pageKey, url: context.url, active: top.active, text: name, reason, pass: state.retryOnly ? 1 : 0, isVideo: false };
                log(state, name + ' 暂时无法处理，已加入一次回访队列；平台完成状态未更改。');
                state.documentProgress = null;
                state.taskWait = null;
                state.progress = null;
                state.mediaLoad = null;
                state.currentMediaKey = null;
                await save(tabId, state);
                return state;
            };
            if (state.uncertainAction) {
                if (state.uncertainAction.pageKey !== top.pageKey)
                    state.uncertainAction = null;
                else if (!content.some(frame => frame.submitted || /(?:^|\/)work(?:\/|$)/.test(frame.path) || frame.questions.some(q => !q.isVideo))) {
                    if (Date.now() - state.pageStarted > 60000)
                        return await pause(tabId, state, '上次保存或提交的测验尚未加载，请检查页面；本次没有重复发送请求。');
                    state.phase = 'loading-task';
                    await save(tabId, state);
                    return state;
                }
                else if (content.some(frame => frame.submitted) || state.manualReceipt) {
                    const kind = state.manualReceipt?.kind || 'submit';
                    state.uncertainAction = null;
                    if (kind === 'submit')
                        state.dispositions = { ...state.dispositions, [top.pageKey]: { kind: 'submit', allowIncomplete: false } };
                }
                else
                    return await pause(tabId, state, '上次' + (state.uncertainAction.kind === 'save' ? '暂存' : '提交') + '尚未确认。请在页面核对或手动保存/提交；本次没有重复发送请求。');
            }
            for (const frame of content)
                for (const q of frame.questions) {
                    const id = pendingKey(top.pageKey, q), previous = state.questionRecords?.[id];
                    const matches = previous?.answer?.choices && JSON.stringify([...previous.answer.choices].sort()) === JSON.stringify((q.options || []).filter(option => option.selected).map(option => option.letter).sort());
                    recordQuestion(state, id, q, q.answered ? { status: matches ? 'filled' : previous?.status === 'filled' && !q.options?.length ? 'filled' : 'manual' } : {});
                }
            if (content.some(f => f.submitted)) {
                recordWorkOutcome(state, 'submitted');
                for (const [key, q] of Object.entries(state.pending))
                    if (q.pageKey === top.pageKey)
                        delete state.pending[key];
            }
            state.taskType = /测验|作业/.test(top.tabs[top.active]?.text || '') || content.some(f => f.questions.some(q => !q.isVideo) || /(?:^|\/)work(?:\/|$)/.test(f.path)) ? 'work' : 'video';
            const deferRejected = async (frame) => {
                const tab = await courseContext(tabId), reason = '视频弹题被平台判错或要求回看；本视频未完成，已排队回访。';
                const questions = frame.questions.filter(q => q.isVideo);
                for (const q of questions.length ? questions : [{ id: 'video:rejected', text: '视频弹题被平台拒绝', options: [] }]) {
                    const id = pendingKey(top.pageKey, q);
                    state.pending[id] = { pageKey: top.pageKey, url: tab.url, active: top.active, text: q.text, reason, pass: state.retryOnly ? 1 : 0, isVideo: true, rejected: true };
                    if ('type' in q)
                        recordQuestion(state, id, q, { status: 'pending', reason });
                }
                state.waiting = null;
                log(state, reason);
                await save(tabId, state);
            };
            state.dispositions ||= {};
            if (state.manualReceipt) {
                const result = state.manualReceipt;
                state.manualReceipt = null;
                if (result.chapter === top.pageKey.split(':')[0] && (/测验|作业/.test(top.tabs[top.active]?.text || '') || content.some(f => f.questions.some(q => !q.isVideo)))) {
                    state.dispositions[top.pageKey] = { kind: result.kind, allowIncomplete: result.kind === 'save' };
                    recordWorkOutcome(state, result.kind === 'save' ? 'saved' : 'submitted');
                }
            }
            if (state.dispositions[top.pageKey])
                return await advance(state.dispositions[top.pageKey]);
            if (state.waiting) {
                const frame = frames.find(f => f.frameId === state.waiting.frameId && (!state.waiting.documentId || f.documentId === state.waiting.documentId));
                const result = (await receipts(tabId)).filter(r => r.frameId === state.waiting.frameId && r.chapter === top.pageKey.split(':')[0] && r.started >= (state.waiting.requestSince || state.waiting.since) && r.kind === (state.waiting.save ? 'save' : 'submit')).at(-1);
                const confirming = frames.find(f => f.confirmWork);
                if (state.waiting.save) {
                    if (result && !result.success)
                        return await pause(tabId, state, '学习通返回暂存失败，请检查页面提示。');
                    const watching = state.waiting.watching || frames.some(f => f.receiptObserved);
                    if (result?.success || (!watching && (frame?.saveConfirmed || top.saveConfirmed))) {
                        state.lastReceipt = result?.at || Date.now();
                        state.waiting = null;
                        recordWorkOutcome(state, 'saved');
                        log(state, '暂存成功，答案未提交。');
                        if (state.settings.workAction === 'save-stay')
                            return await pause(tabId, state, '已暂存并停留本节。', 'saved');
                        state.dispositions[top.pageKey] = { kind: 'save', allowIncomplete: true };
                        await save(tabId, state);
                        return await advance(state.dispositions[top.pageKey]);
                    }
                    if (Date.now() - state.waiting.since > 30000)
                        return await pause(tabId, state, '暂存请求未确认成功。手动保存成功后会继续，也可使用跳过按钮。');
                    state.phase = 'waiting-save';
                    await save(tabId, state);
                    return state;
                }
                if (!state.waiting.video && result && !result.success)
                    return await pause(tabId, state, '学习通返回提交失败，请检查页面提示。');
                if (state.waiting.video && (frame?.quizRejected || frame?.knowledgeBack)) {
                    if (!state.settings.next)
                        return await pause(tabId, state, '视频弹题答案未通过或需要回看知识点，请核对后再继续。');
                    await deferRejected(frame);
                    return state;
                }
                if (!state.waiting.video && confirming) {
                    if (/未做完|未达到及格线|错误|失败|异常/.test(confirming.confirmWork.text))
                        return await pause(tabId, state, '测验提交弹窗提示：' + confirming.confirmWork.text);
                    if (!state.waiting.confirmed) {
                        state.waiting.requestSince ||= state.waiting.since;
                        await perform(confirming, 'confirmWork');
                        state.waiting.confirmed = true;
                        state.waiting.since = Date.now();
                        await save(tabId, state);
                    }
                    return state;
                }
                else if (state.waiting.video && frame?.continueQuiz) {
                    await perform(frame, 'continueQuiz');
                    state.waiting = null;
                    log(state, '视频弹题已确认，继续播放。');
                    await save(tabId, state);
                    return state;
                }
                else if (!state.waiting.video && (result?.success || frame?.submitted)) {
                    state.lastReceipt = result?.at || Date.now();
                    state.waiting = null;
                    recordWorkOutcome(state, 'submitted');
                    state.dispositions[top.pageKey] = { kind: 'submit', allowIncomplete: false };
                    log(state, '已确认测验提交成功。');
                    await save(tabId, state);
                    return await advance(state.dispositions[top.pageKey]);
                }
                else if (frame && state.waiting.video && !frame.questions.some(q => q.signature === state.waiting.signature)) {
                    state.waiting = null;
                    log(state, '页面已确认提交结果。');
                }
                else if (Date.now() - state.waiting.since > 30000)
                    return await pause(tabId, state, '提交后尚未确认成功。手动提交成功后会继续，也可使用跳过按钮。');
                else {
                    state.phase = 'waiting-submit';
                    await save(tabId, state);
                    return state;
                }
            }
            for (const frame of content) {
                if (frame.quizRejected || frame.knowledgeBack) {
                    if (!state.settings.next)
                        return await pause(tabId, state, '视频弹题答案未通过或需要回看知识点，请核对后再继续。');
                    await deferRejected(frame);
                    continue;
                }
                if (frame.continueQuiz && state.settings.videoAnswer) {
                    await perform(frame, 'continueQuiz');
                    state.progress = null;
                    log(state, '视频弹题结果已确认，继续播放。');
                    await save(tabId, state);
                    return state;
                }
            }
            // 章节测验未必计入任务点。没有任务图标或目录已打勾，不能说明题目已提交。
            const workTask = /测验|作业/.test(top.tabs[top.active]?.text || '') || content.some(f => /(?:^|\/)work(?:\/|$)/.test(f.path));
            if (workTask && !content.some(f => f.submitted || f.questions.some(q => !q.isVideo))) {
                state.phase = 'loading-task';
                await save(tabId, state);
                if (Date.now() - state.pageStarted > 60000)
                    return await pause(tabId, state, '章节测验的题目或提交状态尚未加载，请检查页面；未跳过此测验。');
                return state;
            }
            const groups = content.filter(f => f.questions.length && !f.submitted);
            if (!state.settings.video && state.settings.answer && !workTask) {
                const workTab = top.tabs.find(t => /测验|作业/.test(t.text));
                if (workTab) {
                    state.phase = 'switching';
                    state.transition = { pageKey: top.pageKey, since: Date.now(), allowIncomplete: true };
                    log(state, '跳过视频，进入本节测验。');
                    await save(tabId, state);
                    await perform(top, 'nextCard', { index: workTab.index });
                    return state;
                }
                return await advance({ allowIncomplete: true });
            }
            for (const frame of groups) {
                if (frame.quizRejected || frame.knowledgeBack)
                    continue;
                if (state.settings.workAction === 'skip' && frame.questions.some(q => !q.isVideo)) {
                    state.dispositions[top.pageKey] = { kind: 'skip', allowIncomplete: true };
                    recordWorkOutcome(state, 'skipped');
                    log(state, '按设置跳过本次测验，未答题或提交。');
                    await save(tabId, state);
                    return await advance(state.dispositions[top.pageKey]);
                }
                if (frame.questions.some(q => q.isVideo) && frame.videos.some(v => !v.paused))
                    await perform(frame, 'pause');
                for (const q of frame.questions) {
                    const solvedKey = top.pageKey + ':' + frame.frameId + ':' + q.id + ':' + digest(q.signature), questionKey = pendingKey(top.pageKey, q);
                    if (q.answered) {
                        if (!state.pending[questionKey]?.rejected)
                            delete state.pending[questionKey];
                        continue;
                    }
                    if (state.pending[questionKey]?.pass === (state.retryOnly ? 1 : 0))
                        continue;
                    if (!(q.isVideo ? state.settings.videoAnswer : state.settings.answer))
                        return await pause(tabId, state, q.isVideo ? '发现视频弹题，自动解答未启用，请处理后继续。' : '当前任务需要答题，请手动完成或启用 AI 答题。');
                    const defer = async (reason, blocked = false, votes = []) => {
                        const tab = await courseContext(tabId);
                        if (!tab)
                            throw new Error('章节页面已变化。');
                        state.pending[questionKey] = { pageKey: top.pageKey, url: tab.url, active: top.active, text: q.text, reason, pass: state.retryOnly ? 1 : 0, isVideo: q.isVideo, votes };
                        recordQuestion(state, questionKey, q, { status: blocked ? 'blocked' : 'pending', reason });
                        log(state, '此题加入待核对队列，继续处理其他题目：' + q.text.slice(0, 50));
                        await save(tabId, state);
                        return state;
                    };
                    if (q.encoded || q.type === 'unsupported')
                        return await defer('未解析的字体或题型，需要手动处理', true);
                    if (q.hasImages) {
                        try {
                            const imageResult = await perform(frame, 'readImages', { questionId: q.id, signature: q.signature });
                            q.images = [...(imageResult.images || []), ...await readQuestionImages(imageResult.imageSources || [], controller.signal)];
                        }
                        catch (error) {
                            if (controller.signal.aborted || documentChanged(error))
                                throw error;
                            return await defer(error.message || '图片无法读取', true);
                        }
                    }
                    if (q.type === 'judge' && (q.options.length !== 2 || q.options.some(o => typeof o.verdict !== 'boolean') || q.options[0].verdict === q.options[1].verdict))
                        return await defer('判断题的对/错选项未能唯一识别，需要手动处理', true);
                    if (!(await config()).apiKey)
                        return await pause(tabId, state, '发现需要 AI 解答的题目，请先设置自己的 Key。');
                    recordQuestion(state, questionKey, q, { status: 'answering' });
                    state.phase = 'answering';
                    log(state, '正在解题：' + q.text.slice(0, 55));
                    await save(tabId, state);
                    const format = q.type === 'judge' ? '判断题返回 verdict（JSON 布尔值 true 表示整句正确，false 表示整句错误），不要用选项字母代替对错。' : q.type === 'matching' ? '连线题按每行的顺序返回 matches（字符串数组），值必须是该行给出的 value；逐行核对，不得按字母位置猜测。\n连线行：' + JSON.stringify(q.matching) : '选择题返回 choices（选项字母数组），简答题返回 text，填空题依次返回 blanks。';
                    const prompt = '解答以下一道题，只输出 JSON，包含 uncertain（布尔值）、reason（简短可核对的依据）。' + format + '逐一检查题干中的时间、地点、人物、数量、限定词和否定问法；判断题整句各部分必须成立，不能用正确的部分掩盖错误的部分，也不能把题干改写成正确事实再判对。多选逐项判断。缺失教材依据或不能确定时 uncertain=true；不要猜测，不要编造来源。\n题型：' + q.type + '\n题目：' + q.text + '\n选项：' + q.options.map(o => o.letter + '. ' + o.text).join('\n');
                    let decision;
                    try {
                        decision = q.options.length || q.type === 'matching' ? await solve(q, prompt, controller.signal, async (text) => { state.phase = 'verifying'; log(state, text); await save(tabId, state); }) : { answer: parseAnswer(await runModel(prompt, controller.signal, () => { }, true, q.images?.length && new URL((await config()).baseUrl).hostname === 'api.deepseek.com' ? 'deepseek-flash' : undefined, q.images || []), q) };
                    }
                    catch (error) {
                        if (controller.signal.aborted)
                            throw error;
                        decision = { answer: null, reason: error.message };
                    }
                    if (!await alive())
                        return load(tabId);
                    const answer = decision.answer;
                    const record = recordQuestion(state, questionKey, q);
                    recordDecision(record, decision);
                    record.status = answer ? 'answering' : 'pending';
                    if (!answer)
                        return await defer(decision.reason || '依据不足。', false, (decision.votes || []).map(v => ({ model: v.model, choices: v.choices, verdict: v.verdict, reason: String(v.reason || v.error || '').slice(0, 160) })));
                    delete state.pending[questionKey];
                    state.lastConsensus = { models: decision.models || [], votes: decision.votes?.length || 1, singleModel: !!decision.singleModel };
                    try {
                        await perform(frame, 'fill', { questionId: q.id, signature: q.signature, answer });
                    }
                    catch (error) {
                        if (controller.signal.aborted || documentChanged(error))
                            throw error;
                        return await defer('填写未确认：' + (error.message || '页面已变化'), true);
                    }
                    record.status = 'filled';
                    record.actualChoices = answer.choices || [];
                    state.solved[solvedKey] = true;
                    state.answered += 1;
                    state.lastAnswer = { question: q.text, choices: answer.choices || [], reason: answer.reason || '' };
                    log(state, '已填写：' + q.text.slice(0, 50) + (answer.reason ? '；' + String(answer.reason).slice(0, 100) : ''));
                    await save(tabId, state);
                    // 一次 tick 处理一道题，下一轮重新读取 DOM，避免旧页面结果串到新题目。
                    return state;
                }
                const videoQuestion = frame.questions.find(q => q.isVideo);
                if (videoQuestion) {
                    if (!videoQuestion.answered || state.pending[pendingKey(top.pageKey, videoQuestion)]?.rejected)
                        continue;
                    if (!state.settings.submit)
                        return await pause(tabId, state, '视频弹题已填写。请检查并手动提交；完成后点击“继续运行”。');
                    state.waiting = { frameId: frame.frameId, documentId: frame.documentId, signature: videoQuestion.signature, video: true, since: Date.now() };
                    state.phase = 'waiting-submit';
                    await save(tabId, state);
                    await perform(frame, 'submitQuiz', { questionId: videoQuestion.id, signature: videoQuestion.signature });
                    return state;
                }
                if (frame.questions.some(q => !q.answered)) {
                    if (state.settings.workAction === 'review')
                        return await pause(tabId, state, '确定的答案已填写；仍有待复核题，按设置等待你检查。' + (Object.values(state.pending).find(q => q.pageKey === top.pageKey)?.reason || ''));
                    state.waiting = { frameId: frame.frameId, documentId: frame.documentId, save: true, watching: frame.receiptObserved, since: Date.now() };
                    state.phase = 'waiting-save';
                    await save(tabId, state);
                    await perform(frame, 'saveWork', { allowPartial: true });
                    log(state, '待复核题暂不提交，暂存已确定答案后继续。');
                    await save(tabId, state);
                    return state;
                }
                if (['save', 'save-stay'].includes(state.settings.workAction)) {
                    state.waiting = { frameId: frame.frameId, documentId: frame.documentId, save: true, watching: frame.receiptObserved, since: Date.now() };
                    state.phase = 'waiting-save';
                    await save(tabId, state);
                    await perform(frame, 'saveWork');
                    log(state, '已点击学习通的暂时保存，等待平台确认。');
                    await save(tabId, state);
                    return state;
                }
                if (state.settings.workAction !== 'submit')
                    return await pause(tabId, state, '章节测验已填写。请选择“直接提交”或“暂时保存”后继续运行。');
                state.waiting = { frameId: frame.frameId, documentId: frame.documentId, signature: frame.questions[0].signature, video: false, since: Date.now() };
                state.phase = 'waiting-submit';
                await save(tabId, state);
                await perform(frame, 'submitWork');
                return state;
            }
            const jobs = content.flatMap(f => f.jobs), unfinished = jobs.filter(j => !j.done);
            const byOrder = (a, b) => { const x = a.order || a.frame?.order || [], y = b.order || b.frame?.order || []; for (let i = 0; i < Math.min(x.length, y.length); i++)
                if (x[i] !== y[i])
                    return x[i] - y[i]; return x.length - y.length || (a.frame?.frameId || 0) - (b.frame?.frameId || 0) || (a.index || 0) - (b.index || 0); };
            const mediaKey = (v) => top.pageKey + ':' + (v.jobId ? 'job:' + v.jobId : (v.order || v.frame.order || []).join('.') + ':' + (v.id ?? v.index));
            const rawMedia = content.flatMap(f => f.videos.map(v => ({ frame: f, ...v }))).sort(byOrder);
            const allMedia = rawMedia.filter((v, index, list) => !v.jobId || index === list.findIndex(other => other.jobId === v.jobId));
            for (const media of allMedia)
                if (media.ended || media.jobDone)
                    delete state.pending[taskKey(mediaKey(media))];
            const blockedFrames = new Set(content.filter(f => f.quizRejected || f.knowledgeBack || f.questions.some(q => q.isVideo && (!q.answered || state.pending[pendingKey(top.pageKey, q)]?.rejected))).map(f => f.frameId));
            const candidates = allMedia.filter(v => !blockedFrames.has(v.frame.frameId) && !v.ended && !taskDeferred(mediaKey(v)) && (!v.jobDone || mediaKey(v) === state.currentMediaKey));
            const pending = content.flatMap(f => [
                ...(f.players || []).filter(p => !p.jobDone).map(p => ({ ...p, frame: f })),
                ...(f.mediaFrames || []).filter(slot => !slot.jobDone && !content.some(child => child.order?.length >= slot.order.length && slot.order.every((n, i) => child.order[i] === n) && (child.videos.length || child.players?.length))).map(slot => ({ ...slot, frame: f }))
            ]).filter(task => !taskDeferred(mediaKey(task))).sort(byOrder);
            if (state.settings.video && pending.length && (!candidates.length || byOrder(pending[0], candidates[0]) < 0)) {
                const target = pending[0], key = mediaKey(target);
                if (!state.mediaLoad || state.mediaLoad.key !== key)
                    state.mediaLoad = { key, since: Date.now() };
                await perform(target.frame, 'prepareMedia', { id: target.id });
                state.phase = 'loading-video';
                state.videoText = '等待当前播放器初始化，未跳过后续视频';
                await save(tabId, state);
                if (Date.now() - state.mediaLoad.since > 60000)
                    return await deferTask(key, '尚未加载的媒体', '播放器一分钟内仍未创建');
                return state;
            }
            if (state.settings.video && candidates.length) {
                const video = candidates.find(v => mediaKey(v) === state.currentMediaKey) || candidates[0];
                const recover = async (reason) => {
                    const key = mediaKey(video);
                    state.mediaRetries ||= {};
                    const retry = state.mediaRetries[key] ||= { count: 0, at: 0 };
                    if (retry.count >= 2)
                        return await deferTask(key, '媒体 ' + (allMedia.indexOf(video) + 1), reason + '；两次重载仍未恢复');
                    if (Date.now() - retry.at >= 3000) {
                        retry.count++;
                        retry.at = Date.now();
                        await perform(video.frame, 'reloadMedia', { id: video.id });
                        state.progress = null;
                        state.mediaLoad = { key, since: Date.now() };
                        log(state, '媒体连接中断，正在重载 ' + retry.count + '/2。');
                    }
                    state.phase = 'loading-video';
                    await save(tabId, state);
                    return state;
                };
                if (video.error)
                    return await recover('媒体加载失败');
                const progressKey = mediaKey(video);
                state.currentMediaKey = progressKey;
                state.mediaDiscovery = null;
                // 页面中始终只驱动当前媒体；其他播放器自动启动时先暂停，再按队列接续。
                for (const other of rawMedia)
                    if (!other.paused && !other.ended && (other.frame.frameId !== video.frame.frameId || other.id !== video.id))
                        await perform(other.frame, 'pause', { id: other.id });
                if (!state.mediaLoad || state.mediaLoad.key !== progressKey)
                    state.mediaLoad = { key: progressKey, since: Date.now() };
                const started = await perform(video.frame, 'play', { id: video.id, index: video.index, rate: state.settings.rate, muted: state.settings.muted, runId: state.runId });
                if (!await alive())
                    return load(tabId);
                if (started.recheck || started.ended) {
                    state.phase = 'scanning';
                    await save(tabId, state);
                    return state;
                }
                if (!video.duration || started.pending) {
                    state.phase = 'loading-video';
                    state.videoText = '已启动播放器，等待视频加载';
                    await save(tabId, state);
                    if (Date.now() - state.mediaLoad.since > 60000)
                        return await recover('媒体一分钟内未开始播放');
                    return state;
                }
                state.mediaLoad = null;
                if (!state.progress || state.progress.key !== progressKey || Math.abs(state.progress.position - video.time) > 0.25)
                    state.progress = { key: progressKey, position: video.time, since: Date.now() };
                else if (Date.now() - state.progress.since > 45000)
                    return await recover('媒体进度长时间未变化');
                state.phase = 'video';
                state.videoText = `视频 ${allMedia.indexOf(video) + 1}/${allMedia.length} · ${Math.floor(video.time / 60)}:${String(Math.floor(video.time % 60)).padStart(2, '0')} / ${Math.floor(video.duration / 60)}:${String(Math.floor(video.duration % 60)).padStart(2, '0')}`;
                await save(tabId, state);
                return state;
            }
            if (blockedFrames.size)
                return await advance({ allowIncomplete: true });
            const missing = missingMediaTasks(content).filter(task => !taskDeferred('missing:' + (task.jobId || task.contentId)));
            if (state.settings.video && missing.length) {
                const key = top.pageKey + ':missing:' + missing.map(task => task.jobId || task.contentId).sort().join(',');
                if (!state.mediaLoad || state.mediaLoad.key !== key)
                    state.mediaLoad = { key, since: Date.now() };
                state.phase = 'loading-video';
                state.videoText = '已识别 ' + missing.length + ' 个尚未出现的媒体任务，等待页面加载';
                await save(tabId, state);
                if (Date.now() - state.mediaLoad.since > 60000) {
                    for (const task of missing)
                        await deferTask('missing:' + (task.jobId || task.contentId), task.name || '尚未显示的媒体附件', '附件播放器一分钟内未出现');
                    return state;
                }
                return state;
            }
            const documentKey = (doc) => doc.jobId || doc.contentId || doc.frame.path + ':' + doc.type + ':' + doc.id;
            const allDocuments = content.flatMap(frame => (frame.documents || []).map(doc => ({ ...doc, frame })));
            for (const doc of allDocuments)
                if (doc.jobDone)
                    delete state.pending[taskKey(documentKey(doc))];
            const documents = allDocuments.filter(doc => !doc.jobDone && !taskDeferred(documentKey(doc)));
            if (state.settings.video) {
                const book = documents.find(doc => ['reading', 'timed-reading'].includes(doc.type) && (doc.position >= 0 && doc.total || doc.legacy));
                const link = documents.find(doc => doc.type === 'link');
                const doc = book || link;
                if (doc) {
                    const key = documentKey(doc);
                    if (!state.documentProgress || state.documentProgress.key !== key || state.documentProgress.position !== doc.position)
                        state.documentProgress = { key, position: doc.position, since: Date.now() };
                    const progress = state.documentProgress;
                    state.phase = 'waiting-platform';
                    state.videoText = book ? (doc.legacy ? '普通书籍阅读，等待平台确认' : '阅读 ' + (doc.position + 1) + '/' + doc.total) : '等待链接任务确认';
                    if (progress.clickedAt) {
                        if (Date.now() - progress.clickedAt > 90000)
                            return await deferTask(key, book ? '阅读任务' : '链接任务', '原生操作后未收到页码变化或平台完成状态');
                    }
                    else if (link || Date.now() - progress.since >= (doc.waitSeconds || 3) * 1000) {
                        try {
                            const result = await perform(doc.frame, link ? 'openLink' : doc.legacy ? 'readBook' : 'readPage', { id: doc.id, index: doc.position });
                            if (!result.pending)
                                progress.clickedAt = Date.now();
                            else if (Date.now() - progress.since > 90000)
                                return await deferTask(key, '普通书籍阅读', '原生阅读器 90 秒内仍未就绪');
                        }
                        catch (error) {
                            if (documentChanged(error) || controller.signal.aborted)
                                throw error;
                            return await deferTask(key, book ? '阅读任务' : '链接任务', error.message);
                        }
                    }
                    await save(tabId, state);
                    return state;
                }
            }
            if (state.settings.video) {
                const slide = documents.find(doc => doc.type === 'slides');
                if (slide) {
                    const key = top.pageKey + ':' + (slide.jobId || slide.frame.frameId + ':' + slide.id);
                    if (slide.position < 0 || !slide.total)
                        return await deferTask(documentKey(slide), '课件任务', '课件当前页码未识别');
                    if (!state.documentProgress || state.documentProgress.key !== key || state.documentProgress.position !== slide.position)
                        state.documentProgress = { key, position: slide.position, since: Date.now() };
                    const progress = state.documentProgress;
                    state.phase = 'waiting-platform';
                    state.videoText = '阅读课件 ' + (slide.position + 1) + '/' + slide.total;
                    if (slide.position < slide.total - 1) {
                        if (progress.clickedAt) {
                            if (Date.now() - progress.clickedAt > 15000)
                                return await deferTask(documentKey(slide), '课件任务', '原生下一页后页码没有变化，未标为完成');
                        }
                        else if (Date.now() - progress.since >= 3000) {
                            try {
                                await perform(slide.frame, 'readSlide', { id: slide.id, index: slide.position });
                                progress.clickedAt = Date.now();
                            }
                            catch (error) {
                                if (documentChanged(error) || controller.signal.aborted)
                                    throw error;
                                return await deferTask(documentKey(slide), '课件任务', error.message);
                            }
                        }
                        await save(tabId, state);
                        return state;
                    }
                }
            }
            const outstanding = content.flatMap(frame => (frame.metadata || []).filter(task => task.required && !task.passed && !['insertvideo', 'insertaudio', 'work'].includes(task.module) &&
                !content.some(child => (child.documents || []).some(doc => doc.jobDone && matchPlatformTask(doc, child, content)?.jobId === task.jobId && !!task.jobId))));
            const deferredTasks = Object.values(state.pending).filter(task => task.task && task.pageKey === top.pageKey && task.pass === (state.retryOnly ? 1 : 0));
            if (deferredTasks.length && !documents.length && !candidates.length && !pending.length && !missing.length && outstanding.every(task => taskDeferred(task.jobId || task.contentId || 'unknown')))
                return await advance({ allowIncomplete: true });
            if (unfinished.length || state.settings.video && outstanding.length) {
                const names = outstanding.map(task => task.name || task.module || '其他任务').slice(0, 4);
                const key = top.pageKey + ':' + outstanding.map(task => task.jobId || task.contentId).sort().join(',') + ':' + unfinished.length;
                if (state.taskWait?.key !== key)
                    state.taskWait = { key, since: Date.now() };
                state.phase = 'waiting-platform';
                state.videoText = names.length ? '等待平台确认：' + names.join('、') : '等待平台确认当前任务';
                await save(tabId, state);
                if (Date.now() - state.taskWait.since > 90000) {
                    const targets = documents.length ? documents.map(doc => ({ key: documentKey(doc), name: doc.type })) : outstanding.map(task => ({ key: task.jobId || task.contentId || 'unknown', name: task.name || task.module }));
                    for (const task of targets.length ? targets : [{ key: 'unknown', name: '未识别的任务' }])
                        await deferTask(task.key, task.name, '90 秒内未确认平台完成；未标为完成');
                    return state;
                }
                return state;
            }
            state.taskWait = null;
            if (!content.some(f => f.path.includes('/knowledge/cards'))) {
                state.phase = 'loading-task';
                await save(tabId, state);
                if (Date.now() - state.pageStarted > 60000)
                    return await pause(tabId, state, '任务框架未能加载，已暂停。');
                return state;
            }
            if (state.settings.video && allMedia.length) {
                for (const media of allMedia)
                    if (!media.paused && !media.ended)
                        await perform(media.frame, 'pause', { id: media.id });
                const signature = allMedia.map(mediaKey).join('|');
                if (state.mediaDiscovery?.signature !== signature)
                    state.mediaDiscovery = { signature, since: Date.now() };
                if (Date.now() - state.mediaDiscovery.since < 1500) {
                    state.phase = 'scanning';
                    await save(tabId, state);
                    return state;
                }
            }
            return await advance();
        }
        catch (error) {
            const latest = await load(tabId);
            if (latest.runId !== state.runId || !latest.running)
                return latest;
            if (!controller.signal.aborted && documentChanged(error)) {
                state.documentRetrySince ??= Date.now();
                if (Date.now() - state.documentRetrySince > 60000)
                    return pause(tabId, state, '播放器或任务文档持续更新超过一分钟，请检查课程页面。');
                // 原生保存/提交可能已发出；保留 waiting，继续观察成功结果，不能重发。
                state.phase = state.waiting ? (state.waiting.save ? 'waiting-save' : 'waiting-submit') : 'scanning';
                log(state, '页面播放器或任务文档正在更新，重新识别当前任务。');
                await save(tabId, state);
                return state;
            }
            return pause(tabId, state, controller.signal.reason === 'timeout' ? 'AI 请求超时，已暂停。' : error.message || '任务处理失败。');
        }
        finally {
            clearTimeout(timeout);
            if (locks.get(tabId) === controller)
                locks.delete(tabId);
        }
    }
    async function handle(msg, sender) {
        const tabId = sender.tab?.id;
        if (tabId === undefined || sender.frameId !== 0)
            throw new Error('请从课程学习页的本地助手操作。');
        if (msg.type === 'COURSE_STATE')
            return { ok: true, state: locks.has(tabId) ? await load(tabId) : await observe(tabId) };
        if (msg.type === 'COURSE_TICK')
            return { ok: true, state: await tick(tabId) };
        if (msg.type === 'COURSE_START') {
            const frames = await scan(tabId);
            let top = frames.find(f => f.top);
            if (!top || !top.hasCourseFrame || !/studentstudy/.test(top.path))
                top = await learningPage(tabId);
            if (!top)
                throw new Error('请在学习通章节学习页启动，不是课程首页或考试页。');
            const workAction = ['submit', 'save', 'save-stay', 'review', 'skip'].includes(msg.settings?.workAction) ? msg.settings.workAction : (msg.settings?.submitWork === true ? 'submit' : 'review');
            const settings = { video: msg.settings?.video !== false, answer: msg.settings?.answer !== false, videoAnswer: msg.settings?.videoAnswer !== false, next: msg.settings?.next !== false, followManual: msg.settings?.followManual !== false, submit: msg.settings?.submit === true, workAction, muted: msg.settings?.muted !== false, rate: [1, 1.25, 1.5, 2].includes(Number(msg.settings?.rate)) ? Number(msg.settings.rate) : 1, discussion: ['draft', 'publish'].includes(msg.settings?.discussion) ? msg.settings.discussion : 'off' };
            if (workAction === 'save-stay')
                settings.next = false;
            if (!settings.next)
                settings.followManual = false;
            if (workAction === 'skip')
                settings.answer = false;
            if (!settings.video)
                settings.videoAnswer = false;
            if (!settings.videoAnswer)
                settings.submit = false;
            if ((settings.answer && workAction !== 'skip' || settings.discussion !== 'off') && !(await config()).apiKey)
                throw new Error('启用 AI 答题或讨论前，请先设置自己的 Key。');
            locks.get(tabId)?.abort();
            const old = await load(tabId);
            const reuse = old.scope === top.scope;
            // 保存/跳过只用于本轮导航，不是跨运行的完成记录；重启后重读平台题目和提交状态。
            const dispositions = {};
            const tab = await courseContext(tabId), mode = courseRouteMode(settings);
            if (!tab)
                throw new Error('章节页面已变化。');
            const resumeTarget = reuse && old.restored && old.resumeTarget ? { ...old.resumeTarget, since: Date.now() } : undefined;
            const state = { running: true, phase: top.hasCourseFrame ? 'scanning' : 'loading-course', pageLoadingSince: top.hasCourseFrame ? null : Date.now(), scope: top.scope, pageKey: resumeTarget ? old.pageKey : top.pageKey, settings, runId: Date.now() + ':' + Math.random(), pageStarted: Date.now(), solved: reuse ? old.solved || {} : {}, pending: reuse ? Object.fromEntries(Object.entries(old.pending || {}).map(([k, q]) => [k, { ...q, pass: -1 }])) : {}, dispositions, answered: reuse ? old.answered || 0 : 0, logs: reuse ? old.logs || [] : [], waiting: null, progress: null,
                checkpointKey: courseCheckpointKey(top.scope, tab.url), questionRecords: reuse ? old.questionRecords || {} : {}, discussionRecords: reuse ? old.discussionRecords || {} : {},
                route: reuse && old.route?.mode === mode && !['finished', 'finished-pending'].includes(old.phase) ? old.route : { mode, visited: [] },
                uncertainAction: reuse ? old.uncertainAction || (old.waiting && !old.waiting.video ? { kind: old.waiting.save ? 'save' : 'submit', pageKey: old.pageKey } : undefined) : undefined, resumeTarget };
            log(state, resumeTarget ? '恢复上次进度，重新读取平台状态后继续。' : '学习助手已启动；完成状态以学习通页面为准。');
            await persistCourse(state);
            await chrome.storage.session.set({ [key(tabId)]: state });
            if (resumeTarget && top.pageKey.split(':')[0] !== resumeTarget.chapterId)
                await navigateCourse(tabId, chapterUrl(tab.url, resumeTarget.chapterId));
            return { ok: true, state };
        }
        if (msg.type === 'COURSE_SKIP') {
            locks.get(tabId)?.abort();
            const old = await load(tabId), frames = await scan(tabId, false), top = frames.find(f => f.top);
            if (!top?.hasCourseFrame || !/studentstudy/.test(top.path) || !frames.some(f => !f.top && !f.exam && (f.questions.some(q => !q.isVideo) || /(?:^|\/)work(?:\/|$)/.test(f.path))))
                throw new Error('请在需要跳过的章节测验页使用此按钮。');
            if (!top.nextEnabled && !(top.active >= 0 && top.active + 1 < top.tabs.length))
                throw new Error('当前没有可用的下一项或下一节。');
            const state = { ...old, running: true, phase: 'scanning', runId: Date.now() + ':' + Math.random(), scope: top.scope, pageKey: top.pageKey, pageStarted: Date.now(), waiting: null, transition: null, progress: null, logs: old.logs || [], solved: old.solved || {}, answered: old.answered || 0, settings: { video: true, answer: true, videoAnswer: true, submit: true, workAction: 'submit', muted: true, rate: 1, ...old.settings, next: true }, dispositions: { ...(old.scope === top.scope ? old.dispositions : {}), [top.pageKey]: { kind: 'skip', allowIncomplete: true } } };
            state.uncertainAction = null;
            state.restored = false;
            state.resumeTarget = null;
            log(state, '你选择跳过本次测验，答案未保存或提交，继续下一项。');
            await persistCourse(state);
            await chrome.storage.session.set({ [key(tabId)]: state });
            return { ok: true, state };
        }
        if (msg.type === 'COURSE_USER_NEXT') {
            const state = await load(tabId);
            if (!state.scope || !['review', 'saved', 'switching', 'waiting-submit'].includes(state.phase) || (msg.pageKey && msg.pageKey !== state.pageKey))
                return { ok: true, state };
            locks.get(tabId)?.abort();
            state.runId = Date.now() + ':' + Math.random();
            state.running = true;
            state.phase = 'switching';
            state.waiting = null;
            state.transition = { pageKey: state.pageKey, since: Date.now(), allowIncomplete: true, confirmed: true };
            state.uncertainAction = null;
            log(state, '你在页面选择了“不做了/下一节”，助手接续下一节。');
            await persistCourse(state);
            await chrome.storage.session.set({ [key(tabId)]: state });
            return { ok: true, state };
        }
        if (msg.type === 'COURSE_STOP') {
            locks.get(tabId)?.abort();
            const state = await load(tabId);
            state.running = false;
            state.phase = 'paused';
            state.runId = Date.now() + ':' + Math.random();
            log(state, '已暂停学习助手。');
            await persistCourse(state);
            await chrome.storage.session.set({ [key(tabId)]: state });
            const frames = await scan(tabId, false);
            for (const f of frames.filter(f => f.videos.length))
                try {
                    await act(tabId, f, 'pause');
                }
                catch { }
            return { ok: true, state };
        }
        throw new Error('未知课程操作。');
    }
    async function remove(tabId) { locks.get(tabId)?.abort(); await chrome.storage.session.remove(key(tabId)); await chrome.storage.session.remove(receiptKey(tabId)); await chrome.storage.session.remove('sidebar-text-' + tabId); }
    return { handle, parseAnswer, solve, remove, receipt };
})();
