// 隔离 Edge + 自建课程 + 虚构模型回复。覆盖目录回扫、真实浏览器重启、逐题审计；不访问真实课程。
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium,executablePath}=require('./browser-runtime.cjs');
const host='https://course-history-fixture.chaoxing.com',ext=path.resolve('outputs/DeepSeek-右侧栏版');
const profile=path.resolve('work/sidebar-qa/history-profile-'+Date.now()),tests=[],requests=[],errors=[];
const drafts=new Map(),submitted=new Set();let context,worker;
const wav=Buffer.alloc(44+16000*2);wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(16000,24);wav.writeUInt32LE(32000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(wav.length-44,40);
const style='<meta charset="utf-8"><style>iframe{width:600px;height:320px}video{width:500px;height:250px}li,button,a{padding:15px}details{padding:8px}</style>';
function question(stem,options,selected){return `<div class="singleQuesId"><div class="newZy_TItle">${stem}</div><ul class="Zy_ulTop">${options.map((text,i)=>`<li class="${selected===String.fromCharCode(65+i)?'check_answer':''}" data-letter="${String.fromCharCode(65+i)}" onclick="this.parentNode.querySelectorAll('li').forEach(n=>n.classList.remove('check_answer'));this.classList.add('check_answer')">${String.fromCharCode(65+i)}. ${text}</li>`).join('')}</ul></div>`;}
async function launch(){
  context=await chromium.launchPersistentContext(profile,{executablePath,headless:true,args:[`--disable-extensions-except=${ext}`,`--load-extension=${ext}`]});
  context.on('page',page=>page.on('pageerror',error=>errors.push(error.message)));
  await context.route(host+'/**',async route=>{
    const u=new URL(route.request().url()),course=u.searchParams.get('courseId'),chapter=u.searchParams.get('chapterId')||'1',mode=u.searchParams.get('mode')||'chain',key=course+':'+chapter;
    if(u.pathname==='/media.wav')return route.fulfill({body:wav,contentType:'audio/wav'});
    if(u.pathname==='/ended'){requests.push({course,chapter,kind:'ended'});return route.fulfill({body:'ok'});}
    if(u.pathname.includes('addStudentWork')){const data=JSON.parse(route.request().postData()||'{}');drafts.set(key,data.answers);requests.push({course,chapter,kind:data.save?'save':'submit',answers:data.answers});if(!data.save)submitted.add(key);return route.fulfill({body:'{"status":true}',contentType:'application/json'});}
    let body=style;const query=new URLSearchParams({courseId:course||'',chapterId:chapter,mode}).toString();
    if(u.pathname.includes('studentstudy')){
      body+=`<ul id="prev_tab"><li id="dct1" class="active" onclick="tab(0)">视频</li><li id="dct2" onclick="tab(1)">章节测验</li></ul><iframe id="iframe" src="/knowledge/cards?${query}&task=video"></iframe>`;
      // 完成图标故意始终为 √；第 1 节测验仍未提交。
      body+=`<aside><span onclick="getTeacherAjax('999','fixture','1')">别的课程</span>${[1,2,3].map(id=>`<div class="posCatalog_select ${String(id)===chapter?'posCatalog_active':''} ${mode==='locked'&&id===3?'locked':''}"><span class="posCatalog_name" onclick="getTeacherAjax('${course}','fixture','${id}')">${id}. 模拟章节</span><span class="icon_Completed">√</span><input class="jobUnfinishCount" value="0"></div>`).join('')}</aside>`;
      body+=`<script>function tab(index){document.querySelectorAll('#prev_tab li').forEach((li,i)=>li.classList.toggle('active',index===i));document.getElementById('iframe').src='/knowledge/cards?${query}&task='+(index?'work':'video')}function getTeacherAjax(course,clazz,id){if(course!=='${course}')throw Error('进入了错误课程');const u=new URL(location.href);u.searchParams.set('chapterId',id);location.href=u.href}</script>`;
    }else if(u.pathname==='/knowledge/cards'){
      const task=u.searchParams.get('task');body+=`<iframe src="${task==='work'?'/work/do':'/modules/video/index.html'}?${query}"></iframe>`;
    }else if(u.pathname.includes('/modules/video'))body+=`<video controls muted src="/media.wav" onended="fetch('/ended?${query}')"></video>`;
    else if(u.pathname==='/work/do'){
      const saved=drafts.get(key)||[];
      body+=`<div class="testTit_status ${submitted.has(key)?'testTit_status_complete':''}">${submitted.has(key)?'已完成':'未完成'}</div>`;
      body+=question('【判断题】2022年旧金山会晤。',['错','对'],saved[0])+question('【单选题】模拟类型选择。',['Integer','BigDecimal'],saved[1]);
      body+=`<a class="btnSave workBtnIndex" onclick="send(true)">暂时保存</a><a class="btnSubmit workBtnIndex" onclick="send(false)">提交</a><div id="saveStatus"></div><script>function send(save){const xhr=new XMLHttpRequest();xhr.open('POST','/work/addStudentWorkNewWeb?${query}&knowledgeid=${chapter}&tempsave='+(save?1:0));xhr.onload=()=>{if(save)document.getElementById('saveStatus').textContent='保存成功';else document.querySelector('.testTit_status').classList.add('testTit_status_complete')};xhr.send(JSON.stringify({save,answers:[...document.querySelectorAll('.singleQuesId')].map(q=>q.querySelector('.check_answer')?.dataset.letter||null)}))}</script>`;
    }
    await route.fulfill({body,contentType:'text/html; charset=utf-8'});
  });
  worker=context.serviceWorkers()[0]||await context.waitForEvent('serviceworker');
  await worker.evaluate(async()=>{
    await chrome.storage.local.set({apiKey:'fixture-fake-key-only'});self.__calls=0;
    self.fetch=async(_url,init)=>{self.__calls++;const text=JSON.parse(init.body).messages.at(-1).content;
      return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify(text.includes('题型：judge')?{uncertain:false,verdict:false,reason:'模拟依据：时间与地点不一致'}:{uncertain:false,choices:['B'],reason:'模拟依据：精确类型'})},finish_reason:'stop'}]}),{headers:{'content-type':'application/json'}});};
  });
}
async function fixture(course,chapter=2,mode='chain',cpi='student-a'){
  const page=await context.newPage();await page.goto(host+`/mycourse/studentstudy?courseId=${course}&clazzid=fixture&chapterId=${chapter}&mode=${mode}&cpi=${cpi}&enc=fixture-signature`);
  await page.frameLocator('#iframe').frameLocator('iframe').locator('video').waitFor();
  const id=await worker.evaluate(async url=>(await chrome.tabs.query({})).find(tab=>tab.url===url).id,page.url());return{page,id};
}
const handle=(f,type,settings)=>worker.evaluate(async({id,type,settings})=>CourseEngine.handle({type,settings},{tab:{id},frameId:0}),{id:f.id,type,settings});
const state=f=>worker.evaluate(async id=>(await chrome.storage.session.get('course-run-'+id))['course-run-'+id],f.id);
async function until(f,predicate){for(let i=0;i<240;i++){await handle(f,'COURSE_TICK');const s=await state(f);if(predicate(s))return s;await new Promise(r=>setTimeout(r,80));}throw Error('timeout '+JSON.stringify(await state(f)));}
(async()=>{
  await launch();
  const chain=await fixture('101');
  await handle(chain,'COURSE_START',{video:false,answer:true,workAction:'submit',next:true});
  const done=await until(chain,s=>!s.running);
  assert.equal(done.phase,'finished');assert.deepEqual(requests.filter(r=>r.course==='101'&&r.kind==='submit').map(r=>r.chapter),['2','3','1']);
  tests.push('middle-chapter-start-wraps-once-to-earlier-chapters','catalog-check-does-not-skip-earlier-unsubmitted-quiz','whole-course-directory-finishes-without-repeat-loop','foreign-course-directory-link-never-used');
  assert.deepEqual(done.route.visited,['2','3','1']);assert.equal(Object.values(done.questionRecords).length,6);
  for(const record of Object.values(done.questionRecords)){assert.equal(record.status,'filled');assert.equal(record.outcome,'submitted');assert.equal(record.attempts[0].votes.length,4);assert.ok(record.answer.reason);}
  const judge=Object.values(done.questionRecords).find(r=>r.type==='judge');assert.deepEqual(judge.answer.choices,['A']);assert.deepEqual(judge.actualChoices,['A']);assert.equal(judge.options[0].text,'A. 错');
  tests.push('each-question-keeps-source-options-and-adopted-answer','all-four-independent-votes-retained','native-confirmed-submit-attached-to-question-record','judge-verdict-maps-to-reversed-option-order');
  const shuffled=await worker.evaluate(()=>{const s={pageKey:'1:dct2'},q={text:'模拟判断',type:'judge',isVideo:false,options:[{letter:'A',text:'A. 错',selected:false},{letter:'B',text:'B. 对',selected:false}]};let r=recordQuestion(s,'same-question',q);recordDecision(r,{answer:{uncertain:false,verdict:false,choices:['A']},votes:[{model:'fixture',choices:['A']}]});q.options=[{letter:'A',text:'A. 对',selected:false},{letter:'B',text:'B. 错',selected:false}];r=recordQuestion(s,'same-question',q);recordDecision(r,{answer:{uncertain:false,verdict:false,choices:['B']},votes:[{model:'fixture',choices:['B']}]});return r;});assert.equal(shuffled.options[0].text,'A. 对');assert.equal(shuffled.attempts[0].options[0].text,'A. 错');assert.equal(shuffled.attempts[1].answer.choices[0],'B');tests.push('each-attempt-keeps-own-option-order-after-shuffle');
  const locked=await fixture('102',2,'locked');await handle(locked,'COURSE_START',{video:false,answer:true,workAction:'submit',next:true});await until(locked,s=>!s.running);
  assert.deepEqual(requests.filter(r=>r.course==='102'&&r.kind==='submit').map(r=>r.chapter),['2','1']);tests.push('locked-directory-chapter-not-entered');
  const stay=await fixture('103');await handle(stay,'COURSE_START',{video:false,answer:true,workAction:'save-stay',next:false});const saved=await until(stay,s=>s.phase==='saved');
  assert.equal(new URL(stay.page.url()).searchParams.get('chapterId'),'2');assert.equal(requests.filter(r=>r.course==='103'&&r.kind==='submit').length,0);assert.ok(Object.values(saved.questionRecords).every(r=>r.outcome==='saved'));tests.push('save-and-stay-never-starts-directory-sweep');
  const resume=await fixture('104');await handle(resume,'COURSE_START',{video:false,answer:true,workAction:'review',next:true});const paused=await until(resume,s=>s.phase==='review');
  assert.equal(paused.currentActive,1);assert.equal(Object.values(paused.questionRecords).length,2);
  const checkpoint=await worker.evaluate(async key=>(await chrome.storage.local.get(key))[key],paused.checkpointKey);
  assert.ok(!JSON.stringify(checkpoint).includes('fixture-signature'));assert.ok(!JSON.stringify(checkpoint).includes('fixture-fake-key'));assert.ok(!('waiting' in checkpoint));assert.ok(!('runId' in checkpoint));tests.push('checkpoint-excludes-signed-urls-keys-and-old-document-targets');
  await context.close();context=null;await launch();
  const restored=await fixture('104',1);const recover=(await handle(restored,'COURSE_STATE')).state;
  assert.equal(recover.running,false);assert.equal(recover.restored,true);assert.equal(recover.resumeTarget.chapterId,'2');assert.equal(recover.resumeTarget.active,1);assert.equal(Object.values(recover.questionRecords).length,2);assert.equal(await worker.evaluate(()=>self.__calls),0);tests.push('actual-browser-restart-restores-audit-and-task-position','restart-does-not-run-or-call-ai-without-user-start');
  const restoredPanel=await context.newPage();await restoredPanel.goto('chrome-extension://'+new URL(worker.url()).hostname+'/sidepanel.html?tabId='+restored.id);await restoredPanel.getByRole('button',{name:'课程助手',exact:true}).click();const restoredUi=restoredPanel.locator('[data-local-study-host]');await restoredUi.locator('#course-start').filter({hasText:'继续上次进度'}).waitFor();assert.equal(await restoredUi.locator('#course-task').inputValue(),'quiz');assert.equal(await restoredUi.locator('#course-work-action').inputValue(),'review');assert.equal(await restoredUi.locator('#course-next').inputValue(),'continue');tests.push('restored-ui-retains-review-and-learning-mode-before-start');await restoredPanel.close();
  const foreign=await fixture('105');assert.equal((await handle(foreign,'COURSE_STATE')).state.phase,'idle');
  const otherStudent=await fixture('104',1,'chain','student-b');assert.equal((await handle(otherStudent,'COURSE_STATE')).state.phase,'idle');tests.push('checkpoint-isolated-between-courses','checkpoint-isolated-between-students');
  await handle(restored,'COURSE_START',{video:false,answer:true,workAction:'review',next:true});await until(restored,s=>s.phase==='review');assert.equal(new URL(restored.page.url()).searchParams.get('chapterId'),'2');assert.equal((await state(restored)).currentActive,1);tests.push('resume-reopens-saved-chapter-and-task-with-fresh-documents');
  const retryCursor=await worker.evaluate(async()=>{const s={scope:'fixture',checkpointKey:'fixture-retry-cursor',pageKey:'',retryTarget:{pageKey:'7:dct2',active:1,url:'https://private.invalid/?enc=signature'},phase:'loading-course',answered:0,logs:[]};await persistCourse(s);return (await chrome.storage.local.get(s.checkpointKey))[s.checkpointKey];});assert.equal(retryCursor.pageKey,'7:dct2');assert.equal(retryCursor.active,1);assert.ok(!JSON.stringify(retryCursor).includes('signature'));tests.push('checkpoint-keeps-revisit-target-during-navigation');
  const stalled=await fixture('107');await handle(stalled,'COURSE_START',{video:false,answer:true,workAction:'review',next:true});await worker.evaluate(async id=>{const key='course-run-'+id,s=(await chrome.storage.session.get(key))[key];s.resumeTarget={chapterId:'3',active:1,since:Date.now()-61000};await chrome.storage.session.set({[key]:s});},stalled.id);await handle(stalled,'COURSE_TICK');assert.equal((await state(stalled)).phase,'review');assert.match((await state(stalled)).logs.at(-1).text,/仍未恢复/);tests.push('failed-resume-navigation-has-bounded-timeout');
  const uncertain=await fixture('106');await handle(uncertain,'COURSE_START',{video:false,answer:true,workAction:'review',next:true});const u=await until(uncertain,s=>s.phase==='review');
  await worker.evaluate(async({id,key})=>{const checkpoint=(await chrome.storage.local.get(key))[key];checkpoint.phase='waiting-submit';checkpoint.uncertainAction={kind:'submit',pageKey:checkpoint.pageKey};await chrome.storage.local.set({[key]:checkpoint});await chrome.storage.session.remove('course-run-'+id);},{id:uncertain.id,key:u.checkpointKey});
  await handle(uncertain,'COURSE_STATE');await handle(uncertain,'COURSE_START',{video:false,answer:true,workAction:'submit',next:true});const ambiguous=await until(uncertain,s=>s.phase==='review');assert.match(ambiguous.logs.at(-1).text,/没有重复发送/);assert.equal(requests.filter(r=>r.course==='106').length,0);tests.push('unknown-pre-restart-submit-never-resent');
  await uncertain.page.frameLocator('#iframe').frameLocator('iframe').locator('.btnSubmit').click();await until(uncertain,s=>!s.running);
  assert.equal(requests.filter(r=>r.course==='106'&&r.chapter==='2'&&r.kind==='submit').length,1);tests.push('manual-confirmed-outcome-recovers-ambiguous-submission');
  const sameSession=await fixture('108');await handle(sameSession,'COURSE_START',{video:false,answer:true,workAction:'review',next:true});await until(sameSession,s=>s.phase==='review');await worker.evaluate(async id=>{const key='course-run-'+id,s=(await chrome.storage.session.get(key))[key];s.waiting={video:false,frameId:999,since:Date.now()};await chrome.storage.session.set({[key]:s});},sameSession.id);await handle(sameSession,'COURSE_START',{video:false,answer:true,workAction:'submit',next:true});await until(sameSession,s=>s.phase==='review');assert.match((await state(sameSession)).logs.at(-1).text,/没有重复发送/);assert.equal(requests.filter(r=>r.course==='108').length,0);tests.push('same-session-restart-cannot-resend-unknown-submit');
  const extensionId=new URL(worker.url()).hostname,panel=await context.newPage();await panel.setViewportSize({width:320,height:950});await panel.goto('chrome-extension://'+extensionId+'/sidepanel.html?tabId='+restored.id);const ui=panel.locator('[data-local-study-host]');await panel.getByRole('button',{name:'课程助手',exact:true}).click();await ui.locator('#course-answers-summary').filter({hasText:'2'}).waitFor();assert.equal(await ui.locator('#course-answers').getAttribute('open'),null);await ui.locator('#course-answers-summary').click();await ui.locator('#course-answers-list details').first().locator('summary').click();const text=await ui.locator('#course-answers-list').innerText();assert.ok(text.includes('本轮判断'));assert.ok(text.includes('deepseek'));await new Promise(r=>setTimeout(r,2800));assert.equal(await ui.locator('#course-answers-list details[open]').count(),1);
  const downloadPromise=panel.waitForEvent('download');await ui.locator('#course-export').click();const download=await downloadPromise;const exportPath=path.resolve('work/sidebar-qa/history-export.json');await download.saveAs(exportPath);const exported=JSON.parse(fs.readFileSync(exportPath,'utf8'));assert.equal(exported.records.length,2);assert.ok(!JSON.stringify(exported).includes('fixture-fake-key'));assert.ok(!JSON.stringify(exported).includes('fixture-signature'));tests.push('audit-folded-by-default-without-extra-primary-controls','expanded-question-stays-open-across-ui-polls','downloadable-audit-excludes-keys-and-signed-urls');
  await panel.screenshot({path:'work/sidebar-qa/history-320.png'});
  // 人工存储故障不能悄悄假装已持久保存。
  const warning=await worker.evaluate(async()=>{const old=chrome.storage.local.set;chrome.storage.local.set=async()=>{throw Error('quota');};const s={scope:'fixture',checkpointKey:'fixture-failure',pageKey:'1:',phase:'paused',answered:0,logs:[]};try{await persistCourse(s);return s.historyWarning;}finally{chrome.storage.local.set=old;}});assert.match(warning,/保存失败/);tests.push('local-storage-failure-explicitly-reported');
  const writes=await worker.evaluate(async()=>{const old=chrome.storage.local.set.bind(chrome.storage.local);let count=0;chrome.storage.local.set=async data=>{count++;return old(data);};const s={scope:'fixture',checkpointKey:'fixture-idempotent',pageKey:'1:',phase:'video',answered:0,logs:[]};try{await persistCourse(s);await persistCourse(s);return count;}finally{chrome.storage.local.set=old;}});assert.equal(writes,1);tests.push('unchanged-video-polls-do-not-rewrite-persistent-history');
  assert.deepEqual(errors,[]);tests.push('isolated-course-and-sidebar-have-no-script-errors');
  fs.writeFileSync('work/sidebar-qa/course-history-results.json',JSON.stringify({version:JSON.parse(fs.readFileSync('package.json','utf8')).version,tests,mockOnly:true,realApiCalled:false,realCourseModified:false},null,2));console.log('PASS',tests.length,'directory / restart / audit checks',tests);
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{await context?.close();});
