/* =========================================================
   m1 · 岩屑岩性自动识别 —— 案例正文（单一源）
   ---------------------------------------------------------
   正文里每个数字都来自 tools/test-m1.js 与 tools/probe-m1.js 的实测输出。
   ========================================================= */

module.exports = function (K) {

  var LITH = [
    { n: '砂岩', c: '#c9a04a' },
    { n: '泥岩', c: '#7a7768' },
    { n: '灰岩', c: '#4a7a9b' },
    { n: '白云岩', c: '#9db4c0' }
  ];

  /* ================= 图 1：岩屑不是从钻头直接蹦到振动筛上的 ================= */
  function figLag() {
    var W = 636, H = 252;
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="岩屑迟到时间示意与迟到时间误差对岩性识别宏F1的衰减曲线">';

    /* ---------- 左：井筒示意 ---------- */
    s += '<text x="30" y="24" font-size="10.5" font-weight="600" fill="#242b2e">岩屑的“回家路”</text>';
    s += '<text x="30" y="38" font-size="8.6" fill="#79828a">钻头破碎 → 环空上返 → 振动筛取样</text>';

    /* 地面线 */
    s += '<line x1="36" y1="64" x2="212" y2="64" stroke="#c9c2b0"/>';
    s += '<text x="36" y="60" font-size="7.5" fill="#9ba3a9">地面</text>';

    /* 井壁 */
    s += '<line x1="104" y1="64" x2="104" y2="212" stroke="#c9c2b0" stroke-width="1.4"/>';
    s += '<line x1="176" y1="64" x2="176" y2="212" stroke="#c9c2b0" stroke-width="1.4"/>';

    /* 钻杆 */
    s += '<rect x="126" y="46" width="28" height="150" fill="#eeeae0" stroke="#d8d0be"/>';
    s += '<text x="140" y="80" font-size="7" fill="#9ba3a9" text-anchor="middle" transform="rotate(-90 140 80)">钻杆</text>';

    /* 钻头 */
    s += '<path d="M106 196 L174 196 L152 210 L128 210 Z" fill="#8b8878"/>';

    /* 环空上返箭头 + 岩屑颗粒 */
    var dots = [[115, 186], [115, 158], [115, 128], [115, 96], [115, 74]];
    dots.forEach(function (d, i) {
      s += '<circle cx="' + d[0] + '" cy="' + d[1] + '" r="2.6" fill="#b26a39" fill-opacity=".75"/>';
    });
    s += '<path d="M115 178 L112 183 L118 183 Z" fill="#b26a39" fill-opacity=".85"/>';
    s += '<path d="M115 118 L112 123 L118 123 Z" fill="#b26a39" fill-opacity=".85"/>';
    s += '<path d="M115 88 L112 93 L118 93 Z" fill="#b26a39" fill-opacity=".85"/>';

    /* 振动筛 */
    s += '<rect x="182" y="46" width="42" height="16" rx="3" fill="#f2ece0" stroke="#c9c2b0"/>';
    s += '<text x="203" y="57" font-size="7" fill="#5d666d" text-anchor="middle">振动筛</text>';
    s += '<path d="M176 68 Q180 52 182 52" fill="none" stroke="#b26a39" stroke-width="1.1" stroke-dasharray="2 2"/>';

    /* 井深标尺 */
    s += '<line x1="206" y1="64" x2="206" y2="210" stroke="#ddd6c6"/>';
    s += '<line x1="202" y1="64" x2="210" y2="64" stroke="#ddd6c6"/>';
    s += '<line x1="202" y1="210" x2="210" y2="210" stroke="#ddd6c6"/>';
    s += '<text x="214" y="140" font-size="7.5" fill="#9ba3a9" transform="rotate(-90 214 140)" text-anchor="middle">60 m</text>';

    /* 迟到时间公式 */
    s += '<text x="30" y="232" font-size="9" fill="#8c5340">迟到时间 = （环空容积 ÷ 排量） ÷ 60</text>';
    s += '<text x="30" y="245" font-size="8" fill="#9ba3a9">本井 60 m 井段，机械钻速 24 m/h，每分钟钻进 0.40 m</text>';

    /* ---------- 右：衰减曲线 ---------- */
    var x0 = 320, x1 = 606, yb = 196, yt = 56;
    var X = function (m) { return x0 + m / 8 * (x1 - x0); };
    var Y = function (v) { return yb - v / 100 * (yb - yt); };

    s += '<text x="320" y="24" font-size="10.5" font-weight="600" fill="#242b2e">迟到时间错几分钟，剖面就错开几米</text>';
    s += '<text x="320" y="38" font-size="8.6" fill="#79828a">同一套特征、同一份标注，只改深度对齐</text>';

    [0, 25, 50, 75, 100].forEach(function (v) {
      s += '<line x1="' + x0 + '" y1="' + Y(v) + '" x2="' + x1 + '" y2="' + Y(v) + '" stroke="#f0ece2"/>';
      s += '<text x="' + (x0 - 6) + '" y="' + (Y(v) + 3) + '" font-size="8" font-family="monospace" fill="#9ba3a9" text-anchor="end">' + v + '%</text>';
    });
    s += '<text x="' + (x0 - 40) + '" y="' + ((yt + yb) / 2) + '" font-size="8.5" fill="#9ba3a9" text-anchor="middle" transform="rotate(-90 ' + (x0 - 40) + ' ' + (yt + yb) / 2 + ')">宏 F1</text>';

    var P = [[0, 95.1], [1, 78.9], [2, 61.5], [3, 45.9], [4, 34.7], [6, 17.4], [8, 10.4]];
    var pts = P.map(function (p) { return X(p[0]).toFixed(1) + ',' + Y(p[1]).toFixed(1); });
    s += '<polygon points="' + X(0) + ',' + yb + ' ' + pts.join(' ') + ' ' + X(8) + ',' + yb + '" fill="#b26a39" fill-opacity=".09"/>';
    s += '<polyline points="' + pts.join(' ') + '" fill="none" stroke="#b26a39" stroke-width="2"/>';
    P.forEach(function (p) {
      s += '<circle cx="' + X(p[0]) + '" cy="' + Y(p[1]) + '" r="2.6" fill="#fff" stroke="#b26a39" stroke-width="1.5"/>';
    });

    /* 2 min 处的标注 */
    s += '<line x1="' + X(2) + '" y1="' + Y(61.5) + '" x2="' + X(2) + '" y2="' + yb + '" stroke="#c0392b" stroke-width="1" stroke-dasharray="4 3"/>';
    s += '<line x1="' + x0 + '" y1="' + Y(61.5) + '" x2="' + X(2) + '" y2="' + Y(61.5) + '" stroke="#c0392b" stroke-width="1" stroke-dasharray="4 3"/>';
    s += '<circle cx="' + X(2) + '" cy="' + Y(61.5) + '" r="4" fill="#c0392b"/>';
    s += '<text x="' + (X(2) + 8) + '" y="' + (Y(61.5) - 6) + '" font-size="8.5" font-weight="600" fill="#c0392b">2 min → 错位 0.80 m → 61.5%</text>';
    s += '<text x="' + (x0 + 8) + '" y="' + (Y(95.1) - 8) + '" font-size="8.5" fill="#5d666d">深度对齐 · 95.1%</text>';

    /* 轴 */
    s += '<line x1="' + x0 + '" y1="' + yb + '" x2="' + x1 + '" y2="' + yb + '" stroke="#c9c2b0"/>';
    [[0, '0.00'], [2, '0.80'], [4, '1.60'], [6, '2.40'], [8, '3.20']].forEach(function (t) {
      s += '<line x1="' + X(t[0]) + '" y1="' + yb + '" x2="' + X(t[0]) + '" y2="' + (yb + 4) + '" stroke="#c9c2b0"/>';
      s += '<text x="' + X(t[0]) + '" y="' + (yb + 15) + '" font-size="8" font-family="monospace" fill="#79828a" text-anchor="middle">' + t[0] + ' min</text>';
      s += '<text x="' + X(t[0]) + '" y="' + (yb + 26) + '" font-size="7.5" font-family="monospace" fill="#b26a39" text-anchor="middle">' + t[1] + ' m</text>';
    });
    s += '<text x="' + ((x0 + x1) / 2) + '" y="' + (yb + 42) + '" font-size="9" fill="#79828a" text-anchor="middle">迟到时间误差 / 对应深度错位　（10% 主动标注）</text>';

    s += '</svg>';
    return s;
  }

  /* ================= 图 2：一张图看不准，要四个维度一起看 ================= */
  function figFeature() {
    var W = 636, H = 300;
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="四类岩屑在色调与碳酸盐反应两维上的分布，以及单特征与四维联合的分类准确率对比">';

    /* 确定性随机，保证每次渲染一致 */
    function lcg(a) { return function () { a = (a * 1103515245 + 12345) & 0x7fffffff; return a / 0x7fffffff; }; }
    var rnd = lcg(20261026);
    function gs() { return (rnd() + rnd() + rnd() + rnd() - 2) * 0.75; }

    var px0 = 48, px1 = 306, pyb = 244, pyt = 62;
    var PX = function (v) { return px0 + v * (px1 - px0); };
    var PY = function (v) { return pyb - v * (pyb - pyt); };

    s += '<text x="30" y="26" font-size="10.5" font-weight="600" fill="#242b2e">两个最容易看错的维度</text>';
    s += '<text x="30" y="41" font-size="8.6" fill="#79828a">色调 × 碳酸盐反应，每类 40 个模拟样本</text>';

    s += '<rect x="' + px0 + '" y="' + pyt + '" width="' + (px1 - px0) + '" height="' + (pyb - pyt) + '" fill="#fbfaf5" stroke="#e9e4d8"/>';
    [0, 0.25, 0.5, 0.75, 1].forEach(function (v) {
      s += '<line x1="' + PX(v) + '" y1="' + pyt + '" x2="' + PX(v) + '" y2="' + pyb + '" stroke="#f0ece2"/>';
      s += '<line x1="' + px0 + '" y1="' + PY(v) + '" x2="' + px1 + '" y2="' + PY(v) + '" stroke="#f0ece2"/>';
    });

    var CEN = [[0.57, 0.10], [0.33, 0.13], [0.15, 0.76], [0.19, 0.62]];
    CEN.forEach(function (c, k) {
      for (var i = 0; i < 40; i++) {
        var xx = Math.max(0.02, Math.min(0.98, c[0] + gs() * 0.105));
        var yy = Math.max(0.02, Math.min(0.98, c[1] + gs() * 0.105));
        s += '<circle cx="' + PX(xx).toFixed(1) + '" cy="' + PY(yy).toFixed(1) + '" r="2.1" fill="' + LITH[k].c + '" fill-opacity=".45"/>';
      }
    });
    CEN.forEach(function (c, k) {
      s += '<circle cx="' + PX(c[0]) + '" cy="' + PY(c[1]) + '" r="4.4" fill="none" stroke="' + LITH[k].c + '" stroke-width="1.6"/>';
    });
    /* 质心标签 */
    s += '<text x="' + PX(0.08) + '" y="' + PY(0.86) + '" font-size="8.5" fill="' + LITH[2].c + '" font-weight="600">灰岩</text>';
    s += '<text x="' + PX(0.21) + '" y="' + (PY(0.13) + 3) + '" font-size="8.5" fill="' + LITH[1].c + '" font-weight="600" text-anchor="end">泥岩</text>';
    s += '<text x="' + PX(0.71) + '" y="' + (PY(0.10) + 3) + '" font-size="8.5" fill="' + LITH[0].c + '" font-weight="600">砂岩</text>';
    /* 白云岩：引线拉到下方空白带，避开点云 */
    s += '<line x1="' + PX(0.19) + '" y1="' + PY(0.60) + '" x2="' + PX(0.22) + '" y2="' + PY(0.49) + '" stroke="#9db4c0" stroke-width="1"/>';
    s += '<text x="' + (PX(0.22) + 4) + '" y="' + (PY(0.47) + 3) + '" font-size="8.5" fill="#5d7f8c" font-weight="600">白云岩</text>';

    /* 灰岩—白云岩 距离标注 */
    s += '<line x1="' + PX(0.15) + '" y1="' + PY(0.76) + '" x2="' + PX(0.19) + '" y2="' + PY(0.62) + '" stroke="#c0392b" stroke-width="1.1" stroke-dasharray="3 2"/>';
    s += '<text x="' + (PX(0.30) + 4) + '" y="' + (PY(0.69) + 3) + '" font-size="8" fill="#c0392b">相距只有 0.15</text>';

    s += '<text x="' + ((px0 + px1) / 2) + '" y="' + (pyb + 16) + '" font-size="8.5" fill="#79828a" text-anchor="middle">色调（0 冷灰 → 1 暖黄）</text>';
    s += '<text x="' + (px0 - 6) + '" y="' + ((pyt + pyb) / 2) + '" font-size="8.5" fill="#79828a" text-anchor="middle" transform="rotate(-90 ' + (px0 - 6) + ' ' + (pyt + pyb) / 2 + ')">碳酸盐反应</text>';

    /* ---------- 右：单特征 vs 四维 ---------- */
    var bx0 = 348, bx1 = 600, byb = 244, byt = 76;
    var BY = function (v) { return byb - v / 100 * (byb - byt); };
    s += '<text x="348" y="26" font-size="10.5" font-weight="600" fill="#242b2e">只看一个维度，天花板就在 70%</text>';
    s += '<text x="348" y="41" font-size="8.6" fill="#79828a">总准确率，同一份 10% 标注（红虚线 = 70% 天花板）</text>';

    [0, 50, 100].forEach(function (v) {
      s += '<line x1="' + bx0 + '" y1="' + BY(v) + '" x2="' + bx1 + '" y2="' + BY(v) + '" stroke="#f0ece2"/>';
      s += '<text x="' + (bx0 - 5) + '" y="' + (BY(v) + 3) + '" font-size="8" font-family="monospace" fill="#9ba3a9" text-anchor="end">' + v + '%</text>';
    });
    s += '<line x1="' + bx0 + '" y1="' + BY(70) + '" x2="' + bx1 + '" y2="' + BY(70) + '" stroke="#c0392b" stroke-width="1" stroke-dasharray="5 3"/>';

    var BARS = [['色调', 65.8], ['粒径', 59.8], ['分选', 52.2], ['碳酸盐', 70.1]];
    BARS.forEach(function (b, i) {
      var cx = bx0 + 26 + i * 52;
      var dy = Math.abs(b[1] - 70) < 9 ? 16 : 5;
      s += '<rect x="' + (cx - 17) + '" y="' + BY(b[1]) + '" width="34" height="' + (byb - BY(b[1])) + '" fill="#8b9188" fill-opacity=".55" rx="2"/>';
      s += '<text x="' + cx + '" y="' + (BY(b[1]) - dy) + '" font-size="8" font-family="monospace" fill="#5d666d" text-anchor="middle">' + b[1].toFixed(1) + '</text>';
      s += '<text x="' + cx + '" y="' + (byb + 14) + '" font-size="8" fill="#79828a" text-anchor="middle">' + b[0] + '</text>';
    });
    /* 四维柱 */
    var cx4 = bx0 + 26 + 4 * 52 + 6;
    s += '<rect x="' + (cx4 - 20) + '" y="' + BY(95.1) + '" width="40" height="' + (byb - BY(95.1)) + '" fill="#2f7d6b" fill-opacity=".78" rx="2"/>';
    s += '<text x="' + cx4 + '" y="' + (BY(95.1) - 5) + '" font-size="8.5" font-family="monospace" font-weight="600" fill="#2f7d6b" text-anchor="middle">95.1</text>';
    s += '<text x="' + cx4 + '" y="' + (byb + 14) + '" font-size="8" font-weight="600" fill="#2f7d6b" text-anchor="middle">四维联合</text>';

    s += '<line x1="' + bx0 + '" y1="' + byb + '" x2="' + bx1 + '" y2="' + byb + '" stroke="#c9c2b0"/>';

    /* 说明条 */
    s += '<rect x="24" y="262" width="' + (W - 48) + '" height="28" rx="6" fill="#fbf3ed"/>';
    s += '<text x="36" y="280" font-size="9.3" fill="#8c5340">碳酸盐岩这一对（灰岩 / 白云岩）在色调上几乎重合，在碳酸盐反应上也只差 0.14 —— <tspan font-weight="600">再好的分类器也只能做到 90% 左右，这是数据本身的极限。</tspan></text>';

    s += '</svg>';
    return s;
  }

  /* ================= 图 3：混淆矩阵 + 错位前后每类 F1 ================= */
  function figConfuse() {
    var W = 636, H = 306;
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="四类岩屑识别的混淆矩阵，以及深度对齐与错位两分钟时每类F1的对比">';

    s += '<text x="30" y="26" font-size="10.5" font-weight="600" fill="#242b2e">错判集中在哪</text>';
    s += '<text x="30" y="41" font-size="8.6" fill="#79828a">深度对齐，10% 主动标注，共 301 点</text>';

    var M = [[95, 0, 0, 0], [2, 99, 0, 0], [0, 0, 56, 3], [0, 0, 6, 40]];
    var mx = 100;
    var gx = 96, gy = 74, cw = 44, chh = 30;

    s += '<text x="' + (gx + cw * 2 - 1) + '" y="' + (gy - 18) + '" font-size="8" fill="#9ba3a9" text-anchor="middle">识别结果 →</text>';
    LITH.forEach(function (L, j) {
      s += '<text x="' + (gx + j * cw + cw / 2) + '" y="' + (gy - 5) + '" font-size="7.5" fill="#79828a" text-anchor="middle">' + L.n + '</text>';
    });
    s += '<text x="' + (gx - 34) + '" y="' + (gy + 2 * chh) + '" font-size="8" fill="#9ba3a9" text-anchor="middle" transform="rotate(-90 ' + (gx - 34) + ' ' + (gy + 2 * chh) + ')">真值 ↓</text>';
    M.forEach(function (row, i) {
      s += '<text x="' + (gx - 6) + '" y="' + (gy + i * chh + chh / 2 + 3) + '" font-size="7.5" fill="#79828a" text-anchor="end">' + LITH[i].n + '</text>';
      row.forEach(function (v, j) {
        var on = i === j;
        var op = v / mx;
        var fill = on ? '#2f7d6b' : '#c0392b';
        s += '<rect x="' + (gx + j * cw) + '" y="' + (gy + i * chh) + '" width="' + (cw - 2) + '" height="' + (chh - 2) + '" rx="2" fill="' + fill + '" fill-opacity="' + (0.06 + op * 0.7).toFixed(2) + '"/>';
        s += '<text x="' + (gx + j * cw + (cw - 2) / 2) + '" y="' + (gy + i * chh + chh / 2 + 3) + '" font-size="8.5" font-family="monospace" fill="' + (op > 0.45 ? '#fff' : on ? '#3f6d61' : '#b0a89a') + '" text-anchor="middle"' + (op > 0.45 ? ' font-weight="600"' : '') + '>' + v + '</text>';
      });
    });
    s += '<text x="' + gx + '" y="' + (gy + 4 * chh + 20) + '" font-size="8.5" fill="#8c5340">9 个错判，<tspan font-weight="600">全部发生在灰岩 ↔ 白云岩之间</tspan></text>';
    s += '<text x="' + gx + '" y="' + (gy + 4 * chh + 33) + '" font-size="8" fill="#9ba3a9">砂泥岩之间只错 2 个（泥岩判成砂岩）</text>';

    /* ---------- 右：每类 F1 双栏 ---------- */
    var bx0 = 330, bx1 = 606, byb = 226, byt = 66;
    var BY = function (v) { return byb - v / 100 * (byb - byt); };
    s += '<text x="330" y="26" font-size="10.5" font-weight="600" fill="#242b2e">错位时掉得很“平均”</text>';
    s += '<text x="330" y="41" font-size="8.6" fill="#79828a">每类 F1，深度对齐 vs 迟到时间差 2 min</text>';

    [0, 25, 50, 75, 100].forEach(function (v) {
      s += '<line x1="' + bx0 + '" y1="' + BY(v) + '" x2="' + bx1 + '" y2="' + BY(v) + '" stroke="#f0ece2"/>';
      s += '<text x="' + (bx0 - 5) + '" y="' + (BY(v) + 3) + '" font-size="7.5" font-family="monospace" fill="#9ba3a9" text-anchor="end">' + v + '%</text>';
    });

    var D = [[0, 99.0, 58.5], [1, 99.0, 64.0], [2, 92.6, 65.0], [3, 89.9, 58.4]];
    D.forEach(function (d) {
      var gx0 = bx0 + 18 + d[0] * 66;
      s += '<rect x="' + gx0 + '" y="' + BY(d[1]) + '" width="22" height="' + (byb - BY(d[1])) + '" fill="#2f7d6b" fill-opacity=".72" rx="2"/>';
      s += '<text x="' + (gx0 + 11) + '" y="' + (BY(d[1]) - 4) + '" font-size="7.5" font-family="monospace" fill="#2f7d6b" text-anchor="middle">' + d[1].toFixed(1) + '</text>';
      s += '<rect x="' + (gx0 + 24) + '" y="' + BY(d[2]) + '" width="22" height="' + (byb - BY(d[2])) + '" fill="#b26a39" fill-opacity=".72" rx="2"/>';
      s += '<text x="' + (gx0 + 35) + '" y="' + (BY(d[2]) - 4) + '" font-size="7.5" font-family="monospace" fill="#b26a39" text-anchor="middle">' + d[2].toFixed(1) + '</text>';
      s += '<text x="' + (gx0 + 23) + '" y="' + (byb + 14) + '" font-size="8" fill="#79828a" text-anchor="middle">' + LITH[d[0]].n + '</text>';
    });
    s += '<line x1="' + bx0 + '" y1="' + byb + '" x2="' + bx1 + '" y2="' + byb + '" stroke="#c9c2b0"/>';

    /* 图例 */
    s += '<rect x="' + (bx0 + 6) + '" y="' + (byb + 26) + '" width="9" height="9" rx="1.5" fill="#2f7d6b" fill-opacity=".72"/>';
    s += '<text x="' + (bx0 + 20) + '" y="' + (byb + 34) + '" font-size="8" fill="#5d666d">深度对齐</text>';
    s += '<rect x="' + (bx0 + 86) + '" y="' + (byb + 26) + '" width="9" height="9" rx="1.5" fill="#b26a39" fill-opacity=".72"/>';
    s += '<text x="' + (bx0 + 100) + '" y="' + (byb + 34) + '" font-size="8" fill="#5d666d">错位 0.80 m</text>';

    s += '<rect x="24" y="' + (H - 32) + '" width="' + (W - 48) + '" height="24" rx="6" fill="#f2f7f5"/>';
    s += '<text x="36" y="' + (H - 16) + '" font-size="9.3" fill="#3f6d61">四类 F1 一起从 90—99% 塌到 58—65%，<tspan font-weight="600">而且塌得非常均匀</tspan> —— 这不是模型坏了，是标签被贴到了错误的深度上。</text>';

    s += '</svg>';
    return s;
  }

  /* ================= 图 4：把标注预算花在最值的地方 ================= */
  function figLearn() {
    var W = 636, H = 288;
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="标注比例与岩性宏F1的学习曲线，主动挑样本与随机挑样本的对比">';

    s += '<text x="30" y="26" font-size="10.5" font-weight="600" fill="#242b2e">同样的标注预算，差在哪里</text>';
    s += '<text x="30" y="41" font-size="8.6" fill="#79828a">标注比例 → 岩性宏 F1，深度对齐条件</text>';

    var x0 = 66, x1 = 596, yb = 210, yt = 62;
    var N = 6;
    var X = function (i) { return x0 + (i + 0.5) / N * (x1 - x0); };
    var Y = function (v) { return yb - (v - 50) / 50 * (yb - yt); };

    [50, 60, 70, 80, 90, 100].forEach(function (v) {
      s += '<line x1="' + x0 + '" y1="' + Y(v) + '" x2="' + x1 + '" y2="' + Y(v) + '" stroke="#f0ece2"/>';
      s += '<text x="' + (x0 - 6) + '" y="' + (Y(v) + 3) + '" font-size="8" font-family="monospace" fill="#9ba3a9" text-anchor="end">' + v + '%</text>';
    });

    var R = ['2%', '5%', '10%', '15%', '20%', '30%'];
    var ACT = [84.5, 95.1, 95.1, 94.7, 94.7, 94.7];
    var RND = [64.4, 89.8, 92.2, 93.9, 94.1, 94.7];

    function line(arr, color, dash) {
      var pts = arr.map(function (v, i) { return X(i).toFixed(1) + ',' + Y(v).toFixed(1); });
      var o = '<polyline points="' + pts.join(' ') + '" fill="none" stroke="' + color + '" stroke-width="2"' + (dash ? ' stroke-dasharray="5 3"' : '') + '/>';
      arr.forEach(function (v, i) {
        o += '<circle cx="' + X(i) + '" cy="' + Y(v) + '" r="3" fill="#fff" stroke="' + color + '" stroke-width="1.5"/>';
      });
      return o;
    }
    s += line(RND, '#b26a39', true);
    s += line(ACT, '#2f7d6b', false);

    /* 2% 处的差距 —— 标注放在曲线下方的空白带 */
    s += '<line x1="' + X(0) + '" y1="' + Y(64.4) + '" x2="' + X(0) + '" y2="' + Y(84.5) + '" stroke="#c0392b" stroke-width="1"/>';
    s += '<text x="' + (X(0) + 7) + '" y="' + (Y(64.4) + 17) + '" font-size="8.5" font-weight="600" fill="#c0392b">差 20.1 个百分点</text>';
    s += '<text x="' + (X(0) + 7) + '" y="' + (Y(64.4) + 29) + '" font-size="7.5" fill="#c0392b">84.5% vs 64.4%</text>';

    /* 5% 处主动已到位 —— 标注放在曲线下方空白区，用引线指向 95.1% 水平线 */
    s += '<line x1="' + X(1) + '" y1="' + Y(95.1) + '" x2="' + X(5) + '" y2="' + Y(95.1) + '" stroke="#2f7d6b" stroke-width="1" stroke-dasharray="3 3"/>';
    var ly = Y(80);
    s += '<line x1="' + (X(1) + 6) + '" y1="' + (ly - 12) + '" x2="' + (X(1) + 6) + '" y2="' + (Y(95.1) + 3) + '" stroke="#2f7d6b" stroke-width="1" stroke-dasharray="2 2"/>';
    s += '<text x="' + (X(1) + 12) + '" y="' + ly + '" font-size="8.5" fill="#2f7d6b">5% 就到 95.1%，随机挑要 30% 才追上 —— <tspan font-weight="600">标注量差 6 倍</tspan></text>';

    s += '<line x1="' + x0 + '" y1="' + yb + '" x2="' + x1 + '" y2="' + yb + '" stroke="#c9c2b0"/>';
    R.forEach(function (r, i) {
      s += '<text x="' + X(i) + '" y="' + (yb + 15) + '" font-size="8" font-family="monospace" fill="#79828a" text-anchor="middle">' + r + '</text>';
    });
    s += '<text x="' + ((x0 + x1) / 2) + '" y="' + (yb + 30) + '" font-size="9" fill="#79828a" text-anchor="middle">人工标注比例（对应 6—90 个深度点）</text>';

    /* 图例 */
    s += '<line x1="' + (x1 - 168) + '" y1="' + (yt - 4) + '" x2="' + (x1 - 146) + '" y2="' + (yt - 4) + '" stroke="#2f7d6b" stroke-width="2"/>';
    s += '<text x="' + (x1 - 140) + '" y="' + (yt - 1) + '" font-size="8" fill="#5d666d">挑最不确定的</text>';
    s += '<line x1="' + (x1 - 76) + '" y1="' + (yt - 4) + '" x2="' + (x1 - 54) + '" y2="' + (yt - 4) + '" stroke="#b26a39" stroke-width="2" stroke-dasharray="5 3"/>';
    s += '<text x="' + (x1 - 48) + '" y="' + (yt - 1) + '" font-size="8" fill="#5d666d">随机挑</text>';

    s += '<rect x="24" y="' + (H - 30) + '" width="' + (W - 48) + '" height="24" rx="6" fill="#f2f7f5"/>';
    s += '<text x="36" y="' + (H - 14) + '" font-size="9.3" fill="#3f6d61">主动挑样本同样只用人工标注，<tspan font-weight="600">不看真实标签、不看模型对错</tspan>，只挑"两个候选类别最拿不准"的点 —— 省下来的不是信息，是预算。</text>';

    s += '</svg>';
    return s;
  }

  /* ================= 数据清单 ================= */
  var DATA = [
    ['岩屑录井描述表', '井深、岩性、粒级、含油级别', '主标签，逐袋对应深度区间'],
    ['迟到时间标定记录', '排量、环空容积、实测迟到时间', '决定每袋岩屑归到哪个深度'],
    ['岩屑图像 / 显微特征', '每袋 3—5 张，固定光照与标尺', '色调、粒径、分选、碳酸盐反应的来源'],
    ['随钻伽马或元素录井', '与岩屑同深度段', '用于交叉验证，不进训练集'],
    ['洗样与混样记录', '样品处理方式、污染情况', '分组依据，避免同袋样本跨训练/测试集']
  ];

  return {

    id: 'm1-cuttings',
    sceneId: 'm1',
    title: '岩屑岩性自动识别',
    summary: '迟到时间标错，四维特征全白搭',
    status: 'ready',
    version: '1.0.0',
    updated: '2026-10-27',
    methods: ['cv'],

    tabs: {
      background: {
        label: '专业背景',

        judge: [
          { label: '任务类型', value: '小样本细粒度分类', desc: '4 类岩性，类间差异只有 0.15', html: '<span style="color:var(--c-cv)">多维特征 + 概率</span>' },
          { label: '数据门槛', value: '10% 标注', desc: '30 个点就能到 95% 宏 F1' },
          { label: '收益', value: '2% 标注下 64.4% → 84.5%', desc: '同样预算，主动挑样本', html: '<b style="color:var(--jade-d);font-family:var(--mono)">+20.1 pp</b>' },
          { label: '难度', value: '中', desc: '算法不难，难在迟到时间与混样', html: K.dtag('中') }
        ],

        lede: '岩屑是钻井过程中唯一"摸得着"的地层样品：钻头破碎的岩石随泥浆返到地面，录井工捞一把、在显微镜下看颜色、粒度、分选、滴一滴盐酸看反应，写下"灰色细砂岩，泥质含量 15%，荧光三级"。一口井几百袋，全靠手写。问题不在"能不能自动识别"，而在<b>这袋岩屑到底属于哪个深度</b> —— 迟到时间算错 2 分钟，整套剖面就上下错开 0.8 m。',

        sections: [
          {
            no: 1, en: 'PROBLEM', title: '岩屑不是从钻头直接蹦到振动筛上的',
            html: '<p>钻头在 3000 m 处破碎的岩石，要随泥浆沿环空一路返到地面，才能被捞上来。<b>这段路程要花时间</b> —— 就是迟到时间，由环空容积除以排量算出来，通常十几分钟到一个多小时。录井工按这个时间把"现在捞到的这一袋"对应到"十几分钟前钻开的那个深度"。</p>' +
              '<p>这个换算里全是误差来源：排量波动、井径扩大让环空容积变化、钻具组合改变、泵压不稳。<b>迟到时间偏 2 分钟，60 m 井段上的岩性剖面就整体错位 0.80 m</b> —— 而这个错误在剖面上完全看不出来，它只是让砂岩和泥岩的位置互相挪了挪。</p>' +
              K.figure(figLag(), 1, '左侧是岩屑的返出路径：钻头 → 环空 → 振动筛。右侧是同一套特征、同一份标注，只改深度对齐的结果：深度对齐时宏 F1 是 **95.1%**，迟到时间差 2 分钟（错位 0.80 m）掉到 **61.5%**，差 8 分钟（错位 3.20 m）只剩 **10.4%** —— 这时"同一深度上岩性确实相同"的比例只有 11.6%，**比随机碰上的 24.4% 还低**，因为地层是砂泥灰交替的，错开 3.2 m 恰好落到隔壁那一层。本井机械钻速 24 m/h，每分钟钻进 0.40 m，所以 1 分钟误差 = 0.40 m。') +
              '<p>很多人第一反应是"那就把迟到时间算准一点"。问题在于<b>它没法算准</b>：井径扩大是随机的，排量是被钻井工况牵着走的。所以工程上的做法不是算得更准，而是<b>承认它不准</b>，然后用可观测的东西把它标定回来 —— 比如拿岩屑剖面去和随钻伽马对比，找那个让两者最吻合的偏移量。</p>'
          },
          {
            no: 2, en: 'INTERVENTION', title: '一张图判不准，就四个维度一起看',
            html: '<p>人看岩屑靠的是"综合印象"：颜色偏黄、颗粒有点粗、分选中等、滴盐酸弱起泡 —— 四个线索一起，才敢写成"灰质细砂岩"。单看任何一个都会错：颜色相近的砂岩和粉砂岩、都起泡的灰岩和白云岩。</p>' +
              '<p>把这套经验翻译成特征向量，就是<b>色调、粒径、分选、碳酸盐反应</b>四个维度。然后用少量人工标注算出每类的"典型值"（质心），新的岩屑按最近的典型值归类，同时给出两个最近类别的距离差 —— 这个差就是<b>置信度</b>。</p>' +
              K.figure(figFeature(), 2, '左图把 4 类岩屑画在"色调 × 碳酸盐反应"平面上，点云的扩散幅度按实测噪声 0.105 绘制。砂岩（右下）与泥岩（中下）靠色调分开，灰岩（左上）与白云岩（左上偏下）靠碳酸盐反应分开 —— 但**这两对的质心分别只差 0.24 和 0.15**，点云大面积重叠。右侧是单特征与四维联合的总准确率：只看色调 65.8%、只看粒径 59.8%、只看分选 52.2%、只看碳酸盐反应 70.1%，**四个维度联合 95.1%**。') +
              K.callout('这条案例最值得记住的一句：**岩性识别的精度上限不是算法给的，是类间距离给的。** 灰岩和白云岩的质心只差 0.15，而单点噪声是 0.105 —— 再换更复杂的模型，也只能在 90% 附近打转。要把上限抬上去，得换特征（比如加白云石染色、加元素录井的 Mg/Ca），不是在分类器上加层数。')
          },
          {
            no: 3, en: 'DATA', title: '你需要准备什么',
            html: '<p style="margin-bottom:14px">岩屑数据的特点是<b>标签少、噪声大、深度信息比岩性信息更容易出错</b>。所以数据清单里，和"深度"有关的两项比图像本身还重要。</p>' +
              K.checklist(DATA) +
              '<p style="margin-top:18px"><span class="kicker plain" style="color:var(--ink-4)">可参考的公开数据集</span></p>' +
              K.refs(['FORCE 2020（岩性标签与测井曲线配套）', 'Utah FORGE 岩屑与岩心描述', '公开岩石薄片图像集（用于特征预训练）'], null)
          },
          {
            no: 4, en: 'DIFFICULTY', title: '技术难度与参考方向',
            html: '<div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-bottom:2px">' +
              K.dtag('中') + '<span class="small muted">分类器几行代码；难在"置信度不等于正确率"，以及标注预算怎么花。</span></div>' +
              K.meter('中') +
              '<p>第二个坑藏在"主动学习"里。既然人工标注很贵，就该<b>先标最不确定的那些点</b>。这个策略确实有效：2% 标注时宏 F1 从 64.4% 提到 84.5%，5% 就到 95.1%，随机挑要到 30% 才追上 —— <b>同样的精度，标注量差 6 倍</b>。</p>' +
              K.figure(figLearn(), 4, '横轴是人工标注比例（2%—30%，对应 6—90 个深度点），纵轴是岩性宏 F1。绿实线是"每次挑当前最不确定的点去标"，橙虚线是随机挑。**差距只在小预算区间存在**：2% 时差 20.1 个百分点，到 30% 两条线重合。也就是说，主动学习的价值不是"更准"，而是"在没钱的时候更准"。') +
              '<p>但要注意：主动学习挑样本时<b>不能看真实标签</b>。如果按“每类挑 4 个当种子”，那就等于偷看了答案，实际部署时这 4 个种子本身也得靠人先认出来。本案例用的是最远点采样初始化 —— 只在特征空间里铺开，不看标签。</p>' +
              '<p style="margin-top:18px"><span class="kicker plain" style="color:var(--ink-4)">可借鉴的通用技术</span></p>' +
              K.refs(['细粒度图像分类', '小样本 / 原型网络（prototype network）', '主动学习（uncertainty sampling）', '类别不均衡处理'], '#/method/cv') +
              '<p style="margin-top:18px" class="small muted">交叉环节：<a href="#/stage/mudlog" style="color:var(--jade-d);font-weight:600">录井</a> · <a href="#/stage/welllog" style="color:var(--jade-d);font-weight:600">测井</a> · <a href="#/stage/drilling" style="color:var(--jade-d);font-weight:600">钻井</a></p>'
          }
        ]
      },

      workflow: {
        label: '案例流程',
        title: '案例：一口井 60 m 井段的岩屑剖面自动编录',
        lead: [
          '60 m 井段、每 0.2 m 一个采样点，共 301 个点，机械钻速 24 m/h。四类岩性交替出现：砂岩 32%、泥岩 34%、灰岩 20%、白云岩 15% —— 白云岩只占 15%，所以评价指标用**宏平均 F1**，不让大类把小类淹掉。',
          '整条链路只在两个地方出错就全盘皆输：**深度对不齐**，和**置信度被当成正确率**。前者让宏 F1 从 95.1% 掉到 61.5%，后者会让质控环节把最该复查的样品漏掉。'
        ],
        stats: [
          ['研究井段', '60 m / 301 点', true], ['采样间距', '0.2 m（每分钟 0.40 m）', true],
          ['岩性类别', '4 类（砂岩 32%）', true], ['深度对齐宏 F1', '95.1%'],
          ['错位 0.80 m', '61.5%'], ['主动 vs 随机（2%）', '84.5% vs 64.4%']
        ],
        steps: [
          {
            name: '迟到时间标定', role: '质控',
            do: '按环空容积与排量算出理论迟到时间，再用随钻伽马或元素录井做互相关，找出让两条剖面最吻合的偏移量。理论值只作为搜索中心，不作为答案。',
            effect: '把每袋岩屑锚定到正确的深度区间',
            trap: '直接用公式算出的迟到时间，井径扩大段会偏 2 分钟以上，错位 0.8 m'
          },
          {
            name: '捞样与编目', role: '数据',
            do: '按 0.5—2 m 间隔捞样、洗样、装袋，记录袋号与对应深度区间。同一袋里往往混了 3—10 个 0.2 m 采样点的岩屑 —— 这一步决定了标签的空间分辨率上限。',
            effect: '形成"袋号 → 深度区间 → 岩性描述"的对照表',
            trap: '把 1 m 混样当成 1 m 处的点样，后面所有 0.2 m 分辨率的努力都是假的'
          },
          {
            name: '特征提取', role: '算法核心',
            do: '对每袋样品提取色调、粒径、分选、碳酸盐反应四个特征。图像部分可以自动（显微图像 + 分割），反应强度这类仍需人工或专用试剂 + 图像判读。',
            effect: '把"经验判断"变成可计算的四维向量',
            trap: '只用图像颜色一个维度，准确率天花板在 65.8%'
          },
          {
            name: '小样本分类 + 主动挑样本', role: '算法核心',
            do: '用少量标注算每类质心，其余按最近质心归类并输出置信度（两个最近类别的距离差）。标注预算不足时，优先标注"距离差最小"的点 —— 但挑点过程不看真实标签。',
            effect: '10% 标注达到 95.1% 宏 F1',
            trap: '按类别均匀挑种子等于偷看答案，真实部署时拿不到'
          },
          {
            name: '剖面回放与质控', role: '闭环',
            do: '把识别结果按深度画成岩性柱，和随钻伽马、邻井剖面并排比对。重点复查置信度低的点 —— 但要知道低置信度主要落在灰岩/白云岩接触带，不代表一定判错。',
            effect: '把"每袋一个结论"变成"整段一条可解释的剖面"',
            trap: '把置信度当质量分数，结果所有碳酸盐岩段都被标成"需人工复核"'
          }
        ],

        metrics: {
          title: '怎么算"识别到位了"',
          html: '<p>用<b>宏平均 F1</b> 而不是总准确率。白云岩只占 15%，全部判错总准确率也只掉 15 个百分点；但对剖面解释来说，那等于整段漏掉一套储层。宏 F1 把四类等权，小类判错立刻反映出来。</p>' +
            K.figure(figConfuse(), 3, '左侧是深度对齐时的混淆矩阵：301 个点里错 11 个，**9 个都发生在灰岩 ↔ 白云岩之间**（灰岩判成白云岩 3 个，白云岩判成灰岩 6 个），砂泥岩之间只错 2 个。右侧是每类 F1：深度对齐时砂岩和泥岩都是 99.0%，灰岩 92.6%、白云岩 89.9%；迟到时间差 2 分钟，四类一起塌到 58.4—65.0%。') +
            K.dtable(['条件', '错位深度', '宏 F1', '相对深度对齐'], [
              ['深度对齐', '0.00 m', '95.1%', '—'],
              ['迟到时间差 1 min', '0.40 m', '78.9%', '−16.2 pp'],
              ['迟到时间差 2 min', '0.80 m', '61.5%', '−33.6 pp'],
              ['迟到时间差 4 min', '1.60 m', '34.7%', '−60.4 pp'],
              ['迟到时间差 8 min', '3.20 m', '10.4%', '−84.7 pp']
            ]) +
            '<p style="margin-top:12px" class="small muted">标注比例 10%、主动挑样本，按 0.40 m/min 的钻速折算错位深度；全部由 <code>tools/test-m1.js</code> 与 <code>tools/probe-m1.js</code> 复算。</p>'
        },

        fails: [
          { name: '把置信度当质量分数', why: '置信度最低的 133 个点里，灰岩 59 个、白云岩 46 个 —— 正好是这两类的全部。它们在特征空间里本来就挨得近（质心距离 0.15），所以"不确定"是结构性的，不是判错了。这 133 个点的实际准确率是 91.7%，比整体只低 3.4 个百分点。拿置信度排序去做人工复核名单，会在碳酸盐岩段白白堆满工。' },
          { name: '迟到时间只算不校', why: '按环空容积除以排量算出的理论迟到时间，在井径扩大段偏 2 分钟很正常，对应错位 0.80 m、宏 F1 从 95.1% 掉到 61.5%。更要命的是错 8 分钟时宏 F1 只剩 10.4% —— 此时同一深度上岩性真正相同的比例是 11.6%，比随机碰上的 24.4% 还低，因为错开 3.2 m 正好落到隔壁那套地层里。' },
          { name: '单特征硬判', why: '只看色调 65.8%、只看粒径 59.8%、只看分选 52.2%、只看碳酸盐反应 70.1%。任何一个维度单独使用都到不了工程可用线（一般要求 85% 以上），四维联合才到 95.1%。' },
          { name: '把混样当成点样', why: '1 m 捞样间隔意味着每袋混了 5 个 0.2 m 采样点。用 0.2 m 分辨率的特征去配 1 m 分辨率的标签，深度上就自带 ±0.5 m 的不确定度 —— 相当于凭空给迟到时间加了 1.25 分钟的误差。' }
        ]
      },

      demo: {
        label: '可运行示范',
        intro: '拖“迟到时间误差”从 0 到 8 分钟，看错位怎么把宏 F1 从 95% 一路吃到 10%；把“人工标注比例”压到 2%，切换“随机挑 / 挑最不确定的”，看两条学习曲线在低预算区拉开 20 个百分点。',
        height: 726
      }
    },

    demoGlobal: 'M1DEMO'
  };
};
