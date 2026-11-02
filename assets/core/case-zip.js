/* ZIP is an input adapter: extracted Files use the original importer and validation. */
(function(global){
  'use strict';
  var LIMIT=6*1024*1024,ARCHIVE_LIMIT=8*1024*1024;
  var crcTable=new Uint32Array(256);
  for(var n=0;n<256;n++){var c=n;for(var k=0;k<8;k++)c=(c&1)?0xEDB88320^(c>>>1):c>>>1;crcTable[n]=c>>>0;}
  function crc(bytes){var c=0xFFFFFFFF;for(var i=0;i<bytes.length;i++)c=crcTable[(c^bytes[i])&255]^(c>>>8);return(c^0xFFFFFFFF)>>>0;}
  function pathName(bytes,utf8){
    var name;try{name=new TextDecoder('utf-8',{fatal:true}).decode(bytes);}catch(e){if(utf8)throw Error('ZIP 文件名编码损坏');name=new TextDecoder('gb18030',{fatal:true}).decode(bytes);}
    name=name.replace(/\\/g,'/');
    if(/^[\/]|^[a-z]:|\0/i.test(name)||name.replace(/\/$/,'').split('/').some(function(s){return!s||s==='.'||s==='..';}))throw Error('ZIP 包含无效路径：'+name);
    return name;
  }
  function directory(bytes){
    if(bytes.length<22||bytes.length>ARCHIVE_LIMIT)throw Error('请选择不超过 8 MB 的 ZIP；展开文件上限仍为 6 MB');
    var v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),end=-1;
    for(var p=bytes.length-22;p>=Math.max(0,bytes.length-65557);p--)if(v.getUint32(p,true)===0x06054B50&&p+22+v.getUint16(p+20,true)===bytes.length){end=p;break;}
    if(end<0)throw Error('ZIP 不完整或格式无效，请重新压缩');
    var count=v.getUint16(end+10,true),size=v.getUint32(end+12,true),offset=v.getUint32(end+16,true);
    if(v.getUint16(end+4,true)||v.getUint16(end+6,true)||v.getUint16(end+8,true)!==count)throw Error('暂不支持分卷 ZIP，请合并为一个普通 ZIP');
    if(count===65535||size===0xFFFFFFFF||offset===0xFFFFFFFF)throw Error('暂不支持 ZIP64，请使用普通 ZIP');
    if(!count||count>256||offset+size>end)throw Error('ZIP 文件数量或目录无效（最多 256 项）');
    var entries=[],names=new Set(),total=0,at=offset;
    for(var j=0;j<count;j++){
      if(at+46>offset+size||v.getUint32(at,true)!==0x02014B50)throw Error('ZIP 目录损坏');
      var flags=v.getUint16(at+8,true),method=v.getUint16(at+10,true),compressed=v.getUint32(at+20,true),length=v.getUint32(at+24,true);
      var nameLength=v.getUint16(at+28,true),extra=v.getUint16(at+30,true),comment=v.getUint16(at+32,true),local=v.getUint32(at+42,true);
      if(at+46+nameLength+extra+comment>offset+size)throw Error('ZIP 目录被截断');
      var name=pathName(bytes.subarray(at+46,at+46+nameLength),!!(flags&2048));
      if(flags&0x2041)throw Error('不支持加密 ZIP，请先去掉密码');
      if(method!==0&&method!==8)throw Error('请使用普通 ZIP（Store 或 Deflate 压缩）');
      if(v.getUint16(at+34,true)||length===0xFFFFFFFF||compressed===0xFFFFFFFF||local===0xFFFFFFFF)throw Error('不支持分卷或 ZIP64 条目');
      if(((v.getUint32(at+38,true)>>>16)&0xF000)===0xA000)throw Error('案例 ZIP 中不能包含符号链接');
      if(names.has(name.toLowerCase()))throw Error('ZIP 中有重复路径：'+name);names.add(name.toLowerCase());
      total+=length;if(total>LIMIT)throw Error('ZIP 展开后超过原案例包的 6 MB 上限');
      if(local+30>offset||v.getUint32(local,true)!==0x04034B50)throw Error('ZIP 文件头损坏：'+name);
      var localName=v.getUint16(local+26,true),start=local+30+localName+v.getUint16(local+28,true);
      if(start>offset||start+compressed>offset||v.getUint16(local+8,true)!==method||(v.getUint16(local+6,true)&0x2041))throw Error('ZIP 文件内容不完整：'+name);
      if(pathName(bytes.subarray(local+30,local+30+localName),!!(flags&2048))!==name)throw Error('ZIP 路径记录不一致：'+name);
      if(!/\/$/.test(name)&&!/(^|\/)(__MACOSX|\.DS_Store|Thumbs\.db)(\/|$)/i.test(name))entries.push({name:name,method:method,length:length,crc:v.getUint32(at+16,true),compressed:bytes.subarray(start,start+compressed)});
      at+=46+nameLength+extra+comment;
    }
    if(at!==offset+size)throw Error('ZIP 目录长度不一致');
    var manifests=entries.filter(function(e){return /(^|\/)(case|[a-z0-9._-]+\.case)\.json$/i.test(e.name);});
    if(manifests.length>1)throw Error('一个 ZIP 请只放一个案例（发现多个清单）');
    var manifest=manifests[0]||entries.filter(function(e){return /\.json$/i.test(e.name);})[0];
    if(!manifest)throw Error('ZIP 中没有找到 case.json 清单');
    var prefix=manifest.name.slice(0,manifest.name.lastIndexOf('/')+1);
    return entries.filter(function(e){return e.name.indexOf(prefix)===0;}).map(function(e){e.name=e.name.slice(prefix.length);return e;});
  }
  async function unpack(input){
    var bytes=input instanceof Uint8Array?input:new Uint8Array(input),entries=directory(bytes),out=[];
    for(var entry of entries){
      var data;
      if(entry.method===0)data=entry.compressed.slice();
      else{
        var inflater;try{inflater=new global.DecompressionStream('deflate-raw');}catch(e){throw Error('当前浏览器不支持 ZIP 解压；请先解压为文件夹再添加');}
        var reader=new Blob([entry.compressed]).stream().pipeThrough(inflater).getReader(),chunks=[],length=0;
        try{for(;;){var part=await reader.read();if(part.done)break;length+=part.value.length;if(length>entry.length||length>LIMIT){await reader.cancel();throw Error('ZIP 解压大小不符合目录或超过 6 MB');}chunks.push(part.value);}}catch(e){await reader.cancel().catch(function(){});throw Error('解压失败：'+entry.name+'；'+e.message);}
        data=new Uint8Array(length);var pos=0;chunks.forEach(function(chunk){data.set(chunk,pos);pos+=chunk.length;});
      }
      if(data.length!==entry.length||crc(data)!==entry.crc)throw Error('ZIP 校验失败（文件可能损坏）：'+entry.name);
      out.push({name:entry.name,data:data});
    }
    return out;
  }
  global.CaseZip={unpack:unpack};
  if(typeof module!=='undefined')module.exports=global.CaseZip;
  if(typeof document==='undefined')return;

  var job=0,forwarding=false;
  function enhance(){
    var modal=document.getElementById('import-modal');if(!modal||modal.querySelector('#imp-pick-zip'))return;
    var choices=modal.querySelector('.imp-choose'),button=document.createElement('button'),input=document.createElement('input'),status=document.createElement('p');
    button.id='imp-pick-zip';button.type='button';button.className='btn sm ghost';button.textContent='选择 ZIP 压缩包';
    input.type='file';input.accept='.zip,application/zip';input.hidden=true;input.id='imp-zip';
    status.id='imp-zip-status';status.setAttribute('role','status');status.style.cssText='font-size:11px;line-height:1.8;margin:8px 0 0;color:var(--jade-d)';status.textContent='支持直接选择或拖入 ZIP；展开后沿用原案例校验。';
    choices.appendChild(button);modal.querySelector('#imp-drop').appendChild(input);choices.parentNode.appendChild(status);
    modal.querySelector('#imp-drop > b').textContent='拖入案例文件夹或 ZIP，也可点击选择';
    modal.querySelector('.imp-flow li:nth-child(2) span').textContent='选择文件、文件夹或 ZIP';
    modal.querySelector('.imp-sub').textContent='案例需包含 case.json、演示文件及素材。ZIP 无需手动解压，可带案例目录；展开文件总量不超过 6 MB，所属场景和内容照常校验。';
    button.addEventListener('click',function(e){e.stopPropagation();input.click();});input.addEventListener('click',function(e){e.stopPropagation();});
    input.addEventListener('change',function(){if(input.files[0])readZip(input.files[0]);input.value='';});
  }
  async function readZip(file){
    enhance();var modal=document.getElementById('import-modal'),status=modal.querySelector('#imp-zip-status');
    modal.querySelector('#imp-clear').click();
    var mine=++job;
    status.style.color='var(--jade-d)';status.textContent='正在解压 '+file.name+'…';
    try{
      if(file.size>ARCHIVE_LIMIT)throw Error('ZIP 超过 8 MB；展开文件上限为 6 MB');
      var entries=await unpack(await file.arrayBuffer());
      if(mine!==job||modal.hidden)return;
      var transfer=new DataTransfer();entries.forEach(function(e){transfer.items.add(new File([e.data],e.name));});
      var original=modal.querySelector('#imp-file');original.files=transfer.files;forwarding=true;
      try{original.dispatchEvent(new Event('change',{bubbles:true}));}finally{forwarding=false;}
      status.textContent='已展开 '+entries.length+' 个文件，继续按原规则校验；通过后点“校验并添加”。';
    }catch(e){if(mine!==job||modal.hidden)return;status.style.color='var(--bad)';status.textContent=e.message;}
  }
  function zipFiles(files){return Array.from(files||[]).filter(function(f){return /\.zip$/i.test(f.name);});}
  document.addEventListener('click',function(e){if(e.target.closest('[data-import],#imp-clear,#import-modal [data-close]')){job++;enhance();var status=document.getElementById('imp-zip-status');if(status)status.textContent='支持直接选择或拖入 ZIP；展开后沿用原案例校验。';}});
  document.addEventListener('change',function(e){if(forwarding||!/^imp-(file|dir)$/.test(e.target.id))return;job++;var zips=zipFiles(e.target.files);if(!zips.length){var status=document.getElementById('imp-zip-status');if(status)status.textContent='当前按文件或文件夹读取，沿用原案例校验。';return;}e.stopImmediatePropagation();enhance();if(zips.length!==1||e.target.files.length!==1){document.getElementById('imp-zip-status').textContent='请一次只选择一个案例 ZIP。';return;}readZip(zips[0]);e.target.value='';},true);
  document.addEventListener('drop',function(e){if(!e.target.closest('#imp-drop'))return;var zips=zipFiles(e.dataTransfer&&e.dataTransfer.files);if(!zips.length)return;e.preventDefault();e.stopImmediatePropagation();e.target.closest('#imp-drop').classList.remove('on');enhance();if(zips.length!==1||e.dataTransfer.files.length!==1){document.getElementById('imp-zip-status').textContent='请一次只拖入一个案例 ZIP。';return;}readZip(zips[0]);},true);
})(typeof window==='undefined'?globalThis:window);
