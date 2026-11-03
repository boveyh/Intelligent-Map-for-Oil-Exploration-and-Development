'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),vm=require('vm');
const {methods,wrapSource}=require('../cases/shared/demo-method.js'),root=path.resolve(__dirname,'..');
assert.strictEqual(Object.keys(methods).length,9);
for(const id of Object.keys(methods)){
 const raw=fs.readFileSync(path.join(root,'cases',id,'demo/demo.js'),'utf8');
 const generated=fs.readFileSync(path.join(root,'packages',id,'demo/demo.js'),'utf8');
 assert(generated.startsWith(raw),'Algorithm source modified by wrapper: '+id);new Function(generated);
 assert(generated.includes(methods[id].name)&&generated.includes(methods[id].why)&&generated.includes('当前运行证据'));
 assert.strictEqual(generated,fs.readFileSync(path.join(root,'assets/cases',id+'.demo.js'),'utf8'));
}
let callback,disconnected=false,originalUnmounted=false;
const metric={innerText:'实际指标 1.2'},body={querySelector:()=>metric},live={textContent:''};
const host={innerHTML:'',ownerDocument:{createElement:()=>({innerHTML:'',className:''})},insertBefore(){},querySelector:s=>s==='[data-method-body]'?body:live};
const context={window:{DEMO:()=>({unmount(){originalUnmounted=true;}})},module:{exports:{}},MutationObserver:class{constructor(fn){callback=fn;}observe(){}disconnect(){disconnected=true;}}};
vm.runInNewContext(wrapSource('','w2-reservoir-param','DEMO'),context);
const handle=context.module.exports.mount(host,{});
assert.strictEqual(live.textContent,'实际指标 1.2');metric.innerText='实际指标 2.3';callback();assert.strictEqual(live.textContent,'实际指标 2.3');
handle.unmount();assert(disconnected&&originalUnmounted);
console.log('PASS: nine portable method/why/verification panels; original algorithms retained; live evidence reflects demo output; observer cleanup');
