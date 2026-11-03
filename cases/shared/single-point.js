'use strict';

// Serialized into each portable demo. Uses the mounted demo's current inference state.
function installTrace(root, body, mounted, guideSteps) {
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
}
const guides={
  'w1-boundary-learning':[['#wbnoise','提高测试噪声，比较误报与漏检。'],['[data-trace-point]','选一个深度，读 GR/DEN 和四个窗口贡献。'],['[data-trace-delta]','只改当前 GR，比较逻辑分数与同点 GR 跳变提示。']],
  'w2-reservoir-param':[['#w2n','确认整井留出，改变训练井数量。'],['[data-trace-worst]','定位本剖面回归误差最大点，查看五个邻居。'],['[data-trace-delta]','改本点 DEN，解释距离与孔隙度均值的变化，并对照公式。']],
  'w3-imaging-fracture':[['#w3cutoff','读未胜出结论，再改阈值看误报/漏检。'],['[data-trace-point]','选一条候选，读四个真实路径特征及贡献。'],['[data-trace-delta]','改变预处理路径响应，比较分类器与 Hough；解释筛选会漏掉什么。']],
  'w4-lithology':[['#w4sd','改变刻度漂移，理解曲线可比性。'],['[data-trace-point]','选择一个深度，读实际五个邻居、距离和票数。'],['[data-trace-delta]','扰动本点 GR，再对照同点传统分档；票数不是正确概率。']],
  'w5-completion':[['#w5sL','拉长缺口，再比较回归、插值和邻井。'],['[data-trace-worst]','定位本剖面遮蔽区回归误差最大点，读输入及三项贡献。'],['[data-trace-delta]','只改本点 GR，说明补全为何变化；DEN 真值不能进入推理。']]
};
require('../expansion/catalog').definitions.forEach(d=>{guides[d.id]=[['#ex-0','改变 '+d.axes[0].name+'，确认当前测试条件。'],['#ex-scene',d.task+' 选择具体对象；观察实际输入与学习/传统输出。'],['[data-trace-delta]','改一个输入、读真实中间量，再恢复；复述模型在哪一步起作用。']];});
module.exports={installTrace,guides};
