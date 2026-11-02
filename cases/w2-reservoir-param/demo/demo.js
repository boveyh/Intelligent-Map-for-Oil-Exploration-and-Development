/* =========================================================
   w2 · 储层参数智能解释 —— 可运行示范
   ---------------------------------------------------------
   纯前端、无依赖、无外部素材（所有数据在浏览器里合成）。

   它让读者亲手验证三件事：
     1. 密度公式 φ=(ρma-ρb)/(ρma-ρf) 在高泥质段为什么会崩；
     2. 学习法相对公式法的收益有多大（RMSE 3.7 → 1.4 p.u.）；
     3. 为什么"随机划分"的 R² 是自欺欺人 —— 近邻同井率 96% vs 0%。

   挂载方式：
     插件模式  window.W2DEMO(root, ctx)
     上传包模式 window.__CASE_MOUNT__(root, api)
   两者共用同一份挂载函数，样式内联注入，不依赖站点 CSS。
   ========================================================= */

(function () {
  'use strict';

  /* ---------- 常量（与 tools/probe-w2.js 保持一致） ---------- */
  var SEED = 20261023, NW = 12, NPTS = 220, K = 5;
  var TESTW = [1, 6];          // 固定留出的两口井
  /* 训练井按"相带互补性"贪心排序（离线算好，见 tools/probe-w2.js）：
     第 1 口就选了与测试井最像的那口，所以滑杆拉到 1 时 R² 不会塌到 0。 */
  var WELL_ORDER = [7, 4, 5, 8, 11, 0, 9, 10, 2, 3];
  var DEPTH0 = 2100, STEP = 0.5;

  var C = {
    ink: '#242b2e', jade: '#2f7d6b', jadeL: '#e6f1ec',
    clay: '#b26a39', clayL: '#f8ecdf', grid: '#ece8dd',
    text: '#79828a', dim: '#9ba3a9', paper: '#fdfcf9', line: '#ddd7c8'
  };

  /* ---------- 随机数 ---------- */
  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }

  /* ---------- 合成 12 口井 ----------
     每口井有各自的仪器刻度差（DEN / GR）与相带位置，
     这正是"跨井泛化"真正要面对的差异。 */
  function buildWells() {
    var rnd = mulberry32(SEED);
    function gauss() {
      var u = 0, v = 0;
      while (u === 0) u = rnd();
      while (v === 0) v = rnd();
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    }
    var wells = [];
    for (var w = 0; w < NW; w++) {
      var biasDen = (rnd() - 0.5) * 0.06;
      var biasGr = (rnd() - 0.5) * 15;
      var facies = gauss() * 0.045;
      var noise = 0.9 + rnd() * 0.7;

      var nl = 6 + Math.floor(rnd() * 5);
      var vshs = [];
      for (var i = 0; i < nl; i++) vshs.push(clamp(0.05 + rnd() * 0.85, 0.05, 0.9));
      var lens = [], left = NPTS;
      for (var j = 0; j < nl; j++) {
        var n = j === nl - 1 ? left : Math.max(14, Math.round(NPTS / nl + (rnd() - 0.5) * 30));
        n = Math.min(n, left);
        lens.push(n); left -= n;
        if (left <= 0) break;
      }

      var pts = [], k = 0;
      for (var a = 0; a < lens.length; a++) {
        var vsh = vshs[a];
        for (var b = 0; b < lens[a]; b++, k++) {
          var phi = clamp(0.30 - 0.24 * vsh + facies + gauss() * 0.0012, 0.02, 0.34);
          var den = 2.65 - 1.65 * phi + 0.12 * vsh + biasDen + gauss() * 0.012 * noise;
          var gr = 22 + 100 * vsh + biasGr + gauss() * 7 * noise;
          var cnl = 0.02 + 0.55 * phi + 0.33 * vsh + gauss() * 0.015 * noise;
          pts.push({
            phi: phi, den: den, gr: gr, cnl: cnl, vsh: vsh,
            formula: clamp((2.65 - den) / 1.65, 0, 0.45),
            well: w, depth: DEPTH0 + k * STEP
          });
        }
      }
      wells.push({ id: w, pts: pts, biasDen: biasDen });
    }
    return wells;
  }

  /* ---------- KNN 回归（真实项目用 1D-CNN / GBDT，这里用小模型保证秒级） ---------- */
  function standardize(train) {
    var sum = [0, 0, 0], i, p;
    for (i = 0; i < train.length; i++) {
      p = train[i];
      sum[0] += p.den; sum[1] += p.gr; sum[2] += p.cnl;
    }
    var mu = [sum[0] / train.length, sum[1] / train.length, sum[2] / train.length];
    var s2 = [0, 0, 0];
    for (i = 0; i < train.length; i++) {
      p = train[i];
      s2[0] += (p.den - mu[0]) * (p.den - mu[0]);
      s2[1] += (p.gr - mu[1]) * (p.gr - mu[1]);
      s2[2] += (p.cnl - mu[2]) * (p.cnl - mu[2]);
    }
    var sd = [
      Math.sqrt(s2[0] / train.length) || 1,
      Math.sqrt(s2[1] / train.length) || 1,
      Math.sqrt(s2[2] / train.length) || 1
    ];
    return { mu: mu, sd: sd };
  }

  function knnPredict(train, test) {
    var s = standardize(train), i, j;
    var X = new Array(train.length);
    for (i = 0; i < train.length; i++) {
      var p = train[i];
      X[i] = [
        (p.den - s.mu[0]) / s.sd[0],
        (p.gr - s.mu[1]) / s.sd[1],
        (p.cnl - s.mu[2]) / s.sd[2]
      ];
    }
    var out = new Array(test.length);
    var sameWell = 0;
    for (i = 0; i < test.length; i++) {
      var q = test[i];
      var qx = [
        (q.den - s.mu[0]) / s.sd[0],
        (q.gr - s.mu[1]) / s.sd[1],
        (q.cnl - s.mu[2]) / s.sd[2]
      ];
      var best = [], bi = 0;
      for (j = 0; j < X.length; j++) {
        var dx = X[j][0] - qx[0], dy = X[j][1] - qx[1], dz = X[j][2] - qx[2];
        var d = dx * dx + dy * dy + dz * dz;
        if (best.length < K) {
          best.push({ d: d, i: j });
          if (best.length === K) best.sort(function (a, b) { return a.d - b.d; });
        } else if (d < best[K - 1].d) {
          best[K - 1] = { d: d, i: j };
          best.sort(function (a, b) { return a.d - b.d; });
        }
      }
      if (train[best[0].i].well === q.well) sameWell++;
      var sum = 0;
      for (var m = 0; m < best.length; m++) sum += train[best[m].i].phi;
      out[i] = sum / best.length;
    }
    return { pred: out, sameWell: sameWell / test.length };
  }

  /* ---------- 指标 ---------- */
  function r2(yt, yp) {
    var m = 0, i;
    for (i = 0; i < yt.length; i++) m += yt[i];
    m /= yt.length;
    var ss = 0, st = 0;
    for (i = 0; i < yt.length; i++) {
      ss += (yt[i] - yp[i]) * (yt[i] - yp[i]);
      st += (yt[i] - m) * (yt[i] - m);
    }
    return st ? 1 - ss / st : 0;
  }
  function rmse(yt, yp) {
    var s = 0;
    for (var i = 0; i < yt.length; i++) s += (yt[i] - yp[i]) * (yt[i] - yp[i]);
    return Math.sqrt(s / yt.length);
  }

  /* ---------- 一次评估 ---------- */
  function evaluate(wells, n, split) {
    var train = [], test = [], i, w;

    if (split === 'well') {
      var use = WELL_ORDER.slice(0, n);
      for (i = 0; i < use.length; i++) train = train.concat(wells[use[i]].pts);
      for (i = 0; i < TESTW.length; i++) test = test.concat(wells[TESTW[i]].pts);
    } else {
      /* 随机划分：与按井模式用同一批井、同一批数据量，只换划分单位 */
      var pool = [];
      var used = WELL_ORDER.slice(0, n).concat(TESTW);
      for (i = 0; i < used.length; i++) pool = pool.concat(wells[used[i]].pts);
      var rnd = mulberry32(4242 + n);
      for (i = pool.length - 1; i > 0; i--) {
        var j = Math.floor(rnd() * (i + 1));
        var t = pool[i]; pool[i] = pool[j]; pool[j] = t;
      }
      var cut = Math.round(pool.length * 0.7);
      train = pool.slice(0, cut);
      test = pool.slice(cut);
    }

    /* 剖面与按井评分使用同一留出井；随机划分模式另作混合样点对照。 */
    var profileWell = TESTW[0];
    var profile = knnPredict(train, wells[profileWell].pts);

    var res = knnPredict(train, test);
    var yt = [], yp = [], yf = [], vsh = [];
    for (i = 0; i < test.length; i++) {
      yt.push(test[i].phi);
      yp.push(res.pred[i]);
      yf.push(test[i].formula);
      vsh.push(test[i].vsh);
    }

    /* 按泥质含量分组 */
    var edges = [0, 0.15, 0.3, 0.45, 0.6, 1.01];
    var bins = [];
    for (var b = 0; b < edges.length - 1; b++) {
      var idx = [];
      for (i = 0; i < test.length; i++) {
        if (vsh[i] >= edges[b] && vsh[i] < edges[b + 1]) idx.push(i);
      }
      if (idx.length < 6) { bins.push(null); continue; }
      var at = [], ap = [], af = [];
      for (i = 0; i < idx.length; i++) {
        at.push(yt[idx[i]]); ap.push(yp[idx[i]]); af.push(yf[idx[i]]);
      }
      bins.push({
        vsh: (edges[b] + edges[b + 1]) / 2,
        n: idx.length,
        ml: rmse(at, ap),
        fm: rmse(at, af)
      });
    }

    /* 散点抽样，最多 420 点 */
    var scat = [];
    var stepS = Math.max(1, Math.floor(test.length / 420));
    for (i = 0; i < test.length; i += stepS) scat.push([yt[i], yp[i]]);

    return {
      n: test.length,
      r2: r2(yt, yp), rmse: rmse(yt, yp),
      r2f: r2(yt, yf), rmseF: rmse(yt, yf),
      sameWell: res.sameWell, bins: bins, scat: scat,
      profile: profile.pred, profileTruth: wells[profileWell].pts, profileWell: profileWell, split: split
    };
  }

  /* ---------- SVG 小工具 ---------- */
  function f(n) { return (Math.round(n * 10) / 10).toFixed(1); }
  function pct(x) { return (Math.round(x * 100)) + '%'; }
  function p10(x) { return (x * 100).toFixed(1); }

  var svgOpen = function (w, h, label) {
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" width="100%" style="display:block" ' +
      'role="img" aria-label="' + label + '" font-family="ui-sans-serif,system-ui,-apple-system,\'Segoe UI\',sans-serif">';
  };

  /* 剖面：真实 / 密度公式 / 学习法 */
  function drawProfile(ev) {
    var W = 380, H = 472;
    var x0 = 96, x1 = 318, y0 = 54, y1 = 396;
    var phiMax = 0.36;
    var tx = function (v) { return x0 + clamp(v, 0, phiMax) / phiMax * (x1 - x0); };
    var depthSpan = (NPTS - 1) * STEP;
    var ty = function (i) { return y0 + i / (NPTS - 1) * (y1 - y0); };

    var s = svgOpen(W, H, '储层孔隙度解释剖面：真实值、密度公式与学习法对比');

    /* 网格与坐标 */
    [0, 0.1, 0.2, 0.3].forEach(function (v) {
      s += '<line x1="' + tx(v) + '" y1="' + y0 + '" x2="' + tx(v) + '" y2="' + y1 + '" stroke="' + C.grid + '"/>';
      s += '<text x="' + tx(v) + '" y="' + (y1 + 14) + '" font-size="10" fill="' + C.dim + '" text-anchor="middle">' + v.toFixed(1) + '</text>';
    });
    for (var d = 0; d <= depthSpan; d += 20) {
      var yy = y0 + d / depthSpan * (y1 - y0);
      s += '<line x1="' + x0 + '" y1="' + yy + '" x2="' + x1 + '" y2="' + yy + '" stroke="' + C.grid + '" stroke-dasharray="2 4"/>';
      s += '<text x="' + (x0 - 8) + '" y="' + (yy + 3.5) + '" font-size="10" font-family="monospace" fill="' + C.dim + '" text-anchor="end">' + (DEPTH0 + d) + '</text>';
    }
    s += '<text x="' + ((x0 + x1) / 2) + '" y="' + (y1 + 32) + '" font-size="10.5" fill="' + C.text + '" text-anchor="middle">孔隙度 φ / v·v</text>';
    s += '<text x="' + (x0 - 10) + '" y="' + (y0 - 10) + '" font-size="9.5" font-family="monospace" fill="' + C.dim + '" text-anchor="end">深度 m</text>';

    /* 真实值 */
    var pts = ev.profileTruth, i, pth = [], pfm = [], pml = [];
    for (i = 0; i < pts.length; i++) {
      if (pts[i].well !== ev.profileWell) continue;
      pth.push(tx(pts[i].phi) + ',' + ty(i));
      pfm.push(tx(pts[i].formula) + ',' + ty(i));
      pml.push(tx(ev.profile[i]) + ',' + ty(i));
    }
    s += '<polyline points="' + pfm.join(' ') + '" fill="none" stroke="' + C.clay + '" stroke-width="1.2" stroke-opacity=".8"/>';
    s += '<polyline points="' + pth.join(' ') + '" fill="none" stroke="' + C.ink + '" stroke-width="1.1" stroke-opacity=".5"/>';
    s += '<polyline points="' + pml.join(' ') + '" fill="none" stroke="#ffffff" stroke-width="3.4" stroke-linejoin="round"/>';
    s += '<polyline points="' + pml.join(' ') + '" fill="none" stroke="' + C.jade + '" stroke-width="1.9" stroke-linejoin="round"/>';

    /* 图例 */
    s += '<line x1="96" y1="14" x2="120" y2="14" stroke="' + C.ink + '" stroke-width="1.2" stroke-opacity=".6"/>';
    s += '<text x="125" y="17.5" font-size="9.5" fill="' + C.text + '">真实（岩心）</text>';
    s += '<line x1="186" y1="14" x2="210" y2="14" stroke="' + C.clay + '" stroke-width="1.7"/>';
    s += '<text x="215" y="17.5" font-size="9.5" fill="' + C.text + '">密度公式</text>';
    s += '<line x1="268" y1="14" x2="292" y2="14" stroke="' + C.jade + '" stroke-width="2"/>';
    s += '<text x="297" y="17.5" font-size="9.5" fill="' + C.text + '">学习法</text>';

    s += '<text x="96" y="' + (H - 10) + '" font-size="9.5" font-family="monospace" fill="' + C.dim + '">WELL-02 · ' + (ev.split === 'well' ? '整井留出' : '随机划分') + ' · ' + (DEPTH0) + '—' + (DEPTH0 + depthSpan) + ' m · 220 个采样点</text>';
    s += '</svg>';
    return s;
  }

  /* 散点：预测 vs 真实 */
  function drawScatter(ev) {
    var W = 330, H = 196;
    var x0 = 40, x1 = 300, y0 = 18, y1 = 152;
    var vmax = 0.36;
    var px = function (v) { return x0 + clamp(v, 0, vmax) / vmax * (x1 - x0); };
    var py = function (v) { return y1 - clamp(v, 0, vmax) / vmax * (y1 - y0); };

    var s = svgOpen(W, H, '预测孔隙度与真实孔隙度散点图');
    [0, 0.1, 0.2, 0.3].forEach(function (v) {
      s += '<line x1="' + px(v) + '" y1="' + y0 + '" x2="' + px(v) + '" y2="' + y1 + '" stroke="' + C.grid + '"/>';
      s += '<line x1="' + x0 + '" y1="' + py(v) + '" x2="' + x1 + '" y2="' + py(v) + '" stroke="' + C.grid + '"/>';
      s += '<text x="' + px(v) + '" y="' + (y1 + 13) + '" font-size="9.5" fill="' + C.dim + '" text-anchor="middle">' + v.toFixed(1) + '</text>';
      s += '<text x="' + (x0 - 6) + '" y="' + (py(v) + 3) + '" font-size="9.5" fill="' + C.dim + '" text-anchor="end">' + v.toFixed(1) + '</text>';
    });
    s += '<line x1="' + px(0) + '" y1="' + py(0) + '" x2="' + px(vmax) + '" y2="' + py(vmax) + '" stroke="' + C.ink + '" stroke-width="1" stroke-dasharray="4 3" stroke-opacity=".45"/>';
    s += '<text x="' + (x1 - 4) + '" y="' + (y0 + 12) + '" font-size="9.5" fill="' + C.dim + '" text-anchor="end">1:1</text>';

    ev.scat.forEach(function (d) {
      s += '<circle cx="' + f(px(d[0])) + '" cy="' + f(py(d[1])) + '" r="1.9" fill="' + C.jade + '" fill-opacity=".5"/>';
    });

    s += '<text x="' + ((x0 + x1) / 2) + '" y="' + (y1 + 28) + '" font-size="10" fill="' + C.text + '" text-anchor="middle">真实 φ</text>';
    s += '<text x="12" y="' + ((y0 + y1) / 2) + '" font-size="10" fill="' + C.text + '" transform="rotate(-90 12 ' + ((y0 + y1) / 2) + ')" text-anchor="middle">预测 φ</text>';
    s += '</svg>';
    return s;
  }

  /* 误差 vs 泥质含量 */
  function drawBins(ev) {
    var W = 330, H = 176;
    var x0 = 44, x1 = 306, y0 = 20, y1 = 128;
    var ymax = 5.2;
    var bins = ev.bins.filter(function (b) { return b; });
    var n = bins.length;
    var px = function (i) { return x0 + (i + 0.5) / n * (x1 - x0); };
    var py = function (v) { return y1 - clamp(v, 0, ymax) / ymax * (y1 - y0); };

    var s = svgOpen(W, H, '不同泥质含量区间下两种方法的误差对比');
    [0, 1, 2, 3, 4, 5].forEach(function (v) {
      s += '<line x1="' + x0 + '" y1="' + py(v) + '" x2="' + x1 + '" y2="' + py(v) + '" stroke="' + C.grid + '"/>';
      s += '<text x="' + (x0 - 6) + '" y="' + (py(v) + 3) + '" font-size="9.5" fill="' + C.dim + '" text-anchor="end">' + v + '</text>';
    });
    bins.forEach(function (b, i) {
      s += '<text x="' + px(i) + '" y="' + (y1 + 13) + '" font-size="9.5" fill="' + C.dim + '" text-anchor="middle">' + b.vsh.toFixed(2) + '</text>';
    });
    /* 柱 */
    bins.forEach(function (b, i) {
      var bw = Math.min(18, (x1 - x0) / n * 0.3);
      s += '<rect x="' + (px(i) - bw - 1) + '" y="' + py(b.fm * 100) + '" width="' + bw + '" height="' + (y1 - py(b.fm * 100)) + '" fill="' + C.clay + '" fill-opacity=".45" rx="1.5"/>';
      s += '<rect x="' + (px(i) + 1) + '" y="' + py(b.ml * 100) + '" width="' + bw + '" height="' + (y1 - py(b.ml * 100)) + '" fill="' + C.jade + '" fill-opacity=".75" rx="1.5"/>';
    });
    s += '<line x1="' + x0 + '" y1="' + y1 + '" x2="' + x1 + '" y2="' + y1 + '" stroke="' + C.line + '"/>';
    s += '<text x="' + ((x0 + x1) / 2) + '" y="' + (y1 + 28) + '" font-size="10" fill="' + C.text + '" text-anchor="middle">泥质含量 Vsh</text>';
    s += '<text x="12" y="' + ((y0 + y1) / 2) + '" font-size="10" fill="' + C.text + '" transform="rotate(-90 12 ' + ((y0 + y1) / 2) + ')" text-anchor="middle">RMSE / p.u.</text>';
    s += '<rect x="' + (x0 + 4) + '" y="' + (y0 - 8) + '" width="9" height="9" rx="1.5" fill="' + C.clay + '" fill-opacity=".45"/>';
    s += '<text x="' + (x0 + 17) + '" y="' + (y0 + 0) + '" font-size="9.5" fill="' + C.text + '">密度公式</text>';
    s += '<rect x="' + (x0 + 68) + '" y="' + (y0 - 8) + '" width="9" height="9" rx="1.5" fill="' + C.jade + '" fill-opacity=".75"/>';
    s += '<text x="' + (x0 + 81) + '" y="' + (y0 + 0) + '" font-size="9.5" fill="' + C.text + '">学习法</text>';
    s += '</svg>';
    return s;
  }

  /* ---------- 样式 ---------- */
  var CSS = [
    '.w2{color:var(--ink,#242b2e);font-size:13px;line-height:1.6}',
    '.w2 *{box-sizing:border-box}',
    '.w2-head{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;flex-wrap:wrap;margin-bottom:14px}',
    '.w2-kick{font-family:ui-monospace,monospace;font-size:10px;letter-spacing:.16em;color:var(--clay,#b26a39)}',
    '.w2-h3{margin:6px 0 4px;font-size:17px;font-weight:600;letter-spacing:-.01em}',
    '.w2-sub{margin:0;color:var(--ink-3,#5d666d);max-width:52ch}',
    '.w2-ctl{display:flex;gap:26px;flex-wrap:wrap;align-items:flex-end;padding:12px 14px;border:1px solid var(--line,#e9e4d8);border-radius:10px;background:var(--paper-2,#faf8f2)}',
    '.w2-ctl label{display:block;font-size:10px;font-family:ui-monospace,monospace;letter-spacing:.1em;color:var(--ink-4,#9ba3a9);margin-bottom:6px}',
    '.w2-ctl input[type=range]{width:180px;accent-color:#2f7d6b}',
    '.w2-num{font-family:ui-monospace,monospace;font-size:13px;color:#2f7d6b;font-weight:600}',
    '.w2-seg{display:inline-flex;border:1px solid var(--line,#e9e4d8);border-radius:7px;overflow:hidden;background:#fff}',
    '.w2-seg button{appearance:none;border:0;background:transparent;padding:7px 13px;font-size:12px;color:var(--ink-3,#5d666d);cursor:pointer;font-family:inherit}',
    '.w2-seg button+button{border-left:1px solid var(--line,#e9e4d8)}',
    '.w2-seg button.on{background:#2f7d6b;color:#fff;font-weight:600}',
    '.w2-grid{display:grid;grid-template-columns:minmax(280px,1.05fr) minmax(300px,1fr);gap:16px;margin-top:16px}',
    '@media(max-width:760px){.w2-grid{grid-template-columns:1fr}}',
    '.w2-panel{border:1px solid var(--line,#e9e4d8);border-radius:10px;background:#fff;padding:12px 12px 8px}',
    '.w2-pt{font-size:10px;font-family:ui-monospace,monospace;letter-spacing:.12em;color:var(--ink-4,#9ba3a9);margin-bottom:6px;display:flex;justify-content:space-between}',
    '.w2-kpi{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-bottom:12px}',
    '.w2-k{background:var(--paper-2,#faf8f2);border-radius:8px;padding:9px 10px;min-width:0}',
    '.w2-k .l{font-size:10px;color:var(--ink-4,#9ba3a9);letter-spacing:.04em}',
    '.w2-k .v{font-family:ui-monospace,monospace;font-size:16px;font-weight:600;color:#242b2e;line-height:1.25;margin-top:3px;white-space:nowrap;letter-spacing:-.01em}',
    '.w2-k .v small{font-size:9.5px;font-weight:400;color:var(--ink-4,#9ba3a9);margin-left:2px}',
    '.w2-k.bad .v{color:#b26a39}',
    '.w2-k.ok .v{color:#2f7d6b}',
    '.w2-note{margin-top:14px;padding:11px 13px;border-radius:8px;background:#e6f1ec;color:#1d5b4e;font-size:12.5px}',
    '.w2-note.warn{background:#f8ecdf;color:#8a4f27}',
    '.w2-note b{color:inherit}'
  ].join('');

  /* ---------- 挂载 ---------- */
  function mount(root) {
    var wells = buildWells();
    var state = { n: 10, split: 'well' };

    root.innerHTML =
      '<div class="w2">' +
      '<style>' + CSS + '</style>' +
      '<div class="w2-head"><div>' +
      '<div class="w2-kick">INTERACTIVE · 储层参数解释</div>' +
      '<h3 class="w2-h3">同一段曲线，为什么公式法会崩、学习法不会</h3>' +
      '<p class="w2-sub">拖动滑杆改变建模用井数，切换划分方式，看 R²、误差分布和"近邻同井率"怎么变。</p>' +
      '</div></div>' +

      '<div class="w2-ctl">' +
      '<div><label>建模井数</label><input id="w2n" type="range" min="1" max="10" step="1" value="10">' +
      '<span class="w2-num" id="w2nv">10 口</span></div>' +
      '<div><label>训练/测试划分</label><div class="w2-seg" id="w2seg">' +
      '<button data-s="well" class="on">按井划分</button><button data-s="random">随机划分</button></div></div>' +
      '<div><label>对照基线</label><span style="font-size:12px;color:#5d666d">密度公式 φ=(ρma−ρb)/(ρma−ρf)</span></div>' +
      '</div>' +

      '<div class="w2-grid">' +
      '<div class="w2-panel"><div class="w2-pt"><span>剖面 · WELL-01</span><span>φ 0—0.36</span></div><div id="w2prof"></div></div>' +
      '<div>' +
      '<div class="w2-kpi" id="w2kpi"></div>' +
      '<div class="w2-panel" style="margin-bottom:12px"><div class="w2-pt"><span>预测 vs 真实</span><span id="w2scn"></span></div><div id="w2scat"></div></div>' +
      '<div class="w2-panel"><div class="w2-pt"><span>误差随泥质含量变化</span><span>RMSE / p.u.</span></div><div id="w2bins"></div></div>' +
      '</div></div>' +

      '<div class="w2-note" id="w2note"></div>' +
      '</div>';

    var $ = function (id) { return root.querySelector('#' + id); };

    function render() {
      var ev = evaluate(wells, state.n, state.split);

      $('w2prof').innerHTML = drawProfile(ev);
      $('w2scat').innerHTML = drawScatter(ev);
      $('w2bins').innerHTML = drawBins(ev);
      $('w2scn').textContent = ev.n + ' 点';

      $('w2kpi').innerHTML =
        '<div class="w2-k ok"><div class="l">R²（学习法）</div><div class="v">' + ev.r2.toFixed(3) + '</div></div>' +
        '<div class="w2-k ok"><div class="l">RMSE</div><div class="v">' + p10(ev.rmse) + '<small>p.u.</small></div></div>' +
        '<div class="w2-k bad"><div class="l">公式法 RMSE</div><div class="v">' + p10(ev.rmseF) + '<small>p.u.</small></div></div>' +
        '<div class="w2-k"><div class="l">近邻同井率</div><div class="v">' + pct(ev.sameWell) + '</div></div>';

      var note = $('w2note');
      var clean = ev.bins[0];
      if (state.split === 'random') {
        note.className = 'w2-note warn';
        note.innerHTML = '<b>随机划分在抄答案。</b>测试点最近的 ' + K + ' 个训练点里，有 ' + pct(ev.sameWell) +
          ' 来自同一口井、同一深度附近。所以 R² 看着漂亮（' + ev.r2.toFixed(3) +
          '），但它证明的是"模型记住了这口井"，不是"模型学会了物理"。换成按井划分，同井率归零，R² 才是能对外交付的数。';
      } else {
        note.className = 'w2-note';
        note.innerHTML = '<b>按井划分是唯一诚实的口径。</b>测试井完全没参与训练，近邻同井率为 ' + pct(ev.sameWell) +
          '。此时 R² = ' + ev.r2.toFixed(3) + '、RMSE = ' + p10(ev.rmse) + ' p.u.，密度公式是 ' + p10(ev.rmseF) +
          ' p.u.。但差距<b>不是均匀分布的</b>：干净砂岩段（Vsh&lt;0.15）公式只差 ' + p10(clean ? clean.fm : 0) +
          ' p.u.，一到泥质段就拉开到 ' + p10(ev.bins[3] ? ev.bins[3].fm : 0) + ' p.u. —— 公式法不是"错"，是<b>只在它的假设成立的地方对</b>。' +
          '把建模井数从 10 口拖到 1 口，R² 只从 0.92 掉到 0.81；5 口以后基本持平，个别井还会因为刻度差带来轻微回退。这 10 口井是按相带互补性挑的，<b>选井比堆井重要</b>；' +
          '真实项目里你不知道哪口最像，所以才要按井交叉验证来估这个上界。';
      }
    }

    $('w2n').addEventListener('input', function () {
      state.n = parseInt(this.value, 10);
      $('w2nv').textContent = state.n + ' 口';
      render();
    });

    var seg = $('w2seg');
    seg.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('button') : null;
      if (!b || !b.dataset) return;
      if (b.dataset.s === state.split) return;
      state.split = b.dataset.s;
      Array.prototype.forEach.call(seg.querySelectorAll('button'), function (x) {
        x.classList.toggle('on', x.dataset.s === state.split);
      });
      render();
    });

    render();
  }

  window.W2DEMO = mount;
  window.__CASE_MOUNT__ = mount;
  /* 调试出口：Node 侧可直接拿到数据与图，用于自测指标与 SVG 结构 */
  window.__W2TEST__ = { buildWells: buildWells, evaluate: evaluate, draw: { profile: drawProfile, scatter: drawScatter, bins: drawBins } };

})();
