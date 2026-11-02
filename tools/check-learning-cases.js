'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path');
global.window={};
require('../cases/w1-boundary-learning/demo/demo.js');
require('../cases/w3-imaging-fracture/demo/demo.js');
const W=window.W1CORE,M=window.W3CORE;
const a=W.metrics([10,20],[11,12,40]);
assert.deepStrictEqual(a,{tp:1,fp:2,fn:1,f1:.4});
assert.deepStrictEqual(W.pick([0,0,0,0,0,.8,.9,0,0,0,0,0,0,0,0,0,.85],.7),[6,16]);
const r=W.run({count:4,seed:9001,noise:1});
assert(!r.model.wells.includes(r.well.seed));
const changed=Object.assign({},r.well,{boundaries:[],levels:[]});
for(const i of [12,37,80,134,210]){
  const e=W.explain(r.well,i,r.model);
  assert.deepStrictEqual(W.explain(changed,i,r.model),e,'Test labels entered w1 inference');
  assert(Math.abs(e.logit-r.model.weights[0]-e.terms.reduce((a,b)=>a+b,0))<1e-12);
}
const classifier=M.trainClassifier();
assert(classifier.positives>0&&classifier.positives<classifier.samples);
assert(classifier.weights.slice(1).some(v=>Math.abs(v)>.01));
const heldout={w1:[],w3:[]};
// These held-out seeds are evaluated only after freezing features, fitting and default thresholds.
for(let i=0;i<20;i++){
  const seed=32001+i*17,q=W.run({count:4,seed,noise:1});
  assert(!q.model.wells.includes(seed));
  assert(q.pred.every(p=>p>=5&&p<W.N-5));
  heldout.w1.push({seed,baseline:q.traditional,learn:q.ml});
}
for(let i=0;i<20;i++){
  const seed=20001+i*19;
  assert(!classifier.seeds.includes(seed));
  const q=M.run({seed,dip:30+i%7*5,azim:i*31%360,aper:2+i%4,noise:6+i%4*6,nf:3,induced:i%2===0});
  assert.deepStrictEqual(M.hough(q.sal),q.dets,'Hough baseline behavior changed');
  q.learning.candidates.forEach(d=>{
    const e=d.proof;
    assert(e.score>=0&&e.score<=1);
    assert(Math.abs(e.logit-classifier.weights[0]-e.terms.reduce((a,b)=>a+b,0))<1e-10);
  });
  assert(q.detsML.every(d=>q.learning.candidates.includes(d)&&d.mlScore>=.5));
  heldout.w3.push({seed,baseline:q.mH,learn:q.mL,proposed:q.learning.candidates.length,retained:q.detsML.length});
}
function aggregate(rows,key){const s=rows.reduce((a,r)=>({tp:a.tp+r[key].tp,fp:a.fp+r[key].fp,fn:a.fn+r[key].fn}),{tp:0,fp:0,fn:0});s.f1=2*s.tp/(2*s.tp+s.fp+s.fn||1);return s;}
heldout.summary={w1:{baseline:aggregate(heldout.w1,'baseline'),learn:aggregate(heldout.w1,'learn')},w3:{baseline:aggregate(heldout.w3,'baseline'),learn:aggregate(heldout.w3,'learn')}};
const output=path.resolve(__dirname,'../docs/learning-heldout-2026-11-01.json');
fs.writeFileSync(output,JSON.stringify(heldout,null,2));
console.log('PASS: held-out wells/images, labels excluded from inference, actual contributions, unchanged Hough baseline');
console.log(JSON.stringify(heldout.summary));
