'use strict';
const {installTrace,guides}=require('./single-point.js');
const methods={
  'w1-boundary-learning':{name:'加权逻辑回归 · 层界候选分类',input:'其他井的 GR、DEN 窗口特征＋人工层界标签',operation:'学得特征权重 → 逐点评分 → 生成层界候选',why:'层界通常在两条曲线和多个窗口上产生一致变化。模型从已标注井学习这些变化的组合，减轻单个 GR 跳点造成的误报；曲线响应弱或薄层相邻时仍会漏检。',try:'提高测试噪声、改变训练井数，比较两种方法的误报与漏检；选一个深度点追查实际权重贡献。',selector:'#wbmetrics'},
  'w2-reservoir-param':{name:'KNN 五近邻回归 · 孔隙度预测',input:'训练井 DEN、GR、CNL＋岩心孔隙度标签',operation:'按训练统计量标准化 → 找五个近邻 → 取其孔隙度均值',why:'密度公式采用固定骨架假设；多曲线相似样本还包含泥质等响应信息。相似曲线组合的已知孔隙度提供局部参考。但本轮审计中，DEN 单曲线回归优于多曲线 KNN；更多输入和更复杂方法不自动带来收益。刻度漂移、样本覆盖不足仍会降低效果。',try:'比较学习法与密度公式在泥质段的误差；切换按井/随机划分，观察同井近邻造成的评价偏差。',selector:'.w2-kpi'},
  'w3-imaging-fracture':{name:'Hough 候选＋逻辑回归筛选',input:'合成井壁图像＋其他图像中标注的路径候选',operation:'搜索正弦路径 → 提取连续性/反差 → 按学习分数筛选',why:'单条暗线不一定是天然裂缝。分类器学习路径响应、覆盖与邻域反差的组合，帮助筛掉部分干扰；筛选也可能拒绝真裂缝，且不能补回候选阶段的遗漏。',try:'同图切换 Hough 与学习筛选，再调整阈值；同时看误报和漏检，不只看图面是否更干净。',selector:'#w3comparison'},
  'w4-lithology':{name:'KNN 五近邻投票 · 岩性分类',input:'带岩性标签的训练井 GR、DEN 曲线',operation:'比较曲线特征距离 → 找五个实际近邻 → 标签投票',why:'不同岩性可能有相近 GR，多变量邻域能利用密度信息区分。井内标准化减少刻度漂移对距离的影响；类别重叠或训练样本不足时仍会分错。',try:'依次对照 GR、原始 KNN 和标准化 KNN；定位分歧深度，查看实际近邻、距离与票数。',selector:'.w4-kpi'},
  'w5-completion':{name:'多元线性回归 · 缺失曲线重建',input:'当前井可见段的 GR、AC、CNL 与 DEN 配对样本',operation:'拟合 DEN 回归系数 → 用仍可观测曲线估计遮蔽段',why:'相关曲线仍携带岩性与孔隙信息，长缺失段可以借助这些信息重建，而线性插值只连接两端。关系变化时回归也会失配；补全值始终是估计。',try:'增加缺失长度，对照插值、邻井借值与多曲线回归的误差和区间覆盖，检查曲线平滑是否真代表准确。',selector:'.w5-kpi'},
  'w5-normalization':{name:'分布对齐 · 智能解释前处理配套',input:'参考井与目标井的标志层 GR 分布',operation:'平移/均方/分位数映射 → 比较校正后的可比性',why:'相同地层可能因仪器刻度不同而整体偏移，对齐可减少后续模型遇到的输入漂移。这一步不是独立学习模型；把真实地质差异强行对齐也可能引入偏差。',try:'切换校正方法和漂移，比较重合度与净毛比偏差；不要只凭两条分布靠近就断言下游更准。',selector:'.n5-kpi'},
  'm1-cuttings':{name:'最近质心分类＋主动挑选标注',input:'合成色调、粒径、分选、反应特征＋少量标签',operation:'从已标注样本形成类别质心 → 优先补标难分样本',why:'四种特征共同提供类别线索，补标边界附近样本可以改善质心估计。深度归位错误会让分类与井段错配；本例不处理真实显微照片。',try:'在相同标注预算下切换随机/主动策略，再改变迟到校正，观察分类分数与深度岩性柱。',selector:'.m1-kpi'},
  'c1-cement':{name:'标定样本的多特征最近质心分类',input:'四段已评级样本的幅度、能量与周向代理量',operation:'形成四类特征质心 → 判别其余 36 段',why:'幅度相近的胶结状态，在额外特征上可能不同。样本标定的多变量距离能利用这些差异，但周向量是合成代理输入，常规 CBL/VDL 不直接提供它。',try:'对照单幅度阈值与多特征法，只对未标定段评分；调参会重新标定，不能当作冻结模型跨井验证。',selector:'.c1-kpi'},
  'pr1-dynamometer':{name:'七维特征的最近质心工况分类',input:'合成示功图＋六类已标定工况样本',operation:'提取形状与波纹特征 → 标准化距离 → 最近类别',why:'相近轮廓还可能在残差波纹上不同，补充特征能提供振动线索。但噪声也会制造波纹，因此新增特征并非总有收益，距离相似度也不是正确概率。',try:'同一张卡开关波纹特征，追查实际距离项；再提高噪声，结合 180 张测试卡看振动召回的变化。',selector:'.pr-kpi'}
};

require('../expansion/catalog').definitions.forEach(d=>{methods[d.id]={name:d.method,input:d.input,operation:d.operation,why:d.why,try:'先走三步引导；改变'+d.axes.map(p=>p.name).join('、')+'，并选一个对象查看实际计算、同点对照和失败。',selector:'#ex-metrics'};});

function install(win,name,info,installTrace,guideSteps){
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
}
function wrapSource(source,id,globalName){
  const info=Object.assign({},methods[id]);if(!methods[id])return source;
  const fs=require('fs'),path=require('path');
  for(const name of ['generator-audit.json','expansion-audit.json']){const auditPath=path.join(__dirname,'../../docs/evidence',name);if(fs.existsSync(auditPath)){const report=JSON.parse(fs.readFileSync(auditPath,'utf8')),item=Object.values(report.cases).find(c=>c.id===id);if(item)info.audit={metric:item.metric,limits:item.limits,heldout:item.heldout,series:item.series.map(s=>({axis:s.axis,value:s.value,baseline:s.baseline,learn:s.learn,denOnly:s.denOnly,grOnly:s.grOnly,coverage:s.coverage,alternate:s.alternate}))};}}
  return source+'\n/* Generated portable explanation; algorithm source above remains unchanged. */\n'+
    '(function(){var demo=('+install.toString()+')(window,'+JSON.stringify(globalName)+','+JSON.stringify(info)+','+installTrace.toString()+','+JSON.stringify(guides[id]||[])+');if(typeof module!=="undefined")module.exports=demo;})();\n';
}
module.exports={methods,wrapSource};
