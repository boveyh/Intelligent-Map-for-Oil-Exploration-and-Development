/* =========================================================
   w5 · 多井曲线标准化 —— 可运行示范（自包含，无外部依赖）
   ---------------------------------------------------------
   演示三件事：
     ① 同一套地层，不同井的 GR 刻度整体错位，直方图对不上；
     ② 用标志层把直方图拉齐，净毛比才可比；
     ③ 标志层只能定住一个点，泥浆带来的"随岩性变化"的偏移修不掉。
   纯函数导出到 window.W5NCORE，供 tools/test-w5n.js 在 Node 里复算。
   ========================================================= */
(function () {
  'use strict';

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

  var DZ = 0.25;
  var BOT = 96;
  var NS = Math.round(BOT / DZ) + 1;

  /* 砂岩 / 泥质砂岩 / 泥岩 / 灰岩（标志层） */
  var LITH = [
    { n: '砂岩', c: '#d9b45c', gr: 42, grs: 10 },
    { n: '泥质砂岩', c: '#9aa95e', gr: 70, grs: 12 },
    { n: '泥岩', c: '#8b8878', gr: 104, grs: 13 },
    { n: '灰岩', c: '#7d9cbd', gr: 24, grs: 6 }
  ];
  var MK = 40;   /* 标志层顶深，m */
  var MKT = 6.0; /* 标志层厚度：6 m 灰岩，约 24 个采样点 */

  /* 全区共用一套地层；40 m 处放一层 1.8 m 的灰岩当标志层 */
  var BEDS = (function () {
    var rnd = mulberry32(4471);
    var CYC = [0, 2, 1, 2, 0, 3, 2, 1, 0, 2, 1, 3, 2, 0, 1, 2];
    var out = [], z = 0, ci = 0;
    while (z < BOT) {
      var l = CYC[ci % CYC.length];
      var th = 1.4 + rnd() * 3.6;
      out.push({ lent: l, th: th });
      z += th; ci++;
    }
    /* 把覆盖 40 m 的那一层换成标志层灰岩 */
    var acc = 0;
    for (var i = 0; i < out.length; i++) {
      if (acc + out[i].th > MK && acc <= MK) {
        out[i].lent = 3;
        out[i].th = MKT;
        break;
      }
      acc += out[i].th;
    }
    return out;
  })();

  var TOPS = (function () {
    var t = [], c = 0;
    BEDS.forEach(function (b) { t.push(c); c += b.th; });
    return { tops: t, tot: c };
  })();

  function bedAt(z) {
    var zz = z / BOT * TOPS.tot;
    var lo = 0, hi = TOPS.tops.length - 1;
    while (lo < hi) {
      var mid = (lo + hi + 1) >> 1;
      if (TOPS.tops[mid] <= zz) lo = mid; else hi = mid - 1;
    }
    return lo;
  }

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

  /* ---------------- 造井 ----------------
     drift：仪器刻度漂移强度（0—1）
     mud  ：KCl 泥浆影响强度（0—1），只抬升砂质段 —— 这正是线性校正修不掉的部分 */
  function buildWell(idx, drift, mud) {
    var rnd = mulberry32(9001 + idx * 37);
    var a = 1 + (rnd() - 0.5) * 0.12 * drift;      /* 增益（刻度） */
    var b = (rnd() - 0.5) * 34 * drift;            /* 零点 */
    var isKCl = rnd() < 0.5;
    /* 0 号井是全区基准井：刻度可信，它就是"标准"，不带任何漂移 */
    if (idx === 0) { a = 1; b = 0; isKCl = false; }
    var kAmt = isKCl ? mud * 11 : 0;

    var grT = [], grM = [], lent = [], z = [];
    for (var i = 0; i < NS; i++) {
      var d = i * DZ;
      z.push(d);
      var bi = bedAt(d), L = LITH[BEDS[bi].lent];
      var g = L.gr + gauss(rnd) * L.grs;
      grT.push(g);
      lent.push(BEDS[bi].lent);
      var mudShift = BEDS[bi].lent === 0 ? 1 : BEDS[bi].lent === 1 ? 0.8 : BEDS[bi].lent === 2 ? 0.35 : -0.1;
      grM.push(a * (g + b) + kAmt * mudShift + gauss(rnd) * 2.5);
    }
    return { idx: idx, z: z, lent: lent, grTrue: smooth(grT), gr: smooth(grM), a: a, b: b, kcl: isKCl };
  }

  /* ---------------- 标志层统计 ---------------- */
  /* 统计段：从标志层顶开始向下取 len 米。len = MKT 时只有标志层本身；
     拉长会把上下相邻的泥岩/砂岩一起算进去 —— 样本多了，均值和标准差的估计才稳。 */
  function markerMask(well, len) {
    var m = new Array(NS).fill(false);
    var L = len == null ? MKT : len;
    for (var i = 0; i < NS; i++) if (well.z[i] >= MK && well.z[i] < MK + L) m[i] = true;
    return m;
  }

  function qOf(arr, p) {
    var s = arr.slice().sort(function (x, y) { return x - y; });
    var k = (s.length - 1) * p;
    var lo = Math.floor(k), hi = Math.min(s.length - 1, lo + 1);
    return s[lo] + (s[hi] - s[lo]) * (k - lo);
  }

  var QP = [0.02, 0.1, 0.25, 0.5, 0.75, 0.9, 0.98];

  function markerStats(well, len) {
    var m = markerMask(well, len), arr = [];
    for (var i = 0; i < NS; i++) if (m[i]) arr.push(well.gr[i]);
    var mean = arr.reduce(function (s, v) { return s + v; }, 0) / arr.length;
    var sd = Math.sqrt(arr.reduce(function (s, v) { return s + (v - mean) * (v - mean); }, 0) / arr.length);
    return { mean: mean, sd: sd || 1, q: QP.map(function (p) { return qOf(arr, p); }), n: arr.length };
  }

  /* ---------------- 两种标准化 ---------------- */
  /* ① 只平移：标志层均值对齐，不动刻度。样本少时最稳 */
  function normShift(well, st, stRef) {
    var d = stRef.mean - st.mean;
    return well.gr.map(function (g) { return g + d; });
  }

  /* ② 均值-方差：把标志层的均值和标准差一起搬到参考井 */
  function normMV(well, st, stRef) {
    var k = stRef.sd / st.sd;
    return well.gr.map(function (g) { return (g - st.mean) * k + stRef.mean; });
  }

  /* ② 分位数映射：标志层的 7 个分位点两两对齐，中间线性插值 */
  function normQT(well, st, stRef) {
    var xs = st.q, ys = stRef.q;
    return well.gr.map(function (g) {
      if (g <= xs[0]) return ys[0] + (g - xs[0]) * (ys[1] - ys[0]) / (xs[1] - xs[0]);
      if (g >= xs[xs.length - 1]) {
        var n = xs.length - 1;
        return ys[n] + (g - xs[n]) * (ys[n] - ys[n - 1]) / (xs[n] - xs[n - 1]);
      }
      for (var i = 1; i < xs.length; i++) {
        if (g <= xs[i]) {
          return ys[i - 1] + (g - xs[i - 1]) * (ys[i] - ys[i - 1]) / (xs[i] - xs[i - 1] || 1e-6);
        }
      }
      return g;
    });
  }

  /* ---------------- 指标 ---------------- */
  var BINS = 60, GMAX = 150;
  function hist(arr) {
    var h = new Array(BINS).fill(0);
    arr.forEach(function (v) {
      var k = Math.floor(v / GMAX * BINS);
      if (k < 0) k = 0; if (k >= BINS) k = BINS - 1;
      h[k]++;
    });
    var n = arr.length || 1;
    return h.map(function (v) { return v / n; });
  }
  /* 重合度：两个归一化直方图逐格取小后求和（完全重合 = 1） */
  function overlap(h1, h2) {
    var s = 0;
    for (var i = 0; i < BINS; i++) s += Math.min(h1[i], h2[i]);
    return s;
  }

  var CUT = 60;
  function ng(arr) {
    var n = 0;
    for (var i = 0; i < arr.length; i++) if (arr[i] < CUT) n++;
    return n / arr.length;
  }

  /* 一次完整评估：全部井在三种处理下的重合度与净毛比 */
  function run(opt) {
    var o = opt || {};
    var drift = o.drift == null ? 0.8 : o.drift;
    var mud = o.mud == null ? 0.6 : o.mud;
    var lm = o.lmark == null ? MKT : o.lmark;
    var NW = o.nWells || 10;
    var wells = [];
    for (var i = 0; i < NW; i++) wells.push(buildWell(i, drift, mud));

    var ref = wells[0];
    var stRef = markerStats(ref, lm);
    var hRef = hist(ref.grTrue);      /* 参考井的"真值"直方图当基准 */

    var out = [];
    wells.forEach(function (w) {
      if (w.idx === 0) return;
      var st = markerStats(w, lm);
      var sh = normShift(w, st, stRef), mv = normMV(w, st, stRef), qt = normQT(w, st, stRef);
      out.push({
        idx: w.idx, kcl: w.kcl, a: w.a, b: w.b,
        ov: [overlap(hRef, hist(w.gr)), overlap(hRef, hist(sh)),
          overlap(hRef, hist(mv)), overlap(hRef, hist(qt))],
        ng: [ng(w.gr), ng(sh), ng(mv), ng(qt)],
        ngT: ng(w.grTrue),
        h: [hist(w.gr), hist(sh), hist(mv), hist(qt)]
      });
    });

    var meanAt = function (k, j) {
      return out.reduce(function (s, r) { return s + r[k][j]; }, 0) / out.length;
    };
    var errNG = function (j) {
      return out.reduce(function (s, r) { return s + Math.abs(r.ng[j] - r.ngT); }, 0) / out.length;
    };
    var flips = function (j) {
      return out.filter(function (r) { return Math.abs(r.ng[j] - r.ngT) > 0.04; }).length;
    };
    return {
      wells: out, ref: ref, stRef: stRef, hRef: hRef, lmark: lm, nMark: stRef.n,
      ov: [0, 1, 2, 3].map(function (j) { return meanAt('ov', j); }),
      ngErr: [0, 1, 2, 3].map(function (j) { return errNG(j); }),
      flip: [0, 1, 2, 3].map(function (j) { return flips(j); }),
      n: out.length
    };
  }

  var API = {
    LITH: LITH, BEDS: BEDS, NS: NS, DZ: DZ, BOT: BOT, MK: MK, MKT: MKT, CUT: CUT,
    buildWell: buildWell, markerStats: markerStats, markerMask: markerMask,
    normMV: normMV, normQT: normQT, normShift: normShift,
    hist: hist, overlap: overlap, ng: ng, run: run, QP: QP
  };
  if (typeof window !== 'undefined') { window.W5NCORE = API; }

  /* =========================================================
     渲染
     ========================================================= */
  var CSS = [
    '.n5{font-size:13px;color:#242b2e;line-height:1.6}',
    '.n5 *{box-sizing:border-box}',
    '.n5-kpi{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-bottom:12px}',
    '.n5-k{background:#faf8f2;border-radius:8px;padding:9px 10px;min-width:0;border:1px solid transparent}',
    '.n5-k .l{font-size:10px;color:#79828a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.n5-k .v{font-family:ui-monospace,monospace;font-size:15px;font-weight:600;margin-top:3px;white-space:nowrap}',
    '.n5-k .v small{font-size:10px;font-weight:400;color:#79828a;margin-left:3px}',
    '.n5-k.sel{border-color:#2f7d6b;background:#f2f7f5}',
    '.n5-k.sel .l{color:#2f7d6b;font-weight:600}',
    '.n5-main{display:flex;gap:16px;align-items:flex-start}',
    '.n5-cv{flex:0 0 396px;width:396px;border:1px solid #e9e4d8;border-radius:8px;overflow:hidden;background:#fff}',
    '.n5-cv canvas{display:block;width:100%;height:auto}',
    '.n5-side{flex:1;min-width:0}',
    '.n5-side .cap{font-size:10.5px;color:#79828a;margin-bottom:3px}',
    '.n5-ctl{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px 16px;margin-top:14px;padding-top:12px;border-top:1px solid #eeeae0}',
    '.n5-c{min-width:0}',
    '.n5-c label{display:flex;justify-content:space-between;font-size:10.5px;color:#5d666d;margin-bottom:2px}',
    '.n5-c label b{font-family:ui-monospace,monospace;color:#242b2e;font-weight:600}',
    '.n5-c input[type=range]{width:100%;height:16px;accent-color:#2f7d6b;margin:0}',
    '.n5-btns{display:flex;gap:5px}',
    '.n5-b{flex:1;font-size:10.5px;padding:4px 6px;border:1px solid #ddd6c6;background:#fff;border-radius:6px;color:#5d666d;cursor:pointer;white-space:nowrap}',
    '.n5-b.on{border-color:#2f7d6b;background:#f2f7f5;color:#2f7d6b;font-weight:600}',
    '.n5-note{margin-top:12px;padding:9px 11px;border-left:3px solid #2f7d6b;background:#f2f7f5;border-radius:0 8px 8px 0;font-size:11.5px;color:#3f6d61}',
    '.n5-note.warn{border-left-color:#b26a39;background:#fbf3ed;color:#8c5340}',
    '.n5-note b{color:inherit}',
    '@media(max-width:760px){.n5-main{flex-direction:column}.n5-cv,.n5-side,.n5-track,.n5-img{flex:none;width:100%;min-width:0;max-width:100%}.n5-main canvas{width:100%!important;height:auto!important}.n5-kpi{grid-template-columns:repeat(2,minmax(0,1fr))}.n5-ctl{grid-template-columns:1fr}.n5-c[style]{grid-column:auto!important}}',
  ].join('\n');

  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }

  var MN = ['不标准化', '标志层平移', '均值-方差', '分位数映射'];
  var MC = ['#b26a39', '#7e5a8d', '#41699b', '#2f7d6b'];

  function mount(root) {
    if (!root.querySelector('style[data-n5]')) {
      var st = document.createElement('style');
      st.setAttribute('data-n5', '1');
      st.textContent = CSS;
      root.appendChild(st);
    }

    var state = { drift: 0.8, mud: 0.4, lmark: 24, mi: 2 };
    var cache = {};
    function get(d, m, lm) {
      var k = d.toFixed(2) + '|' + m.toFixed(2) + '|' + lm;
      if (!cache[k]) cache[k] = run({ drift: d, mud: m, nWells: 10, lmark: lm });
      return cache[k];
    }

    root.appendChild(el('div', 'n5-kpi',
      '<div class="n5-k" id="n5k0"></div><div class="n5-k" id="n5k1"></div>' +
      '<div class="n5-k" id="n5k2"></div><div class="n5-k" id="n5k3"></div>'));

    var main = el('div', 'n5-main');
    main.appendChild(el('div', 'n5-cv', '<canvas id="n5cv"></canvas>'));
    var side = el('div', 'n5-side');
    side.innerHTML = '<div class="cap">各井净毛比：真值 vs 当前处理（横轴为井号）</div><canvas id="n5ch"></canvas>';
    main.appendChild(side);
    root.appendChild(main);

    var ctl = el('div', 'n5-ctl');
    ctl.innerHTML =
      '<div class="n5-c"><label>仪器刻度漂移 <b id="n5ld">0.8</b></label><input id="n5sd" type="range" min="0" max="10" step="1" value="8"></div>' +
      '<div class="n5-c"><label>KCl 泥浆影响 <b id="n5lm">0.4</b></label><input id="n5sm" type="range" min="0" max="10" step="1" value="4"></div>' +
      '<div class="n5-c"><label>标志层统计段 <b id="n5ll">24 m</b></label><input id="n5sl" type="range" min="6" max="48" step="6" value="24"></div>' +
      '<div class="n5-c" style="grid-column:span 2"><label>校正方法</label><div class="n5-btns">' +
      '<button class="n5-b" data-x="0">不校正</button><button class="n5-b" data-x="1">平移</button>' +
      '<button class="n5-b on" data-x="2">均值-方差</button><button class="n5-b" data-x="3">分位数</button></div></div>';
    root.appendChild(ctl);
    root.appendChild(el('div', 'n5-note', ''));

    var cv = root.querySelector('#n5cv'), ch = root.querySelector('#n5ch');
    var note = root.querySelector('.n5-note');

    /* ---------- 直方图对比 ---------- */
    function paintHist(R, mi) {
      var W = 396, H = 306;
      var dpr = 2;
      cv.width = W * dpr; cv.height = H * dpr;
      cv.style.width = W + 'px'; cv.style.height = H + 'px';
      var g = cv.getContext('2d');
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, W, H);

      var x0 = 40, x1 = W - 14, y0 = 34, y1 = H - 62;
      var X = function (v) { return x0 + v / 150 * (x1 - x0); };
      var Y = function (v) { return y1 - Math.min(v, 0.05) / 0.05 * (y1 - y0); };

      [0, 30, 60, 90, 120, 150].forEach(function (v) {
        g.strokeStyle = '#eeeae0'; g.lineWidth = 1;
        g.beginPath(); g.moveTo(X(v), y0); g.lineTo(X(v), y1); g.stroke();
        g.fillStyle = '#9ba3a9'; g.font = '9px ui-monospace,monospace';
        g.textAlign = 'center'; g.fillText(String(v), X(v), y1 + 14);
      });

      var bw = (x1 - x0) / BINS;
      function bar(h, color, alpha) {
        g.fillStyle = color; g.globalAlpha = alpha;
        for (var i = 0; i < BINS; i++) {
          if (h[i] <= 0) continue;
          g.fillRect(x0 + i * bw, Y(h[i]), bw + 0.6, y1 - Y(h[i]));
        }
        g.globalAlpha = 1;
      }
      var tgt = R.wells[0];
      bar(R.hRef, '#8a939a', 0.20);
      bar(tgt.h[mi], MC[mi], 0.28);
      [[R.hRef, '#8a939a', 1.8], [tgt.h[mi], MC[mi], 2]].forEach(function (s2) {
        g.strokeStyle = s2[1]; g.lineWidth = s2[2];
        g.beginPath();
        for (var i = 0; i < BINS; i++) g.lineTo(x0 + (i + 0.5) * bw, Y(s2[0][i]));
        g.stroke();
      });

      /* 截止值 */
      g.strokeStyle = '#c0392b'; g.lineWidth = 1.2; g.setLineDash([5, 3]);
      g.beginPath(); g.moveTo(X(CUT), y0); g.lineTo(X(CUT), y1); g.stroke(); g.setLineDash([]);
      g.fillStyle = '#c0392b'; g.font = '9px system-ui,sans-serif'; g.textAlign = 'left';
      g.fillText('GR 60', X(CUT) + 4, y0 + 10);

      /* 参考井直方图的中位数，便于看错位 */
      var med = 0, acc2 = 0;
      for (var i2 = 0; i2 < BINS; i2++) { acc2 += R.hRef[i2]; if (acc2 >= 0.5) { med = (i2 + 0.5) / BINS * GMAX; break; } }
      g.strokeStyle = '#8a939a'; g.setLineDash([2, 3]); g.lineWidth = 1;
      g.beginPath(); g.moveTo(X(med), y0); g.lineTo(X(med), y1); g.stroke(); g.setLineDash([]);

      g.strokeStyle = '#c9c2b0';
      g.beginPath(); g.moveTo(x0, y1); g.lineTo(x1, y1); g.moveTo(x0, y1); g.lineTo(x0, y0); g.stroke();

      g.fillStyle = '#5d666d'; g.font = '9.5px system-ui,sans-serif'; g.textAlign = 'center';
      g.fillText('自然伽马 GR / API', (x0 + x1) / 2, H - 26);
      g.save(); g.translate(12, (y0 + y1) / 2); g.rotate(-Math.PI / 2);
      g.fillText('频率密度', 0, 0); g.restore();

      g.textAlign = 'left'; g.font = '9px system-ui,sans-serif';
      var lg = [['#8a939a', '参考井 #0'], [MC[mi], mi === 0 ? '1 号井原始' : MN[mi]]];
      lg.forEach(function (t, i) {
        var lx = x0 + i * 132, ly = 16;
        g.strokeStyle = t[0]; g.lineWidth = 2;
        g.beginPath(); g.moveTo(lx, ly - 3); g.lineTo(lx + 14, ly - 3); g.stroke();
        g.fillStyle = '#79828a'; g.fillText(t[1], lx + 19, ly);
      });

      var ov = R.wells[0].ov[mi];
      g.fillStyle = '#242b2e'; g.font = '10px system-ui,sans-serif'; g.textAlign = 'right';
      g.fillText('1 号井重合度 ' + ov.toFixed(2), x1, y1 + 30);
    }

    /* ---------- 各井净毛比 ---------- */
    function paintNG(R, mi) {
      var W = 396, H = 306;
      var dpr = 2;
      ch.width = W * dpr; ch.height = H * dpr;
      ch.style.width = W + 'px'; ch.style.height = H + 'px';
      var g = ch.getContext('2d');
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, W, H);

      var x0 = 40, x1 = W - 12, y0 = 30, y1 = H - 44;
      var LO = 0.30, HI = 0.60;
      var Y = function (v) { return y1 - (Math.max(LO, Math.min(HI, v)) - LO) / (HI - LO) * (y1 - y0); };
      var n = R.wells.length;
      var gw = (x1 - x0) / n;

      [0.30, 0.35, 0.40, 0.45, 0.50, 0.55, 0.60].forEach(function (v) {
        g.strokeStyle = '#eeeae0'; g.lineWidth = 1;
        g.beginPath(); g.moveTo(x0, Y(v)); g.lineTo(x1, Y(v)); g.stroke();
        g.fillStyle = '#9ba3a9'; g.font = '9px ui-monospace,monospace';
        g.textAlign = 'right'; g.fillText(Math.round(v * 100) + '%', x0 - 5, Y(v) + 3);
      });

      var bw = Math.min(10, gw / 4);
      R.wells.forEach(function (w, i) {
        var cx = x0 + (i + 0.5) * gw;
        g.fillStyle = '#8a939a'; g.globalAlpha = 0.42;
        g.fillRect(cx - bw * 1.4, Y(w.ngT), bw, y1 - Y(w.ngT));
        g.globalAlpha = 1;
        var v = w.ng[mi];
        g.fillStyle = MC[mi];
        g.fillRect(cx - bw * 0.2, Y(v), bw, y1 - Y(v));
        var d = (v - w.ngT) * 100;
        if (Math.abs(d) > 4) {
          g.fillStyle = '#c0392b'; g.font = '8px ui-monospace,monospace'; g.textAlign = 'center';
          g.fillText((d > 0 ? '+' : '') + d.toFixed(0), cx, Y(Math.max(v, w.ngT)) - 4);
        }
        g.fillStyle = '#9ba3a9'; g.font = '8px ui-monospace,monospace'; g.textAlign = 'center';
        g.fillText('#' + w.idx, cx, y1 + 12);
      });

      g.strokeStyle = '#c9c2b0';
      g.beginPath(); g.moveTo(x0, y1); g.lineTo(x1, y1); g.moveTo(x0, y1); g.lineTo(x0, y0); g.stroke();

      g.fillStyle = '#5d666d'; g.font = '9.5px system-ui,sans-serif'; g.textAlign = 'center';
      g.fillText('井号（纵轴只画 30%—60% 这一段；红字为偏差超过 4 个百分点的井）', (x0 + x1) / 2, H - 8);

      g.textAlign = 'left'; g.font = '9px system-ui,sans-serif';
      var lg = [['#8a939a', '真值 N/G'], [MC[mi], mi === 0 ? '原始曲线' : MN[mi]]];
      lg.forEach(function (t, i) {
        var lx = x0 + i * 116, ly = 14;
        g.fillStyle = t[0]; g.globalAlpha = i === 0 ? 0.42 : 1;
        g.fillRect(lx, ly - 7, 9, 9); g.globalAlpha = 1;
        g.fillStyle = '#79828a'; g.fillText(t[1], lx + 13, ly + 1);
      });
    }

    function render() {
      var R = get(state.drift, state.mud, state.lmark);
      var mi = state.mi;

      var k = [
        ['直方图重合度', R.ov[mi].toFixed(3) + '<small>1.00 为完全重合</small>'],
        ['净毛比平均偏差', (R.ngErr[mi] * 100).toFixed(1) + '<small>个百分点</small>'],
        ['结论翻转井数', R.flip[mi] + '<small>/ ' + R.n + ' 口</small>'],
        ['统计段样本', R.nMark + '<small>点</small>']
      ];
      k.forEach(function (t, i) {
        var box = root.querySelector('#n5k' + i);
        box.className = 'n5-k' + (i === 0 ? ' sel' : '');
        box.innerHTML = '<div class="l">' + t[0] + '</div><div class="v">' + t[1] + '</div>';
      });

      paintHist(R, mi);
      paintNG(R, mi);

      var msg = '<b>' + MN[mi] + '：重合度 ' + R.ov[mi].toFixed(2) + '，净毛比平均偏差 ' +
        (R.ngErr[mi] * 100).toFixed(1) + ' 个百分点，' + R.flip[mi] + '/' + R.n + ' 口井的结论翻不过真值。</b> ' +
        '对照：完全不校正时是重合度 ' + R.ov[0].toFixed(2) + '、偏差 ' + (R.ngErr[0] * 100).toFixed(1) +
        '、翻转 ' + R.flip[0] + ' 口。';
      if (mi === 1) {
        msg += '只平移一个常数，就把大部分问题解决了 —— 因为本区的刻度差主要是零点漂移，' +
          '而不是增益（±6%）。这也解释了为什么现场很多单位只做平移就收工。';
      }
      if (mi === 2 || mi === 3) {
        if (R.nMark < 40) {
          msg += '<br><b>统计段只有 ' + R.nMark + ' 个点，这个方法的误差比它要修的东西还大。</b>' +
            '均值和标准差都是从样本估出来的，样本少的时候标准差本身就有 ±20% 的误差；' +
            '拿一个 ±20% 的刻度去缩放，等于把噪声当成了刻度差 —— 分位数映射更敏感，因为它一次要估 7 个分位点。' +
            '把"标志层统计段"拉到 24 m 以上再看。';
        } else {
          msg += '<br>统计段 ' + R.lmark + ' m、' + R.nMark + ' 个样本时，这个方法才开始真正起作用：' +
            '样本够了，标准差估得准，按刻度缩放才有意义。所以"用哪种标准化"其实是个伪命题，' +
            '<b>真正决定成败的是统计段的长度</b>。';
        }
      }
      if (state.mud > 0.3 && mi > 0) {
        msg += '<br>注意它没能归零：KCl 泥浆抬高 GR 的幅度<b>随岩性变化</b>（砂质段抬得多、灰岩段几乎不抬），' +
          '任何"一条直线映射"都修不掉这种与岩性相关的偏移。要修它只能按岩性分组标准化，' +
          '或者把泥浆体系直接作为特征交给模型。';
      }
      if (state.drift < 0.15 && state.mud < 0.15) {
        msg = '<b>没有漂移、没有泥浆影响时，三种处理几乎都是恒等变换。</b>' +
          '这也是"标准化可做可不做"这个错觉的来源 —— 只在刻度一致的资料上验证过。把漂移拉到 0.8 再看。';
      }
      note.className = 'n5-note' + (mi > 0 && state.mud > 0.3 ? ' warn' : '');
      note.innerHTML = msg;
    }

    var sd = root.querySelector('#n5sd'), sm = root.querySelector('#n5sm'), sl = root.querySelector('#n5sl');
    sd.addEventListener('input', function () {
      state.drift = Number(sd.value) / 10;
      root.querySelector('#n5ld').textContent = state.drift.toFixed(1);
      render();
    });
    sm.addEventListener('input', function () {
      state.mud = Number(sm.value) / 10;
      root.querySelector('#n5lm').textContent = state.mud.toFixed(1);
      render();
    });
    sl.addEventListener('input', function () {
      state.lmark = Number(sl.value);
      root.querySelector('#n5ll').textContent = state.lmark + ' m';
      render();
    });
    Array.prototype.forEach.call(root.querySelectorAll('[data-x]'), function (b) {
      b.addEventListener('click', function () {
        state.mi = Number(b.getAttribute('data-x'));
        Array.prototype.forEach.call(root.querySelectorAll('[data-x]'), function (o) {
          o.classList.toggle('on', o === b);
        });
        render();
      });
    });

    render();
  }

  if (typeof window !== 'undefined') {
    window.W5NDEMO = mount;
    window.__CASE_MOUNT__ = mount;
  }
})();

/* Generated portable explanation; algorithm source above remains unchanged. */
(function(){var demo=(function install(win,name,info,installTrace,guideSteps){
  var original=win[name];
  function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');}
  function mount(root,api){
    root.innerHTML='<style>.oil-demo-method{font:12px/1.8 system-ui,sans-serif;color:#34433a;border:1px solid #d3dfd5;background:#f6f9f4;border-radius:10px;padding:15px;margin:0 0 18px}.oil-demo-method *{box-sizing:border-box}.oil-demo-method h3{font-size:16px;line-height:1.6;margin:2px 0 10px;color:#235f51}.oil-demo-method small{font-size:10px;color:#537561}.oil-demo-chain{display:flex;align-items:center;gap:9px;padding:8px 11px;background:#e8f0e7;border-radius:5px;margin-bottom:11px}.oil-demo-chain span{min-width:0;flex:1}.oil-demo-chain b{color:#2f7d6b}.oil-demo-reasons{display:grid;grid-template-columns:1fr 1fr;gap:16px}.oil-demo-reasons h4{font-size:12px;margin:0 0 3px}.oil-demo-method p{font-size:12px!important;line-height:1.8!important;margin:0!important}.oil-demo-live{margin-top:11px;padding-top:8px;border-top:1px solid #d3dfd5}.oil-demo-live p{color:#235f51;font-size:11px!important;min-height:20px}@media(max-width:600px){.oil-demo-reasons{grid-template-columns:1fr;gap:9px}.oil-demo-chain{display:block}.oil-demo-chain b{display:block;text-align:center;line-height:1.1}.oil-demo-method{padding:12px}}</style>'+
      '<section class="oil-demo-method" aria-label="智能方法与运行证据"><small>本次演示用什么、为什么起作用</small><h3>'+esc(info.name)+'</h3><div class="oil-demo-chain"><span>'+esc(info.input)+'</span><b aria-hidden="true">→</b><span>'+esc(info.operation)+'</span></div><div class="oil-demo-reasons"><div><h4>为什么可能有效</h4><p>'+esc(info.why)+'</p></div><div><h4>在这里怎样验证</h4><p>'+esc(info.try)+'</p></div></div><div class="oil-demo-live"><small>当前运行证据 · 随下方操作更新</small><p data-method-live></p></div></section><div data-method-body></div>';
    var body=root.querySelector('[data-method-body]'),live=root.querySelector('[data-method-live]');
    var mounted=original(body,api);
    if(info.audit){
      var audit=info.audit,box=root.ownerDocument.createElement('details');box.className='oil-demo-method';
      box.innerHTML='<summary><b>生成器敏感性自审 · '+esc(audit.metric)+' · 全部设置</b></summary><p>'+esc(audit.limits)+'</p><div style="overflow:auto"><table style="width:100%;font-size:11px;text-align:left"><thead><tr><th>扰动 / 设置</th><th>基线</th><th>学习</th><th>附加对照</th></tr></thead><tbody>'+audit.series.map(function(s){return '<tr><td>'+esc(s.axis)+' / '+esc(s.value)+'</td><td>'+s.baseline.toFixed(3)+'</td><td>'+s.learn.toFixed(3)+'</td><td>'+esc(s.alternate!=null?'附加对照 '+s.alternate.toFixed(3):s.denOnly!=null?'DEN 回归 '+s.denOnly.toFixed(3):s.grOnly!=null?'GR KNN '+s.grOnly.toFixed(3):s.coverage!=null?'区间覆盖 '+s.coverage.toFixed(3):'—')+'</td></tr>';}).join('')+'</tbody></table></div>'+(audit.heldout?'<p>95% 配对 bootstrap：学习−基线 F1 差区间 ['+audit.heldout.pairedDifference.map(function(v){return v.toFixed(3);}).join(', ')+']。以井/图为单位，冻结训练集；不覆盖真实井分布的不确定性。</p>':'')+'<p>2026-11-03 · 合成条件自审，未做第三方物理校准；全部种子和逐样本见公开审计文件，包内仅嵌入汇总。</p>';
      root.insertBefore(box,body);
    }
    var trace=installTrace(root,body,mounted,guideSteps||[]);
    function refresh(){var metric=body.querySelector(info.selector);live.textContent=metric?(metric.innerText||metric.textContent).replace(/\s+/g,' ').trim().slice(0,380):'操作下方控件，对照模型、基线与测试结果。';}
    refresh();
    var observer=new MutationObserver(function(){refresh();trace.refresh();});observer.observe(body,{childList:true,subtree:true,characterData:true});
    return {unmount:function(){observer.disconnect();trace.unmount();if(mounted&&typeof mounted.unmount==='function')mounted.unmount();}};
  }
  win[name]=mount;win.__CASE_MOUNT__=mount;
  return {mount:mount};
})(window,"W5NDEMO",{"name":"分布对齐 · 智能解释前处理配套","input":"参考井与目标井的标志层 GR 分布","operation":"平移/均方/分位数映射 → 比较校正后的可比性","why":"相同地层可能因仪器刻度不同而整体偏移，对齐可减少后续模型遇到的输入漂移。这一步不是独立学习模型；把真实地质差异强行对齐也可能引入偏差。","try":"切换校正方法和漂移，比较重合度与净毛比偏差；不要只凭两条分布靠近就断言下游更准。","selector":".n5-kpi"},function installTrace(root, body, mounted, guideSteps) {
  if (!mounted || !mounted.trace) return {refresh:function(){},unmount:function(){}};
  var api=mounted.trace, doc=root.ownerDocument, panel=doc.createElement('section');
  panel.className='oil-trace';panel.setAttribute('aria-label','单点可追查证据');
  panel.innerHTML='<style>.oil-trace,.oil-guide{font:12px/1.8 system-ui,sans-serif;color:#34433a;border:1px solid #d3dfd5;background:#fbfcf8;border-radius:9px;padding:14px;margin:16px 0;scroll-margin-top:190px}.oil-trace *,.oil-guide *{box-sizing:border-box}.oil-trace h3{font-size:16px;margin:0 0 5px}.oil-trace-controls{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:10px 0}.oil-trace label{display:grid;gap:4px;min-width:150px;flex:1}.oil-trace input{width:100%;min-width:0;accent-color:#2f7d6b}.oil-trace button,.oil-guide button{padding:6px 10px;background:#fff;border:1px solid #a8bdb0;color:#235f51;border-radius:5px;cursor:pointer;font:inherit}.oil-trace-grid{display:grid;grid-template-columns:1fr 1.5fr;gap:14px}.oil-trace dl{margin:0}.oil-trace dl>div{display:grid;grid-template-columns:minmax(90px,1fr) minmax(0,2fr);border-bottom:1px solid #e4e8dc;padding:5px 0;gap:8px}.oil-trace dt,.oil-trace dd{margin:0;overflow-wrap:anywhere}.oil-trace-summary{padding:10px;background:#edf4ed;border-radius:5px}.oil-trace small{display:block;color:#607465}.oil-guide{display:flex;gap:10px;align-items:center;flex-wrap:wrap;background:#eff5ec}.oil-guide p{flex:1;min-width:160px;margin:0!important;font-size:12px!important}.oil-guide-target{outline:3px solid #b08850!important;outline-offset:5px;scroll-margin-top:110px}.oil-trace :focus-visible,.oil-guide :focus-visible{outline:3px solid #2f7d6b;outline-offset:3px}@media(max-width:650px){.oil-trace-grid{grid-template-columns:1fr}.oil-trace{padding:10px}.oil-trace-controls{display:grid;grid-template-columns:minmax(0,1fr)}.oil-trace label{min-width:0}}</style><h3>追查这一个判断</h3><small data-trace-role></small><div class="oil-trace-controls"><label><span data-trace-point-name>深度 / 候选点</span> <input type="range" data-trace-point aria-label="单点证据的深度或候选点"></label><label><span data-trace-control-label>输入试算</span><input type="range" value="0" data-trace-delta aria-label="单点输入偏移"></label><button type="button" data-trace-reset>恢复原输入</button><button type="button" data-trace-export>导出本点证据</button><button type="button" data-trace-worst>定位回归误差最大点</button></div><p class="oil-trace-summary" data-trace-summary tabindex="-1" role="status" aria-live="polite" aria-atomic="true"></p><div class="oil-trace-grid"><div><b>实际输入</b><dl data-trace-inputs></dl></div><div><b>真实中间量</b><dl data-trace-steps></dl></div></div><small data-trace-note></small>';
  root.appendChild(panel);
  if(api.name){panel.querySelector('[data-trace-point-name]').textContent=api.name;panel.querySelector('[data-trace-point]').setAttribute('aria-label',api.name);}
  var point=panel.querySelector('[data-trace-point]'),delta=panel.querySelector('[data-trace-delta]'),lastIndex=null;
  function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');}
  function fmt(v){return typeof v==='number'?Number(v.toFixed(5)):String(v).replace(/-?\d+\.\d{6,}/g,function(n){return Number(Number(n).toFixed(5));});}
  function rows(values){return values.map(function(v){return '<div><dt>'+esc(v[0])+'</dt><dd>'+esc(fmt(v[1]))+(v[2]?' '+esc(v[2]):'')+'</dd></div>';}).join('');}
  function refresh(){
    var range=api.range();point.min=range.min;point.max=range.max;point.value=range.value;
    if(range.value!==lastIndex){delta.value=0;lastIndex=range.value;}
    var trial=Number(delta.value)||0,record=api.read(trial);
    if(!record){panel.querySelector('[data-trace-summary]').textContent='当前没有可追查的候选；这是候选生成的失效边界。';return;}
    var c=record.control;delta.step=c.step;delta.min=c.min;delta.max=c.max;delta.value=trial;
    panel.querySelector('[data-trace-control-label]').textContent=c.name+' '+fmt(Number(delta.value))+' '+c.unit+'（单点试算）';
    panel.querySelector('[data-trace-role]').textContent=record.role+' · trace-v1';
    panel.querySelector('[data-trace-inputs]').innerHTML=rows(record.inputs);
    panel.querySelector('[data-trace-steps]').innerHTML=rows(record.steps);
    panel.querySelector('[data-trace-summary]').textContent=record.label+'：'+record.prediction.name+' '+fmt(record.prediction.value)+' '+record.prediction.unit+'；'+record.baseline.name+' '+fmt(record.baseline.value)+' '+record.baseline.unit;
    panel.querySelector('[data-trace-note]').textContent=record.note;
    // The exact structured record also supports external reproducibility checks.
    record.trialDelta=Number(delta.value)||0;panel.traceRecord=record;
  }
  point.addEventListener('input',function(){api.select(Number(point.value));delta.value=0;refresh();});
  delta.addEventListener('input',refresh);
  panel.querySelector('[data-trace-reset]').addEventListener('click',function(){delta.value=0;refresh();});
  panel.querySelector('[data-trace-export]').addEventListener('click',function(){if(!panel.traceRecord)return;var a=doc.createElement('a');a.href='data:application/json;charset=utf-8,'+encodeURIComponent(JSON.stringify(panel.traceRecord,null,2));a.download=panel.traceRecord.caseId+'-point-'+panel.traceRecord.index+'.json';a.click();});
  var worst=panel.querySelector('[data-trace-worst]');worst.hidden=!api.worst;if(api.worstLabel)worst.textContent=api.worstLabel;
  worst.addEventListener('click',function(){api.select(api.worst());delta.value=0;refresh();panel.querySelector('[data-trace-summary]').focus();});
  function onProfile(){refresh();panel.scrollIntoView({block:'center',behavior:'auto'});}
  body.addEventListener('tracechange',onProfile);
  var guide=doc.createElement('nav');guide.className='oil-guide';guide.setAttribute('aria-label','30—60 秒演示路径');
  guide.innerHTML='<b>30—60 秒演示路径</b><p data-guide-text role="status" aria-live="polite">按三步检查输入、判断依据与传统对照。完成时间需在真人测试中记录。</p><button type="button" data-guide-next>开始引导</button><button type="button" data-guide-stop hidden>结束引导</button>';
  root.insertBefore(guide,body);
  var step=-1,target=null,originalTabIndex=null;
  function clearTarget(){if(target){target.classList.remove('oil-guide-target');if(originalTabIndex===null)target.removeAttribute('tabindex');else target.setAttribute('tabindex',originalTabIndex);target=null;}}
  function stop(){clearTarget();step=-1;guide.querySelector('[data-guide-next]').textContent='重新引导';guide.querySelector('[data-guide-stop]').hidden=true;}
  guide.querySelector('[data-guide-stop]').addEventListener('click',stop);
  guide.querySelector('[data-guide-next]').addEventListener('click',function(){
    clearTarget();step++;
    if(step>=guideSteps.length){stop();guide.querySelector('[data-guide-text]').textContent='请复述：用了什么输入？哪个中间量支持判断？传统方法在同一点输出什么？完成引导不等于测试通过。';return;}
    var s=guideSteps[step];guide.querySelector('[data-guide-text]').textContent=(step+1)+'/'+guideSteps.length+' · '+s[1];
    guide.querySelector('[data-guide-next]').textContent=step===guideSteps.length-1?'完成引导':'下一步';guide.querySelector('[data-guide-stop]').hidden=false;
    target=root.querySelector(s[0]);if(target){originalTabIndex=target.getAttribute('tabindex');target.setAttribute('tabindex','0');target.classList.add('oil-guide-target');target.scrollIntoView({behavior:'auto',block:'center'});target.focus({preventScroll:true});}
  });
  refresh();
  return {refresh:refresh,unmount:function(){clearTarget();body.removeEventListener('tracechange',onProfile);}};
},[]);if(typeof module!=="undefined")module.exports=demo;})();
