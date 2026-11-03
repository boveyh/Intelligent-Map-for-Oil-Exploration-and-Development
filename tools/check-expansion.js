'use strict';
const assert=require('assert'),fs=require('fs'),{definitions}=require('../cases/expansion/catalog'),{createMath}=require('../cases/expansion/math'),S=createMath(),rows=[];
for(const d of definitions){
 const C=require('../cases/expansion/'+d.key)(S),r=C.run({...d.defaults,seed:880007}),indexes=[0,Math.floor(r.points.length*.43),r.points.length-1];
 for(const i of indexes){
  const a=C.trace(r,i,0),b=C.trace(r,i,(r.control.max-r.control.min)/4);
  assert.strictEqual(a.version,'trace-v1');assert.strictEqual(a.caseId,d.id);assert.strictEqual(a.inputs.length,r.featureNames.length);
  assert(Math.abs(a.prediction.value-r.points[i].pred)<1e-9,d.id+' separate prediction path');
  assert(a.steps.length&&a.inputs.every(t=>Number.isFinite(t[1])));assert(Number.isFinite(b.prediction.value));
  // Clamped physical controls can have no effect at a boundary; the interior point must change.
  if(i===indexes[1]){assert.notDeepStrictEqual(a.inputs,b.inputs,d.id+' decorative input');assert.notDeepStrictEqual(a.steps,b.steps,d.id+' decorative evidence');}
  const old=r.points[i].truth;r.points[i].truth=old+998;const hidden=C.trace(r,i,0);assert.deepStrictEqual(a.prediction,hidden.prediction,d.id+' test-label leakage');r.points[i].truth=old;
 }
 if(C.features&&C.generate&&['d2','t1','m2','pr2'].includes(d.key)){
  const w=C.generate(881003,d.defaults),t=40,copy=JSON.parse(JSON.stringify(w));
  for(const key of Object.keys(copy))if(Array.isArray(copy[key])){
   if(Array.isArray(copy[key][0]))copy[key].forEach(a=>a.forEach((v,i)=>{if(i>t)a[i]=v==null?null:v+1000;}));
   else copy[key].forEach((v,i)=>{if(i>t&&typeof v==='number')copy[key][i]=v+1000;});
  }
  assert.deepStrictEqual(C.features(w,t,7),C.features(copy,t,7),d.id+' future feature leakage');
  if(C.observedArrivals)assert.deepStrictEqual(C.observedArrivals(w,t),C.observedArrivals(copy,t),d.id+' future arrival leakage');
 }
 if(d.key==='e3'){
  for(const strategy of ['active','random','grid']){const h=C.campaign(880007,d.defaults,strategy);assert.strictEqual(h.calls,16);assert.strictEqual(new Set(h.history.map(q=>q.index)).size,16);}
  assert.strictEqual(C.next(C.X,r.history.slice(0,3)),r.history[3].index);
  const final=r.model.n;r.setStep(4);assert.strictEqual(r.model.n,4);assert.strictEqual(r.view.observations.length,4);assert.strictEqual(final,16);
 }
 assert(Number.isFinite(r.scores.learn)&&Number.isFinite(r.scores.baseline));
 rows.push({id:d.id,traceSameCalculation:true,inputChangesEvidence:true,testTruthIsolated:true,causalityChecked:['d2','t1','m2','pr2'].includes(d.key),scores:r.scores});
 console.log('PASS',d.id);
}
global.window={};require('../assets/data.js');const coverage=new Set(definitions.map(d=>window.ATLAS.index.byId[d.sceneId].stageId));assert.strictEqual(coverage.size,13);
fs.mkdirSync('shots/expansion',{recursive:true});fs.writeFileSync('shots/expansion/model-checks.json',JSON.stringify({date:'2026-11-03',rows,all13OriginalModules:true},null,2));
console.log('PASS: 13 real models, 39 same-path traces, input/evidence response, label isolation, causal windows, equal experiment budgets and all original modules');
