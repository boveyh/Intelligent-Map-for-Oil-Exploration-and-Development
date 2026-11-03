'use strict';
const {chromium}=require(process.env.OIL_PLAYWRIGHT||'playwright'),assert=require('assert'),fs=require('fs'),{definitions}=require('../cases/expansion/catalog');
const base=process.env.OIL_TEST_URL||'http://127.0.0.1:8014/';
(async()=>{const b=await chromium.launch({channel:'chrome',headless:true,args:['--no-proxy-server']});try{
 const page=await b.newPage({viewport:{width:1280,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base,{waitUntil:'networkidle'});await page.screenshot({path:'shots/expansion/home.png'});
 assert.strictEqual(await page.locator('[data-module]').count(),13);for(const d of definitions)assert(await page.locator('a[href*="case='+d.id+'&"]').count(),d.id+' missing home entry');
 await page.goto(base+'docs/evidence.html',{waitUntil:'networkidle'});await page.waitForFunction(()=>document.querySelector('#case').options.length===18);
 for(const d of definitions){await page.locator('#case').selectOption(d.id);assert.strictEqual(await page.locator('#axis option').count(),3);assert.strictEqual(await page.locator('#results tr').count(),4);assert(!(await page.locator('#chart').innerHTML()).includes('NaN'));}
 await page.screenshot({path:'shots/expansion/audit-viewer.png'});assert((await page.locator('#status').innerText()).includes('179'));
 await page.goto(base+'#/scene/e3?case=e3-formulation-search&tab=demo',{waitUntil:'networkidle'});await page.locator('.oil-trace').waitFor();await page.emulateMedia({reducedMotion:'reduce'});await page.locator('#ex-scene').scrollIntoViewIfNeeded();const before=await page.locator('.oil-trace').evaluate(e=>e.traceRecord.index);await page.locator('[data-ex-play]').click();await page.waitForTimeout(900);assert.strictEqual(await page.locator('.oil-trace').evaluate(e=>e.traceRecord.index),before,'reduced motion advanced replay');
 assert(!errors.length,errors.join(';'));fs.writeFileSync('shots/expansion/presentation-checks.json',JSON.stringify({base,homeModules:13,allNewEntries:true,auditCases:18,auditSettings:179,allNewAxesAndTables:true,reducedMotionSuspendsReplay:true,errors},null,2));console.log('PASS: home entries, 18-case/179-setting viewer and reduced motion');
 }finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
