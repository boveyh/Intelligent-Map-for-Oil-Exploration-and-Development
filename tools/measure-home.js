'use strict';
const fs=require('fs'),path=require('path'),{chromium}=require(process.env.OIL_PLAYWRIGHT||'playwright');
const url=process.argv[2]||'http://127.0.0.1:8014/',label=process.argv[3]||'after';
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-proxy-server']}),rows=[];
 try{for(let i=0;i<3;i++){
  const context=await browser.newContext({viewport:{width:1280,height:900}}),page=await context.newPage();
  await page.goto(url+(url.includes('?')?'&':'?')+'perf='+label+'-'+i,{waitUntil:'networkidle',timeout:45000});await page.waitForSelector('.home-case svg');
  rows.push(await page.evaluate(()=>({readyMs:performance.now(),fcpMs:performance.getEntriesByName('first-contentful-paint')[0]?.startTime,requests:performance.getEntriesByType('resource').length,decodedBytes:performance.getEntriesByType('resource').reduce((s,r)=>s+r.decodedBodySize,0),encodedBytes:performance.getEntriesByType('resource').reduce((s,r)=>s+r.encodedBodySize,0),resources:performance.getEntriesByType('resource').map(r=>({url:r.name.split('?')[0],decodedBytes:r.decodedBodySize,encodedBytes:r.encodedBodySize}))})));
  console.log(label,i,JSON.stringify({...rows.at(-1),resources:undefined}));await context.close();
 }}finally{await browser.close();}
 const folder=path.resolve(__dirname,'../shots/review-2026-11-03');fs.mkdirSync(folder,{recursive:true});fs.writeFileSync(path.join(folder,'performance-'+label+'.json'),JSON.stringify({url,route:'direct HTTPS; browser --no-proxy-server',viewport:'1280x900',cache:'new context per run; CDN cache uncontrolled',throttle:'none',rows},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
