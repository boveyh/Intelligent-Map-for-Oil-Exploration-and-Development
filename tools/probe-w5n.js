/* 扫描：统计段长度 → 三种标准化方法的成败（看样本量怎么决定一切） */
global.window = {};
require('D:/Intelligent-Map-for-Oil-Exploration-and-Development/cases/w5-normalization/demo/demo.js');
const W = global.window.W5NCORE;
const f = (v) => v.toFixed(3);

console.log('段长(m) 样本 | 重合度 不校正/平移/均值方差/分位数 | N/G偏差(pp) 同上 | 翻转井数');
[6, 10, 16, 24, 32, 48, 64].forEach((lm) => {
  const Q = W.run({ drift: 0.8, mud: 0, nWells: 10, lmark: lm });
  console.log(String(lm).padEnd(8) + String(Q.nMark).padEnd(5) + '| ' +
    Q.ov.map(f).join(' / ') + ' | ' +
    Q.ngErr.map((v) => (v * 100).toFixed(1)).join(' / ') + ' | ' + Q.flip.join(' / '));
});

console.log('\n泥浆 = 0.6 时（有无法被线性方法修掉的岩性相关偏移）：');
[6, 16, 32].forEach((lm) => {
  const Q = W.run({ drift: 0.8, mud: 0.6, nWells: 10, lmark: lm });
  console.log(String(lm).padEnd(4) + '样本 ' + String(Q.nMark).padEnd(4) + '| ' +
    Q.ov.map(f).join(' / ') + ' | ' +
    Q.ngErr.map((v) => (v * 100).toFixed(1)).join(' / ') + ' | ' + Q.flip.join(' / '));
});

console.log('\n漂移/泥浆二维（统计段 32 m）：');
[[0, 0], [0.4, 0], [0.8, 0], [1, 0], [0.8, 0.3], [0.8, 0.6], [0.8, 1]].forEach(([d, m]) => {
  const Q = W.run({ drift: d, mud: m, nWells: 10, lmark: 32 });
  console.log('d=' + d + ' m=' + m + ' | ' + Q.ov.map(f).join(' / ') + ' | ' +
    Q.ngErr.map((v) => (v * 100).toFixed(1)).join(' / ') + ' | ' + Q.flip.join(' / '));
});
