// 由 src/options.ts 构建。请修改 TypeScript 源文件后运行 npm run build。
"use strict";
(() => {
    'use strict';
    const $ = (id) => document.getElementById(id);
    let testing = false, savedHasKey = false;
    function status(text, error = false) { $('status').textContent = text; $('status').classList.toggle('error', error); }
    async function message(data) { const result = await chrome.runtime.sendMessage(data); if (!result?.ok)
        throw new Error(result?.error || '扩展连接失败，请重新加载扩展。'); return result; }
    function updateModelPlan() { const primary = $('model').value.trim(), review = $('review-model').value.trim() || primary; $('model-plan').textContent = '客观题判断：' + (primary || '请填写主模型') + ' + ' + (review || '请填写主模型') + '。复核模型留空时跟随主模型，不自动切换 Pro。'; }
    async function load() { try {
        const c = await message({ type: 'GET_SETTINGS' });
        $('base-url').value = c.baseUrl;
        $('model').value = c.model;
        $('review-model').value = c.reviewModel || '';
        savedHasKey = c.hasKey;
        updateKey();
        updateModelPlan();
        status(c.hasKey ? 'Key 已保存，可以直接使用。' : '填写 Key 后点击“保存设置”。');
    }
    catch (e) {
        status(e.message, true);
    } }
    function updateKey() { $('key-state').textContent = savedHasKey ? '已在本地保存' : '尚未配置'; $('key').placeholder = savedHasKey ? '已保存；留空保留，填写可替换' : '粘贴你自己的 API Key'; }
    async function save(clearKey = false) { const c = await message({ type: 'SAVE_SETTINGS', baseUrl: $('base-url').value, model: $('model').value, reviewModel: $('review-model').value, apiKey: clearKey ? '' : $('key').value, clearKey }); savedHasKey = c.hasKey; $('key').value = ''; $('key').type = 'password'; $('show-key').textContent = '显示'; updateKey(); return c; }
    $('settings').addEventListener('submit', async (e) => { e.preventDefault(); try {
        const c = await save();
        status(c.hasKey ? '设置已保存。回到题目网页即可使用。' : '接口设置已保存，请再填写 Key。');
    }
    catch (e) {
        status(e.message, true);
    } });
    $('model').addEventListener('input', updateModelPlan);
    $('review-model').addEventListener('input', updateModelPlan);
    $('show-key').addEventListener('click', () => { const hidden = $('key').type === 'password'; $('key').type = hidden ? 'text' : 'password'; $('show-key').textContent = hidden ? '隐藏' : '显示'; });
    $('clear-key').addEventListener('click', async () => { if (testing)
        return; try {
        await save(true);
        status('Key 已清除。');
    }
    catch (e) {
        status(e.message, true);
    } });
    $('open-assistant').addEventListener('click', () => chrome.tabs.create({ url: chrome.runtime.getURL('assistant.html') }));
    $('test').addEventListener('click', async () => {
        if (testing)
            return;
        let port, timer;
        try {
            const c = await save();
            if (!c.hasKey)
                throw new Error('请先填写 API Key。');
            testing = true;
            $('test').disabled = true;
            status('正在测试连接…');
            port = chrome.runtime.connect({ name: 'local-study-ai' });
            timer = setInterval(() => port.postMessage({ type: 'PING' }), 20000);
            let text = '';
            const finish = () => { clearInterval(timer); testing = false; $('test').disabled = false; port.disconnect(); };
            port.onMessage.addListener(msg => { if (msg.type === 'DELTA')
                text += msg.text; if (msg.type === 'DONE') {
                status('连接成功。模型回复：' + text.slice(0, 200));
                finish();
            } if (msg.type === 'ERROR') {
                status(msg.error, true);
                finish();
            } });
            port.onDisconnect.addListener(() => { clearInterval(timer); if (testing) {
                testing = false;
                $('test').disabled = false;
                status('扩展连接已断开，请重试。', true);
            } });
            port.postMessage({ type: 'ASK', text: '请只回复：连接成功' });
        }
        catch (e) {
            clearInterval(timer);
            testing = false;
            $('test').disabled = false;
            status(e.message, true);
            port?.disconnect();
        }
    });
    load();
})();
