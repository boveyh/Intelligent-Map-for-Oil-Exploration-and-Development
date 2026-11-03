/* w3 成像裂缝识别：产出正文里引用的全部指标，可复算
   用法：node tools/test-w3.js */
global.window = {};
require('../cases/w3-imaging-fracture/demo/demo.js');
const W = global.window.W3CORE;

function rnd(a, b, s) {
  // 线性同余，保证每次跑数一致
  let x = s;
  return () => { x = (x * 1103515245 + 12345) & 0x7fffffff; return a + (x / 0x7fffffff) * (b - a); };
}

/* ============ 1. 常规工况基准（30 例随机，限定在"可解释"参数域内） ============ */
const gen = rnd(0, 1, 20261024);
let T = { truth: 0, tp: 0, fp: 0, nfp: 0, ntp: 0, dipE: [], azE: [], ms: 0 };
const N = 30;
for (let i = 0; i < N; i++) {
  const p = {
    seed: 101 + i * 7,
    dip: 28 + gen() * 42,        // 28—70°，避开层理区
    azim: gen() * 355,
    aper: 2 + gen() * 4,         // 2—6 px，避开亚分辨率区
    noise: gen() * 14,
    nf: 1 + Math.floor(gen() * 5), // 1—5 条
    induced: gen() < 0.3
  };
  const t0 = Date.now();
  const r = W.run(p);
  T.ms += Date.now() - t0;
  T.truth += r.truth.length;
  T.tp += r.mH.tp; T.fp += r.mH.fp; T.dipE.push(r.mH.dipErr);
  T.azE.push(r.mH.azErr);
  T.ntp += r.mN.tp; T.nfp += r.mN.fp;
}
const recall = T.tp / T.truth;
const prec = T.tp / (T.tp + T.fp);
console.log('=== 1. 常规工况 30 例（倾角 28—70°，开度 2—6 px） ===');
console.log('真缝合计     ' + T.truth + ' 条');
console.log('Hough  检出   ' + T.tp + ' 条   检出率 ' + (recall * 100).toFixed(0) + '%   精确率 ' + (prec * 100).toFixed(0) + '%   误检 ' + T.fp + ' 条');
console.log('阈值法 检出   ' + T.ntp + ' 条   检出率 ' + (T.ntp / T.truth * 100).toFixed(0) + '%   误检 ' + T.nfp + ' 条');
console.log('倾角误差中位 ' + T.dipE.sort((a, b) => a - b)[Math.floor(N / 2)].toFixed(1) + '°   方位误差中位 ' + T.azE.sort((a, b) => a - b)[Math.floor(N / 2)].toFixed(0) + '°');
console.log('单例耗时     ' + (T.ms / N).toFixed(0) + ' ms');

/* ============ 2. 失效边界：两条 1-D 扫描（各 12 个种子，单缝，去掉互相遮蔽） ============ */
function sweep(key, vals) {
  return vals.map(function (v) {
    var p = { seed: 0, dip: 40, azim: 120, aper: 3, noise: 8, nf: 1, induced: false };
    p[key] = v;
    var tp = 0, tt = 0, fp = 0;
    for (var s2 = 0; s2 < 24; s2++) {
      p.seed = 500 + s2 * 17;
      var r = W.run(p);
      tp += r.mH.tp; fp += r.mH.fp; tt += r.truth.length;
    }
    return { v: v, rate: tp / tt, fp: fp / 12 };
  });
}
console.log('\n=== 2a. 开度扫描（倾角 40° 固定，12 种子） ===');
const swA = sweep('aper', [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8]);
swA.forEach(c => console.log(('开度 ' + c.v + ' px').padEnd(12) +
  '检出率 ' + (c.rate * 100).toFixed(0).padStart(3) + '%   误检 ' + c.fp.toFixed(1)));

console.log('\n=== 2b. 倾角扫描（开度 3 px 固定，12 种子） ===');
const swD = sweep('dip', [12, 15, 18, 20, 24, 28, 35, 45, 60, 75]);
swD.forEach(c => console.log(('倾角 ' + c.v + '°').padEnd(12) +
  'A=' + W.dipToA(c.v).toFixed(1).padStart(5) + ' px   检出率 ' +
  (c.rate * 100).toFixed(0).padStart(3) + '%   误检 ' + c.fp.toFixed(1)));

/* ============ 3. 形态判别 ============ */
console.log('\n=== 3. 形态判别（振幅 A 是唯一的形状指纹） ===');
[['层理', 1.5], ['低角度缝 15°', W.dipToA(15)], ['中角度缝 40°', W.dipToA(40)], ['高角度缝 70°', W.dipToA(70)]]
  .forEach(([n, a]) => console.log(n.padEnd(16) + 'A = ' + a.toFixed(1).padStart(5) + ' px' + (a < 6 ? '   ← 与层理重叠，不可分' : '')));

/* ============ 4. 诱导缝对照 ============ */
console.log('\n=== 4. 诱导缝（沿井轴直线，A≈0） ===');
const off = W.run({ seed: 11, dip: 38, azim: 120, aper: 3, noise: 6, nf: 4, induced: false });
const on = W.run({ seed: 11, dip: 38, azim: 120, aper: 3, noise: 6, nf: 4, induced: true });
console.log('不叠加  Hough tp/fp = ' + off.mH.tp + '/' + off.mH.fp + '   阈值法 fp = ' + off.mN.fp);
console.log('叠加后  Hough tp/fp = ' + on.mH.tp + '/' + on.mH.fp + '   阈值法 fp = ' + on.mN.fp);
console.log('→ 诱导缝对 Hough 的误检增量 ' + (on.mH.fp - off.mH.fp) + ' 条，对阈值法 ' + (on.mN.fp - off.mN.fp) + ' 条');
