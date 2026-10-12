// 实际 Edge 执行 MAIN/ISOLATED 脚本；自建页面与模拟接口，不访问真实课程或 Key。
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium,executablePath}=require('./browser-runtime.cjs');
const host='https://task-metadata-fixture.chaoxing.com',ext=path.resolve('outputs/DeepSeek-右侧栏版');
const tests=[],errors=[];let context,saveRequests=0;
const wav=Buffer.alloc(44+16000*2*2);wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(16000,24);wav.writeUInt32LE(32000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(wav.length-44,40);
const style='<meta charset="utf-8"><style>iframe{width:600px;height:290px}video{width:480px;height:240px}li{padding:15px}button{padding:12px}</style>';
const task=(jobId,passed=false,module='insertvideo')=>({job:true,jobid:jobId,isPassed:passed,secret:'not-returned-secret',property:{_jobid:jobId,mid:jobId==='b'?'shared':'shared',module,name:jobId,token:'not-returned-token',mediaUrl:'https://private.example/?token=not-returned-token'}});
const playerFrame=(jobId,mode)=>`<iframe data='${JSON.stringify({_jobid:jobId,objectid:'shared'})}' src="/unusual-player?job=${jobId}&mode=${mode}"></iframe>`;
(async()=>{
  context=await chromium.launchPersistentContext(path.resolve('work/sidebar-qa/task-metadata-profile-'+Date.now()),{executablePath,headless:true,args:[`--disable-extensions-except=${ext}`,`--load-extension=${ext}`]});
  context.on('page',page=>page.on('pageerror',error=>errors.push(error.message)));
  await context.route(host+'/**',async route=>{
    const url=new URL(route.request().url()),mode=url.searchParams.get('mode')||'multi';
    if(url.pathname==='/work/addStudentWorkNew'){saveRequests++;await new Promise(resolve=>setTimeout(resolve,250));return route.fulfill({body:JSON.stringify({status:true}),contentType:'application/json'});}
    if(url.pathname==='/media.wav')return route.fulfill({body:wav,contentType:'audio/wav'});
    let body=style;
    if(url.pathname.includes('studentstudy'))body+=`<ul id="prev_tab"><li id="current" class="active">${['work','save-race'].includes(mode)?'章节测验':'视频'}</li></ul><iframe id="iframe" src="/knowledge/cards?mode=${mode}"></iframe>`;
    else if(url.pathname==='/knowledge/cards'){
      const tasks=['work','save-race'].includes(mode)?[task('work',true,'work')]:mode==='conflict'?[task('a',true),task('a',false)]:[task('done',true),task('a'),task('b')];
      body+=`<script>window.attachments=${JSON.stringify(tasks)};window.attachments.push(null,{property:null});</script>`;
      if(['work','save-race'].includes(mode))body+=`<div class="ans-attach-ct ans-job-finished"><span class="ans-job-icon"></span><iframe data='{"_jobid":"work"}' src="/work/do?knowledgeid=1"></iframe></div>`;
      else if(mode==='conflict')body+=playerFrame('a',mode);
      else body+=playerFrame('done',mode)+playerFrame('a',mode)+(mode==='multi'?playerFrame('a',mode)+playerFrame('b',mode):'');
    }else if(url.pathname==='/unusual-player'){
      const job=url.searchParams.get('job');
      body+=`<video muted controls src="/media.wav" onplay="top.document.body.dataset.played=(top.document.body.dataset.played||'')+'${job},'" onended="const task=parent.attachments.find(task=>task?.jobid==='${job}');if(task)task.isPassed=true"></video>`;
    }else if(url.pathname==='/work/do')body+='<div class="testTit_status">待完成</div><div class="singleQuesId"><div class="newZy_TItle">单选题：模拟题</div><ul class="Zy_ulTop"><li onclick="this.parentNode.querySelectorAll(\'li\').forEach(n=>n.classList.remove(\'check_answer\'));this.classList.add(\'check_answer\')">A. 甲</li><li onclick="this.parentNode.querySelectorAll(\'li\').forEach(n=>n.classList.remove(\'check_answer\'));this.classList.add(\'check_answer\')">B. 乙</li></ul></div><a class="btnSave workBtnIndex" onclick="const xhr=new XMLHttpRequest();xhr.open(\'POST\',\'/work/addStudentWorkNew?tempsave=1&knowledgeid=1\');xhr.send(\'fixture\')">暂时保存</a>';
    await route.fulfill({body,contentType:'text/html; charset=utf-8'});
  });
  const worker=context.serviceWorkers()[0]||await context.waitForEvent('serviceworker');
  await worker.evaluate(async()=>{await chrome.storage.local.set({apiKey:'fixture-fake-only'});self.__calls=0;self.fetch=async()=>{self.__calls++;return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify({choices:['B'],uncertain:false,verified:true,reason:'模拟答案'})},finish_reason:'stop'}]}),{headers:{'content-type':'application/json'}});};});
  async function fixture(mode){const page=await context.newPage();await page.goto(host+'/mycourse/studentstudy?chapterId=1&courseId='+Date.now()+'&mode='+mode);const cards=page.frameLocator('#iframe');await cards.frameLocator('iframe').first().locator('body').waitFor();for(let i=0;i<await cards.locator('iframe').count();i++)await cards.frameLocator('iframe').nth(i).locator('body').waitFor();const id=await worker.evaluate(async url=>(await chrome.tabs.query({})).find(tab=>tab.url===url).id,page.url());return{page,id};}
  const handle=(f,type,settings)=>worker.evaluate(async({id,type,settings})=>CourseEngine.handle({type,settings},{tab:{id},frameId:0}),{id:f.id,type,settings});
  const state=f=>worker.evaluate(async id=>(await chrome.storage.session.get('course-run-'+id))['course-run-'+id],f.id);
  const scan=f=>worker.evaluate(async id=>(await chrome.scripting.executeScript({target:{tabId:id,allFrames:true},func:courseFrame,args:['scan']})).filter(result=>result.result).map(result=>({...result.result,frameId:result.frameId,documentId:result.documentId})),f.id);
  async function until(f,predicate){for(let i=0;i<180;i++){await handle(f,'COURSE_TICK');const s=await state(f);if(predicate(s))return s;await new Promise(resolve=>setTimeout(resolve,70));}throw Error('timeout '+JSON.stringify(await state(f)));}
  const multi=await fixture('multi');
  const frames=await scan(multi),cards=frames.find(frame=>frame.path==='/knowledge/cards');
  const main=await worker.evaluate(async({id,doc})=>(await chrome.scripting.executeScript({target:{tabId:id,documentIds:[doc]},world:'MAIN',func:readPlatformTasks}))[0].result,{id:multi.id,doc:cards.documentId});
  assert.equal(main.tasks.length,3);assert.ok(!JSON.stringify(main).includes('not-returned'));assert.deepEqual(Object.keys(main.tasks[0]).sort(),['contentId','jobId','module','name','passed','required']);tests.push('main-world-reads-only-minimal-platform-task-fields','malformed-attachment-items-ignored');
  const isolated=await worker.evaluate(async({id,doc})=>(await chrome.scripting.executeScript({target:{tabId:id,documentIds:[doc]},func:()=>globalThis.attachments===undefined}))[0].result,{id:multi.id,doc:cards.documentId});assert.equal(isolated,true);tests.push('metadata-read-does-not-depend-on-isolated-world-global');
  assert.deepEqual(frames.filter(frame=>frame.path==='/unusual-player').map(frame=>frame.videos[0].jobId).sort(),['a','a','b','done']);tests.push('nested-frame-data-provides-job-id-without-job-icon');
  await handle(multi,'COURSE_START',{answer:false,videoAnswer:false,next:false,rate:1});
  await until(multi,s=>s.phase==='video');
  const playing=await state(multi);assert.match(playing.currentMediaKey,/:job:a$/);assert.equal(Object.values(playing.taskInventory).length,3);tests.push('platform-job-key-used-for-current-media','duplicate-job-ids-deduplicated-in-inventory');
  const currentFrame=multi.page.frames().find(frame=>frame.url().includes('/unusual-player?job=a'));await currentFrame.goto(currentFrame.url());
  await handle(multi,'COURSE_TICK');assert.equal((await state(multi)).currentMediaKey,playing.currentMediaKey);tests.push('current-job-key-survives-player-document-reload');
  await until(multi,s=>!s.running);assert.equal((await state(multi)).phase,'paused');
  const played=(await multi.page.locator('body').getAttribute('data-played')).split(',').filter(Boolean);assert.deepEqual([...new Set(played)],['a','b']);assert.equal(played.filter(job=>job==='b').length,1);assert.ok(!played.includes('done'));tests.push('passed-task-without-dom-completion-icon-not-replayed','same-content-with-different-job-id-is-not-skipped','duplicate-job-does-not-replay-second-player');
  const tasks=Object.values((await state(multi)).taskInventory);assert.equal(tasks.find(task=>task.jobId==='a').status,'ended');assert.equal(tasks.find(task=>task.jobId==='b').status,'ended');tests.push('each-video-records-native-ended-separately');
  const delayed=await fixture('delayed');await handle(delayed,'COURSE_START',{answer:false,videoAnswer:false,next:false,rate:1});
  await until(delayed,s=>s.phase==='loading-video'&&s.videoText?.includes('尚未出现'));
  assert.equal((await state(delayed)).running,true);assert.equal(Object.values((await state(delayed)).taskInventory).find(task=>task.jobId==='b').status,'pending');tests.push('metadata-only-media-task-prevents-premature-advance');
  await delayed.page.frameLocator('#iframe').locator('body').evaluate((body,html)=>body.insertAdjacentHTML('beforeend',html),playerFrame('b','delayed'));
  await until(delayed,s=>!s.running);assert.equal(await delayed.page.locator('body').getAttribute('data-played'),'a,b,',JSON.stringify(await state(delayed)));tests.push('late-rendered-unusual-player-detected-and-played');
  const missing=await fixture('missing');await handle(missing,'COURSE_START',{answer:false,videoAnswer:false,next:false,rate:1});await until(missing,s=>s.phase==='loading-video'&&s.videoText?.includes('尚未出现'));
  await worker.evaluate(async id=>{const key='course-run-'+id,s=(await chrome.storage.session.get(key))[key];s.mediaLoad.since=Date.now()-61000;await chrome.storage.session.set({[key]:s});},missing.id);await handle(missing,'COURSE_TICK');assert.ok(Object.values((await state(missing)).pending).some(item=>item.task));await handle(missing,'COURSE_TICK');assert.equal((await state(missing)).phase,'paused');assert.ok(Object.values((await state(missing)).taskInventory).some(item=>item.status==='pending'));tests.push('missing-platform-media-times-out-without-marking-complete');
  const work=await fixture('work');const calls=await worker.evaluate(()=>self.__calls);await handle(work,'COURSE_START',{video:false,answer:true,workAction:'review',next:false});await until(work,s=>!s.running);
  assert.equal(await work.page.frameLocator('#iframe').frameLocator('iframe').locator('.check_answer').innerText(),'B. 乙');assert.equal(await worker.evaluate(()=>self.__calls)-calls,4);assert.equal(Object.values((await state(work)).taskInventory).find(task=>task.jobId==='work').status,'pending');tests.push('passed-attachment-and-catalog-check-do-not-skip-unsubmitted-quiz');
  const conflict=await fixture('conflict');await handle(conflict,'COURSE_START',{answer:false,videoAnswer:false,next:false,rate:1});await until(conflict,s=>!s.running);assert.equal(await conflict.page.locator('body').getAttribute('data-played'),'a,');tests.push('conflicting-metadata-does-not-guess-completion');
  const race=await fixture('conflict');
  await worker.evaluate(()=>{self.__originalExecute=chrome.scripting.executeScript.bind(chrome.scripting);self.__failedPlay=false;chrome.scripting.executeScript=async opts=>{if(opts.args?.[0]==='play'&&!self.__failedPlay){self.__failedPlay=true;throw Error('No document with id fixture-old-document in tab');}return self.__originalExecute(opts);};});
  await handle(race,'COURSE_START',{answer:false,videoAnswer:false,next:false,rate:1});await handle(race,'COURSE_TICK');assert.equal((await state(race)).running,true);assert.equal((await state(race)).phase,'scanning');await until(race,s=>!s.running);assert.equal(await race.page.locator('body').getAttribute('data-played'),'a,');tests.push('removed-player-document-rescanned-without-stopping');
  await worker.evaluate(()=>{chrome.scripting.executeScript=self.__originalExecute;});
  const saveRace=await fixture('save-race');const savesBefore=saveRequests;
  await worker.evaluate(()=>{self.__originalExecute=chrome.scripting.executeScript.bind(chrome.scripting);self.__failedSave=false;chrome.scripting.executeScript=async opts=>{const result=await self.__originalExecute(opts);if(opts.args?.[0]==='saveWork'&&!self.__failedSave){self.__failedSave=true;throw Error('The document was unloaded.');}return result;};});
  await handle(saveRace,'COURSE_START',{video:false,answer:true,workAction:'save-stay',next:false});await until(saveRace,s=>s.waiting?.save);assert.equal((await state(saveRace)).running,true);await until(saveRace,s=>!s.running);assert.equal((await state(saveRace)).phase,'saved');assert.equal(saveRequests-savesBefore,1);assert.equal(Object.values((await state(saveRace)).taskInventory).find(task=>task.jobId==='work').status,'saved');tests.push('document-loss-after-save-keeps-receipt-wait-without-resending','save-outcome-recorded-only-after-native-success');
  await worker.evaluate(()=>{chrome.scripting.executeScript=self.__originalExecute;});
  const extensionId=new URL(worker.url()).hostname,panel=await context.newPage();await panel.setViewportSize({width:320,height:950});await panel.goto('chrome-extension://'+extensionId+'/sidepanel.html?tabId='+multi.id);const ui=panel.locator('[data-local-study-host]');await panel.getByRole('button',{name:'课程助手',exact:true}).click();await ui.locator('#course-inventory-summary').filter({hasText:'3'}).waitFor();assert.equal(await ui.locator('#course-inventory').getAttribute('open'),null);assert.equal(await ui.locator('#course-task').count(),1);await ui.locator('#course-inventory-summary').click();assert.ok((await ui.locator('#course-inventory-list').innerText()).includes('播放结束'));await panel.screenshot({path:'work/sidebar-qa/task-inventory-320.png'});tests.push('inventory-collapsed-by-default-and-simple-controls-preserved','inventory-lists-separate-native-video-outcomes');
  assert.deepEqual(errors,[]);tests.push('isolated-pages-have-no-browser-script-errors');
  fs.writeFileSync('work/sidebar-qa/task-metadata-results.json',JSON.stringify({version:JSON.parse(fs.readFileSync('package.json','utf8')).version,tests,mockOnly:true,realApiCalled:false,realCourseModified:false},null,2));console.log('PASS',tests.length,'task metadata browser checks',tests);
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{await context?.close();});
