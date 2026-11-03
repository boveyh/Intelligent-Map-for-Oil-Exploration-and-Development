/* Shared presentation for authored cases. Serialized into each portable package. */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const stories = {
  'w1-boundary-learning': {image:'boundary-learning',subject:'从已知井学习层界，在新井提出候选',input:'训练井 GR、DEN 曲线与人工层界标签',learn:'提取四个窗口特征，拟合加权逻辑回归',output:'未见井层界分数、候选深度、特征贡献与 F1',impact:'让解释员按候选与实际曲线变化复核层界',boundary:'训练统计量只来自其他井；当前是合成留出井验证，近邻薄层受窗口与候选间隔限制。',type:'监督学习 · 层界分类'},
  'welllog-layer': { image: 'layering', subject: '把连续测井响应放回具体地层界面', input: '连续测井曲线与地质分层依据', learn: '检测序列变化，提出候选层界并进行规则复核', output: '候选层界深度与层段划分', impact: '把人工逐段卡层变成候选界面的检查与确认', boundary: '框架原有分层样例；本次仅补充场景图，不改变其算法和原始指标。', type: '序列分析 · 分层样例' },
  'w2-reservoir-param': { image: 'reservoir', subject: '曲线能测到响应，孔隙度需要解释', input: 'DEN、GR、CNL 曲线 + 岩心孔隙度标签', learn: '用标准化曲线找五个近邻，取其已知孔隙度均值', output: '测试井孔隙度剖面，与密度公式并排比较', impact: '为储层评价提供参数候选；按井验证后再交解释员确认', boundary: '合成审计中 DEN 单曲线回归优于多曲线 KNN，不能只与经验公式比；随机划分的高分不能证明跨井可用。', type: '监督学习 · KNN 回归' },
  'w3-imaging-fracture': { image: 'fracture', subject: '学习未胜出：裂缝智能筛选的代价', input: '合成井壁图像；其他图像中已标注的候选路径', learn: '从路径响应、覆盖与反差学习逻辑回归筛选器', output: '保留与拒绝候选、特征贡献、产状与误报漏检', impact: '展示误报减少与漏检增加的代价；保留未胜出的结果', boundary: '学习分支使用独立训练种子；候选阶段遗漏无法补回，不保证比 Hough 更好，未验证真实井壁图像。', type: '监督学习 · 候选筛选 + Hough' },
  'w4-lithology': { image: 'lithology', subject: '同一口测试井，四种方法会画出什么岩性柱', input: '训练井 GR / 密度曲线与已知岩性标签', learn: '从训练样本学习邻域分类，比较标准化前后的 KNN', output: '逐深度岩性、混淆矩阵与宏平均 F1', impact: '定位解释分歧井段，辅助地层对比；可疑层段交人工复核', boundary: '测试井不进入训练样本；井内标准化使用整条无标签曲线，不是随钻在线预测。', type: '监督学习 · KNN 分类' },
  'w5-completion': { image: 'reconstruction', subject: '井段缺测后，怎样保留可用的储层信息', input: '完整井段中的多条曲线；主动遮蔽一段用于检验', learn: '用可观测曲线拟合缺失目标的回归关系', output: '重建曲线、误差与区间；对照线性插值和邻井借值', impact: '辅助估计缺测段物性；保留缺测标记，避免把估计当实测', boundary: '合成遮蔽实验；区间覆盖率需检验，不能仅因曲线平滑就接受。', type: '监督学习 · 回归重建' },
  'w5-normalization': { image: 'multiwell', subject: '先对齐仪器刻度，再谈跨井智能解释', input: '参考井与目标井的标志层 GR 分布', learn: '比较平移、均方和分位数映射的校正效果', output: '校正曲线、分布重合度与净毛比偏差', impact: '为跨井分类和储层对比提供可比输入', boundary: '这是数据预处理配套案例，不是独立训练的机器学习模型；分布接近也不保证解释更准。', type: '数据预处理 · 跨井质量控制' },
  'm1-cuttings': { image: 'cuttings', subject: '先把样品放回正确深度，再学习岩性', input: '合成色调、粒径、分选与反应特征 + 少量人工标签', learn: '最近质心分类，优先挑选不确定样本请人标注', output: '深度岩性柱、宏 F1 与标注预算对照', impact: '用有限标注优先处理难分样本；深度错位必须先校正', boundary: '当前模拟特征向量，未实现显微照片端到端识别；主动挑样本不读取未标注真值。', type: '监督学习 · 主动标注' },
  'c1-cement': { image: 'cement', subject: '幅度相近，井下胶结状态可能不同', input: '合成 CBL 幅度、波形能量与周向代理特征', learn: '4 个已评级段标定四类质心，再判别其余 36 段', output: '未标定段符合率、胶结候选与幅度阈值对照', impact: '提供状态候选，结合原始记录安排人工解释或复测', boundary: '周向量是合成代理特征，常规 CBL/VDL 不直接提供；分数已排除标定段，每次调参重新标定，未验证跨井迁移。', type: '监督学习 · 多特征原型分类' },
  'pr1-dynamometer': { image: 'pump', subject: '轮廓接近正常，细小波纹可能改变诊断', input: '合成的光杆位移—载荷闭合曲线', learn: '六类样本标定七维特征质心，比较残差波纹特征', output: '工况候选、特征距离与各类召回率', impact: '辅助安排巡检和复核；高噪声时先检查传感器与原始曲线', boundary: '图版来自带噪合成卡；距离分数不是校准概率，也未验证维修收益。', type: '监督学习 · 特征分类' }
};
function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }
function imageURL(key) { return 'data:image/webp;base64,' + fs.readFileSync(path.join(ROOT, 'assets/models', key + '.webp')).toString('base64'); }
const CSS = `
.oil-plate{margin:18px 0 24px;border:1px solid #ddd7c8;border-radius:14px;overflow:hidden;background:#f7f5ee;color:#242b2e;font:13px/1.7 system-ui,sans-serif;display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,.8fr);grid-template-areas:'heading heading' 'brief scene'}
.oil-plate *{box-sizing:border-box}.oil-plate-head{padding:16px 20px 10px;grid-area:heading}.oil-plate-head small{font-size:10px;letter-spacing:.12em;color:#235f51}.oil-plate-head strong{display:block;font-size:18px;line-height:1.5;margin-top:4px}
.oil-scene{grid-area:scene;position:relative;overflow:hidden;background:#f5f2ea;align-self:center;aspect-ratio:3/2}.oil-scene img{width:100%;height:100%;object-fit:contain;display:block}.oil-scene-tag{position:absolute;bottom:10px;left:10px;right:10px;display:flex;gap:8px;font-size:9px;color:#374c44}.oil-scene-tag span{background:#fffE;padding:3px 6px;border:1px solid #e9e4d8;border-radius:4px}.oil-scene-tag span:first-child{display:none}
.oil-brief{padding:16px 20px;background:#fff;border-top:1px solid #e9e4d8}.oil-brief b{color:#235f51}.oil-brief p{margin:5px 0!important;font-size:12px!important;line-height:1.8!important}.oil-note{font-size:11px!important;color:#68726e}.oil-path{padding:16px 20px;background:#fff;border:1px solid #ddd7c8;border-radius:12px;margin:20px 0}.oil-path h4{font-size:15px;margin:0 0 12px}.oil-path-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.oil-path details{padding:12px;background:#f7f6f0;border:1px solid #e9e4d8;border-radius:7px}.oil-path summary{cursor:pointer;font-size:12px;font-weight:650;line-height:1.7}.oil-path summary i{font-style:normal;color:#2f7d6b;margin-right:7px;font-family:monospace}.oil-path details p{font-size:12px;margin:8px 0 0;line-height:1.8;color:#4d565b}.oil-evidence{padding:10px 13px;margin:12px 0;border-left:3px solid #b26a39;background:#fbf3ed;color:#765841;font:12px/1.8 system-ui,sans-serif}
.oil-brief{grid-area:brief;border-top:0}.oil-brief .oil-task-type{display:inline-block;padding:3px 8px;background:#e6f1ec;color:#235f51;border-radius:4px;font-size:11px;font-weight:650}.oil-task-step{display:grid;grid-template-columns:26px 1fr;gap:8px;margin:12px 0}.oil-task-step>i{font:11px/24px monospace;text-align:center;background:#e6f1ec;color:#235f51;border-radius:50%;height:24px}.oil-task-step b{display:block;font-size:11px}.oil-task-step span{font-size:12px;color:#4d565b;line-height:1.8}
@media(max-width:600px){.oil-plate{grid-template-columns:1fr;grid-template-areas:'heading' 'brief' 'scene'}.oil-plate-head{padding:12px}.oil-plate-head strong{font-size:15px}.oil-brief,.oil-path{padding:12px}.oil-path-grid{grid-template-columns:1fr}.oil-scene-tag{left:8px;right:8px;bottom:8px;font-size:9px}}
`;function style() { return '<style>' + CSS + '</style>'; }
function plate(s) {
  return style() + '<figure class="oil-plate"><div class="oil-plate-head"><div><small>ALGORITHM IN ACTION · 智能方法如何介入</small><strong>' + esc(s.subject) + '</strong></div></div>' +
    '<div class="oil-scene"><img loading="lazy" alt="' + esc(s.subject) + '的 AI 生成概念剖面模型" src="' + imageURL(s.image) + '"><div class="oil-scene-tag"><span>' + esc(s.type) + '</span><span>概念模型 · 非现场数据</span></div></div>' +
    '<figcaption class="oil-brief"><span class="oil-task-type">' + esc(s.type) + '</span>' +
    [['01', '模型接收什么', s.input], ['02', '如何形成判断', s.learn], ['03', '输出与对照', s.output]].map(function (x) {
      return '<div class="oil-task-step"><i>' + x[0] + '</i><div><b>' + esc(x[1]) + '</b><span>' + esc(x[2]) + '</span></div></div>';
    }).join('') + '<p><b>作业影响：</b>' + esc(s.impact) + '。</p><p class="oil-note">右侧为场景概念图；算法依据与结果由交互演示展示。</p></figcaption></figure>';
}
function processHTML(s) {
  return style() + '<div class="oil-path"><h4>智能方法在这条链路里做了什么</h4><div class="oil-path-grid">' + [
    ['01', '输入：拿什么来判断', s.input], ['02', '介入：从数据到判别', s.learn],
    ['03', '输出：观众实际看见什么', s.output], ['04', '影响：谁据此采取下一步', s.impact]
  ].map(x => '<details open><summary><i>' + x[0] + '</i>' + esc(x[1]) + '</summary><p>' + esc(x[2]) + '</p></details>').join('') + '</div></div>';
}
function evidence(s) { return '<div class="oil-evidence"><b>证据范围：</b>本案例使用固定种子的合成数据，指标由前端算法复算。' + esc(s.boundary) + '</div>'; }
function enrich(def) {
  const s = stories[def.id];
  if (!s) return def;
  def.previewImage = 'assets/models/' + s.image + '.webp';
  def.algorithmType = s.type;
  def.tabs.background.sections[0].html = plate(s) + evidence(s) + def.tabs.background.sections[0].html;
  def.tabs.workflow.metrics.html = processHTML(s) + evidence(s) + def.tabs.workflow.metrics.html;
  def.tabs.demo.intro = '合成数据交互实验。' + def.tabs.demo.intro + ' ' + s.boundary;
  return def;
}
module.exports = { enrich, stories, plate, processHTML };
