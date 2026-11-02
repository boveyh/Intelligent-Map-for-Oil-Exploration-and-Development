'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),vm=require('vm');
global.window={};
require('../cases/w4-lithology/demo/demo.js');
const W=window.W4CORE,source=fs.readFileSync(path.join(__dirname,'../assets/core/home-demo.js'),'utf8');

// Exercise the real component with a controlled clock; visual motion is checked in the browser.
function setup(reduce=false){
  function element(){const classes=new Set();return {dataset:{},events:{},attrs:{},textContent:'',innerHTML:'',classList:{toggle(k,on){if(on)classes.add(k);else classes.delete(k);},contains(k){return classes.has(k);},add(k){classes.add(k);}},setAttribute(k,v){this.attrs[k]=v;},addEventListener(k,fn){this.events[k]=fn;}};}
  const nodes={},root=element(),methods=['raw','standard'].map(method=>Object.assign(element(),{dataset:{homeMethod:method}}));
  root.querySelector=k=>nodes[k]||(nodes[k]=element());root.querySelectorAll=()=>methods;
  const events={},mediaEvents={},timers=new Map(),media={matches:reduce,addEventListener(k,fn){mediaEvents[k]=fn;},removeEventListener(k){delete mediaEvents[k];}};
  let now=0,id=0,observer;
  const document={hidden:false,addEventListener(k,fn){events[k]=fn;},removeEventListener(k){delete events[k];}};
  const win={W4CORE:W,matchMedia:()=>media,performance:{now:()=>now},setInterval(fn){timers.set(++id,fn);return id;},clearInterval(i){timers.delete(i);},IntersectionObserver:function(fn){observer={fn,disconnected:false,observe(){},disconnect(){this.disconnected=true;}};return observer;}};
  vm.runInNewContext(source,{window:win,document});
  const handle=win.HomeLithology.mount(root);
  return {root,nodes,methods,events,media,mediaEvents,timers,document,observer,handle,advance(ms){now+=ms;for(const fn of timers.values())fn();},pause(){nodes['[data-home-pause]'].events.click();},point(){nodes['[data-home-point]'].events.click();}};
}

const t=setup(),result=()=>t.nodes['#home-case-result'].textContent;
const run=W.run({nWells:4,drift:1.2,overlap:.35,seed:20261024});
const index=run.test.findIndex((_,i)=>run.pred[0][i]!==run.pred[3][i]);
const proof=W.explainKNN(run.train,run.test[index],true);
assert(result().startsWith(run.test[index].depth.toFixed(3)+' m'));
assert(result().includes('（'+proof.votes[proof.prediction]+'/5 票）'));
assert.strictEqual((t.nodes['#home-case-viz'].innerHTML.match(/class="hc-vote"/g)||[]).length,5);
for(const n of proof.neighbors)assert(t.nodes['#home-case-viz'].innerHTML.includes('井 '+n.sample.well+' · '+n.distance.toFixed(2)));
assert.strictEqual(t.root.dataset.phase,'input');
t.advance(1800);assert.strictEqual(t.root.dataset.phase,'learn');
t.advance(3000);assert.strictEqual(t.root.dataset.phase,'result');
const first=result();t.advance(3300);assert.notStrictEqual(result(),first,'Autoplay did not advance depth');
t.pause();const frozen=result(),phase=t.root.dataset.phase;t.advance(20000);
assert.strictEqual(result(),frozen);assert.strictEqual(t.root.dataset.phase,phase);
assert.strictEqual(t.nodes['[data-home-pause]'].attrs['aria-pressed'],'true');
t.point();assert.notStrictEqual(result(),frozen,'Manual depth selection failed while paused');
assert(t.root.classList.contains('static-frame'));
const standard=t.nodes['#home-case-viz'].innerHTML;t.methods[0].events.click();
assert.notStrictEqual(t.nodes['#home-case-viz'].innerHTML,standard,'Method selection did not recompute actual neighbors');
t.pause();assert(!t.root.classList.contains('static-frame'));
t.observer.fn([{isIntersecting:false}]);const offscreen=result();t.advance(10000);assert.strictEqual(result(),offscreen);
t.observer.fn([{isIntersecting:true}]);t.advance(8100);assert.notStrictEqual(result(),offscreen);
t.document.hidden=true;t.events.visibilitychange();const hidden=result();t.advance(10000);assert.strictEqual(result(),hidden);
t.document.hidden=false;t.events.visibilitychange();t.advance(8100);assert.notStrictEqual(result(),hidden);
t.handle.unmount();assert.strictEqual(t.timers.size,0);assert.strictEqual(Object.keys(t.events).length,0);assert.strictEqual(Object.keys(t.mediaEvents).length,0);assert(t.observer.disconnected);
const r=setup(true),staticResult=r.nodes['#home-case-result'].textContent;r.advance(20000);
assert.strictEqual(r.nodes['#home-case-result'].textContent,staticResult);assert(r.root.classList.contains('static-frame'));r.handle.unmount();
console.log('PASS: actual KNN votes; input/vote/result playback; pause/manual controls; visibility/offscreen suspension; reduced motion; unmount cleanup');
