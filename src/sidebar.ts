(() => {
  'use strict';
  const root=document.querySelector('[data-local-study-host]').shadowRoot;
  const contextLine=document.createElement('p');contextLine.id='page-context';root.querySelector('header>div').append(contextLine);
  globalThis.__localSidebarContext={tabId:null,course:false};let pending: Promise<SidebarContext>;
  globalThis.__refreshLocalSidebar=()=>{
    if(pending)return pending;
    pending=(async()=>{
      const data=await chrome.runtime.sendMessage({type:'NATIVE_CONTEXT'});if(!data?.ok)throw new Error(data?.error||'无法读取当前网页。');
      const changed=globalThis.__localSidebarContext.tabId!==data.tabId;globalThis.__localSidebarContext=data;
      contextLine.textContent=data.course?'绑定：学习通章节学习页':'绑定：'+data.title;contextLine.title=contextLine.textContent;
      if(data.selection){(root.getElementById('question') as HTMLTextAreaElement).value=data.selection;root.getElementById('status').textContent='已读取选中文字，点击提问即可。';}
      if(changed)window.dispatchEvent(new Event('local-sidebar-tab-changed'));
      return data;
    })().catch(error=>{contextLine.textContent=error.message;return globalThis.__localSidebarContext;}).finally(()=>pending=null);
    return pending;
  };
  chrome.tabs.onUpdated.addListener((id,change)=>{if(id===globalThis.__localSidebarContext.tabId&&(change.status==='complete'||change.url))globalThis.__refreshLocalSidebar();});
  const collapse=root.getElementById('close');collapse.hidden=false;collapse.textContent='收起';collapse.setAttribute('aria-label','收起助手，课程任务继续');collapse.title='收起侧栏；课程任务继续。再次单击工具栏图标恢复。';
  collapse.addEventListener('click',async()=>{const data=await chrome.runtime.sendMessage({type:'COLLAPSE_SIDEBAR'});if(!data?.ok)root.getElementById('status').textContent=data?.error||'请使用浏览器侧栏的关闭按钮。';});
  globalThis.__refreshLocalSidebar();
})();
