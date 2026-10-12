(() => {
  'use strict';
  if(!/(^|\.)(chaoxing\.com|xuexitong\.com|edu\.cn|org\.cn|xueyinonline\.com|hnsyu\.net|qutjxjy\.cn|ynny\.cn|hnvist\.cn|fjlecb\.cn|gdhkmooc\.com|cugbonline\.cn|zjelib\.cn|cqrspx\.cn|neauce\.com|zhihui-yun\.com|cqie\.cn|ccqmxx\.com|jxgmxy\.com|jnzyjsxy\.cn|smjyxy\.cn|sslibrary\.com|xuexi365\.com)$/.test(location.hostname)||/\/exam-ans\//.test(location.pathname)||!/(?:^|\/)work(?:\/|$)/.test(location.pathname)||globalThis.__localWorkObserver)return;
  globalThis.__localWorkObserver=true;
  const nativeOpen=XMLHttpRequest.prototype.open,nativeSend=XMLHttpRequest.prototype.send,requests=new WeakMap();
  XMLHttpRequest.prototype.open=function(method: string,url: string | URL,async?: boolean,username?: string,password?: string){
    let info;try{const target=new URL(String(url),location.href);if(/\/work\/addStudentWork(?:New|NewWeb)?$/.test(target.pathname))info={kind:target.searchParams.get('tempsave')==='1'?'save':'submit'};}catch{}
    requests.set(this,info);return Reflect.apply(nativeOpen,this,Array.from(arguments));
  };
  XMLHttpRequest.prototype.send=function(...args){
    const info=requests.get(this);
    if(info){
      info.started=Date.now();let emitted=false;
      const finish=()=>{
        if(emitted||this.readyState!==4)return;emitted=true;
        let success=false;try{const data=this.responseType==='json'?this.response:JSON.parse(this.responseText);success=this.status>=200&&this.status<300&&[true,1,'1'].includes(data?.status);}catch{}
        // 只发布结果标志；不复制请求体、表单值、Cookie、Token 或响应中的 URL。
        document.dispatchEvent(new CustomEvent('local-study-work-result',{detail:JSON.stringify({kind:info.kind,success,started:info.started,at:Date.now()})}));
      };
      this.addEventListener('readystatechange',finish);this.addEventListener('loadend',finish,{once:true});
    }
    return nativeSend.apply(this,args);
  };
})();
