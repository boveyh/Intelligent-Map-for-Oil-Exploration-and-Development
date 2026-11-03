/* Supervised boundary cues; independent synthetic wells; original w1 sample is untouched. */
(function(){
  'use strict';
  var N=240, STEP=.125, FEATURES=['GR 两侧均值差','DEN 两侧均值差','GR 近点跳变','DEN 近点跳变'];
  function random(seed){return function(){var t=seed+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};}
  function well(seed,noise,audit){
    audit=audit||{};
    var rnd=random(seed), boundaries=[], levels=[], gr=[], den=[], start=0, layer=0,arG=0,arD=0,rho=audit.rho||0;
    while(start<N){var end=Math.min(N,start+20+Math.floor(rnd()*20));var facies=(layer+Math.floor(rnd()*2))%3;
      if(levels.length && facies===levels[levels.length-1].facies) facies=(facies+1)%3;
      var mg=[25,58,98][facies]+(rnd()-.5)*18, md=[2.64,2.39,2.57][facies]+(rnd()-.5)*.05;
      if(start)boundaries.push(start);levels.push({start:start,end:end,facies:facies});
      for(var i=start;i<end;i++){arG=rho*arG+Math.sqrt(1-rho*rho)*(rnd()+rnd()+rnd()-1.5);arD=rho*arD+Math.sqrt(1-rho*rho)*(rnd()+rnd()+rnd()-1.5);gr.push(mg+Math.sin(i*.15)*3+arG*noise*12);den.push(md+arD*noise*.035);}
      start=end;layer++;
    }
    // A short instrument disturbance is not a stratigraphic boundary.
    var glitch=12+Math.floor(rnd()*(N-24));gr[glitch]+=18;gr[glitch+1]-=15;
    // Audit-only perturbations leave the published default generator byte-for-byte equivalent.
    audit=audit||{};
    if(audit.transition){[gr,den].forEach(function(a){var old=a.slice(),width=audit.transition;for(var j=0;j<N;j++){var sum=0,n=0;for(var k=-width;k<=width;k++){if(j+k>=0&&j+k<N){sum+=old[j+k];n++;}}a[j]=sum/n;}});}
    if(audit.shift){for(var j=0;j<N;j++){gr[j]=gr[j]*(1-audit.shift)+55*audit.shift;den[j]=den[j]*(1-audit.shift)+2.53*audit.shift;}}
    return {seed:seed,gr:gr,den:den,boundaries:boundaries,levels:levels};
  }
  function features(w,i){
    function gap(a,k){var l=0,r=0;for(var d=0;d<k;d++){l+=a[i-1-d];r+=a[i+d];}return Math.abs(r-l)/k;}
    return [gap(w.gr,4)/60,gap(w.den,4)/.3,Math.abs(w.gr[i]-w.gr[i-1])/60,Math.abs(w.den[i]-w.den[i-1])/.3];
  }
  function sigmoid(z){return 1/(1+Math.exp(-Math.max(-30,Math.min(30,z))));}
  var cache={};
  function train(count){
    if(cache[count])return cache[count];
    var samples=[], wells=[];
    for(var n=0;n<count;n++){var w=well(1001+n*137,1);wells.push(w.seed);for(var i=5;i<N-5;i++)samples.push({x:features(w,i),y:w.boundaries.some(function(b){return Math.abs(b-i)<=1;})?1:0,well:w.seed});}
    var mean=[0,0,0,0],sd=[0,0,0,0],pos=0;
    samples.forEach(function(s){pos+=s.y;s.x.forEach(function(v,j){mean[j]+=v/samples.length;});});
    samples.forEach(function(s){s.x.forEach(function(v,j){sd[j]+=(v-mean[j])*(v-mean[j])/samples.length;});});sd=sd.map(function(v){return Math.sqrt(v)||1;});
    var X=samples.map(function(s){return [1].concat(s.x.map(function(v,j){return (v-mean[j])/sd[j];}));}),weights=[0,0,0,0,0];
    var positiveWeight=(samples.length-pos)/pos;
    for(var epoch=0;epoch<420;epoch++){
      var grad=[0,0,0,0,0];
      samples.forEach(function(s,i){var z=0;for(var j=0;j<5;j++)z+=weights[j]*X[i][j];var error=(sigmoid(z)-s.y)*(s.y?positiveWeight:1);for(var j=0;j<5;j++)grad[j]+=error*X[i][j]/samples.length;});
      for(var j=0;j<5;j++)weights[j]-=.07*(grad[j]+(j?.015*weights[j]:0));
    }
    return cache[count]={weights:weights,mean:mean,sd:sd,wells:wells,samples:samples.length,positives:pos};
  }
  function explain(w,i,model){var x=features(w,i),z=x.map(function(v,j){return (v-model.mean[j])/model.sd[j];}),terms=z.map(function(v,j){return v*model.weights[j+1];}),logit=model.weights[0]+terms.reduce(function(a,b){return a+b;},0);return {x:x,z:z,terms:terms,logit:logit,score:sigmoid(logit)};}
  function pick(scores,threshold){var chosen=[];scores.map(function(v,i){return {i:i,v:v};}).filter(function(p){return p.i>=5&&p.i<N-5&&p.v>=threshold;}).sort(function(a,b){return b.v-a.v;}).forEach(function(p){if(chosen.every(function(q){return Math.abs(p.i-q)>9;}))chosen.push(p.i);});return chosen.sort(function(a,b){return a-b;});}
  function metrics(truth,pred){var used={},tp=0;truth.forEach(function(t){var best=-1,d=3;pred.forEach(function(p,i){if(!used[i]&&Math.abs(p-t)<d){d=Math.abs(p-t);best=i;}});if(best>=0){used[best]=true;tp++;}});var fp=pred.length-tp,fn=truth.length-tp;return {tp:tp,fp:fp,fn:fn,f1:2*tp/(2*tp+fp+fn||1)};}
  function run(state){var model=train(state.count||4),w=well(state.seed||9001,state.noise==null?1:state.noise,state.audit),scores=new Array(N).fill(0),raw=new Array(N).fill(0);for(var i=5;i<N-5;i++){scores[i]=explain(w,i,model).score;raw[i]=Math.abs(w.gr[i]-w.gr[i-1]);}var pred=pick(scores,state.threshold==null?.65:state.threshold),baseline=pick(raw,18);return {model:model,well:w,scores:scores,pred:pred,baseline:baseline,ml:metrics(w.boundaries,pred),traditional:metrics(w.boundaries,baseline)};}
  function trace(r,i,delta){
    var w=Object.assign({},r.well,{gr:r.well.gr.slice()});w.gr[i]+=delta||0;
    var e=explain(w,i,r.model),jump=Math.abs(w.gr[i]-w.gr[i-1]);
    return {version:'trace-v1',caseId:'w1-boundary-learning',index:i,label:(2400+i*STEP).toFixed(3)+' m',role:'未见合成井；标签仅评价',inputs:[['GR',w.gr[i],'API'],['DEN',w.den[i],'g/cm³']].concat(FEATURES.map(function(n,j){return [n,e.x[j],'缩放后'];})),steps:FEATURES.map(function(n,j){return [n+'：z × w',e.z[j]+' × '+r.model.weights[j+1]+' = '+e.terms[j]];}).concat([['偏置',r.model.weights[0]],['logit',e.logit],['GR 相邻跳变',jump]]),prediction:{name:'逻辑回归层界分数',value:e.score,unit:'（未校准）'},baseline:{name:'同点 GR 跳变 ≥18',value:jump>=18?1:0,unit:'（1 提示）'},control:{name:'本点 GR 偏移',unit:'API',min:-40,max:40,step:2},note:'分数是候选前的逐点输出；全井候选另有间隔抑制。试算只改当前 GR，冻结模型，不改全井指标。'};
  }
  if(typeof window!=='undefined')window.W1CORE={N:N,STEP:STEP,FEATURES:FEATURES,well:well,features:features,train:train,explain:explain,pick:pick,metrics:metrics,run:run,trace:trace};

  function mount(root){
    root.innerHTML='<style>.wb{font:13px/1.7 system-ui,sans-serif;color:#28352f}.wb *{box-sizing:border-box}.wb-controls{display:flex;gap:15px;flex-wrap:wrap;padding:12px;background:#f5f3ec;border-radius:8px}.wb label{display:flex;gap:7px;align-items:center;flex-wrap:wrap}.wb input{accent-color:#2f7d6b;max-width:100%}.wb-grid{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,1fr);gap:18px;margin:16px 0}.wb svg{width:100%;height:auto;display:block}.wb h3{font-size:15px;margin:0 0 8px}.wb-metrics{display:flex;gap:12px;flex-wrap:wrap;margin:12px 0}.wb-metrics>div{flex:1;min-width:130px;border:1px solid #dcded2;border-radius:8px;padding:12px}.wb-metrics b{font-size:20px;color:#285f4c;display:block}.wb table{font-size:11px;border-collapse:collapse;width:100%}.wb th,.wb td{padding:7px 4px;border-bottom:1px solid #e6e5dc;text-align:right}.wb td:first-child,.wb th:first-child{text-align:left}.wb-note{padding:12px;background:#edf4ef;border-left:3px solid #2f7d6b;font-size:12px}.wb small{color:#657167}.wb button{cursor:pointer;border:1px solid #c7cfc3;background:white;color:#285f4c;border-radius:5px;padding:5px 8px}.wb .wb-picks{display:flex;gap:6px;flex-wrap:wrap}.wb-picks button{font-size:11px}@media(max-width:700px){.wb-grid{grid-template-columns:1fr}.wb-controls{display:grid}.wb table{font-size:10px}}</style><div class="wb"><div class="wb-controls"><label for="wbcount">训练井数 <input id="wbcount" type="range" min="1" max="6" value="4"><b id="wbcountlabel">4</b></label><label for="wbnoise">测试井噪声 <input id="wbnoise" type="range" min="0" max="30" value="10"><b id="wbnoiselabel">1.0×</b></label><button type="button" id="wbnext">换一口未见井</button></div><div class="wb-metrics" id="wbmetrics"></div><div class="wb-grid"><div id="wbprofile"></div><div><h3>这个点为什么被提示为层界？</h3><label for="wbpoint">测试深度 <b id="wbdepth"></b></label><input id="wbpoint" type="range" min="5" max="234" value="80" style="width:100%"><div id="wbevidence"></div></div></div><h3>学习模型提出的候选层界</h3><div id="wbpicks" class="wb-picks"></div><p class="wb-note" id="wbscope"></p></div>';
    var state={count:4,noise:1,seed:9001,threshold:.65},point=80,current;
    function render(reuse){
      var r=reuse?current:run(state);current=r;
      if(!reuse && r.pred.length)point=r.pred[0];
      root.querySelector('#wbmetrics').innerHTML=[['GR 跳变阈值',r.traditional],['监督层界识别',r.ml]].map(function(v){return '<div>'+v[0]+'<b>F1 '+v[1].f1.toFixed(3)+'</b><small>命中 '+v[1].tp+' · 误报 '+v[1].fp+' · 漏检 '+v[1].fn+'</small></div>';}).join('');
      var svg='<svg viewBox="0 0 430 440" role="img" aria-label="测试井 GR、DEN 与传统及学习候选层界"><text x="34" y="20" font-size="11" fill="#59665e">GR</text><text x="145" y="20" font-size="11" fill="#59665e">DEN</text><text x="245" y="20" font-size="10">阈值</text><text x="306" y="20" font-size="10">学习</text><text x="366" y="20" font-size="10">真值</text>';
      ['gr','den'].forEach(function(key,k){var pts=r.well[key].map(function(v,i){var xx=key==='gr'?24+v*.8:134+(v-2.15)*160;return xx.toFixed(1)+','+(32+i*1.6).toFixed(1);});svg+='<polyline points="'+pts.join(' ')+'" fill="none" stroke="'+(k?'#b48e51':'#2f7d6b')+'" stroke-width="1.3"/>';});
      [[r.baseline,250,'#a27e4b'],[r.pred,310,'#2f7d6b'],[r.well.boundaries,370,'#7c8981']].forEach(function(col){svg+='<path d="M'+col[1]+' 32v384" stroke="#e6e5dc"/>';col[0].forEach(function(i){svg+='<path d="M'+(col[1]-13)+' '+(32+i*1.6)+'h26" stroke="'+col[2]+'" stroke-width="2.5"/>';});});
      svg+='<path d="M17 '+(32+point*1.6)+'h385" stroke="#333f37" stroke-dasharray="3 3"/><text x="24" y="434" font-size="10" fill="#657167">2400—2430 m · 真值仅用于事后评价</text></svg>';
      root.querySelector('#wbprofile').innerHTML=svg;
      var e=explain(r.well,point,r.model);
      root.querySelector('#wbpoint').value=point;root.querySelector('#wbdepth').textContent=(2400+point*STEP).toFixed(3)+' m';
      root.querySelector('#wbevidence').innerHTML='<p>层界分数 <b>'+e.score.toFixed(3)+'</b>；当前候选阈值 0.65。分数未校准为正确概率。</p><table><thead><tr><th>曲线特征</th><th>标准化值</th><th>学得权重</th><th>实际贡献</th></tr></thead><tbody>'+FEATURES.map(function(n,j){return '<tr><td>'+n+'</td><td>'+e.z[j].toFixed(2)+'</td><td>'+r.model.weights[j+1].toFixed(2)+'</td><td>'+e.terms[j].toFixed(2)+'</td></tr>';}).join('')+'</tbody></table><p><small>偏置 '+r.model.weights[0].toFixed(2)+' + 贡献项 = '+e.logit.toFixed(2)+'，经 sigmoid 得到分数。训练只用其他井，测试井标签不进入模型。</small></p>';
      root.querySelector('#wbpicks').innerHTML=r.pred.map(function(i){return '<button type="button" data-wb-point="'+i+'">'+(2400+i*STEP).toFixed(3)+' m · '+r.scores[i].toFixed(2)+'</button>';}).join('')||'<small>本条件下无候选，请检查噪声与训练覆盖。</small>';
      root.querySelector('#wbscope').textContent='训练井 '+r.model.wells.join('、')+'，共 '+r.model.samples+' 个已标注窗口；测试井 '+r.well.seed+' 独立留出。层界容差为 2 点（0.25 m），邻近候选间隔至少 10 点。候选供人工复核，不等于已完成地层对比；仅验证合成条件。';
    }
    root.querySelector('#wbcount').addEventListener('input',function(e){state.count=+e.target.value;root.querySelector('#wbcountlabel').textContent=state.count;render();});
    root.querySelector('#wbnoise').addEventListener('input',function(e){state.noise=+e.target.value/10;root.querySelector('#wbnoiselabel').textContent=state.noise.toFixed(1)+'×';render();});
    root.querySelector('#wbpoint').addEventListener('input',function(e){point=+e.target.value;render(true);});
    root.querySelector('#wbnext').addEventListener('click',function(){state.seed+=17;render();});
    root.querySelector('#wbpicks').addEventListener('click',function(e){var b=e.target.closest('[data-wb-point]');if(b){point=+b.dataset.wbPoint;render(true);}});
    render();
    return {trace:{read:function(d){return trace(current,point,d);},range:function(){return {min:5,max:N-6,value:point};},select:function(i){point=i;render(true);}}};
  }
  if(typeof window!=='undefined'){window.W1DEMO=mount;window.__CASE_MOUNT__=mount;}
})();

/* Generated portable explanation; algorithm source above remains unchanged. */
(function(){var demo=(function install(win,name,info,installTrace,guideSteps){
  var original=win[name];
  function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');}
  function mount(root,api){
    root.innerHTML='<style>.oil-demo-method{font:12px/1.8 system-ui,sans-serif;color:#34433a;border:1px solid #d3dfd5;background:#f6f9f4;border-radius:10px;padding:15px;margin:0 0 18px}.oil-demo-method *{box-sizing:border-box}.oil-demo-method h3{font-size:16px;line-height:1.6;margin:2px 0 10px;color:#235f51}.oil-demo-method small{font-size:10px;color:#537561}.oil-demo-chain{display:flex;align-items:center;gap:9px;padding:8px 11px;background:#e8f0e7;border-radius:5px;margin-bottom:11px}.oil-demo-chain span{min-width:0;flex:1}.oil-demo-chain b{color:#2f7d6b}.oil-demo-reasons{display:grid;grid-template-columns:1fr 1fr;gap:16px}.oil-demo-reasons h4{font-size:12px;margin:0 0 3px}.oil-demo-method p{font-size:12px!important;line-height:1.8!important;margin:0!important}.oil-demo-live{margin-top:11px;padding-top:8px;border-top:1px solid #d3dfd5}.oil-demo-live p{color:#235f51;font-size:11px!important;min-height:20px}@media(max-width:600px){.oil-demo-reasons{grid-template-columns:1fr;gap:9px}.oil-demo-chain{display:block}.oil-demo-chain b{display:block;text-align:center;line-height:1.1}.oil-demo-method{padding:12px}}</style>'+
      '<section class="oil-demo-method" aria-label="智能方法与运行证据"><small>本次演示用什么、为什么起作用</small><h3>'+esc(info.name)+'</h3><div class="oil-demo-chain"><span>'+esc(info.input)+'</span><b aria-hidden="true">→</b><span>'+esc(info.operation)+'</span></div><div class="oil-demo-reasons"><div><h4>为什么可能有效</h4><p>'+esc(info.why)+'</p></div><div><h4>在这里怎样验证</h4><p>'+esc(info.try)+'</p></div></div><div class="oil-demo-live"><small>当前运行证据 · 随下方操作更新</small><p data-method-live></p></div></section><div data-method-body></div>';
    var body=root.querySelector('[data-method-body]'),live=root.querySelector('[data-method-live]');
    var mounted=original(body,api);
    if(info.audit){
      var audit=info.audit,box=root.ownerDocument.createElement('details');box.className='oil-demo-method';
      box.innerHTML='<summary><b>生成器敏感性自审 · '+esc(audit.metric)+' · 全部设置</b></summary><p>'+esc(audit.limits)+'</p><div style="overflow:auto"><table style="width:100%;font-size:11px;text-align:left"><thead><tr><th>扰动 / 设置</th><th>基线</th><th>学习</th><th>附加对照</th></tr></thead><tbody>'+audit.series.map(function(s){return '<tr><td>'+esc(s.axis)+' / '+esc(s.value)+'</td><td>'+s.baseline.toFixed(3)+'</td><td>'+s.learn.toFixed(3)+'</td><td>'+esc(s.alternate!=null?'附加对照 '+s.alternate.toFixed(3):s.denOnly!=null?'DEN 回归 '+s.denOnly.toFixed(3):s.grOnly!=null?'GR KNN '+s.grOnly.toFixed(3):s.coverage!=null?'区间覆盖 '+s.coverage.toFixed(3):'—')+'</td></tr>';}).join('')+'</tbody></table></div>'+(audit.heldout?'<p>95% 配对 bootstrap：学习−基线 F1 差区间 ['+audit.heldout.pairedDifference.map(function(v){return v.toFixed(3);}).join(', ')+']。以井/图为单位，冻结训练集；不覆盖真实井分布的不确定性。</p>':'')+'<p>2026-11-03 · 合成条件自审，未做第三方物理校准；全部种子和逐样本见公开审计文件，包内仅嵌入汇总。</p>';
      root.insertBefore(box,body);
    }
    var trace=installTrace(root,body,mounted,guideSteps||[]);
    function refresh(){var metric=body.querySelector(info.selector);live.textContent=metric?(metric.innerText||metric.textContent).replace(/\s+/g,' ').trim().slice(0,380):'操作下方控件，对照模型、基线与测试结果。';}
    refresh();
    var observer=new MutationObserver(function(){refresh();trace.refresh();});observer.observe(body,{childList:true,subtree:true,characterData:true});
    return {unmount:function(){observer.disconnect();trace.unmount();if(mounted&&typeof mounted.unmount==='function')mounted.unmount();}};
  }
  win[name]=mount;win.__CASE_MOUNT__=mount;
  return {mount:mount};
})(window,"W1DEMO",{"name":"加权逻辑回归 · 层界候选分类","input":"其他井的 GR、DEN 窗口特征＋人工层界标签","operation":"学得特征权重 → 逐点评分 → 生成层界候选","why":"层界通常在两条曲线和多个窗口上产生一致变化。模型从已标注井学习这些变化的组合，减轻单个 GR 跳点造成的误报；曲线响应弱或薄层相邻时仍会漏检。","try":"提高测试噪声、改变训练井数，比较两种方法的误报与漏检；选一个深度点追查实际权重贡献。","selector":"#wbmetrics","audit":{"metric":"F1 ↑","limits":"窗口四点，候选间隔十点，容差两点；相关噪声不必然降低 F1。对比压缩和宽响应会破坏窗口可分性；本审计不给真实井噪声阈值。","heldout":{"baseline":[0.7912087912087912,0.8414985590778098],"learn":[0.9807692307692307,1],"pairedDifference":[0.14521315216263875,0.2025371173957139]},"series":[{"axis":"rho","value":0,"baseline":0.8158640226628895,"learn":0.9903536977491961},{"axis":"rho","value":0.5,"baseline":0.9363057324840764,"learn":0.9903536977491961},{"axis":"rho","value":0.85,"baseline":0.9456869009584664,"learn":0.9903536977491961},{"axis":"transition","value":0,"baseline":0.8158640226628895,"learn":0.9903536977491961},{"axis":"transition","value":2,"baseline":0.14201183431952663,"learn":0.9903536977491961},{"axis":"transition","value":4,"baseline":0,"learn":0.43},{"axis":"transition","value":8,"baseline":0,"learn":0},{"axis":"shift","value":0,"baseline":0.8158640226628895,"learn":0.9903536977491961},{"axis":"shift","value":0.3,"baseline":0.9006622516556292,"learn":0.9870967741935484},{"axis":"shift","value":0.6,"baseline":0.6833333333333333,"learn":0.5727272727272728},{"axis":"shift","value":0.85,"baseline":0,"learn":0}]}},function installTrace(root, body, mounted, guideSteps) {
  if (!mounted || !mounted.trace) return {refresh:function(){},unmount:function(){}};
  var api=mounted.trace, doc=root.ownerDocument, panel=doc.createElement('section');
  panel.className='oil-trace';panel.setAttribute('aria-label','单点可追查证据');
  panel.innerHTML='<style>.oil-trace,.oil-guide{font:12px/1.8 system-ui,sans-serif;color:#34433a;border:1px solid #d3dfd5;background:#fbfcf8;border-radius:9px;padding:14px;margin:16px 0;scroll-margin-top:190px}.oil-trace *,.oil-guide *{box-sizing:border-box}.oil-trace h3{font-size:16px;margin:0 0 5px}.oil-trace-controls{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:10px 0}.oil-trace label{display:grid;gap:4px;min-width:150px;flex:1}.oil-trace input{width:100%;min-width:0;accent-color:#2f7d6b}.oil-trace button,.oil-guide button{padding:6px 10px;background:#fff;border:1px solid #a8bdb0;color:#235f51;border-radius:5px;cursor:pointer;font:inherit}.oil-trace-grid{display:grid;grid-template-columns:1fr 1.5fr;gap:14px}.oil-trace dl{margin:0}.oil-trace dl>div{display:grid;grid-template-columns:minmax(90px,1fr) minmax(0,2fr);border-bottom:1px solid #e4e8dc;padding:5px 0;gap:8px}.oil-trace dt,.oil-trace dd{margin:0;overflow-wrap:anywhere}.oil-trace-summary{padding:10px;background:#edf4ed;border-radius:5px}.oil-trace small{display:block;color:#607465}.oil-guide{display:flex;gap:10px;align-items:center;flex-wrap:wrap;background:#eff5ec}.oil-guide p{flex:1;min-width:160px;margin:0!important;font-size:12px!important}.oil-guide-target{outline:3px solid #b08850!important;outline-offset:5px;scroll-margin-top:110px}.oil-trace :focus-visible,.oil-guide :focus-visible{outline:3px solid #2f7d6b;outline-offset:3px}@media(max-width:650px){.oil-trace-grid{grid-template-columns:1fr}.oil-trace{padding:10px}.oil-trace-controls{display:grid;grid-template-columns:minmax(0,1fr)}.oil-trace label{min-width:0}}</style><h3>追查这一个判断</h3><small data-trace-role></small><div class="oil-trace-controls"><label><span data-trace-point-name>深度 / 候选点</span> <input type="range" data-trace-point aria-label="单点证据的深度或候选点"></label><label><span data-trace-control-label>输入试算</span><input type="range" value="0" data-trace-delta aria-label="单点输入偏移"></label><button type="button" data-trace-reset>恢复原输入</button><button type="button" data-trace-export>导出本点证据</button><button type="button" data-trace-worst>定位回归误差最大点</button></div><p class="oil-trace-summary" data-trace-summary tabindex="-1" role="status" aria-live="polite" aria-atomic="true"></p><div class="oil-trace-grid"><div><b>实际输入</b><dl data-trace-inputs></dl></div><div><b>真实中间量</b><dl data-trace-steps></dl></div></div><small data-trace-note></small>';
  root.appendChild(panel);
  if(api.name){panel.querySelector('[data-trace-point-name]').textContent=api.name;panel.querySelector('[data-trace-point]').setAttribute('aria-label',api.name);}
  var point=panel.querySelector('[data-trace-point]'),delta=panel.querySelector('[data-trace-delta]'),lastIndex=null;
  function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');}
  function fmt(v){return typeof v==='number'?Number(v.toFixed(5)):String(v).replace(/-?\d+\.\d{6,}/g,function(n){return Number(Number(n).toFixed(5));});}
  function rows(values){return values.map(function(v){return '<div><dt>'+esc(v[0])+'</dt><dd>'+esc(fmt(v[1]))+(v[2]?' '+esc(v[2]):'')+'</dd></div>';}).join('');}
  function refresh(){
    var range=api.range();point.min=range.min;point.max=range.max;point.value=range.value;
    if(range.value!==lastIndex){delta.value=0;lastIndex=range.value;}
    var trial=Number(delta.value)||0,record=api.read(trial);
    if(!record){panel.querySelector('[data-trace-summary]').textContent='当前没有可追查的候选；这是候选生成的失效边界。';return;}
    var c=record.control;delta.step=c.step;delta.min=c.min;delta.max=c.max;delta.value=trial;
    panel.querySelector('[data-trace-control-label]').textContent=c.name+' '+fmt(Number(delta.value))+' '+c.unit+'（单点试算）';
    panel.querySelector('[data-trace-role]').textContent=record.role+' · trace-v1';
    panel.querySelector('[data-trace-inputs]').innerHTML=rows(record.inputs);
    panel.querySelector('[data-trace-steps]').innerHTML=rows(record.steps);
    panel.querySelector('[data-trace-summary]').textContent=record.label+'：'+record.prediction.name+' '+fmt(record.prediction.value)+' '+record.prediction.unit+'；'+record.baseline.name+' '+fmt(record.baseline.value)+' '+record.baseline.unit;
    panel.querySelector('[data-trace-note]').textContent=record.note;
    // The exact structured record also supports external reproducibility checks.
    record.trialDelta=Number(delta.value)||0;panel.traceRecord=record;
  }
  point.addEventListener('input',function(){api.select(Number(point.value));delta.value=0;refresh();});
  delta.addEventListener('input',refresh);
  panel.querySelector('[data-trace-reset]').addEventListener('click',function(){delta.value=0;refresh();});
  panel.querySelector('[data-trace-export]').addEventListener('click',function(){if(!panel.traceRecord)return;var a=doc.createElement('a');a.href='data:application/json;charset=utf-8,'+encodeURIComponent(JSON.stringify(panel.traceRecord,null,2));a.download=panel.traceRecord.caseId+'-point-'+panel.traceRecord.index+'.json';a.click();});
  var worst=panel.querySelector('[data-trace-worst]');worst.hidden=!api.worst;if(api.worstLabel)worst.textContent=api.worstLabel;
  worst.addEventListener('click',function(){api.select(api.worst());delta.value=0;refresh();panel.querySelector('[data-trace-summary]').focus();});
  function onProfile(){refresh();panel.scrollIntoView({block:'center',behavior:'auto'});}
  body.addEventListener('tracechange',onProfile);
  var guide=doc.createElement('nav');guide.className='oil-guide';guide.setAttribute('aria-label','30—60 秒演示路径');
  guide.innerHTML='<b>30—60 秒演示路径</b><p data-guide-text role="status" aria-live="polite">按三步检查输入、判断依据与传统对照。完成时间需在真人测试中记录。</p><button type="button" data-guide-next>开始引导</button><button type="button" data-guide-stop hidden>结束引导</button>';
  root.insertBefore(guide,body);
  var step=-1,target=null,originalTabIndex=null;
  function clearTarget(){if(target){target.classList.remove('oil-guide-target');if(originalTabIndex===null)target.removeAttribute('tabindex');else target.setAttribute('tabindex',originalTabIndex);target=null;}}
  function stop(){clearTarget();step=-1;guide.querySelector('[data-guide-next]').textContent='重新引导';guide.querySelector('[data-guide-stop]').hidden=true;}
  guide.querySelector('[data-guide-stop]').addEventListener('click',stop);
  guide.querySelector('[data-guide-next]').addEventListener('click',function(){
    clearTarget();step++;
    if(step>=guideSteps.length){stop();guide.querySelector('[data-guide-text]').textContent='请复述：用了什么输入？哪个中间量支持判断？传统方法在同一点输出什么？完成引导不等于测试通过。';return;}
    var s=guideSteps[step];guide.querySelector('[data-guide-text]').textContent=(step+1)+'/'+guideSteps.length+' · '+s[1];
    guide.querySelector('[data-guide-next]').textContent=step===guideSteps.length-1?'完成引导':'下一步';guide.querySelector('[data-guide-stop]').hidden=false;
    target=root.querySelector(s[0]);if(target){originalTabIndex=target.getAttribute('tabindex');target.setAttribute('tabindex','0');target.classList.add('oil-guide-target');target.scrollIntoView({behavior:'auto',block:'center'});target.focus({preventScroll:true});}
  });
  refresh();
  return {refresh:refresh,unmount:function(){clearTarget();body.removeEventListener('tracechange',onProfile);}};
},[["#wbnoise","提高测试噪声，比较误报与漏检。"],["[data-trace-point]","选一个深度，读 GR/DEN 和四个窗口贡献。"],["[data-trace-delta]","只改当前 GR，比较逻辑分数与同点 GR 跳变提示。"]]);if(typeof module!=="undefined")module.exports=demo;})();
