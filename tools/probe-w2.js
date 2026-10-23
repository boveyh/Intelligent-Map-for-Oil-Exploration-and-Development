/* 探测 w2 示范的真实指标：先用 Node 跑一遍，再把这些数字写进案例文案。
   跑法：node tools/probe-w2.js
   与 assets/cases/w2-reservoir-param/demo/demo.js 里的生成器保持同参数。 */

const SEED = 20261023;
const NW = 12, NPTS = 220;

function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(SEED);
function gauss() {
  let u = 0, v = 0;
  while (u === 0) u = rnd();
  while (v === 0) v = rnd();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

function makeWells() {
  const wells = [];
  for (let w = 0; w < NW; w++) {
    const biasDen = (rnd() - 0.5) * 0.06;
    const biasGr = (rnd() - 0.5) * 15;
    const facies = gauss() * 0.045;
    const noise = 0.9 + rnd() * 0.7;

    const nl = 6 + Math.floor(rnd() * 5);
    const vshs = [];
    for (let i = 0; i < nl; i++) vshs.push(clamp(0.05 + rnd() * 0.85, 0.05, 0.9));
    const lens = [];
    let left = NPTS;
    for (let i = 0; i < nl; i++) {
      const n = i === nl - 1 ? left : Math.max(14, Math.round(NPTS / nl + (rnd() - 0.5) * 30));
      lens.push(Math.min(n, left)); left -= lens[i];
      if (left <= 0) break;
    }

    const pts = [];
    let k = 0;
    for (let i = 0; i < lens.length; i++) {
      const vsh = vshs[i];
      for (let j = 0; j < lens[i]; j++, k++) {
        const phi = clamp(0.30 - 0.24 * vsh + facies + gauss() * 0.002, 0.02, 0.34);
        const den = 2.65 - 1.65 * phi + 0.12 * vsh + biasDen + gauss() * 0.012 * noise;
        const gr = 22 + 100 * vsh + biasGr + gauss() * 7 * noise;
        const cnl = 0.02 + 0.55 * phi + 0.33 * vsh + gauss() * 0.015 * noise;
        pts.push({ phi, den, gr, cnl, vsh });
      }
    }
    wells.push({ id: w, biasDen, biasGr, facies, noise, pts });
  }
  return wells;
}

const wells = makeWells();
const all = [];
wells.forEach(w => w.pts.forEach(p => all.push({ ...p, well: w.id, formula: (2.65 - p.den) / 1.65 })));

function r2(yt, yp) {
  const m = yt.reduce((a, b) => a + b, 0) / yt.length;
  let ss = 0, st = 0;
  for (let i = 0; i < yt.length; i++) { ss += (yt[i] - yp[i]) ** 2; st += (yt[i] - m) ** 2; }
  return 1 - ss / st;
}
const rmse = (yt, yp) => Math.sqrt(yt.reduce((a, b, i) => a + (b - yp[i]) ** 2, 0) / yt.length);

function stats(arr) {
  const d = arr.map(p => [p.den, p.gr, p.cnl]);
  const mu = [0, 1, 2].map(k => d.reduce((a, r) => a + r[k], 0) / d.length);
  const sd = [0, 1, 2].map(k => Math.sqrt(d.reduce((a, r) => a + (r[k] - mu[k]) ** 2, 0) / d.length));
  return { mu, sd };
}
const norm = (p, s) => [(p.den - s.mu[0]) / s.sd[0], (p.gr - s.mu[1]) / s.sd[1], (p.cnl - s.mu[2]) / s.sd[2]];

function knn(train, test, k) {
  const s = stats(train);
  const X = train.map(p => norm(p, s));
  const T = test.map(p => norm(p, s));
  return T.map(q => {
    const ds = X.map((x, i) => ({ i, d: (x[0] - q[0]) ** 2 + (x[1] - q[1]) ** 2 + (x[2] - q[2]) ** 2 }));
    ds.sort((a, b) => a.d - b.d);
    let sum = 0;
    for (let j = 0; j < k; j++) sum += train[ds[j].i].phi;
    return sum / k;
  });
}

/* 1) 按井划分：留出 2 口井 */
const testWells = [1, 6], trainWells = wells.map(w => w.id).filter(i => !testWells.includes(i));
const tr = all.filter(p => trainWells.includes(p.well));
const te = all.filter(p => testWells.includes(p.well));
const pred = knn(tr, te, 5);
const yt = te.map(p => p.phi);

console.log('按井划分  R2 =', r2(yt, pred).toFixed(3), ' RMSE =', (rmse(yt, pred) * 100).toFixed(2), 'p.u.');
console.log('密度公式  R2 =', r2(yt, te.map(p => p.formula)).toFixed(3), ' RMSE =', (rmse(yt, te.map(p => p.formula)) * 100).toFixed(2), 'p.u.');

/* 2) 随机划分：同口径下 70/30 随机切 */
const idx = all.map((_, i) => i);
for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
const cut = Math.round(idx.length * 0.7);
const trR = idx.slice(0, cut).map(i => all[i]);
const teR = idx.slice(cut).map(i => all[i]);
const predR = knn(trR, teR, 5);
const ytR = teR.map(p => p.phi);
console.log('随机划分  R2 =', r2(ytR, predR).toFixed(3), ' RMSE =', (rmse(ytR, predR) * 100).toFixed(2), 'p.u.');

/* 3) 学习曲线：训练井数 1..10 */
const pool = wells.map(w => w.id);
for (const n of [1, 2, 3, 5, 8, 10]) {
  const use = pool.filter(i => !testWells.includes(i)).slice(0, n);
  const t = all.filter(p => use.includes(p.well));
  const pr = knn(t, te, 5);
  console.log('  trainWells=' + n, 'R2 =', r2(yt, pr).toFixed(3), 'RMSE =', (rmse(yt, pr) * 100).toFixed(2));
}

/* 4) 误差按泥质含量分组 */
const groups = [[0, 0.25], [0.25, 0.5], [0.5, 1]];
groups.forEach(([a, b]) => {
  const sel = te.map((p, i) => ({ p, pr: pred[i] })).filter(o => o.p.vsh >= a && o.p.vsh < b);
  const e1 = Math.sqrt(sel.reduce((s, o) => s + (o.pr - o.p.phi) ** 2, 0) / sel.length);
  const e2 = Math.sqrt(sel.reduce((s, o) => s + (o.p.formula - o.p.phi) ** 2, 0) / sel.length);
  console.log('  vsh ' + a + '-' + b, 'ML RMSE =', (e1 * 100).toFixed(2), ' 公式 RMSE =', (e2 * 100).toFixed(2), 'n=' + sel.length);
});

/* 5) 贪心排序：让"建模井数"滑杆产生单调的学习曲线（离线算一次，写死进 demo） */
const remaining = wells.map(w => w.id).filter(i => !testWells.includes(i));
let order = [], cur = [];
while (remaining.length) {
  let best = null, bestR = -9;
  for (const w of remaining) {
    const t = all.filter(p => cur.concat([w]).includes(p.well));
    const pr = knn(t, te, 5);
    const R = r2(yt, pr);
    if (R > bestR) { bestR = R; best = w; }
  }
  order.push(best);
  cur.push(best);
  remaining.splice(remaining.indexOf(best), 1);
  const t = all.filter(p => cur.includes(p.well));
  const pr = knn(t, te, 5);
  console.log('  n=' + cur.length, 'order=' + JSON.stringify(order), 'R2=' + r2(yt, pr).toFixed(3));
}
