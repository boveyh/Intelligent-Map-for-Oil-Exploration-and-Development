'use strict';
// Replays production generators and inference. No thresholds or weights are tuned here.
const fs=require('fs'),path=require('path'),assert=require('assert');
global.window={};
for(const id of ['w1-boundary-learning','w2-reservoir-param','w3-imaging-fracture','w4-lithology','w5-completion'])require('../cases/'+id+'/demo/demo.js');
const {W1CORE:A,__W2TEST__:B,W3CORE:C,W4CORE:D,W5CORE:E}=window;
const folder=path.resolve(__dirname,'../docs/evidence');fs.mkdirSync(folder,{recursive:true});
const config={version:1,bootstrap:{seed:17071,iterations:2000,unit:'paired whole well/image',interval:'percentile 2.5/97.5; conditional on frozen training set'},
 w1:{seeds:Array.from({length:20},(_,i)=>32001+i*17),trainCount:4,noise:1,threshold:.65,axes:{rho:[0,.5,.85],transition:[0,2,4,8],shift:[0,.3,.6,.85]}},
 w2:{seeds:[20261023,20261037,20261051,20261065,20261079],trainWells:B.WELL_ORDER,testWells:B.TESTW,axes:{denShift:[0,.03,.07,.12],cnlShift:[0,.04,.08,.16],noiseScale:[0,1,2,4]}},
 w3:{seeds:Array.from({length:20},(_,i)=>20001+i*19),threshold:.5,axes:{noiseMultiplier:[1,2,4,8],apertureMultiplier:[1,.5,2,3],dropout:[0,.15,.35,.6]}},
 w4:{seeds:[20261024,20261038,20261052,20261066,20261080],nWells:4,axes:{drift:[1.2,2,3,4],overlap:[.35,.65,.9,1.2],warp:[0,.2,.5,1]}},
 w5:{seeds:[20261026,20261040,20261054,20261068,20261082],neighborSeed:5150,axes:{noiseScale:[1,2,4,8],denShift:[0,.04,.08,.16],gapLength:[.5,2,4,8],mechanism:['random','washout','casing']}}};
function rng(seed){return()=>{let t=seed+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
function aggregate(rows,key){const t=rows.reduce((a,r)=>({tp:a.tp+r[key].tp,fp:a.fp+r[key].fp,fn:a.fn+r[key].fn}),{tp:0,fp:0,fn:0});return {...t,f1:2*t.tp/(2*t.tp+t.fp+t.fn||1),precision:t.tp/(t.tp+t.fp||1),recall:t.tp/(t.tp+t.fn||1)};}
function bootstrap(rows){const random=rng(config.bootstrap.seed),values=[[],[],[]];for(let i=0;i<config.bootstrap.iterations;i++){const sampled=rows.map(()=>rows[Math.floor(random()*rows.length)]),b=aggregate(sampled,'baseline').f1,m=aggregate(sampled,'learn').f1;[b,m,m-b].forEach((v,j)=>values[j].push(v));}return Object.fromEntries(['baseline','learn','pairedDifference'].map((n,j)=>{values[j].sort((a,b)=>a-b);return[n,[values[j][49],values[j][1949]]];}));}
function pooled(rows,key,weight='n'){let n=0,s=0;for(const r of rows){n+=r[weight];s+=r[weight]*r[key]**2;}return Math.sqrt(s/n);}
function series(axes,make){return Object.entries(axes).flatMap(([axis,values])=>values.map(value=>make(axis,value)));}
const report={version:'generator-audit-v1',date:'2026-11-03',command:'node tools/audit-generators.js',config,selectionPolicy:'All listed settings and seeds reported; no model selection. These tests are now observed and must not be reused as a fresh test set.',cases:{}};

console.log('w1: frozen training wells; paired test-only changes');
const w1=series(config.w1.axes,(axis,value)=>{
 const rows=config.w1.seeds.map(seed=>{const r=A.run({count:4,seed,noise:1,audit:{[axis]:value}});return{seed,baseline:r.traditional,learn:r.ml};});
 return{axis,value,rows,baseline:aggregate(rows,'baseline').f1,learn:aggregate(rows,'learn').f1,metric:'F1 ↑'};
});
report.cases.w1={id:'w1-boundary-learning',title:'层界监督识别',metric:'F1 ↑',series:w1,heldout:bootstrap(w1[0].rows),limits:'窗口四点，候选间隔十点，容差两点；相关噪声不必然降低 F1。对比压缩和宽响应会破坏窗口可分性；本审计不给真实井噪声阈值。'};

console.log('w2: frozen training pool; same-test DEN ablation');
const w2models=config.w2.seeds.map(seed=>{const wells=B.buildWells({seed}),train=config.w2.trainWells.flatMap(i=>wells[i].pts);return{seed,train,model:B.fitKNN(train),den:B.fitDen(train)};});
const w2=series(config.w2.axes,(axis,value)=>{
 const rows=w2models.map(m=>{const wells=B.buildWells({seed:m.seed,[axis]:value}),test=B.TESTW.flatMap(i=>wells[i].pts),y=test.map(q=>q.phi),pred=test.map(q=>B.explainKNN(m.model,q).prediction),den=test.map(q=>m.den.intercept+m.den.slope*q.den),formula=test.map(q=>q.formula);
  return{seed:m.seed,n:y.length,rmse:B.rmse(y,pred)*100,denRMSE:B.rmse(y,den)*100,formulaRMSE:B.rmse(y,formula)*100,r2:B.r2(y,pred),denR2:B.r2(y,den),formulaR2:B.r2(y,formula)};});
 return{axis,value,rows,baseline:pooled(rows,'formulaRMSE'),learn:pooled(rows,'rmse'),denOnly:pooled(rows,'denRMSE'),metric:'RMSE / p.u. ↓'};
});
report.cases.w2={id:'w2-reservoir-param',title:'储层参数解释',metric:'RMSE / p.u. ↓',series:w2,limits:'DEN 公式采用固定砂岩骨架，DEN 单变量回归由同一训练集拟合且在基准上优于多曲线 KNN；不能只与经验公式比。输入/方法对照是生成器条件结果，不是因果证明。训练顺序改为固定井号。'};

console.log('w3: frozen classifier; original held-out images and threshold diagnostics');
const w3base=config.w3.seeds.map((seed,i)=>({seed,dip:30+i%7*5,azim:i*31%360,aper:2+i%4,noise:6+i%4*6,nf:3,induced:i%2===0}));
const w3=series(config.w3.axes,(axis,value)=>{
 const rows=w3base.map(p=>{const q={...p};if(axis==='noiseMultiplier')q.noise*=value;if(axis==='apertureMultiplier')q.aper*=value;if(axis==='dropout')q.dropout=value;const r=C.run(q);return{seed:p.seed,baseline:r.mH,learn:r.mL,candidates:r.learning.candidates.map(d=>({y0:d.y0,A:d.A,az:d.az,score:d.mlScore,label:C.evaluate(r.truth,[d]).tp>0?1:0})),truth:r.truth};});
 return{axis,value,rows,baseline:aggregate(rows,'baseline').f1,learn:aggregate(rows,'learn').f1,metric:'F1 ↑'};
});
const baseRows=w3[0].rows;
const thresholdCurve=Array.from({length:21},(_,i)=>{
 const threshold=i/20,rows=baseRows.map(r=>({learn:C.evaluate(r.truth,C.selectLearning(r.candidates.map(d=>({...d,mlScore:d.score})),threshold))}));
 const labels=baseRows.flatMap(r=>r.candidates);let tp=0,fp=0,tn=0,fn=0;for(const d of labels){if(d.score>=threshold){if(d.label)tp++;else fp++;}else if(d.label)fn++;else tn++;}
 return{threshold,object:aggregate(rows,'learn'),candidate:{tp,fp,tn,fn,tpr:tp/(tp+fn||1),fpr:fp/(fp+tn||1),precision:tp/(tp+fp||1),recall:tp/(tp+fn||1)}};
});
report.cases.w3={id:'w3-imaging-fracture',title:'裂缝智能筛选的代价分析',metric:'F1 ↑',series:w3,heldout:bootstrap(baseRows),thresholdCurve,limits:'学习分支留出 F1 未胜出。候选 ROC 以单条候选能否匹配标注为标签，重复候选可同时为正；对象 PR 使用完整匹配和间隔抑制。二者分母不同；扫描属已观察测试集上的事后诊断，不以曲线选新阈值。'};

console.log('w4: freeze labeled training wells; vary target only; add GR-only KNN');
function normalize(pts){const mg=pts.reduce((s,q)=>s+q.gr,0)/pts.length,md=pts.reduce((s,q)=>s+q.den,0)/pts.length,sg=Math.sqrt(pts.reduce((s,q)=>s+(q.gr-mg)**2,0)/pts.length)||1,sd=Math.sqrt(pts.reduce((s,q)=>s+(q.den-md)**2,0)/pts.length)||1;for(const q of pts){q.zgr=(q.gr-mg)/sg;q.zden=(q.den-md)/sd;}}
const w4models=config.w4.seeds.map(seed=>{const p={seed,nWells:4,drift:1.2,overlap:.35},wells=D.buildWells(p),train=wells.slice(1,5).flatMap(w=>w.pts);return{seed,p,train,th:D.grThresholds(train)};});
const w4=series(config.w4.axes,(axis,value)=>{
 const rows=w4models.map(m=>{const test=D.buildWells({...m.p,...(axis==='warp'?{}:{[axis]:value})})[0].pts;if(axis==='warp'){for(const q of test){q.gr+=value*(q.den-2.5)**2*800;q.den+=value*Math.sin(q.gr/22)*.05;}normalize(test);}
  const y=test.map(q=>q.facies),f=pred=>D.macroF1(D.confusion(y,pred));return{seed:m.seed,baseline:f(test.map(q=>D.predictGR(m.th,q))),learn:f(test.map(q=>D.predictKNN(m.train,q,true))),raw:f(test.map(q=>D.predictKNN(m.train,q,false))),grOnly:f(test.map(q=>D.predictKNN(m.train,q,'gr')))};});
 const mean=key=>rows.reduce((s,r)=>s+r[key],0)/rows.length;
 return{axis,value,rows,baseline:mean('baseline'),learn:mean('learn'),raw:mean('raw'),grOnly:mean('grOnly'),metric:'跨井宏 F1 均值 ↑'};
});
report.cases.w4={id:'w4-lithology',title:'岩性分类',metric:'宏 F1 ↑',series:w4,limits:'训练四口井固定。测试仅重算无标签井内统计量，这是整井离线适配；不是随钻在线。各井共用层序和类别比例，类别比例移位仍缺少验证。raw 是固定量纲缩放，不是完全不做缩放。'};

console.log('w5: distinguish visible-fit, masked, neighbor and frozen cross-well error');
const w5=series(config.w5.axes,(axis,value)=>{
 const rows=config.w5.seeds.map(seed=>{
  const opt={seed};if(axis==='noiseScale')opt.noiseScale=value;if(axis==='denShift')opt.denShift=value;
  const ref=E.buildWell(opt),nb=E.buildWell({seed:5150,jit:.04,lphi:.02,tie:.35}),mech=axis==='mechanism'?value:'fixed26m',length=axis==='gapLength'?value:8;
  const gaps=mech==='fixed26m'?[[208,208+Math.round(length/E.DZ)-1]]:E.gapsFor(mech,length,ref),mask=E.maskOf(gaps),reg=E.fillReg(ref,gaps),lin=E.fillLinear(ref,gaps),neighbor=E.fillNeighbor(ref,gaps,nb),m=E.evalGaps(ref,gaps,reg),l=E.evalGaps(ref,gaps,lin),n=E.evalGaps(ref,gaps,neighbor);
  const visible=ref.den.map((_,i)=>i).filter(i=>!mask[i]);const fitRMSE=Math.sqrt(visible.reduce((s,i)=>s+((E.predReg(reg.model,ref,i)-ref.den[i])*E.PU)**2,0)/visible.length);
  const frozen=E.fitReg(nb,new Array(E.NS).fill(true)),cross={den:ref.den.map((_,i)=>E.predReg(frozen,ref,i)),se:new Array(E.NS).fill(1.645*frozen.sd)},ce=E.evalGaps(ref,gaps,cross);
  return{seed,n:m.n,visibleN:visible.length,rmse:m.rmse,baseline:l.rmse,neighborRMSE:n.rmse,fitRMSE,cov:m.cov,neighborCov:n.cov,linearCov:l.cov,frozenCrossWellRMSE:ce.rmse,frozenCrossWellCov:ce.cov,gaps};
 });
 return{axis,value,rows,baseline:pooled(rows,'baseline'),learn:pooled(rows,'rmse'),neighbor:pooled(rows,'neighborRMSE'),fit:pooled(rows,'fitRMSE','visibleN'),coverage:rows.reduce((s,r)=>s+r.cov,0)/rows.length,metric:'遮蔽 RMSE / p.u. ↓'};
});
report.cases.w5={id:'w5-completion',title:'缺失段重建',metric:'遮蔽 RMSE / p.u. ↓',series:w5,limits:'主任务是本井可见段拟合和遮蔽段检验，不冒称未见井测试。另列邻井冻结回归诊断；各井共享固定 BEDS，不能作为未见地质层序证据。90% 残差带未校准，插值/邻井区间也只是启发式。'};

for(const c of Object.values(report.cases)){assert(new Set(c.series.map(s=>s.axis)).size>=3);for(const s of c.series){assert(Number.isFinite(s.learn)&&Number.isFinite(s.baseline));assert(s.rows.length>=5);}}
fs.writeFileSync(path.join(folder,'generator-audit.json'),JSON.stringify(report,null,2)+'\n');
const fmt=v=>v.toFixed(3),md=['# 合成生成器敏感性审计','', '日期：2026-11-03。全部测试均为合成条件；没有真实受试者或现场数据。', '', '复算：`node tools/audit-generators.js`。完整种子、设置、逐井/逐图、置信区间和阈值曲线见 [JSON](generator-audit.json)；交互图见 [审计查看器](../evidence.html)。', '', '冻结策略：w1/w3 固定训练与阈值；w2/w4 对每个生成种子固定训练井，扰动只落在测试输入；w5 本井遮蔽任务逐次用可见段拟合，另列冻结邻井模型。所有列出档位都报告，不保证单调退化。'];
for(const [key,c] of Object.entries(report.cases)){
 md.push('', '## '+key+' '+c.title,'',c.limits,'','| 扰动 | 设置 | 基线 | 学习 | 同数据附加对照 |','|---|---:|---:|---:|---|');for(const s of c.series)md.push('| '+s.axis+' | '+s.value+' | '+fmt(s.baseline)+' | '+fmt(s.learn)+' | '+(s.denOnly!=null?'DEN 回归 '+fmt(s.denOnly):s.grOnly!=null?'固定缩放 KNN '+fmt(s.raw)+'；GR KNN '+fmt(s.grOnly):s.coverage!=null?'可见拟合 '+fmt(s.fit)+'；邻井 '+fmt(s.neighbor)+'；回归覆盖 '+fmt(s.coverage):'—')+' |');
 if(c.heldout)md.push('','井/图为单位配对 bootstrap（2000 次；95% 百分位区间），冻结训练集条件下：`'+JSON.stringify(c.heldout)+'`。不是对训练集选择或真实井分布的不确定度估计。');
 if(key==='w2'){const r=c.series[0].rows[0];md.push('','默认种子 '+r.seed+'、同两口测试井 '+r.n+' 点：KNN RMSE '+fmt(r.rmse)+' p.u. / R² '+fmt(r.r2)+'；DEN 单回归 '+fmt(r.denRMSE)+' / '+fmt(r.denR2)+'；经验公式 '+fmt(r.formulaRMSE)+' / '+fmt(r.formulaR2)+'。五生成种子汇总与这一个默认数据集分开。');}
 const last=Object.values(Object.groupBy(c.series,s=>s.axis)).map(a=>a[a.length-1]);md.push('','边界观察：'+last.map(s=>s.axis+'='+s.value+' 时学习 '+fmt(s.learn)+'，基线 '+fmt(s.baseline)).join('；')+'。仅观察上述档位，不外推连续失效阈值。');
}
md.push('','## 生成假设与物理参考','', '本项目生成器由作者维护的浏览器演示代码实现，尚无第三方生成器审计。此次为公开参数敏感性自审；可复算不等于物理校准。', '', '- w1：分层阶跃均值，层厚 20—39 点、GR/DEN 类均值加均匀扰动；三均匀和创新（不是高斯），默认独立，ρ 设置为 AR(1)；额外两点仪器跳变。transition 为整条曲线对称箱式响应半宽，因而同时平滑信号与噪声；shift 将测试对比压向中值。', '- w2：孔隙度与泥质体积线性关联；DEN 为骨架/孔隙混合加泥质项，GR/CNL 为经验线性代理；独立高斯噪声和井级刻度偏移。测试 shift 是额外刻度/响应错配，noiseScale 是确定性高频附加扰动，不冒称真实仪器噪声。', '- w3：平面与圆柱相交的正弦路径；独立高斯像素噪声、低倾角层理、可选竖向干扰；dropout 模拟连续方位缺测。它不模拟真实电极响应、井径变化或裂缝导电物理。', '- w4：五类 GR/DEN 高斯簇、固定共用层序、井级偏移；warp 为人为非线性响应错配，不对应经标定仪器。固定量纲缩放与井内 z-score 必须区分。', '- w5：密度混合与简化声波/中子代理、共享层序/溶孔项、独立高斯噪声、三点滑动平均；扩径缺测按隐含砂岩比例选区间，是已知机制的人工遮蔽，并非真实井径观测。', '', '以下原始专业来源仅支持定性背景，**不支持本项目选定的参数值或性能**：', '', '- [SLB: Defining Logging](https://www.slb.com/resource-library/oilfield-review/defining-series/defining-logging)：多曲线共同解释、GR 与泥质的常见关系。', '- [SLB: Defining Porosity](https://www.slb.com/resource-library/oilfield-review/defining-series/defining-porosity)：孔隙测井受骨架与流体条件影响。', '- [SLB: neutron porosity](https://glossary.slb.com/Terms/n/neutron_porosity.aspx)：黏土等含氢组分会影响中子响应。', '- [US EPA: Borehole Acoustic Televiewer](https://www.epa.gov/environmental-geophysics/borehole-acoustic-televiewer-atv)：井壁展开中的平面特征呈正弦路径；不意味着本电阻率风格灰度图已物理校准。', '- [USGS Circular 891](https://pubs.usgs.gov/circ/c891/geophysical.htm)：仪器响应会扭曲薄层厚度，井径变化影响密度响应。', '', '教学效果、学号分工、真人屏幕阅读器结果仍待真实材料，不能由本审计填充。');
fs.writeFileSync(path.join(folder,'generator-audit.md'),md.join('\n')+'\n');
console.log(JSON.stringify(Object.fromEntries(Object.entries(report.cases).map(([k,c])=>[k,{settings:c.series.length,replicates:c.series[0].rows.length,heldout:c.heldout||null}]))));
