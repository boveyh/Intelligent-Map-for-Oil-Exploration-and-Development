/* =========================================================
   c1 · 固井质量智能评价 —— 可运行示范（自包含，无外部依赖）
   ---------------------------------------------------------
   演示三件事：
     ① CBL 幅度高，不等于胶结差 —— 微环隙也会把幅度顶上去；
     ② 只看一条幅度曲线，微环隙会被整段判成窜槽（这是最贵的误判）；
     ③ 多特征质心分类使用合成能量与周向代理量；常规 VDL 不提供完整周向观测。
   纯函数导出到 window.C1CORE，供 tools/test-c1.js 在 Node 里复算。
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
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  var DZ = 0.5;             /* 采样间距 m */
  var BOT = 40;             /* 评价井段 m */
  var NS = Math.round(BOT / DZ);   /* 80 个采样点 */
  var SPSEG = 2;            /* 每个 1 m 评价段包含 2 个采样点 */
  var NSEG = NS / SPSEG;    /* 40 个评价段 */

  /* 四类胶结状态 */
  var CLS = [
    { n: '胶结良好', c: '#2f7d6b', k: 'good' },
    { n: '微环隙', c: '#b26a39', k: 'micro' },
    { n: '窜槽', c: '#c0392b', k: 'chan' },
    { n: '自由套管', c: '#5d666d', k: 'free' }
  ];
  var NL = CLS.length;

  /* 真实分段：0—4 水泥返高以上自由套管，其余胶结/微环隙/窜槽交替 */
  var SEGTRUTH = (function () {
    var out = [];
    function run(n, k) { for (var i = 0; i < n; i++) out.push(k); }
    run(4, 3);   /* 0—4 m  自由套管 */
    run(5, 0);   /* 4—9 m  胶结良好 */
    run(5, 1);   /* 9—14 m 微环隙 */
    run(5, 0);   /* 14—19 m 胶结良好 */
    run(4, 2);   /* 19—23 m 窜槽 */
    run(6, 0);   /* 23—29 m 胶结良好 */
    run(5, 1);   /* 29—34 m 微环隙 */
    run(6, 0);   /* 34—40 m 胶结良好 */
    return out;
  })();

  /* 每段的真实类别（逐采样点） */
  var TRUTH = (function () {
    var out = [];
    SEGTRUTH.forEach(function (k) { for (var i = 0; i < SPSEG; i++) out.push(k); });
    return out;
  })();

  /* amp   : 套管波首波幅度，mV，0—100
     formE : 地层波能量占比，0—1（VDL 上晚到的斜条纹有多强）
     circ  : 周向一致性，0—1（8 个接收器看到的形态是否一致）
     微环隙的四个参数都随"环隙强度 μ"向自由套管靠拢 ——
     环隙越大，套管越是"悬空"，幅度越接近自由套管，地层波被压得越狠。 */
  var BASE = [
    { amp: 14, formE: 0.58, circ: 0.86 },   /* 胶结良好 */
    { amp: 34, formE: 0.56, circ: 0.82 },   /* 微环隙（μ=0 的起点） */
    { amp: 55, formE: 0.20, circ: 0.30 },   /* 窜槽 */
    { amp: 92, formE: 0.07, circ: 0.60 }    /* 自由套管 */
  ];
  var MU = { amp: 58, formE: -0.49, circ: -0.22 };   /* μ=1 时正好落到自由套管的响应上 */
  var SIG = { amp: 4.0, formE: 0.05, circ: 0.07 };

  /* 固定噪声模板：滑块调噪声只缩放幅度，曲线不会乱跳 */
  var NPAT = (function () {
    var rnd = mulberry32(9017);
    return TRUTH.map(function () {
      return [gauss(rnd), gauss(rnd), gauss(rnd)];
    });
  })();

  function obs(mu, noise) {
    var s = noise == null ? 1 : noise;
    return TRUTH.map(function (k, i) {
      var pre = BASE[k];
      var isM = k === 1;
      return {
        amp: clamp((isM ? pre.amp + MU.amp * mu : pre.amp) + SIG.amp * s * NPAT[i][0], 0, 100),
        formE: clamp((isM ? pre.formE + MU.formE * mu : pre.formE) + SIG.formE * s * NPAT[i][1], 0, 1),
        circ: clamp((isM ? pre.circ + MU.circ * mu : pre.circ) + SIG.circ * s * NPAT[i][2], 0, 1),
        truth: k
      };
    });
  }

  /* ---------------- 分类器 A：只看 CBL 幅度（传统做法） ----------------
     幅度 < 30 mV 判胶结良好；30—78 判窜槽；> 78 判自由套管。
     阈值为本合成案例设定，不作为通用解释规范。 */
  function clsAmp(o) {
    return o.amp < 30 ? 0 : o.amp < 78 ? 2 : 3;
  }

  /* ---------------- 分类器 A′：把幅度阈值调到"这口井刚好对" ----------------
     有人会说：门槛再切细一点不就行了。在这口井（环隙 50%）上，
     微环隙 64.3 mV、窜槽 53.6 mV，把 59 mV 加进去确实能分开 ——
     但这个 59 是"这口井、这个环隙、这种水泥"下的 59。 */
  var TH3 = [30, 59, 86];
  function clsAmp3(o) {
    return o.amp < TH3[0] ? 0 : o.amp < TH3[1] ? 2 : o.amp < TH3[2] ? 1 : 3;
  }

  /* ---------------- 分类器 B：幅度 + VDL 纹理 ----------------
     用少量人工标定段算四个质心，其余按最近质心归类。
     标定段固定取 4 段（每类 1 段），共 10% 的段。 */
  var CAL_SEG = [2, 6, 11, 21];   /* 自由 / 好 / 微环 / 窜槽 */
  var TEST_SEG = SEGTRUTH.map(function (_, s) { return s; }).filter(function (s) { return CAL_SEG.indexOf(s) < 0; });

  function calibrate(o) {
    var sum = [], cnt = [];
    for (var k = 0; k < NL; k++) { sum.push([0, 0, 0]); cnt.push(0); }
    CAL_SEG.forEach(function (s) {
      for (var i = s * SPSEG; i < s * SPSEG + SPSEG; i++) {
        var f = vec(o[i]);
        for (var d = 0; d < 3; d++) sum[TRUTH[i]][d] += f[d];
        cnt[TRUTH[i]]++;
      }
    });
    return sum.map(function (v, k) {
      return cnt[k] ? [v[0] / cnt[k], v[1] / cnt[k], v[2] / cnt[k]] : null;
    });
  }
  function vec(o) { return [o.amp / 100, o.formE, o.circ]; }

  function clsFull(o, cen) {
    return o.map(function (p) {
      var f = vec(p), best = 0, bd = 1e9, sec = 1e9;
      for (var k = 0; k < NL; k++) {
        if (!cen[k]) continue;
        var s = 0;
        for (var d = 0; d < 3; d++) s += (f[d] - cen[k][d]) * (f[d] - cen[k][d]);
        var dist = Math.sqrt(s);
        if (dist < bd) { sec = bd; bd = dist; best = k; }
        else if (dist < sec) sec = dist;
      }
      return { y: best, margin: sec - bd };
    });
  }

  /* ---------------- 分段评价：1 m 一段，段内多数表决 ---------------- */
  function segLabel(perSample) {
    var out = [];
    for (var s = 0; s < NSEG; s++) {
      var cnt = [0, 0, 0, 0];
      for (var i = s * SPSEG; i < s * SPSEG + SPSEG; i++) cnt[perSample[i]]++;
      var b = 0;
      for (var k = 1; k < NL; k++) if (cnt[k] > cnt[b]) b = k;
      out.push(b);
    }
    return out;
  }

  function evaluate(mu, noise, mode) {
    var o = obs(mu, noise);
    var per, margins = null;
    if (mode === 'amp') {
      per = o.map(clsAmp);
    } else if (mode === 'amp3') {
      per = o.map(clsAmp3);
    } else {
      var r = clsFull(o, calibrate(o));
      per = r.map(function (x) { return x.y; });
      margins = r.map(function (x) { return x.margin; });
    }
    var segs = segLabel(per);
    var hit = 0, microN = 0, microErr = 0, chanN = 0, chanErr = 0, review = 0;
    TEST_SEG.forEach(function (s) {
      var p = segs[s];
      var t = SEGTRUTH[s];
      if (p === t) hit++;
      if (t === 1) { microN++; if (p !== 1) microErr++; }
      if (t === 2) { chanN++; if (p !== 2) chanErr++; }
      if (p !== t) review++;
    });
    /* 最近与次近质心的距离差，未校准为正确率。 */
    var segMargin = [];
    if (margins) {
      for (var s2 = 0; s2 < NSEG; s2++) {
        var mn = 9;
        for (var i2 = s2 * SPSEG; i2 < s2 * SPSEG + SPSEG; i2++) mn = Math.min(mn, margins[i2]);
        segMargin.push(mn);
      }
    }
    return {
      o: o, per: per, segs: segs, segMargin: segMargin,
      agree: hit / TEST_SEG.length, testIndices: TEST_SEG.slice(), testN: TEST_SEG.length,
      microErrRate: microN ? microErr / microN : 0,
      chanErrRate: chanN ? chanErr / chanN : 0,
      microN: microN, chanN: chanN, review: review
    };
  }

  /* 混淆矩阵（段级） */
  function confuse(segs) {
    var m = [];
    for (var i = 0; i < NL; i++) m.push([0, 0, 0, 0]);
    TEST_SEG.forEach(function (s) { m[SEGTRUTH[s]][segs[s]]++; });
    return m;
  }

  var API = {
    DZ: DZ, BOT: BOT, NS: NS, NSEG: NSEG, SPSEG: SPSEG,
    CLS: CLS, NL: NL, TRUTH: TRUTH, SEGTRUTH: SEGTRUTH, BASE: BASE,
    obs: obs, clsAmp: clsAmp, clsAmp3: clsAmp3, clsFull: clsFull, calibrate: calibrate,
    TH3: TH3,
    segLabel: segLabel, evaluate: evaluate, confuse: confuse, CAL_SEG: CAL_SEG, TEST_SEG: TEST_SEG
  };
  if (typeof window !== 'undefined') { window.C1CORE = API; }

  /* =========================================================
     渲染
     ========================================================= */
  var CSS = [
    '.c1{font-size:13px;color:#242b2e;line-height:1.6}',
    '.c1 *{box-sizing:border-box}',
    '.c1-kpi{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-bottom:12px}',
    '.c1-k{background:#faf8f2;border-radius:8px;padding:9px 10px;min-width:0;border:1px solid transparent}',
    '.c1-k .l{font-size:10px;color:#79828a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.c1-k .v{font-family:ui-monospace,monospace;font-size:15px;font-weight:600;margin-top:3px;white-space:nowrap}',
    '.c1-k .v small{font-size:10px;font-weight:400;color:#79828a;margin-left:3px}',
    '.c1-k.sel{border-color:#2f7d6b;background:#f2f7f5}',
    '.c1-k.sel .l{color:#2f7d6b;font-weight:600}',
    '.c1-main{display:flex;gap:16px;align-items:flex-start}',
    '.c1-cv{flex:0 0 400px;width:400px;border:1px solid #e9e4d8;border-radius:8px;overflow:hidden;background:#fff}',
    '.c1-cv canvas{display:block;width:100%;height:auto}',
    '.c1-side{flex:1;min-width:0}',
    '.c1-side .cap{font-size:10.5px;color:#79828a;margin-bottom:3px}',
    '.c1-ctl{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px 16px;margin-top:14px;padding-top:12px;border-top:1px solid #eeeae0}',
    '.c1-c{min-width:0}',
    '.c1-c label{display:flex;justify-content:space-between;font-size:10.5px;color:#5d666d;margin-bottom:2px}',
    '.c1-c label b{font-family:ui-monospace,monospace;color:#242b2e;font-weight:600}',
    '.c1-c input[type=range]{width:100%;height:16px;accent-color:#2f7d6b;margin:0}',
    '.c1-btns{display:flex;gap:5px}',
    '.c1-b{flex:1;font-size:10.5px;padding:4px 6px;border:1px solid #ddd6c6;background:#fff;border-radius:6px;color:#5d666d;cursor:pointer;white-space:nowrap}',
    '.c1-b.on{border-color:#2f7d6b;background:#f2f7f5;color:#2f7d6b;font-weight:600}',
    '.c1-note{margin-top:12px;padding:9px 11px;border-left:3px solid #2f7d6b;background:#f2f7f5;border-radius:0 8px 8px 0;font-size:11.5px;color:#3f6d61}',
    '.c1-note.warn{border-left-color:#b26a39;background:#fbf3ed;color:#8c5340}',
    '.c1-note b{color:inherit}',
    '@media(max-width:760px){.c1-main{flex-direction:column}.c1-cv,.c1-side,.c1-track,.c1-img{flex:none;width:100%;min-width:0;max-width:100%}.c1-main canvas{width:100%!important;height:auto!important}.c1-kpi{grid-template-columns:repeat(2,minmax(0,1fr))}.c1-ctl{grid-template-columns:1fr}.c1-c[style]{grid-column:auto!important}}',
  ].join('\n');

  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }

  function mount(root) {
    if (!root.querySelector('style[data-c1]')) {
      var st = document.createElement('style');
      st.setAttribute('data-c1', '1');
      st.textContent = CSS;
      root.appendChild(st);
    }

    var state = { mu: 0.5, noise: 1, mode: 'full' };

    root.appendChild(el('div', 'c1-kpi',
      '<div class="c1-k" id="c1k0"></div><div class="c1-k" id="c1k1"></div>' +
      '<div class="c1-k" id="c1k2"></div><div class="c1-k" id="c1k3"></div>'));

    var main = el('div', 'c1-main');
    main.appendChild(el('div', 'c1-cv', '<canvas id="c1cv"></canvas>'));
    var side = el('div', 'c1-side');
    side.innerHTML = '<div class="cap">合成波形示意（0—700 μs）；不是分类器提取特征的实测输入</div><canvas id="c1vd"></canvas>';
    main.appendChild(side);
    root.appendChild(main);

    var ctl = el('div', 'c1-ctl');
    ctl.innerHTML =
      '<div class="c1-c"><label for="c1sm">微环隙强度 <b id="c1lm">50%</b></label><input id="c1sm" type="range" min="0" max="100" step="5" value="50"></div>' +
      '<div class="c1-c"><label for="c1sn">测井噪声 <b id="c1ln">1.0×</b></label><input id="c1sn" type="range" min="50" max="200" step="10" value="100"></div>' +
      '<div class="c1-c"><label>判别依据</label><div class="c1-btns">' +
      '<button type="button" aria-pressed="false" class="c1-b" data-m="amp">两档幅度</button>' +
      '<button type="button" aria-pressed="false" class="c1-b" data-m="amp3">三档幅度</button>' +
      '<button type="button" aria-pressed="true" class="c1-b on" data-m="full">三特征质心</button></div></div>';
    root.appendChild(ctl);
    root.appendChild(el('p', 'c1-split', '同井 40 段：4 段有标签标定（2—3、6—7、11—12、21—22 m），其余 36 段评分。图中“标”不计入误判率。每次调整条件会重新标定，尚未验证冻结模型跨井迁移。'));
    root.appendChild(el('div', 'c1-note', ''));

    var cv = root.querySelector('#c1cv'), vd = root.querySelector('#c1vd');
    var note = root.querySelector('.c1-note');

    /* ---------- 左：CBL 幅度 + 真值/判定色条 ---------- */
    function paintAmp(res) {
      var W = 400, H = 500, dpr = 2;
      cv.width = W * dpr; cv.height = H * dpr;
      cv.style.width = W + 'px'; cv.style.height = H + 'px';
      var g = cv.getContext('2d');
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, W, H);

      var y0 = 40, y1 = H - 62;
      var Y = function (d) { return y0 + d / BOT * (y1 - y0); };
      var x0 = 62, x1 = 196;
      var X = function (v) { return x0 + clamp(v, 0, 100) / 100 * (x1 - x0); };

      ['CBL 幅度 / mV', '真值', '判定', '误判'].forEach(function (t, i) {
        g.fillStyle = '#5d666d'; g.font = '9.5px system-ui,sans-serif'; g.textAlign = 'center';
        var cx = i === 0 ? (x0 + x1) / 2 : i === 1 ? 232 : i === 2 ? 276 : 304;
        g.fillText(t, cx, 22);
      });

      /* 网格与刻度 */
      [0, 25, 50, 75, 100].forEach(function (v) {
        g.strokeStyle = '#f0ece2'; g.lineWidth = 1;
        g.beginPath(); g.moveTo(X(v), y0); g.lineTo(X(v), y1); g.stroke();
        g.fillStyle = '#9ba3a9'; g.font = '8.5px ui-monospace,monospace'; g.textAlign = 'center';
        g.fillText(v + '', X(v), y1 + 14);
      });
      g.strokeStyle = '#e9e4d8'; g.lineWidth = 1;
      g.strokeRect(x0, y0, x1 - x0, y1 - y0);
      [[30, '30 mV'], [78, '78 mV']].forEach(function (t) {
        g.strokeStyle = '#c0392b'; g.setLineDash([4, 3]); g.lineWidth = 1;
        g.beginPath(); g.moveTo(X(t[0]), y0); g.lineTo(X(t[0]), y1); g.stroke();
        g.setLineDash([]);
        g.fillStyle = '#c0392b'; g.font = '8px ui-monospace,monospace'; g.textAlign = 'center';
        g.fillText(t[1], X(t[0]), y1 + 27);
      });

      /* 幅度曲线 */
      g.strokeStyle = '#242b2e'; g.lineWidth = 1.4; g.beginPath();
      res.o.forEach(function (p, i) {
        var px = X(p.amp), py = Y(i * DZ + DZ / 2);
        if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
      });
      g.stroke();
      res.o.forEach(function (p, i) {
        g.beginPath(); g.arc(X(p.amp), Y(i * DZ + DZ / 2), 1.5, 0, 7);
        g.fillStyle = p.truth === 1 ? '#b26a39' : '#242b2e'; g.fill();
      });

      /* 真值 / 判定色条（按段） */
      [[232, 1], [276, 0]].forEach(function (col) {
        var cx = col[0];
        for (var s = 0; s < NSEG; s++) {
          var lab = col[1] ? SEGTRUTH[s] : res.segs[s];
          g.fillStyle = CLS[lab].c; g.globalAlpha = col[1] ? 0.55 : 0.85;
          g.fillRect(cx - 18, Y(s), 36, (y1 - y0) / NSEG - 0.9);
          g.globalAlpha = 1;
        }
      });
      /* 误判列底 */
      g.fillStyle = '#fdf6f5';
      g.fillRect(296, y0, 16, y1 - y0);
      /* 误判打叉 */
      for (var s2 = 0; s2 < NSEG; s2++) {
        if (CAL_SEG.indexOf(s2) >= 0) {
          g.fillStyle = '#68726e'; g.font = '8px system-ui,sans-serif'; g.textAlign = 'center';
          g.fillText('标', 304, Y(s2) + (y1 - y0) / NSEG / 2 + 3);
        } else if (res.segs[s2] !== SEGTRUTH[s2]) {
          var cy = Y(s2) + (y1 - y0) / NSEG / 2;
          g.strokeStyle = '#c0392b'; g.lineWidth = 1.5;
          g.beginPath(); g.moveTo(299, cy - 3.5); g.lineTo(306, cy + 3.5);
          g.moveTo(306, cy - 3.5); g.lineTo(299, cy + 3.5); g.stroke();
        }
      }

      /* 深度刻度 */
      g.fillStyle = '#9ba3a9'; g.font = '9px ui-monospace,monospace'; g.textAlign = 'right';
      [0, 10, 20, 30, 40].forEach(function (d) { g.fillText(d + '', x0 - 6, Y(d) + 3); });
      g.save(); g.translate(20, (y0 + y1) / 2); g.rotate(-Math.PI / 2);
      g.fillStyle = '#79828a'; g.font = '9.5px system-ui,sans-serif'; g.textAlign = 'center';
      g.fillText('深度 / m', 0, 0); g.restore();

      /* 图例 */
      g.textAlign = 'left'; g.font = '9px system-ui,sans-serif';
      CLS.forEach(function (L, i) {
        var lx = 12 + i * 72, ly = H - 14;
        g.fillStyle = L.c; g.globalAlpha = .8;
        g.fillRect(lx, ly - 7, 9, 9); g.globalAlpha = 1;
        g.fillStyle = '#79828a'; g.fillText(L.n, lx + 13, ly + 1);
      });
    }

    /* ---------- 右：VDL 变密度图 ---------- */
    function paintVDL(res) {
      var W = 400, H = 500, dpr = 2;
      vd.width = W * dpr; vd.height = H * dpr;
      vd.style.width = W + 'px'; vd.style.height = H + 'px';
      var g = vd.getContext('2d');
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, W, H);

      var y0 = 40, y1 = H - 62;
      var x0 = 22, x1 = W - 18;
      var NT = 150;                        /* 时间采样 0—700 μs */
      var TMAX = 700;
      var XT = function (t) { return x0 + t / TMAX * (x1 - x0); };
      var rh = (y1 - y0) / NS;
      var cw = (x1 - x0) / NT;

      g.fillStyle = '#fdfcf9';
      g.fillRect(x0, y0, x1 - x0, y1 - y0);

      /* 时间刻度 */
      [0, 200, 400, 600].forEach(function (t) {
        g.strokeStyle = 'rgba(192,57,43,.18)'; g.setLineDash([3, 3]); g.lineWidth = 1;
        g.beginPath(); g.moveTo(XT(t), y0); g.lineTo(XT(t), y1); g.stroke();
        g.setLineDash([]);
        g.fillStyle = '#9ba3a9'; g.font = '8.5px ui-monospace,monospace'; g.textAlign = 'center';
        g.fillText(t, XT(t), y0 - 6);
      });
      g.fillStyle = '#79828a'; g.font = '9px system-ui,sans-serif'; g.textAlign = 'left';
      g.fillText('μs', x1 - 14, y0 - 6);

      /* 合成波形：套管波 + 地层波（斜条纹）+ 窜槽（晚到的竖条） */
      for (var i = 0; i < NS; i++) {
        var p = res.o[i], k = p.truth;
        var d = i * DZ + DZ / 2;
        var tCas = 58;
        var tFm = 380 + 46 * Math.sin(d * 0.16) + 14 * Math.sin(d * 0.7);
        var tCh = 585;
        for (var t = 0; t < NT; t++) {
          var tt = t / NT * TMAX;
          var v = 0;
          v += (p.amp / 100) * 1.15 * Math.exp(-Math.pow(tt - tCas, 2) / (2 * 20 * 20));
          v += p.formE * 1.5 * Math.exp(-Math.pow(tt - tFm, 2) / (2 * 52 * 52));
          if (k === 2) v += 0.62 * Math.exp(-Math.pow(tt - tCh, 2) / (2 * 30 * 30));
          else v += 0.05 * Math.exp(-Math.pow(tt - tCh, 2) / (2 * 40 * 40));
          /* 细纹理：让图看起来像真实记录 */
          v *= 1 + 0.18 * Math.sin(t * 1.7 + i * 0.9);
          var a = clamp(v, 0, 1);
          if (a < 0.04) continue;
          var shade = Math.round(250 - a * 225);
          g.fillStyle = 'rgb(' + shade + ',' + shade + ',' + (shade + 4) + ')';
          g.fillRect(XT(t / NT * TMAX), y0 + i * rh, cw + 0.8, rh + 0.4);
        }
      }

      /* 深度网格与刻度 */
      g.fillStyle = '#9ba3a9'; g.font = '9px ui-monospace,monospace'; g.textAlign = 'right';
      [0, 10, 20, 30, 40].forEach(function (d) {
        var y = y0 + d / BOT * (y1 - y0);
        g.strokeStyle = 'rgba(192,57,43,.22)'; g.setLineDash([3, 3]);
        g.beginPath(); g.moveTo(x0, y); g.lineTo(x1, y); g.stroke();
        g.setLineDash([]);
        g.fillText(d + '', x0 - 5, y + 3);
      });
      g.strokeStyle = '#c9c2b0';
      g.strokeRect(x0, y0, x1 - x0, y1 - y0);

      /* 三类特征标注 */
      function tag(t, txt, col) {
        g.strokeStyle = col; g.lineWidth = 1; g.setLineDash([2, 2]);
        g.beginPath(); g.moveTo(XT(t), y1); g.lineTo(XT(t), y1 + 8); g.stroke();
        g.setLineDash([]);
        g.fillStyle = col; g.font = '8.5px system-ui,sans-serif'; g.textAlign = 'center';
        g.fillText(txt, XT(t), y1 + 19);
      }
      tag(58, '套管波', '#5d666d');
      tag(430, '地层波', '#2f7d6b');
      tag(585, '窜槽竖条', '#c0392b');
    }

    function render() {
      var res = evaluate(state.mu, state.noise, state.mode);

      var k = [
        ['未标定段符合率', (res.agree * 100).toFixed(1) + '<small>%</small>'],
        ['微环隙误判率', (res.microErrRate * 100).toFixed(0) + '<small>%</small>'],
        ['窜槽误判率', (res.chanErrRate * 100).toFixed(0) + '<small>%</small>'],
        ['测试段判错', res.review + '<small>/ ' + res.testN + ' 段</small>']
      ];
      k.forEach(function (t, i) {
        var box = root.querySelector('#c1k' + i);
        box.className = 'c1-k' + (i === 0 ? ' sel' : '');
        box.innerHTML = '<div class="l">' + t[0] + '</div><div class="v">' + t[1] + '</div>';
      });

      paintAmp(res);
      paintVDL(res);

      var cls = state.mode === 'amp';
      var cls3 = state.mode === 'amp3';
      var msg;
      if (cls) {
        msg = '本例两档阈值为 30 / 78 mV，测试集 <b>' + res.microN + ' 个微环隙段中 ' +
          Math.round(res.microErrRate * res.microN) + ' 个被误判</b>。该规则没有微环隙输出类；比较三特征质心，检查额外信息是否改善分类。阈值不是通用现场规范。';
      } else if (cls3) {
        msg = '固定三档阈值 30 / 59 / 86 mV 在当前条件下的符合率为 ' + (res.agree * 100).toFixed(1) + '%。这些阈值按合成强度 50% 的分布设定。改变条件后对照结果；三特征分支每次重新标定，不能据此断言其冻结模型迁移更好。';
      } else if (state.mu >= 0.85) {
        msg = '合成强度为 <b>' + Math.round(state.mu * 100) + '%</b>，生成器让微环隙逐渐接近自由套管的特征；36 个测试段中 ' + res.review + ' 段判错。该实验展示输入不可分时的限制，不能证明所有真实微环隙的响应规律。作业上应结合其他记录或复测安排人工解释。';
      } else {
        msg = '4 段标签分别形成四类质心，另外 36 段按幅度、合成地层波能量与周向代理量的距离分类；符合率 ' + (res.agree * 100).toFixed(1) + '%。周向量未从常规 CBL/VDL 提取；右侧波形只作概念示意，不是端到端图像识别。';
      }
      note.className = 'c1-note' + (cls || state.mu >= 0.85 ? ' warn' : '');
      note.innerHTML = msg;
    }

    var sm = root.querySelector('#c1sm'), sn = root.querySelector('#c1sn');
    sm.addEventListener('input', function () {
      state.mu = Number(sm.value) / 100;
      root.querySelector('#c1lm').textContent = Math.round(state.mu * 100) + '%';
      render();
    });
    sn.addEventListener('input', function () {
      state.noise = Number(sn.value) / 100;
      root.querySelector('#c1ln').textContent = state.noise.toFixed(1) + '×';
      render();
    });
    Array.prototype.forEach.call(root.querySelectorAll('[data-m]'), function (b) {
      b.addEventListener('click', function () {
        state.mode = b.getAttribute('data-m');
        Array.prototype.forEach.call(root.querySelectorAll('[data-m]'), function (o) {
          o.classList.toggle('on', o === b);
          o.setAttribute('aria-pressed', String(o === b));
        });
        render();
      });
    });

    render();
  }

  if (typeof window !== 'undefined') {
    window.C1DEMO = mount;
    window.__CASE_MOUNT__ = mount;
  }
})();
