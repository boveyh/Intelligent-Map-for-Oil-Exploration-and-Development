/* w4 岩性识别：产出正文引用的全部指标，可复算
   用法：node tools/test-w4.js */
global.window = {};
require('../cases/w4-lithology/demo/demo.js');
const W = global.window.W4CORE;

function line(tag, p) {
  const r = W.run(p);
  console.log(tag.padEnd(30) + '单曲线 ' + r.f1[0].toFixed(3) +
    '  交会图 ' + r.f1[1].toFixed(3) +
    '  KNN原始 ' + r.f1[2].toFixed(3) +
    '  KNN标准化 ' + r.f1[3].toFixed(3));
  return r;
}

console.log('=== 1. 漂移扫描（训练 4 口井，重叠 0.35） ===');
[0, 0.3, 0.6, 1.0, 1.4, 1.8, 2.2, 2.6, 3.0].forEach((d) => {
  line('drift=' + d.toFixed(1), { seed: 20261024, nWells: 4, drift: d, overlap: 0.35 });
});

console.log('\n=== 2. 训练井数扫描（漂移 1.2 固定） ===');
[1, 2, 3, 4, 5, 6, 7].forEach((n) => {
  line('nWells=' + n, { seed: 20261024, nWells: n, drift: 1.2, overlap: 0.35 });
});

console.log('\n=== 3. 类别重叠扫描（漂移 0 固定） ===');
[0, 0.2, 0.4, 0.6, 0.8, 1.0].forEach((o) => {
  line('overlap=' + o.toFixed(1), { seed: 20261024, nWells: 4, drift: 0, overlap: o });
});

console.log('\n=== 4. 默认工况明细 ===');
const r = W.run({ seed: 20261024, nWells: 4, drift: 1.2, overlap: 0.35 });
console.log('GR 阈值 = ' + r.th.map((t) => t.toFixed(1)).join(' / '));
console.log('实测各类 GR 中位数：');
W.FACIES.forEach((F, i) => {
  const arr = r.test.filter((q) => q.facies === i).map((q) => q.gr).sort((a, b) => a - b);
  console.log('  ' + F.name.padEnd(6) + ' n=' + String(arr.length).padStart(3) +
    '  中位 ' + (arr.length ? arr[Math.floor(arr.length / 2)].toFixed(1) : '—'));
});
['GR 单曲线', '交会图分区', 'KNN 原始', 'KNN 标准化'].forEach((n, mi) => {
  console.log('\n混淆矩阵 · ' + n);
  r.M[mi].forEach((row, i) => console.log('  ' + W.FACIES[i].name.padEnd(6) + row.join(' ')));
});

console.log('\n=== 5. 井间漂移幅度（GR 偏移，API） ===');
const wells = W.buildWells({ seed: 20261024, drift: 3.0, overlap: 0.35 });
const base = W.buildWells({ seed: 20261024, drift: 0, overlap: 0.35 });
let offs = [];
wells.forEach((w, i) => {
  offs.push((w.pts[0].gr - base[i].pts[0].gr) / 3.0);
});
console.log('各井 GR 偏移 ' + offs.map((x) => x.toFixed(1)).join(' / '));
console.log('极差 ' + (Math.max(...offs) - Math.min(...offs)).toFixed(1) + ' API');
