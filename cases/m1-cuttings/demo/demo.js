/* =========================================================
   m1 · 岩屑岩性自动识别 —— 可运行示范（自包含，无外部依赖）
   ---------------------------------------------------------
   演示三件事：
     ① 迟到时间算错几分钟，整套剖面就上下错位，岩性判得再准也白搭；
     ② 岩屑小、湿、混样，单看一张图判不准 —— 要靠多维特征 + 概率；
     ③ 标注预算有限时，"挑最不确定的标"比"随便标"省一个数量级。
   纯函数导出到 window.M1CORE，供 tools/test-m1.js 在 Node 里复算。
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

  var DZ = 0.2;            /* 采样间距，m */
  var BOT = 60;            /* 井段，m */
  var NS = Math.round(BOT / DZ) + 1;
  var ROP = 24;            /* 机械钻速 m/h */

  /* 四类岩屑：颜色（色调）、粒径、分选、碳酸盐反应 */
  var LITH = [
    { n: '砂岩', c: '#d9b45c', f: [0.62, 0.42, 0.55, 0.05] },
    { n: '泥岩', c: '#8b8878', f: [0.30, 0.22, 0.80, 0.10] },
    { n: '灰岩', c: '#6f93ae', f: [0.10, 0.55, 0.45, 0.85] },
    { n: '白云岩', c: '#b9cdd6', f: [0.18, 0.62, 0.50, 0.55] }
  ];
  var NL = LITH.length;
  var NOISE = 0.105;        /* 单样本特征噪声，决定准确率上限 */

  /* 地层柱：砂—泥—灰—白云岩交互 */
  var SEQ = (function () {
    var rnd = mulberry32(3331);
    var CYC = [0, 1, 0, 2, 1, 0, 2, 3, 1, 0, 3, 1];
    var out = [], ci = 0;
    while (out.length < NS) {
      var th = Math.max(1, Math.round((0.8 + rnd() * 2.6) / DZ));
      for (var t = 0; t < th && out.length < NS; t++) out.push(CYC[ci % CYC.length]);
      ci++;
    }
    return out;
  })();

  /* 每个深度点的观测特征（含噪声，与深度一一对应） */
  var FEAT = (function () {
    var rnd = mulberry32(8821);
    return SEQ.map(function (l) {
      var c = LITH[l].f;
      return [
        clamp(c[0] + gauss(rnd) * NOISE, 0, 1),
        clamp(c[1] + gauss(rnd) * NOISE, 0, 1),
        clamp(c[2] + gauss(rnd) * NOISE, 0, 1),
        clamp(c[3] + gauss(rnd) * NOISE, 0, 1)
      ];
    });
  })();

  function dist(a, b) {
    var s = 0;
    for (var i = 0; i < a.length; i++) s += (a[i] - b[i]) * (a[i] - b[i]);
    return Math.sqrt(s);
  }

  /* ---------------- 分类器：最近质心 ----------------
     只用品类未知时的无监督结构不行 —— 这里模拟"有少量标注"的半监督：
     标注样本算质心，其余按最近质心归类。 */
  function trainCentroids(labeled) {
    var sum = [], cnt = [];
    for (var k = 0; k < NL; k++) { sum.push([0, 0, 0, 0]); cnt.push(0); }
    labeled.forEach(function (r) {
      var f = FEAT[r.i];
      for (var d = 0; d < 4; d++) sum[r.y][d] += f[d];
      cnt[r.y]++;
    });
    return sum.map(function (s, k) {
      if (!cnt[k]) return null;
      return s.map(function (v) { return v / cnt[k]; });
    });
  }

  /* 返回每点的预测类别与"margin"（第一、第二近的差距，越小越不确定） */
  function predictAll(cen) {
    return FEAT.map(function (f) {
      var best = -1, bestD = 1e9, sec = 1e9;
      for (var k = 0; k < NL; k++) {
        if (!cen[k]) continue;
        var d = dist(f, cen[k]);
        if (d < bestD) { sec = bestD; bestD = d; best = k; }
        else if (d < sec) sec = d;
      }
      return { y: best < 0 ? 0 : best, margin: sec - bestD };
    });
  }

  /* 宏平均 F1：按"错位后的深度"对齐比较 —— 迟到时间错了，深度就错了。
     用宏 F1 而不是总准确率：白云岩只占 15%，判错它总准确率只掉 15 个点，
     但对剖面解释来说等于漏掉一套储层。 */
  function score(pred, shiftSamples) {
    var K = NL, tp = new Array(K).fill(0), fp = new Array(K).fill(0), fn = new Array(K).fill(0);
    for (var i = 0; i < NS; i++) {
      var j = i + shiftSamples;
      if (j < 0 || j >= NS) continue;
      var t = SEQ[i], p = pred[j].y;
      if (t === p) tp[t]++;
      else { fp[p]++; fn[t]++; }
    }
    var f = 0, used = 0;
    for (var k = 0; k < K; k++) {
      var den = 2 * tp[k] + fp[k] + fn[k];
      f += den ? 2 * tp[k] / den : 0;
      used++;
    }
    return f / used;
  }

  /* ---------------- 标注策略 ---------------- */
  function pickRandom(ratio, seed) {
    var rnd = mulberry32(seed || 77);
    var n = Math.max(NL, Math.round(NS * ratio));
    var idx = FEAT.map(function (_, i) { return i; });
    for (var i = idx.length - 1; i > 0; i--) {
      var j = Math.floor(rnd() * (i + 1));
      var t = idx[i]; idx[i] = idx[j]; idx[j] = t;
    }
    return idx.slice(0, n).map(function (i) { return { i: i, y: SEQ[i] }; });
  }

  /* 主动学习：从全部样本里挑 margin 最小的（最不确定的），逐批加入 */
  function pickActive(ratio) {
    var n = Math.max(NL, Math.round(NS * ratio));
    var order = FEAT.map(function (_, i) { return i; });
    /* 初始化：最远点采样（不看标签，只在特征空间里铺开）—— 保证稀有类别也能被覆盖 */
    var chosen = [];
    var mean = [0, 0, 0, 0];
    FEAT.forEach(function (f) { for (var d = 0; d < 4; d++) mean[d] += f[d] / NS; });
    var far = 0, fd = -1;
    for (var i0 = 0; i0 < NS; i0++) {
      var dd = dist(FEAT[i0], mean);
      if (dd > fd) { fd = dd; far = i0; }
    }
    chosen.push(far);
    while (chosen.length < Math.min(4, n)) {
      var bi2 = -1, bd2 = -1;
      for (var i1 = 0; i1 < NS; i1++) {
        if (chosen.indexOf(i1) >= 0) continue;
        var m2 = 1e9;
        chosen.forEach(function (c) { var dd2 = dist(FEAT[i1], FEAT[c]); if (dd2 < m2) m2 = dd2; });
        if (m2 > bd2) { bd2 = m2; bi2 = i1; }
      }
      chosen.push(bi2);
    }
    var rest = order.filter(function (i) { return chosen.indexOf(i) < 0; });
    while (chosen.length < n && rest.length) {
      var cen = trainCentroids(chosen.map(function (i) { return { i: i, y: SEQ[i] }; }));
      var pr = predictAll(cen);
      var bi = -1, bm = 1e9;
      for (var r = 0; r < rest.length; r++) {
        var m = pr[rest[r]].margin;
        if (m < bm) { bm = m; bi = r; }
      }
      chosen.push(rest[bi]);
      rest.splice(bi, 1);
    }
    return chosen.slice(0, n).map(function (i) { return { i: i, y: SEQ[i] }; });
  }

  /* 主动学习曲线：标注比例 → 准确率（两种挑法） */
  var RATIOS = [0.02, 0.05, 0.1, 0.15, 0.2, 0.3];
  function learningCurve(shiftSamples) {
    var out = { R: RATIOS, act: [], rnd: [] };
    RATIOS.forEach(function (r) {
      var a = predictAll(trainCentroids(pickActive(r)));
      var b = predictAll(trainCentroids(pickRandom(r, 4242)));
      out.act.push(score(a, shiftSamples || 0));
      out.rnd.push(score(b, shiftSamples || 0));
    });
    return out;
  }

  /* 迟到时间误差（分钟）→ 深度错位（m） */
  function lagShift(minutes) {
    return ROP * minutes / 60;
  }

  var API = {
    LITH: LITH, NL: NL, SEQ: SEQ, FEAT: FEAT, NS: NS, DZ: DZ, BOT: BOT, ROP: ROP, NOISE: NOISE,
    trainCentroids: trainCentroids, predictAll: predictAll, score: score,
    pickActive: pickActive, pickRandom: pickRandom, learningCurve: learningCurve,
    lagShift: lagShift, RATIOS: RATIOS
  };
  if (typeof window !== 'undefined') { window.M1CORE = API; }

  /* =========================================================
     渲染
     ========================================================= */
  var CSS = [
    '.m1{font-size:13px;color:#242b2e;line-height:1.6}',
    '.m1 *{box-sizing:border-box}',
    '.m1-kpi{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-bottom:12px}',
    '.m1-k{background:#faf8f2;border-radius:8px;padding:9px 10px;min-width:0;border:1px solid transparent}',
    '.m1-k .l{font-size:10px;color:#79828a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.m1-k .v{font-family:ui-monospace,monospace;font-size:15px;font-weight:600;margin-top:3px;white-space:nowrap}',
    '.m1-k .v small{font-size:10px;font-weight:400;color:#79828a;margin-left:3px}',
    '.m1-k.sel{border-color:#2f7d6b;background:#f2f7f5}',
    '.m1-k.sel .l{color:#2f7d6b;font-weight:600}',
    '.m1-main{display:flex;gap:16px;align-items:flex-start}',
    '.m1-cv{flex:0 0 400px;width:400px;border:1px solid #e9e4d8;border-radius:8px;overflow:hidden;background:#fff}',
    '.m1-cv canvas{display:block;width:100%;height:auto}',
    '.m1-side{flex:1;min-width:0}',
    '.m1-side .cap{font-size:10.5px;color:#79828a;margin-bottom:3px}',
    '.m1-ctl{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px 16px;margin-top:14px;padding-top:12px;border-top:1px solid #eeeae0}',
    '.m1-c{min-width:0}',
    '.m1-c label{display:flex;justify-content:space-between;font-size:10.5px;color:#5d666d;margin-bottom:2px}',
    '.m1-c label b{font-family:ui-monospace,monospace;color:#242b2e;font-weight:600}',
    '.m1-c input[type=range]{width:100%;height:16px;accent-color:#2f7d6b;margin:0}',
    '.m1-btns{display:flex;gap:5px}',
    '.m1-b{flex:1;font-size:10.5px;padding:4px 6px;border:1px solid #ddd6c6;background:#fff;border-radius:6px;color:#5d666d;cursor:pointer;white-space:nowrap}',
    '.m1-b.on{border-color:#2f7d6b;background:#f2f7f5;color:#2f7d6b;font-weight:600}',
    '.m1-note{margin-top:12px;padding:9px 11px;border-left:3px solid #2f7d6b;background:#f2f7f5;border-radius:0 8px 8px 0;font-size:11.5px;color:#3f6d61}',
    '.m1-note.warn{border-left-color:#b26a39;background:#fbf3ed;color:#8c5340}',
    '.m1-note b{color:inherit}',
    '@media(max-width:760px){.m1-main{flex-direction:column}.m1-cv,.m1-side,.m1-track,.m1-img{flex:none;width:100%;min-width:0;max-width:100%}.m1-main canvas{width:100%!important;height:auto!important}.m1-kpi{grid-template-columns:repeat(2,minmax(0,1fr))}.m1-ctl{grid-template-columns:1fr}.m1-c[style]{grid-column:auto!important}}',
  ].join('\n');

  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }

  function mount(root) {
    if (!root.querySelector('style[data-m1]')) {
      var st = document.createElement('style');
      st.setAttribute('data-m1', '1');
      st.textContent = CSS;
      root.appendChild(st);
    }

    var state = { lag: 0, ratio: 0.1, active: true };
    var cur = null;

    root.appendChild(el('div', 'm1-kpi',
      '<div class="m1-k" id="m1k0"></div><div class="m1-k" id="m1k1"></div>' +
      '<div class="m1-k" id="m1k2"></div><div class="m1-k" id="m1k3"></div>'));

    var main = el('div', 'm1-main');
    main.appendChild(el('div', 'm1-cv', '<canvas id="m1cv"></canvas>'));
    var side = el('div', 'm1-side');
    side.innerHTML = '<div class="cap">标注比例 → 岩性宏 F1（两种挑样本的策略）</div><canvas id="m1ch"></canvas>';
    main.appendChild(side);
    root.appendChild(main);

    var ctl = el('div', 'm1-ctl');
    ctl.innerHTML =
      '<div class="m1-c"><label>迟到时间误差 <b id="m1ll">0 min</b></label><input id="m1sl" type="range" min="0" max="8" step="1" value="0"></div>' +
      '<div class="m1-c"><label>人工标注比例 <b id="m1lr">10%</b></label><input id="m1sr" type="range" min="2" max="30" step="1" value="10"></div>' +
      '<div class="m1-c"><label>挑样本的策略</label><div class="m1-btns">' +
      '<button class="m1-b" data-a="0">随机挑</button><button class="m1-b on" data-a="1">挑最不确定的</button></div></div>';
    root.appendChild(ctl);
    root.appendChild(el('div', 'm1-note', ''));

    var cv = root.querySelector('#m1cv'), ch = root.querySelector('#m1ch');
    var note = root.querySelector('.m1-note');

    function model() {
      var lab = state.active ? pickActive(state.ratio) : pickRandom(state.ratio, 4242);
      var cen = trainCentroids(lab);
      return { pred: predictAll(cen), lab: lab };
    }

    /* ---------- 剖面道 ---------- */
    function paint(pred, lab) {
      var W = 400, H = 430;
      var dpr = 2;
      cv.width = W * dpr; cv.height = H * dpr;
      cv.style.width = W + 'px'; cv.style.height = H + 'px';
      var g = cv.getContext('2d');
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, W, H);

      var y0 = 34, y1 = H - 40;
      var Y = function (d) { return y0 + d / BOT * (y1 - y0); };
      var shiftM = lagShift(state.lag);

      /* 三道：真值 / 识别 / 差值 */
      var TW = 54, GAP = 26;
      var tx = [70, 70 + TW + GAP, 70 + 2 * (TW + GAP)];

      ['真实岩性', '识别结果', '逐点对错'].forEach(function (t, i) {
        g.fillStyle = '#5d666d'; g.font = '9.5px system-ui,sans-serif'; g.textAlign = 'center';
        g.fillText(t, tx[i] + TW / 2, 22);
      });

      for (var i = 0; i < NS; i++) {
        var yy = Y(i * DZ), hh = (y1 - y0) / NS + 0.6;
        /* 真值 */
        g.fillStyle = LITH[SEQ[i]].c; g.globalAlpha = .75;
        g.fillRect(tx[0], yy, TW, hh);
        g.globalAlpha = 1;
        /* 识别（错位后放到 shiftM 以下） */
        var j = i;
        var dPlace = i * DZ + shiftM;
        if (dPlace <= BOT) {
          var yj = Y(dPlace);
          g.fillStyle = LITH[pred[j].y].c; g.globalAlpha = .75;
          g.fillRect(tx[1], yj, TW, Math.min(hh, Math.max(0, y1 - yj + 1)));
          /* 低置信度：margin 小就描红边 */
          if (pred[j].margin < 0.16 && yj < y1) {
            g.fillStyle = 'rgba(192,57,43,.55)';
            g.fillRect(tx[1] + TW - 6, yj, 6, Math.min(hh, y1 - yj + 1));
          }
          g.globalAlpha = 1;
        }
      }

      /* 差值列 */
      g.fillStyle = '#faf8f2';
      g.fillRect(tx[2], y0, TW, y1 - y0);
      for (var k = 0; k < NS; k++) {
        var jj = k + Math.round(shiftM / DZ);
        if (jj < 0 || jj >= NS) continue;
        var ok = pred[jj].y === SEQ[k];
        var yy2 = Y(k * DZ);
        g.fillStyle = ok ? '#2f7d6b' : '#c0392b';
        g.globalAlpha = ok ? 0.13 : 0.5;
        g.fillRect(tx[2], yy2, TW, (y1 - y0) / NS + 0.6);
        g.globalAlpha = 1;
      }
      g.strokeStyle = '#c9c2b0';
      g.strokeRect(tx[2], y0, TW, y1 - y0);

      /* 深度刻度 */
      g.fillStyle = '#9ba3a9'; g.font = '9px ui-monospace,monospace'; g.textAlign = 'right';
      [0, 10, 20, 30, 40, 50, 60].forEach(function (d) {
        g.fillText(d + '', tx[0] - 6, Y(d) + 3);
      });
      g.save(); g.translate(24, (y0 + y1) / 2); g.rotate(-Math.PI / 2);
      g.fillStyle = '#79828a'; g.font = '9.5px system-ui,sans-serif'; g.textAlign = 'center';
      g.fillText('深度 / m', 0, 0); g.restore();

      /* 错位标注 */
      if (shiftM > 0.05) {
        var xa = tx[1] + TW + 6;
        g.strokeStyle = '#c0392b'; g.lineWidth = 1.2; g.setLineDash([4, 3]);
        g.beginPath(); g.moveTo(xa, y0); g.lineTo(xa, y0 + 40); g.stroke();
        g.beginPath(); g.moveTo(xa, Y(shiftM)); g.lineTo(xa, Y(shiftM) + 40); g.stroke();
        g.setLineDash([]);
        g.fillStyle = '#c0392b'; g.font = '9px system-ui,sans-serif'; g.textAlign = 'left';
        g.fillText('↓' + shiftM.toFixed(1) + ' m', xa + 2, y0 + 24);
      }

      /* 图例 */
      g.font = '9px system-ui,sans-serif'; g.textAlign = 'left';
      LITH.forEach(function (L, i) {
        var lx = 12 + i * 74, ly = H - 18;
        g.fillStyle = L.c; g.globalAlpha = .75;
        g.fillRect(lx, ly - 7, 9, 9); g.globalAlpha = 1;
        g.fillStyle = '#79828a'; g.fillText(L.n, lx + 13, ly + 1);
      });
      g.fillStyle = '#c0392b'; g.fillRect(298, H - 25, 6, 9);
      g.fillStyle = '#79828a'; g.fillText('低置信', 308, H - 17);
    }

    /* ---------- 学习曲线 ---------- */
    function paintCurve(lc) {
      var W = 400, H = 312;
      var dpr = 2;
      ch.width = W * dpr; ch.height = H * dpr;
      ch.style.width = W + 'px'; ch.style.height = H + 'px';
      var g = ch.getContext('2d');
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, W, H);

      var x0 = 44, x1 = W - 14, y0 = 30, y1 = H - 64;
      var X = function (r) { return x0 + (r - 0.02) / 0.28 * (x1 - x0); };

      /* 纵轴下限跟着数据走：迟到时间拉大后 F1 会一路掉到 10% 附近，
         写死 0.4 会让曲线跑到轴外。 */
      var all = lc.act.concat(lc.rnd);
      var mn = Math.min.apply(null, all);
      var ymin = Math.max(0, Math.min(0.4, Math.floor((mn - 0.06) * 10) / 10));
      var span = 1 - ymin;
      var steps = [0.1, 0.2, 0.25, 0.5], step = 0.5;
      for (var si = 0; si < steps.length; si++) {
        if (span / steps[si] <= 6) { step = steps[si]; break; }
      }
      var Y = function (a) { return y1 - (a - ymin) / (1 - ymin) * (y1 - y0); };

      for (var ti = 0; ti * step <= span + 1e-9; ti++) {
        var v = ymin + ti * step;
        g.strokeStyle = '#eeeae0'; g.lineWidth = 1;
        g.beginPath(); g.moveTo(x0, Y(v)); g.lineTo(x1, Y(v)); g.stroke();
        g.fillStyle = '#9ba3a9'; g.font = '9px ui-monospace,monospace';
        g.textAlign = 'right'; g.fillText(Math.round(v * 100) + '%', x0 - 5, Y(v) + 3);
      }
      [0.02, 0.05, 0.1, 0.15, 0.2, 0.3].forEach(function (r) {
        g.fillStyle = '#9ba3a9'; g.font = '9px ui-monospace,monospace'; g.textAlign = 'center';
        g.fillText(Math.round(r * 100) + '%', X(r), y1 + 13);
      });

      [['rnd', '#b26a39', '随机挑'], ['act', '#2f7d6b', '挑最不确定的']].forEach(function (se) {
        var isCur = (se[0] === 'act') === state.active;
        g.strokeStyle = se[1]; g.lineWidth = isCur ? 2.4 : 1.5;
        g.globalAlpha = isCur ? 1 : 0.5;
        g.beginPath();
        lc.R.forEach(function (r, i) {
          g.lineTo(X(r), Y(lc[se[0]][i]));
        });
        g.stroke();
        g.globalAlpha = 1;
        lc.R.forEach(function (r, i) {
          g.beginPath(); g.arc(X(r), Y(lc[se[0]][i]), isCur ? 2.4 : 1.6, 0, 7);
          g.fillStyle = se[1]; g.fill();
        });
      });

      g.strokeStyle = '#c9c2b0';
      g.beginPath(); g.moveTo(x0, y1); g.lineTo(x1, y1); g.moveTo(x0, y1); g.lineTo(x0, y0); g.stroke();

      g.fillStyle = '#5d666d'; g.font = '9.5px system-ui,sans-serif'; g.textAlign = 'center';
      g.fillText('人工标注比例', (x0 + x1) / 2, H - 14);
      g.save(); g.translate(13, (y0 + y1) / 2); g.rotate(-Math.PI / 2);
      g.fillText('宏 F1', 0, 0); g.restore();

      g.textAlign = 'left'; g.font = '9px system-ui,sans-serif';
      [['#b26a39', '随机挑'], ['#2f7d6b', '挑最不确定的']].forEach(function (t, i) {
        var lx = x0 + i * 118, ly = 16;
        g.strokeStyle = t[0]; g.lineWidth = 2;
        g.beginPath(); g.moveTo(lx, ly - 3); g.lineTo(lx + 14, ly - 3); g.stroke();
        g.fillStyle = '#79828a'; g.fillText(t[1], lx + 19, ly);
      });

      /* 当前点 */
      var idx = 0, best = 9;
      lc.R.forEach(function (r, i) {
        if (Math.abs(r - state.ratio) < best) { best = Math.abs(r - state.ratio); idx = i; }
      });
      g.strokeStyle = '#79828a'; g.setLineDash([3, 3]); g.lineWidth = 1;
      g.beginPath(); g.moveTo(X(lc.R[idx]), y0); g.lineTo(X(lc.R[idx]), y1); g.stroke();
      g.setLineDash([]);
      return { idx: idx, R: lc.R[idx] };
    }

    function render() {
      var m = model();
      var shiftM = lagShift(state.lag);
      var shS = Math.round(shiftM / DZ);
      var acc = score(m.pred, shS);
      var lc = learningCurve(shS);
      var pt = paintCurve(lc);

      var other = state.active ? lc.rnd : lc.act;
      var mine = state.active ? lc.act : lc.rnd;

      var k = [
        ['岩性宏 F1', (acc * 100).toFixed(1) + '<small>%</small>'],
        ['剖面错位', shiftM.toFixed(1) + '<small>m</small>'],
        ['标注比例', Math.round(state.ratio * 100) + '<small>%</small>'],
        ['同预算下的差距', ((mine[pt.idx] - other[pt.idx]) * 100).toFixed(1) + '<small>个百分点</small>']
      ];
      k.forEach(function (t, i) {
        var box = root.querySelector('#m1k' + i);
        box.className = 'm1-k' + (i === 0 ? ' sel' : '');
        box.innerHTML = '<div class="l">' + t[0] + '</div><div class="v">' + t[1] + '</div>';
      });

      paint(m.pred, m.lab);

      var msg;
      if (shiftM > 0.3) {
        msg = '<b>迟到时间估错 ' + state.lag + ' 分钟，剖面整体错位 ' + shiftM.toFixed(1) + ' m。</b>' +
          '钻速 ' + ROP + ' m/h 时，一分钟就是 ' + lagShift(1).toFixed(1) + ' m —— 而单层厚度经常只有 1—2 m，' +
          '错位 2 m 以上就是把整套层序打乱。判对率从 ' +
          (score(m.pred, 0) * 100).toFixed(1) + '% 掉到 ' + (acc * 100).toFixed(1) + '%，' +
          '不是模型变差了，是<b>它答的那道题本身错了</b>。';
      } else {
        msg = '<b>深度对齐的前提下，判对率 ' + (acc * 100).toFixed(1) + '%。</b>' +
          '用 ' + Math.round(state.ratio * 100) + '% 的人工标注、' +
          (state.active ? '专挑低置信度样本' : '随机挑样本') + '，达到这个数字。' +
          '把"迟到时间误差"拉到 2 分钟以上，就能看到深度错了以后判对率怎么塌。';
      }
      if (state.active && state.ratio <= 0.1) {
        msg += '<br><b>挑样本的策略比标注量更值钱：</b>同样 ' + Math.round(state.ratio * 100) +
          '% 的预算，主动挑能到 ' + (lc.act[pt.idx] * 100).toFixed(1) + '%，随机挑只有 ' +
          (lc.rnd[pt.idx] * 100).toFixed(1) + '%。';
      }
      note.className = 'm1-note' + (shiftM > 0.3 ? ' warn' : '');
      note.innerHTML = msg;
    }

    var sl = root.querySelector('#m1sl'), sr = root.querySelector('#m1sr');
    sl.addEventListener('input', function () {
      state.lag = Number(sl.value);
      root.querySelector('#m1ll').textContent = state.lag + ' min';
      render();
    });
    sr.addEventListener('input', function () {
      state.ratio = Number(sr.value) / 100;
      root.querySelector('#m1lr').textContent = Math.round(state.ratio * 100) + '%';
      render();
    });
    Array.prototype.forEach.call(root.querySelectorAll('[data-a]'), function (b) {
      b.addEventListener('click', function () {
        state.active = b.getAttribute('data-a') === '1';
        Array.prototype.forEach.call(root.querySelectorAll('[data-a]'), function (o) {
          o.classList.toggle('on', o === b);
        });
        render();
      });
    });

    render();
  }

  if (typeof window !== 'undefined') {
    window.M1DEMO = mount;
    window.__CASE_MOUNT__ = mount;
  }
})();
