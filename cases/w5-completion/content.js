/* =========================================================
   w5 · 测井缺失段智能补全 —— 案例正文（单一源）
   ---------------------------------------------------------
   正文里出现的每个数字都来自 tools/test-w5.js 的实测输出。
   ========================================================= */

module.exports = function (K) {

  /* ================= 图 1：缺失不是随机的 ================= */
  function figBias() {
    var W = 636, H = 250;
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="井壁坍塌导致密度曲线在砂岩段失效，缺失点显著偏向砂岩，丢弃后净毛比系统性偏低">';

    /* ---- 左：井径 + 密度道 ---- */
    var X0 = 30, X1 = 300, Y0 = 26, Y1 = 232;
    var Y = function (d) { return Y0 + d / 62 * (Y1 - Y0); };
    var GX0 = 74, GX1 = 176;      /* 井径道 */
    var DX0 = 196, DX1 = 296;     /* 密度道 */
    var CX = function (v) { return GX0 + (v - 6) / 18 * (GX1 - GX0); };
    var DENX = function (v) { return DX0 + (v - 2.2) / 0.5 * (DX1 - DX0); };

    /* 地层：泥岩/砂岩/泥岩/砂岩/泥岩/灰岩 */
    var B = [
      { a: 0, b: 8, l: 'sh', gr: 105, den: 2.60 },
      { a: 8, b: 15, l: 'ss', gr: 42, den: 2.33 },
      { a: 15, b: 24, l: 'sh', gr: 104, den: 2.59 },
      { a: 24, b: 36, l: 'ss', gr: 40, den: 2.31 },
      { a: 36, b: 44, l: 'sh', gr: 106, den: 2.61 },
      { a: 44, b: 62, l: 'li', gr: 24, den: 2.58 }
    ];
    var LC = { sh: '#8b8878', ss: '#d9b45c', li: '#7d9cbd' };
    var LN = { sh: '泥岩', ss: '砂岩', li: '灰岩' };

    /* 岩性条 */
    B.forEach(function (b) {
      s += '<rect x="' + (X0) + '" y="' + Y(b.a) + '" width="30" height="' + (Y(b.b) - Y(b.a)) +
        '" fill="' + LC[b.l] + '" fill-opacity=".45" stroke="#fff"/>';
      s += '<text x="' + (X0 + 15) + '" y="' + ((Y(b.a) + Y(b.b)) / 2 + 3) + '" font-size="8" fill="#5d666d" text-anchor="middle">' + LN[b.l] + '</text>';
    });

    /* 井径曲线：砂岩段扩径 */
    var calPts = [];
    for (var d = 0; d <= 62; d += 0.5) {
      var cal = 8.6;
      B.forEach(function (b) {
        if (d > b.a + 0.6 && d < b.b - 0.6 && b.l === 'ss') cal = 15.6;
      });
      calPts.push(CX(cal).toFixed(1) + ',' + Y(d).toFixed(1));
    }
    s += '<polyline points="' + calPts.join(' ') + '" fill="none" stroke="#c0392b" stroke-width="1.5"/>';
    s += '<line x1="' + CX(12.5) + '" y1="' + Y0 + '" x2="' + CX(12.5) + '" y2="' + Y1 + '" stroke="#b26a39" stroke-width="1" stroke-dasharray="4 3"/>';
    s += '<text x="' + CX(12.5) + '" y="' + (Y0 - 8) + '" font-size="7.5" fill="#b26a39" text-anchor="middle">12.5″</text>';

    /* 密度曲线：砂岩段断开 */
    var segs = [], cur = [];
    for (var d2 = 0; d2 <= 62; d2 += 0.5) {
      var bad = false, den = 2.5;
      B.forEach(function (b) {
        if (d2 >= b.a && d2 <= b.b) {
          den = b.den;
          if (b.l === 'ss' && d2 > b.a + 1 && d2 < b.b - 1) bad = true;
        }
      });
      if (bad) { if (cur.length) { segs.push(cur); cur = []; } }
      else cur.push(DENX(den).toFixed(1) + ',' + Y(d2).toFixed(1));
    }
    if (cur.length) segs.push(cur);
    segs.forEach(function (sg) {
      s += '<polyline points="' + sg.join(' ') + '" fill="none" stroke="#5d666d" stroke-width="1.6"/>';
    });
    /* 缺失带 */
    B.forEach(function (b) {
      if (b.l !== 'ss') return;
      var a = b.a + 1, bb = b.b - 1;
      s += '<rect x="' + DX0 + '" y="' + Y(a) + '" width="' + (DX1 - DX0) + '" height="' + (Y(bb) - Y(a)) +
        '" fill="#c0392b" fill-opacity=".07" stroke="#c0392b" stroke-opacity=".35" stroke-dasharray="3 3"/>';
      s += '<text x="' + ((DX0 + DX1) / 2) + '" y="' + ((Y(a) + Y(bb)) / 2 + 3) + '" font-size="8" fill="#c0392b" text-anchor="middle">缺失</text>';
    });

    s += '<text x="' + ((GX0 + GX1) / 2) + '" y="' + (Y0 - 20) + '" font-size="9" fill="#5d666d" text-anchor="middle">井径 CAL / in</text>';
    s += '<text x="' + ((DX0 + DX1) / 2) + '" y="' + (Y0 - 20) + '" font-size="9" fill="#5d666d" text-anchor="middle">密度 DEN</text>';
    s += '<text x="' + (X0 + 15) + '" y="' + (Y0 - 20) + '" font-size="9" fill="#5d666d" text-anchor="middle">岩性</text>';
    s += '<text x="' + (X0 - 4) + '" y="' + (Y0 + 8) + '" font-size="8" fill="#9ba3a9" text-anchor="end">0 m</text>';
    s += '<text x="' + (X0 - 4) + '" y="' + (Y1 - 2) + '" font-size="8" fill="#9ba3a9" text-anchor="end">62 m</text>';

    /* ---- 右：两个偏差 ---- */
    var PX = 330;
    s += '<text x="' + PX + '" y="' + (Y0 - 20) + '" font-size="10.5" font-weight="600" fill="#242b2e">缺失点并不是随机抽的</text>';

    /* 砂岩占比两条横条 */
    s += '<text x="' + PX + '" y="' + (Y0 + 2) + '" font-size="9" fill="#79828a">缺失段落在砂岩里的比例</text>';
    s += '<rect x="' + PX + '" y="' + (Y0 + 8) + '" width="180" height="13" fill="#f0ece2"/>';
    s += '<rect x="' + PX + '" y="' + (Y0 + 8) + '" width="' + (180 * 0.43) + '" height="13" fill="#c9c2b0"/>';
    s += '<text x="' + (PX + 186) + '" y="' + (Y0 + 18) + '" font-size="8.5" font-family="monospace" fill="#79828a">全井 43%</text>';
    s += '<rect x="' + PX + '" y="' + (Y0 + 25) + '" width="180" height="13" fill="#f0ece2"/>';
    s += '<rect x="' + PX + '" y="' + (Y0 + 25) + '" width="' + (180 * 0.58) + '" height="13" fill="#c0392b" fill-opacity=".55"/>';
    s += '<text x="' + (PX + 186) + '" y="' + (Y0 + 35) + '" font-size="8.5" font-family="monospace" fill="#c0392b" font-weight="600">缺失段 58%</text>';

    /* 净毛比三条 */
    s += '<text x="' + PX + '" y="' + (Y0 + 62) + '" font-size="9" fill="#79828a">净毛比 N/G</text>';
    var NG = [['真值', 43.5, '#5d666d'], ['丢弃缺失点', 34.1, '#c0392b'], ['补全后', 43.5, '#2f7d6b']];
    NG.forEach(function (r, i) {
      var yy = Y0 + 72 + i * 20;
      s += '<text x="' + PX + '" y="' + (yy + 9) + '" font-size="8.5" fill="#5d666d">' + r[0] + '</text>';
      s += '<rect x="' + (PX + 66) + '" y="' + yy + '" width="' + (130 * r[1] / 50) + '" height="11" fill="' + r[2] + '" fill-opacity="' + (i === 0 ? '.35' : '.6') + '"/>';
      s += '<text x="' + (PX + 66 + 130 * r[1] / 50 + 4) + '" y="' + (yy + 9) + '" font-size="8.5" font-family="monospace" fill="' + r[2] + '">' + r[1].toFixed(1) + '%</text>';
    });
    s += '<text x="' + PX + '" y="' + (Y0 + 146) + '" font-size="8.5" fill="#c0392b">↓ 偏低 9.4 个百分点</text>';

    s += '<rect x="' + PX + '" y="' + (Y0 + 158) + '" width="' + (W - PX - 10) + '" height="46" rx="6" fill="#fbf3ed"/>';
    s += '<text x="' + (PX + 10) + '" y="' + (Y0 + 175) + '" font-size="9" fill="#8c5340">疏松砂岩井壁坍塌 → 密度极板贴不上井壁 → 曲线判废。</text>';
    s += '<text x="' + (PX + 10) + '" y="' + (Y0 + 189) + '" font-size="9" fill="#8c5340">而砂岩正是要算储层的那一段，缺失天然偏向它。</text>';
    s += '<text x="' + (PX + 10) + '" y="' + (Y0 + 200) + '" font-size="9" fill="#8c5340">于是"把缺失点删掉再统计"不是少用几个点，是<tspan font-weight="600">换了一批样本</tspan>。</text>';

    s += '</svg>';
    return s;
  }

  /* ================= 图 2：误差的双峰 ================= */
  function figBimodal() {
    var W = 636, H = 300;
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="线性插值的误差按缺口是否跨层界呈双峰分布：层内缺口误差小，跨层界缺口误差大">';

    /* 左侧小示意：缺口跨层界时直线把两层抹平 */
    var SX = 24, SY = 46, SW = 168, SH = 150;
    s += '<text x="' + SX + '" y="' + (SY - 22) + '" font-size="10" font-weight="600" fill="#242b2e">缺口跨过层界面</text>';
    s += '<rect x="' + SX + '" y="' + SY + '" width="' + SW + '" height="' + SH + '" fill="#fbfaf5" stroke="#e9e4d8"/>';
    /* 层界面 */
    s += '<rect x="' + SX + '" y="' + (SY + 0) + '" width="' + SW + '" height="70" fill="#d9b45c" fill-opacity=".22"/>';
    s += '<rect x="' + SX + '" y="' + (SY + 70) + '" width="' + SW + '" height="80" fill="#8b8878" fill-opacity=".22"/>';
    /* 真实曲线：砂段靠左，泥段靠右 */
    s += '<path d="M' + (SX + 26) + ' ' + (SY + 4) + 'v52 Q' + (SX + 30) + ' ' + (SY + 74) + ' ' + (SX + 96) + ' ' + (SY + 78) + 'v68" fill="none" stroke="#9ba3a9" stroke-width="1.6" stroke-dasharray="4 3"/>';
    /* 直线插值 */
    s += '<line x1="' + (SX + 26) + '" y1="' + (SY + 56) + '" x2="' + (SX + 96) + '" y2="' + (SY + 146) + '" stroke="#b26a39" stroke-width="2"/>';
    s += '<circle cx="' + (SX + 26) + '" cy="' + (SY + 56) + '" r="2.6" fill="#fff" stroke="#5d666d"/>';
    s += '<circle cx="' + (SX + 96) + '" cy="' + (SY + 146) + '" r="2.6" fill="#fff" stroke="#5d666d"/>';
    s += '<text x="' + (SX + 8) + '" y="' + (SY + 122) + '" font-size="8" fill="#b26a39">直线连接</text>';
    s += '<text x="' + (SX + 8) + '" y="' + (SY + 134) + '" font-size="8" fill="#b26a39">= 把两层抹平</text>';
    s += '<text x="' + (SX + 100) + '" y="' + (SY + 40) + '" font-size="8" fill="#8b8878">砂</text>';
    s += '<text x="' + (SX + 100) + '" y="' + (SY + 96) + '" font-size="8" fill="#8b8878">泥</text>';

    /* 右侧柱状：层内 vs 跨层界 */
    var x0 = 258, x1 = 606, y0 = 52, y1 = 216;
    var YM = 10;
    var Y = function (v) { return y1 - v / YM * (y1 - y0); };
    s += '<text x="' + x0 + '" y="26" font-size="10.5" font-weight="600" fill="#242b2e">同一个方法，误差分成两群</text>';
    s += '<text x="' + x0 + '" y="41" font-size="9" fill="#79828a">线性插值的 RMSE / p.u.（随机缺失，48 个缺口）</text>';

    [0, 2, 4, 6, 8, 10].forEach(function (v) {
      s += '<line x1="' + x0 + '" y1="' + Y(v) + '" x2="' + x1 + '" y2="' + Y(v) + '" stroke="#eeeae0"/>';
      s += '<text x="' + (x0 - 6) + '" y="' + (Y(v) + 3) + '" font-size="8.5" font-family="monospace" fill="#9ba3a9" text-anchor="end">' + v + '</text>';
    });

    var G = [
      { L: '1 m', a: 2.32, b: 5.23, n: [34, 14] },
      { L: '2 m', a: 1.69, b: 6.67, n: [13, 23] },
      { L: '3 m', a: 4.28, b: 8.75, n: [4, 20] }
    ];
    var bw = 22;
    G.forEach(function (g, i) {
      var cx = x0 + 62 + i * 110;
      s += '<rect x="' + (cx - bw - 4) + '" y="' + Y(g.a) + '" width="' + bw + '" height="' + (y1 - Y(g.a)) + '" fill="#2f7d6b" fill-opacity=".62" rx="2"/>';
      s += '<text x="' + (cx - bw / 2 - 4) + '" y="' + (Y(g.a) - 4) + '" font-size="8.5" font-family="monospace" fill="#2f7d6b" text-anchor="middle">' + g.a.toFixed(1) + '</text>';
      s += '<rect x="' + (cx + 4) + '" y="' + Y(g.b) + '" width="' + bw + '" height="' + (y1 - Y(g.b)) + '" fill="#c0392b" fill-opacity=".55" rx="2"/>';
      s += '<text x="' + (cx + bw / 2 + 4) + '" y="' + (Y(g.b) - 4) + '" font-size="8.5" font-family="monospace" fill="#c0392b" text-anchor="middle">' + g.b.toFixed(1) + '</text>';
      s += '<text x="' + cx + '" y="' + (y1 + 14) + '" font-size="9" fill="#5d666d" text-anchor="middle">' + g.L + '</text>';
      s += '<text x="' + cx + '" y="' + (y1 + 26) + '" font-size="8" fill="#9ba3a9" text-anchor="middle">' + g.n[0] + ' / ' + g.n[1] + ' 个</text>';
    });
    s += '<line x1="' + x0 + '" y1="' + y1 + '" x2="' + x1 + '" y2="' + y1 + '" stroke="#c9c2b0"/>';

    var LG = [['#2f7d6b', '层内缺口'], ['#c0392b', '跨层界缺口']];
    LG.forEach(function (l, i) {
      var lx = x1 - 152 + i * 82;
      s += '<rect x="' + lx + '" y="20" width="9" height="9" fill="' + l[0] + '" fill-opacity=".62" rx="2"/>';
      s += '<text x="' + (lx + 13) + '" y="28" font-size="8.5" fill="#5d666d">' + l[1] + '</text>';
    });

    s += '<rect x="24" y="252" width="' + (W - 48) + '" height="34" rx="6" fill="#f2f7f5"/>';
    s += '<text x="36" y="267" font-size="9.5" fill="#3f6d61">缺口长度只决定"有多大可能跨到层界"，误差真正的分水岭是<tspan font-weight="600">跨没跨</tspan>：层内 1.7—4.3 p.u.，跨层界 5.2—8.8 p.u.。</text>';
    s += '<text x="36" y="280" font-size="9.5" fill="#3f6d61">所以"按长度选方法"不如"按缺口形态选方法" —— 而缺口形态可以从缺口两侧的 GR 读出来。</text>';

    s += '</svg>';
    return s;
  }

  /* ================= 图 3：给了区间不等于给对了 ================= */
  function figCoverage() {
    var W = 636, H = 264;
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="三种方法的预测区间实测覆盖率与名义 90% 的对比">';

    var x0 = 52, x1 = 604, y0 = 52, y1 = 176;
    var Y = function (v) { return y1 - v / 100 * (y1 - y0); };

    [0, 25, 50, 75, 100].forEach(function (v) {
      s += '<line x1="' + x0 + '" y1="' + Y(v) + '" x2="' + x1 + '" y2="' + Y(v) + '" stroke="#eeeae0"/>';
      s += '<text x="' + (x0 - 6) + '" y="' + (Y(v) + 3) + '" font-size="8.5" font-family="monospace" fill="#9ba3a9" text-anchor="end">' + v + '%</text>';
    });
    /* 名义 90% */
    s += '<line x1="' + x0 + '" y1="' + Y(90) + '" x2="' + x1 + '" y2="' + Y(90) + '" stroke="#242b2e" stroke-width="1.2" stroke-dasharray="5 4"/>';

    s += '<text x="' + x0 + '" y="26" font-size="10.5" font-weight="600" fill="#242b2e">区间到底盖住了没有</text>';
    s += '<text x="' + x0 + '" y="41" font-size="9" fill="#79828a">缺口内实测命中率（虚线 = 名义 90%），随机缺失机制</text>';

    var SER = [
      { n: '线性插值', c: '#b26a39', d: [55, 66, 53, 53] },
      { n: '邻井借值', c: '#41699b', d: [88, 88, 88, 90] },
      { n: '多曲线回归', c: '#2f7d6b', d: [92, 88, 83, 80] }
    ];
    var LS = ['0.5 m', '2 m', '4 m', '8 m'];
    SER.forEach(function (se, si) {
      var pts = [];
      se.d.forEach(function (v, i) {
        var x = x0 + 40 + i * 150;
        pts.push(x.toFixed(1) + ',' + Y(v).toFixed(1));
        s += '<circle cx="' + x + '" cy="' + Y(v) + '" r="3" fill="' + se.c + '"/>';
        s += '<text x="' + x + '" y="' + (Y(v) - 8) + '" font-size="8.5" font-family="monospace" fill="' + se.c + '" text-anchor="middle">' + v + '%</text>';
        if (si === 2) s += '<text x="' + x + '" y="' + (y1 + 14) + '" font-size="8.5" fill="#9ba3a9" text-anchor="middle">' + LS[i] + '</text>';
      });
      s += '<polyline points="' + pts.join(' ') + '" fill="none" stroke="' + se.c + '" stroke-width="1.8"/>';
    });
    s += '<line x1="' + x0 + '" y1="' + y1 + '" x2="' + x1 + '" y2="' + y1 + '" stroke="#c9c2b0"/>';

    SER.forEach(function (se, i) {
      var lx = x0 + i * 132;
      s += '<line x1="' + lx + '" y1="' + (y1 + 44) + '" x2="' + (lx + 14) + '" y2="' + (y1 + 44) + '" stroke="' + se.c + '" stroke-width="2"/>';
      s += '<text x="' + (lx + 18) + '" y="' + (y1 + 47) + '" font-size="8.5" fill="#5d666d">' + se.n + '</text>';
    });

    s += '<rect x="24" y="230" width="' + (W - 48) + '" height="26" rx="6" fill="#fbf3ed"/>';
    s += '<text x="36" y="247" font-size="9.5" fill="#8c5340">线性插值那条"端点差一半"的区间从来没有达标过（53—66%）；回归从短缺口 92% 掉到 8 m 时 80% —— 全局残差 σ 管不住局部的岩性突变。</text>';

    s += '</svg>';
    return s;
  }

  /* ================= 图 4：实测 RMSE–长度曲线 ================= */
  function figCurves() {
    var W = 636, H = 300;
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="四种补全方法的误差随缺失长度的变化，以及三种缺失机制下的对照">';

    function chart(ox, title, sub, data) {
      var x0 = ox + 34, x1 = ox + 268, y0 = 56, y1 = 200;
      var YM = 14;
      var X = function (v) { return x0 + (v - 0.5) / 7.5 * (x1 - x0); };
      var Y = function (v) { return y1 - Math.min(v, YM) / YM * (y1 - y0); };
      var g = '';
      g += '<text x="' + ox + '" y="26" font-size="10.5" font-weight="600" fill="#242b2e">' + title + '</text>';
      g += '<text x="' + ox + '" y="41" font-size="8.5" fill="#79828a">' + sub + '</text>';
      [0, 4, 8, 12].forEach(function (v) {
        g += '<line x1="' + x0 + '" y1="' + Y(v) + '" x2="' + x1 + '" y2="' + Y(v) + '" stroke="#eeeae0"/>';
        g += '<text x="' + (x0 - 5) + '" y="' + (Y(v) + 3) + '" font-size="8.5" font-family="monospace" fill="#9ba3a9" text-anchor="end">' + v + '</text>';
      });
      data.forEach(function (se) {
        var pts = se.d.map(function (v, i) {
          return X([0.5, 1, 1.5, 2, 2.5, 3, 4, 5, 6, 8][i]).toFixed(1) + ',' + Y(v).toFixed(1);
        });
        g += '<polyline points="' + pts.join(' ') + '" fill="none" stroke="' + se.c + '" stroke-width="' + (se.w || 1.7) + '"/>';
        se.d.forEach(function (v, i) {
          g += '<circle cx="' + X([0.5, 1, 1.5, 2, 2.5, 3, 4, 5, 6, 8][i]) + '" cy="' + Y(v) + '" r="1.8" fill="' + se.c + '"/>';
        });
      });
      [1, 3, 5, 8].forEach(function (v) {
        g += '<text x="' + X(v) + '" y="' + (y1 + 13) + '" font-size="8.5" font-family="monospace" fill="#9ba3a9" text-anchor="middle">' + v + '</text>';
      });
      g += '<line x1="' + x0 + '" y1="' + y1 + '" x2="' + x1 + '" y2="' + y1 + '" stroke="#c9c2b0"/>';
      return g;
    }

    var R = [2.20, 3.44, 4.16, 5.43, 5.10, 8.18, 9.99, 7.95, 10.39, 10.65];
    var NB = [3.71, 3.59, 3.78, 3.52, 3.33, 4.09, 3.94, 3.17, 3.31, 3.19];
    var RG = [1.73, 1.83, 1.85, 1.87, 1.90, 1.97, 2.00, 2.03, 2.05, 2.10];
    var AU = [1.78, 1.87, 2.04, 2.35, 2.14, 3.64, 2.57, 2.72, 2.05, 3.71];

    s += chart(6, 'a · 随机丢段', '16—3 段缺口，三种网格偏移平均',
      [{ c: '#b26a39', d: R }, { c: '#41699b', d: NB }, { c: '#2f7d6b', d: RG, w: 2.2 }, { c: '#7e5a8d', d: AU }]);

    var W1 = [2.66, 3.16, 4.63, 6.45, 9.02, 8.35, 11.86, 10.42, 11.80, 12.31];
    var W2 = [4.06, 3.74, 4.23, 4.31, 4.23, 4.74, 4.80, 4.17, 3.57, 3.44];
    var W3 = [1.61, 1.69, 1.80, 1.80, 1.84, 1.96, 1.94, 1.91, 1.70, 1.73];
    var W4 = [2.01, 1.86, 2.78, 3.37, 3.83, 4.15, 4.35, 4.36, 4.08, 6.06];

    s += chart(324, 'b · 扩径相关（集中在砂岩）', '缺口位置偏向疏松砂岩段',
      [{ c: '#b26a39', d: W1 }, { c: '#41699b', d: W2 }, { c: '#2f7d6b', d: W3, w: 2.2 }, { c: '#7e5a8d', d: W4 }]);

    var LG = [['#b26a39', '线性插值'], ['#41699b', '邻井借值'], ['#2f7d6b', '多曲线回归'], ['#7e5a8d', '按层界择一']];
    LG.forEach(function (l, i) {
      var lx = 14 + i * 112;
      s += '<line x1="' + lx + '" y1="' + 246 + '" x2="' + (lx + 15) + '" y2="246" stroke="' + l[0] + '" stroke-width="2"/>';
      s += '<text x="' + (lx + 20) + '" y="249.5" font-size="9" fill="#5d666d">' + l[1] + '</text>';
    });

    s += '<line x1="312" y1="48" x2="312" y2="212" stroke="#e9e4d8" stroke-dasharray="3 4"/>';
    s += '<text x="14" y="272" font-size="9.5" fill="#79828a">左图纵轴 RMSE / p.u.，横轴缺失长度 / m。线性插值随长度陡升（2.2 → 10.7），邻井借值始终 3—4 p.u. 且不随长度改善，</text>';
    s += '<text x="14" y="286" font-size="9.5" fill="#79828a">多曲线回归维持在 1.7—2.1 p.u.；"按层界择一"在 2 m 以内接近最优，越往后越失效 —— 它只看缺口两端的 GR 差。</text>';

    s += '</svg>';
    return s;
  }

  /* ================= 数据清单 ================= */
  var DATA = [
    ['常规测井曲线', 'GR / DEN / AC / CNL / CAL，0.125 m 采样', '至少三条，用于交叉预测'],
    ['井径与钻井日报', 'CAL 曲线 + 扩径、遇阻、掉块记录', '判断缺失的成因，不是随机缺的'],
    ['邻井曲线', '同一区块 1—3 口井的完整曲线', '借值法的前提，需先做层位对比'],
    ['岩心或试油资料', '少量真实孔隙度，用于标定补全误差', '没有它就无法判断补得对不对'],
    ['下游解释成果', '净毛比、平均孔隙度、射孔段', '缺失偏差最终体现在这些数上']
  ];

  return {

    id: 'w5-completion',
    sceneId: 'w5',
    title: '缺失段智能补全',
    summary: '缺失不是随机的，补出来的是估计',
    status: 'ready',
    version: '1.0.0',
    updated: '2026-10-26',
    methods: ['ts'],

    tabs: {
      background: {
        label: '专业背景',

        judge: [
          { label: '任务类型', value: '缺失值重建', desc: '逐深度点回归 + 不确定度', html: '<span style="color:var(--c-ts)">序列补全</span>' },
          { label: '数据门槛', value: '多条曲线 + 井径记录', desc: '至少三条曲线才能交叉预测' },
          { label: '收益', value: '补全误差 1.7—2.1 p.u.', desc: '线性插值同段 2.2—12.3 p.u.', html: '<b style="color:var(--jade-d);font-family:var(--mono)">≈ 5×</b>' },
          { label: '难度', value: '中', desc: '回归不难，难在承认"补出来的是估计"', html: K.dtag('中') }
        ],

        lede: '测井曲线经常缺。仪器故障、井壁坍塌、套管段、传输丢包 —— 一口井少则几米、多则几十米没有数据。缺的那一段往往正好是要算储层的那一段，而"把缺失点删掉"这个动作，会悄悄改掉整口井的统计结果。',

        sections: [
          {
            no: 1, en: 'PROBLEM', title: '缺失不是随机的',
            html: '<p>处理缺失值的第一反应通常是<b>删掉</b>：缺失点不参与统计，用剩下的点算平均孔隙度、算净毛比。这个动作在统计学上有个前提 —— <b>缺失与数值无关</b>（完全随机缺失）。测井数据几乎从不满足这个前提。</p>' +
              '<p>最常见的成因是<b>井壁坍塌</b>：疏松砂岩在钻井液冲刷下扩径，密度极板贴不上井壁，曲线读数失真被判废。于是缺失段系统性地落在砂岩上 —— 而砂岩正是要算储层的那一段。结果是：删掉缺失点，剩下的样本里泥岩比例偏高，<b>净毛比被系统性压低</b>。</p>' +
              K.figure(figBias(), 1, '左侧：井径在两层砂岩处扩到 15.6 in（钻头 8.6 in、仪器要求 12.5 in 以内），密度曲线在同样深度断开。右侧：**缺失段里砂岩占 58%，全井只有 43%**；把这些点删掉再算净毛比，从 43.5% 掉到 34.1% —— 偏低 9.4 个百分点，而且缺失越多偏得越狠。') +
              '<p>这不是"少用几个点"的问题，是<b>换了一批样本</b>。样本换掉以后，无论后面用什么模型、调什么参数，都补不回来。</p>'
          },
          {
            no: 2, en: 'INTERVENTION', title: 'AI 能做什么',
            html: '<p>补全的本质是<b>用没缺的信息去推缺了的那条</b>。测井曲线之间不是独立的：GR 反映泥质、AC 反映孔隙度、DEN 同时反映孔隙度和骨架。一条曲线缺失时，其余曲线仍然带着大部分信息 —— 这就是多曲线回归能工作的原因。</p>' +
              '<p>但这里有个容易忽略的细节：<b>误差不是随缺口长度均匀增长的</b>。同一个方法，缺口落在一个层内部时几乎无误差，一旦跨过层界面，误差立刻翻倍。原因是线性插值把两层的曲线连成了一个斜面，而真实的曲线在界面处是<b>台阶</b>。</p>' +
              K.figure(figBimodal(), 2, '把随机缺失的 48 个缺口按"有没有跨层界"分成两组：层内缺口误差 1.7—4.3 p.u.，跨层界缺口 5.2—8.8 p.u.，差 2—3 倍。**所以选方法该看缺口的形态，而不是只看长度** —— 而形态可以从缺口两侧的 GR 读出来（差值大 = 跨了层界）。') +
              K.callout('这条案例最值得记住的一句：**补全的输出不是一条曲线，是一个带区间的估计。** 长缺口该给的是"这里 18 ± 3 p.u."，而不是一条看起来和实测一样光滑的线 —— 后者会让人忘记它是猜的。')
          },
          {
            no: 3, en: 'DATA', title: '你需要准备什么',
            html: '<p style="margin-bottom:14px">补全对数据的要求比分类任务低，但对<b>辅助信息</b>的要求高 —— 井径能告诉你缺口的成因，邻井能提供横向约束，岩心能告诉你补得准不准。</p>' +
              K.checklist(DATA) +
              '<p style="margin-top:18px"><span class="kicker plain" style="color:var(--ink-4)">可参考的公开数据集</span></p>' +
              K.refs(['FORCE 2020 岩性预测赛（含缺测段）', 'Kansas Geological Survey 公开测井库', 'Equinor Volve 公开数据（含井径与钻井报告）'], null)
          },
          {
            no: 4, en: 'DIFFICULTY', title: '技术难度与参考方向',
            html: '<div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-bottom:2px">' +
              K.dtag('中') + '<span class="small muted">回归、插值都是几十年的老方法；难在"承认误差"和"别把偏差当噪声"。</span></div>' +
              K.meter('中') +
              '<p>三个难点：<b>缺失机制判断</b>（不判断就一定带偏）、<b>跨层界的缺口</b>（线性方法的天敌）、<b>不确定度的可靠性</b>。第三点最容易被跳过，也最容易翻车。</p>' +
              '<p>实测结果很直接：回归给出的 90% 区间，在 0.5 m 缺口上实测覆盖 92%，到 8 m 只剩 80%。原因是用<b>一个全局残差标准差</b>去描述所有位置的误差，而误差实际随位置变化 —— 缺口中间夹了一层灰岩时，回归会错得比平均多得多。</p>' +
              K.figure(figCoverage(), 3, '名义 90% 的区间（虚线）到底盖住了多少：线性插值的区间从来只有 53—66%，因为它用"两端差值的一半"当不确定度，与真实误差分布毫无关系；邻井借值稳定在 88—90%，代价是区间给得很宽；**回归短缺口 92%、8 m 降到 80%**，说明全局 σ 管不住局部突变。') +
              '<p style="margin-top:18px"><span class="kicker plain" style="color:var(--ink-4)">可借鉴的通用技术</span></p>' +
              K.refs(['多变量线性/岭回归', '插值方法与样条', '分位数回归与预测区间', '缺失机制（MCAR / MAR / MNAR）判别'], '#/method/ts') +
              '<p style="margin-top:18px" class="small muted">交叉环节：<a href="#/stage/welllog" style="color:var(--jade-d);font-weight:600">测井</a> · <a href="#/stage/reservoir" style="color:var(--jade-d);font-weight:600">油藏</a></p>'
          }
        ]
      },

      workflow: {
        label: '案例流程',
        title: '案例：一口 62 m 井段的密度曲线补全',
        lead: [
          '研究井段 62 m、0.125 m 采样共 497 个深度点，岩性按砂岩 21%、泥质砂岩 22%、泥岩 35%、灰岩 22% 交替。假设密度曲线因为扩径被判废了若干段，要把它补回来，并且说清楚补得有多准。',
          '真值是我们自己造出来的（所以能算误差），但补全过程**只用缺口以外的信息**：缺口内的真实密度不参与任何计算。这条案例比的不是谁更聪明，而是**谁在信息受限时不装作知道**。'
        ],
        stats: [
          ['研究井段', '62 m', true], ['采样点', '497', true],
          ['缺失机制', '3 种', true], ['目标 RMSE', '≤2 p.u.'],
          ['扩径缺失点砂岩', '58% / 43%'], ['案例结果', '1.7 p.u.']
        ],
        steps: [
          {
            name: '缺失机制判定', role: '质控',
            do: '先看缺失段落在什么岩性里：拿 CAL 曲线和钻头直径比，扩径段标出来；再统计缺失段的 GR 分布与全井 GR 分布是否一致。不一致就是"非随机缺失"，后面所有统计都必须先补全再算。',
            effect: '确定偏差的方向：扩径缺失让净毛比偏低，套管缺失让它偏高',
            trap: '跳过这一步直接删点，得到的净毛比偏低 9.4 个百分点，而且看不出任何异常'
          },
          {
            name: '缺口编目与形态分类', role: '工程环节',
            do: '把每个缺口记下来：起止深度、长度、上下端点的 GR 差、是否跨层界面。分类比长度更重要 —— 层内缺口和跨层缺口要用不同方法。',
            effect: '缺口从"一段没数据"变成"一类有形态的对象"，方法才能对症',
            trap: '只用长度做分类，会把 1 m 的跨层缺口当成简单情形，误差 5.2 p.u. 起步'
          },
          {
            name: '多曲线回归补全', role: '算法核心',
            do: '用未缺失段的样本拟合 DEN ~ GR + AC + CNL（含截距），把缺口内的 GR/AC/CNL 代进去预测密度。特征先做中心化缩放，避免量纲差异让系数失真。',
            effect: '全长度段误差稳定在 1.7—2.1 p.u.，不随缺口变长而崩',
            trap: '把缺失段也放进训练集（用插值后的值当标签），模型学的是自己的猜测'
          },
          {
            name: '不确定度评估', role: '质控',
            do: '用训练残差算残差标准差，给出预测区间；再拿一部分留出段验证"区间到底盖住了多少"。实测不足 90% 就说明区间的形式不对，要改成随位置变化（分位数回归或局部残差）。',
            effect: '把"补出来的 18 p.u."变成"18 ± 3 p.u.，且在长缺口上覆盖不足"',
            trap: '区间按全局 σ 给一个常数，长缺口实测只有 80%，却对外宣称 90%'
          },
          {
            name: '下游影响复核', role: '闭环',
            do: '把补全前后的净毛比、平均孔隙度、射孔段厚度都算一遍，和"丢弃缺失点"的结果对照；差异超过阈值的层段回退到人工解释。',
            effect: '补全后 N/G 回到 43.5%（真值），丢弃法只有 34.1%',
            trap: '只交曲线不交对比，甲方无法判断这段数据能不能用于储量计算'
          }
        ],
        metrics: {
          title: '怎么算"补对了"',
          html: '<p>用<b>缺口内的 RMSE（换算成孔隙度百分点）</b>，不是全井误差。全井 497 个点里缺口只占几十个，混在一起算，误差会被大量正确点稀释。同时必须报告<b>区间覆盖率</b> —— 只报 RMSE 会让人以为补出来的是实测值。</p>' +
            K.figure(figCurves(), 4, '左：随机丢段，线性插值随长度陡升（2.2 → 10.7 p.u.），邻井借值一条平线（3—4 p.u.）却始终下不去，多曲线回归稳定在 1.7—2.1 p.u.。右：扩径相关缺失更残酷 —— 缺口都落在砂岩里，线性插值 8 m 时到 12.3 p.u.。**"按层界择一"这个看似聪明的启发式在 2 m 以内确实好（1.86），到 6 m 就崩到 6.06**：它只看两端 GR 差，长缺口里藏着好几层而端点恰好都在砂岩。') +
            K.dtable(['方法', '用到的信息', '随机缺失 RMSE', '扩径相关 RMSE'], [
              ['线性插值', '缺口两端两个点', '2.20 → 10.65 p.u.', '2.66 → 12.31 p.u.'],
              ['邻井借值', '邻井同深度曲线', '3.19 → 4.09 p.u.', '3.44 → 4.80 p.u.'],
              ['多曲线回归', '本井 GR + AC + CNL', '1.73 → 2.10 p.u.', '1.61 → 1.73 p.u.'],
              ['按层界择一', '回归 + 端点 GR 差判层界', '1.78 → 3.71 p.u.', '2.01 → 6.06 p.u.'],
              ['区间覆盖率（回归）', '名义 90%', '0.5 m 时 92%', '8 m 时 80%']
            ]) +
            '<p style="margin-top:12px" class="small muted">表中数值均为缺口内 RMSE，区间为 0.5 m 与 8 m 两个端点；全部由 <code>tools/test-w5.js</code> 复算。</p>'
        },
        fails: [
          { name: '把缺失当随机删掉', why: '扩径缺失集中在砂岩，删掉后净毛比从 43.5% 掉到 34.1%（偏低 9.4 个百分点）；套管段缺失反过来偏高。偏差方向取决于缺失机制，不看机制就无从判断偏在哪边。' },
          { name: '用全局残差给一个常数区间', why: '名义 90% 的区间，回归在短缺口上实测 92%（达标），8 m 缺口只剩 80%。因为误差随位置变化 —— 缺口中间夹一层灰岩时误差翻倍，而全局 σ 描述不了这件事。' },
          { name: '邻井借值不看横向稳定性', why: '缺口落在厚层砂岩里时邻井借值能到 1 p.u. 以内，看起来很香；换到薄互层段立刻涨到 4.8 p.u.。它的成败取决于两口井这条曲线是否"长得一样"，而层位对比差 0.3 m 就整段错位。' },
          { name: '启发式规则只看长度或只看端点', why: '"按层界择一"在 2 m 以内几乎追平回归（1.86 vs 1.69），到 6 m 崩到 6.06。规则没错但特征不够：长缺口里可能藏着好几层，而两个端点恰好都在砂岩里，端点差看不到中间的变化。' }
        ]
      },

      demo: {
        label: '可运行示范',
        intro: '拖"缺失长度"看四种方法的误差怎么分叉；切"缺失机制"看缺口位置从随机变成集中在砂岩时，净毛比偏差如何从 +2.4 变成 −9.4 个百分点。上面四个指标格随选择实时重算，右侧表格标星的是当前长度下的最优方法。',
        height: 790
      }
    },

    demoGlobal: 'W5DEMO'
  };
};
