(() => {
  'use strict';
  if (globalThis.__localStudyAssistant) return;
  globalThis.__localStudyAssistant = true;
  const standalone = location.protocol === 'chrome-extension:';
  const nativeSidebar=standalone&&location.pathname==='/sidepanel.html';
  const host = document.createElement('div');
  host.dataset.localStudyHost = '';
  // Shadow DOM 隔离网页样式；答案始终按纯文本展示。
  const root = host.attachShadow({mode:'open'});
  root.innerHTML = `<style>
    :host{all:initial;position:fixed;inset:auto 18px 20px auto;z-index:2147483647;color:#233b45;font:14px/1.6 "Microsoft YaHei UI","Microsoft YaHei",sans-serif;color-scheme:light}
    *{box-sizing:border-box}button,input,textarea,select{font:inherit}button{border:1px solid #bdcdd3;border-radius:6px;padding:8px 12px;background:#fff;color:#285563;cursor:pointer}button:hover{background:#eff7f9}button:disabled{opacity:.55;cursor:default}button:focus-visible,select:focus-visible{outline:2px solid #126b80;outline-offset:2px}textarea:focus{outline:2px solid #126b80;outline-offset:1px}.primary{background:#126b80;color:white;border-color:#126b80}.primary:hover{background:#105e71}.quiet{border-color:transparent;background:transparent;color:#647b85;padding:6px 8px}.fab{border:0;background:#126b80;color:white;box-shadow:0 4px 18px #123c5c24;padding:11px 18px;border-radius:18px 18px 2px 18px}.fab:hover{background:#105e71}.fab small{font-size:11px;opacity:.8;margin-left:7px}.panel{display:flex;flex-direction:column;width:min(430px,calc(100vw - 36px));height:min(760px,calc(100vh - 44px));background:white;border:1px solid #b9ccd4;border-top:4px solid #126b80;border-radius:10px 10px 3px 10px;box-shadow:0 12px 44px #173c5c2b;overflow:hidden}[hidden]{display:none!important}
    header{display:flex;align-items:center;justify-content:space-between;padding:15px 18px 11px;border-bottom:1px solid #e2ebef}h2{font-size:17px;font-weight:650;margin:0}header p{margin:2px 0 0;color:#627a85;font-size:12px}.body{padding:15px 18px;display:flex;flex-direction:column;gap:12px;flex:1;min-height:0;overflow:auto}.tools{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.tools button{font-size:12px;padding:6px 9px}.question-label{display:flex;justify-content:space-between;align-items:center;font-weight:600}.question-label small{font-size:11px;font-weight:400;color:#70828b}textarea{resize:vertical;min-height:125px;height:145px;max-height:300px;width:100%;border:1px solid #b9cdd5;border-radius:6px;padding:11px;color:#233b45;background:#fcfeff;line-height:1.65}select{width:100%;border:1px solid #c9d8de;border-radius:5px;padding:8px;background:white;color:#233b45}.send-row{display:flex;gap:8px;align-items:center}.send-row .primary{flex:1}.status{margin:0;min-height:20px;font-size:12px;color:#52737f;white-space:pre-wrap}.status.error{color:#af3730}.answer-head{display:flex;justify-content:space-between;align-items:center;border-top:1px solid #dce7ec;padding-top:10px;font-weight:600}.answer{flex:1;min-height:120px;margin:0;padding:0 2px 16px;white-space:pre-wrap;overflow-wrap:anywhere;font:14px/1.9 "Microsoft YaHei UI","Microsoft YaHei",sans-serif;color:#273b44}.answer:empty:before{content:"答案与解析会显示在这里。";color:#8a9ba3}.foot{font-size:11px;color:#728993;background:#f1f6f8;padding:9px 18px}.solo{width:min(780px,calc(100vw - 32px));height:calc(100vh - 60px);border-radius:8px}.solo textarea{height:170px}.solo .answer{font-size:15px;line-height:2}.solo .body{padding:22px 28px}.solo header{padding:20px 28px}.solo h2{font-size:22px}@media(max-width:480px){:host{right:10px;bottom:12px}.panel{width:calc(100vw - 20px);height:calc(100vh - 30px)}.body{padding:12px 14px}.solo .body{padding:16px}.solo{height:calc(100vh - 24px)}}@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto}}
  </style>
  <button class="fab" id="launcher" title="打开 Runa学习助手，快捷键 Alt+Q">学习助手<small>Runa</small></button>
  <section class="panel" id="panel" aria-label="Runa学习助手" hidden>
    <header><div><h2>Runa学习助手</h2><p id="model-line">使用自己的 AI · 无需登录</p></div><div><button id="settings" class="quiet" title="接口设置">设置</button><button id="close" class="quiet" aria-label="关闭助手">✕</button></div></header>
    <div class="body">
      <div class="tools" id="page-tools"><button id="selection">读取选中文字</button><button id="extract">提取网页题目</button><button id="clear" class="quiet">清空</button></div>
      <select id="questions" aria-label="选择提取的题目" hidden></select>
      <label class="question-label" for="question">题目与选项<small>Ctrl + Enter 提问</small></label>
      <textarea id="question" maxlength="24000" placeholder="选中网页上的题目，或把题干和选项粘贴到这里。"></textarea>
      <div class="send-row"><button id="ask" class="primary">获取答案与解析</button><button id="stop" hidden>停止</button></div>
      <p class="status" id="status" role="status" aria-live="polite">准备好后点击提问。</p>
      <div class="answer-head"><span>答案与解析</span><button id="copy" class="quiet">复制答案</button></div>
      <pre class="answer" id="answer" tabindex="0"></pre>
    </div><div class="foot">使用你自己的接口与额度。只发送上面的题目文字。</div>
  </section>`;
  (document.body || document.documentElement).append(host);
  const $ = <K extends keyof StudyControls>(id: K) => root.getElementById(id) as StudyControls[K];
  let selectedText='', questions: {text: string; hasImages: boolean}[]=[], port: chrome.runtime.Port=null, heartbeat: ReturnType<typeof setInterval>=null, busy=false, notice='';
  function status(text: string,error=false){$('status').textContent=text;$('status').classList.toggle('error',error);}
  async function message(data: AssistantMessage){
    try{const result=await chrome.runtime.sendMessage(data);if(!result?.ok)throw new Error(result?.error||'扩展没有响应。');return result;}
    catch(e){throw new Error(e.message?.includes('context invalidated')?'扩展已更新或重新加载，请刷新网页。':e.message);}
  }
  function setBusy(value: boolean){busy=value;$('ask').disabled=value;$('stop').hidden=!value;}
  function finish(){clearInterval(heartbeat);heartbeat=null;setBusy(false);const previous=port;port=null;previous?.disconnect();}
  function stop(){if(port){port.postMessage({type:'CANCEL'});status('正在停止…');}}
  async function open(text=''){
    $('panel').hidden=false;$('launcher').hidden=true;
    if(text){$('question').value=text.slice(0,24000);status('已读取选中文字。点击提问即可。');}
    try{const c=await message({type:'STATUS'});$('model-line').textContent=c.model+' · v'+chrome.runtime.getManifest().version+' · 无需登录';if(!c.configured)status('第一次使用：点击“设置”填写 API Key。');}catch(e){status(e.message,true);}
  }
  function rememberSelection(){const text=window.getSelection()?.toString().trim();if(text&&!root.activeElement)selectedText=text.slice(0,24000);}
  document.addEventListener('selectionchange',rememberSelection);
  $('launcher').addEventListener('pointerdown',rememberSelection);
  $('launcher').addEventListener('click',()=>message({type:'OPEN_SIDEBAR',text:selectedText}).catch(()=>open(selectedText)));
  $('settings').addEventListener('click',()=>message({type:'OPEN_OPTIONS'}).catch(e=>status(e.message,true)));
  $('close').addEventListener('click',()=>{if(busy){port?.postMessage({type:'CANCEL'});finish();}if(!standalone){$('panel').hidden=true;$('launcher').hidden=false;}});
  $('clear').addEventListener('click',()=>{if(busy)return;$('question').value='';$('answer').textContent='';selectedText='';questions=[];$('questions').hidden=true;status('已清空，粘贴或读取下一道题。');});
  $('selection').addEventListener('pointerdown',rememberSelection);
  $('selection').addEventListener('click',async()=>{
    try{let text=selectedText;if(!text){const r=await message({type:'READ_PAGE'});text=r.selection;}if(!text)throw new Error('请先用鼠标选中题目文字，再点击读取。');$('question').value=text;status('已读取选中文字。');}
    catch(e){status(e.message,true);}
  });
  function chooseQuestion(index: number){const q=questions[index];if(!q)return;$('question').value=q.text;status(q.hasImages?'这道题包含图片。本版只发送文字，请补充图片中的条件后提问。':'已提取题目，请检查题干和选项是否完整。');}
  $('extract').addEventListener('click',async()=>{
    $('extract').disabled=true;status('正在读取网页题目…');
    try{const r=await message({type:'READ_PAGE'});questions=r.questions;
      if(!questions.length){if(r.selection){$('question').value=r.selection;status('已读取选中文字。');}else status('没有识别到题目结构。请选中题干与选项，或直接粘贴。',true);$('questions').hidden=true;return;}
      $('questions').replaceChildren(...questions.map((q,i)=>{const option=document.createElement('option');option.value=String(i);option.textContent=`第 ${i+1} 道 · ${q.text.replace(/\s+/g,' ').slice(0,48)}`;return option;}));
      $('questions').hidden=questions.length===1;chooseQuestion(0);
    }catch(e){status('暂时无法读取这个页面。你可以直接粘贴题目。\n'+e.message,true);}finally{$('extract').disabled=false;}
  });
  $('questions').addEventListener('change',()=>chooseQuestion(Number($('questions').value)));
  function ask(event: Event){
    if(!event.isTrusted || busy)return;
    const text=$('question').value.trim();if(!text){status('请先填写题目与选项。',true);$('question').focus();return;}
    $('answer').textContent='';notice='';setBusy(true);status('正在连接你的 AI…');
    try{
      port=chrome.runtime.connect({name:'local-study-ai'});const current=port;
      heartbeat=setInterval(()=>{try{current.postMessage({type:'PING'});}catch{finish();status('扩展连接已断开，请刷新网页。',true);}},20000);
      current.onMessage.addListener(msg=>{
        if(current!==port)return;
        if(msg.type==='START')status('正在生成答案…');
        if(msg.type==='THINKING')status('模型正在思考…');
        if(msg.type==='DELTA'){$('answer').textContent+=msg.text;status('正在生成答案…');}
        if(msg.type==='NOTICE')notice=msg.text;
        if(msg.type==='DONE'){finish();status(notice||'答案已生成。');}
        if(msg.type==='ERROR'){finish();status(msg.error,true);}
      });
      current.onDisconnect.addListener(()=>{if(current===port){finish();status('连接已断开，请重试。已生成的文字会保留。',true);}});
      current.postMessage({type:'ASK',text});
    }catch(e){finish();status('扩展连接失败，请刷新网页后重试。',true);}
  }
  $('ask').addEventListener('click',ask);
  $('question').addEventListener('keydown',event=>{if(event.ctrlKey&&event.key==='Enter'){event.preventDefault();ask(event);}});
  $('stop').addEventListener('click',stop);
  $('copy').addEventListener('click',async()=>{const text=$('answer').textContent;if(!text){status('目前没有可以复制的答案。');return;}try{await navigator.clipboard.writeText(text);status('答案已复制。');}catch{status('浏览器未允许自动复制，请选中答案后按 Ctrl+C。',true);}});
  chrome.runtime.onMessage.addListener((msg,sender,reply)=>{if(sender.id!==chrome.runtime.id)return;if(msg?.type==='OPEN_PANEL'){open(msg.text||'');reply({ok:true});}});
  window.addEventListener('pagehide',()=>{if(port){port.postMessage({type:'CANCEL'});finish();}});
  if(nativeSidebar){
    document.body.style.cssText='margin:0;background:white;';host.style.cssText='position:relative;display:block;inset:auto;margin:0;width:100%;height:100vh;';$('panel').classList.add('native');$('close').hidden=true;
    const css=document.createElement('style');css.textContent=`
      :host{font-family:"Microsoft YaHei UI","Microsoft YaHei",sans-serif;color:#202a43}
      .native{width:100%;height:100dvh;border:0;border-radius:0;box-shadow:none;background:white}
      .native header{padding:18px 16px 13px;flex-shrink:0}.native header h2{font-size:17px;color:#17203a}.native header h2:before{content:'D';display:inline-grid;place-items:center;width:25px;height:25px;background:#375dff;color:white;border-radius:8px;margin-right:8px;font:700 16px Arial}
      .native .body{padding:14px 16px;gap:10px}.native .body:not(.course-body){overflow:hidden}.native .tools{order:0;gap:6px}.native .tools button{padding:5px 8px;font-size:11px}.native .body:not(.course-body) .answer-head{order:2;font-size:12px;border:0;padding:0;color:#66718a}.native #questions{order:1}.native #answer{order:3;overflow:auto;min-height:100px;padding:14px;background:#f7f9fe;border-radius:8px}.native #answer:empty:before{content:'粘贴题干和选项，或点击“提取本页”。';font-size:13px;line-height:2}.native #status{order:4;font-size:11px}.native .question-label{order:5;font-size:12px}.native #question{order:6;min-height:72px;height:82px;max-height:160px;padding:10px;border-radius:10px;border-color:#d8deec}.native .send-row{order:7;flex-shrink:0}.native .primary{background:#375dff;border-color:#375dff}.native .primary:hover{background:#2b4fe3}.native button{border-color:#d8deec;color:#304365}.native .primary{color:white}.native .foot{padding:9px 16px;background:#f7f9fe;flex-shrink:0;line-height:1.7}.native .modes{padding:8px 16px}.native .modes button.active{background:#edf1ff;color:#375dff}.native #page-context{margin:8px 0 0;font-size:11px;color:#64718a;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:300px}
    `;root.append(css);open();
  }
  else if(standalone){document.body.style.cssText='margin:0;background:#edf3f5;';host.style.cssText='position:relative;display:block;inset:auto;margin:30px auto;width:max-content;max-width:100%;';$('panel').classList.add('solo');$('page-tools').hidden=true;$('close').hidden=true;open();}
  else if(window!==window.top){$('launcher').hidden=true;}
  else message({type:'STATUS'}).then(c=>{if(c.sidebarSupported)$('launcher').hidden=true;}).catch(()=>{});
  const theme=document.createElement('link');theme.rel='stylesheet';theme.href=chrome.runtime.getURL('theme.css');root.append(theme);
  if(standalone)document.body.style.background='#e9edf3';
})();

