'use strict';
// Test dependency only. Set OIL_PLAYWRIGHT to an existing Playwright module if needed.
const {chromium}=require(process.env.OIL_PLAYWRIGHT||'playwright'),assert=require('assert'),fs=require('fs'),path=require('path');
const base=process.env.OIL_TEST_URL||'http://127.0.0.1:8014/',out=path.resolve(__dirname,'../shots/review-2026-11-03');fs.mkdirSync(out,{recursive:true});
const main=[['w1','w1-boundary-learning'],['w2','w2-reservoir-param'],['w3','w3-imaging-fracture'],['w4','w4-lithology'],['w5','w5-completion']];
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-proxy-server']}),checks=[],errors=[];
 try{
  for(const width of [1280,375]){
   const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
   await page.goto(base,{waitUntil:'networkidle'});await page.waitForSelector('.home-case svg');
   assert.strictEqual(await page.locator('[data-home-pause]').getAttribute('aria-pressed'),'true');
   const loaded=await page.evaluate(()=>performance.getEntriesByType('resource').map(r=>r.name));
   assert(!loaded.some(s=>/w2-reservoir-param\.(case|demo)\.js/.test(s)),'Home eagerly loaded w2');
   checks.push({width,page:'home',defaultPaused:true,w2Lazy:true});
   for(const [scene,id]of main){
    for(const tab of ['bg','flow','demo']){
     await page.goto(base+'#/scene/'+scene+'?case='+id+'&tab='+tab,{waitUntil:'networkidle'});
     await page.waitForSelector('.panel.on');
     const result=await page.evaluate(()=>({panel:document.querySelector('.panel.on')?.dataset.panel,overflow:document.documentElement.scrollWidth>innerWidth,badImages:[...document.images].filter(i=>i.complete&&!i.naturalWidth).map(i=>i.src.slice(0,80)),mountFailed:document.body.innerText.includes('示范挂载失败')}));
     assert.strictEqual(result.panel,tab,id+': panel');assert(!result.overflow,id+': overflow at '+width);assert(!result.mountFailed,id+': mount failed');assert.strictEqual(result.badImages.length,0,id+': broken images');
     const screenshot=id+'-'+tab+'-'+width+'.png';await page.screenshot({path:path.join(out,screenshot),fullPage:false});
     checks.push({width,case:id,tab,...result,screenshot});
     if(tab==='demo'){
      const panel=page.locator('.oil-trace');await panel.waitFor();const initial=await panel.evaluate(el=>el.traceRecord);
      await panel.locator('[data-trace-point]').focus();await page.keyboard.press('ArrowRight');
      const changedPoint=await panel.evaluate(el=>el.traceRecord);assert.notStrictEqual(changedPoint.index,initial.index,id+': keyboard selection');
      await panel.locator('[data-trace-delta]').focus();await page.keyboard.press('ArrowRight');
      const changedInput=await panel.evaluate(el=>el.traceRecord);assert.notDeepStrictEqual(changedInput.inputs,changedPoint.inputs,id+': keyboard input');assert.notDeepStrictEqual(changedInput.steps,changedPoint.steps,id+': stale evidence');
      await panel.locator('[data-trace-reset]').click();const reset=await panel.evaluate(el=>el.traceRecord);assert.deepStrictEqual(reset.inputs,changedPoint.inputs,id+': reset');
      if(['w2','w5'].includes(scene)){await panel.locator('[data-trace-worst]').click();assert(await panel.locator('[data-trace-summary]').textContent());}
      for(let step=0;step<3;step++){await page.locator('[data-guide-next]').click();assert.strictEqual(await page.locator('.oil-guide-target').count(),1,id+': guide missing target');}
      await page.locator('[data-guide-next]').click();assert.strictEqual(await page.locator('.oil-guide-target').count(),0);
      const cdp=await context.newCDPSession(page),ax=await cdp.send('Accessibility.getFullAXTree');
      const sliders=ax.nodes.filter(n=>!n.ignored&&n.role?.value==='slider');assert(sliders.length>=2,id+': no AX sliders');
      const unnamed=sliders.filter(n=>!n.name?.value);checks.push({width,case:id,interaction:'trace + guide',keyboardChangedPoint:true,keyboardChangedEvidence:true,guideTargets:3,axSliders:sliders.length,unnamedSliders:unnamed.length});
      assert.strictEqual(unnamed.length,0,id+': unnamed slider');await page.evaluate(()=>window.scrollTo(0,0));const clip=await panel.evaluate(el=>{const b=el.getBoundingClientRect();return {x:b.x+scrollX,y:b.y+scrollY,width:b.width,height:b.height,scale:1};});const shot=await cdp.send('Page.captureScreenshot',{format:'png',clip,captureBeyondViewport:true});fs.writeFileSync(path.join(out,id+'-trace-'+width+'.png'),Buffer.from(shot.data,'base64'));await cdp.detach();
     }
    }
   }
   // Keyboard route from homepage to w4, using a native link and Enter.
   await page.goto(base,{waitUntil:'networkidle'});async function tabTo(selector){for(let i=0;i<160;i++){await page.keyboard.press('Tab');if(await page.evaluate(s=>document.activeElement?.matches(s),selector))return;}throw Error('Native Tab could not reach '+selector);}
   await tabTo('a[aria-label="打开岩性识别完整演示"]');await page.keyboard.press('Enter');await page.waitForSelector('.oil-trace');
   await tabTo('[data-trace-point]');await page.keyboard.press('ArrowRight');assert((await page.locator('[data-trace-steps]').innerText()).includes('近邻'));
   checks.push({width,interaction:'home link Enter → w4 → depth ArrowRight → readable neighbors',passed:true});
   await context.close();console.log('Browser checks passed at',width);
  }
  // Rapid navigation must not render a stale lazy-loaded route.
  const page=await browser.newPage();await page.goto(base);await page.evaluate(()=>{location.hash='/scene/w2?case=w2-reservoir-param&tab=demo';setTimeout(()=>location.hash='/scene/w3?case=w3-imaging-fracture&tab=demo',0);});await page.waitForSelector('.oil-trace');assert.strictEqual(await page.locator('.oil-trace').evaluate(el=>el.traceRecord.caseId),'w3-imaging-fracture');checks.push({interaction:'rapid lazy route navigation',passed:true});
  assert.strictEqual(errors.length,0,'Browser errors: '+errors.join('; '));
  fs.writeFileSync(path.join(out,'browser-checks.json'),JSON.stringify({base,browser:'Chrome headless',date:'2026-11-03',checks,errors,limits:'Automated keyboard and AX tree checks; no human screen-reader test or teaching participants.'},null,2));
  console.log('PASS:',checks.length,'checks; five main cases / bg-flow-demo / desktop-mobile / actual trace and keyboard / guided targets / accessibility tree / lazy route race');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
