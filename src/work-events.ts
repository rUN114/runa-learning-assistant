(() => {
  'use strict';
  if(!/(^|\.)(chaoxing\.com|xuexitong\.com|edu\.cn|org\.cn|xueyinonline\.com|hnsyu\.net|qutjxjy\.cn|ynny\.cn|hnvist\.cn|fjlecb\.cn|gdhkmooc\.com|cugbonline\.cn|zjelib\.cn|cqrspx\.cn|neauce\.com|zhihui-yun\.com|cqie\.cn|ccqmxx\.com|jxgmxy\.com|jnzyjsxy\.cn|smjyxy\.cn|sslibrary\.com|xuexi365\.com)$/.test(location.hostname)||/\/exam-ans\//.test(location.pathname)||!/(?:^|\/)work(?:\/|$)/.test(location.pathname))return;
  if(globalThis.__localWorkEvents)return;globalThis.__localWorkEvents=true;
  document.addEventListener('local-study-work-result',event=>{
    let result;try{result=JSON.parse((event as CustomEvent<string>).detail);}catch{return;}
    if(!['save','submit'].includes(result.kind)||typeof result.success!=='boolean'||!Number.isFinite(result.started)||!Number.isFinite(result.at)||result.at<result.started||Math.abs(Date.now()-result.at)>30000)return;
    chrome.runtime.sendMessage({type:'WORK_RESULT',result:{kind:result.kind,success:result.success,started:result.started,at:result.at}}).catch(()=>{});
  });
})();
