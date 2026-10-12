// 独立 Edge 配置、自建页面和媒体；不操作真实课程或真实 AI 接口。
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium,executablePath}=require('./browser-runtime.cjs');
const host='https://video-start-fixture.chaoxing.com',ext=path.resolve('outputs/DeepSeek-右侧栏版');let context;
const wav=Buffer.alloc(44+16000*2*10);wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(16000,24);wav.writeUInt32LE(32000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(wav.length-44,40);
const style='<meta charset="utf-8"><style>video{width:600px;height:300px;background:black}iframe{width:720px;height:500px}button{padding:20px}.vjs-big-play-button{position:absolute;left:270px;top:140px}.video-js{position:relative}</style>';
(async()=>{
  context=await chromium.launchPersistentContext(path.resolve('work/sidebar-qa/video-profile-'+Date.now()),{executablePath,headless:true,args:[`--disable-extensions-except=${ext}`,`--load-extension=${ext}`]});
  await context.route(host+'/**',async route=>{
    const u=new URL(route.request().url()),mode=u.searchParams.get('mode');
    if(u.pathname==='/media.wav')return route.fulfill({body:wav,contentType:'audio/wav'});
    if(u.pathname==='/slow.wav'){await new Promise(r=>setTimeout(r,5000));return route.fulfill({body:wav,contentType:'audio/wav'}).catch(()=>{});}
    let body=style;
    if(u.pathname.includes('studentstudy'))body+='<h1>本地视频启动回归</h1><ul id="prev_tab"><li id="video" class="active">视频</li></ul><iframe id="iframe" src="/knowledge/cards?mode='+mode+'"></iframe>';
    else if(u.pathname==='/knowledge/cards')body+='<div class="ans-attach-ct"><span class="ans-job-icon">未完成任务点</span><iframe src="/modules/video/index.html?mode='+mode+'"></iframe></div>';
    else body+='<div class="video-js"><video controls muted></video><button class="vjs-big-play-button" onclick="this.dataset.clicks=String(Number(this.dataset.clicks||0)+1);'+(mode==='lazy'||mode==='slow'?'this.hidden=true;const v=document.querySelector(\'video\');v.src=\''+(mode==='slow'?'/slow.wav':'/media.wav')+'\';v.load();':'')+'">播放</button></div>';
    await route.fulfill({body,contentType:'text/html; charset=utf-8'});
  });
  const worker=context.serviceWorkers()[0]||await context.waitForEvent('serviceworker'),tests=[];
  // 等待首次安装的设置页就绪，避免它与测试的第一张页面竞争导航。
  await worker.evaluate(()=>chrome.runtime.openOptionsPage());
  let installedOptions;for(let i=0;i<40&&!installedOptions;i++){installedOptions=context.pages().find(p=>p.url().endsWith('/options.html'));if(!installedOptions)await new Promise(r=>setTimeout(r,50));}
  assert.ok(installedOptions);await installedOptions.waitForLoadState();
  await worker.evaluate(()=>{self.fetch=()=>{throw new Error('不应调用 AI');};});
  async function fixture(mode){
    const p=await context.newPage();await p.goto(host+'/mycourse/studentstudy?courseId='+Date.now()+'&chapterId=1&mode='+mode);
    const q=p.frameLocator('#iframe').frameLocator('iframe');await q.locator('video').waitFor();
    const id=await worker.evaluate(async url=>(await chrome.tabs.query({})).find(t=>t.url===url).id,p.url());
    const handle=type=>worker.evaluate(async({id,type})=>CourseEngine.handle({type,settings:{answer:false,videoAnswer:false,next:false,rate:1,muted:true}},{tab:{id},frameId:0}),{id,type});
    await handle('COURSE_START');return{p,q,id,handle};
  }
  const state=f=>worker.evaluate(async id=>(await chrome.storage.session.get('course-run-'+id))['course-run-'+id],f.id);
  async function age(f,field){await worker.evaluate(async({id,field})=>{const k='course-run-'+id,s=(await chrome.storage.session.get(k))[k];if(field==='pageStarted')s.pageStarted=Date.now()-120000;else s.mediaLoad.since=Date.now()-61000;await chrome.storage.session.set({[k]:s});},{id:f.id,field});}
  const lazy=await fixture('lazy');assert.equal(await lazy.q.locator('video').evaluate(v=>Number.isFinite(v.duration)),false);await age(lazy,'pageStarted');await lazy.handle('COURSE_TICK');
  await lazy.q.locator('video').evaluate(v=>new Promise(resolve=>{if(v.currentTime>0)return resolve();v.addEventListener('timeupdate',()=>{if(v.currentTime>0)resolve();},{once:true});}));
  await lazy.handle('COURSE_TICK');assert.equal((await state(lazy)).phase,'video');assert.equal(await lazy.q.locator('.vjs-big-play-button').getAttribute('data-clicks'),'1');assert.equal(await lazy.q.locator('video').evaluate(v=>v.muted),true);tests.push('duration-zero-clicks-native-play-first','old-page-age-does-not-prematurely-timeout','lazy-source-loads-and-really-plays','initial-button-clicked-once');await lazy.handle('COURSE_STOP');await lazy.p.close();
  const slow=await fixture('slow');const before=Date.now();await slow.handle('COURSE_TICK');assert.ok(Date.now()-before<4000);assert.equal((await state(slow)).phase,'loading-video');await slow.handle('COURSE_TICK');assert.equal(await slow.q.locator('.vjs-big-play-button').getAttribute('data-clicks'),'1');await slow.handle('COURSE_STOP');await new Promise(r=>setTimeout(r,5200));assert.equal(await slow.q.locator('video').evaluate(v=>v.paused),true);assert.equal((await state(slow)).running,false);tests.push('pending-play-does-not-hold-scheduler','pending-play-does-not-repeat-native-click','stop-cancels-pending-play');await slow.p.close();
  const stuck=await fixture('stuck');await age(stuck,'pageStarted');await stuck.handle('COURSE_TICK');assert.equal((await state(stuck)).running,true);for(let i=0;i<3;i++){await age(stuck,'mediaLoad');await worker.evaluate(async id=>{const k='course-run-'+id,s=(await chrome.storage.session.get(k))[k];for(const retry of Object.values(s.mediaRetries||{}))retry.at=0;await chrome.storage.session.set({[k]:s});},stuck.id);await stuck.handle('COURSE_TICK');}assert.ok(Object.values((await state(stuck)).pending).some(task=>task.task));assert.equal(Object.values((await state(stuck)).mediaRetries)[0].count,2);await stuck.handle('COURSE_TICK');assert.equal((await state(stuck)).running,false);assert.equal((await state(stuck)).phase,'paused');tests.push('load-timeout-measured-from-play-attempt','genuine-load-timeout-reloads-twice-and-queues-without-false-completion');await stuck.p.close();
  const denied=await fixture('denied');await worker.evaluate(async id=>{await chrome.scripting.executeScript({target:{tabId:id,allFrames:true},func:()=>{const v=document.querySelector('video');if(v)v.play=()=>Promise.reject(new DOMException('blocked fixture','NotAllowedError'));}});},denied.id);await denied.handle('COURSE_TICK');assert.equal((await state(denied)).running,false);assert.match((await state(denied)).logs.at(-1).text,/浏览器阻止了自动播放/);assert.ok(!(await state(denied)).logs.at(-1).text.includes('一分钟'));tests.push('autoplay-rejection-has-correct-message');await denied.p.close();
  fs.writeFileSync('work/sidebar-qa/video-start-results.json',JSON.stringify({tests,mockOnly:true,realCourseModified:false,realApiCalled:false},null,2));console.log('PASS',tests.length,'video startup regressions',tests);
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{await context?.close();});
