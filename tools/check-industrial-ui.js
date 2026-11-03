'use strict';
const {chromium}=require(process.env.OIL_PLAYWRIGHT||'playwright'),fs=require('fs'),assert=require('assert');
const base=process.env.OIL_TEST_URL||'http://127.0.0.1:8014/',out='shots/industrial-2026-11-03';fs.mkdirSync(out,{recursive:true});
const pages=[['home',''],['cases','#/cases'],['stage','#/stage/welllog'],['w4-bg','#/scene/w4?case=w4-lithology&tab=bg'],['w4-flow','#/scene/w4?case=w4-lithology&tab=flow'],['w4-demo','#/scene/w4?case=w4-lithology&tab=demo'],['d2-demo','#/scene/d2?case=d2-drilling-warning&tab=demo'],['guide','#/guide']];
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-proxy-server']}),rows=[],errors=[];
 try{for(const width of [1440,1024,768,375]){
  const context=await browser.newContext({viewport:{width,height:960}});
  for(const [name,route]of pages){const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(base+route,{waitUntil:'networkidle'});
   if(name==='home')await p.locator('.home-case svg').waitFor();else if(name.includes('demo')){await p.locator('.oil-trace').waitFor();assert.strictEqual(await p.locator('.oil-trace').evaluate(e=>e.traceRecord.caseId),name==='w4-demo'?'w4-lithology':'d2-drilling-warning');}else if(name.endsWith('bg'))await p.locator('.oil-plate').waitFor();else if(name.endsWith('flow'))await p.locator('.pipeline').waitFor();else await p.locator('.page-head').waitFor();
   const result=await p.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,clipped:[...document.querySelectorAll('.hdr-in,.home-case,.hw-card,.tabs,.panel.on,.page-head,.detail-head')].filter(e=>{const b=e.getBoundingClientRect();return b.width&& (b.left< -1||b.right>innerWidth+1);}).map(e=>e.className),brokenImages:[...document.images].filter(e=>e.complete&&!e.naturalWidth).length}));assert(!result.overflow&&result.clipped.length===0,name+' '+width+' clipping '+JSON.stringify(result));assert.strictEqual(result.brokenImages,0);
   if(name==='home'){
    assert.strictEqual(await p.evaluate(()=>Cases.list().length),23);assert.strictEqual(await p.locator('[data-module]').count(),13);const button=p.locator('[data-home-pause]');assert.strictEqual(await button.getAttribute('aria-pressed'),'true');assert((await button.innerText()).includes('播放岩性判断过程'));
    const metrics=await button.evaluate(e=>{const b=e.getBoundingClientRect(),s=getComputedStyle(e),rgb=v=>v.match(/[\d.]+/g).slice(0,3).map(Number),L=a=>a.map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0),a=L(rgb(s.color)),c=L(rgb(s.backgroundColor));return{width:b.width,height:b.height,fontSize:parseFloat(s.fontSize),contrast:(Math.max(a,c)+.05)/(Math.min(a,c)+.05)};});assert(metrics.height>=48&&metrics.width>=240&&metrics.fontSize>=14&&metrics.contrast>=4.5);
    const phase=await p.locator('.home-case').getAttribute('data-phase');await p.waitForTimeout(200);assert.strictEqual(await p.locator('.home-case').getAttribute('data-phase'),phase);
    // Native Tab then Space, rather than programmatic dispatch, exercises the visible transport.
    await p.evaluate(()=>window.scrollTo(0,0));for(let i=0;i<40;i++){await p.keyboard.press('Tab');if(await button.evaluate(e=>e===document.activeElement))break;}assert(await button.evaluate(e=>e===document.activeElement),'keyboard cannot reach transport');await p.keyboard.press('Space');assert.strictEqual(await button.getAttribute('aria-pressed'),'false');assert((await button.innerText()).includes('暂停'));
    if(width===1440){await p.waitForTimeout(3200);assert.strictEqual(await p.locator('.home-case').getAttribute('data-phase'),'learn');}
    await p.keyboard.press('Space');assert.strictEqual(await button.getAttribute('aria-pressed'),'true');
    const current=await p.locator('#home-case-result').innerText();await p.locator('[data-home-point]').click();assert.notStrictEqual(await p.locator('#home-case-result').innerText(),current);
    await p.locator('[data-home-method=raw]').click();assert.strictEqual(await p.locator('[data-home-method=raw]').getAttribute('aria-pressed'),'true');
    await p.locator('[data-home-method=standard]').click();
    // The unchanged import modal must still expose ordinary and ZIP inputs.
    await p.locator('[data-import]').first().click();await p.locator('#imp-file').waitFor({state:'attached'});assert(await p.locator('#import-modal').isVisible());assert((await p.locator('#import-modal').innerText()).includes('ZIP'));assert(await p.locator('#import-modal .mdl-p').evaluate(e=>{const b=e.getBoundingClientRect();return b.left>=0&&b.right<=innerWidth;}),'import dialog clipped');
    rows.push({width,name,...result,playButton:metrics,keyboardPlayback:true,actualPhase:true,manualDepth:true,originalImportAndZIP:true});
   }else rows.push({width,name,...result});
   await p.close();
  }await context.close();console.log('PASS',width,'8 page layouts and playback/import interactions');
 }
 assert.strictEqual(errors.length,0,errors.join('; '));fs.writeFileSync(out+'/ui-checks.json',JSON.stringify({date:'2026-11-03',base,rows,errors,scope:'Presentation and native keyboard checks; no changes to case logic.'},null,2));console.log('PASS 32 page/viewport combinations');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
