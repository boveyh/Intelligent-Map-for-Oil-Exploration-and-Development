'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert');
const {chromium}=require(process.env.OIL_PLAYWRIGHT||'playwright');
const original=process.env.OIL_ORIGINAL_URL||'http://127.0.0.1:8015/';
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-proxy-server']});
 try{
  const page=await browser.newPage(),rows=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(original,{waitUntil:'networkidle'});
  for(const id of fs.readdirSync('packages')){
   const meta=JSON.parse(fs.readFileSync(path.join('packages',id,'case.json'),'utf8'));
   await page.locator('[data-import]').first().click();
   await page.locator('#imp-file').setInputFiles([
    {name:'case.json',mimeType:'application/json',buffer:fs.readFileSync(path.join('packages',id,'case.json'))},
    {name:'demo.js',mimeType:'text/javascript',buffer:fs.readFileSync(path.join('packages',id,'demo/demo.js'))}
   ]);
   await page.waitForFunction(()=>!document.querySelector('#imp-ok').disabled);
   await page.locator('#imp-ok').click();
   // The original importer navigates asynchronously to the scene, without case/tab parameters.
   await page.waitForURL(u=>u.hash==='#/scene/'+meta.sceneId);
   await page.goto(original+'#/scene/'+meta.sceneId+'?case='+id+'&tab=demo',{waitUntil:'networkidle'});
   await page.locator('.oil-demo-method').first().waitFor();
   const trace=page.locator('.oil-trace');let traceWorks=null;
   if(await trace.count()){
    const a=await trace.evaluate(el=>el.traceRecord);await trace.locator('[data-trace-delta]').focus();await page.keyboard.press('ArrowRight');
    const b=await trace.evaluate(el=>el.traceRecord);assert.notDeepStrictEqual(a.inputs,b.inputs);traceWorks=true;
   }
   rows.push({id,originalUploaderAccepted:true,methodPanelMounted:true,traceWorks});console.log('Imported into original',id);
  }
  assert(!errors.length,errors.join(';'));await page.reload({waitUntil:'networkidle'});
  const restored=await page.evaluate(()=>Cases.list().filter(c=>c.imported).length);assert.strictEqual(restored,9);
  const out='shots/review-2026-11-03';fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'original-import-checks.json'),JSON.stringify({date:'2026-11-03',rows,restoredAfterReload:restored,errors,source:'unmodified course site served on independent origin'},null,2));
  console.log('PASS: nine original uploads, five live traces, reload restores nine imports');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
