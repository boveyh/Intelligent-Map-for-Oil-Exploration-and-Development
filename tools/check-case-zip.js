'use strict';
const assert=require('assert'),{execFileSync}=require('child_process');
const Zip=require('../assets/core/case-zip.js');
// Independent Python standard-library writer exercises both Store and Deflate archives.
const fixtures=JSON.parse(execFileSync('python',['-c',String.raw`
import io,zipfile,json,base64
def pack(entries,method=zipfile.ZIP_DEFLATED):
 b=io.BytesIO()
 with zipfile.ZipFile(b,'w',compression=method) as z:
  for name,data in entries:z.writestr(name,data)
 return base64.b64encode(b.getvalue()).decode()
valid=[('案例/包/case.json','{"id":"zip-test"}'),('案例/包/demo/demo.js','module.exports={mount(){}}'),('案例/包/demo/icon.png',bytes([0,255,17,128])),('案例/包/empty.txt',''),('__MACOSX/._file','ignored')]
print(json.dumps({'store':pack(valid,zipfile.ZIP_STORED),'deflate':pack(valid),'traversal':pack([('case.json','{}'),('../demo.js','x')]),'duplicates':pack([('case.json','{}'),('CASE.JSON','{}')]),'missing':pack([('demo/demo.js','x')]),'multiple':pack([('a/case.json','{}'),('b/case.json','{}')]),'oversize':pack([('case.json','{}'),('demo/data.bin',b'x'*(7*1024*1024))]),'unsupported':pack([('case.json','{}')],zipfile.ZIP_BZIP2)}))
`],{encoding:'utf8',maxBuffer:1024*1024}));
const bytes=name=>new Uint8Array(Buffer.from(fixtures[name],'base64'));
const central=data=>Buffer.from(data).indexOf(Buffer.from([0x50,0x4b,0x01,0x02]));
(async()=>{
 for(const type of ['store','deflate']){
  const files=await Zip.unpack(bytes(type));
  assert.deepStrictEqual(files.map(f=>f.name),['case.json','demo/demo.js','demo/icon.png','empty.txt']);
  assert.strictEqual(new TextDecoder().decode(files[0].data),'{"id":"zip-test"}');
  assert.deepStrictEqual([...files[2].data],[0,255,17,128]);assert.strictEqual(files[3].data.length,0);
 }
 for(const [name,re]of [['traversal',/路径/],['duplicates',/重复/],['missing',/清单/],['multiple',/多个清单/],['oversize',/6 MB/],['unsupported',/Store 或 Deflate/]])await assert.rejects(Zip.unpack(bytes(name)),re,name);
 const encrypted=bytes('store');encrypted[6]|=1;encrypted[central(encrypted)+8]|=1;await assert.rejects(Zip.unpack(encrypted),/加密/);
 const corrupt=bytes('store');corrupt[central(corrupt)+16]^=1;await assert.rejects(Zip.unpack(corrupt),/校验失败/);
 const dishonest=bytes('oversize'),view=new DataView(dishonest.buffer);let c=central(dishonest);c+=46+view.getUint16(c+28,true)+view.getUint16(c+30,true)+view.getUint16(c+32,true);view.setUint32(c+24,1,true);
 await assert.rejects(Zip.unpack(dishonest),/大小不符合|6 MB/,'Inflate limit must check actual bytes, not only directory sizes');
 await assert.rejects(Zip.unpack(bytes('deflate').slice(0,-7)),/ZIP/);
 console.log('PASS: Python Store/Deflate ZIP; nested/Unicode paths; binary/empty files; root normalization; duplicate/traversal/encrypted/corrupt/oversize/multiple manifests rejected; bounded inflate');
})().catch(e=>{console.error(e);process.exitCode=1;});
