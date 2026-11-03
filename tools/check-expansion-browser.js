'use strict';
const {chromium}=require(process.env.OIL_PLAYWRIGHT||'playwright'),assert=require('assert'),fs=require('fs'),path=require('path'),{definitions}=require('../cases/expansion/catalog');
const base=process.env.OIL_TEST_URL||'http://127.0.0.1:8014/',out='shots/expansion';fs.mkdirSync(out,{recursive:true});
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-proxy-server']}),rows=[],errors=[];
 try{for(const width of [1280,375]){
  const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base,{waitUntil:'networkidle'});assert.strictEqual(await page.evaluate(()=>Cases.list().length),23);assert.strictEqual(await page.locator('[data-module]').count(),13);
  const resources=await page.evaluate(()=>performance.getEntriesByType('resource').map(r=>r.name));assert(!resources.some(s=>/d2-drilling-warning\.(case|demo)\.js/.test(s)),'eager expansion load');
  for(const d of definitions){for(const tab of ['bg','flow','demo']){
   await page.goto(base+'#/scene/'+d.sceneId+'?case='+d.id+'&tab='+tab,{waitUntil:'networkidle'});await page.locator('.panel.on').waitFor();
   const result=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,mountFailed:document.body.innerText.includes('示范挂载失败'),broken:[...document.images].filter(i=>i.complete&&!i.naturalWidth).length}));
   assert(!result.overflow,d.id+' '+tab+' overflow '+width);assert(!result.mountFailed,d.id+' failed');assert.strictEqual(result.broken,0,d.id+' broken image');
   if(tab==='demo'){
    const panel=page.locator('.oil-trace');await panel.waitFor();assert.strictEqual(await panel.locator('[data-trace-delta]').inputValue(),'0');const a=await panel.evaluate(el=>el.traceRecord);
    await panel.locator('[data-trace-point]').focus();await page.keyboard.press('ArrowRight');const b=await panel.evaluate(el=>el.traceRecord);assert.notStrictEqual(a.index,b.index,d.id+' keyboard point');
    await panel.locator('[data-trace-delta]').focus();await page.keyboard.press('ArrowLeft');const c=await panel.evaluate(el=>el.traceRecord);assert.notDeepStrictEqual(b.inputs,c.inputs,d.id+' input');assert.notDeepStrictEqual(b.steps,c.steps,d.id+' evidence');
    await panel.locator('[data-trace-reset]').click();assert.deepStrictEqual((await panel.evaluate(el=>el.traceRecord)).inputs,b.inputs,d.id+' reset');
    for(let i=0;i<3;i++){await page.locator('[data-guide-next]').click();assert.strictEqual(await page.locator('.oil-guide-target').count(),1,d.id+' guide target');}await page.locator('[data-guide-next]').click();
    await page.locator('[data-ex-mode=base]').click();assert.strictEqual(await page.locator('[data-ex-mode=base]').getAttribute('aria-pressed'),'true');
    assert((await page.locator('[data-ex-selected]').innerText()).includes('当前显示：传统对照'),d.id+' stale mode');await page.locator('[data-ex-mode=learn]').click();
    await page.locator('#ex-0').focus();await page.keyboard.press('ArrowRight');await page.waitForTimeout(150);const changed=await panel.evaluate(el=>el.traceRecord);assert(changed.inputs.length);
    await page.locator('#ex-scene').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,d.id+'-'+width+'.png')});
    const beforeReplay=await panel.evaluate(el=>el.traceRecord.index);await page.locator('[data-ex-play]').click();await page.waitForTimeout(850);await page.locator('[data-ex-play]').click();
    const afterReplay=await panel.evaluate(el=>el.traceRecord.index);assert.notStrictEqual(beforeReplay,afterReplay,d.id+' replay');
    const cdp=await context.newCDPSession(page),ax=await cdp.send('Accessibility.getFullAXTree'),sliders=ax.nodes.filter(n=>!n.ignored&&n.role?.value==='slider');assert(sliders.length>=5&&sliders.every(n=>n.name?.value),d.id+' AX');await cdp.detach();
    rows.push({id:d.id,width,tab,...result,trace:true,keyboard:true,guide:3,mode:true,axNamedSliders:sliders.length});
   }else rows.push({id:d.id,width,tab,...result});
  }console.log('Checked',width,d.id);}
  await context.close();
 }
 assert.strictEqual(errors.length,0,errors.join('; '));fs.writeFileSync(path.join(out,'browser-checks.json'),JSON.stringify({date:'2026-11-03',base,rows,errors,limits:'Automated Chrome keyboard and AX checks, no human screen-reader or teaching study.'},null,2));console.log('PASS',rows.length,'case/tab/viewport checks');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
