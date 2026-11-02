/* =========================================================
   w5 · 多井曲线标准化 —— 案例正文（单一源）
   ---------------------------------------------------------
   正文里每个数字都来自 tools/test-w5n.js 与 tools/probe-w5n.js 的实测输出。
   ========================================================= */

module.exports = function (K) {

  /* ================= 图 1：同一套地层，两条直方图对不上 ================= */
  function figShift() {
    var W = 636, H = 300;
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="同一套地层在两口井上的伽马直方图整体错位，同一条截止值切出不同的净毛比">';

    var x0 = 46, x1 = 386, yb = 206, yt = 42;
    var X = function (v) { return x0 + v / 150 * (x1 - x0); };

    function mix(shift) {
      var comp = [[42, 10, 0.42], [70, 11, 0.22], [104, 11, 0.30], [24, 5, 0.07]];
      var arr = [];
      for (var i = 0; i <= 150; i++) {
        var d = 0;
        comp.forEach(function (c) {
          d += c[2] * Math.exp(-Math.pow(i - shift - c[0], 2) / (2 * c[1] * c[1]));
        });
        arr.push(d);
      }
      return arr;
    }
    var A = mix(0), B = mix(-10);
    var mx = 0;
    A.concat(B).forEach(function (v) { if (v > mx) mx = v; });
    var Y = function (v) { return yb - v / mx * (yb - yt); };

    [0, 30, 60, 90, 120, 150].forEach(function (v) {
      s += '<line x1="' + X(v) + '" y1="' + yt + '" x2="' + X(v) + '" y2="' + yb + '" stroke="#f0ece2"/>';
      s += '<text x="' + X(v) + '" y="' + (yb + 14) + '" font-size="8.5" font-family="monospace" fill="#9ba3a9" text-anchor="middle">' + v + '</text>';
    });

    [[A, '#5d666d'], [B, '#b26a39']].forEach(function (se) {
      var pts = [];
      for (var i = 0; i <= 150; i++) pts.push(X(i).toFixed(1) + ',' + Y(se[0][i]).toFixed(1));
      s += '<polygon points="' + X(0) + ',' + yb + ' ' + pts.join(' ') + ' ' + X(150) + ',' + yb +
        '" fill="' + se[1] + '" fill-opacity=".12"/>';
      s += '<polyline points="' + pts.join(' ') + '" fill="none" stroke="' + se[1] + '" stroke-width="1.8" stroke-linejoin="round"/>';
    });

    /* 偏移箭头 */
    var pa = 0, pb = 0;
    A.forEach(function (v, i) { if (v > A[pa]) pa = i; });
    B.forEach(function (v, i) { if (v > B[pb]) pb = i; });
    var yArrow = yt + 16;
    s += '<line x1="' + X(pb) + '" y1="' + yArrow + '" x2="' + X(pa) + '" y2="' + yArrow + '" stroke="#b26a39" stroke-width="1.2"/>';
    s += '<path d="M' + (X(pb) + 5) + ' ' + (yArrow - 3.5) + 'l-5 3.5 5 3.5" fill="none" stroke="#b26a39" stroke-width="1.2"/>';
    s += '<text x="' + ((X(pa) + X(pb)) / 2) + '" y="' + (yArrow - 6) + '" font-size="8.5" fill="#b26a39" text-anchor="middle">整体偏 10 API</text>';

    /* 截止值 */
    s += '<line x1="' + X(60) + '" y1="' + (yt - 4) + '" x2="' + X(60) + '" y2="' + yb + '" stroke="#c0392b" stroke-width="1.3" stroke-dasharray="5 3"/>';
    s += '<text x="' + X(60) + '" y="' + (yt - 9) + '" font-size="9" fill="#c0392b" text-anchor="middle">GR = 60</text>';
    s += '<line x1="' + x0 + '" y1="' + yb + '" x2="' + x1 + '" y2="' + yb + '" stroke="#c9c2b0"/>';
    s += '<text x="' + ((x0 + x1) / 2) + '" y="' + (yb + 30) + '" font-size="9.5" fill="#79828a" text-anchor="middle">自然伽马 GR / API　（竖线以左判为砂岩）</text>';

    /* ---- 右：三条净毛比 ---- */
    var bx0 = 424, bx1 = 622, byb = 206, byt = 56;
    var BG = [['参考井 #0', 45.2, '#5d666d'], ['1 号井 原始', 54.8, '#c0392b'], ['1 号井 平移后', 44.4, '#2f7d6b']];
    var YN = function (v) { return byb - v / 62 * (byb - byt); };
    [0, 20, 40, 60].forEach(function (v) {
      s += '<line x1="' + bx0 + '" y1="' + YN(v) + '" x2="' + bx1 + '" y2="' + YN(v) + '" stroke="#f0ece2"/>';
      s += '<text x="' + (bx0 - 5) + '" y="' + (YN(v) + 3) + '" font-size="8" font-family="monospace" fill="#9ba3a9" text-anchor="end">' + v + '%</text>';
    });
    s += '<text x="' + bx0 + '" y="' + (byt - 18) + '" font-size="10" font-weight="600" fill="#242b2e">同一条 60，切出三个答案</text>';
    BG.forEach(function (r, i) {
      var cx = bx0 + 34 + i * 62;
      s += '<rect x="' + (cx - 21) + '" y="' + YN(r[1]) + '" width="42" height="' + (byb - YN(r[1])) + '" fill="' + r[2] + '" fill-opacity=".62" rx="2"/>';
      s += '<text x="' + cx + '" y="' + (YN(r[1]) - 5) + '" font-size="9" font-family="monospace" fill="' + r[2] + '" text-anchor="middle" font-weight="600">' + r[1].toFixed(1) + '%</text>';
      var lab = r[0].split(' ');
      s += '<text x="' + cx + '" y="' + (byb + 13) + '" font-size="7.5" fill="#79828a" text-anchor="middle">' + lab[0] + '</text>';
      s += '<text x="' + cx + '" y="' + (byb + 23) + '" font-size="7.5" fill="#79828a" text-anchor="middle">' + (lab[1] || '') + '</text>';
    });
    s += '<line x1="' + bx0 + '" y1="' + YN(45.2) + '" x2="' + bx1 + '" y2="' + YN(45.2) + '" stroke="#5d666d" stroke-dasharray="3 3"/>';
    s += '<line x1="' + bx0 + '" y1="' + byb + '" x2="' + bx1 + '" y2="' + byb + '" stroke="#c9c2b0"/>';

    s += '<rect x="24" y="248" width="' + (W - 48) + '" height="34" rx="6" fill="#fbf3ed"/>';
    s += '<text x="36" y="262" font-size="9.3" fill="#8c5340">三根柱子的地层完全相同、真值都是 45.2%。差别只来自一条曲线的整体偏移 —— <tspan font-weight="600">不标准化的后果不是"误差大一点"，</tspan></text>';
    s += '<text x="36" y="275" font-size="9.3" fill="#8c5340"><tspan font-weight="600">而是同一套标准在每口井上得出不同的结论。</tspan></text>';

    s += '</svg>';
    return s;
  }

  /* ================= 图 2：三种映射函数允许的变形 ================= */
  function figMethod() {
    var W = 636, H = 272;
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="平移、均值方差、分位数映射三种校正函数在伽马读数上的形状差异">';

    function panel(ox, title, sub, kind) {
      var g = '';
      var px0 = ox + 30, px1 = ox + 176, pyb = 178, pyt = 62;
      var X = function (v) { return px0 + v / 150 * (px1 - px0); };
      var Y = function (v) { return pyb - v / 150 * (pyb - pyt); };

      g += '<text x="' + ox + '" y="26" font-size="10.5" font-weight="600" fill="#242b2e">' + title + '</text>';
      g += '<text x="' + ox + '" y="42" font-size="8.6" fill="#79828a">' + sub + '</text>';
      g += '<rect x="' + px0 + '" y="' + pyt + '" width="' + (px1 - px0) + '" height="' + (pyb - pyt) + '" fill="#fbfaf5" stroke="#e9e4d8"/>';

      /* 恒等线 */
      g += '<line x1="' + X(0) + '" y1="' + Y(0) + '" x2="' + X(150) + '" y2="' + Y(150) + '" stroke="#c9c2b0" stroke-dasharray="4 3"/>';

      /* 映射函数 */
      var f;
      if (kind === 'shift') f = function (x) { return x + 8; };
      else if (kind === 'mv') f = function (x) { return 60 + (x - 60) * 1.15; };
      else f = function (x) { return x <= 55 ? x - 4 : x < 85 ? x + 3 : x - 1; };

      if (kind === 'q') {
        var seg = [[0, f(0)], [55, f(55)], [85, f(85)], [150, f(150)]];
        var pts = seg.map(function (p) { return X(p[0]).toFixed(1) + ',' + Y(p[1]).toFixed(1); });
        g += '<polyline points="' + pts.join(' ') + '" fill="none" stroke="#2f7d6b" stroke-width="2.2"/>';
        seg.forEach(function (p) {
          g += '<circle cx="' + X(p[0]) + '" cy="' + Y(p[1]) + '" r="2.2" fill="#2f7d6b"/>';
        });
      } else {
        g += '<line x1="' + X(0) + '" y1="' + Y(Math.max(0, f(0))) + '" x2="' + X(150) + '" y2="' + Y(f(150)) +
          '" stroke="' + (kind === 'shift' ? '#7e5a8d' : '#41699b') + '" stroke-width="2.2"/>';
      }

      /* 60 这条线跑到哪去了 */
      var y60 = f(60);
      var col = kind === 'shift' ? '#7e5a8d' : kind === 'mv' ? '#41699b' : '#2f7d6b';
      g += '<line x1="' + X(60) + '" y1="' + pyb + '" x2="' + X(60) + '" y2="' + Y(y60) + '" stroke="#c0392b" stroke-width="1" stroke-dasharray="3 3"/>';
      g += '<line x1="' + X(60) + '" y1="' + Y(y60) + '" x2="' + px0 + '" y2="' + Y(y60) + '" stroke="#c0392b" stroke-width="1" stroke-dasharray="3 3"/>';
      g += '<circle cx="' + X(60) + '" cy="' + Y(y60) + '" r="3" fill="' + col + '"/>';
      g += '<text x="' + (px0 - 5) + '" y="' + (Y(y60) - 4) + '" font-size="8" font-family="monospace" fill="#c0392b" text-anchor="end">' + y60.toFixed(0) + '</text>';

      g += '<line x1="' + px0 + '" y1="' + pyb + '" x2="' + px1 + '" y2="' + pyb + '" stroke="#c9c2b0"/>';
      g += '<line x1="' + px0 + '" y1="' + pyb + '" x2="' + px0 + '" y2="' + pyt + '" stroke="#c9c2b0"/>';
      g += '<text x="' + ((px0 + px1) / 2) + '" y="' + (pyb + 14) + '" font-size="8" fill="#9ba3a9" text-anchor="middle">原始 GR</text>';
      g += '<text x="' + (px0 - 24) + '" y="' + ((pyt + pyb) / 2) + '" font-size="8" fill="#9ba3a9" text-anchor="middle" transform="rotate(-90 ' + (px0 - 22) + ' ' + ((pyt + pyb) / 2) + ')">校正后</text>';
      return g;
    }

    s += panel(14, '① 只平移', '所有读数加同一个数', 'shift');
    s += panel(226, '② 均值-方差', '先对中位、再按比例拉伸', 'mv');
    s += panel(438, '③ 分位数映射', '七个分位点逐段对齐', 'q');

    s += '<text x="14" y="216" font-size="9.3" fill="#5d666d">灰虚线是"什么都不改"（校正后 = 原始）。彩线才是校正函数：平移是一条斜率 1 的直线，均值-方差斜率大于 1（把分布拉宽），</text>';
    s += '<text x="14" y="230" font-size="9.3" fill="#5d666d">分位数映射是折线（每一段斜率都不同）。红点标出"原始 60 会被映射成多少"：平移 → 68，均值-方差 → 60，分位数 → 63。</text>';

    s += '<rect x="14" y="240" width="' + (W - 28) + '" height="26" rx="6" fill="#f2f7f5"/>';
    s += '<text x="26" y="257" font-size="9.3" fill="#3f6d61">参数从 1 个涨到 7 个，能拟合的形状越来越多，也越容易被标志层的样本噪声带跑 —— 这是这条案例最反直觉的一处。</text>';

    s += '</svg>';
    return s;
  }

  /* ================= 图 3：泥浆的偏移随岩性变化 ================= */
  function figMud() {
    var W = 636, H = 262;
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="KCl 泥浆对不同岩性的伽马抬升幅度不同，线性校正无法同时消除">';

    var x0 = 62, x1 = 424, y0 = 52, y1 = 196;
    var Y = function (v) { return y1 - v / 12 * (y1 - y0); };

    s += '<text x="20" y="26" font-size="10.5" font-weight="600" fill="#242b2e">同一口 KCl 井，四类岩性被抬高的幅度不一样</text>';
    s += '<text x="20" y="41" font-size="8.8" fill="#79828a">泥浆影响强度拉满时，各岩性相对"无泥浆"的 GR 附加偏移 / API</text>';

    [0, 3, 6, 9, 12].forEach(function (v) {
      s += '<line x1="' + x0 + '" y1="' + Y(v) + '" x2="' + x1 + '" y2="' + Y(v) + '" stroke="#eeeae0"/>';
      s += '<text x="' + (x0 - 6) + '" y="' + (Y(v) + 3) + '" font-size="8.5" font-family="monospace" fill="#9ba3a9" text-anchor="end">' + v + '</text>';
    });

    var B = [
      ['砂岩', 11.0, '#d9b45c'], ['泥质砂岩', 8.8, '#9aa95e'],
      ['泥岩', 3.9, '#8b8878'], ['灰岩', -1.1, '#7d9cbd']
    ];
    var bw = 44;
    B.forEach(function (b, i) {
      var cx = x0 + 56 + i * 84;
      var top = b[0] === undefined ? y1 : (b[1] >= 0 ? Y(b[1]) : y1);
      var h = Math.abs(Y(b[1]) - Y(0));
      if (b[1] >= 0) {
        s += '<rect x="' + (cx - bw / 2) + '" y="' + Y(b[1]) + '" width="' + bw + '" height="' + h + '" fill="' + b[2] + '" fill-opacity=".7" rx="2"/>';
        s += '<text x="' + cx + '" y="' + (Y(b[1]) - 5) + '" font-size="9" font-family="monospace" fill="#5d666d" text-anchor="middle">+' + b[1].toFixed(1) + '</text>';
      } else {
        s += '<rect x="' + (cx - bw / 2) + '" y="' + Y(0) + '" width="' + bw + '" height="' + h + '" fill="' + b[2] + '" fill-opacity=".7" rx="2"/>';
        s += '<text x="' + cx + '" y="' + (Y(0) + h + 11) + '" font-size="9" font-family="monospace" fill="#5d666d" text-anchor="middle">' + b[1].toFixed(1) + '</text>';
      }
      s += '<text x="' + cx + '" y="' + (y1 + 15) + '" font-size="9" fill="#5d666d" text-anchor="middle">' + b[0] + '</text>';
    });
    s += '<line x1="' + x0 + '" y1="' + Y(0) + '" x2="' + x1 + '" y2="' + Y(0) + '" stroke="#c9c2b0"/>';

    /* 右侧结论 */
    var AX = 450;
    s += '<text x="' + AX + '" y="' + (y0 + 2) + '" font-size="9.8" font-weight="600" fill="#242b2e">为什么平移修不掉</text>';
    s += '<text x="' + AX + '" y="' + (y0 + 20) + '" font-size="9" fill="#5d666d">平移是"所有深度加同一个数"。</text>';
    s += '<text x="' + AX + '" y="' + (y0 + 34) + '" font-size="9" fill="#5d666d">而这里砂岩多抬 12 API、灰岩反而略降，</text>';
    s += '<text x="' + AX + '" y="' + (y0 + 48) + '" font-size="9" fill="#5d666d">幅度本身随岩性变 —— 一个常数不可能</text>';
    s += '<text x="' + AX + '" y="' + (y0 + 62) + '" font-size="9" fill="#5d666d">同时把四类都归零。</text>';
    s += '<text x="' + AX + '" y="' + (y0 + 84) + '" font-size="9" fill="#c0392b">实测：泥浆拉满时，</text>';
    s += '<text x="' + AX + '" y="' + (y0 + 98) + '" font-size="9" fill="#c0392b">四种方法都停在 0.70 附近，</text>';
    s += '<text x="' + AX + '" y="' + (y0 + 112) + '" font-size="9" fill="#c0392b">净毛比仍偏 1 个百分点以上。</text>';
    s += '<text x="' + AX + '" y="' + (y0 + 134) + '" font-size="9" fill="#2f7d6b">正解：按岩性分组标准化，</text>';
    s += '<text x="' + AX + '" y="' + (y0 + 148) + '" font-size="9" fill="#2f7d6b">或把泥浆体系当特征喂给模型。</text>';

    s += '</svg>';
    return s;
  }

  /* ================= 图 4：统计段长度 → 四种方法的成败 ================= */
  function figSweep() {
    var W = 636, H = 306;
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="统计段样本数增加时四种标准化方法的重合度变化，分位数映射在样本少时反而最差">';

    var x0 = 66, x1 = 600, y0 = 50, y1 = 208;
    var X = function (n) { return x0 + (Math.log(n) - Math.log(24)) / (Math.log(225) - Math.log(24)) * (x1 - x0); };
    var Y = function (v) { return y1 - (v - 0.60) / 0.25 * (y1 - y0); };

    [0.60, 0.65, 0.70, 0.75, 0.80, 0.85].forEach(function (v) {
      s += '<line x1="' + x0 + '" y1="' + Y(v) + '" x2="' + x1 + '" y2="' + Y(v) + '" stroke="#eeeae0"/>';
      s += '<text x="' + (x0 - 6) + '" y="' + (Y(v) + 3) + '" font-size="8.5" font-family="monospace" fill="#9ba3a9" text-anchor="end">' + v.toFixed(2) + '</text>';
    });
    [24, 40, 64, 96, 128, 192, 225].forEach(function (n) {
      s += '<text x="' + X(n) + '" y="' + (y1 + 14) + '" font-size="8.5" font-family="monospace" fill="#9ba3a9" text-anchor="middle">' + n + '</text>';
    });
    s += '<line x1="' + x0 + '" y1="' + y1 + '" x2="' + x1 + '" y2="' + y1 + '" stroke="#c9c2b0"/>';

    s += '<text x="' + x0 + '" y="26" font-size="10.5" font-weight="600" fill="#242b2e">统计段的样本数，决定了这些方法能不能用</text>';
    s += '<text x="' + x0 + '" y="41" font-size="8.8" fill="#79828a">纵轴 = 直方图重合度（相对参考井），横轴 = 标志层统计段包含的采样点数（对数轴），漂移 0.8、无泥浆影响</text>';

    var SER = [
      { n: '不校正', c: '#b26a39', d: [0.722, 0.722, 0.722, 0.722, 0.722, 0.722, 0.722], dash: [5, 3] },
      { n: '平移', c: '#7e5a8d', d: [0.788, 0.761, 0.790, 0.781, 0.780, 0.789, 0.790] },
      { n: '均值-方差', c: '#41699b', d: [0.767, 0.771, 0.805, 0.809, 0.804, 0.802, 0.809] },
      { n: '分位数映射', c: '#2f7d6b', d: [0.629, 0.718, 0.754, 0.782, 0.788, 0.808, 0.814] }
    ];
    var NODES = [24, 40, 64, 96, 128, 192, 225];
    SER.forEach(function (se) {
      var pts = se.d.map(function (v, i) { return X(NODES[i]).toFixed(1) + ',' + Y(v).toFixed(1); });
      s += '<polyline points="' + pts.join(' ') + '" fill="none" stroke="' + se.c + '" stroke-width="' + (se.n === '不校正' ? 1.4 : 2) +
        '" stroke-dasharray="' + (se.dash ? se.dash.join(' ') : 'none') + '"/>';
      se.d.forEach(function (v, i) {
        s += '<circle cx="' + X(NODES[i]) + '" cy="' + Y(v) + '" r="2.2" fill="' + se.c + '"/>';
      });
    });

    /* 关键标注 */
    s += '<circle cx="' + X(24) + '" cy="' + Y(0.629) + '" r="5" fill="none" stroke="#c0392b" stroke-width="1.4"/>';
    s += '<text x="' + (X(24) + 10) + '" y="' + (Y(0.629) + 14) + '" font-size="8.5" fill="#c0392b">24 点时分位数映射比不校正还差</text>';

    SER.forEach(function (se, i) {
      var lx = x0 + i * 128;
      s += '<line x1="' + lx + '" y1="' + (y1 + 34) + '" x2="' + (lx + 16) + '" y2="' + (y1 + 34) + '" stroke="' + se.c + '" stroke-width="2" stroke-dasharray="' + (se.dash ? se.dash.join(' ') : 'none') + '"/>';
      s += '<text x="' + (lx + 21) + '" y="' + (y1 + 37) + '" font-size="9" fill="#5d666d">' + se.n + '</text>';
    });

    s += '<line x1="' + X(40) + '" y1="' + y0 + '" x2="' + X(40) + '" y2="' + y1 + '" stroke="#e9e4d8" stroke-dasharray="3 4"/>';
    s += '<text x="' + (X(40) + 4) + '" y="' + (y0 + 10) + '" font-size="8" fill="#9ba3a9">40 点</text>';

    s += '</svg>';
    return s;
  }

  /* ================= 数据清单 ================= */
  var DATA = [
    ['测井曲线', 'GR 为主，辅以 SP / CAL / DEN；0.125—0.25 m 采样', 'GR 是刻度漂移最敏感的一条'],
    ['标志层（标准层）', '全区稳定分布、厚度足够、岩性单一', '统计段建议 ≥20 m，样本 ≥80 点'],
    ['测井说明书', '仪器型号、刻度记录、测井年代', '判断漂移来源，决定要不要做增益校正'],
    ['钻井液记录', '泥浆体系（是否 KCl / 重晶石）、密度', '泥浆相关的偏移修不掉，要单独处理'],
    ['岩心或测试资料', '少量真实孔隙度、试油结论', '唯一能验证"标准化后结论对不对"的依据'],
    ['老井解释成果', '作为全区基准的参考井', '参考井选错，后面全错']
  ];

  return {

    id: 'w5-normalization',
    sceneId: 'w5',
    title: '多井曲线标准化',
    summary: '截止值不通用，同一套地层两条直方图对不上',
    status: 'ready',
    version: '1.0.0',
    updated: '2026-10-26',
    methods: ['ts'],

    tabs: {
      background: {
        label: '专业背景',

        judge: [
          { label: '任务类型', value: '分布对齐', desc: '同一套刻度，跨井可比', html: '<span style="color:var(--c-ts)">直方图匹配</span>' },
          { label: '数据门槛', value: '标志层 + 参考井', desc: '标志层统计段 ≥20 m 才稳' },
          { label: '收益', value: '重合度 0.72 → 0.80', desc: '净毛比偏差 3.3 → 1.4 个百分点', html: '<b style="color:var(--jade-d);font-family:var(--mono)">−1.9 pp</b>' },
          { label: '难度', value: '易', desc: '算法极简，坑全在"样本够不够"', html: K.dtag('易') }
        ],

        lede: '同一套地层、同一批岩性，在不同年代、不同仪器、不同泥浆体系下测出来的伽马曲线，整体能差十几到几十 API。不把它们拉到同一个基准上，任何跨井比较 —— 净毛比、砂体厚度、储层评价 —— 都会得出"每口井都不一样"的结论。',

        sections: [
          {
            no: 1, en: 'PROBLEM', title: '截止值不通用',
            html: '<p>测井解释里到处是<b>绝对阈值</b>：GR &lt; 60 算砂岩、GR &gt; 75 算泥岩、Vsh &lt; 0.4 算有效储层。这些数字都是从某一口"标准井"上试出来的，然后被抄进解释规范，套用到全区每口井上。</p>' +
              '<p>问题是<b>每口井的 60 不是同一个 60</b>。仪器增益偏 5%、零点偏 10 API，同一条 60 在不同井上切出的砂岩比例就不同 —— 而这一切不会报错，只是安静地让某口井的净毛比高 10 个百分点。</p>' +
              K.figure(figShift(), 1, '同一套地层、相同的岩性比例，真值净毛比都是 45.2%。1 号井伽马整体压低 10 API，中位数从 61 降到 52，于是 GR=60 这条线在它身上切得更靠右，净毛比变成 **54.8%** —— 偏高 9.6 个百分点。做完标志层平移，回到 44.4%。') +
              '<p>这不是"精度问题"，是<b>可比性问题</b>。两口井的净毛比不可比，后面的储量计算、井间对比、选区评价全部失效，而每一步都看不出异常。</p>'
          },
          {
            no: 2, en: 'INTERVENTION', title: '把直方图拉齐',
            html: '<p>标准化的思路很朴素：<b>找一段全区都有的地层（标志层），把它在每口井上的读数统计对齐</b>，然后把这个对齐关系套用到整条曲线。标志层最好是稳定沉积的泥岩或灰岩，厚度足够、岩性单一。</p>' +
              '<p>对齐方式有三档，区别在于"允许怎么变形"：<b>只平移</b>（1 个参数）、<b>均值-方差</b>（2 个参数，同时改位置和宽度）、<b>分位数映射</b>（7 个参数，逐段拉伸）。参数越多，理论上越能拟合；实际上也越容易被样本噪声带跑 —— 这一点后面会用数字说话。</p>' +
              K.figure(figMethod(), 2, '三种对齐方式：平移只动位置；均值-方差同时改位置和宽度；分位数映射把 7 个分位点两两对齐、中间线性插值。**灰线是参考井的标志层分布，橙线是要修的那条曲线**，竖虚线是 GR=60 截止值。') +
              K.callout('这条案例最值得记住的一句：**决定标准化成败的不是"选哪个算法"，而是"标志层统计段有多长"。** 24 个样本估出来的标准差，误差本身就有 ±20% —— 拿它去缩放，等于把噪声当成了刻度差。')
          },
          {
            no: 3, en: 'DATA', title: '你需要准备什么',
            html: '<p style="margin-bottom:14px">标准化要的数据少，但要得<b>准</b>：一段真正全区稳定的标志层，一口刻度可信的参考井，一份能说明漂移来源的测井说明书。</p>' +
              K.checklist(DATA) +
              '<p style="margin-top:18px"><span class="kicker plain" style="color:var(--ink-4)">可参考的公开数据集</span></p>' +
              K.refs(['FORCE 2020（多井、多年代测井）', 'Kansas Geological Survey 公开测井库', 'Equinor Volve（含测井说明书与泥浆记录）'], null)
          },
          {
            no: 4, en: 'DIFFICULTY', title: '技术难度与参考方向',
            html: '<div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-bottom:2px">' +
              K.dtag('易') + '<span class="small muted">算法本身几行代码；难在判断"这个偏移是常数还是随岩性变化"。</span></div>' +
              K.meter('易') +
              '<p>真正的难点不在算法，而在<b>判断漂移的性质</b>。如果只是仪器零点/增益的差异，一条两点映射就能修好；如果是泥浆体系带来的、<b>随岩性变化</b>的偏移，任何一条直线映射都修不掉 —— 修完只是把残差挪了个位置。</p>' +
              K.figure(figMud(), 3, 'KCl 泥浆对不同岩性的伽马抬升幅度不同：砂岩 +11.0、泥质砂岩 +8.8、泥岩 +3.9、灰岩 −1.1 API。平移是"所有深度加同一个数"，而这里的偏移幅度本身随岩性变 —— **一个常数不可能同时把四类都归零**。实测：泥浆拉满时四种方法都停在 0.70 附近，净毛比仍偏 1 个百分点以上。') +
              '<p style="margin-top:18px"><span class="kicker plain" style="color:var(--ink-4)">可借鉴的通用技术</span></p>' +
              K.refs(['直方图匹配 / 分位数映射', '稳健统计（中位数与 IQR）', '分层/分组标准化', '域适应（domain adaptation）'], '#/method/ts') +
              '<p style="margin-top:18px" class="small muted">交叉环节：<a href="#/stage/welllog" style="color:var(--jade-d);font-weight:600">测井</a> · <a href="#/stage/mudlog" style="color:var(--jade-d);font-weight:600">录井</a> · <a href="#/stage/reservoir" style="color:var(--jade-d);font-weight:600">油藏</a></p>'
          }
        ]
      },

      workflow: {
        label: '案例流程',
        title: '案例：一个区块 10 口井的伽马曲线标准化',
        lead: [
          '10 口井钻穿同一套 96 m 地层，其中 0 号井是刻度可信的老井，作为全区基准；其余 9 口井的仪器增益与零点各不相同，其中一半用了 KCl 泥浆。每口井 385 个采样点。',
          '标准化的效果不能只看"修完像不像"，要落到**净毛比**上：同一套 GR<60 的判据，标准化前后每口井的净毛比与真值差多少、有几口井的结论会翻。'
        ],
        stats: [
          ['井数', '10（1 参考 + 9 检验）', true], ['研究井段', '96 m / 385 点', true],
          ['标志层', '40—46 m 灰岩', true], ['真值净毛比', '45.2%'],
          ['不校正偏差', '3.3 pp / 3 口翻转'], ['案例结果', '1.4 pp / 0 口']
        ],
        steps: [
          {
            name: '选标志层与参考井', role: '质控',
            do: '在全区所有井上找一段稳定分布的标准层，确认每口井都钻到了、没有缺失、没有被构造削截；再选一口刻度可信、年代较新的井作基准。参考井选错，后面全错。',
            effect: '给全区的"同一个 60"下定义',
            trap: '标志层选在相变带上，各井根本不是同一套沉积，怎么对齐都是错的'
          },
          {
            name: '统计段长度评估', role: '质控',
            do: '数一数统计段里有多少个采样点。少于 40 点就只能做平移；要做方差或分位数校正，统计段至少拉到 20 m（约 80 点），否则估计误差比它要修的东西还大。',
            effect: '决定用 1 个参数还是 7 个参数',
            trap: '拿 24 个点估标准差，估计误差 ±20%，缩放完比不校正还差'
          },
          {
            name: '选择对齐方式并套用到全井', role: '算法核心',
            do: '用标志层的统计量构造映射函数（平移 / 均值-方差 / 分位数），套用到整条曲线。注意映射只由标志层决定，全井曲线不参与拟合 —— 否则就是把答案算进了题目。',
            effect: '全井直方图向参考井收拢，重合度从 0.72 提到 0.80',
            trap: '用目标井自己的全井直方图去匹配，会把真实的地层差异一起抹掉'
          },
          {
            name: '效果校验：重合度 + 净毛比双指标', role: '质控',
            do: '既看直方图重合度，也看截止值附近的净毛比变化。两个指标会打架 —— 整体分布对得很齐，不代表 60 附近也对得齐。',
            effect: '"看起来对"变成"净毛比偏差 1.4 个百分点、0 口井翻转"',
            trap: '只报重合度，掩盖了截止值附近的局部残差'
          },
          {
            name: '残余偏移归因', role: '闭环',
            do: '对修完仍有系统偏差的井，查它的泥浆体系和测井年代。若偏移随岩性变化（砂岩抬得多、灰岩几乎不抬），说明是泥浆影响，只能按岩性分组再校一次，或直接把它作为特征交给下游模型。',
            effect: '把"修不好"变成"知道为什么修不好"',
            trap: '硬用一条直线去修岩性相关的偏移，修完残差换个位置继续存在'
          }
        ],
        metrics: {
          title: '怎么算"标准化到位了"',
          html: '<p>两个指标一起看：<b>直方图重合度</b>（全井分布的整体相似度，1.00 为完全重合）和<b>净毛比偏差</b>（截止值附近的局部指标）。只看前者会漏掉截止值附近的残差；只看后者不知道问题出在整体还是局部。</p>' +
            K.figure(figSweep(), 4, '把统计段从 24 点拉到 225 点，四种方法的重合度怎么变。**分位数映射在 24 点只有 0.629 —— 比完全不校正的 0.722 还差**：它一次要估 7 个分位点，每个分位点又被 24 个样本的噪声支配，映射函数本身成了噪声放大器。样本够了（≥96 点）它才反超，最后到 0.814。') +
            K.dtable(['方法', '参数个数', '24 点（6 m）重合度', '128 点（32 m）重合度', '净毛比偏差'], [
              ['不校正', '—', '0.722', '0.722', '3.3 pp / 3 口翻转'],
              ['标志层平移', '1', '0.788', '0.780', '1.0 pp / 0 口'],
              ['均值-方差', '2', '0.767', '0.804', '1.4 pp / 0 口'],
              ['分位数映射', '7', '0.629', '0.788', '1.6 pp / 1 口'],
              ['泥浆拉满（对照）', '—', '0.643 → 0.698', '0.643 → 0.735', '≥1.0 pp，修不到零']
            ]) +
            '<p style="margin-top:12px" class="small muted">漂移强度 0.8，前四行为无泥浆影响；全部由 <code>tools/test-w5n.js</code> 与 <code>tools/probe-w5n.js</code> 复算。</p>'
        },
        fails: [
          { name: '用薄标志层估标准差', why: '24 个采样点估出的标准差，相对误差约 ±20%。拿它去缩放整条曲线，等于把噪声当成刻度差 —— 均值-方差的重合度 0.767 反而不如只平移的 0.788，分位数映射更是掉到 0.629（低于不校正的 0.722）。' },
          { name: '重合度高 ≠ 净毛比准', why: '泥浆影响下，分位数映射在 128 点时重合度 0.788（最高），净毛比偏差却有 1.7 个百分点、2 口井翻转；平移的重合度只有 0.735，偏差却只有 0.8。整体分布对齐不等于截止值附近对齐。' },
          { name: '用全井直方图去匹配', why: '目标井自己的分布不参与"应该长什么样"的判断。如果某口井多钻了一套砂体，全井匹配会把一部分砂岩硬改成泥岩 —— 重合度会很漂亮，地质结论全错。映射只能由标志层定。' },
          { name: '泥浆带来的岩性相关偏移', why: 'KCl 泥浆抬升 GR 的幅度：砂岩 +11.0、泥质砂岩 +8.8、泥岩 +3.9、灰岩 −1.1 API。任何一条直线映射都修不掉这种与岩性相关的偏移，四种方法在泥浆拉满时都停在 0.70 附近。' }
        ]
      },

      demo: {
        label: '可运行示范',
        intro: '拖"标志层统计段"从 6 m 拉到 48 m，看分位数映射怎么从"比不校正还差"变成"最好"；切四个方法对比；再把"KCl 泥浆影响"拉满，看四种方法为什么都停在 0.70 附近收不了尾。',
        height: 790
      }
    },

    demoGlobal: 'W5NDEMO'
  };
};
