/* pr1 抽油机井工况诊断：产出正文引用的全部指标，可复算
   node tools/test-pr1.js                                            */
global.window = {};
require('../cases/pr1-dynamometer/demo/demo.js');
const M = global.window.PR1CORE;
const pct = (v) => (v * 100).toFixed(1) + '%';
const pad = (s, n) => String(s).padStart(n);
/* 特征维下标：0 面积比 1 最大载荷 2 最小载荷 3 载荷比 4 漏失斜率 5 上升滞后 6 波纹信噪比 */
const DIM = ['面积比', '最大载荷', '最小载荷', '载荷比', '漏失斜率', '上升滞后', '波纹信噪比'];

console.log('=== 1. 六类图版特征（各 12 张 1.0× 噪声卡的均值）===');
const T = M.templates();
console.log('  工况        面积比   最大载荷  最小载荷  载荷比   漏失斜率  上升滞后  波纹SNR');
M.KIND.forEach((k, i) => {
  const f = T[i];
  console.log('  ' + k.n.padEnd(7) + pad(f.areaRatio.toFixed(2), 7) + pad(f.hi.toFixed(1), 9) +
    pad(f.lo.toFixed(1), 9) + pad(f.loadRatio.toFixed(2), 8) + pad(f.drop.toFixed(1), 9) +
    pad(f.riseX.toFixed(3), 9) + pad(f.rip.toFixed(2), 8));
});

console.log('\n=== 2. 噪声 → 六类分类准确率（每类 30 张，共 180 张）===');
const ACC = {};
[0, 0.5, 1, 1.5, 2, 2.5].forEach((s) => {
  const r = M.evaluate(s, 30);
  ACC[s] = r.acc;
  console.log('  噪声 ' + s.toFixed(1) + '× → ' + pct(r.acc));
});

console.log('\n=== 3. 混淆矩阵（噪声 1.0×，每类 30 张）===');
const r1 = M.evaluate(1, 30);
console.log('           ' + M.KIND.map((k) => k.n.padEnd(6)).join(''));
r1.m.forEach((row, i) => console.log('  ' + M.KIND[i].n.padEnd(8) + row.map((v) => pad(v, 6)).join('')));

console.log('\n=== 4. 各类判对率（噪声 1.0× / 1.5× / 2.0×）===');
const R = { 1: r1, 1.5: M.evaluate(1.5, 30), 2: M.evaluate(2, 30) };
M.KIND.forEach((k, i) => {
  const line = [1, 1.5, 2].map((s) => {
    const row = R[s].m[i], tot = row.reduce((a, b) => a + b, 0);
    return pct(row[i] / tot) + ' (' + row[i] + '/' + tot + ')';
  });
  console.log('  ' + k.n.padEnd(8) + line.map((s) => s.padEnd(14)).join(''));
});

console.log('\n=== 5. 消融：去掉某一维后噪声 1.0× 的准确率 ===');
const all = M.evaluate(1, 30).acc;
console.log('  七维全用              → ' + pct(all));
[6, 0, 3, 4, 5].forEach((d) => {
  const keep = [0, 1, 2, 3, 4, 5, 6].filter((x) => x !== d);
  console.log('  去掉「' + DIM[d] + '」'.padEnd(12) + '→ ' + pct(M.evaluate(1, 30, keep).acc));
});

console.log('\n=== 6. 单维分辨力：只用一维时噪声 1.0× 的准确率 ===');
DIM.forEach((n, d) => console.log('  只看「' + n + '」'.padEnd(14) + '→ ' + pct(M.evaluate(1, 30, [d]).acc)));

console.log('\n=== 7. 波纹信噪比的类间分布（每类 40 张，最小—最大）===');
[1, 1.5, 2].forEach((nz) => {
  const parts = M.KIND.map((k) => {
    const v = [];
    for (let s = 0; s < 40; s++) v.push(M.feats(M.card(k.k, nz, 900 + s * 13)).rip);
    v.sort((a, b) => a - b);
    return k.n + ' ' + v[0].toFixed(2) + '—' + v[v.length - 1].toFixed(2);
  });
  console.log('  噪声 ' + nz.toFixed(1) + '×：' + parts.join('   '));
});

console.log('\n=== 8. 单张正常卡的特征抖动（噪声 1.0×，5 次抽样）===');
[1, 2, 3, 4, 5].forEach((i) => {
  const f = M.feats(M.card('ok', 1, 40 + i * 7));
  console.log('  第' + i + '次：面积比 ' + f.areaRatio.toFixed(3) + '  载荷比 ' + f.loadRatio.toFixed(2) +
    '  波纹SNR ' + f.rip.toFixed(2));
});

console.log('\n=== 9. 一张碰泵振动卡离各图版的距离（噪声 1.0×，seed 1234）===');
const pv = M.classify(M.card('vib', 1, 1234), T);
M.KIND.forEach((k, i) => console.log('  ' + k.n.padEnd(8) + ' 距离 ' + pv.d[i].toFixed(2).padStart(6) +
  '  距离相似度（未校准） ' + pct(pv.p[i])));
