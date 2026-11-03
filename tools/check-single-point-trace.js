'use strict';
const assert=require('assert');
global.window={};
for(const id of ['w1-boundary-learning','w2-reservoir-param','w3-imaging-fracture','w4-lithology','w5-completion'])require('../cases/'+id+'/demo/demo.js');
const {W1CORE:A,__W2TEST__:B,W3CORE:C,W4CORE:D,W5CORE:E}=window;
const results=[];
function contract(name,read,delta,expected){
 const a=read(0),b=read(delta);assert(a&&b,name+' missing trace');
 assert.strictEqual(a.version,'trace-v1');assert.strictEqual(a.caseId,name);
 for(const k of ['inputs','steps']){assert(a[k].length);assert.notDeepStrictEqual(a[k],b[k],name+' decorative '+k);}
 assert(a.role&&a.baseline.name&&a.control.name);assert(!/NaN|undefined/.test(JSON.stringify(a)));
 expected(a,b);results.push({case:name,inputsChanged:true,intermediatesChanged:true,predictionBefore:a.prediction.value,predictionAfter:b.prediction.value});
}
const a=A.run({count:4,seed:32001,noise:1}),ai=a.pred[0];
contract('w1-boundary-learning',d=>A.trace(a,ai,d),20,(x,y)=>{assert.strictEqual(x.prediction.value,A.explain(a.well,ai,a.model).score);assert.notStrictEqual(x.prediction.value,y.prediction.value);});
const b=B.evaluate(B.buildWells(),10,'well');
contract('w2-reservoir-param',d=>B.trace(b,80,d),.1,(x,y)=>{assert.strictEqual(x.prediction.value,b.profile[80]*100);assert.notStrictEqual(x.prediction.value,y.prediction.value);const e=B.explainKNN(b.model,b.profileTruth[80]);assert(Math.abs(e.prediction-e.neighbors.reduce((s,n)=>s+n.sample.phi/5,0))<1e-12);for(const n of e.neighbors)assert(Math.abs(n.distance**2-n.terms.reduce((s,v)=>s+v,0))<1e-10);});
const c=C.run({seed:20001,dip:38,azim:120,aper:3,noise:6,nf:3,induced:false});
contract('w3-imaging-fracture',d=>C.trace(c,0,d),-.08,(x,y)=>{assert.strictEqual(x.prediction.value,c.learning.candidates[0].proof.score);assert.notStrictEqual(x.prediction.value,y.prediction.value);});
assert.deepStrictEqual(C.selectLearning(c.learning.candidates,.5),c.detsML);
const d=D.run({nWells:4,drift:1.2,overlap:.35,seed:20261024});
contract('w4-lithology',v=>D.trace(d,80,v),60,x=>{assert.strictEqual(x.prediction.value,D.FACIES[d.pred[3][80]].name);});
const e=E.buildWell({seed:20261026}),nb=E.buildWell({seed:5150,jit:.04,tie:.35}),g=[[208,223]],ei=213,er=E.fillReg(e,g);
contract('w5-completion',d=>E.trace(e,g,nb,ei,d),30,(x,y)=>{assert.strictEqual(x.prediction.value,er.den[ei]);assert.notStrictEqual(x.prediction.value,y.prediction.value);});
// Remove/change evaluation-only labels. Inference and evidence must remain identical.
assert.deepStrictEqual(A.trace({...a,well:{...a.well,boundaries:[],levels:[]}},ai,0),A.trace(a,ai,0));
const noPhi={...b,profileTruth:b.profileTruth.map(q=>({...q,phi:999}))};assert.deepStrictEqual(B.trace(noPhi,80,0),B.trace(b,80,0));
assert.deepStrictEqual(C.trace({...c,truth:[]},0,0),C.trace(c,0,0));
assert.deepStrictEqual(D.trace({...d,test:d.test.map(q=>({...q,facies:4}))},80,0),D.trace(d,80,0));
const hidden={...e,den:e.den.slice()};for(let i=g[0][0];i<=g[0][1];i++)hidden.den[i]=999;
assert.deepStrictEqual(E.trace(hidden,g,nb,ei,0),E.trace(e,g,nb,ei,0));
console.log('PASS: trace-v1 in all five main cases; changed actual input changes intermediate evidence; zero delta equals inference; means/contributions share inference; evaluation labels excluded');
console.log(JSON.stringify(results));
