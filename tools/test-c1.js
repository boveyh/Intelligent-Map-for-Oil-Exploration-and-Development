/* c1 固井质量评价：产出正文引用的全部指标，可复算 */
global.window = {};
require('../cases/c1-cement/demo/demo.js');
const M = global.window.C1CORE;
const pct = (v) => (v * 100).toFixed(1) + '%';

console.log('=== 1. 三种判别依据（4 段标定，36 个测试段，微环隙 50%，噪声 1.0）===');
[['两档幅度 30/78', 'amp'], ['三档幅度 30/59/86', 'amp3'], ['三特征质心', 'full']].forEach(([n, m]) => {
  const r = M.evaluate(0.5, 1, m);
  console.log('  ' + n.padEnd(16) + ' 符合率 ' + pct(r.agree).padStart(6) + '   微环隙误判 ' + pct(r.microErrRate).padStart(6) + '   判错 ' + r.review + '/' + r.testN + ' 段');
});

console.log('\n=== 2. 噪声 → 符合率（三特征质心，微环隙强度 50%）===');
[0.5, 1, 1.5, 2].forEach((s) => {
  const r = M.evaluate(0.5, s, 'full');
  console.log('  噪声 ' + s.toFixed(1) + '× → 符合率 ' + pct(r.agree) + '  微环隙误判 ' + pct(r.microErrRate) + '  窜槽误判 ' + pct(r.chanErrRate));
});

console.log('\n=== 3. 微环隙强度 → 三种方法（噪声 1.0）===');
console.log('   强度    两档幅度   三档幅度   三特征质心');
[0, 0.25, 0.5, 0.75, 0.85, 1].forEach((mu) => {
  const a = M.evaluate(mu, 1, 'amp'), b = M.evaluate(mu, 1, 'amp3'), f = M.evaluate(mu, 1, 'full');
  console.log('  ' + String(Math.round(mu * 100)).padStart(3) + '%   ' +
    pct(a.agree).padStart(7) + '   ' + pct(b.agree).padStart(7) + '   ' + pct(f.agree).padStart(7));
});

console.log('\n=== 4. 混淆矩阵（段级，微环隙 50%，噪声 1.0）===');
[['两档幅度','amp'],['三特征质心','full']].forEach(([n, m]) => {
  const r = M.evaluate(0.5, 1, m);
  const cm = M.confuse(r.segs);
  console.log('  ' + n + '  行=真值 列=判定');
  console.log('           ' + M.CLS.map((c) => c.n.padEnd(5)).join(' '));
  cm.forEach((row, i) => console.log('    ' + M.CLS[i].n.padEnd(5) + '  ' + row.map((v) => String(v).padStart(4)).join('  ')));
});

console.log('\n=== 5. 井段与类别分布 ===');
const cnt = [0, 0, 0, 0];
M.SEGTRUTH.forEach((k) => cnt[k]++);
console.log('  井段 ' + M.BOT + ' m，采样 ' + M.NS + ' 点（' + M.DZ + ' m），评价段 ' + M.NSEG + ' 个 1 m 段');
console.log('  分段构成：' + M.CLS.map((c, i) => c.n + ' ' + cnt[i] + ' 段').join('  '));
console.log('  标定段：' + M.CAL_SEG.map((s) => s + '(第' + (s + 1) + '段·' + M.CLS[M.SEGTRUTH[s]].n + ')').join('  '));

console.log('\n=== 6. 各类观测特征均值（微环隙 50%，噪声 1.0）===');
const o = M.obs(0.5, 1);
const acc = [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
const n2 = [0, 0, 0, 0];
o.forEach((p) => { n2[p.truth]++; acc[p.truth][0] += p.amp; acc[p.truth][1] += p.formE; acc[p.truth][2] += p.circ; });
M.CLS.forEach((c, i) => {
  console.log('  ' + c.n.padEnd(5) + ' amp ' + (acc[i][0] / n2[i]).toFixed(1).padStart(5) +
    ' mV   formE ' + (acc[i][1] / n2[i]).toFixed(3) + '   circ ' + (acc[i][2] / n2[i]).toFixed(3) + '   n=' + n2[i]);
});
