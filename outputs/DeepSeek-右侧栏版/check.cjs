'use strict';
// 无依赖检查。使用虚构 Key 与模拟网络，不调用真实 API。
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const path=require('node:path');
const event=()=>({listeners:[],addListener(fn){this.listeners.push(fn);}});
const store={},session={};let request,fetchImpl,frames=[],panelBehavior,panelOpened,panelClosed,alarmOptions;const panelOptions={};let activeTabId=1;
const chrome={
  runtime:{id:'local-test',getURL:p=>'chrome-extension://local-test/'+p,onMessage:event(),onConnect:event(),onInstalled:event(),openOptionsPage:async()=>{}},
  storage:{local:{setAccessLevel:async value=>assert.equal(value.accessLevel,'TRUSTED_CONTEXTS'),get:async()=>({...store}),set:async data=>Object.assign(store,data)},session:{get:async key=>key===null?{...session}:({[key]:session[key]}),set:async data=>Object.assign(session,data),remove:async key=>{delete session[key];}}},
  tabs:{onUpdated:event(),onActivated:event(),onRemoved:event(),get:async id=>({id,windowId:10,title:'模拟课程',url:'https://fixture.chaoxing.com/mycourse/studentstudy'}),query:async()=>[{id:activeTabId,windowId:10,title:'模拟课程',url:'https://fixture.chaoxing.com/mycourse/studentstudy'}],sendMessage:async()=>{},create:async()=>{}},
  alarms:{onAlarm:event(),get:async()=>null,create:async(_name,options)=>alarmOptions=options},sidePanel:{setOptions:async data=>panelOptions[data.tabId||'global']=data,close:async data=>panelClosed=data,setPanelBehavior:async data=>panelBehavior=data,open:async data=>panelOpened=data},
  scripting:{executeScript:async()=>frames},action:{onClicked:event()},commands:{onCommand:event()},contextMenus:{onClicked:event(),removeAll:async()=>{},create:()=>{}}
};
const ctx=vm.createContext({chrome,URL,fetch:async(url,options)=>{request={url,options};return fetchImpl(url,options);},AbortController,TextDecoder,Uint8Array,setTimeout,clearTimeout,console});
ctx.importScripts=(...names)=>names.forEach(name=>vm.runInContext(fs.readFileSync(path.join(__dirname,name),'utf8'),ctx));
vm.runInContext(fs.readFileSync(path.join(__dirname,'background.js'),'utf8'),ctx);
const admin={id:'local-test',url:'chrome-extension://local-test/options.html',tab:{id:2}};
const page={id:'local-test',url:'https://example.test/quiz',tab:{id:1}};
const message=(data,sender=admin)=>new Promise(resolve=>chrome.runtime.onMessage.listeners[0](data,sender,resolve));
function port(){
  const messages=[],out=event(),disconnect=event();
  let resolve;const done=new Promise(r=>resolve=r);
  const p={name:'local-study-ai',sender:page,onMessage:out,onDisconnect:disconnect,postMessage(msg){messages.push(msg);if(msg.type==='DONE'||msg.type==='ERROR')resolve();}};
  chrome.runtime.onConnect.listeners[0](p);
  return {messages,done,send:msg=>out.listeners.forEach(fn=>fn(msg)),disconnect:()=>disconnect.listeners.forEach(fn=>fn())};
}
async function ask(text='单选题：1+1=? A.1 B.2'){
  const p=port();p.send({type:'ASK',text});await p.done;return p.messages;
}
const streaming=(text,finish=true)=>new Response(new ReadableStream({start(controller){
  const events=`data: ${JSON.stringify({choices:[{delta:{content:text}}]})}\r\n\r\n`+(finish?'data: [DONE]\r\n\r\n':'');
  const bytes=new TextEncoder().encode(events);
  // 逐字节分块，覆盖中文 UTF-8、CRLF 和事件边界。
  for(const b of bytes)controller.enqueue(new Uint8Array([b]));controller.close();
}}),{headers:{'content-type':'text/event-stream'}});
(async()=>{
  await new Promise(r=>setTimeout(r,0));assert.equal(panelBehavior.openPanelOnActionClick,true);assert.equal(panelOptions.global.enabled,false);assert.equal(panelOptions[1].path,'sidepanel.html?tabId=1');assert.equal(alarmOptions.periodInMinutes,0.5);
  const sidebar={id:'local-test',url:'chrome-extension://local-test/sidepanel.html?tabId=1'};
  assert.equal((await message({type:'NATIVE_CONTEXT'},page)).ok,false);
  assert.equal((await message({type:'COURSE_STATE',tabId:2},sidebar)).ok,false);
  assert.equal((await message({type:'COURSE_STATE',tabId:1},sidebar)).state.phase,'idle');
  chrome.contextMenus.onClicked.listeners[0]({menuItemId:'local-study-selection',selectionText:'右键选择的题目'},{id:1,windowId:10});
  await new Promise(r=>setTimeout(r,0));assert.equal(panelOpened.tabId,1);
  const native=await message({type:'NATIVE_CONTEXT'},sidebar);assert.equal(native.tabId,1);assert.equal(native.course,true);assert.equal(native.selection,'右键选择的题目');assert.equal((await message({type:'NATIVE_CONTEXT'},sidebar)).selection,'');
  activeTabId=99;assert.equal((await message({type:'NATIVE_CONTEXT'},sidebar)).tabId,1);await message({type:'COLLAPSE_SIDEBAR'},sidebar);assert.equal(panelClosed.tabId,1);activeTabId=1;
  assert.equal((await message({type:'SAVE_SETTINGS',baseUrl:'https://api.deepseek.com',model:'deepseek-flash',apiKey:'fake-secret'},page)).ok,false);
  assert.equal((await message({type:'GET_SETTINGS'},page)).ok,false);
  for(const baseUrl of ['','http://api.deepseek.com','https://u:p@api.deepseek.com','https://api.deepseek.com?key=secret'])assert.equal((await message({type:'SAVE_SETTINGS',baseUrl,model:'deepseek-flash'})).ok,false);
  assert.equal((await message({type:'SAVE_SETTINGS',baseUrl:'https://api.deepseek.com',model:'deepseek-flash',apiKey:'fake-secret'})).ok,true);
  const settings=await message({type:'GET_SETTINGS'});assert.equal(settings.hasKey,true);assert.ok(!JSON.stringify(settings).includes('fake-secret'));
  const status=await message({type:'STATUS'},page);assert.ok(!JSON.stringify(status).includes('fake-secret'));
  fetchImpl=async()=>streaming('答案：B。因为 1+1=2。');
  let results=await ask();assert.equal(results.at(-1).type,'DONE');assert.equal(results.filter(x=>x.type==='DELTA').map(x=>x.text).join(''),'答案：B。因为 1+1=2。');
  assert.equal(request.url,'https://api.deepseek.com/chat/completions');assert.equal(request.options.headers.Authorization,'Bearer fake-secret');assert.equal(request.options.credentials,'omit');assert.equal(request.options.redirect,'error');assert.equal(JSON.parse(request.options.body).thinking.type,'disabled');
  assert.ok(!JSON.stringify(results).includes('fake-secret'));
  await message({type:'SAVE_SETTINGS',baseUrl:'https://api.deepseek.com/',model:'deepseek-flash',apiKey:''});assert.equal(store.apiKey,'fake-secret');
  await message({type:'SAVE_SETTINGS',baseUrl:'https://other.example/v1',model:'my-model',apiKey:''});assert.equal(store.apiKey,'');
  results=await ask();assert.equal(results.at(-1).type,'ERROR');
  await message({type:'SAVE_SETTINGS',baseUrl:'https://other.example/v1/chat/completions',model:'my-model',apiKey:'fake-secret'});
  fetchImpl=async()=>new Response(JSON.stringify({choices:[{message:{content:'非流式答案'}}]}),{headers:{'content-type':'application/json'}});
  results=await ask();assert.equal(request.url,'https://other.example/v1/chat/completions');assert.equal(results.at(-1).type,'DONE');
  fetchImpl=async()=>new Response('server echoed fake-secret',{status:401});results=await ask();assert.equal(results.at(-1).type,'ERROR');assert.ok(!JSON.stringify(results).includes('fake-secret'));
  fetchImpl=async()=>streaming('部分答案',false);results=await ask();assert.ok(results.some(x=>x.type==='NOTICE'));
  fetchImpl=async()=>new Response('data: not-json\n\n',{headers:{'content-type':'text/event-stream'}});results=await ask();assert.equal(results.at(-1).type,'ERROR');
  fetchImpl=async(_url,options)=>new Promise((_r,reject)=>options.signal.addEventListener('abort',()=>reject(new Error('aborted'))));
  const cancel=port();cancel.send({type:'ASK',text:'待停止的请求'});await new Promise(r=>setTimeout(r,20));cancel.send({type:'CANCEL'});await cancel.done;assert.match(cancel.messages.at(-1).error,/已停止/);
  const abandon=port();abandon.send({type:'ASK',text:'关闭连接'});await new Promise(r=>setTimeout(r,20));abandon.disconnect();await new Promise(r=>setTimeout(r,20));assert.equal(request.options.signal.aborted,true);
  frames=[{result:{selection:'选中题目',questions:[{text:'重复题目',hasImages:false}]}},{result:{selection:'',questions:[{text:'重复题目',hasImages:false},{text:'子框架题目',hasImages:true}]}}];
  const extracted=await message({type:'READ_PAGE'},page);assert.equal(extracted.selection,'选中题目');assert.equal(extracted.questions.length,2);assert.equal(extracted.questions[1].hasImages,true);
  const courseSender={...page,frameId:0};
  frames=[{frameId:0,result:{top:true,hasCourseFrame:true,path:'/mycourse/studentstudy',scope:'fixture-course',pageKey:'1:video',tabs:[],active:0,questions:[],videos:[],jobs:[]}},{frameId:1,result:{top:false,path:'/knowledge/cards',questions:[],videos:[{index:0,paused:false,ended:false,time:1,duration:30,required:true,jobDone:false}],jobs:[]}}];
  assert.equal((await message({type:'COURSE_START',settings:{answer:false,next:false}},courseSender)).ok,true);
  const execute=chrome.scripting.executeScript;let activeScans=0,maxScans=0,totalScans=0;
  chrome.scripting.executeScript=async details=>{if(details.args?.[0]!=='scan')return[{result:{ok:true}}];activeScans++;totalScans++;maxScans=Math.max(maxScans,activeScans);await new Promise(r=>setTimeout(r,20));activeScans--;return frames;};
  await Promise.all([message({type:'COURSE_TICK'},courseSender),message({type:'COURSE_TICK'},courseSender)]);assert.equal(maxScans,1);assert.equal(totalScans,1);chrome.scripting.executeScript=execute;
  totalScans=0;chrome.scripting.executeScript=async details=>{if(details.args?.[0]!=='scan')return[{result:{ok:true}}];totalScans++;return frames;};await ctx.backgroundPulse();assert.equal(totalScans,1);chrome.scripting.executeScript=execute;
  assert.equal(session['course-run-1'].running,true);
  // 视频页重启后，旧测验的跳过/暂存记录不能代替平台当前提交状态。
  session['course-run-1'].dispositions={'1:work':{kind:'skip'},'2:work':{kind:'save'}};
  await message({type:'COURSE_START',settings:{answer:false,next:false}},courseSender);
  assert.equal(Object.keys(session['course-run-1'].dispositions).length,0);
  // 按需加载的视频必须先启动，不能等 duration 出现才 play；页面年龄不是加载计时。
  frames[1].result.videos[0]={index:0,paused:true,ended:false,time:0,duration:0,required:true,jobDone:false};
  const mediaActions=[];chrome.scripting.executeScript=async details=>{
    if(details.world==='MAIN')return[];
    if(details.args?.[0]==='scan')return frames;
    mediaActions.push(details.args[0]);return[{result:{ok:true,pending:frames[1].result.videos[0].paused}}];
  };
  await message({type:'COURSE_START',settings:{answer:false,next:false}},courseSender);
  session['course-run-1'].pageStarted=Date.now()-120000;await message({type:'COURSE_TICK'},courseSender);
  assert.equal(mediaActions[0],'play');assert.equal(session['course-run-1'].running,true);assert.equal(session['course-run-1'].phase,'loading-video');
  frames[1].result.videos[0].duration=30;frames[1].result.videos[0].paused=false;
  await message({type:'COURSE_TICK'},courseSender);assert.equal(session['course-run-1'].phase,'video');chrome.scripting.executeScript=execute;
  const staying=(await message({type:'COURSE_START',settings:{answer:false,workAction:'save-stay',next:true,followManual:true,videoAnswer:false,submit:true}},courseSender)).state.settings;
  assert.equal(staying.next,false);assert.equal(staying.followManual,false);assert.equal(staying.submit,false);
  // 点击保存但没有平台成功证据时，必须停留本节，不能声称已保存或完成。
  frames=[frames[0],{frameId:1,documentId:'save-doc',result:{top:false,path:'/work',questions:[{id:'work:0',text:'模拟已填写题',signature:'save-signature',answered:true,isVideo:false}],videos:[],jobs:[],submitted:false,saveConfirmed:false}}];
  chrome.scripting.executeScript=async details=>details.args?.[0]==='scan'?frames:[{result:{ok:true}}];
  await message({type:'COURSE_START',settings:{answer:false,workAction:'save'}},courseSender);await message({type:'COURSE_TICK'},courseSender);assert.equal(session['course-run-1'].waiting.save,true);
  session['course-run-1'].waiting.since=Date.now()-31000;await message({type:'COURSE_TICK'},courseSender);assert.equal(session['course-run-1'].phase,'review');assert.equal(session['course-run-1'].running,false);assert.match(session['course-run-1'].logs.at(-1).text,/未确认成功/);
  const at=Date.now();const result={kind:'save',success:true,started:at,at};assert.equal((await message({type:'WORK_RESULT',result},page)).ok,false);
  assert.equal((await message({type:'WORK_RESULT',result},{...page,frameId:1,url:'https://fixture.chaoxing.com/work/do?knowledgeid=1'})).ok,true);
  assert.equal((await message({type:'COURSE_STATE'},courseSender)).state.running,true);chrome.scripting.executeScript=execute;
  const receiptSender={...page,frameId:1,url:'https://fixture.chaoxing.com/work/do?knowledgeid=1'};
  await Promise.all([message({type:'WORK_RESULT',result:{...result,kind:'save'}},receiptSender),message({type:'WORK_RESULT',result:{...result,kind:'submit'}},receiptSender)]);assert.equal(session['course-receipts-1'].length,3);
  store.baseUrl='https://api.deepseek.com';
  const keptKey=store.apiKey;
  const modelSettings=await message({type:'SAVE_SETTINGS',baseUrl:store.baseUrl,model:'deepseek-flash',reviewModel:'deepseek-v4-pro',apiKey:''});
  assert.equal(modelSettings.ok,true);assert.equal(store.apiKey,keptKey);
  const publicModels=await message({type:'GET_SETTINGS'});assert.equal(publicModels.reviewModel,'deepseek-v4-pro');assert.equal(publicModels.apiKey,undefined);
  assert.equal((await message({type:'SAVE_SETTINGS',baseUrl:store.baseUrl,model:'deepseek-flash',reviewModel:'bad model'})).ok,false);assert.equal(store.reviewModel,'deepseek-v4-pro');
  fetchImpl=async()=>streaming('{"verdict":false,"uncertain":false}');
  await vm.runInContext('runModel("判断题检查",new AbortController().signal,()=>{},true)',ctx);
  const reasoningRequest=JSON.parse(request.options.body);assert.equal(reasoningRequest.thinking.type,'enabled');assert.equal(reasoningRequest.max_tokens,16384);assert.equal(reasoningRequest.response_format.type,'json_object');
  store.baseUrl='https://other.example/v1';
  await vm.runInContext('runModel("兼容接口检查",new AbortController().signal,()=>{},true)',ctx);
  const compatibleRequest=JSON.parse(request.options.body);assert.equal(compatibleRequest.thinking,undefined);assert.equal(compatibleRequest.max_tokens,4096);
  await message({type:'SAVE_SETTINGS',baseUrl:store.baseUrl,model:'my-model',apiKey:'',clearKey:true});assert.equal(store.apiKey,'');
  assert.equal((await message({type:'GET_SETTINGS'})).hasKey,false);
  const parse=vm.runInContext('CourseEngine.parseAnswer',ctx),judge={type:'judge',options:[{letter:'A',text:'A. 错',verdict:false},{letter:'B',text:'B. 对',verdict:true}]};
  assert.deepEqual(JSON.parse(JSON.stringify(parse('{"verdict":false,"uncertain":false}',judge))).choices,['A']);
  assert.throws(()=>parse('{"verdict":false,"choices":["B"],"uncertain":false}',judge),/冲突/);
  assert.throws(()=>parse('{"choices":["A"],"uncertain":false}',judge),/明确对错/);
  assert.throws(()=>parse('{"verdict":"false","uncertain":false}',judge),/明确对错/);
  assert.throws(()=>parse('{"verdict":false,"uncertain":false}',{...judge,options:[{letter:'A',verdict:true},{letter:'B',verdict:true}]}),/语义/);
  const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'manifest.json'),'utf8'));
  assert.ok(!manifest.permissions.includes('cookies'));assert.ok(!manifest.update_url);assert.ok(!manifest.key);
  assert.ok(manifest.permissions.includes('sidePanel'));assert.equal(manifest.side_panel.default_path,'sidepanel.html');
  console.log('PASS: 请求适配、逐字节 SSE、非流式回复、权限隔离、Key 保留与清除、复核模型设置与校验、地址变更、错误脱敏、取消与断开、跨框架合并。未调用真实 API。');
})().catch(error=>{console.error(error);process.exitCode=1;});
