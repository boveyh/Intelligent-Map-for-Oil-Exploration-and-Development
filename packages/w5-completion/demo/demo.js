/* =========================================================
   w5 · 测井缺失段智能补全 —— 可运行示范（自包含，无外部依赖）
   ---------------------------------------------------------
   演示三件事：
     ① 缺失不是随机的：扩径段集中在疏松砂岩，直接丢弃缺失点做统计 = 有偏；
     ② 三种补全方法各有适用长度：短缺失线性插值就够，长缺失必须多曲线回归；
     ③ 长缺失段该给的是「不确定度区间」，不是一条硬填的曲线。
   纯函数导出到 window.W5CORE，供 tools/test-w5.js 在 Node 里复算。
   ========================================================= */
(function () {
  'use strict';

  /* ---------------- 基础 ---------------- */
  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function gauss(rnd) {
    var u = 0, v = 0;
    while (u === 0) u = rnd();
    while (v === 0) v = rnd();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  var DZ = 0.125;          /* 采样间隔，m */
  var BOT = 62;            /* 研究井段，m */
  var NS = Math.round(BOT / DZ) + 1;

  /* 四类岩性 + 各自的骨架参数（Wyllie 公式用） */
  var LITH = [
    { n: '砂岩', c: '#d9b45c', gr: 42, grs: 8, rma: 2.65, acma: 182, loose: 1.08, cnl: 0.20, phi: [0.205, 0.045] },
    { n: '泥质砂岩', c: '#9aa95e', gr: 70, grs: 10, rma: 2.66, acma: 212, loose: 1.04, cnl: 0.27, phi: [0.150, 0.038] },
    { n: '泥岩', c: '#8b8878', gr: 104, grs: 10, rma: 2.72, acma: 300, loose: 1.00, cnl: 0.35, phi: [0.070, 0.022] },
    { n: '灰岩', c: '#7d9cbd', gr: 24, grs: 6, rma: 2.71, acma: 156, loose: 1.00, cnl: 0.05, phi: [0.060, 0.030] }
  ];
  var NL = LITH.length;

  /* ---------------- 地层柱 ----------------
     全区共用一套地层（同一区块钻遇同样的层序），每口井只是厚度略有差异。
     vug = 该层的「密度孔隙度 - 声波孔隙度」差（溶孔、黏土束缚水、气影响），
     这是多曲线回归永远恢复不了的部分 —— 也是它的误差下限。 */
  var BEDS = (function () {
    var rnd = mulberry32(9182);
    var CYC = [0, 2, 1, 0, 3, 2, 1, 2, 0, 3, 2, 1];
    var out = [], z = 0, ci = 0;
    while (z < BOT) {
      var l = CYC[ci % CYC.length];
      var th = 1.2 + rnd() * 3.4;
      var phi = clamp(LITH[l].phi[0] + gauss(rnd) * LITH[l].phi[1], 0.02, 0.32);
      out.push({ lent: l, th: th, phi: phi, vug: gauss(rnd) * 0.016 });
      z += th; ci++;
    }
    return out;
  })();

  function column(jit, seed) {
    var rnd = mulberry32(seed);
    var tops = [], cum = 0;
    BEDS.forEach(function (b) {
      tops.push(cum);
      cum += b.th * (1 + (jit ? gauss(rnd) * jit : 0));
    });
    return { tops: tops, tot: cum };
  }

  function bedAt(col, z) {
    var zz = z / BOT * col.tot;
    var lo = 0, hi = col.tops.length - 1;
    while (lo < hi) {
      var mid = (lo + hi + 1) >> 1;
      if (col.tops[mid] <= zz) lo = mid; else hi = mid - 1;
    }
    return lo;
  }

  /* 平滑：3 点滑动平均，模拟仪器纵向响应（0.375 m） */
  function smooth(a) {
    var o = new Array(a.length);
    for (var i = 0; i < a.length; i++) {
      var s = 0, n = 0;
      for (var k = -1; k <= 1; k++) {
        var j = i + k;
        if (j >= 0 && j < a.length) { s += a[j]; n++; }
      }
      o[i] = s / n;
    }
    return o;
  }

  /* ---------------- 造一口井 ----------------
     opts: { jit 层厚抖动, lphi 层内孔隙度横向变化, tie 深度对比误差(m), seed } */
  function buildWell(opts) {
    var o = opts || {};
    var seed = o.seed || 1;
    var rnd = mulberry32(seed);
    var col = column(o.jit || 0, seed + 7);
    var lat = BEDS.map(function () { return 1 + gauss(rnd) * (o.lphi || 0); });

    var z = [], lent = [], phiT = [], den = [], ac = [], gr = [], cnl = [];
    var tie = o.tie || 0;
    for (var i = 0; i < NS; i++) {
      var d = i * DZ;
      z.push(d);
      var bi = bedAt(col, d + tie);
      var b = BEDS[bi], L = LITH[b.lent];
      var p = clamp(b.phi * lat[bi], 0.02, 0.32);
      phiT.push(p);
      lent.push(b.lent);

      var pv = p + b.vug;                       /* 密度读到的孔隙度 */
      den.push((pv) * 1.0 + (1 - pv) * L.rma + gauss(rnd) * 0.014);
      ac.push((p * 620 + (1 - p) * L.acma) * L.loose + gauss(rnd) * 5.5);
      gr.push(L.gr + gauss(rnd) * L.grs);
      cnl.push(L.cnl * 0.6 + p * 1.6 + gauss(rnd) * 0.012);
    }
    return {
      z: z, lent: lent, phiT: phiT,
      den: smooth(den), ac: smooth(ac), gr: smooth(gr), cnl: smooth(cnl)
    };
  }

  /* ---------------- 缺失位置 ----------------
     三种机制：
       random   随机丢段（仪器故障、传输丢包）
       washout  扩径相关：井壁坍塌集中在疏松砂岩段，按段内砂岩占比抽取
       casing   套管/落鱼段：一段连续长缺失，位置固定 */
  var GAP0 = 26;   /* 曲线道里展示的那一段缺失的起点 */

  function sandFrac(well, i0, i1) {
    var s = 0;
    for (var i = Math.max(0, i0); i <= Math.min(NS - 1, i1); i++) {
      var l = well.lent[i];
      if (l === 0 || l === 1) s++;
    }
    return s / (Math.min(NS - 1, i1) - Math.max(0, i0) + 1);
  }

  /* 返回 [[i0,i1], ...] 的缺失样本区间（含端点） */
  function gapsFor(mech, L, well, sh) {
    var n = Math.max(1, Math.round(L / DZ));
    var out = [], k, st;
    sh = sh || 0;
    if (mech === 'casing') {
      /* 三段套管/落鱼段，位置固定（井深的 1/4、1/2、3/4），不挑位置 */
      [0.25, 0.5, 0.75].forEach(function (f) {
        var c0 = clamp(Math.round(BOT * f / DZ - n / 2), 1, NS - 2 - n);
        out.push([c0, c0 + n - 1]);
      });
      return out;
    }
    /* 把井段均分成若干槽，每槽放一段长 L 的缺失。槽数随 L 变，
       保证缺失比例不随长度爆炸（否则 L=8 m 会把整口井吃光，对比就失去意义）。 */
    var slots = clamp(Math.floor(25 / L), 2, 16);
    var sp = BOT / slots;
    var pad = Math.max(0, (sp - L) / 2 - 0.2);
    var rnd = mulberry32(9917);
    for (k = 0; k < slots; k++) {
      var c = (k + 0.5 + sh) * sp;
      if (mech === 'random') {
        st = Math.round((c - L / 2 + (rnd() - 0.5) * Math.min(pad, 3.2)) / DZ);
      } else {
        /* washout：在槽内左右滑动，挑段内砂岩占比最高的位置（井壁坍塌集中在疏松砂岩） */
        var best = -1;
        for (var ofs = -pad; ofs <= pad + 1e-9; ofs += 0.5) {
          var s0 = Math.round((c - L / 2 + ofs) / DZ);
          var f0 = sandFrac(well, s0, s0 + n - 1);
          if (f0 > best) { best = f0; st = s0; }
        }
      }
      st = clamp(st, 1, NS - 2 - n);
      out.push([st, st + n - 1]);
    }
    return out;
  }

  /* ---------------- 三种补全 ---------------- */

  /* ① 线性插值：只用本井两端点 */
  function fillLinear(well, gaps) {
    var out = well.den.slice();
    var se = new Array(NS).fill(0);
    gaps.forEach(function (g) {
      var a = Math.max(0, g[0] - 1), b = Math.min(NS - 1, g[1] + 1);
      var v0 = well.den[a], v1 = well.den[b];
      var n = b - a;
      for (var i = g[0]; i <= g[1]; i++) {
        out[i] = v0 + (v1 - v0) * (i - a) / n;
        se[i] = Math.abs(v1 - v0) / 2;          /* 端点差的一半，业内常用的粗略区间 */
      }
    });
    return { den: out, se: se };
  }

  /* ② 邻井借值：同深度直接搬邻井曲线（含层位对比误差） */
  function fillNeighbor(well, gaps, nb) {
    var out = well.den.slice();
    var se = new Array(NS).fill(0);
    gaps.forEach(function (g) {
      for (var i = g[0]; i <= g[1]; i++) {
        out[i] = nb.den[i];
        se[i] = 0.020 * 1.65;                   /* 假定横向变化 2 p.u. */
      }
    });
    return { den: out, se: se };
  }

  /* ③ 多曲线回归：DEN ~ 1 + GR + AC + CNL，用未缺失段的可见样本拟合 */
  function fitReg(well, vis) {
    var X = [], y = [];
    for (var i = 0; i < NS; i++) {
      if (!vis[i]) continue;
      X.push([1, (well.gr[i] - 70) / 30, (well.ac[i] - 260) / 60, (well.cnl[i] - 0.2) / 0.1]);
      y.push(well.den[i]);
    }
    var m = 4;
    var A = [], b = [];
    for (var r = 0; r < m; r++) { A.push(new Array(m).fill(0)); b.push(0); }
    for (var s = 0; s < X.length; s++) {
      for (var p = 0; p < m; p++) {
        b[p] += X[s][p] * y[s];
        for (var q = 0; q < m; q++) A[p][q] += X[s][p] * X[s][q];
      }
    }
    for (var d = 0; d < m; d++) A[d][d] += 1e-6;    /* 极小岭项，防奇异 */
    /* 高斯消元 */
    for (var c = 0; c < m; c++) {
      var piv = c;
      for (var r2 = c + 1; r2 < m; r2++) if (Math.abs(A[r2][c]) > Math.abs(A[piv][c])) piv = r2;
      var t = A[c]; A[c] = A[piv]; A[piv] = t;
      var tb = b[c]; b[c] = b[piv]; b[piv] = tb;
      for (var r3 = 0; r3 < m; r3++) {
        if (r3 === c) continue;
        var f = A[r3][c] / A[c][c];
        if (!f) continue;
        for (var k = c; k < m; k++) A[r3][k] -= f * A[c][k];
        b[r3] -= f * b[c];
      }
    }
    var coef = b.map(function (v, i) { return v / A[i][i]; });
    /* 残差标准差 */
    var ss = 0, n = 0;
    for (var i2 = 0; i2 < X.length; i2++) {
      var pr = coef[0];
      for (var j = 1; j < m; j++) pr += coef[j] * X[i2][j];
      ss += (pr - y[i2]) * (pr - y[i2]); n++;
    }
    return { coef: coef, sd: Math.sqrt(ss / Math.max(1, n - m)) };
  }

  function predReg(model, well, i) {
    var x = [1, (well.gr[i] - 70) / 30, (well.ac[i] - 260) / 60, (well.cnl[i] - 0.2) / 0.1];
    var v = model.coef[0];
    for (var j = 1; j < 4; j++) v += model.coef[j] * x[j];
    return v;
  }

  function fillReg(well, gaps) {
    var vis = new Array(NS).fill(true);
    gaps.forEach(function (g) { for (var i = g[0]; i <= g[1]; i++) vis[i] = false; });
    var model = fitReg(well, vis);
    var out = well.den.slice();
    var se = new Array(NS).fill(0);
    gaps.forEach(function (g) {
      for (var i = g[0]; i <= g[1]; i++) {
        out[i] = predReg(model, well, i);
        se[i] = 1.645 * model.sd;
      }
    });
    return { den: out, se: se, model: model };
  }

  /* ④ 按层界择一：缺口两端 GR 差够大 → 说明缺口跨了层界面，改用回归；
     否则说明缺口还在同一层里，线性插值更稳。只用缺口外的信息，不偷看真值。 */
  var AUTO_TH = 15;
  function fillAuto(well, gaps) {
    var lin = fillLinear(well, gaps);
    var reg = fillReg(well, gaps);
    var out = lin.den.slice(), se = lin.se.slice(), picked = [];
    gaps.forEach(function (g) {
      var a = Math.max(0, g[0] - 1), b = Math.min(NS - 1, g[1] + 1);
      var d = Math.abs(well.gr[b] - well.gr[a]);
      var useReg = d > AUTO_TH;
      picked.push({ span: d, reg: useReg });
      for (var i = g[0]; i <= g[1]; i++) {
        out[i] = useReg ? reg.den[i] : lin.den[i];
        se[i] = useReg ? reg.se[i] : lin.se[i];
      }
    });
    return { den: out, se: se, picked: picked };
  }

  /* ---------------- 评价 ---------------- */
  var PU = 1 / 1.65 * 100;    /* ΔDEN → 孔隙度百分点 */

  function evalGaps(well, gaps, res) {
    var se = 0, n = 0, cov = 0;
    gaps.forEach(function (g) {
      for (var i = g[0]; i <= g[1]; i++) {
        var e = (res.den[i] - well.den[i]) * PU;
        se += e * e; n++;
        if (Math.abs(res.den[i] - well.den[i]) <= res.se[i]) cov++;
      }
    });
    return { rmse: Math.sqrt(se / Math.max(1, n)), n: n, cov: cov / Math.max(1, n) };
  }

  /* 一条机制的完整扫描：L → 四方法 RMSE / 区间覆盖率 */
  function scan(mech, opt) {
    var o = opt || {};
    var ref = buildWell({ seed: 20261026, jit: 0 });
    var nb = buildWell({ seed: 5150, jit: 0.04, lphi: 0.02, tie: o.tie == null ? 0.35 : o.tie });
    var Ls = [0.5, 1, 1.5, 2, 2.5, 3, 4, 5, 6, 8];
    var out = { L: Ls, lin: [], nb: [], reg: [], auto: [], cl: [], cn: [], cr: [], ca: [] };
    Ls.forEach(function (L) {
      var acc = { lin: [0, 0], nb: [0, 0], reg: [0, 0], auto: [0, 0] };
      [0, 1 / 3, 2 / 3].forEach(function (sh) {
        var gaps = gapsFor(mech, L, ref, sh);
        [['lin', fillLinear(ref, gaps)], ['nb', fillNeighbor(ref, gaps, nb)],
        ['reg', fillReg(ref, gaps)], ['auto', fillAuto(ref, gaps)]].forEach(function (h) {
          var e = evalGaps(ref, gaps, h[1]);
          acc[h[0]][0] += e.rmse * e.rmse * e.n;
          acc[h[0]][1] += e.cov * e.n;
          acc[h[0]][2] = (acc[h[0]][2] || 0) + e.n;
        });
      });
      ['lin', 'nb', 'reg', 'auto'].forEach(function (k) {
        var a = acc[k];
        var rm = Math.sqrt(a[0] / a[2]);
        if (k === 'lin') { out.lin.push(rm); out.cl.push(a[1] / a[2]); }
        if (k === 'nb') { out.nb.push(rm); out.cn.push(a[1] / a[2]); }
        if (k === 'reg') { out.reg.push(rm); out.cr.push(a[1] / a[2]); }
        if (k === 'auto') { out.auto.push(rm); out.ca.push(a[1] / a[2]); }
      });
    });
    return { scan: out, ref: ref, nb: nb };
  }

  /* 缺失非随机：缺失点里被判为砂岩（GR<60，解释用的实际判据）的比例 vs 全井 */
  var GRCUT = 60;
  function maskOf(gaps) {
    var m = new Array(NS).fill(false);
    gaps.forEach(function (g) { for (var i = g[0]; i <= g[1]; i++) m[i] = true; });
    return m;
  }
  function mnar(mech, L) {
    var ref = buildWell({ seed: 20261026, jit: 0 });
    var mask = maskOf(gapsFor(mech, L, ref));
    var gs = 0, ga = 0, ws = 0, wa = 0;
    for (var i = 0; i < NS; i++) {
      var isS = ref.gr[i] < GRCUT;
      wa++; if (isS) ws++;
      if (mask[i]) { ga++; if (isS) gs++; }
    }
    return { gapSand: ga ? gs / ga : 0, allSand: ws / wa, miss: ga / NS };
  }

  /* 净毛比与平均孔隙度：丢弃缺失点 / 补全后 / 真值
     三者的孔隙度都用同一个式子 φ=(2.65-DEN)/1.65 算，差别只来自补全误差本身 */
  function ng(mech, L, method) {
    var ref = buildWell({ seed: 20261026, jit: 0 });
    var nb = buildWell({ seed: 5150, jit: 0.04, lphi: 0.02, tie: 0.35 });
    var gaps = gapsFor(mech, L, ref);
    var mask = maskOf(gaps);
    var res = method === 'reg' ? fillReg(ref, gaps)
      : method === 'nb' ? fillNeighbor(ref, gaps, nb)
        : method === 'auto' ? fillAuto(ref, gaps) : fillLinear(ref, gaps);

    function run(mode) {
      var net = 0, tot = 0, psum = 0;
      for (var i = 0; i < NS; i++) {
        if (mode === 'drop' && mask[i]) continue;
        var isS = ref.gr[i] < GRCUT;
        tot++;
        var d = (mode === 'fill' && mask[i]) ? res.den[i] : ref.den[i];
        if (isS) { net++; psum += (2.65 - d) / 1.65 * 100; }
      }
      return { ng: net / tot, phi: psum / Math.max(1, net) };
    }
    return { full: run('all'), drop: run('drop'), fill: run('fill') };
  }

  /* 统一入口 */
  function fill(well, gaps, nb, mi) {
    if (mi === 'reg') return fillReg(well, gaps);
    if (mi === 'nb') return fillNeighbor(well, gaps, nb);
    if (mi === 'auto') return fillAuto(well, gaps);
    return fillLinear(well, gaps);
  }

  /* 诊断：把缺口分成「层内缺口」和「跨层界缺口」两组，分别统计误差。
     线性插值真正的软肋不是长度，而是缺口有没有跨过层界面。 */
  function diag(mech, L, mi) {
    var ref = buildWell({ seed: 20261026, jit: 0 });
    var nb = buildWell({ seed: 5150, jit: 0.04, lphi: 0.02, tie: 0.35 });
    var cross = { n: 0, se: 0 }, inb = { n: 0, se: 0 }, nGap = 0, nCross = 0;
    [0, 1 / 3, 2 / 3].forEach(function (sh) {
      var gaps = gapsFor(mech, L, ref, sh);
      var res = fill(ref, gaps, nb, mi);
      gaps.forEach(function (g) {
        var change = false;
        for (var i = g[0]; i <= g[1]; i++) if (ref.lent[i] !== ref.lent[g[0]]) { change = true; break; }
        nGap++; if (change) nCross++;
        var t = change ? cross : inb;
        for (var j = g[0]; j <= g[1]; j++) {
          var e = (res.den[j] - ref.den[j]) * PU;
          t.se += e * e; t.n++;
        }
      });
    });
    return {
      total: nGap, nCross: nCross, nIn: inb.n, nCrossPt: cross.n,
      crossRmse: cross.n ? Math.sqrt(cross.se / cross.n) : null,
      inRmse: inb.n ? Math.sqrt(inb.se / inb.n) : null,
      pick: null
    };
  }

  var API = {
    LITH: LITH, NL: NL, BEDS: BEDS, DZ: DZ, BOT: BOT, NS: NS, GAP0: GAP0, GRCUT: GRCUT,
    buildWell: buildWell, gapsFor: gapsFor, sandFrac: sandFrac, maskOf: maskOf,
    fillLinear: fillLinear, fillNeighbor: fillNeighbor, fillReg: fillReg, fillAuto: fillAuto,
    predReg: predReg, evalGaps: evalGaps, scan: scan, mnar: mnar, ng: ng, PU: PU,
    AUTO_TH: AUTO_TH, fitReg: fitReg, fill: fill, diag: diag
  };
  if (typeof window !== 'undefined') { window.W5CORE = API; }

  /* =========================================================
     渲染
     ========================================================= */
  var CSS = [
    '.w5{font-size:13px;color:#242b2e;line-height:1.6;font-family:inherit}',
    '.w5 *{box-sizing:border-box}',
    '.w5-kpi{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-bottom:12px}',
    '.w5-k{background:#faf8f2;border-radius:8px;padding:9px 10px;min-width:0;border:1px solid transparent}',
    '.w5-k .l{font-size:10px;color:#79828a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.w5-k .v{font-family:ui-monospace,monospace;font-size:15px;font-weight:600;margin-top:3px;white-space:nowrap}',
    '.w5-k .v small{font-size:10px;font-weight:400;color:#79828a;margin-left:3px}',
    '.w5-k.sel{border-color:#2f7d6b;background:#f2f7f5}',
    '.w5-k.sel .l{color:#2f7d6b;font-weight:600}',
    '.w5-main{display:flex;gap:16px;align-items:flex-start}',
    '.w5-track{position:relative;flex:0 0 392px;width:392px;border:1px solid #e9e4d8;border-radius:8px;overflow:hidden;background:#fff}',
    '.w5-track canvas{display:block;width:100%;height:auto}',
    '.w5-side{flex:1;min-width:0}',
    '.w5-side .cap{font-size:10.5px;color:#79828a;margin-bottom:3px}',
    '.w5-tb{width:100%;border-collapse:collapse;font-size:10.5px;margin-top:6px}',
    '.w5-tb th,.w5-tb td{border-bottom:1px solid #eeeae0;padding:3px 4px;text-align:right}',
    '.w5-tb th{color:#79828a;font-weight:500;font-size:9.5px}',
    '.w5-tb td:first-child,.w5-tb th:first-child{text-align:left}',
    '.w5-tb td{font-family:ui-monospace,monospace;color:#3f474c}',
    '.w5-ctl{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px 16px;margin-top:14px;padding-top:12px;border-top:1px solid #eeeae0}',
    '.w5-c{min-width:0}',
    '.w5-c label{display:flex;justify-content:space-between;font-size:10.5px;color:#5d666d;margin-bottom:2px}',
    '.w5-c label b{font-family:ui-monospace,monospace;color:#242b2e;font-weight:600}',
    '.w5-c input[type=range]{width:100%;height:16px;accent-color:#2f7d6b;margin:0}',
    '.w5-btns{display:flex;gap:5px;flex-wrap:wrap}',
    '.w5-b{flex:1 1 auto;min-width:0;font-size:10.5px;padding:4px 6px;border:1px solid #ddd6c6;background:#fff;border-radius:6px;color:#5d666d;cursor:pointer;white-space:nowrap}',
    '.w5-b.on{border-color:#2f7d6b;background:#f2f7f5;color:#2f7d6b;font-weight:600}',
    '.w5-note{margin-top:12px;padding:9px 11px;border-left:3px solid #2f7d6b;background:#f2f7f5;border-radius:0 8px 8px 0;font-size:11.5px;color:#3f6d61}',
    '.w5-note.warn{border-left-color:#b26a39;background:#fbf3ed;color:#8c5340}',
    '.w5-note b{color:inherit}',
    '@media(max-width:760px){.w5-main{flex-direction:column}.w5-cv,.w5-side,.w5-track,.w5-img{flex:none;width:100%;min-width:0;max-width:100%}.w5-main canvas{width:100%!important;height:auto!important}.w5-kpi{grid-template-columns:repeat(2,minmax(0,1fr))}.w5-ctl{grid-template-columns:1fr}.w5-c[style]{grid-column:auto!important}}',
  ].join('\n');

  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }

  var MC = { random: '随机丢段', washout: '扩径相关', casing: '套管连续段' };
  var MN = { lin: '线性插值', nb: '邻井借值', reg: '多曲线回归', auto: '按层界择一' };
  var MW = { lin: '#b26a39', nb: '#41699b', reg: '#2f7d6b', auto: '#7e5a8d' };

  function mount(root) {
    if (!root.querySelector('style[data-w5]')) {
      var st = document.createElement('style');
      st.setAttribute('data-w5', '1');
      st.textContent = CSS;
      root.appendChild(st);
    }

    var state = { L: 2, mech: 'washout', mi: 'reg' };
    var cache = {};
    function getScan(mech) {
      if (!cache[mech]) cache[mech] = scan(mech);
      return cache[mech];
    }

    root.appendChild(el('div', 'w5-kpi', '<div class="w5-k" id="w5k0"></div><div class="w5-k" id="w5k1"></div><div class="w5-k" id="w5k2"></div><div class="w5-k" id="w5k3"></div>'));

    var main = el('div', 'w5-main');
    main.appendChild(el('div', 'w5-track', '<canvas id="w5cv"></canvas>'));
    var side = el('div', 'w5-side');
    side.innerHTML = '<div class="cap">补全误差随缺失长度的变化（24 个缺失位置平均，纵轴为孔隙度百分点）</div>' +
      '<canvas id="w5ch"></canvas><table class="w5-tb" id="w5tb"></table>';
    main.appendChild(side);
    root.appendChild(main);

    var ctl = el('div', 'w5-ctl');
    ctl.innerHTML =
      '<div class="w5-c"><label>缺失长度 <b id="w5lL">2.0 m</b></label><input id="w5sL" type="range" min="5" max="80" step="5" value="20"></div>' +
      '<div class="w5-c"><label>缺失机制</label><div class="w5-btns">' +
      '<button class="w5-b on" data-m="random">随机</button><button class="w5-b" data-m="washout">扩径</button><button class="w5-b" data-m="casing">套管</button></div></div>' +
      '<div class="w5-c"><label>补全方法</label><div class="w5-btns">' +
      '<button class="w5-b" data-x="lin">线性</button><button class="w5-b" data-x="nb">邻井</button><button class="w5-b on" data-x="reg">回归</button><button class="w5-b" data-x="auto">自动</button></div></div>';
    root.appendChild(ctl);
    root.appendChild(el('div', 'w5-note', ''));

    var cv = root.querySelector('#w5cv'), ch = root.querySelector('#w5ch');
    var note = root.querySelector('.w5-note');

    /* ---------- 曲线道 ---------- */
    function paintTrack(mech, L, mi) {
      var W = 392, H = 442;
      var dpr = 2;
      cv.width = W * dpr; cv.height = H * dpr;
      cv.style.width = W + 'px'; cv.style.height = H + 'px';
      var g = cv.getContext('2d');
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, W, H);

      var ref = getScan(mech).ref;
      var nb = getScan(mech).nb;
      var n = Math.max(1, Math.round(L / DZ));
      var i0 = Math.round(GAP0 / DZ), i1 = i0 + n - 1;
      var gaps = [[i0, i1]];
      var res = mi === 'reg' ? fillReg(ref, gaps) : mi === 'nb' ? fillNeighbor(ref, gaps, nb) : fillLinear(ref, gaps);

      var x0 = 62, x1 = W - 20, y0 = 22, y1 = H - 58;
      var DMIN = 2.20, DMAX = 2.76;
      var X = function (v) {
        v = v < DMIN ? DMIN : v > DMAX ? DMAX : v;
        return x0 + (v - DMIN) / (DMAX - DMIN) * (x1 - x0);
      };
      var Y = function (d) { return y0 + d / BOT * (y1 - y0); };

      /* 岩性道 */
      for (var i = 0; i < NS; i += 1) {
        var yy = Y(ref.z[i]);
        g.fillStyle = LITH[ref.lent[i]].c;
        g.globalAlpha = 0.42;
        g.fillRect(10, yy, 26, (y1 - y0) / NS + 0.7);
      }
      g.globalAlpha = 1;
      g.strokeStyle = '#e9e4d8';
      g.strokeRect(10, y0, 26, y1 - y0);

      /* 网格 */
      g.strokeStyle = '#eeeae0'; g.lineWidth = 1;
      g.font = '9px ui-monospace,monospace'; g.fillStyle = '#9ba3a9';
      var dm = 5;
      for (var v = Math.ceil(DMIN / dm) * dm; v <= DMAX; v += dm) {
        g.beginPath(); g.moveTo(X(v), y0); g.lineTo(X(v), y1); g.stroke();
        g.textAlign = 'center'; g.fillText(v.toFixed(2), X(v), y1 + 13);
      }
      [0, 10, 20, 30, 40, 50, 60].forEach(function (d) {
        g.beginPath(); g.moveTo(x0, Y(d)); g.lineTo(x1, Y(d)); g.stroke();
        g.textAlign = 'right'; g.fillText(d + '', x0 - 5, Y(d) + 3);
      });

      /* 缺失段底色 */
      g.fillStyle = 'rgba(192,57,43,.055)';
      g.fillRect(x0, Y(ref.z[i0]), x1 - x0, Y(ref.z[Math.min(NS - 1, i1)]) - Y(ref.z[i0]));

      /* 不确定度带 */
      g.beginPath();
      for (var k = i0; k <= i1; k++) g.lineTo(X(res.den[k] - res.se[k]), Y(ref.z[k]));
      for (var k2 = i1; k2 >= i0; k2--) g.lineTo(X(res.den[k2] + res.se[k2]), Y(ref.z[k2]));
      g.closePath();
      g.fillStyle = mi === 'reg' ? 'rgba(47,125,107,.16)' : 'rgba(178,106,57,.13)';
      g.fill();

      /* 真实曲线（缺失段用虚线，露出"我们看不见它"） */
      g.lineWidth = 1.4; g.strokeStyle = '#c9c2b0'; g.setLineDash([4, 3]);
      g.beginPath();
      for (var j = 0; j < NS; j++) g.lineTo(X(ref.den[j]), Y(ref.z[j]));
      g.stroke(); g.setLineDash([]);

      /* 完整段的实线 */
      g.strokeStyle = '#5d666d'; g.lineWidth = 1.6;
      g.beginPath();
      var started = false;
      for (var j2 = 0; j2 < NS; j2++) {
        if (j2 >= i0 && j2 <= i1) { started = false; continue; }
        if (!started) { g.moveTo(X(ref.den[j2]), Y(ref.z[j2])); started = true; }
        else g.lineTo(X(ref.den[j2]), Y(ref.z[j2]));
      }
      g.stroke();

      /* 补全曲线 */
      g.strokeStyle = MW[mi]; g.lineWidth = 2;
      g.beginPath();
      for (var k3 = i0; k3 <= i1; k3++) g.lineTo(X(res.den[k3]), Y(ref.z[k3]));
      g.stroke();

      /* 端点标记 */
      [i0, i1].forEach(function (k) {
        g.beginPath(); g.arc(X(ref.den[k]), Y(ref.z[k]), 2.6, 0, 7);
        g.fillStyle = '#c9c2b0'; g.fill();
      });

      /* 轴与标注 */
      g.strokeStyle = '#c9c2b0';
      g.strokeRect(x0, y0, x1 - x0, y1 - y0);
      g.fillStyle = '#5d666d'; g.font = '10px system-ui,sans-serif';
      g.textAlign = 'center'; g.fillText('密度 DEN / g·cm⁻³', (x0 + x1) / 2, 14);
      g.save(); g.translate(6, (y0 + y1) / 2); g.rotate(-Math.PI / 2);
      g.fillText('深度 / m', 0, 0); g.restore();
      g.font = '8.5px system-ui,sans-serif'; g.fillStyle = '#8a939a';
      g.fillText('岩性', 23, 12);

      /* 图例 */
      g.font = '9.5px system-ui,sans-serif';
      g.textAlign = 'left';
      var lg = [['#5d666d', '实测'], [MW[mi], '补全'], ['#c9c2b0', '真实值']];
      lg.forEach(function (t, i) {
        var lx = x0 + 4 + i * 108, ly = y1 + 24;
        g.strokeStyle = t[0]; g.lineWidth = 2;
        g.beginPath(); g.moveTo(lx, ly - 3); g.lineTo(lx + 14, ly - 3); g.stroke();
        g.fillStyle = '#79828a'; g.fillText(t[1], lx + 19, ly);
      });
    }

    /* ---------- 误差曲线 ---------- */
    function paintChart(mech, L, mi) {
      var W = 392, H = 214;
      var dpr = 2;
      ch.width = W * dpr; ch.height = H * dpr;
      ch.style.width = W + 'px'; ch.style.height = H + 'px';
      var g = ch.getContext('2d');
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, W, H);

      var sc = getScan(mech).scan;
      var x0 = 40, x1 = W - 12, y0 = 14, y1 = H - 30;
      var YMAX = 16;
      var X = function (v) { return x0 + (v - 0.5) / (8 - 0.5) * (x1 - x0); };
      var Y = function (v) { return y1 - Math.min(v, YMAX) / YMAX * (y1 - y0); };

      g.strokeStyle = '#eeeae0'; g.lineWidth = 1;
      g.font = '9px ui-monospace,monospace'; g.fillStyle = '#9ba3a9';
      [0, 4, 8, 12, 16].forEach(function (v) {
        g.beginPath(); g.moveTo(x0, Y(v)); g.lineTo(x1, Y(v)); g.stroke();
        g.textAlign = 'right'; g.fillText(v + '', x0 - 5, Y(v) + 3);
      });
      [1, 2, 4, 6, 8].forEach(function (v) {
        g.textAlign = 'center'; g.fillText(v + '', X(v), y1 + 13);
      });

      [['lin', sc.lin], ['nb', sc.nb], ['reg', sc.reg], ['auto', sc.auto]].forEach(function (s) {
        var isCur = s[0] === mi;
        g.strokeStyle = MW[s[0]]; g.lineWidth = isCur ? 2.4 : 1.4;
        g.globalAlpha = isCur ? 1 : 0.55;
        g.beginPath();
        s[1].forEach(function (v, i) { g.lineTo(X(sc.L[i]), Y(v)); });
        g.stroke();
        g.globalAlpha = 1;
        s[1].forEach(function (v, i) {
          g.beginPath(); g.arc(X(sc.L[i]), Y(v), isCur ? 2.2 : 1.6, 0, 7);
          g.fillStyle = MW[s[0]]; g.fill();
        });
      });

      /* 当前 L 竖线 */
      g.strokeStyle = '#c0392b'; g.lineWidth = 1; g.setLineDash([3, 3]);
      g.beginPath(); g.moveTo(X(L), y0); g.lineTo(X(L), y1); g.stroke(); g.setLineDash([]);

      g.strokeStyle = '#c9c2b0';
      g.beginPath(); g.moveTo(x0, y1); g.lineTo(x1, y1); g.moveTo(x0, y1); g.lineTo(x0, y0); g.stroke();

      g.fillStyle = '#5d666d'; g.font = '9.5px system-ui,sans-serif';
      g.textAlign = 'center'; g.fillText('缺失长度 / m', (x0 + x1) / 2, H - 6);
      g.save(); g.translate(12, (y0 + y1) / 2); g.rotate(-Math.PI / 2);
      g.fillText('RMSE / p.u.', 0, 0); g.restore();
    }

    function fmt(v) { return v.toFixed(1); }

    function render() {
      var mech = state.mech, L = state.L, mi = state.mi;
      var r = getScan(mech);
      var sc = r.scan;
      var idx = 0, best = 1e9;
      sc.L.forEach(function (v, i) { if (Math.abs(v - L) < best) { best = Math.abs(v - L); idx = i; } });
      var Lc = sc.L[idx];

      var ref = r.ref, nb = r.nb;
      var n = Math.max(1, Math.round(Lc / DZ));
      var g0 = gapsFor(mech, L, ref)[0];
      var i0 = g0[0], i1 = g0[1];
      var gaps = [[i0, i1]];
      var res = fill(ref, gaps, nb, mi);
      var ev = evalGaps(ref, gaps, res);

      var m = mnar(mech, Lc);
      var q = ng(mech, Lc, mi);
      var dg = diag(mech, Lc, 'lin');
      var bestI = 0, bestV = 1e9;
      [sc.lin[idx], sc.nb[idx], sc.reg[idx], sc.auto[idx]].forEach(function (v, i) {
        if (v < bestV) { bestV = v; bestI = i; }
      });
      var BN = ['线性插值', '邻井借值', '多曲线回归', '按层界择一'];

      /* KPI */
      var rmseNow = mi === 'reg' ? sc.reg[idx] : mi === 'nb' ? sc.nb[idx] : mi === 'auto' ? sc.auto[idx] : sc.lin[idx];
      var covNow = mi === 'reg' ? sc.cr[idx] : mi === 'nb' ? sc.cn[idx] : mi === 'auto' ? sc.ca[idx] : sc.cl[idx];
      var k = [
        [MN[mi] + ' RMSE', fmt(rmseNow) + '<small>p.u.</small>'],
        ['区间覆盖率', Math.round(covNow * 100) + '<small>%（名义 90）</small>'],
        ['缺失点砂岩占比', Math.round(m.gapSand * 100) + '<small>% 全井 ' + Math.round(m.allSand * 100) + '%</small>'],
        ['丢弃缺失点 N/G', (q.drop.ng * 100).toFixed(1) + '<small>% 真值 ' + (q.full.ng * 100).toFixed(1) + '%</small>']
      ];
      k.forEach(function (t, i) {
        var box = root.querySelector('#w5k' + i);
        box.className = 'w5-k' + (i === 0 ? ' sel' : '');
        box.innerHTML = '<div class="l">' + t[0] + '</div><div class="v">' + t[1] + '</div>';
      });

      /* 表 */
      var rows = [
        ['线性插值', fmt(sc.lin[idx]), Math.round(sc.cl[idx] * 100) + '%'],
        ['邻井借值', fmt(sc.nb[idx]), Math.round(sc.cn[idx] * 100) + '%'],
        ['多曲线回归', fmt(sc.reg[idx]), Math.round(sc.cr[idx] * 100) + '%'],
        ['按层界择一', fmt(sc.auto[idx]), Math.round(sc.ca[idx] * 100) + '%']
      ];
      var tb = '<tr><th>方法</th><th>RMSE/p.u.</th><th>区间覆盖</th></tr>';
      rows.forEach(function (rw, i) {
        tb += '<tr' + (i === bestI ? ' style="background:#f2f7f5"' : '') + '><td>' + rw[0] +
          (i === bestI ? ' ★' : '') + '</td><td>' + rw[1] + '</td><td>' + rw[2] + '</td></tr>';
      });
      tb += '<tr><td>丢弃缺失点</td><td colspan="2">N/G ' + (q.drop.ng * 100).toFixed(1) +
        '% / 真值 ' + (q.full.ng * 100).toFixed(1) + '%</td></tr>';
      root.querySelector('#w5tb').innerHTML = tb;

      paintTrack(mech, Lc, mi);
      paintChart(mech, Lc, mi);

      var msg = '<b>' + Lc.toFixed(1) + ' m 缺口：线性 ' + fmt(sc.lin[idx]) + '、邻井 ' + fmt(sc.nb[idx]) +
        '、回归 ' + fmt(sc.reg[idx]) + '、自动 ' + fmt(sc.auto[idx]) + ' p.u.，当前最优是' + BN[bestI] + '。</b> ';
      msg += '只看线性插值：把缺口按"有没有跨层界"分组，<b>层内缺口误差 ' + fmt(dg.inRmse) + ' p.u.，跨层界缺口 ' +
        fmt(dg.crossRmse) + ' p.u.</b>（' + dg.total + ' 个缺口里 ' + dg.nCross + ' 个跨了层界）—— ' +
        '线性插值的软肋不是长度本身，而是缺口有没有横跨一个层界面：落在一层内部时，直线连过去几乎无误差；' +
        '一旦跨层，直线等于把两层的曲线抹成一个斜面。';
      if (sc.reg[idx] <= sc.nb[idx]) {
        msg += '回归在所有长度上都比借邻井稳，因为它读的是本井的 GR/AC/CNL —— 邻井借值依赖"两口井这条曲线长得一样"，' +
          '层位对比差 0.3 m 就会整段错位。';
      } else {
        msg += '这一段邻井借值反而最好（' + fmt(sc.nb[idx]) + ' p.u.）：缺口落在厚层砂岩里，同一套砂体横向稳定，搬邻井的曲线几乎无缝。' +
          '但把机制切到"随机"或"套管"，它会立刻涨到几 p.u. 以上 —— 邻井借值的成败取决于横向稳定性，而不是缺口长度。';
      }
      if (mech === 'washout') {
        msg += '<br><b>扩径相关缺失：</b>缺失点里砂岩占 ' + Math.round(m.gapSand * 100) +
          '%（全井只有 ' + Math.round(m.allSand * 100) + '%）。直接丢掉这些点算净毛比得到 ' +
          (q.drop.ng * 100).toFixed(1) + '%，真值 ' + (q.full.ng * 100).toFixed(1) + '% —— ' +
          '<b>偏低 ' + Math.abs(q.drop.ng - q.full.ng).toFixed(1) + ' 个百分点，而且丢得越多偏得越狠</b>，这是"少用几个点而已"补不回来的。';
      } else if (mech === 'casing') {
        msg += '<br><b>套管段：</b>位置固定、一整段连续缺失，是最难补的一种。邻井借值在这里最不可靠 —— ' +
          '深度对比误差会让整段曲线上下错位，误差随长度单调上升。';
      }
      note.className = 'w5-note' + (mech === 'washout' ? ' warn' : '');
      note.innerHTML = msg;
    }

    /* ---------- 交互 ---------- */
    var sL = root.querySelector('#w5sL');
    sL.addEventListener('input', function () {
      state.L = Number(sL.value) / 10;
      root.querySelector('#w5lL').textContent = state.L.toFixed(1) + ' m';
      render();
    });
    root.querySelector('#w5lL').textContent = state.L.toFixed(1) + ' m';

    Array.prototype.forEach.call(root.querySelectorAll('[data-m]'), function (b) {
      b.addEventListener('click', function () {
        state.mech = b.getAttribute('data-m');
        Array.prototype.forEach.call(root.querySelectorAll('[data-m]'), function (o) { o.classList.toggle('on', o === b); });
        render();
      });
    });
    /* 默认机制：扩径（这才是这条案例的主角） */
    state.mech = 'washout';
    Array.prototype.forEach.call(root.querySelectorAll('[data-m]'), function (o) {
      o.classList.toggle('on', o.getAttribute('data-m') === 'washout');
    });

    Array.prototype.forEach.call(root.querySelectorAll('[data-x]'), function (b) {
      b.addEventListener('click', function () {
        state.mi = b.getAttribute('data-x');
        Array.prototype.forEach.call(root.querySelectorAll('[data-x]'), function (o) { o.classList.toggle('on', o === b); });
        render();
      });
    });

    render();
  }

  if (typeof window !== 'undefined') {
    window.W5DEMO = mount;
    window.__CASE_MOUNT__ = mount;
  }
})();

/* Generated portable explanation; algorithm source above remains unchanged. */
(function(){var demo=(function install(win,name,info){
  var original=win[name];
  function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');}
  function mount(root,api){
    root.innerHTML='<style>.oil-demo-method{font:12px/1.8 system-ui,sans-serif;color:#34433a;border:1px solid #d3dfd5;background:#f6f9f4;border-radius:10px;padding:15px;margin:0 0 18px}.oil-demo-method *{box-sizing:border-box}.oil-demo-method h3{font-size:16px;line-height:1.6;margin:2px 0 10px;color:#235f51}.oil-demo-method small{font-size:10px;color:#537561}.oil-demo-chain{display:flex;align-items:center;gap:9px;padding:8px 11px;background:#e8f0e7;border-radius:5px;margin-bottom:11px}.oil-demo-chain span{min-width:0;flex:1}.oil-demo-chain b{color:#2f7d6b}.oil-demo-reasons{display:grid;grid-template-columns:1fr 1fr;gap:16px}.oil-demo-reasons h4{font-size:12px;margin:0 0 3px}.oil-demo-method p{font-size:12px!important;line-height:1.8!important;margin:0!important}.oil-demo-live{margin-top:11px;padding-top:8px;border-top:1px solid #d3dfd5}.oil-demo-live p{color:#235f51;font-size:11px!important;min-height:20px}@media(max-width:600px){.oil-demo-reasons{grid-template-columns:1fr;gap:9px}.oil-demo-chain{display:block}.oil-demo-chain b{display:block;text-align:center;line-height:1.1}.oil-demo-method{padding:12px}}</style>'+
      '<section class="oil-demo-method" aria-label="智能方法与运行证据"><small>本次演示用什么、为什么起作用</small><h3>'+esc(info.name)+'</h3><div class="oil-demo-chain"><span>'+esc(info.input)+'</span><b aria-hidden="true">→</b><span>'+esc(info.operation)+'</span></div><div class="oil-demo-reasons"><div><h4>为什么可能有效</h4><p>'+esc(info.why)+'</p></div><div><h4>在这里怎样验证</h4><p>'+esc(info.try)+'</p></div></div><div class="oil-demo-live"><small>当前运行证据 · 随下方操作更新</small><p data-method-live></p></div></section><div data-method-body></div>';
    var body=root.querySelector('[data-method-body]'),live=root.querySelector('[data-method-live]');
    var mounted=original(body,api);
    function refresh(){var metric=body.querySelector(info.selector);live.textContent=metric?(metric.innerText||metric.textContent).replace(/\s+/g,' ').trim().slice(0,380):'操作下方控件，对照模型、基线与测试结果。';}
    refresh();
    var observer=new MutationObserver(refresh);observer.observe(body,{childList:true,subtree:true,characterData:true});
    return {unmount:function(){observer.disconnect();if(mounted&&typeof mounted.unmount==='function')mounted.unmount();}};
  }
  win[name]=mount;win.__CASE_MOUNT__=mount;
  return {mount:mount};
})(window,"W5DEMO",{"name":"多元线性回归 · 缺失曲线重建","input":"当前井可见段的 GR、AC、CNL 与 DEN 配对样本","operation":"拟合 DEN 回归系数 → 用仍可观测曲线估计遮蔽段","why":"相关曲线仍携带岩性与孔隙信息，长缺失段可以借助这些信息重建，而线性插值只连接两端。关系变化时回归也会失配；补全值始终是估计。","try":"增加缺失长度，对照插值、邻井借值与多曲线回归的误差和区间覆盖，检查曲线平滑是否真代表准确。","selector":".w5-kpi"});if(typeof module!=="undefined")module.exports=demo;})();
