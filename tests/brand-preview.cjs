const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium,executablePath}=require('./browser-runtime.cjs');
let context;
(async()=>{
  const ext=path.resolve('outputs/DeepSeek-右侧栏版'),tests=[],errors=[];
  context=await chromium.launchPersistentContext(path.resolve('work/sidebar-qa/brand-profile-'+Date.now()),{executablePath,headless:true,args:[`--disable-extensions-except=${ext}`,`--load-extension=${ext}`]});
  context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));
  const worker=context.serviceWorkers()[0]||await context.waitForEvent('serviceworker'),id=new URL(worker.url()).hostname;
  const manifest=await worker.evaluate(()=>chrome.runtime.getManifest());assert.equal(manifest.name,'Runa学习助手');assert.equal(manifest.version,JSON.parse(fs.readFileSync('package.json','utf8')).version);tests.push('manifest-brand-and-version');
  await worker.evaluate(()=>chrome.runtime.openOptionsPage());let installedOptions;for(let i=0;i<40&&!installedOptions;i++){installedOptions=context.pages().find(p=>p.url().endsWith('/options.html'));if(!installedOptions)await new Promise(r=>setTimeout(r,50));}assert.ok(installedOptions);await installedOptions.waitForLoadState();
  await context.route('https://brand-fixture.chaoxing.com/**',r=>r.fulfill({contentType:'text/html',body:'<meta charset="utf-8"><title>本地品牌预览</title><iframe id="iframe"></iframe>'}));
  const owner=await context.newPage();await owner.goto('https://brand-fixture.chaoxing.com/mycourse/studentstudy?courseId=brand');
  const tabId=await worker.evaluate(async url=>(await chrome.tabs.query({})).find(t=>t.url===url).id,owner.url());
  const panel=await context.newPage();await panel.setViewportSize({width:430,height:880});await panel.goto(`chrome-extension://${id}/sidepanel.html?tabId=${tabId}`);const ui=panel.locator('[data-local-study-host]');
  await panel.waitForFunction(()=>getComputedStyle(document.querySelector('[data-local-study-host]').shadowRoot.querySelector('header')).backgroundColor==='rgb(9, 37, 82)');
  assert.equal(await ui.locator('h2').innerText(),'Runa学习助手');assert.ok(await ui.locator('h2').evaluate(e=>getComputedStyle(e,'::before').backgroundImage.includes('icons/icon.png')));tests.push('sidebar-shared-theme-and-character-logo');
  await panel.getByRole('button',{name:'课程助手',exact:true}).click();await panel.screenshot({path:'outputs/Runa学习助手-侧栏预览.png'});
  await panel.setViewportSize({width:320,height:760});assert.ok(await ui.locator('#panel').evaluate(e=>e.getBoundingClientRect().right<=innerWidth));assert.ok(await ui.locator('header').evaluate(e=>e.scrollWidth<=e.clientWidth));await panel.screenshot({path:'work/sidebar-qa/runa-320.png'});tests.push('sidebar-header-fits-320px');
  const options=await context.newPage();await options.setViewportSize({width:900,height:1050});await options.goto(`chrome-extension://${id}/options.html`);await options.locator('.seal').evaluate(e=>e.decode());assert.equal(await options.locator('h1').innerText(),'Runa学习助手');await options.screenshot({path:'outputs/Runa学习助手-设置预览.png',fullPage:true});tests.push('settings-logo-decodes-and-brand-renders');
  await options.setViewportSize({width:320,height:760});assert.equal(await options.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await options.screenshot({path:'work/sidebar-qa/runa-settings-320.png',fullPage:true});tests.push('settings-fit-320px');
  const solo=await context.newPage();await solo.setViewportSize({width:1000,height:900});await solo.goto(`chrome-extension://${id}/assistant.html`);await solo.waitForFunction(()=>getComputedStyle(document.querySelector('[data-local-study-host]').shadowRoot.querySelector('header')).backgroundColor==='rgb(9, 37, 82)');assert.equal(await solo.locator('[data-local-study-host]').locator('h2').innerText(),'Runa学习助手');await solo.screenshot({path:'work/sidebar-qa/runa-solo.png'});tests.push('standalone-shares-brand-and-theme');
  // 普通课程内容脚本也必须能读取扩展的静态主题与图标。
  assert.equal(await owner.evaluate(async id=>{const stylesheet=await fetch(`chrome-extension://${id}/theme.css`);const icon=await fetch(`chrome-extension://${id}/icons/icon.png`);return stylesheet.ok&&icon.ok;},id),true);tests.push('content-page-can-load-declared-static-assets');
  assert.deepEqual(errors,[]);tests.push('no-page-script-errors');fs.writeFileSync('work/sidebar-qa/brand-results.json',JSON.stringify({tests,mockOnly:true,realCourseModified:false,realApiCalled:false},null,2));console.log('PASS',tests.length,'Runa brand and layout checks');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{await context?.close();});
