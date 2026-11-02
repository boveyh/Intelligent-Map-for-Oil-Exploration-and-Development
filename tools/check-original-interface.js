'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert'),crypto=require('crypto');
const root=path.resolve(__dirname,'..');
const original=process.argv[2] || path.join(process.env.USERPROFILE||'', 'Downloads','石油勘探开发智能化案例集');
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const files=['assets/core/case-upload.js','assets/core/case-demo-host.js','assets/core/registry.js','assets/cases/welllog-layer.case.js','assets/cases/welllog-layer.demo.js','firstbreak-pick-case/case.json','firstbreak-pick-case/demo/index.html','firstbreak-pick-case/demo/demo.js','firstbreak-pick-case/demo/demo.css'];
for(const file of files)assert.strictEqual(hash(path.join(root,file)),hash(path.join(original,file)),file+' changed from original');

for(const id of fs.readdirSync(path.join(root,'packages'))){
  const manifest=JSON.parse(fs.readFileSync(path.join(root,'packages',id,'case.json'),'utf8'));
  assert(['w1','w2','w3','w4','w5','m1','c1','pr1'].includes(manifest.sceneId));
  assert.strictEqual(manifest.tabs.demo.mode,'module');
  assert.strictEqual(manifest.tabs.demo.js,'demo/demo.js');
  assert(!('customScene' in manifest));
}
console.log('PASS: original upload/registry/demo-host/sample files unchanged; original scene IDs and module manifest retained');
