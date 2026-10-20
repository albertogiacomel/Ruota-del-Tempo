import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { resolve,join } from 'node:path';
import { openBrowser,delay } from './game-kit-cdp.js';
const root=resolve(import.meta.dirname,'..');
const page=await openBrowser(join(root,'dist'),{entry:'/solid-three.html',artifactsPath:join(root,'artifacts','solid-three'),blockRemoteAI:true});
const {evaluate,command}=page;
const gpuSamples=[];
const expectedOrigin=process.env.TRIAL_BASE_URL?new URL(process.env.TRIAL_BASE_URL).origin:page.url;
if(process.env.TRIAL_BASE_URL)await command('Page.navigate',{url:new URL('/solid-three.html',process.env.TRIAL_BASE_URL).href});
const wait=async expression=>{for(let i=0;i<300;i++){if(await evaluate(expression))return;await delay(30);}throw new Error('Trial condition: '+expression+' errors: '+JSON.stringify(page.errors));};
const click=selector=>evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
const press=async(key,code,vk,modifiers=0)=>{await command('Input.dispatchKeyEvent',{type:'keyDown',key,code,windowsVirtualKeyCode:vk,modifiers,...(key==='Enter'?{text:'\r'}:{})});await command('Input.dispatchKeyEvent',{type:'keyUp',key,code,windowsVirtualKeyCode:vk,modifiers});};
const realClick=async selector=>{
  const point=await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
  await command('Input.dispatchMouseEvent',{type:'mousePressed',...point,button:'left',clickCount:1});
  await command('Input.dispatchMouseEvent',{type:'mouseReleased',...point,button:'left',clickCount:1});
};
const change=(name,value)=>evaluate(`(()=>{const e=document.querySelector('[data-setting=${name}]');${typeof value==='boolean'?'e.checked':'e.value'}=${JSON.stringify(value)};e.dispatchEvent(new Event('change',{bubbles:true}));})()`);
try{
  await wait(`location.origin===${JSON.stringify(expectedOrigin)}&&Boolean(window.__gameKit)&&Boolean(document.querySelector("[data-spin]"))`);
  await evaluate('window.__gameKit.settings.update({language:"it",motion:"reduced",muted:true})');
  await wait('["3d","fallback"].includes(document.querySelector(".trial-app")?.dataset.renderer)');
  assert.equal(await evaluate('document.querySelector(".trial-app").dataset.renderer'),'3d','Exercise real Three rendering in the browser');
  assert.equal(await evaluate('document.querySelector("[data-mode=DAYS]").getAttribute("aria-pressed")'),'true');
  await evaluate('[...document.querySelectorAll("button")].find(e=>e.textContent.trim()==="Rifiuta facoltativi")?.click()');
  assert.equal(await evaluate('window.__gameKit.dialog.element.dataset.uiFramework'),'solid-2');
  await delay(300);await realClick('[data-kit-settings]');await wait('window.__gameKit.dialog.element.open');
  await change('language','en');await wait('document.documentElement.lang==="en"&&document.querySelector("#solid-settings-title").textContent==="Settings"');
  await change('theme','dark');await wait('document.documentElement.classList.contains("dark")');
  assert.equal(await evaluate('document.querySelector("[data-setting=effects]").disabled'),true,'Muted disables channels');
  await change('muted',false);await wait('!document.querySelector("[data-setting=voice]").disabled');
  await change('muted',true);await change('difficulty','medium');
  const preferencesBeforeReset=await evaluate('JSON.stringify(window.__gameKit.settings.getSnapshot())');
  await realClick('[data-reset-settings]');await wait('!document.querySelector(".ag-reset-confirm").hidden');
  await press('Escape','Escape',27);
  await wait('document.querySelector(".ag-reset-confirm").hidden&&window.__gameKit.dialog.element.open');
  assert.equal(await evaluate('JSON.stringify(window.__gameKit.settings.getSnapshot())'),preferencesBeforeReset,'Cancel reset preserves settings');
  const lastControl='[...document.querySelectorAll("#solid-settings button:not(:disabled),#solid-settings select:not(:disabled),#solid-settings input:not(:disabled),#solid-settings a[href]")].filter(e=>!e.closest("[hidden]")).at(-1)';
  await evaluate(lastControl+'.focus()');await press('Tab','Tab',9);
  assert.equal(await evaluate('document.activeElement===document.querySelector("#solid-settings header button")'),true,'Dialog traps forward Tab, including appended privacy controls');
  await press('Tab','Tab',9,8);
  assert.equal(await evaluate('document.activeElement==='+lastControl),true,'Dialog traps reverse Tab');
  await press('Escape','Escape',27);await wait('!window.__gameKit.dialog.element.open');
  await evaluate('window.__gameKit.settings.update({language:"it",difficulty:"easy",theme:"light"})');await delay(50);
  for(const width of [1280,390,320]){
    await command('Emulation.setDeviceMetricsOverride',{width,height:width===1280?900:844,deviceScaleFactor:1,mobile:width!==1280});await delay(150);
    assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth'),'No horizontal overflow at '+width);
    const widths=await evaluate('[...document.querySelectorAll(".trial-mode button")].map(e=>e.getBoundingClientRect().width)');
    assert.ok(Math.max(...widths)-Math.min(...widths)<=1,'Equal modes');
    await writeFile(join(page.artifacts,`trial-${width}.png`),Buffer.from((await command('Page.captureScreenshot',{format:'png',captureBeyondViewport:true})).data,'base64'));
    await click('[data-kit-settings]');await wait('window.__gameKit.dialog.element.open');
    const geometry=await evaluate('(()=>{const e=window.__gameKit.dialog.element;return {fits:e.scrollWidth<=e.clientWidth,widths:[...e.querySelectorAll("fieldset")].map(n=>n.getBoundingClientRect().width)}})()');
    assert.ok(geometry.fits&&Math.max(...geometry.widths)-Math.min(...geometry.widths)<=1,'Solid settings equal widths and no overflow');
    await writeFile(join(page.artifacts,`solid-settings-${width}.png`),Buffer.from((await command('Page.captureScreenshot',{format:'png'})).data,'base64'));
    await press('Escape','Escape',27);await wait('!window.__gameKit.dialog.element.open');
  }
  for(const mode of ['DAYS','MONTHS'])for(const language of ['it','en']){
    await evaluate(`window.__gameKit.settings.update({language:${JSON.stringify(language)}})`);await delay(50);
    await click(`[data-mode="${mode}"]`);
    if(mode==='DAYS'&&language==='it'){
      await evaluate('document.querySelector("[data-spin]").scrollIntoView({block:"center"})');await delay(100);
      const point=await evaluate('(()=>{const r=document.querySelector("[data-spin]").getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()');
      await command('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]});
      await command('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    }else await click('[data-spin]');
    await click('[data-spin]');
    await wait('document.querySelector(".trial-app").dataset.phase==="question"');
    if(mode==='MONTHS'&&language==='it'){
      await evaluate('window.__gameKit.settings.update({theme:"dark",contrast:"high"})');await delay(50);
      await writeFile(join(page.artifacts,'trial-months-quiz-dark-mobile.png'),Buffer.from((await command('Page.captureScreenshot',{format:'png',captureBeyondViewport:true})).data,'base64'));
      assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth'),'Quiz fits narrow mobile');
    }
    const winner=await evaluate('Number(document.querySelector("[data-winner]").dataset.winner)');
    assert.equal(await evaluate('Number(document.querySelector(".trial-wheel canvas").dataset.selectedIndex)'),winner,'3D highlight follows the actual winner');
    assert.equal(await evaluate('Number(document.querySelector(".trial-wheel canvas").dataset.pointerAngle)'),0,'Pointer returns to rest');
    assert.ok(await evaluate('Number(document.querySelector(".trial-wheel canvas").dataset.drawCalls)<=20'),'Bounded draw calls with detailed wheel');
    const gpu=await evaluate('({...document.querySelector(".trial-wheel canvas").dataset})');
    gpuSamples.push({mode,language,...gpu});
    // Two 15-geometry models and label textures, plus Three's internal placeholder texture.
    assert.ok(Number(gpu.geometryCount)<=30&&Number(gpu.textureCount)<=3,'Bounded two-model GPU cache: '+JSON.stringify(gpu));
    const count=mode==='DAYS'?7:12,prev=(winner+count-1)%count,next=(winner+1)%count;
    // Wrong sequence, feedback, clear answer and correct the same round.
    await click(`[data-option="${next}"]`);await click(`[data-option="${prev}"]`);await click('[data-check]');
    await wait('document.querySelector(".trial-feedback").textContent.length>0');
    await click('[data-answer="before"]');await click('[data-answer="after"]');
    await click(`[data-option="${prev}"]`);await click(`[data-option="${next}"]`);await click('[data-check]');
    await wait('document.querySelector(".trial-app").dataset.phase==="success"');
    await click('[data-again]');
  }
  await evaluate('window.__gameKit.settings.update({motion:"system",language:"en"})');await delay(50);
  await click('[data-spin]');await delay(150);
  await wait('Math.abs(Number(document.querySelector(".trial-wheel canvas").dataset.pointerAngle))>.001');
  await evaluate('window.__gameKit.open()');await delay(100);
  const frozen=await evaluate('document.querySelector(".trial-wheel svg g").style.transform');
  await delay(300);
  assert.equal(await evaluate('document.querySelector(".trial-wheel svg g").style.transform'),frozen,'Spin pauses with settings');
  await evaluate('window.__gameKit.lifecycle.pause("test-manual");window.__gameKit.dialog.close()');await delay(100);
  assert.equal(await evaluate('window.__gameKit.lifecycle.paused'),true,'Independent reason persists');
  await evaluate('window.__gameKit.lifecycle.resume("test-manual")');
  await wait('document.querySelector(".trial-app").dataset.phase==="question"');
  await click('.trial-back');
  // GPU failure after a spin switches to the same functioning SVG wheel.
  await evaluate('document.querySelector(".trial-wheel canvas").dispatchEvent(new Event("webglcontextlost",{cancelable:true}))');
  await wait('document.querySelector(".trial-app").dataset.renderer==="fallback"');
  await evaluate('window.__gameKit.settings.update({motion:"reduced"})');await delay(50);
  await click('[data-spin]');await wait('document.querySelector(".trial-app").dataset.phase==="question"');
  // Initial WebGL denial exercises import/constructor failure independently of context loss.
  await command('Page.addScriptToEvaluateOnNewDocument',{source:'const native=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type.startsWith("webgl")?null:native.call(this,type,...args)};'});
  await evaluate('window.__navigationPending=true');
  await command('Page.reload',{ignoreCache:true});
  await wait('!window.__navigationPending&&Boolean(window.__gameKit)&&document.querySelector(".trial-app")?.dataset.renderer==="fallback"');
  await click('[data-spin]');await wait('document.querySelector(".trial-app").dataset.phase==="question"');
  // Keyboard activation and shared settings preserve focus and saved preferences.
  await click('[data-kit-settings]');
  await command('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
  await command('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
  await wait('!window.__gameKit.dialog.element.open&&document.activeElement.hasAttribute("data-kit-settings")');
  assert.equal(await evaluate('window.__gameKit.settings.getSnapshot().language'),'en');
  // Follow the real classic -> Solid link with the keyboard and retain shared settings.
  await evaluate('window.__navigationPending=true;document.querySelector("a.trial-brand").click()');
  await wait('!window.__navigationPending&&location.pathname==="/index.html"&&Boolean(document.querySelector(".classic-view-switch"))');
  for(const width of [1280,390,320]){
    await command('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:width!==1280});await delay(75);
    const boxes=await evaluate('[...document.querySelectorAll(".classic-view-switch a")].map(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height,current:e.getAttribute("aria-current"),href:e.getAttribute("href")}})');
    assert.ok(boxes.every(b=>b.x>=0&&b.right<=width&&b.y>=0&&b.bottom<=844&&b.height>=44),'Visible version switch at '+width);
    assert.ok(Math.abs(boxes[0].width-boxes[1].width)<=1);assert.equal(boxes[0].current,'page');assert.equal(boxes[1].href,'/solid-three.html');
    await writeFile(join(page.artifacts,`classic-switch-${width}.png`),Buffer.from((await command('Page.captureScreenshot',{format:'png'})).data,'base64'));
  }
  await evaluate('window.__navigationPending=true;document.querySelector(".classic-view-switch a:last-child").focus()');
  await press('Enter','Enter',13);
  await wait('!window.__navigationPending&&location.pathname==="/solid-three.html"&&Boolean(window.__gameKit)&&document.querySelector("#solid-settings")?.dataset.uiFramework==="solid-2"');
  assert.equal(await evaluate('window.__gameKit.settings.getSnapshot().language'),'en','Version switch retains language');
  assert.deepEqual(page.errors,[]);
  await writeFile(join(page.artifacts,'verification.json'),JSON.stringify({status:'PASS',timestamp:new Date().toISOString(),environment:process.env.TRIAL_BASE_URL||'built-dist',checks:['real Three renderer','desktop/mobile 1280/390/320','real touch activation','four bilingual days/months rounds','winner highlight and pointer rest','mechanical pointer movement','bounded GPU cache and draw calls','wrong/correct answers','double spin guard','pause reasons','context-loss SVG fallback','initial WebGL denial fallback','preference persistence','Escape and focus restore'],gpuSamples,errors:page.errors},null,2),'utf8');
  console.log('PASS Solid/Three gameplay, responsive layout, pause and renderer fallback');
}finally{await page.close();}
