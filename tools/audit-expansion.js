'use strict';
// Frozen-model condition audit. These seeds were chosen after development, not used for fitting.
const fs=require('fs'),path=require('path'),assert=require('assert'),crypto=require('crypto');
const {definitions}=require('../cases/expansion/catalog'),{createMath}=require('../cases/expansion/math');
const S=createMath(),count=8,report={date:'2026-11-03',version:1,scope:'Eight independent objects per setting, paired across settings. Synthetic condition audit, not physical validation or human evaluation. No audit-driven retuning.',cases:{}};
for(const [ci,d]of definitions.entries()){
 const C=require('../cases/expansion/'+d.key)(S),seeds=Array.from({length:count},(_,i)=>900001+ci*10000+i*97),frozen=C.model?C.model():null;
 if(frozen&&frozen.seeds)assert(seeds.every(s=>!frozen.seeds.includes(s)));
 const metric=['r5','co4','c2','pr2'].includes(d.key)?'RMSE（越低越好）':d.key==='p3'?'NDCG（越高越好）':d.key==='e3'?'预算16次所选配方参考响应（越高越好）':'F1（定义见模型源码，越高越好）';
 const c={id:d.id,title:d.title,metric,limits:d.boundary+' 八个独立对象的配对平均；操作条件与生成扰动分别标注。不代表真实数据泛化。',sourceSHA256:crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname,'../cases/expansion',d.key+'.js'))).digest('hex'),seeds,trainingSeeds:frozen&&frozen.seeds||[],defaults:d.defaults,axes:d.axes,series:[]};
 for(let ai=0;ai<3;ai++)for(const value of d.audits[ai]){
  const config={...d.defaults,[['a','b','c'][ai]]:value},rows=seeds.map(seed=>{const r=C.run({...config,seed}),scores={...r.scores};assert(Number.isFinite(scores.learn)&&Number.isFinite(scores.baseline),d.id+' nonfinite metric');return{seed,...scores};});
  const row={axis:d.axes[ai].name,value,config,rows};for(const key of Object.keys(rows[0]).filter(k=>k!=='seed'&&typeof rows[0][k]==='number'))row[key]=S.mean(rows.map(r=>r[key]));c.series.push(row);
 }
 report.cases[d.id]=c;console.log(d.id+': '+c.series.map(r=>r.learn.toFixed(3)+'/'+r.baseline.toFixed(3)).join(' '));
}
const out=path.resolve(__dirname,'../docs/evidence');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'expansion-audit.json'),JSON.stringify(report,null,2)+'\n');
let md='# 十三例扩展条件审计\n\n2026-11-03。每例三类条件、每类三档、每档八个独立测试对象，共 936 次推理运行。模型与生成器在选择这些留出种子前冻结；本轮不据此重新调参。数据、响应函数与偏好均为作者构造，未做物理参数校准，不是现场成绩。\n\n随机种子、配置、逐对象分数在 [JSON](expansion-audit.json)，可执行 `node tools/audit-expansion.js` 复算。固定历史模型的训练种子见 JSON 和各 factory 的 model()；e3 按已做实验序贯更新，没有跨任务预训练。前处理参考段、候选边界和硬约束是明确给定条件。\n\n三类条件包括生成噪声、分布/关系变化及操作设定（如预测跨度、化验延迟、测点缺失）。它们不是同一种扰动；曲线也不保证单调。八对象只适于小规模合成审计；对象内相关点不能当作独立样本。\n';
for(const c of Object.values(report.cases)){md+='\n## '+c.title+'\n\n'+c.metric+'。'+c.limits+'\n\n|条件|档位|学习|基线|附加对照|\n|---|---:|---:|---:|---:|\n';for(const r of c.series)md+='|'+r.axis+'|'+r.value+'|'+r.learn.toFixed(4)+'|'+r.baseline.toFixed(4)+'|'+(r.alternate==null?'—':r.alternate.toFixed(4))+'|\n';const worse=c.series.filter(r=>c.metric.startsWith('RMSE')?r.learn>r.baseline:r.learn<r.baseline);md+='\n学习分支弱于主列基线的档位：'+(worse.length?worse.map(r=>r.axis+'='+r.value).join('、'):'本组未观察到；不等于已证明普遍优势')+'。\n';}
md+='\n## 如何理解生成假设\n\n各例 `cases/expansion/<key>.js` 的 generate/response 函数是完整假设。钻井、气测、管道使用带操作事件的合成序列；地震是二维反射纹理加错断；地化是相关背景加局部异常；跨井是共享潜在层段加噪声/伸缩/缺层；套管是椭圆加局部凹陷。顶替、分段、配方、产量与质量是简化响应函数，射孔是虚拟规格和偏好。专业链接只帮助理解任务，不证明本生成器的数值合理。\n\n附加对照依次为：钻井多信号规则、地化独立标准距离融合、管道流量与压力组合规则、跨井同序号关联、射孔默认候选、配方规则网格、产量递减模型；其他例无此列。质量化验沿用误差另在JSON的 delayedLabRMSE，覆盖在 coverage。主指标不跨任务比较。管道事件F1不等于定位准确率，射孔排序接近规则时不应宣称明显收益，代理回归RMSE低不等于最优方案可靠，置信带应读实际覆盖；更多变量和学习模型都可能输给强规则。完整模型路径和同点对照在演示中可追查。\n';
fs.writeFileSync(path.join(out,'expansion-audit.md'),md);console.log('Wrote expansion audit: 13 cases / 117 settings / 936 runs');
