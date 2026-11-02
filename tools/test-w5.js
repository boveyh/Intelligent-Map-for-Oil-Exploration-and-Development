/* w5 缺失段补全：产出正文引用的全部指标，可复算
   用法：node tools/test-w5.js */
global.window = {};
require('D:/Intelligent-Map-for-Oil-Exploration-and-Development/cases/w5-completion/demo/demo.js');
const W = global.window.W5CORE;
const f = (v) => v.toFixed(2);

function pad(s, n) { return String(s).padEnd(n); }

console.log('=== 1. 三种机制 × 缺失长度：RMSE（p.u.）/ 90% 区间覆盖率 ===');
['random', 'washout', 'casing'].forEach((mech) => {
  const r = W.scan(mech);
  const s = r.scan;
  console.log('\n--- ' + mech + ' ---');
  console.log(pad('L(m)', 7) + pad('线性', 15) + pad('邻井', 15) + pad('回归', 15) + pad('自动', 15) + '最优');
  s.L.forEach((L, i) => {
    const v = [s.lin[i], s.nb[i], s.reg[i], s.auto[i]];
    const nm = ['线性', '邻井', '回归', '自动'];
    const best = nm[v.indexOf(Math.min(...v))];
    console.log(pad(L.toFixed(1), 7) +
      pad(f(s.lin[i]) + ' /' + Math.round(s.cl[i] * 100) + '%', 15) +
      pad(f(s.nb[i]) + ' /' + Math.round(s.cn[i] * 100) + '%', 15) +
      pad(f(s.reg[i]) + ' /' + Math.round(s.cr[i] * 100) + '%', 15) +
      pad(f(s.auto[i]) + ' /' + Math.round(s.ca[i] * 100) + '%', 15) + best);
  });
  console.log('层界诊断：');
  s.L.forEach((L) => {
    const d = W.diag(mech, L, 'lin');
    console.log('  L=' + L.toFixed(1) + '  缺口 ' + d.total + ' / 跨层界 ' + d.nCross +
      '  层内误差 ' + (d.inRmse === null ? '—' : f(d.inRmse) + ' p.u.(' + d.nIn + '点)') +
      '  跨层界误差 ' + (d.crossRmse === null ? '—' : f(d.crossRmse) + ' p.u.') );
  });
  /* 交叉点：线性 与 回归 谁小 */
  let cross = null;
  for (let i = 1; i < s.L.length; i++) {
    if ((s.lin[i - 1] - s.reg[i - 1]) * (s.lin[i] - s.reg[i]) < 0) {
      cross = [s.L[i - 1], s.L[i]]; break;
    }
  }
  console.log('线性/回归 交叉区间：' + (cross ? cross[0] + '—' + cross[1] + ' m' : '无（扫描范围内不交叉）'));
});

console.log('\n=== 2. 缺失非随机（L = 2 m）===');
['random', 'washout', 'casing'].forEach((mech) => {
  const m = W.mnar(mech, 2);
  console.log(pad(mech, 10) + '缺失点砂岩占比 ' + Math.round(m.gapSand * 100) + '%' +
    '   全井砂岩占比 ' + Math.round(m.allSand * 100) + '%' +
    '   缺失样本占比 ' + Math.round(m.miss * 100) + '%');
});

console.log('\n=== 3. 净毛比 / 平均孔隙度：丢弃缺失点 vs 补全 vs 真值（L = 2 m）===');
['random', 'washout'].forEach((mech) => {
  ['lin', 'nb', 'reg', 'auto'].forEach((mi) => {
    const q = W.ng(mech, 2, mi);
    console.log(pad(mech + ' / ' + mi, 18) +
      '真值 N/G ' + (q.full.ng * 100).toFixed(1) + '%' +
      '   丢弃 ' + (q.drop.ng * 100).toFixed(1) + '%' +
      '   补全 ' + (q.fill.ng * 100).toFixed(1) + '%' +
      '  | 平均 φ 真值 ' + q.full.phi.toFixed(1) + '  补全 ' + q.fill.phi.toFixed(1));
  });
});

console.log('\n=== 4. 回归模型残差与系数（L = 4 m）===');
const ref = W.buildWell({ seed: 20261026, jit: 0 });
const gaps = W.gapsFor('washout', 4, ref);
const res = W.fillReg(ref, gaps);
console.log('系数 b0..b3 = ' + res.model.coef.map((v) => v.toFixed(4)).join(' / '));
console.log('残差标准差 = ' + res.model.sd.toFixed(4) + ' g/cm³ = ' + (res.model.sd * W.PU).toFixed(2) + ' p.u.');
console.log('90% 区间半宽 = ' + (1.645 * res.model.sd * W.PU).toFixed(2) + ' p.u.');

console.log('\n=== 5. 参考井曲线基本统计 ===');
['den', 'ac', 'gr', 'cnl'].forEach((k) => {
  const a = ref[k];
  const mn = Math.min(...a), mx = Math.max(...a);
  const avg = a.reduce((s, v) => s + v, 0) / a.length;
  console.log(pad(k, 6) + 'min ' + mn.toFixed(3) + '  max ' + mx.toFixed(3) + '  mean ' + avg.toFixed(3));
});
const lithCnt = [0, 0, 0, 0];
ref.lent.forEach((l) => lithCnt[l]++);
console.log('岩性占比：' + W.LITH.map((L, i) => L.n + ' ' + Math.round(lithCnt[i] / ref.lent.length * 100) + '%').join('  '));
console.log('采样 ' + W.NS + ' 点 / ' + W.BOT + ' m，步长 ' + W.DZ + ' m');
