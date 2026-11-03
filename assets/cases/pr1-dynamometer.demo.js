/* =========================================================
   pr1 · 抽油机井工况诊断 —— 可运行示范（自包含，无外部依赖）
   ---------------------------------------------------------
   演示三件事：
     ① 合成示功图的几何和波纹特征作为分类输入；
     ② 六类工况的图形差异有几何意义（充满度、载荷比、斜率、波纹）；
     ③ 距离相似度未校准为正确概率；同卡消融与独立合成测试共同验证。
   纯函数导出到 window.PR1CORE，供 tools/test-pr1.js 在 Node 里复算。
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
  function smooth(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }

  /* 六类工况 */
  var KIND = [
    { n: '正常', k: 'ok', c: '#2f7d6b' },
    { n: '供液不足', k: 'starve', c: '#b26a39' },
    { n: '气影响', k: 'gas', c: '#c9a04a' },
    { n: '泵漏失', k: 'leak', c: '#7e5a8d' },
    { n: '杆断脱', k: 'broken', c: '#c0392b' },
    { n: '碰泵振动', k: 'vib', c: '#4a7a9b' }
  ];
  var NK = KIND.length;
  var NP = 96;             /* 每冲程 96 个间隔，含端点共 97 点 */

  /* ---------------- 示功图合成 ----------------
     x：位移 0—1（冲程比）
     y：光杆载荷 0—100 kN
     上冲程走 x 0→1，下冲程走 x 1→0，闭合。 */
  function card(kind, noise, seed) {
    var rnd = mulberry32(seed || 7);
    var o = { hi: 68, lo: 27, riseEnd: 0.07, fallStart: 0.93, hiSlope: 0, loDip: 0, rip: 0, ripAt: 0.6 };

    if (kind === 'starve') { o.riseEnd = 0.26; o.fallStart = 0.66; o.loDip = 6; }
    else if (kind === 'gas') { o.riseEnd = 0.46; o.hi = 62; o.hiSlope = -7; }
    else if (kind === 'leak') { o.hiSlope = -13; o.riseEnd = 0.12; }
    else if (kind === 'broken') { o.hi = 34; o.lo = 11; o.hiSlope = -3; }
    else if (kind === 'vib') { o.rip = 7; o.ripAt = 0.20; }

    var pts = [];
    var i;
    /* 上冲程 */
    for (i = 0; i <= NP; i++) {
      var x = i / NP;
      var up = o.lo + (o.hi - o.lo) * smooth((x - 0.01) / (o.riseEnd - 0.01));
      if (x > o.fallStart) up = o.hi + (o.lo - o.hi) * smooth((x - o.fallStart) / (1 - o.fallStart));
      up += o.hiSlope * x;
      /* 碰泵振动：机械抖动不挑冲程，整个上冲程都在抖，只是后段被泵阀撞击放大 */
      if (o.rip && x > 0.02) {
        var env = 0.45 + 0.55 * Math.min(1, Math.max(0, (x - o.ripAt) / 0.45));
        up += o.rip * Math.sin(x * 62) * env;
      }
      pts.push({ x: x, y: up, s: 0 });
    }
    /* 下冲程 */
    for (i = NP; i >= 0; i--) {
      var x2 = i / NP;
      var dn = o.lo;
      if (x2 > o.fallStart) dn = o.hi + (o.lo - o.hi) * smooth((x2 - o.fallStart) / (1 - o.fallStart));
      if (x2 < 0.06) dn = o.lo + o.loDip * smooth(1 - x2 / 0.06);
      dn += o.hiSlope * x2 * 0.35;
      pts.push({ x: x2, y: dn, s: 1 });
    }
    /* 噪声 */
    var s = noise == null ? 1 : noise;
    pts.forEach(function (p) {
      p.y = clamp(p.y + gauss(rnd) * 1.6 * s, 0, 100);
      p.x = clamp(p.x + gauss(rnd) * 0.004 * s, 0, 1);
    });
    return pts;
  }

  /* ---------------- 特征 ---------------- */
  /* 噪声标准差估计：二阶差分的中位绝对偏差（MAD）。
     白噪声过二阶差分 x[i+1]-2x[i]+x[i-1] 方差翻 √6 倍，所以除回去；
     用中位数而不是 RMS，是为了不被少数几个振尖带跑。 */
  function noiseSigma(up) {
    var d = [], i;
    for (i = 1; i < up.length - 1; i++) d.push(up[i + 1].y - 2 * up[i].y + up[i - 1].y);
    if (d.length < 8) return 1;
    var s = d.slice().sort(function (a, b) { return a - b; });
    var med = s[Math.floor(s.length / 2)];
    var ad = d.map(function (v) { return Math.abs(v - med); }).sort(function (a, b) { return a - b; });
    var mad = ad[Math.floor(ad.length / 2)];
    return Math.max(0.25, mad * 1.4826 / Math.sqrt(6));
  }

  function feats(pts) {
    var n = pts.length, area = 0, hi = -1e9, lo = 1e9;
    for (var i = 0; i < n; i++) {
      var a = pts[i], b = pts[(i + 1) % n];
      area += a.x * b.y - b.x * a.y;
      if (a.y > hi) hi = a.y;
      if (a.y < lo) lo = a.y;
    }
    area = Math.abs(area) / 2;

    /* 上冲程按 x 排序，后面的形状特征都在这条上量 */
    var up = pts.filter(function (p) { return p.s === 0; })
      .slice().sort(function (p, q) { return p.x - q.x; });

    var su = 0, sd = 0, cd = 0;
    up.forEach(function (p) { su += p.y; });
    pts.forEach(function (p) { if (p.s === 1) { sd += p.y; cd++; } });
    var mu = su / up.length, md = sd / cd;

    /* 面积比：以"正常工况满载"的理论面积 41（kN·冲程比）为分母 */
    var areaRatio = area / 41;

    /* 波纹信噪比：先用 9 点滑动平均把"上冲程确实在加载"这个大趋势扣掉，
       残差里剩下的要么是仪器噪声，要么是碰泵引起的周期性锯齿。
       两者靠"幅度是否超出仪器噪声水平"来分 —— 所以指标是
       残差 RMS ÷ 噪声标准差（≈1 就是纯噪声，>1.5 就有额外振动）。
       只取中段（x 0.15—0.90），避开上冲程两端的加减载折角。
       窗口取 9 点而不是 5 点：锯齿周期约 10 个采样点，5 点平均会把它压掉一半。 */
    var mid = up.filter(function (p) { return p.x > 0.15 && p.x < 0.90; });
    var res = [], re2 = 0;
    for (var j = 4; j < mid.length - 4; j++) {
      var ma = 0;
      for (var q = -4; q <= 4; q++) ma += mid[j + q].y;
      ma /= 9;
      var r0 = mid[j].y - ma;
      res.push(r0);
      re2 += r0 * r0;
    }
    var rms = res.length > 6 ? Math.sqrt(re2 / res.length) : 0;
    var rip = rms / noiseSigma(up);

    /* 上升滞后：上冲程载荷爬到 75% 处对应的冲程比 */
    var thr = lo + 0.75 * (hi - lo), riseX = 1;
    for (var k = 0; k < up.length; k++) {
      if (up[k].y >= thr) { riseX = up[k].x; break; }
    }

    /* 漏失斜率：上冲程中点到最后 10% 的载荷变化 */
    var yMid = 0, yEnd = 0;
    up.forEach(function (p) {
      if (p.x > 0.45 && p.x < 0.55) yMid = p.y;
      if (p.x > 0.85 && p.x < 0.95) yEnd = p.y;
    });

    return {
      areaRatio: areaRatio,
      hi: hi, lo: lo,
      loadRatio: mu / Math.max(md, 1),
      drop: yEnd - yMid,
      rip: rip,
      riseX: riseX,
      fill: clamp((md - lo) / Math.max(hi - lo, 1), 0, 2)
    };
  }

  /* 特征向量：做尺度归一，避免某一维压过其它 */
  function vec(f) {
    return [
      f.areaRatio,                 /* 泵功 */
      f.hi / 100,                  /* 载荷水平 */
      f.lo / 100,
      (f.loadRatio - 2.2) / 1.5,   /* 载荷比 */
      f.drop / 40,                 /* 上冲程后半段掉载 */
      f.riseX,                     /* 上升滞后 */
      f.rip - 1                    /* 波纹信噪比：1 = 纯噪声 */
    ];
  }

  /* ---------------- 模板匹配 ----------------
     每类取 12 张 1.0× 噪声的合成卡求特征质心。
     新卡按最近质心归类；距离 softmax 只作相对匹配分数。 */
  var TPL_N = 12;
  function templates() {
    return KIND.map(function (k) {
      var acc = null;
      for (var t = 0; t < TPL_N; t++) {
        var f = feats(card(k.k, 1, 500 + t * 37));
        if (!acc) {
          acc = {};
          for (var key in f) acc[key] = 0;
        }
        for (var k2 in f) acc[k2] += f[k2] / TPL_N;
      }
      return acc;
    });
  }
  /* 距离：keep 为要参与计算的维度下标（缺省全部参与）。
     用它做"去掉某一维会掉多少"的消融实验。 */
  function dist(v, w, keep) {
    var s = 0;
    var idx = keep || v.map(function (_, i) { return i; });
    for (var i = 0; i < idx.length; i++) {
      var j = idx[i];
      s += (v[j] - w[j]) * (v[j] - w[j]);
    }
    return Math.sqrt(s);
  }
  function classify(pts, tpl, keep) {
    var f = feats(pts), v = vec(f);
    var d = tpl.map(function (t) { return dist(v, vec(t), keep); });
    var mn = Math.min.apply(null, d);
    var ex = d.map(function (x) { return Math.exp(-(x - mn) * 6); });
    var sum = ex.reduce(function (a, b) { return a + b; }, 0);
    var p = ex.map(function (x) { return x / sum; });
    var best = 0;
    for (var i = 1; i < p.length; i++) if (p[i] > p[best]) best = i;
    var contributions = tpl.map(function (t) {
      var w = vec(t);
      return v.map(function (x, j) { return keep && keep.indexOf(j) < 0 ? 0 : (x - w[j]) * (x - w[j]); });
    });
    return { d: d, p: p, best: best, f: f, contributions: contributions };
  }

  /* ---------------- 批量评测 ---------------- */
  function evaluate(noise, per, keep) {
    var tpl = templates();
    var m = [];
    for (var i = 0; i < NK; i++) m.push(new Array(NK).fill(0));
    var total = 0, hit = 0;
    for (var k = 0; k < NK; k++) {
      for (var t = 0; t < per; t++) {
        var pts = card(KIND[k].k, noise, 1000 + k * 97 + t * 13);
        var r = classify(pts, tpl, keep);
        m[k][r.best]++;
        total++;
        if (r.best === k) hit++;
      }
    }
    return { m: m, acc: hit / total, n: total };
  }

  var API = {
    KIND: KIND, NK: NK, NP: NP,
    card: card, feats: feats, vec: vec, templates: templates, classify: classify, evaluate: evaluate
  };
  if (typeof window !== 'undefined') { window.PR1CORE = API; }

  /* =========================================================
     渲染
     ========================================================= */
  var CSS = [
    '.pr{font-size:13px;color:#242b2e;line-height:1.6}',
    '.pr *{box-sizing:border-box}',
    '.pr-kpi{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-bottom:12px}',
    '.pr-k{background:#faf8f2;border-radius:8px;padding:9px 10px;min-width:0;border:1px solid transparent}',
    '.pr-k .l{font-size:10px;color:#79828a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.pr-k .v{font-family:ui-monospace,monospace;font-size:15px;font-weight:600;margin-top:3px;white-space:nowrap}',
    '.pr-k .v small{font-size:10px;font-weight:400;color:#79828a;margin-left:3px}',
    '.pr-k.sel{border-color:#2f7d6b;background:#f2f7f5}',
    '.pr-k.sel .l{color:#2f7d6b;font-weight:600}',
    '.pr-main{display:flex;gap:16px;align-items:flex-start}',
    '.pr-cv{flex:0 0 400px;width:400px;border:1px solid #e9e4d8;border-radius:8px;overflow:hidden;background:#fff}',
    '.pr-cv canvas{display:block;width:100%;height:auto}',
    '.pr-side{flex:1;min-width:0}',
    '.pr-side .cap{font-size:10.5px;color:#79828a;margin-bottom:3px}',
    '.pr-ctl{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px 14px;margin-top:14px;padding-top:12px;border-top:1px solid #eeeae0}',
    '.pr-c{min-width:0}',
    '.pr-c label{display:flex;justify-content:space-between;font-size:10.5px;color:#5d666d;margin-bottom:2px}',
    '.pr-c label b{font-family:ui-monospace,monospace;color:#242b2e;font-weight:600}',
    '.pr-c input[type=range]{width:100%;height:16px;accent-color:#2f7d6b;margin:0}',
    '.pr-btns{display:grid;grid-template-columns:repeat(3,1fr);gap:4px}',
    '.pr-b{font-size:10px;padding:3px 4px;border:1px solid #ddd6c6;background:#fff;border-radius:6px;color:#5d666d;cursor:pointer;white-space:nowrap}',
    '.pr-b.on{border-color:#2f7d6b;background:#f2f7f5;color:#2f7d6b;font-weight:600}',
    '.pr-note{margin-top:12px;padding:9px 11px;border-left:3px solid #2f7d6b;background:#f2f7f5;border-radius:0 8px 8px 0;font-size:11.5px;color:#3f6d61}',
    '.pr-note.warn{border-left-color:#b26a39;background:#fbf3ed;color:#8c5340}',
    '.pr-note b{color:inherit}',
    '.pr-evidence{margin-top:20px;padding:16px;border:1px solid #ddd7c8;border-radius:12px;background:#fcfbf7}',
    '.pr-evidence h3{font-size:16px;margin:0 0 8px}.pr-evidence p{font-size:12px;color:#5d666d;margin:8px 0}',
    '.pr-options{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:12px}.pr-options label{cursor:pointer}.pr-options input{accent-color:#2f7d6b}',
    '.pr-options button{padding:6px 10px;border:1px solid #c8cebf;border-radius:6px;background:white;color:#275b4e;cursor:pointer}',
    '.pr-compare{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.pr-compare>div{padding:12px;border:1px solid #deded2;border-radius:8px;background:#fff}.pr-compare strong{display:block;font-size:19px;margin:4px 0;color:#235f51}.pr-compare small{display:block;color:#68726e;line-height:1.7}',
    '.pr-feat{display:grid;grid-template-columns:minmax(90px,1.2fr) minmax(48px,.7fr) minmax(48px,.7fr) minmax(80px,1.4fr);gap:8px;align-items:center;padding:7px 0;border-bottom:1px solid #e9e4d8;font-size:11px}.pr-feat span{min-width:0}.pr-feat.head{color:#68726e;font-size:10px}.pr-feat.off{opacity:.5}.pr-distance{display:flex;align-items:center;gap:6px;font-family:ui-monospace,monospace}.pr-distance i{display:block;height:6px;min-width:0;background:#2f7d6b;border-radius:2px}',
    '.pr-routing{padding:10px;background:#edf4ef;border-left:3px solid #2f7d6b;margin-top:12px;font-size:12px}',
    '@media(max-width:760px){.pr-main{flex-direction:column}.pr-cv,.pr-side,.pr-track,.pr-img{flex:none;width:100%;min-width:0;max-width:100%}.pr-main canvas{width:100%!important;height:auto!important}.pr-kpi{grid-template-columns:repeat(2,minmax(0,1fr))}.pr-ctl{grid-template-columns:1fr}.pr-c[style]{grid-column:auto!important}}',
  ].join('\n');

  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }

  function mount(root) {
    if (!root.querySelector('style[data-pr]')) {
      var st = document.createElement('style');
      st.setAttribute('data-pr', '1');
      st.textContent = CSS;
      root.appendChild(st);
    }

    var state = { kind: 'vib', noise: 1, seed: 1234, useRipple: true };
    var tpl = templates();
    var batchCache = null;
    var geometric = [0, 1, 2, 3, 4, 5];
    var featureNames = ['面积比', '最大载荷 / 100', '最小载荷 / 100', '载荷比（缩放）', '掉载（缩放）', '上升滞后', '波纹 SNR − 1'];

    root.appendChild(el('div', 'pr-kpi',
      '<div class="pr-k" id="prk0"></div><div class="pr-k" id="prk1"></div>' +
      '<div class="pr-k" id="prk2"></div><div class="pr-k" id="prk3"></div>'));

    var main = el('div', 'pr-main');
    main.appendChild(el('div', 'pr-cv', '<canvas id="prcv"></canvas>'));
    var side = el('div', 'pr-side');
    side.innerHTML = '<div class="cap">六类形状示意（虚线）与当前合成卡（实线）；百分比是距离相似度</div><canvas id="prtip"></canvas>';
    main.appendChild(side);
    root.appendChild(main);

    var ctl = el('div', 'pr-ctl');
    var btns = KIND.map(function (k) {
      return '<button type="button" aria-pressed="' + (k.k === state.kind) + '" class="pr-b' + (k.k === state.kind ? ' on' : '') + '" data-k="' + k.k + '">' + k.n + '</button>';
    }).join('');
    ctl.innerHTML =
      '<div class="pr-c" style="grid-column:span 2"><label>工况（合成卡片的真实类型）</label><div class="pr-btns">' + btns + '</div></div>' +
      '<div class="pr-c"><label for="prsn">采集噪声 <b id="prln">1.0×</b></label><input id="prsn" type="range" min="0" max="200" step="10" value="100"></div>';
    root.appendChild(ctl);
    root.appendChild(el('section', 'pr-evidence', '<h3>波纹特征怎样改变诊断？</h3>' +
      '<div class="pr-options"><label><input type="checkbox" id="prwave" checked> 使用波纹特征</label><button type="button" id="prnext">换一张合成卡</button><button type="button" id="prdiff">查看方法分歧卡</button></div>' +
      '<p>同一张卡同时计算七维与六维结果。关掉波纹只移除一个距离维度，输入曲线、样本和其余计算保持一致。</p>' +
      '<div id="prcompare" class="pr-compare" aria-live="polite"></div><div id="prfeatures"></div><div id="prroute" class="pr-routing" aria-live="polite"></div>'));
    root.appendChild(el('div', 'pr-note', ''));

    var cv = root.querySelector('#prcv'), tp = root.querySelector('#prtip');
    var note = root.querySelector('.pr-note');

    /* ---------- 左：示功图 ---------- */
    function paintCard(pts, res) {
      var W = 400, H = 440, dpr = 2;
      cv.width = W * dpr; cv.height = H * dpr;
      cv.style.width = W + 'px'; cv.style.height = H + 'px';
      var g = cv.getContext('2d');
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, W, H);

      var x0 = 56, x1 = W - 26, y0 = 44, y1 = H - 56;
      var X = function (v) { return x0 + v * (x1 - x0); };
      var Y = function (v) { return y1 - v / 100 * (y1 - y0); };

      g.fillStyle = '#242b2e'; g.font = '10px system-ui,sans-serif'; g.textAlign = 'left';
      g.fillText('示功图（光杆载荷 — 位移）', 14, 24);

      [0, 25, 50, 75, 100].forEach(function (v) {
        g.strokeStyle = '#f0ece2'; g.lineWidth = 1;
        g.beginPath(); g.moveTo(x0, Y(v)); g.lineTo(x1, Y(v)); g.stroke();
        g.fillStyle = '#9ba3a9'; g.font = '8.5px ui-monospace,monospace'; g.textAlign = 'right';
        g.fillText(v, x0 - 6, Y(v) + 3);
      });
      [0, 0.25, 0.5, 0.75, 1].forEach(function (v) {
        g.fillStyle = '#9ba3a9'; g.font = '8.5px ui-monospace,monospace'; g.textAlign = 'center';
        g.fillText(v.toFixed(2), X(v), y1 + 14);
      });
      g.strokeStyle = '#c9c2b0';
      g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0, y1); g.lineTo(x1, y1); g.stroke();
      g.fillStyle = '#79828a'; g.font = '9px system-ui,sans-serif';
      g.textAlign = 'center'; g.fillText('冲程比', (x0 + x1) / 2, y1 + 30);
      g.save(); g.translate(18, (y0 + y1) / 2); g.rotate(-Math.PI / 2);
      g.fillText('载荷 / kN', 0, 0); g.restore();

      /* 面积填充 */
      g.beginPath();
      pts.forEach(function (p, i) { if (i === 0) g.moveTo(X(p.x), Y(p.y)); else g.lineTo(X(p.x), Y(p.y)); });
      g.closePath();
      g.fillStyle = KIND[res.best].c; g.globalAlpha = .1; g.fill();
      g.globalAlpha = 1;

      /* 图版虚线 */
      var t = card(KIND[res.best].k, 0, 11);
      g.strokeStyle = '#b0a89a'; g.lineWidth = 1.2; g.setLineDash([4, 3]);
      g.beginPath();
      t.forEach(function (p, i) { if (i === 0) g.moveTo(X(p.x), Y(p.y)); else g.lineTo(X(p.x), Y(p.y)); });
      g.closePath(); g.stroke(); g.setLineDash([]);

      /* 实测曲线 */
      g.strokeStyle = KIND[res.best].c; g.lineWidth = 1.8; g.beginPath();
      pts.forEach(function (p, i) { if (i === 0) g.moveTo(X(p.x), Y(p.y)); else g.lineTo(X(p.x), Y(p.y)); });
      g.closePath(); g.stroke();

      /* 标注：上冲程 / 下冲程 */
      g.fillStyle = '#79828a'; g.font = '8.5px system-ui,sans-serif'; g.textAlign = 'center';
      g.fillText('上冲程', X(0.5), Y(74));
      g.fillText('下冲程', X(0.5), Y(20));

      /* 图例 */
      g.textAlign = 'left'; g.font = '9px system-ui,sans-serif';
      g.strokeStyle = KIND[res.best].c; g.lineWidth = 1.8;
      g.beginPath(); g.moveTo(16, H - 18); g.lineTo(34, H - 18); g.stroke();
      g.fillStyle = '#79828a'; g.fillText('合成卡', 38, H - 15);
      g.strokeStyle = '#b0a89a'; g.setLineDash([4, 3]); g.lineWidth = 1.2;
      g.beginPath(); g.moveTo(84, H - 18); g.lineTo(102, H - 18); g.stroke(); g.setLineDash([]);
      g.fillText('类别形状示意', 106, H - 15);
    }

    /* ---------- 右：六类图版对照 ---------- */
    function paintTips(pts, res) {
      var W = 400, H = 310, dpr = 2;
      tp.width = W * dpr; tp.height = H * dpr;
      tp.style.width = W + 'px'; tp.style.height = H + 'px';
      var g = tp.getContext('2d');
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, W, H);

      var cw = 128, chh = 122;
      KIND.forEach(function (K2, i) {
        var ox = 12 + (i % 3) * 128, oy = 14 + Math.floor(i / 3) * 148;
        var x0 = ox + 8, x1 = ox + cw - 14, y0 = oy + 22, y1 = oy + chh - 26;
        var X = function (v) { return x0 + v * (x1 - x0); };
        var Y = function (v) { return y1 - v / 100 * (y1 - y0); };
        var isBest = i === res.best;

        g.fillStyle = isBest ? '#f2f7f5' : '#fbfaf5';
        g.strokeStyle = isBest ? '#2f7d6b' : '#e9e4d8';
        g.lineWidth = isBest ? 1.4 : 1;
        g.beginPath();
        g.rect(ox, oy, cw, chh);
        g.fill(); g.stroke();

        /* 图版 */
        var t = card(K2.k, 0, 11);
        g.strokeStyle = isBest ? '#8b9188' : '#c9c2b0';
        g.lineWidth = 1; g.setLineDash([3, 2]);
        g.beginPath();
        t.forEach(function (p, j) { if (j === 0) g.moveTo(X(p.x), Y(p.y)); else g.lineTo(X(p.x), Y(p.y)); });
        g.closePath(); g.stroke(); g.setLineDash([]);

        /* 实测 */
        g.strokeStyle = K2.c; g.lineWidth = 1.3; g.globalAlpha = isBest ? 1 : .55;
        g.beginPath();
        pts.forEach(function (p, j) { if (j === 0) g.moveTo(X(p.x), Y(p.y)); else g.lineTo(X(p.x), Y(p.y)); });
        g.closePath(); g.stroke(); g.globalAlpha = 1;

        /* 标题与概率 */
        g.fillStyle = isBest ? '#2f7d6b' : '#5d666d';
        g.font = (isBest ? '600 ' : '') + '9.5px system-ui,sans-serif';
        g.textAlign = 'left';
        g.fillText(K2.n, ox + 8, oy + 13);

        g.textAlign = 'right';
        g.fillStyle = isBest ? '#2f7d6b' : '#9ba3a9';
        g.font = '9px ui-monospace,monospace';
        g.fillText((res.p[i] * 100).toFixed(0) + '%', ox + cw - 8, oy + 13);

        /* 概率条 */
        g.fillStyle = '#eeeae0';
        g.fillRect(ox + 8, oy + chh - 16, cw - 20, 4);
        g.fillStyle = K2.c;
        g.fillRect(ox + 8, oy + chh - 16, (cw - 20) * clamp(res.p[i], 0, 1), 4);
      });
    }

    function render() {
      var pts = card(state.kind, state.noise, state.seed);
      var full = classify(pts, tpl), noRipple = classify(pts, tpl, geometric);
      var res = state.useRipple ? full : noRipple;
      var f = res.f;

      var k = [
        ['判定工况', KIND[res.best].n, 1],
        ['距离相似度（未校准）', (res.p[res.best] * 100).toFixed(0) + '<small>%</small>', 0],
        ['波纹信噪比', f.rip.toFixed(2), 0],
        ['示功图面积比', f.areaRatio.toFixed(2), 0]
      ];
      k.forEach(function (t, i) {
        var box = root.querySelector('#prk' + i);
        box.className = 'pr-k' + (i === 0 ? ' sel' : '');
        box.innerHTML = '<div class="l">' + t[0] + '</div><div class="v">' + t[1] + '</div>';
      });

      paintCard(pts, res);
      paintTips(pts, res);

      if (!batchCache || batchCache.noise !== state.noise) {
        batchCache = { noise: state.noise, full: evaluate(state.noise, 30), noRipple: evaluate(state.noise, 30, geometric) };
      }
      root.querySelector('#prcompare').innerHTML = [[full, batchCache.full, '七维：几何 + 波纹'], [noRipple, batchCache.noRipple, '六维：去掉波纹']].map(function (entry) {
        var result = entry[0], batch = entry[1], vibRow = batch.m[5];
        return '<div><span>' + entry[2] + '</span><strong>' + KIND[result.best].n + '</strong><small>当前卡：最近质心距离 ' + result.d[result.best].toFixed(3) + '</small>' +
          '<small>独立合成测试：' + (batch.acc * 100).toFixed(1) + '% · ' + batch.n + ' 张</small><small>碰泵振动召回：' + vibRow[5] + '/30（' + (vibRow[5] / 30 * 100).toFixed(1) + '%）</small></div>';
      }).join('');
      var input = vec(f), center = vec(tpl[res.best]), terms = res.contributions[res.best];
      var maxTerm = Math.max.apply(null, terms.concat([0.00001]));
      root.querySelector('#prfeatures').innerHTML = '<p><b>当前采用' + (state.useRipple ? '七' : '六') + '维结果 · 与“' + KIND[res.best].n + '”质心比较</b> · 卡片种子 ' + state.seed + '</p>' +
        '<div class="pr-feat head"><span>模型特征</span><span>当前卡</span><span>质心</span><span>平方距离项</span></div>' +
        featureNames.map(function (name, j) { return '<div class="pr-feat' + (!state.useRipple && j === 6 ? ' off' : '') + '"><span>' + name + '</span><span>' + input[j].toFixed(3) + '</span><span>' + center[j].toFixed(3) + '</span><span class="pr-distance"><i style="width:' + (terms[j] / maxTerm * 55).toFixed(1) + '%"></i>' + (!state.useRipple && j === 6 ? '未参与' : terms[j].toFixed(4)) + '</span></div>'; }).join('') +
        '<p>各项相加为 ' + terms.reduce(function (a, b) { return a + b; }, 0).toFixed(4) + '，开平方得到距离 ' + res.d[res.best].toFixed(3) + '。条长只比较本卡各项；质心来自每类 12 张带噪合成标定卡。</p>';
      var ranked = res.d.map(function (d, i) { return {d:d, i:i}; }).sort(function (a, b) { return a.d - b.d; });
      root.querySelector('#prroute').textContent = '复核线索：最近类别为' + KIND[ranked[0].i].n + '，次近为' + KIND[ranked[1].i].n + '，距离差 ' + (ranked[1].d - ranked[0].d).toFixed(3) + '。' +
        (full.best !== noRipple.best ? '移除波纹后判断发生变化，优先核查原始波纹及采集质量。' : '两种特征组合本卡判断一致，还需结合连续冲次与原始记录确认。') + '该线索不读取合成真值，不自动形成停井或维修指令。';

      var truth = KIND.filter(function (x) { return x.k === state.kind; })[0].n;
      var right = KIND[res.best].n === truth;
      var msg;
      if (right) {
        msg = '事后评价：合成标签与当前判定一致，均为<b>' + KIND[res.best].n + '</b>。距离相似度 ' + (res.p[res.best] * 100).toFixed(0) +
          '% 未校准为正确概率。单张判对还需结合上方 180 张独立合成卡的测试结果判断。';
      } else {
        msg = '判错了：真实工况是<b>' + truth + '</b>，判成了 <b>' + KIND[res.best].n + '</b>。' +
          '当前仅采用' + (state.useRipple ? '七' : '六') + '维特征；查看上方距离项，比较增加波纹信息或降低噪声后是否改善。真值只参与此处评价。';
      }
      note.className = 'pr-note' + (right ? '' : ' warn');
      note.innerHTML = msg;
    }

    var sn = root.querySelector('#prsn');
    sn.addEventListener('input', function () {
      state.noise = Number(sn.value) / 100;
      root.querySelector('#prln').textContent = state.noise.toFixed(1) + '×';
      render();
    });
    Array.prototype.forEach.call(root.querySelectorAll('[data-k]'), function (b) {
      b.addEventListener('click', function () {
        state.kind = b.getAttribute('data-k');
        Array.prototype.forEach.call(root.querySelectorAll('[data-k]'), function (o) {
          o.classList.toggle('on', o === b);
          o.setAttribute('aria-pressed', String(o === b));
        });
        render();
      });
    });

    root.querySelector('#prwave').addEventListener('change', function (e) { state.useRipple = e.target.checked; render(); });
    root.querySelector('#prnext').addEventListener('click', function () { state.seed += 13; render(); });
    root.querySelector('#prdiff').addEventListener('click', function () {
      var index = KIND.map(function (k) { return k.k; }).indexOf(state.kind);
      for (var t = 0; t < 30; t++) {
        var seed = 1000 + index * 97 + t * 13, pts = card(state.kind, state.noise, seed);
        if (classify(pts, tpl).best !== classify(pts, tpl, geometric).best) { state.seed = seed; render(); return; }
      }
      root.querySelector('#prroute').textContent = '当前工况的 30 张测试卡中，两种特征组合没有判断分歧。可切换工况或噪声再比较；分歧卡按两种预测选择，不使用真值筛选。';
    });

    render();
  }

  if (typeof window !== 'undefined') {
    window.PR1DEMO = mount;
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
      box.innerHTML='<summary><b>生成器敏感性自审 · '+esc(audit.metric)+' · 全部设置</b></summary><p>'+esc(audit.limits)+'</p><div style="overflow:auto"><table style="width:100%;font-size:11px;text-align:left"><thead><tr><th>扰动 / 设置</th><th>基线</th><th>学习</th><th>附加对照</th></tr></thead><tbody>'+audit.series.map(function(s){return '<tr><td>'+esc(s.axis)+' / '+esc(s.value)+'</td><td>'+s.baseline.toFixed(3)+'</td><td>'+s.learn.toFixed(3)+'</td><td>'+esc(s.denOnly!=null?'DEN 回归 '+s.denOnly.toFixed(3):s.grOnly!=null?'GR KNN '+s.grOnly.toFixed(3):s.coverage!=null?'区间覆盖 '+s.coverage.toFixed(3):'—')+'</td></tr>';}).join('')+'</tbody></table></div>'+(audit.heldout?'<p>95% 配对 bootstrap：学习−基线 F1 差区间 ['+audit.heldout.pairedDifference.map(function(v){return v.toFixed(3);}).join(', ')+']。以井/图为单位，冻结训练集；不覆盖真实井分布的不确定性。</p>':'')+'<p>2026-11-03 · 合成条件自审，未做第三方物理校准；全部种子和逐样本见公开审计文件，包内仅嵌入汇总。</p>';
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
})(window,"PR1DEMO",{"name":"七维特征的最近质心工况分类","input":"合成示功图＋六类已标定工况样本","operation":"提取形状与波纹特征 → 标准化距离 → 最近类别","why":"相近轮廓还可能在残差波纹上不同，补充特征能提供振动线索。但噪声也会制造波纹，因此新增特征并非总有收益，距离相似度也不是正确概率。","try":"同一张卡开关波纹特征，追查实际距离项；再提高噪声，结合 180 张测试卡看振动召回的变化。","selector":".pr-kpi"},function installTrace(root, body, mounted, guideSteps) {
  if (!mounted || !mounted.trace) return {refresh:function(){},unmount:function(){}};
  var api=mounted.trace, doc=root.ownerDocument, panel=doc.createElement('section');
  panel.className='oil-trace';panel.setAttribute('aria-label','单点可追查证据');
  panel.innerHTML='<style>.oil-trace,.oil-guide{font:12px/1.8 system-ui,sans-serif;color:#34433a;border:1px solid #d3dfd5;background:#fbfcf8;border-radius:9px;padding:14px;margin:16px 0;scroll-margin-top:190px}.oil-trace *,.oil-guide *{box-sizing:border-box}.oil-trace h3{font-size:16px;margin:0 0 5px}.oil-trace-controls{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:10px 0}.oil-trace label{display:grid;gap:4px;min-width:150px;flex:1}.oil-trace input{width:100%;min-width:0;accent-color:#2f7d6b}.oil-trace button,.oil-guide button{padding:6px 10px;background:#fff;border:1px solid #a8bdb0;color:#235f51;border-radius:5px;cursor:pointer;font:inherit}.oil-trace-grid{display:grid;grid-template-columns:1fr 1.5fr;gap:14px}.oil-trace dl{margin:0}.oil-trace dl>div{display:grid;grid-template-columns:minmax(90px,1fr) minmax(0,2fr);border-bottom:1px solid #e4e8dc;padding:5px 0;gap:8px}.oil-trace dt,.oil-trace dd{margin:0;overflow-wrap:anywhere}.oil-trace-summary{padding:10px;background:#edf4ed;border-radius:5px}.oil-trace small{display:block;color:#607465}.oil-guide{display:flex;gap:10px;align-items:center;flex-wrap:wrap;background:#eff5ec}.oil-guide p{flex:1;min-width:160px;margin:0!important;font-size:12px!important}.oil-guide-target{outline:3px solid #b08850!important;outline-offset:5px;scroll-margin-top:110px}.oil-trace :focus-visible,.oil-guide :focus-visible{outline:3px solid #2f7d6b;outline-offset:3px}@media(max-width:650px){.oil-trace-grid{grid-template-columns:1fr}.oil-trace{padding:10px}.oil-trace-controls{display:grid;grid-template-columns:minmax(0,1fr)}.oil-trace label{min-width:0}}</style><h3>追查这一个判断</h3><small data-trace-role></small><div class="oil-trace-controls"><label>深度 / 候选点 <input type="range" data-trace-point aria-label="单点证据的深度或候选点"></label><label><span data-trace-control-label>输入试算</span><input type="range" value="0" data-trace-delta aria-label="单点输入偏移"></label><button type="button" data-trace-reset>恢复原输入</button><button type="button" data-trace-export>导出本点证据</button><button type="button" data-trace-worst>定位回归误差最大点</button></div><p class="oil-trace-summary" data-trace-summary tabindex="-1" role="status" aria-live="polite" aria-atomic="true"></p><div class="oil-trace-grid"><div><b>实际输入</b><dl data-trace-inputs></dl></div><div><b>真实中间量</b><dl data-trace-steps></dl></div></div><small data-trace-note></small>';
  root.appendChild(panel);
  var point=panel.querySelector('[data-trace-point]'),delta=panel.querySelector('[data-trace-delta]'),lastIndex=null;
  function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');}
  function fmt(v){return typeof v==='number'?Number(v.toFixed(5)):String(v).replace(/-?\d+\.\d{6,}/g,function(n){return Number(Number(n).toFixed(5));});}
  function rows(values){return values.map(function(v){return '<div><dt>'+esc(v[0])+'</dt><dd>'+esc(fmt(v[1]))+(v[2]?' '+esc(v[2]):'')+'</dd></div>';}).join('');}
  function refresh(){
    var range=api.range();point.min=range.min;point.max=range.max;point.value=range.value;
    if(range.value!==lastIndex){delta.value=0;lastIndex=range.value;}
    var record=api.read(Number(delta.value)||0);
    if(!record){panel.querySelector('[data-trace-summary]').textContent='当前没有可追查的候选；这是候选生成的失效边界。';return;}
    var c=record.control;delta.min=c.min;delta.max=c.max;delta.step=c.step;
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
  var worst=panel.querySelector('[data-trace-worst]');worst.hidden=!api.worst;
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
