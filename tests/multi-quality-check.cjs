// 仅使用独立 Edge 配置、自建媒体和模拟 AI；不读取 Key，不访问真实课程。
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium,executablePath}=require('./browser-runtime.cjs');
const host='https://multi-quality-fixture.chaoxing.com',ext=path.resolve(process.argv[2]||'outputs/DeepSeek-右侧栏版');let context;
const wav=Buffer.alloc(44+16000*2);wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(16000,24);wav.writeUInt32LE(32000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(wav.length-44,40);
const style='<meta charset="utf-8"><style>iframe{width:600px;height:320px}video{width:450px;height:210px}.video-js{width:480px;height:260px}li{padding:15px}button{padding:20px}</style>';
const stem='【判断题】2022年旧金山会晤时，习近平主席重点谈了中国在台湾问题、民主人权、道路制度、发展权利上的四条红线。';
const player=id=>`<video controls muted src="/media.wav" ontimeupdate="const w=frameElement?.closest('.ans-attach-ct');if(this.currentTime>0.3&&w?.querySelector('.ans-job-icon'))w.classList.add('ans-job-finished')" onended="const w=this.closest('.ans-attach-ct')||frameElement?.closest('.ans-attach-ct');if(w?.querySelector('.ans-job-icon'))w.classList.add('ans-job-finished')" onplay="top.document.body.dataset.played=(top.document.body.dataset.played||'')+'${id},'"></video>`;
(async()=>{
  context=await chromium.launchPersistentContext(path.resolve('work/sidebar-qa/multi-quality-profile-'+Date.now()),{executablePath,headless:true,args:[`--disable-extensions-except=${ext}`,`--load-extension=${ext}`]});
  await context.route(host+'/**',async route=>{
    const u=new URL(route.request().url()),mode=u.searchParams.get('mode');if(u.pathname==='/media.wav')return route.fulfill({body:wav,contentType:'audio/wav'});
    let body=style;
    if(u.pathname.includes('studentstudy'))body+=`<ul id="prev_tab"><li id="task" class="active">${['multi','stuck','identity'].includes(mode)?'视频':'章节测验'}</li></ul><iframe id="iframe" src="/knowledge/cards?mode=${mode}"></iframe>`;
    else if(u.pathname==='/knowledge/cards'){
      if(mode==='multi')body+=`<div class="ans-attach-ct ans-job-finished"><span class="ans-job-icon"></span><iframe src="/modules/video/index.html?id=done"></iframe></div><div class="ans-attach-ct"><span class="ans-job-icon"></span><iframe src="/modules/video/index.html?id=first"></iframe></div><div class="ans-attach-ct">${player('middle')}</div><div class="ans-attach-ct"><iframe loading="lazy" src="/modules/video/index.html?id=late"></iframe></div><div class="ans-attach-ct"><iframe src="/modules/video/index.html?id=boot"></iframe></div><div style="display:none"><iframe src="/modules/video/index.html?id=hidden"></iframe></div>`;
      else if(mode==='stuck')body+='<iframe src="/modules/video/index.html?id=stuck"></iframe>';
      else if(mode==='identity')body+=player('one')+player('two')+player('three');
      else body+=`<div class="ans-attach-ct"><span class="ans-job-icon"></span><iframe src="/work/do?mode=${mode}"></iframe></div>`;
    }else if(u.pathname.includes('/modules/video/')){
      const id=u.searchParams.get('id');
      if(id==='late')body+='<div>播放器稍后创建</div><script>setTimeout(()=>{const v=document.createElement("video");v.controls=true;v.muted=true;v.src="/media.wav";v.onplay=()=>top.document.body.dataset.played=(top.document.body.dataset.played||"")+"late,";document.body.append(v);},1800)</script>';
      else if(id==='boot')body+='<div class="video-js"><button class="vjs-big-play-button" onclick="this.hidden=true;const v=document.createElement(\'video\');v.controls=true;v.muted=true;v.src=\'/media.wav\';v.onplay=()=>top.document.body.dataset.played=(top.document.body.dataset.played||\'\')+\'boot,\';this.parentNode.append(v)">播放</button></div>';
      else if(id!=='stuck')body+=player(id);
    }else{
      const labels=mode==='icons'?['✗','✓']:mode==='unknown'?['','']:['不正确','正确'];
      body+=`<div class="singleQuesId"><div class="newZy_TItle">${stem}</div><ul class="Zy_ulTop">${labels.map((label,i)=>`<li onclick="this.parentNode.querySelectorAll('li').forEach(n=>n.classList.remove('check_answer'));this.classList.add('check_answer')">${mode==='icons'?`<span aria-hidden="true">${label}</span>`:`${String.fromCharCode(65+i)}、${label}`}</li>`).join('')}</ul></div><a class="btnSubmit workBtnIndex" onclick="document.body.dataset.submitted='yes'">提交</a><a class="btnSave workBtnIndex" onclick="document.body.dataset.saved='yes'">暂时保存</a>`;
    }
    await route.fulfill({body,contentType:'text/html; charset=utf-8'});
  });
  const worker=context.serviceWorkers()[0]||await context.waitForEvent('serviceworker'),tests=[];
  await worker.evaluate(()=>chrome.runtime.openOptionsPage());let options;for(let i=0;i<40&&!options;i++){options=context.pages().find(p=>p.url().endsWith('/options.html'));if(!options)await new Promise(r=>setTimeout(r,50));}assert.ok(options);await options.waitForLoadState();
  await worker.evaluate(async()=>{
    await chrome.storage.local.set({apiKey:'multi-quality-fake-only',reviewModel:'deepseek-v4-pro'});self.__requests=[];self.__quality='agree';
    self.fetch=async(_url,init)=>{const body=JSON.parse(init.body),text=body.messages.at(-1).content;self.__requests.push(body);const review=text.includes('这是填写前的审查');if(review&&self.__quality==='wait')return new Promise((_r,reject)=>init.signal.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError'))));
      let answer={verdict:false,uncertain:false,verified:true,reason:'模拟审查：旧金山会晤为2023年，2022年为巴厘岛。'};
      if(['disagree','unverified','uncertain','wait'].includes(self.__quality)&&!review&&body.model==='deepseek-flash')answer={...answer,verdict:true,reason:'模拟错误初答：2022年在巴厘岛，因此题干正确。'};
      if(review&&self.__quality==='unverified')answer.verified=false;
      if(review&&self.__quality==='uncertain')answer.uncertain=true;
      if(self.__quality==='conflict')answer.choices=['B'];
      return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify(answer)},finish_reason:'stop'}]}),{headers:{'content-type':'application/json'}});
    };
    const execute=chrome.scripting.executeScript.bind(chrome.scripting);chrome.scripting.executeScript=async opts=>{const results=await execute(opts);return opts.args?.[0]==='scan'?results.reverse():results;};
  });
  async function fixture(mode){const p=await context.newPage();await p.goto(host+'/mycourse/studentstudy?courseId='+Date.now()+'&chapterId=1&mode='+mode);await p.frameLocator('#iframe').locator('body').waitFor();const id=await worker.evaluate(async url=>(await chrome.tabs.query({})).find(t=>t.url===url).id,p.url());return{p,id};}
  const handle=(f,type,settings)=>worker.evaluate(async({id,type,settings})=>CourseEngine.handle({type,settings},{tab:{id},frameId:0}),{id:f.id,type,settings});
  const state=f=>worker.evaluate(async id=>(await chrome.storage.session.get('course-run-'+id))['course-run-'+id],f.id);
  async function until(f,predicate){for(let i=0;i<160;i++){await handle(f,'COURSE_TICK');const s=await state(f);if(s&&predicate(s))return s;await new Promise(r=>setTimeout(r,70));}throw Error('timeout: '+JSON.stringify(await state(f)));}
  const media=await fixture('multi');await handle(media,'COURSE_START',{answer:false,videoAnswer:false,next:false,rate:1,muted:true});
  await until(media,s=>!s.running);
  assert.equal((await state(media)).phase,'paused',JSON.stringify(await state(media)));assert.equal(await media.p.locator('body').getAttribute('data-played'),'first,middle,late,boot,');
  const v=await worker.evaluate(async id=>(await chrome.scripting.executeScript({target:{tabId:id,allFrames:true},func:courseFrame,args:['scan']})).filter(r=>r.result).flatMap(r=>r.result.videos),media.id);
  assert.equal(v.filter(m=>m.ended).length,4);assert.equal(v.filter(m=>!m.jobDone).every(m=>m.ended),true);assert.equal(await worker.evaluate(()=>self.__requests.length),0);
  tests.push('mixed-direct-and-nested-media-in-dom-order','shuffled-injection-results-do-not-change-order','non-task-videos-play','lazy-frame-and-delayed-player-not-skipped','native-boot-without-video-element','completed-task-not-replayed','hidden-ancestor-frame-ignored','four-media-really-ended-before-stay','early-platform-check-does-not-cut-off-current-video');await media.p.close();
  const stuck=await fixture('stuck');await handle(stuck,'COURSE_START',{answer:false,next:false});await handle(stuck,'COURSE_TICK');assert.equal((await state(stuck)).phase,'loading-video');await worker.evaluate(async id=>{const key='course-run-'+id,s=(await chrome.storage.session.get(key))[key];s.mediaLoad.since=Date.now()-61000;await chrome.storage.session.set({[key]:s});},stuck.id);await handle(stuck,'COURSE_TICK');assert.ok(Object.values((await state(stuck)).pending).some(item=>item.task));await handle(stuck,'COURSE_TICK');assert.equal((await state(stuck)).running,false);assert.equal((await state(stuck)).phase,'paused');tests.push('missing-player-waits-then-pauses-without-advance');await stuck.p.close();
  const ids=await fixture('identity'),cards=ids.p.frameLocator('#iframe');await cards.locator('video').nth(2).waitFor();
  await cards.locator('video').nth(1).evaluate(v=>v.play());await cards.locator('video').nth(2).evaluate(v=>v.play());await handle(ids,'COURSE_START',{answer:false,videoAnswer:false,next:false});await handle(ids,'COURSE_TICK');
  assert.equal(await cards.locator('video').nth(1).evaluate(v=>v.paused),true);assert.equal(await cards.locator('video').nth(2).evaluate(v=>v.paused),true);tests.push('other-autoplaying-media-paused-before-current-player');await handle(ids,'COURSE_STOP');
  const scan=await worker.evaluate(async id=>(await chrome.scripting.executeScript({target:{tabId:id,allFrames:true},func:courseFrame,args:['scan']})).find(r=>r.result?.path==='/knowledge/cards'),ids.id);
  await cards.locator('video').nth(0).evaluate(v=>v.style.display='none');
  const action=await worker.evaluate(async({id,frame,media})=>(await chrome.scripting.executeScript({target:{tabId:id,documentIds:[frame.documentId]},func:courseFrame,args:['play',{id:media.id,index:media.index,rate:1,muted:true,runId:'stable-fixture'}]}))[0].result,{id:ids.id,frame:scan,media:scan.result.videos[2]});
  assert.equal(action.ok,true);assert.equal(await cards.locator('video').nth(2).evaluate(v=>v.paused),false);assert.equal(await cards.locator('video').nth(1).evaluate(v=>v.paused),true);tests.push('media-identity-survives-visible-index-change');
  await cards.locator('video').nth(2).evaluate(v=>{v.pause();const copy=v.cloneNode();v.replaceWith(copy);});
  const stale=await worker.evaluate(async({id,frame,media})=>(await chrome.scripting.executeScript({target:{tabId:id,documentIds:[frame.documentId]},func:courseFrame,args:['play',{id:media.id,index:media.index,rate:1,muted:true,runId:'stable-fixture'}]}))[0].result,{id:ids.id,frame:scan,media:scan.result.videos[2]});
  assert.equal(stale.recheck,true);assert.equal(await cards.locator('video').nth(2).evaluate(v=>v.paused),true);tests.push('replaced-media-is-rescanned-without-playing-stale-index');await ids.p.close();
  for(const [mode,quality,expected] of [['judge','agree',1],['icons','agree',1],['judge','disagree',1],['judge','unverified',0],['judge','uncertain',0],['judge','conflict',0],['unknown','agree',0]]){
    await worker.evaluate(q=>{self.__quality=q;self.__requests=[];},quality);const f=await fixture(mode);await f.p.frameLocator('#iframe').frameLocator('iframe').locator('.singleQuesId').waitFor();
    await handle(f,'COURSE_START',{video:false,answer:true,workAction:'review',next:false});await until(f,s=>!s.running);const q=f.p.frameLocator('#iframe').frameLocator('iframe');assert.equal(await q.locator('.check_answer').count(),expected);
    assert.equal(await q.locator('body').getAttribute('data-submitted'),null);assert.equal(await q.locator('body').getAttribute('data-saved'),null);
    const requests=await worker.evaluate(()=>self.__requests);if(expected){assert.equal(await q.locator('.check_answer').innerText(),mode==='icons'?'✗':'A、不正确');assert.equal(requests.length,quality==='disagree'?6:4);assert.equal(requests.every(r=>r.thinking.type==='enabled'&&r.max_tokens===16384),true);assert.ok(requests[0].messages.at(-1).content.includes('2022年旧金山'));}
    if(quality==='disagree')assert.equal((await state(f)).lastConsensus.votes,6);
    if(mode==='unknown')assert.equal(requests.length,0);
    tests.push(mode==='icons'?'symbol-options-have-semantic-mapping':mode==='unknown'?'unknown-judgement-options-no-api-no-guess':quality==='agree'?'false-maps-to-reversed-negative-option':quality==='disagree'?'disagreement-resolved-by-cross-model-review':quality+'-review-prevents-fill-save-and-submit');await f.p.close();
  }
  await worker.evaluate(()=>{self.__quality='wait';self.__requests=[];});const cancel=await fixture('judge');await cancel.p.frameLocator('#iframe').frameLocator('iframe').locator('.singleQuesId').waitFor();await handle(cancel,'COURSE_START',{video:false,answer:true,workAction:'submit',next:true});
  const pending=handle(cancel,'COURSE_TICK');for(let i=0;i<80&&(await state(cancel)).phase!=='verifying';i++)await new Promise(r=>setTimeout(r,30));await handle(cancel,'COURSE_STOP');await pending;assert.equal((await state(cancel)).running,false);assert.equal(await cancel.p.frameLocator('#iframe').frameLocator('iframe').locator('.check_answer').count(),0);tests.push('stop-during-review-cancels-stale-fill');
  fs.writeFileSync('work/sidebar-qa/multi-quality-results.json',JSON.stringify({tests,mockOnly:true,realApiCalled:false,realCourseModified:false},null,2));console.log('PASS',tests.length,'multi-media and answer-quality checks',tests);
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{await context?.close();});
