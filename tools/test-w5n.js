/* w5 多井标准化：产出正文引用的全部指标，可复算
   用法：node tools/test-w5n.js */
global.window = {};
require('../cases/w5-normalization/demo/demo.js');
const W = global.window.W5NCORE;
const f = (v) => v.toFixed(3);

console.log('=== 1. 漂移/泥浆 → 三种处理的重合度、N/G 偏差、翻转井数 ===');
console.log('drift mud | 重合度 原/移/均方/分位 | N/G偏差(pp) 原/移/均方/分位 | 翻转井数');
[[0, 0], [0.4, 0], [0.8, 0], [1.0, 0], [0.8, 0.3], [0.8, 0.6], [0.8, 1.0], [1.0, 0.6]].forEach(([d, m]) => {
  const R = W.run({ drift: d, mud: m, nWells: 10 });
  console.log(
    String(d).padEnd(5) + String(m).padEnd(4) + '| ' +
    R.ov.map((v) => f(v)).join(' / ') + ' | ' +
    R.ngErr.map((v) => (v * 100).toFixed(1)).join(' / ') + ' | ' +
    R.flip.join(' / ') + '  (共 ' + R.n + ' 口)');
});

console.log('\n=== 2. 逐井明细（drift 0.8 / mud 0.6）===');
const R = W.run({ drift: 0.8, mud: 0.6, nWells: 10, lmark: 6 });
console.log('井  刻度a   零点b  KCl   真值N/G   原始    平移    均方    分位     重合度 原/移/均方/分位');
R.wells.forEach((w) => {
  console.log('#' + String(w.idx).padEnd(3) + w.a.toFixed(3) + '  ' + w.b.toFixed(1).padStart(6) + '  ' +
    (w.kcl ? '是 ' : '否 ') + '  ' + (w.ngT * 100).toFixed(1) + '%   ' +
    w.ng.map((v) => (v * 100).toFixed(1) + '%').map((s) => s.padStart(6)).join('  ') + '   ' +
    w.ov.map((v) => f(v)).join(' / '));
});

console.log('\n=== 3. 标志层与截止值的影响（drift 0.8 / mud 0.6）===');
const ref = W.buildWell(0, 0.8, 0.6);
const st = W.markerStats(ref, 6);
console.log('参考井标志层：均值 ' + st.mean.toFixed(1) + ' API，标准差 ' + st.sd.toFixed(2) + '，样本 ' + st.n + ' 点');
const w1 = W.buildWell(1, 0.8, 0.6);
const s1 = W.markerStats(w1, 6);
console.log('1 号井标志层：均值 ' + s1.mean.toFixed(1) + ' API，标准差 ' + s1.sd.toFixed(2));
console.log('→ 同一层灰岩，两口井差 ' + Math.abs(s1.mean - st.mean).toFixed(1) + ' API');

console.log('\n=== 4. 参考井真值统计 ===');
const g = ref.grTrue;
const mn = Math.min(...g), mx = Math.max(...g), avg = g.reduce((s, v) => s + v, 0) / g.length;
console.log('GR min ' + mn.toFixed(1) + '  max ' + mx.toFixed(1) + '  mean ' + avg.toFixed(1));
const lith = [0, 0, 0, 0];
ref.lent.forEach((l) => lith[l]++);
console.log('岩性占比：' + W.LITH.map((L, i) => L.n + ' ' + (lith[i] / ref.lent.length * 100).toFixed(0) + '%').join('  '));
console.log('真值 N/G（GR<60）= ' + (W.ng(g) * 100).toFixed(1) + '%');
console.log('采样 ' + W.NS + ' 点 / ' + W.BOT + ' m，标志层 ' + W.MK + '—' + (W.MK + W.MKT) + ' m');
