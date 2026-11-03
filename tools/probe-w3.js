/* w3 参数探测：确认检测器真的工作，并给正文里的曲线提供实测数据 */
global.window = {};
require('../cases/w3-imaging-fracture/demo/demo.js');
const W = global.window.W3CORE;

function line(tag, r) {
  const m = r.mH, n = r.mN;
  console.log(tag.padEnd(26),
    'truth=' + r.truth.length,
    'hough tp/fp=' + m.tp + '/' + m.fp,
    'dipErr=' + m.dipErr.toFixed(1) + '°',
    'azErr=' + m.azErr.toFixed(0) + '°',
    '| naive tp/fp=' + n.tp + '/' + n.fp);
}

console.log('=== 默认参数 ===');
const t0 = Date.now();
line('dip38 az120 ap3 nf4', W.run({ seed: 11, dip: 38, azim: 120, aper: 3, noise: 6, nf: 4, induced: false }));
console.log('单次耗时 ' + (Date.now() - t0) + ' ms');

console.log('\n=== 诱导缝干扰 ===');
line('induced=off', W.run({ seed: 11, dip: 38, azim: 120, aper: 3, noise: 6, nf: 4, induced: false }));
line('induced=on ', W.run({ seed: 11, dip: 38, azim: 120, aper: 3, noise: 6, nf: 4, induced: true }));

console.log('\n=== 开度扫描（弱缝） ===');
[1, 1.5, 2, 3, 5, 8].forEach((ap) => {
  line('aper=' + ap, W.run({ seed: 11, dip: 42, azim: 120, aper: ap, noise: 6, nf: 4, induced: false }));
});

console.log('\n=== 噪声扫描 ===');
[0, 10, 20, 30, 40].forEach((nz) => {
  line('noise=' + nz, W.run({ seed: 11, dip: 42, azim: 120, aper: 3, noise: nz, nf: 4, induced: false }));
});

console.log('\n=== 倾角扫描 ===');
[15, 30, 45, 60, 75].forEach((d) => {
  line('dip=' + d, W.run({ seed: 11, dip: d, azim: 120, aper: 3, noise: 6, nf: 4, induced: false }));
});

console.log('\n=== 多条缝 ===');
[1, 3, 6].forEach((nf) => {
  line('nf=' + nf, W.run({ seed: 11, dip: 45, azim: 120, aper: 3, noise: 6, nf: nf, induced: false }));
});

console.log('\n=== 稳定性（10 个种子） ===');
let sumTp = 0, sumFp = 0, sumNfp = 0, sumErr = 0, cnt = 0;
for (let s = 1; s <= 10; s++) {
  const r = W.run({ seed: s * 37, dip: 40, azim: 120, aper: 3, noise: 8, nf: 4, induced: false });
  sumTp += r.mH.tp; sumFp += r.mH.fp; sumNfp += r.mN.fp; sumErr += r.mH.dipErr; cnt += r.truth.length;
}
console.log('检出率 ' + (sumTp / cnt * 100).toFixed(0) + '%  误检 ' + sumFp + '  Hough vs 阈值误检 ' + sumNfp +
  '  倾角误差均值 ' + (sumErr / 10).toFixed(1) + '°');
