/* m1 岩屑识别：产出正文引用的全部指标，可复算 */
global.window = {};
require('D:/Intelligent-Map-for-Oil-Exploration-and-Development/cases/m1-cuttings/demo/demo.js');
const M = global.window.M1CORE;
const pct = (v) => (v * 100).toFixed(1) + '%';

console.log('=== 1. 迟到时间误差 → 错位深度 → 宏F1（10% 主动标注）===');
const lab = M.pickActive(0.10);
const cen = M.trainCentroids(lab);
const pred = M.predictAll(cen);
[0, 1, 2, 3, 4, 6, 8].forEach((min) => {
  const sh = M.lagShift(min);
  const shS = Math.round(sh / M.DZ);
  console.log('  ' + min + ' min  →  错位 ' + sh.toFixed(2) + ' m  →  宏F1 ' + pct(M.score(pred, shS)));
});

console.log('\n=== 2. 标注比例 → 宏F1（深度对齐，两种挑法）===');
const lc = M.learningCurve(0);
lc.R.forEach((r, i) => {
  console.log('  ' + (r * 100).toFixed(0).padStart(3) + '%  主动 ' + pct(lc.act[i]) + '   随机 ' + pct(lc.rnd[i]));
});

console.log('\n=== 3. 错位 2 分钟时两种挑法的差距 ===');
const lc2 = M.learningCurve(Math.round(M.lagShift(2) / M.DZ));
lc2.R.forEach((r, i) => {
  console.log('  ' + (r * 100).toFixed(0).padStart(3) + '%  主动 ' + pct(lc2.act[i]) + '   随机 ' + pct(lc2.rnd[i]));
});

console.log('\n=== 4. 数据规模与类别分布 ===');
const cnt = [0, 0, 0, 0];
M.SEQ.forEach((l) => cnt[l]++);
console.log('  井段 ' + M.BOT + ' m / ' + M.NS + ' 点，步长 ' + M.DZ + ' m，ROP ' + M.ROP + ' m/h');
console.log('  岩性占比：' + M.LITH.map((L, i) => L.n + ' ' + (cnt[i] / M.NS * 100).toFixed(0) + '%').join('  '));
console.log('  每分钟钻进 ' + M.lagShift(1).toFixed(2) + ' m');
console.log('  低置信度（margin<0.16）点数：' + pred.filter((p) => p.margin < 0.16).length + ' / ' + M.NS);
