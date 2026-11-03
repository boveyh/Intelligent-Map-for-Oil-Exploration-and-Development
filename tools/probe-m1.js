/* m1 岩屑识别：补充探针 —— 混淆矩阵 / 分置信度准确率 / 类别可分性 */
global.window = {};
require('../cases/m1-cuttings/demo/demo.js');
const M = global.window.M1CORE;
const pct = (v) => (v * 100).toFixed(1) + '%';

const lab = M.pickActive(0.10);
const cen = M.trainCentroids(lab);
const pred = M.predictAll(cen);

function conf(shiftSamples) {
  const K = M.NL, m = [];
  for (let i = 0; i < K; i++) m.push(new Array(K).fill(0));
  for (let i = 0; i < M.NS; i++) {
    const j = i + shiftSamples;
    if (j < 0 || j >= M.NS) continue;
    m[M.SEQ[i]][pred[j].y]++;
  }
  return m;
}
function perF1(m) {
  const K = M.NL, out = [];
  for (let k = 0; k < K; k++) {
    const tp = m[k][k];
    let fp = 0, fn = 0;
    for (let i = 0; i < K; i++) { if (i !== k) { fp += m[i][k]; fn += m[k][i]; } }
    const den = 2 * tp + fp + fn;
    out.push(den ? 2 * tp / den : 0);
  }
  return out;
}

console.log('=== A. 混淆矩阵（深度对齐，10% 主动标注）行=真值 列=识别 ===');
const m0 = conf(0);
console.log('         ' + M.LITH.map((L) => L.n.padEnd(5)).join(' '));
m0.forEach((row, i) => console.log('  ' + M.LITH[i].n.padEnd(5) + '  ' + row.map((v) => String(v).padStart(4)).join('  ')));
console.log('  每类 F1：' + M.LITH.map((L, i) => L.n + ' ' + pct(perF1(m0)[i])).join('  '));

console.log('\n=== B. 错位 2 min 时的每类 F1 ===');
const m2 = conf(Math.round(M.lagShift(2) / M.DZ));
console.log('  每类 F1：' + M.LITH.map((L, i) => L.n + ' ' + pct(perF1(m2)[i])).join('  '));

console.log('\n=== C. 置信度（margin）与正确率 ===');
[[0, 0.16], [0.16, 0.3], [0.3, 9]].forEach(([lo, hi]) => {
  let n = 0, ok = 0;
  pred.forEach((p, i) => { if (p.margin >= lo && p.margin < hi) { n++; if (p.y === M.SEQ[i]) ok++; } });
  console.log('  margin ' + lo + '—' + hi + '：' + String(n).padStart(3) + ' 点，准确率 ' + (n ? pct(ok / n) : '—'));
});

console.log('\n=== D. 类别可分性（质心距离矩阵）===');
for (let a = 0; a < M.NL; a++) {
  const row = [];
  for (let b = 0; b < M.NL; b++) row.push(a === b ? '  —  ' : (function () {
    let s = 0; for (let d = 0; d < 4; d++) s += Math.pow(cen[a][d] - cen[b][d], 2);
    return Math.sqrt(s).toFixed(2).padStart(5);
  })());
  console.log('  ' + M.LITH[a].n.padEnd(4) + ' ' + row.join(' '));
}
console.log('  质心坐标：' + M.LITH.map((L, i) => L.n + ' [' + cen[i].map((v) => v.toFixed(2)).join(', ') + ']').join('  '));

console.log('\n=== E. 单特征判别 vs 四特征 ===');
// 单看碳酸盐反应能否分开灰岩/白云岩；单看色调能否分开砂岩/泥岩
function oneAcc(dim) {
  // 用同一批标注只在该维度上做最近质心
  const K = M.NL;
  let ok = 0;
  const cs = [];
  for (let k = 0; k < K; k++) {
    let s = 0, c = 0;
    lab.forEach((r) => { if (r.y === k) { s += M.FEAT[r.i][dim]; c++; } });
    cs.push(c ? s / c : 0);
  }
  for (let i = 0; i < M.NS; i++) {
    let b = -1, bd = 1e9;
    for (let k = 0; k < K; k++) { const d = Math.abs(M.FEAT[i][dim] - cs[k]); if (d < bd) { bd = d; b = k; } }
    if (b === M.SEQ[i]) ok++;
  }
  return ok / M.NS;
}
['色调', '粒径', '分选', '碳酸盐反应'].forEach((n, d) => console.log('  只看' + n + '：总准确率 ' + pct(oneAcc(d))));

console.log('\n=== F. 捞样间隔与混样 ===');
const DZ = M.DZ;
[0.5, 1, 2].forEach((bag) => console.log('  捞样间隔 ' + bag + ' m → 每袋混 ' + Math.round(bag / DZ) + ' 个采样点，迟到时间误差 ±1 min 相当于错 ' + (M.lagShift(1) / bag).toFixed(1) + ' 袋'));

console.log('\n=== G. 低 margin 都是些什么点 ===');
const low = pred.map((p, i) => ({ p: p, i: i })).filter((o) => o.p.margin < 0.16);
const comp = [0, 0, 0, 0];
low.forEach((o) => comp[M.SEQ[o.i]]++);
console.log('  margin<0.16 共 ' + low.length + ' 点：' + M.LITH.map((L, i) => L.n + ' ' + comp[i] + ' 点').join('  '));
const cntAll = [0, 0, 0, 0];
M.SEQ.forEach((l) => cntAll[l]++);
console.log('  各类总数：' + M.LITH.map((L, i) => L.n + ' ' + cntAll[i]).join('  '));
