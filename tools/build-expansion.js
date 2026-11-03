'use strict';
const fs=require('fs'),path=require('path'),{createMath}=require('../cases/expansion/math'),{mountExpansion}=require('../cases/expansion/runtime'),{definitions}=require('../cases/expansion/catalog');
const root=path.resolve(__dirname,'..');
for(const d of definitions){
 const folder=path.join(root,'cases',d.id);fs.mkdirSync(path.join(folder,'demo'),{recursive:true});
 fs.writeFileSync(path.join(folder,'content.js'),"/* Generated entry; edit cases/expansion/catalog.js and template.js. */\nmodule.exports=K=>require('../expansion/template').make("+JSON.stringify(d.id)+",K);\n");
 const factory=require('../cases/expansion/'+d.key),source='/* Generated portable demo; source: cases/expansion/{math,'+d.key+',runtime,catalog}.js. */\n(function(){\n\'use strict\';\nconst S=('+createMath.toString()+')();\nconst C=('+factory.toString()+')(S);\nconst D='+JSON.stringify(d)+';\nfunction mount(root,api){return ('+mountExpansion.toString()+')(root,api,C,D);}\nwindow.ExpansionCores=window.ExpansionCores||{};window.ExpansionCores[D.id]=C;\nwindow[D.globalName]=mount;window.__CASE_MOUNT__=mount;\nif(typeof module!=="undefined")module.exports={mount};\n})();\n';
 new Function(source);fs.writeFileSync(path.join(folder,'demo/demo.js'),source);console.log('Prepared '+d.id);
}
