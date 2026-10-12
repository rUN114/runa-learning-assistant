// 自建页面在下一节整页跳转后延迟创建章节框架，覆盖真实课程切换中的空窗。
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium,executablePath}=require('./browser-runtime.cjs');
const host='https://navigation-fixture.chaoxing.com',ext=path.resolve(process.argv[2]||'outputs/DeepSeek-右侧栏版');let context;
const wav=Buffer.alloc(44+16000*2);wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(16000,24);wav.writeUInt32LE(32000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(wav.length-44,40);
const style='<meta charset="utf-8"><style>video{width:500px;height:250px}iframe{width:650px;height:450px}</style>';
(async()=>{
  context=await chromium.launchPersistentContext(path.resolve('work/sidebar-qa/navigation-profile-'+Date.now()),{executablePath,headless:true,args:[`--disable-extensions-except=${ext}`,`--load-extension=${ext}`]});
  await context.route(host+'/**',async route=>{
    const u=new URL(route.request().url()),chapter=Number(u.searchParams.get('chapterId')||1),mode=u.searchParams.get('mode')||'chain';let body=style;
    if(u.pathname==='/media.wav')return route.fulfill({body:wav,contentType:'audio/wav'});
    if(u.pathname.includes('studentstudy')){
      const content='<ul id="prev_tab"><li id="dct1" class="active">视频</li></ul><iframe id="iframe" src="/knowledge/cards"></iframe>';
      const delay=mode==='never'?0:mode==='late-start'?1800:chapter===2?2400:chapter===3?1500:0;
      body+='<h1>第 '+chapter+' 节 · 本地模拟</h1><div id="tasks">章节加载中</div>';
      if(mode!=='never')body+=delay?'<script>setTimeout(()=>document.getElementById("tasks").innerHTML='+JSON.stringify(content)+','+delay+')</script>':content;
      if(mode==='chain'&&chapter<3){const next=new URL(u.href);next.searchParams.set('chapterId',String(chapter+1));body+='<button id="prevNextFocusNext" onclick="location.href='+"'"+next.href+"'"+'">下一节</button>';}
    }else if(u.pathname==='/knowledge/cards')body+='<div class="ans-attach-ct"><span class="ans-job-icon">任务点</span><iframe src="/modules/video/index.html"></iframe></div>';
    else if(u.pathname==='/modules/video/index.html')body+='<video controls muted src="/media.wav" onended="parent.document.querySelector(\'.ans-attach-ct\').classList.add(\'ans-job-finished\')"></video>';
    else body+='<h1>课程首页</h1>';
    await route.fulfill({body,contentType:'text/html; charset=utf-8'});
  });
  const worker=context.serviceWorkers()[0]||await context.waitForEvent('serviceworker'),tests=[];
  await worker.evaluate(()=>chrome.runtime.openOptionsPage());
  let installedOptions;for(let i=0;i<40&&!installedOptions;i++){installedOptions=context.pages().find(p=>p.url().endsWith('/options.html'));if(!installedOptions)await new Promise(r=>setTimeout(r,50));}
  assert.ok(installedOptions);await installedOptions.waitForLoadState();
  await worker.evaluate(()=>{self.fetch=()=>{throw new Error('不应调用 AI');};});
  async function fixture(mode){
    const p=await context.newPage();await p.goto(host+'/mycourse/studentstudy?courseId='+Date.now()+'&clazzid=fixture&chapterId=1&mode='+mode);
    const id=await worker.evaluate(async url=>(await chrome.tabs.query({})).find(t=>t.url===url).id,p.url());
    const handle=type=>worker.evaluate(async({id,type})=>CourseEngine.handle({type,settings:{video:true,answer:false,videoAnswer:false,next:true,muted:true,rate:1}},{tab:{id},frameId:0}),{id,type});
    await handle('COURSE_START');return{p,id,handle};
  }
  const state=f=>worker.evaluate(async id=>(await chrome.storage.session.get('course-run-'+id))['course-run-'+id],f.id);
  // 网页自身也会调度 tick；显式 tick 与尚未结束的一轮共用锁。
  // 导航完成后等待状态收敛，仍要求助手明确停止，不把一次合并返回当最终结果。
  async function stoppedAfterNavigation(f){for(let i=0;i<40;i++){await f.handle('COURSE_TICK');if((await state(f)).phase==='stopped')return;await new Promise(resolve=>setTimeout(resolve,50));}assert.equal((await state(f)).phase,'stopped');}
  const chain=await fixture('chain'),waitChapters=new Set();
  for(let i=0;i<180;i++){
    await chain.handle('COURSE_TICK');const s=await state(chain);
    if(s.phase==='loading-course'){assert.equal(s.running,true);waitChapters.add(new URL(chain.p.url()).searchParams.get('chapterId'));}
    if(!s.running){assert.equal(s.phase,'finished',s.logs.at(-1)?.text);break;}
    await new Promise(r=>setTimeout(r,100));
  }
  assert.equal((await state(chain)).phase,'finished');assert.equal(new URL(chain.p.url()).searchParams.get('chapterId'),'3');assert.ok(waitChapters.has('2'));assert.ok(waitChapters.has('3'));
  assert.ok(!(await state(chain)).logs.some(l=>/请打开学习通/.test(l.text)));tests.push('second-chapter-shell-waits-instead-of-stopping','third-chapter-shell-waits-instead-of-stopping','three-consecutive-videos-finish','loading-does-not-report-invalid-course');await chain.p.close();
  const late=await fixture('late-start');assert.equal((await state(late)).phase,'loading-course');await late.handle('COURSE_TICK');assert.equal((await state(late)).running,true);await late.p.locator('#iframe').waitFor();await late.handle('COURSE_TICK');assert.equal((await state(late)).running,true);tests.push('start-during-chapter-load-is-accepted');await late.handle('COURSE_STOP');await late.p.close();
  const missing=await fixture('never');await missing.handle('COURSE_TICK');assert.equal((await state(missing)).phase,'loading-course');
  await worker.evaluate(async id=>{const k='course-run-'+id,s=(await chrome.storage.session.get(k))[k];s.pageLoadingSince=Date.now()-61000;await chrome.storage.session.set({[k]:s});},missing.id);
  await missing.handle('COURSE_TICK');assert.equal((await state(missing)).running,false);assert.match((await state(missing)).logs.at(-1).text,/一分钟内仍未加载完成/);tests.push('permanent-missing-frame-times-out');await missing.p.close();
  const paused=await fixture('late-start');await paused.handle('COURSE_STOP');await paused.p.locator('#iframe').waitFor();await paused.handle('COURSE_TICK');assert.equal((await state(paused)).running,false);assert.equal((await state(paused)).phase,'paused');tests.push('manual-stop-during-load-stays-stopped');await paused.p.close();
  const away=await fixture('never');await away.p.goto(host+'/mycourse/home');await stoppedAfterNavigation(away);assert.equal((await state(away)).phase,'stopped');assert.match((await state(away)).logs.at(-1).text,/已离开/);tests.push('leaving-course-still-stops');await assert.rejects(away.handle('COURSE_START'),/课程首页或考试页/);tests.push('course-home-cannot-start');await away.p.close();
  const other=await fixture('never');const newCourse=new URL(other.p.url());newCourse.searchParams.set('courseId','different');await other.p.goto(newCourse.href);await stoppedAfterNavigation(other);assert.equal((await state(other)).phase,'stopped');assert.match((await state(other)).logs.at(-1).text,/离开当前课程/);tests.push('different-course-during-load-still-stops');await other.p.close();
  const race=await fixture('never');
  await worker.evaluate(()=>{self.__realScript=chrome.scripting.executeScript;chrome.scripting.executeScript=async()=>{throw new Error('The frame was removed.');};});
  try{await race.handle('COURSE_TICK');assert.equal((await state(race)).phase,'loading-course');assert.equal((await state(race)).running,true);tests.push('removed-frame-navigation-error-retries');}finally{await worker.evaluate(()=>{chrome.scripting.executeScript=self.__realScript;});}
  await race.handle('COURSE_STOP');await race.p.close();
  fs.writeFileSync('work/sidebar-qa/navigation-results.json',JSON.stringify({tests,mockOnly:true,realCourseModified:false,realApiCalled:false},null,2));console.log('PASS',tests.length,'chapter navigation regressions',tests);
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{await context?.close();});
