// 原生页面行为回归；独立 Edge、模拟课程与 AI，不操作用户课程。
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium,executablePath}=require('./browser-runtime.cjs');
const host='https://ocs-adapters-fixture.chaoxing.com',ext=path.resolve('outputs/DeepSeek-右侧栏版');
const tests=[],errors=[];let context,saveRequests=0,submitRequests=0;
const style='<meta charset="utf-8"><style>iframe{width:600px;height:320px}li,span.saveSingleSelect{padding:15px;display:block}button{padding:12px}.swiper-slide{display:none}.swiper-slide-active{display:block}</style>';
const choices=()=>'<ul class="Zy_ulTop"><li onclick="this.parentNode.querySelectorAll(\'li\').forEach(n=>n.classList.remove(\'check_answer\'));this.classList.add(\'check_answer\')">A. 甲</li><li onclick="this.parentNode.querySelectorAll(\'li\').forEach(n=>n.classList.remove(\'check_answer\'));this.classList.add(\'check_answer\')">B. 多选题这个词只是选项内容</li></ul>';
const buttons='<a class="btnSave workBtnIndex" onclick="const xhr=new XMLHttpRequest();xhr.open(\'POST\',\'/work/addStudentWorkNew?tempsave=1&knowledgeid=1\');xhr.send(\'fixture\')">暂时保存</a><a class="btnSubmit workBtnIndex" onclick="const xhr=new XMLHttpRequest();xhr.open(\'POST\',\'/work/addStudentWorkNew?knowledgeid=1\');xhr.send(\'fixture\')">提交</a>';
const wav=Buffer.alloc(44+16000*2);wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(16000,24);wav.writeUInt32LE(32000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(wav.length-44,40);
(async()=>{
  context=await chromium.launchPersistentContext(path.resolve('work/sidebar-qa/ocs-adapters-profile-'+Date.now()),{executablePath,headless:true,args:[`--disable-extensions-except=${ext}`,`--load-extension=${ext}`]});
  context.on('page',page=>page.on('pageerror',error=>errors.push(error.message)));
  await context.route(host+'/**',async route=>{
    const url=new URL(route.request().url()),mode=url.searchParams.get('mode');
    if(url.pathname==='/media.wav')return route.fulfill({body:wav,contentType:'audio/wav'});
    if(url.pathname==='/work/addStudentWorkNew'){if(url.searchParams.has('tempsave'))saveRequests++;else submitRequests++;return route.fulfill({body:'{"status":true}',contentType:'application/json'});}
    let body=style;
    if(url.pathname.includes('studentstudy'))body+=`<ul id="prev_tab"><li id="task" class="active">${mode?.startsWith('doc')?'课件':'章节测验'}</li></ul><iframe id="iframe" src="/knowledge/cards?mode=${mode}"></iframe>`;
    else if(url.pathname==='/knowledge/cards'){
      if(mode?.startsWith('doc'))body+=`<script>window.attachments=[{job:true,jobid:'ppt',property:{_jobid:'ppt',module:'insertdoc',title:'课件名称'},isPassed:false}];</script><div class="ans-attach-ct"><iframe data='{"_jobid":"ppt"}' src="/doc?mode=${mode}"></iframe></div>`;
      else body+=`<iframe src="/work/do?knowledgeid=1&mode=${mode}"></iframe>`;
    }else if(url.pathname==='/doc'){
      if(mode==='doc-missing')body+='附件尚未显示';
      else if(mode==='doc-book')body+='<img id="img" class="imglook" alt="模拟书页" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7">';
      else {
        body+='<div class="swiper-container">'+[0,1,2].map(i=>`<div class="swiper-slide${i===0?' swiper-slide-active':''}">第${i+1}页${mode==='doc-audio'?`<audio style="display:none" src="/media.wav" onplay="top.document.body.dataset.audio=(top.document.body.dataset.audio||'')+'${i},'" onended="if(${i}===2)parent.attachments[0].isPassed=true"></audio>`:''}</div>`).join('')+`<button class="swiper-button-next" onclick="const active=document.querySelector('.swiper-slide-active');if('${mode}'==='doc-stuck')return;active.classList.remove('swiper-slide-active');active.nextElementSibling.classList.add('swiper-slide-active');top.document.body.dataset.flips=(Number(top.document.body.dataset.flips)||0)+1;if(document.querySelectorAll('.swiper-slide')[2].classList.contains('swiper-slide-active')){this.classList.add('swiper-button-disabled');if('${mode}'==='doc-dom-receipt')frameElement.closest('.ans-attach-ct').classList.add('ans-job-finished');else if('${mode}'!=='doc-no-receipt'&&'${mode}'!=='doc-audio')parent.attachments[0].isPassed=true}">下一页</button></div>`;
      }
    }else if(url.pathname==='/editor')body+='<body contenteditable="true"><p><br></p></body>';
    else if(url.pathname==='/work/do'){
      if(['old','unparsed-group'].includes(mode))body+='<div class="TiMu"><input id="answertype1" type="hidden" value="'+(mode==='old'?0:15)+'"><div class="Zy_TItle"><div class="clearfix">只允许一个选项的模拟题</div></div>'+choices()+'</div>';
      if(['reading','cloze'].includes(mode))body+='<div class="questionLi"><input id="answertype2" type="hidden" value="'+(mode==='reading'?15:14)+'"><div class="mark_name">共同材料：甲在2023年参加活动。请依据材料回答。</div>'+[1,2].map(i=>'<div class="'+(mode==='reading'?'reading_answer':'filling_answer')+'"><div class="question-stem">子问题 '+i+'</div>'+['A','B'].map(letter=>`<span class="saveSingleSelect" data="${letter}" aria-checked="false" onclick="this.parentNode.querySelectorAll('span.saveSingleSelect').forEach(n=>n.setAttribute('aria-checked','false'));this.setAttribute('aria-checked','true')">${letter}. ${letter==='A'?'2023年':'2022年'}</span>`).join('')+'</div>').join('')+'</div>';
      if(mode==='rich')body+='<div class="TiMu"><input id="answertype3" type="hidden" value="2"><div class="Zy_TItle">简答题：说明观点</div><div class="editor"><textarea name="answer" hidden></textarea><iframe class="edui-editor-iframe" src="/editor" onload="window.UE={instants:{one:{body:this.contentDocument.body,setContent(text){this.body.innerHTML=text;window.setContentCalls=(window.setContentCalls||0)+1},sync(){window.syncCalls=(window.syncCalls||0)+1}}}}"></iframe></div></div>';
      if(['blank','partial'].includes(mode))body+='<div class="TiMu"><input id="answertype4" type="hidden" value="4"><div class="Zy_TItle">填空题：请填两个空</div><div class="blankItemDiv"><textarea>'+(mode==='partial'?'用户原答案':'')+'</textarea></div><div class="blankItemDiv"><textarea></textarea></div></div>';
      if(mode==='blocked')body+='<div class="TiMu"><div class="Zy_TItle">图片题<img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"></div>'+choices()+'</div><div class="TiMu"><input id="answertype5" type="hidden" value="0"><div class="Zy_TItle">可以处理的下一题</div>'+choices()+'</div>';
      body+=buttons;
    }
    await route.fulfill({body,contentType:'text/html; charset=utf-8'});
  });
  const worker=context.serviceWorkers()[0]||await context.waitForEvent('serviceworker');
  await worker.evaluate(async()=>{
    await chrome.storage.local.set({apiKey:'fixture-only-not-real'});self.__calls=[];
    self.fetch=async(_url,init)=>{const prompt=JSON.parse(init.body).messages.at(-1).content;self.__calls.push(prompt);
      const answer={uncertain:false,verified:true,reason:'模拟依据',...(prompt.includes('题型：blank')?{blanks:['第一空','第二空']}:prompt.includes('题型：text')?{text:'观点 <不是 HTML>\n第二行'}:{choices:[prompt.includes('共同材料')?'A':'B']})};
      return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify(answer)},finish_reason:'stop'}]}),{headers:{'content-type':'application/json'}});};
  });
  async function fixture(mode){const page=await context.newPage();await page.goto(host+'/mycourse/studentstudy?courseId='+Date.now()+'&chapterId=1&mode='+mode);await page.frameLocator('#iframe').frameLocator('iframe').locator('body').waitFor();if(mode==='rich')await page.frameLocator('#iframe').frameLocator('iframe').frameLocator('iframe').locator('body').waitFor();const id=await worker.evaluate(async url=>(await chrome.tabs.query({})).find(tab=>tab.url===url).id,page.url());return{page,id};}
  const handle=(f,type,settings)=>worker.evaluate(async({id,type,settings})=>CourseEngine.handle({type,settings},{tab:{id},frameId:0}),{id:f.id,type,settings});
  const state=f=>worker.evaluate(async id=>(await chrome.storage.session.get('course-run-'+id))['course-run-'+id],f.id);
  const scan=f=>worker.evaluate(async id=>(await chrome.scripting.executeScript({target:{tabId:id,allFrames:true},func:courseFrame,args:['scan']})).filter(result=>result.result).map(result=>({...result.result,frameId:result.frameId,documentId:result.documentId})),f.id);
  async function until(f,predicate){for(let i=0;i<180;i++){await handle(f,'COURSE_TICK');const s=await state(f);if(predicate(s))return s;await new Promise(resolve=>setTimeout(resolve,80));}throw Error('timeout '+JSON.stringify(await state(f)));}
  const qframe=f=>f.page.frameLocator('#iframe').frameLocator('iframe');
  const old=await fixture('old'),before=await worker.evaluate(()=>self.__calls.length);
  assert.equal((await scan(old)).find(frame=>frame.questions.length).questions[0].type,'single');
  await handle(old,'COURSE_START',{video:false,answer:true,workAction:'review',next:false});await until(old,s=>!s.running);
  assert.equal(await qframe(old).locator('.check_answer').count(),1);assert.match(await qframe(old).locator('.check_answer').innerText(),/^B/);assert.equal(await worker.evaluate(()=>self.__calls.length)-before,4);
  tests.push('old-TiMu-question-detected','declared-type-prevents-option-word-misclassification','old-question-filled-through-four-votes');
  for(const mode of ['reading','cloze']){
    const f=await fixture(mode),frames=await scan(f),questions=frames.find(frame=>frame.questions.length).questions;
    assert.equal(questions.length,2);assert.equal(new Set(questions.map(q=>q.id)).size,2);assert.ok(questions.every(q=>q.text.includes('共同材料')&&q.options.length===2));
    await handle(f,'COURSE_START',{video:false,answer:true,workAction:'review',next:false});await until(f,s=>!s.running);
    assert.equal(await qframe(f).locator('span[data=A][aria-checked=true]').count(),2);assert.equal(Object.keys((await state(f)).questionRecords).length,2);
    tests.push(mode+'-split-with-shared-passage',mode+'-independent-choices-and-audit');
  }
  const rich=await fixture('rich');await until(rich,()=>true);await handle(rich,'COURSE_START',{video:false,answer:true,workAction:'save-stay',next:false});await until(rich,s=>!s.running);
  assert.equal((await state(rich)).phase,'saved');const editor=qframe(rich).frameLocator('iframe');assert.equal(await editor.locator('body').innerText(),'观点 <不是 HTML>\n第二行');assert.equal(await qframe(rich).locator('.TiMu textarea').inputValue(),'观点 <不是 HTML>\n第二行');assert.equal(await editor.locator('body script').count(),0);
  const native=await rich.page.frames().find(frame=>frame.url().includes('/work/do')).evaluate(()=>[window.setContentCalls,window.syncCalls]);assert.deepEqual(native,[1,1]);
  tests.push('UEditor-native-setContent-and-sync-used','rich-answer-synchronized-to-submitted-textarea','model-text-escaped-before-rich-editor','rich-answer-recognized-on-rescan-and-saved');
  const blank=await fixture('blank'),blankFrame=(await scan(blank)).find(frame=>frame.questions.length);
  const mismatch=await worker.evaluate(async({id,frame})=>(await chrome.scripting.executeScript({target:{tabId:id,documentIds:[frame.documentId]},world:'MAIN',func:courseFrame,args:['fill',{questionId:frame.questions[0].id,signature:frame.questions[0].signature,answer:{blanks:['缺少一个空']}}]}))[0].result,{id:blank.id,frame:blankFrame});assert.equal(mismatch.ok,false);assert.deepEqual(await qframe(blank).locator('.TiMu textarea').evaluateAll(nodes=>nodes.map(node=>node.value)),['','']);tests.push('blank-count-mismatch-does-not-partially-write');
  await handle(blank,'COURSE_START',{video:false,answer:true,workAction:'review',next:false});await until(blank,s=>!s.running);assert.deepEqual(await qframe(blank).locator('.TiMu textarea').evaluateAll(nodes=>nodes.map(node=>node.value)),['第一空','第二空']);tests.push('multiple-blanks-counted-and-filled-in-order');
  const unparsed=await fixture('unparsed-group'),groupCalls=await worker.evaluate(()=>self.__calls.length);await handle(unparsed,'COURSE_START',{video:false,answer:true,workAction:'review',next:false});await until(unparsed,s=>!s.running);assert.equal(await qframe(unparsed).locator('.check_answer').count(),0);assert.equal(await worker.evaluate(()=>self.__calls.length),groupCalls);tests.push('unknown-reading-layout-not-treated-as-one-choice');
  const partial=await fixture('partial');await handle(partial,'COURSE_START',{video:false,answer:true,workAction:'review',next:false});await until(partial,s=>!s.running);assert.deepEqual(await qframe(partial).locator('.TiMu textarea').evaluateAll(nodes=>nodes.map(node=>node.value)),['用户原答案','']);assert.equal(Object.values((await state(partial)).pending).length,1);tests.push('partial-manual-answer-preserved-and-queued');
  const blocked=await fixture('blocked'),savedBefore=saveRequests,submittedBefore=submitRequests;await handle(blocked,'COURSE_START',{video:false,answer:true,workAction:'save-stay',next:false});await until(blocked,s=>!s.running);
  assert.equal((await state(blocked)).phase,'saved');assert.equal(await qframe(blocked).locator('.TiMu').nth(0).locator('.check_answer').count(),0);assert.equal(await qframe(blocked).locator('.TiMu').nth(1).locator('.check_answer').count(),1);assert.equal(saveRequests-savedBefore,1);assert.equal(submitRequests-submittedBefore,0);assert.equal(Object.values((await state(blocked)).pending).length,1);
  tests.push('image-question-queued-without-stopping-next-question','incomplete-quiz-only-saved-never-submitted');
  for(const mode of ['doc','doc-audio','doc-dom-receipt']){
    const f=await fixture(mode);await handle(f,'COURSE_START',{answer:false,videoAnswer:false,next:false,rate:1});await until(f,s=>!s.running);
    assert.equal((await state(f)).phase,'paused');assert.equal(await f.page.locator('body').getAttribute('data-flips'),'2');assert.equal(Object.values((await state(f)).taskInventory).find(task=>task.jobId==='ppt').status,'platform-passed');
    if(mode==='doc-audio')assert.equal(await f.page.locator('body').getAttribute('data-audio'),'0,1,2,');
    tests.push(mode+'-uses-native-next-with-real-page-change',mode+'-waits-for-platform-completion');
  }
  const stuck=await fixture('doc-stuck');await handle(stuck,'COURSE_START',{answer:false,videoAnswer:false,next:false});await until(stuck,s=>s.documentProgress?.clickedAt);
  await worker.evaluate(async id=>{const key='course-run-'+id,s=(await chrome.storage.session.get(key))[key];s.documentProgress.clickedAt=Date.now()-16000;await chrome.storage.session.set({[key]:s});},stuck.id);await handle(stuck,'COURSE_TICK');assert.equal(Object.values((await state(stuck)).pending).filter(item=>item.task).length,1);assert.match(Object.values((await state(stuck)).pending)[0].reason,/页码没有变化/);await handle(stuck,'COURSE_TICK');assert.equal((await state(stuck)).phase,'paused');tests.push('failed-native-slide-next-not-repeated-or-marked-done');
  for(const mode of ['doc-no-receipt','doc-missing','doc-book']){
    const f=await fixture(mode);await handle(f,'COURSE_START',{answer:false,videoAnswer:false,next:false});await until(f,s=>s.taskWait?.since);
    assert.equal((await state(f)).running,true);assert.match((await state(f)).videoText,/课件名称/);
    await worker.evaluate(async id=>{const key='course-run-'+id,s=(await chrome.storage.session.get(key))[key];s.taskWait.since=Date.now()-91000;await chrome.storage.session.set({[key]:s});},f.id);await handle(f,'COURSE_TICK');assert.ok(Object.values((await state(f)).pending).some(item=>item.task&&item.reason.includes('未标为完成')));await handle(f,'COURSE_TICK');assert.equal((await state(f)).phase,'paused');assert.equal(Object.values((await state(f)).taskInventory).find(task=>task.jobId==='ppt').status,'pending');
    tests.push(mode+'-required-attachment-prevents-false-completion');
  }
  assert.deepEqual(errors,[]);tests.push('new-adapters-no-browser-errors');
  fs.writeFileSync('work/sidebar-qa/ocs-adapters-results.json',JSON.stringify({version:JSON.parse(fs.readFileSync('package.json','utf8')).version,tests,mockOnly:true,realApiCalled:false,realCourseModified:false},null,2));console.log('PASS',tests.length,'OCS adapter regression checks',tests);
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{await context?.close();});

