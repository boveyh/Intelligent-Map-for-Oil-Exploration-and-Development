/* =========================================================
   pr1 · 抽油机井工况智能诊断 —— 案例正文（单一源）
   ---------------------------------------------------------
   正文里每个数字都来自 tools/test-pr1.js 的合成复算输出。
   ========================================================= */

module.exports = function (K) {

  /* 六类工况的合成参数（与 demo/demo.js 的 card() 同源） */
  var KIND = [
    { n: '正常', c: '#2f7d6b', o: { hi: 68, lo: 27, rise: 0.07, fall: 0.93 } },
    { n: '供液不足', c: '#b26a39', o: { hi: 68, lo: 27, rise: 0.26, fall: 0.66, dip: 6 } },
    { n: '气影响', c: '#c9a04a', o: { hi: 62, lo: 20, rise: 0.46, fall: 0.93, slope: -7 } },
    { n: '泵漏失', c: '#7e5a8d', o: { hi: 68, lo: 27, rise: 0.12, fall: 0.93, slope: -13 } },
    { n: '杆断脱', c: '#c0392b', o: { hi: 34, lo: 11, rise: 0.07, fall: 0.93, slope: -3 } },
    { n: '碰泵振动', c: '#4a7a9b', o: { hi: 68, lo: 27, rise: 0.07, fall: 0.93, rip: 7 } }
  ];

  /* 合成特征（tools/test-pr1.js 第 1 节，各 12 张 1.0× 噪声卡均值） */
  var FEAT = [
    { a: 0.89, lr: 2.28, sn: 0.92 },
    { a: 0.52, lr: 1.62, sn: 0.98 },
    { a: 0.54, lr: 1.81, sn: 0.92 },
    { a: 0.76, lr: 2.19, sn: 0.93 },
    { a: 0.48, lr: 2.73, sn: 0.92 },
    { a: 0.89, lr: 2.28, sn: 2.25 }
  ];

  function sm(t) { t = t < 0 ? 0 : t > 1 ? 1 : t; return t * t * (3 - 2 * t); }

  /* 合成一条闭合示功图（上冲程 + 下冲程），不含噪声 */
  function loop(o) {
    var P = [], i, x, y;
    for (i = 0; i <= 60; i++) {
      x = i / 60;
      y = o.lo + (o.hi - o.lo) * sm((x - 0.01) / (o.rise - 0.01));
      if (x > o.fall) y = o.hi + (o.lo - o.hi) * sm((x - o.fall) / (1 - o.fall));
      y += (o.slope || 0) * x;
      if (o.rip) y += o.rip * Math.sin(x * 62) * (0.45 + 0.55 * Math.min(1, Math.max(0, (x - 0.2) / 0.45)));
      P.push([x, y]);
    }
    for (i = 60; i >= 0; i--) {
      x = i / 60;
      y = o.lo;
      if (x > o.fall) y = o.hi + (o.lo - o.hi) * sm((x - o.fall) / (1 - o.fall));
      if (x < 0.06) y = o.lo + (o.dip || 0) * sm(1 - x / 0.06);
      y += (o.slope || 0) * x * 0.35;
      P.push([x, y]);
    }
    return P;
  }

  /* 把曲线映射成 SVG path */
  function path(P, x0, y0, w, h) {
    return P.map(function (p, i) {
      return (i ? 'L' : 'M') + (x0 + p[0] * w).toFixed(1) + ' ' + (y0 + h - p[1] / 80 * h).toFixed(1);
    }).join(' ');
  }

  /* ================= 图 1：六张图里，有两张长得一样 ================= */
  function figSix() {
    var W = 636, H = 402;
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="六类抽油机井工况的地面示功图轮廓对比">';
    s += '<text x="26" y="24" font-size="10.5" font-weight="600" fill="#242b2e">六类工况的地面示功图：五类各有一个"变形的地方"</text>';
    s += '<text x="26" y="40" font-size="8.6" fill="#79828a">横轴 = 冲程比（0—1），纵轴 = 光杆载荷（0—80 kN）；曲线按工况参数合成，角标特征值为合成均值</text>';

    var CW = 186, CH = 134, GX = 26, GY = 54, GAP = 12;
    KIND.forEach(function (k, i) {
      var col = i % 3, row = Math.floor(i / 3);
      var px = GX + col * (CW + GAP), py = GY + row * (CH + 10);
      var base = py + CH - 26, hh = 88;
      var isVib = k.n === '碰泵振动';

      s += '<rect x="' + px + '" y="' + py + '" width="' + CW + '" height="' + CH + '" rx="7" fill="#fbfaf6" stroke="' + (isVib ? '#4a7a9b' : '#e3ddcd') + '" stroke-width="' + (isVib ? 1.3 : 1) + '"/>';
      s += '<text x="' + (px + 10) + '" y="' + (py + 17) + '" font-size="9.6" font-weight="600" fill="' + k.c + '">' + k.n + '</text>';
      s += '<text x="' + (px + CW - 10) + '" y="' + (py + 17) + '" font-size="8" font-family="monospace" fill="#9ba3a9" text-anchor="end">面积比 ' + FEAT[i].a.toFixed(2) + '</text>';

      s += '<line x1="' + (px + 12) + '" y1="' + base + '" x2="' + (px + CW - 12) + '" y2="' + base + '" stroke="#e8e2d4"/>';

      /* 去掉锯齿的包络：只画在振动那一格，用来证明"轮廓没变" */
      if (isVib) {
        var env = JSON.parse(JSON.stringify(k.o));
        delete env.rip;
        s += '<path d="' + path(loop(env), px + 12, base - hh, CW - 24, hh) + '" fill="none" stroke="#4a7a9b" stroke-width="1.7" stroke-dasharray="4 3" stroke-opacity=".5"/>';
      }
      s += '<path d="' + path(loop(k.o), px + 12, base - hh, CW - 24, hh) + '" fill="' + k.c + '" fill-opacity=".07" stroke="' + k.c + '" stroke-width="1.6" stroke-linejoin="round"/>';

      s += '<text x="' + (px + 12) + '" y="' + (py + CH - 9) + '" font-size="7.8" font-family="monospace" fill="#9ba3a9">载荷比 ' + FEAT[i].lr.toFixed(2) + '</text>';
      if (isVib) s += '<text x="' + (px + 96) + '" y="' + (py + CH - 9) + '" font-size="7.8" fill="#4a7a9b">← 与正常一致</text>';
    });

    /* 正常格 → 振动格 的引线 */
    s += '<path d="M' + (GX + 2 * (CW + GAP) + 14) + ' ' + (GY + CH + 10 + 22) + ' Q' + (GX + 2 * (CW + GAP) - 18) + ' ' + (GY + CH + 10 + 62) + ' ' + (GX + 2 * (CW + GAP) - 4) + ' ' + (GY + CH + 10 + 96) + '" fill="none" stroke="#4a7a9b" stroke-width="1" stroke-dasharray="3 3" stroke-opacity=".75"/>';

    s += '<rect x="24" y="336" width="' + (W - 48) + '" height="48" rx="7" fill="#f1f5f8"/>';
    s += '<text x="38" y="355" font-size="8.8" fill="#3d5c70">五类的判据都很硬：面积比 0.48—0.89、载荷比 1.62—2.73、上升滞后 0.06—0.31，各自拧着一个几何量。</text>';
    s += '<text x="38" y="373" font-size="8.8" fill="#3d5c70">只有碰泵振动的面积比 0.89、载荷比 2.28 与正常卡完全一致 —— <tspan font-weight="600">轮廓没变，变的只是曲线上多了一层毛刺。</tspan></text>';

    s += '</svg>';
    return s;
  }

  /* ================= 图 2：轮廓一样，就看轮廓上的毛刺 ================= */
  function figRipple() {
    var W = 636, H = 376;
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="正常卡与碰泵振动卡轮廓重合，差异只在残差波纹上">';
    s += '<text x="26" y="24" font-size="10.5" font-weight="600" fill="#242b2e">轮廓分不开，就把轮廓扣掉，只看剩下的抖动</text>';
    s += '<text x="26" y="40" font-size="8.6" fill="#79828a">同一口井、同一冲次：正常卡（灰）与碰泵卡（蓝）画在一个坐标系里</text>';

    var bx = 314, bw = 292;
    /* ---- ① 叠放 ---- */
    var ax = 34, aw = 254, ab = 168, ah = 94;
    s += '<rect x="24" y="52" width="276" height="134" rx="7" fill="#fbfaf6" stroke="#e3ddcd"/>';
    s += '<text x="' + ax + '" y="68" font-size="8.4" fill="#79828a">① 原始示功图（两条曲线叠在一起）</text>';
    s += '<path d="' + path(loop(KIND[0].o), ax, ab - ah, aw, ah) + '" fill="none" stroke="#8d959b" stroke-width="3.4" stroke-linejoin="round" stroke-opacity=".55"/>';
    s += '<path d="' + path(loop(KIND[5].o), ax, ab - ah, aw, ah) + '" fill="none" stroke="#4a7a9b" stroke-width="1.2" stroke-linejoin="round"/>';
    /* 放大区间标记 + 引到 ② */
    var zl = ax + 0.55 * aw, zr = ax + 0.85 * aw;
    s += '<rect x="' + zl + '" y="' + (ab - ah - 2) + '" width="' + (zr - zl) + '" height="' + (ah - 4) + '" fill="#4a7a9b" fill-opacity=".06" stroke="#4a7a9b" stroke-width=".9" stroke-dasharray="3 2"/>';
    s += '<path d="M' + zr + ' ' + (ab - ah - 2) + ' Q' + (zr + 14) + ' ' + (ab - ah - 14) + ' 310 62" fill="none" stroke="#4a7a9b" stroke-width=".9" stroke-dasharray="3 2" stroke-opacity=".8"/>';
    s += '<text x="' + ax + '" y="' + (ab + 14) + '" font-size="8" fill="#79828a">灰线＝正常卡，蓝线＝碰泵卡；轮廓重合，只是蓝线边缘发毛</text>';

    /* ---- ② 放大 ---- */
    s += '<rect x="314" y="52" width="292" height="134" rx="7" fill="#fbfaf6" stroke="#e3ddcd"/>';
    s += '<text x="' + (bx + 10) + '" y="68" font-size="8.4" fill="#79828a">② 冲程比 0.55—0.85 放大看</text>';
    var zx0 = bx + 12, zw = bw - 24, zc = 118, zk = 4.2;
    s += '<line x1="' + zx0 + '" y1="' + (zc - 7 * zk) + '" x2="' + (zx0 + zw) + '" y2="' + (zc - 7 * zk) + '" stroke="#dfd8c8" stroke-dasharray="3 3"/>';
    s += '<line x1="' + zx0 + '" y1="' + (zc + 7 * zk) + '" x2="' + (zx0 + zw) + '" y2="' + (zc + 7 * zk) + '" stroke="#dfd8c8" stroke-dasharray="3 3"/>';
    var zi, zt, zTrend = [], zReal = [];
    for (zi = 0; zi <= 40; zi++) {
      zt = 0.55 + 0.30 * zi / 40;
      zTrend.push([zi / 40, 0]);
      zReal.push([zi / 40, 7 * Math.sin(zt * 62) * (0.45 + 0.55 * Math.min(1, Math.max(0, (zt - 0.2) / 0.45)))]);
    }
    s += '<path d="' + zTrend.map(function (p, m) { return (m ? 'L' : 'M') + (zx0 + p[0] * zw).toFixed(1) + ' ' + zc; }).join(' ') + '" stroke="#79828a" stroke-width="2.2" fill="none"/>';
    s += '<path d="' + zReal.map(function (p, m) { return (m ? 'L' : 'M') + (zx0 + p[0] * zw).toFixed(1) + ' ' + (zc - p[1] * zk).toFixed(1); }).join(' ') + '" stroke="#4a7a9b" stroke-width="1.5" stroke-linejoin="round" fill="none"/>';
    s += '<text x="' + (zx0 + zw) + '" y="' + (zc - 7 * zk - 4) + '" font-size="7.4" font-family="monospace" fill="#9ba3a9" text-anchor="end">68 + 7 kN</text>';
    s += '<text x="' + (zx0 + zw) + '" y="' + (zc + 7 * zk + 11) + '" font-size="7.4" font-family="monospace" fill="#9ba3a9" text-anchor="end">68 − 7 kN</text>';
    s += '<text x="' + (bx + 10) + '" y="' + (ab + 10) + '" font-size="8" fill="#4a7a9b">灰线是趋势，蓝线是实际 —— 差值才是信号</text>';

    /* ---- ③ 残差 ---- */
    var cx = 34, cw = 566, cyc = 268, cy0 = 224;
    s += '<text x="' + cx + '" y="' + cy0 + '" font-size="8.8" font-weight="600" fill="#242b2e">③ 扣掉 9 点趋势后的残差</text>';
    s += '<rect x="' + cx + '" y="' + (cyc - 15) + '" width="' + cw + '" height="30" fill="#c9c2b0" fill-opacity=".18"/>';
    s += '<line x1="' + cx + '" y1="' + cyc + '" x2="' + (cx + cw) + '" y2="' + cyc + '" stroke="#c9c2b0" stroke-dasharray="3 3"/>';
    s += '<text x="' + (cx + 4) + '" y="' + (cyc - 19) + '" font-size="7.6" fill="#9ba3a9">灰带 = 仪器噪声 ±1σ</text>';

    var np = [], vp = [], j, x;
    for (j = 0; j <= 90; j++) {
      x = j / 90;
      var base0 = Math.sin(x * 41) * 0.35 + Math.sin(x * 17 + 1) * 0.25;
      np.push([x, base0]);
      vp.push([x, base0 + Math.sin(x * 62) * 1.85 * (0.45 + 0.55 * Math.min(1, Math.max(0, (x - 0.2) / 0.45)))]);
    }
    var rmap = function (P, col, w2, op) {
      return '<path d="' + P.map(function (p, m) {
        return (m ? 'L' : 'M') + (cx + p[0] * cw).toFixed(1) + ' ' + (cyc - p[1] * 13).toFixed(1);
      }).join(' ') + '" fill="none" stroke="' + col + '" stroke-width="' + w2 + '" stroke-linejoin="round" stroke-opacity="' + op + '"/>';
    };
    s += rmap(np, '#79828a', 1.6, 0.75);
    s += rmap(vp, '#4a7a9b', 1.6, 1);

    s += '<text x="' + (cx + cw) + '" y="' + cy0 + '" font-size="8" text-anchor="end" fill="#79828a">灰线＝正常卡（待在 ±1σ 带内）　蓝线＝碰泵卡（峰值到 3σ）</text>';

    s += '<rect x="24" y="316" width="' + (W - 48) + '" height="48" rx="7" fill="#eef3f6"/>';
    s += '<text x="38" y="335" font-size="8.8" fill="#3d5c70">所以判据不是"残差有多大"（噪声大残差也大），而是<tspan font-weight="600">"残差比这台仪器平时的噪声大多少倍"</tspan>。</text>';
    s += '<text x="38" y="353" font-size="8.8" fill="#3d5c70">这个比值就是波纹信噪比：1.0× 噪声下正常卡 0.75—1.20、碰泵卡 1.58—2.81，两者完全不重叠。</text>';

    s += '</svg>';
    return s;
  }

  /* ================= 图 3：噪声一抬，可分性先塌 ================= */
  function figNoise() {
    var W = 636, H = 320;
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="正常卡与碰泵卡在三个噪声水平下的波纹信噪比区间">';
    s += '<text x="26" y="24" font-size="10.5" font-weight="600" fill="#242b2e">波纹信噪比的区间：1.0× 时泾渭分明，2.0× 时叠在一起</text>';
    s += '<text x="26" y="40" font-size="8.6" fill="#79828a">每类 40 张卡的合成最小—最大区间；横轴只画到 3.0，正常卡与碰泵卡各三档</text>';

    var x0 = 176, x1 = 520;
    var X = function (v) { return x0 + (v - 0.5) / 2.5 * (x1 - x0); };

    /* 轴 */
    [0.5, 1, 1.5, 2, 2.5, 3].forEach(function (v) {
      s += '<line x1="' + X(v) + '" y1="62" x2="' + X(v) + '" y2="232" stroke="#efeade"/>';
      s += '<text x="' + X(v) + '" y="248" font-size="7.6" font-family="monospace" fill="#9ba3a9" text-anchor="middle">' + v.toFixed(1) + '</text>';
    });

    var GRP = [
      { n: '正常井', c: '#2f7d6b', rows: [['1.0×', 0.75, 1.20], ['1.5×', 0.68, 1.15], ['2.0×', 0.65, 1.29]] },
      { n: '碰泵振动井', c: '#4a7a9b', rows: [['1.0×', 1.58, 2.81], ['1.5×', 1.14, 2.07], ['2.0×', 0.95, 1.57]] }
    ];
    var ys = [76, 102, 128, 168, 194, 220];
    var ri = 0;
    GRP.forEach(function (g, gi) {
      s += '<text x="26" y="' + (gi === 0 ? 70 : 162) + '" font-size="9" font-weight="600" fill="' + g.c + '">' + g.n + '</text>';
      g.rows.forEach(function (r) {
        var y = ys[ri++];
        s += '<text x="' + (x0 - 10) + '" y="' + (y + 9) + '" font-size="8" font-family="monospace" fill="#9ba3a9" text-anchor="end">' + r[0] + '</text>';
        s += '<rect x="' + X(r[1]) + '" y="' + (y - 2) + '" width="' + Math.max(3, X(r[2]) - X(r[1])) + '" height="14" rx="7" fill="' + g.c + '" fill-opacity=".16"/>';
        s += '<line x1="' + X(r[1]) + '" y1="' + (y + 5) + '" x2="' + X(r[2]) + '" y2="' + (y + 5) + '" stroke="' + g.c + '" stroke-width="2.4" stroke-linecap="round"/>';
        s += '<circle cx="' + X(r[1]) + '" cy="' + (y + 5) + '" r="3.2" fill="#fff" stroke="' + g.c + '" stroke-width="1.6"/>';
        s += '<circle cx="' + X(r[2]) + '" cy="' + (y + 5) + '" r="3.2" fill="#fff" stroke="' + g.c + '" stroke-width="1.6"/>';
        s += '<text x="' + (X(r[2]) + 9) + '" y="' + (y + 9) + '" font-size="7.6" font-family="monospace" fill="' + g.c + '">' + r[1].toFixed(2) + '—' + r[2].toFixed(2) + '</text>';
      });
    });

    s += '<rect x="24" y="262" width="' + (W - 48) + '" height="46" rx="7" fill="#fbf3ed"/>';
    s += '<text x="38" y="281" font-size="8.8" fill="#8c5340">碰泵卡的区间从 1.58—2.81 一路滑到 0.95—1.57；正常卡几乎不动（0.75→0.65、1.20→1.29）。</text>';
    s += '<text x="38" y="299" font-size="8.8" fill="#8c5340"><tspan font-weight="600">噪声 2.0× 时两者完全重叠</tspan> —— 它最先崩，因为六类里只有它靠这一维区分。</text>';

    s += '</svg>';
    return s;
  }

  /* ================= 图 4：混淆矩阵 + 断崖 ================= */
  function figConfuse() {
    var W = 636, H = 336;
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="六类工况混淆矩阵与碰泵振动召回率随噪声的衰减">';
    s += '<text x="26" y="24" font-size="10.5" font-weight="600" fill="#242b2e">总体准确率 99.4% → 78.3%，落差几乎全由碰泵振动一个类贡献</text>';
    s += '<text x="26" y="40" font-size="8.6" fill="#79828a">左：噪声 1.0× 的混淆矩阵（每类 30 张，共 180 张）；右：两类判对率随噪声的走势</text>';

    /* ---------- 左：混淆矩阵 ---------- */
    var M = [
      [30, 0, 0, 0, 0, 0],
      [0, 30, 0, 0, 0, 0],
      [0, 0, 30, 0, 0, 0],
      [1, 0, 0, 29, 0, 0],
      [0, 0, 0, 0, 30, 0],
      [0, 0, 0, 0, 0, 30]
    ];
    var mx = 92, my = 74, cg = 20;
    s += '<text x="' + mx + '" y="56" font-size="8.2" fill="#79828a">噪声 1.0×：180 张只错 1 张</text>';
    for (var c = 0; c < 6; c++) {
      s += '<rect x="' + (mx + c * cg + 5) + '" y="64" width="9" height="4" rx="2" fill="' + KIND[c].c + '"/>';
    }
    for (var i = 0; i < 6; i++) {
      for (var j = 0; j < 6; j++) {
        var v = M[i][j], on = i === j;
        s += '<rect x="' + (mx + j * cg) + '" y="' + (my + i * cg) + '" width="' + (cg - 1.5) + '" height="' + (cg - 1.5) + '" rx="2" fill="' + (v ? (on ? '#2f7d6b' : '#c0392b') : '#f4f1e8') + '" fill-opacity="' + (v ? 0.85 : 1) + '"/>';
        if (v) s += '<text x="' + (mx + j * cg + cg / 2 - 0.7) + '" y="' + (my + i * cg + 14) + '" font-size="7.6" font-family="monospace" fill="#fff" text-anchor="middle">' + v + '</text>';
      }
      s += '<text x="' + (mx - 7) + '" y="' + (my + i * cg + 14) + '" font-size="7.6" fill="' + KIND[i].c + '" text-anchor="end">' + KIND[i].n + '</text>';
    }
    s += '<text x="' + (mx + cg * 6 - 6) + '" y="' + (my + cg * 6 + 14) + '" font-size="7.6" fill="#c0392b" text-anchor="end">唯一 1 张错：泵漏失 → 正常</text>';

    /* ---------- 右：两条走势线 ---------- */
    var gx0 = 322, gx1 = 566, gy0 = 246, gy1 = 82;
    var GY = function (v) { return gy0 - v / 100 * (gy0 - gy1); };
    var gxs = [352, 444, 536];
    [0, 50, 100].forEach(function (v) {
      s += '<line x1="' + gx0 + '" y1="' + GY(v) + '" x2="' + gx1 + '" y2="' + GY(v) + '" stroke="#efeade"/>';
      s += '<text x="' + (gx0 - 8) + '" y="' + (GY(v) + 3) + '" font-size="7.2" font-family="monospace" fill="#9ba3a9" text-anchor="end">' + v + '%</text>';
    });
    ['1.0×', '1.5×', '2.0×'].forEach(function (t, i) {
      s += '<text x="' + gxs[i] + '" y="' + (gy0 + 14) + '" font-size="7.6" font-family="monospace" fill="#79828a" text-anchor="middle">' + t + '</text>';
    });
    s += '<text x="' + ((gx0 + gx1) / 2) + '" y="' + (gy0 + 28) + '" font-size="7.6" fill="#9ba3a9" text-anchor="middle">测井噪声</text>';

    var VIB = [100, 30.0, 6.7], OTH = [99.3, 95.3, 92.7];
    var mk = function (arr, col, w2) {
      var d = arr.map(function (v, i) { return (i ? 'L' : 'M') + gxs[i] + ' ' + GY(v).toFixed(1); }).join(' ');
      var o = '<path d="' + d + '" fill="none" stroke="' + col + '" stroke-width="' + w2 + '" stroke-linejoin="round"/>';
      arr.forEach(function (v, i) {
        o += '<circle cx="' + gxs[i] + '" cy="' + GY(v).toFixed(1) + '" r="3.4" fill="#fff" stroke="' + col + '" stroke-width="2"/>';
      });
      return o;
    };
    s += mk(OTH, '#2f7d6b', 1.8);
    s += mk(VIB, '#4a7a9b', 2.2);

    s += '<text x="' + (gxs[2] + 10) + '" y="' + (GY(6.7) + 4) + '" font-size="7.8" font-family="monospace" fill="#4a7a9b">6.7%</text>';
    s += '<text x="' + (gxs[0] + 9) + '" y="' + (GY(100) + 16) + '" font-size="7.8" font-family="monospace" fill="#4a7a9b">100%</text>';
    s += '<text x="' + (gxs[1]) + '" y="' + (GY(30) + 15) + '" font-size="7.8" font-family="monospace" fill="#4a7a9b" text-anchor="middle">30.0%</text>';
    s += '<text x="' + (gxs[2] + 10) + '" y="' + (GY(92.7) + 4) + '" font-size="7.8" font-family="monospace" fill="#2f7d6b">92.7%</text>';
    s += '<text x="' + (gxs[1] + 10) + '" y="' + (GY(95.3) - 11) + '" font-size="7.6" fill="#2f7d6b">其余五类平均</text>';
    s += '<text x="' + (gxs[1] + 4) + '" y="' + (GY(30) - 22) + '" font-size="7.8" fill="#4a7a9b" font-weight="600">碰泵振动</text>';

    s += '<rect x="24" y="282" width="' + (W - 48) + '" height="42" rx="7" fill="#eef3f6"/>';
    s += '<text x="38" y="300" font-size="8.8" fill="#3d5c70">其余五类从 1.0× 到 2.0× 只掉 6.6 个百分点，碰泵振动掉了 93.3 个点 —— 判错的 28 张卡全部被写成"正常"。</text>';
    s += '<text x="38" y="317" font-size="8.8" fill="#3d5c70">所以按总准确率验收没用：<tspan font-weight="600">一台"78% 准确"的诊断器，可能恰好把最该报的那个工况全漏掉。</tspan></text>';

    s += '</svg>';
    return s;
  }

  /* ================= 数据清单 ================= */
  var DATA = [
    ['地面示功图', '每冲次 96 点（位移 / 载荷）', '主输入；位移与载荷必须标定过零点'],
    ['冲次与泵径', '冲次 /min、泵径 mm、泵深 m', '把面积换算成泵功、把载荷折算成理论值'],
    ['日产液量与含水', '计量间日报', '判断"供液不足"是否成立的外部佐证'],
    ['电流 / 功率曲线', '电机电流、有功功率', '区分"泵的问题"和"电机的问题"'],
    ['历史作业记录', '检泵、换泵、碰泵、洗井', '标签来源；也是标定图版的依据']
  ];

  return {

    id: 'pr1-dynamometer',
    sceneId: 'pr1',
    title: '抽油机井工况诊断',
    summary: '用标定样本的特征距离识别工况，验证波纹信息的贡献与失效',
    status: 'ready',
    version: '1.0.0',
    updated: '2026-11-01',
    methods: ['ts'],

    tabs: {
      background: {
        label: '专业背景',

        judge: [
          { label: '任务类型', value: '单卡分类', desc: '一个冲次一张示功图', html: '<span style="color:var(--c-ts)">曲线形态 + 残差</span>' },
          { label: '数据门槛', value: '每类 12 张图版', desc: '六类共 72 张卡即可起判' },
          { label: '收益', value: '碰泵振动 100% 识别', desc: '噪声 2.0× 时降到 6.7%', html: '<b style="color:var(--jade-d);font-family:var(--mono)">但会先崩</b>' },
          { label: '难度', value: '中', desc: '难在"两类图长得一样"，不在算法', html: K.dtag('中') }
        ],

        lede: '抽油机井一天要出几百张地面示功图：横轴是光杆位移，纵轴是光杆载荷，一个冲次画成一个闭合的"鞋底"。泵供液不足、气体影响、泵漏失、杆断脱、碰泵 —— 每一种故障都会把这只鞋底捏成不同的形状，所以老采油工看图就能判断。但有一类故障<b>不改轮廓</b>：碰泵时柱塞撞到泵筒，整条曲线上只是多了一层细密的锯齿，面积、载荷、斜率全都跟正常井一模一样。',

        sections: [
          {
            no: 1, en: 'PROBLEM', title: '五类看形状，一类只能看毛刺',
            html: '<p>示功图诊断之所以能成立，是因为<b>每个故障都在图上留下一个可量化的几何变形</b>：供液不足时泵筒没充满，上冲程载荷提前爬到顶、下冲程又提前掉下来，围出的面积从 0.89 缩到 0.52；气影响时气体在泵筒里膨胀，上冲程后半段载荷被"顶"着往下走；泵漏失时固定阀关不严，载荷一路下滑，最低载荷从 27 掉到 13.6；杆断脱最直接，整条曲线掉到 34 以下。</p>' +
              '<p>这些都能用四五个数说清楚：面积比、最大/最小载荷、载荷比、上冲程后半段的斜率、载荷爬到 75% 处的冲程比。<b>碰泵振动是个例外</b>：柱塞撞到泵筒只是让载荷在一个平均值上下快速抖动，抖动的均值为零，所以面积不变、极值基本不变、斜率也不变。</p>' +
              K.figure(figSix(), 1, '六类工况的示功图轮廓。前五类各有一个"变形的地方"，可以直接量出来。**碰泵振动（右下，蓝框）的面积比 0.89、载荷比 2.28，跟正常卡完全一致** —— 虚线圈出的包络就是它去掉锯齿后的轮廓，和左上角的正常卡几乎重合。只看形状，这两个类在特征空间里是同一个点。') +
              '<p>这就是这类案例的真正难点。它不是"分类器不够强"：把七维特征全喂进去，1.0× 噪声下准确率 99.4%，但只要<b>去掉波纹那一维</b>，立刻掉到 90.0% —— 掉的 9.4 个百分点，全是碰泵被认成了正常（或反过来）。剩下的六个维度加起来，对这两个类完全无能为力。</p>'
          },
          {
            no: 2, en: 'INTERVENTION', title: '把轮廓扣掉，剩下的才是信息',
            html: '<p>既然差异藏在"轮廓之上的抖动"里，那就先用一条平滑曲线把轮廓拟出来、做差，再看残差。这条残差里只有两样东西：仪器噪声，和真实的机械振动。<b>它们的区别不在幅度大小，而在有没有超出这台仪器的噪声水平</b>。</p>' +
              '<p>于是判据写成一个比值：<b>波纹信噪比 = 残差 RMS ÷ 噪声标准差</b>。噪声标准差不是猜的，从曲线自己的二阶差分里用中位绝对偏差（MAD）估出来 —— 二阶差分把缓慢的轮廓变化滤掉、只留高频抖动，取中位数又不被少数几个振尖带跑。正常卡的比值永远在 1 附近（残差就是噪声本身），碰泵卡随振动幅度线性上升。</p>' +
              K.figure(figRipple(), 2, '第①格：两条曲线叠在一起，肉眼分不出。第②格：把冲程比 0.55—0.85 放大 6 倍，才看见蓝线在灰线上来回抖。第③格：扣掉 9 点趋势后的残差 —— 正常卡（灰）基本待在 ±1σ 的噪声带里，碰泵卡（蓝）的峰值能到 3σ。**注意这不是"残差大就是故障"：把测井噪声调大，正常卡的残差也会变大，但比值不动。**') +
              '<p>去趋势的窗口长度是个容易被忽略的细节：锯齿周期大约 10 个采样点，如果按惯例用 5 点滑动平均，等于拿一个和锯齿同宽的窗口去平滑它，<b>振动会被抹掉一半</b>。改成 9 点之后，1.0× 噪声下碰泵卡的波纹信噪比从 1.5 抬到 1.58—2.81，与正常卡的 0.75—1.20 彻底分开。</p>' +
              K.callout('这条案例最值得记住的一句：**当两个类在现有特征上重合时，先问"是不是量错了维度"，而不是"是不是模型不够深"。** 碰泵的振动在原始曲线上是存在的，只是被"面积、极值、斜率"这几个统计量平均掉了 —— 换成"残差对噪声的比值"，同一个信号立刻可分。特征工程的本质是选一个能让差异不被平均掉的统计量。')
          },
          {
            no: 3, en: 'DATA', title: '你需要准备什么',
            html: '<p style="margin-bottom:14px">示功图数据不缺，缺的是<b>标定和标签</b>：位移传感器和载荷传感器的零点必须校过，否则整张图会整体平移；标签要从作业记录里对，不能靠"看图猜"。</p>' +
              K.checklist(DATA) +
              '<p style="margin-top:18px"><span class="kicker plain" style="color:var(--ink-4)">可参考的公开数据集</span></p>' +
              K.refs(['示功图工况诊断的公开教学图版', '抽油机井系统效率测试报告中的典型图例', '各油田采油厂工况诊断规范（图版分类）'], null)
          },
          {
            no: 4, en: 'DIFFICULTY', title: '技术难度与参考方向',
            html: '<div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-bottom:2px">' +
              K.dtag('中') + '<span class="small muted">分类器是最近质心，二十行代码；难在"知道精度会从哪里塌"。</span></div>' +
              K.meter('中') +
              '<p>整体准确率 99.4% 听起来可以交付了。但把这台仪器放到噪声更大的井上 —— 比如传感器老化、杆柱结蜡导致载荷波动变大 —— 总准确率掉到 78.3%，看起来"还能用"，实际上<b>碰泵振动只剩 6.7%</b>（30 张里认出 2 张）。此时共有 39 张错卡，不能只凭总分宣称模型仍然可用；尤其要核查被判成"正常"。</p>' +
              K.figure(figNoise(), 3, '波纹信噪比的类间分布。1.0× 噪声时正常类挤在 0.65—1.35、碰泵振动独占 1.58—2.81；**噪声抬到 2.0× 时振动区间滑到 0.95—1.57，完全埋进正常类里**。其余五类的区间几乎不动 —— 因为它们靠的是几何量，几何量对噪声不敏感。') +
              '<p>这带来一个必须写进交付说明的结论：<b>用总体准确率验收工况诊断模型是不安全的</b>。要在验收指标里单独列出"碰泵振动的召回率"，并给出它随噪声衰减的曲线 —— 因为这是唯一一个"漏了就等于没做"的工况：碰泵会直接损坏泵和杆柱，而它被判成"正常"时不会有任何异常报警。</p>' +
              '<p style="margin-top:18px"><span class="kicker plain" style="color:var(--ink-4)">可借鉴的通用技术</span></p>' +
              K.refs(['信号去趋势与残差分析', '噪声自适应的信噪比指标（MAD 估计）', '原型 / 最近质心分类', '按类别分别验收与单点证据分析'], '#/method/ts') +
              '<p style="margin-top:18px" class="small muted">交叉环节：<a href="#/stage/production" style="color:var(--jade-d);font-weight:600">采油（举升）</a> · <a href="#/stage/welllog" style="color:var(--jade-d);font-weight:600">测井</a> · <a href="#/stage/completion" style="color:var(--jade-d);font-weight:600">完井</a></p>'
          }
        ]
      },

      workflow: {
        label: '案例流程',
        title: '案例：一口井 180 张示功图的工况诊断',
        lead: [
          '六类工况各 30 张，共 180 张独立合成测试卡；每张上、下冲程各 97 点。每类另取 12 张带噪合成卡形成特征质心；标定与批量测试的随机种子分开。',
          '整条链路的成败不在分类器，而在**波纹信噪比这一维**。去掉它，准确率从 99.4% 掉到 90.0%；加上它，碰泵振动在 1.0× 噪声下 30 张全对。'
        ],
        stats: [
          ['样本量', '6 类 × 30 张 = 180 张', true], ['单卡采样', '96 点 / 冲次'],
          ['特征维度', '几何 6 维 + 波纹 1 维', true], ['图版标定', '每类 12 张（噪声 1.0×）'],
          ['七维全用', '99.4%（1.0×）'], ['去掉波纹维', '90.0%（1.0×）', true]
        ],
        steps: [
          {
            name: '数据清洗与归一', role: '质控',
            do: '位移、载荷两路信号先过零点标定；剔除停抽、间抽和传感器掉线的冲次；把每张卡重采样到固定 96 点，载荷归一到 0—100 kN，位移归一到 0—1 冲程比。',
            effect: '让不同井、不同泵径的卡能放在同一个特征空间里比',
            trap: '载荷零点偏 3 kN，最小载荷就全错，供液不足会成批误判'
          },
          {
            name: '几何特征提取', role: '基线',
            do: '量四个量：闭合面积比（形状代理）、最大/最小载荷、载荷比、上冲程后半段漏失斜率、载荷爬到 75% 处的冲程比。这六维足以分开供液不足、气影响、泵漏失、杆断脱。',
            effect: '1.0× 噪声下这六维能到 90.0%',
            trap: '以为 90% 就够 —— 误判增加后仍需逐类查看，尤其检查振动与正常的混淆'
          },
          {
            name: '残差波纹特征', role: '算法核心',
            do: '对上冲程中段（冲程比 0.15—0.90）做 9 点滑动平均，逐点做差得到残差；再用二阶差分的中位绝对偏差估出这台仪器的噪声标准差 σ，两者相除得到波纹信噪比。',
            effect: '正常卡 0.75—1.20、碰泵卡 1.58—2.81，1.0× 噪声下完全不重叠',
            trap: '按惯例用 5 点窗口去趋势 —— 锯齿周期也是 10 点上下，会把要测的信号一起抹掉'
          },
          {
            name: '图版标定 + 最近质心分类', role: '算法核心',
            do: '六类各取 12 张合成标定卡（噪声 1.0×）求七维特征均值；新卡计算到六个质心的欧氏距离，选最近类别。距离 softmax 只形成相对匹配分数，未校准为正确概率。',
            effect: '1.0× 噪声下 99.4%（180 张错 1 张）',
            trap: '拿"无噪声的理想曲线"当图版：实测卡的光滑度天然比理想曲线差，波纹维会稳定偏 0.9，被系统性地推向振动类'
          },
          {
            name: '证据对照与人工复核', role: '闭环',
            do: '在同一张卡上开关波纹特征，检查各维平方距离项、最近与次近类别；同时看 180 张独立合成测试卡的准确率及振动召回。结合原始曲线与连续冲次复核，未设置自动维修或概率阈值处置流程。',
            effect: '提供可追查的特征与类别分歧，支持人工复核',
            trap: '只看总体准确率验收：2.0× 噪声下总准确率还有 78.3%，但碰泵只剩 6.7%，报表上看不出问题'
          }
        ],

        metrics: {
          title: '怎么算"诊断对了"',
          html: '<p>用<b>总体准确率</b>看大盘，但验收必须<b>按类别分别看</b>，尤其是碰泵振动。这两个数字在同一批数据上会讲出完全不同的故事：2.0× 噪声下总体 78.3% 还算"能用"，而碰泵振动只有 6.7% —— 30 张里认出 2 张，其余 28 张被错分为"正常"。</p>' +
            K.figure(figConfuse(), 4, '左：1.0× 噪声下的混淆矩阵，180 张只错 1 张（一张泵漏失被判成正常），对角线上全是满分。右：三档噪声下各类的判对率 —— 其余五类从 1.0× 到 2.0× 只掉 0—16.7 个百分点，**碰泵振动从 100% 掉到 30.0% 再掉到 6.7%**。总准确率那 21 个百分点的落差，主要来自振动类别的漏检。') +
            K.dtable(['特征组合', '1.0× 准确率', '相对七维全用', '说明'], [
              ['七维全用（几何 6 + 波纹 1）', '99.4%', '—', '180 张错 1 张'],
              ['去掉波纹信噪比', '90.0%', '-9.4 pp', '碰泵与正常互相误判'],
              ['去掉面积比', '98.3%', '-1.1 pp', '面积这一维部分被载荷比替代'],
              ['去掉载荷比', '99.4%', '0 pp', '与面积比信息重叠'],
              ['去掉漏失斜率', '100.0%', '+0.6 pp', '这一维在模板均值化后反而带噪'],
              ['去掉上升滞后', '99.4%', '0 pp', '与面积比重叠']
            ]) +
            '<p style="margin-top:12px" class="small muted">噪声 1.0×、每类 30 张；消融实验见 <code>tools/test-pr1.js</code> 第 5 节。注意"去掉漏失斜率"后准确率反而升到 100% —— 七维并非每一维都有贡献，这是特征工程里常见但常被忽略的事实。</p>'
        },

        fails: [
          { name: '把碰泵振动判成正常', why: '这是本案例的核心失败模式，也是危害最大的一种。碰泵时柱塞撞击泵筒，会加速泵阀和杆柱损坏；但它的示功图轮廓与正常井一致（面积比都是 0.89、载荷比都是 2.28），只有残差里多一层锯齿。噪声 2.0× 时，30 张碰泵卡有 26 张被判成"正常"——现场不会收到任何报警。' },
          { name: '用 5 点滑动平均去趋势', why: '锯齿周期约 10 个采样点，5 点窗口只比半个周期略长，平滑时会把一半的振动能量一起抹掉 —— 1.0× 噪声下碰泵卡的波纹信噪比被压到 1.5，与正常卡的上界 1.20 只差 0.3，噪声稍大就混在一起。改成 9 点窗口后区间拉开到 1.58—2.81。' },
          { name: '拿"理想曲线"当图版', why: '用无噪声的合成曲线做六类质心，看起来干净，实际上引入了一个系统偏差：实测卡因为带噪声，波纹信噪比天然在 0.9 左右，而理想曲线的值是 0，这一维会稳定偏出 0.9，把正常卡往振动类推。改用每类 12 张 1.0× 噪声卡的均值后，准确率从 26.7% 回到 99.4%。' },
          { name: '只看总体准确率', why: '2.0× 噪声下总体 78.3%，读报表很容易得出"精度可以接受"的结论。但拆开看，其余五类都在 80% 以上，只有碰泵振动 6.7%。验收指标里不单列这一类，就等于放弃了这个工况 —— 而它是六类里唯一一个"漏报即等于没做"的类别。' }
        ]
      },

      demo: {
        label: '可运行示范',
        intro: '选择工况和采集噪声，在同一张合成卡上开关波纹特征。对照七维/六维的判断、180 张测试卡成绩和振动召回，再查看实际平方距离项。单张结果不保证总会变化；改变噪声时固定随机模板，换卡按钮才改变样本。',
        height: 812
      }
    },

    demoGlobal: 'PR1DEMO'
  };
};
