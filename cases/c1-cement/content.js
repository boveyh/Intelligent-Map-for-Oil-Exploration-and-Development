/* =========================================================
   c1 · 固井质量智能评价 —— 案例正文（单一源）
   ---------------------------------------------------------
   正文里每个数字都来自 tools/test-c1.js 的合成复算输出。
   ========================================================= */

module.exports = function (K) {

  var CLS = [
    { n: '胶结良好', c: '#2f7d6b' },
    { n: '微环隙', c: '#b26a39' },
    { n: '窜槽', c: '#c0392b' },
    { n: '自由套管', c: '#5d666d' }
  ];
  /* 微环隙 50% 时的合成均值 */
  var AMP = [12.3, 64.3, 53.6, 93.1];

  /* ================= 图 1：同一档幅度，藏了两种井况 ================= */
  function figBand() {
    var W = 636, H = 214;
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="四类胶结状态的CBL幅度均值与30、78毫伏两条传统门槛的关系">';

    s += '<text x="30" y="24" font-size="10.5" font-weight="600" fill="#242b2e">30—78 mV 这一档，装了两类井况</text>';
    s += '<text x="30" y="38" font-size="8.6" fill="#79828a">四类胶结状态的 CBL 幅度合成均值（微环隙强度 50%，40 个 1 m 段）</text>';

    var x0 = 70, x1 = 580, yA = 104;
    var X = function (v) { return x0 + v / 100 * (x1 - x0); };

    /* 档位色带 */
    s += '<rect x="' + X(30) + '" y="112" width="' + (X(78) - X(30)) + '" height="26" fill="#c0392b" fill-opacity=".06"/>';
    s += '<line x1="' + X(30) + '" y1="' + (yA - 4) + '" x2="' + X(30) + '" y2="140" stroke="#c0392b" stroke-width="1" stroke-dasharray="4 3"/>';
    s += '<line x1="' + X(78) + '" y1="' + (yA - 4) + '" x2="' + X(78) + '" y2="140" stroke="#c0392b" stroke-width="1" stroke-dasharray="4 3"/>';
    s += '<text x="' + ((X(30) + X(78)) / 2) + '" y="129" font-size="8.6" fill="#c0392b" text-anchor="middle">本例阈值将这一档判为「窜槽」</text>';

    /* 轴 */
    s += '<line x1="' + x0 + '" y1="' + yA + '" x2="' + x1 + '" y2="' + yA + '" stroke="#c9c2b0"/>';
    [0, 25, 50, 75, 100].forEach(function (v) {
      s += '<line x1="' + X(v) + '" y1="' + yA + '" x2="' + X(v) + '" y2="' + (yA + 4) + '" stroke="#c9c2b0"/>';
      s += '<text x="' + X(v) + '" y="152" font-size="8" font-family="monospace" fill="#9ba3a9" text-anchor="middle">' + v + '</text>';
    });
    s += '<text x="' + ((x0 + x1) / 2) + '" y="168" font-size="9" fill="#79828a" text-anchor="middle">CBL 首波幅度 / mV</text>';

    /* 四个合成均值：分两行标注，避免 53.6 与 64.3 打架 */
    var POS = [
      { i: 0, row: 62, dy: 1 },
      { i: 2, row: 62, dy: 1 },
      { i: 3, row: 62, dy: 1 },
      { i: 1, row: 84, dy: 1 }
    ];
    POS.forEach(function (p) {
      var v = AMP[p.i];
      s += '<line x1="' + X(v) + '" y1="' + (yA - 5) + '" x2="' + X(v) + '" y2="' + (p.row + 5) + '" stroke="' + CLS[p.i].c + '" stroke-width="1" stroke-opacity=".5"/>';
      s += '<circle cx="' + X(v) + '" cy="' + yA + '" r="4" fill="' + CLS[p.i].c + '"/>';
      s += '<text x="' + X(v) + '" y="' + p.row + '" font-size="8.8" font-weight="600" fill="' + CLS[p.i].c + '" text-anchor="middle">' + v.toFixed(1) + ' mV</text>';
      s += '<text x="' + X(v) + '" y="' + (p.row - 10) + '" font-size="8.2" fill="#79828a" text-anchor="middle">' + CLS[p.i].n + '</text>';
    });

    s += '<rect x="24" y="184" width="' + (W - 48) + '" height="22" rx="6" fill="#fbf3ed"/>';
    s += '<text x="36" y="199" font-size="9.2" fill="#8c5340">窜槽 53.6 mV 与微环隙 64.3 mV 只差 10.7 mV，都落在这一档里 —— <tspan font-weight="600">按幅度分级，10 个微环隙段会被整段写成“窜槽”。</tspan></text>';

    s += '</svg>';
    return s;
  }

  /* ================= 图 2：三种状态下声波走的路不一样 ================= */
  function figPath() {
    var W = 636, H = 292;
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="胶结良好、微环隙、窜槽三种状态下声波在套管与水泥环中的传播路径示意">';

    s += '<text x="30" y="24" font-size="10.5" font-weight="600" fill="#242b2e">为什么幅度会高，得看声波走哪条路</text>';
    s += '<text x="30" y="38" font-size="8.6" fill="#79828a">示意图：套管（灰）· 水泥环（米）· 地层（白）</text>';

    function panel(px, title, sub, kind) {
      var g = '';
      var top = 62, bot = 210;
      var cw = px + 34;                 /* 套管 */
      var cm0 = cw + 8, cm1 = cw + 46;  /* 水泥环 */
      var fm1 = px + 186;               /* 地层右界 */

      g += '<text x="' + px + '" y="56" font-size="10" font-weight="600" fill="#242b2e">' + title + '</text>';

      /* 地层 */
      g += '<rect x="' + cm1 + '" y="' + top + '" width="' + (fm1 - cm1) + '" height="' + (bot - top) + '" fill="#fbfaf5" stroke="#e9e4d8"/>';
      for (var yy = top + 18; yy < bot; yy += 22) {
        g += '<line x1="' + cm1 + '" y1="' + yy + '" x2="' + fm1 + '" y2="' + yy + '" stroke="#f0ece2"/>';
      }
      /* 水泥环 */
      g += '<rect x="' + cm0 + '" y="' + top + '" width="' + (cm1 - cm0) + '" height="' + (bot - top) + '" fill="#e6dfcd"/>';
      for (var hx = cm0 + 7; hx < cm1; hx += 9) {
        g += '<line x1="' + hx + '" y1="' + top + '" x2="' + hx + '" y2="' + bot + '" stroke="#d8d0be"/>';
      }
      /* 套管 */
      g += '<rect x="' + cw + '" y="' + top + '" width="8" height="' + (bot - top) + '" fill="#8b9188"/>';
      g += '<rect x="' + (cw - 26) + '" y="' + top + '" width="26" height="' + (bot - top) + '" fill="#f6f3ea"/>';
      g += '<text x="' + (cw - 13) + '" y="' + (top + 14) + '" font-size="7" fill="#b0a89a" text-anchor="middle">井筒</text>';

      /* 缺陷 */
      if (kind === 'micro') {
        g += '<rect x="' + (cw + 9) + '" y="' + top + '" width="5" height="' + (bot - top) + '" fill="#fff"/>';
        g += '<line x1="' + (cw + 11.5) + '" y1="' + top + '" x2="' + (cw + 11.5) + '" y2="' + bot + '" stroke="#b26a39" stroke-dasharray="3 2"/>';
        g += '<text x="' + (cw + 16) + '" y="' + (bot + 14) + '" font-size="7.4" fill="#b26a39">环隙</text>';
      }
      if (kind === 'chan') {
        g += '<rect x="' + (cm0 + 12) + '" y="' + (top + 30) + '" width="7" height="' + (bot - top - 60) + '" fill="#fff"/>';
        g += '<text x="' + (cm0 + 15) + '" y="' + (bot + 14) + '" font-size="7.4" fill="#c0392b" text-anchor="middle">窜槽</text>';
      }

      /* 路径 */
      var ar = function (d, col, wd, dash) {
        g += '<path d="' + d + '" fill="none" stroke="' + col + '" stroke-width="' + wd + '"' + (dash ? ' stroke-dasharray="4 3"' : '') + ' stroke-linecap="round"/>';
      };
      if (kind === 'good') {
        ar('M' + (cw + 4) + ' ' + (top + 6) + 'L' + (cw + 4) + ' ' + (bot - 6), '#2f7d6b', 1.6);
        ar('M' + (cw + 4) + ' ' + (top + 34) + 'L' + (cm1 + 4) + ' ' + (top + 54), '#2f7d6b', 3);
        ar('M' + (cw + 4) + ' ' + (top + 88) + 'L' + (cm1 + 4) + ' ' + (top + 108), '#2f7d6b', 3);
        ar('M' + (cw + 4) + ' ' + (top + 140) + 'L' + (cm1 + 4) + ' ' + (top + 158), '#2f7d6b', 2.4);
        g += '<text x="' + (cm1 + 6) + '" y="' + (top + 126) + '" font-size="7.6" fill="#2f7d6b">能量进地层</text>';
      } else if (kind === 'micro') {
        ar('M' + (cw + 4) + ' ' + (top + 6) + 'L' + (cw + 4) + ' ' + (bot - 6), '#b26a39', 3.4);
        ar('M' + (cw + 4) + ' ' + (top + 40) + 'L' + (cm1 + 4) + ' ' + (top + 62), '#b26a39', 1.4);
        ar('M' + (cw + 4) + ' ' + (top + 96) + 'L' + (cm1 + 4) + ' ' + (top + 118), '#b26a39', 1.4);
        g += '<text x="' + (cm1 + 6) + '" y="' + (top + 88) + '" font-size="7.6" fill="#b26a39">地层波还在</text>';
        g += '<text x="' + (cw + 12) + '" y="' + (top + 14) + '" font-size="7.6" fill="#b26a39">能量留在套管里</text>';
      } else {
        ar('M' + (cw + 4) + ' ' + (top + 6) + 'L' + (cw + 4) + ' ' + (bot - 6), '#c0392b', 3.4);
        ar('M' + (cm0 + 15.5) + ' ' + (top + 32) + 'L' + (cm0 + 15.5) + ' ' + (bot - 32), '#c0392b', 2.2, true);
        ar('M' + (cw + 4) + ' ' + (top + 52) + 'L' + (cm1 + 4) + ' ' + (top + 74), '#c0392b', 1.1);
        g += '<text x="' + (cm1 + 6) + '" y="' + (top + 112) + '" font-size="7.6" fill="#c0392b">半边没有耦合</text>';
      }

      g += '<text x="' + px + '" y="' + (bot + 28) + '" font-size="8" fill="#79828a">' + sub + '</text>';
      return g;
    }

    s += panel(24, '胶结良好', '套管波弱，地层波强', 'good');
    s += panel(220, '微环隙', '套管波强，地层波仍在', 'micro');
    s += panel(416, '窜槽', '套管波强，周向不一致', 'chan');

    s += '<rect x="24" y="252" width="' + (W - 48) + '" height="30" rx="6" fill="#f2f7f5"/>';
    s += '<text x="36" y="266" font-size="9.2" fill="#3f6d61">微环隙和自由套管的幅度几乎一样，区别在<tspan font-weight="600">地层波还在</tspan>；窜槽和微环隙的幅度只差 10 mV，区别在<tspan font-weight="600">周向一不一致</tspan>。</text>';
    s += '<text x="36" y="277" font-size="9.2" fill="#3f6d61">简化传播示意；周向一致性为合成代理量，常规 VDL 不提供完整周向观测。</text>';

    s += '</svg>';
    return s;
  }

  /* ================= 图 3：微环隙强度 → 三种方法的韧性 ================= */
  function figSweep() {
    var W = 636, H = 268;
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="微环隙强度从0到100时三种判别依据的分段符合率曲线">';

    s += '<text x="30" y="24" font-size="10.5" font-weight="600" fill="#242b2e">改变合成条件，检查三种方法的未标定段表现</text>';
    s += '<text x="30" y="38" font-size="8.6" fill="#79828a">36 段测试；三特征分支每次重新标定，未验证冻结模型迁移</text>';

    var x0 = 74, x1 = 600, yb = 196, yt = 60;
    var X = function (mu) { return x0 + mu * (x1 - x0); };
    var Y = function (v) { return yb - (v - 70) / 30 * (yb - yt); };

    [70, 80, 90, 100].forEach(function (v) {
      s += '<line x1="' + x0 + '" y1="' + Y(v) + '" x2="' + x1 + '" y2="' + Y(v) + '" stroke="#f0ece2"/>';
      s += '<text x="' + (x0 - 6) + '" y="' + (Y(v) + 3) + '" font-size="8" font-family="monospace" fill="#9ba3a9" text-anchor="end">' + v + '%</text>';
    });

    var SER = [
      { d: [[0, 75], [1, 75]], c: '#c0392b', n: '两档幅度 30/78', dash: true },
      { d: [[0, 75], [0.25, 75], [0.5, 100], [0.75, 100], [0.85, 100], [1, 77.7777778]], c: '#b26a39', n: '三档幅度 30/59/86' },
      { d: [[0, 100], [0.25, 100], [0.5, 100], [0.75, 97.2222222], [0.85, 91.6666667], [1, 91.6666667]], c: '#2f7d6b', n: '三特征质心' }
    ];
    SER.forEach(function (se, i) {
      var pts = se.d.map(function (p) { return X(p[0]).toFixed(1) + ',' + Y(p[1]).toFixed(1); });
      s += '<polyline points="' + pts.join(' ') + '" fill="none" stroke="' + se.c + '" stroke-width="2"' + (se.dash ? ' stroke-dasharray="5 3"' : '') + ' stroke-linejoin="round"/>';
      se.d.forEach(function (p) {
        s += '<circle cx="' + X(p[0]) + '" cy="' + Y(p[1]) + '" r="2.4" fill="#fff" stroke="' + se.c + '" stroke-width="1.4"/>';
      });
      /* 图例 */
      s += '<line x1="' + (x1 - 178) + '" y1="' + (22 + i * 12) + '" x2="' + (x1 - 160) + '" y2="' + (22 + i * 12) + '" stroke="' + se.c + '" stroke-width="2"' + (se.dash ? ' stroke-dasharray="5 3"' : '') + '/>';
      s += '<text x="' + (x1 - 154) + '" y="' + (25 + i * 12) + '" font-size="8" fill="#5d666d">' + se.n + '</text>';
    });

    /* 标定点 */
    s += '<line x1="' + X(0.5) + '" y1="' + yt + '" x2="' + X(0.5) + '" y2="' + yb + '" stroke="#9ba3a9" stroke-width="1" stroke-dasharray="3 3"/>';
    s += '<text x="' + (X(0.5) + 6) + '" y="' + (yt + 24) + '" font-size="8" fill="#79828a">阈值就是在这里标定的</text>';

    s += '<line x1="' + x0 + '" y1="' + yb + '" x2="' + x1 + '" y2="' + yb + '" stroke="#c9c2b0"/>';
    [0, 25, 50, 75, 100].forEach(function (v) {
      s += '<text x="' + X(v / 100) + '" y="' + (yb + 15) + '" font-size="8" font-family="monospace" fill="#79828a" text-anchor="middle">' + v + '%</text>';
    });
    s += '<text x="' + ((x0 + x1) / 2) + '" y="' + (yb + 30) + '" font-size="9" fill="#79828a" text-anchor="middle">微环隙强度（0 = 环隙极窄，100 = 已接近自由套管）</text>';

    s += '<rect x="24" y="' + (H - 30) + '" width="' + (W - 48) + '" height="22" rx="6" fill="#fbf3ed"/>';
    s += '<text x="36" y="' + (H - 15) + '" font-size="9.2" fill="#8c5340">同一合成剖面，已剔除 4 个标定段；三特征在强度 100% 时为 91.7%，仍存在错判。</text>';

    s += '</svg>';
    return s;
  }

  /* ================= 图 4：混淆矩阵 + 40 段判定条 ================= */
  function figConfuse() {
    var W = 636, H = 300;
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="两档幅度判别的混淆矩阵，以及40个评价段的真值与判定对照条">';

    s += '<text x="30" y="24" font-size="10.5" font-weight="600" fill="#242b2e">两档幅度错判了哪些未标定段</text>';
    s += '<text x="30" y="38" font-size="8.6" fill="#79828a">左：36 段测试矩阵；右：40 m 完整剖面，灰框为标定段</text>';

    var M = [[21, 0, 0, 0], [0, 0, 9, 0], [0, 0, 3, 0], [0, 0, 0, 3]];
    var gx = 100, gy = 66, cw = 40, chh = 26;
    s += '<text x="' + (gx + cw * 2 - 2) + '" y="' + (gy - 16) + '" font-size="8" fill="#9ba3a9" text-anchor="middle">判定 →</text>';
    CLS.forEach(function (L, j) {
      s += '<text x="' + (gx + j * cw + cw / 2) + '" y="' + (gy - 4) + '" font-size="7.2" fill="#79828a" text-anchor="middle">' + L.n + '</text>';
    });
    s += '<text x="' + (gx - 40) + '" y="' + (gy + 2 * chh) + '" font-size="8" fill="#9ba3a9" text-anchor="middle" transform="rotate(-90 ' + (gx - 40) + ' ' + (gy + 2 * chh) + ')">真值 ↓</text>';
    M.forEach(function (row, i) {
      s += '<text x="' + (gx - 6) + '" y="' + (gy + i * chh + chh / 2 + 3) + '" font-size="7.2" fill="#79828a" text-anchor="end">' + CLS[i].n + '</text>';
      row.forEach(function (v, j) {
        var on = i === j, op = v / 22;
        s += '<rect x="' + (gx + j * cw) + '" y="' + (gy + i * chh) + '" width="' + (cw - 2) + '" height="' + (chh - 2) + '" rx="2" fill="' + (on ? '#2f7d6b' : '#c0392b') + '" fill-opacity="' + (0.05 + op * 0.75).toFixed(2) + '"/>';
        s += '<text x="' + (gx + j * cw + (cw - 2) / 2) + '" y="' + (gy + i * chh + chh / 2 + 3) + '" font-size="8" font-family="monospace" fill="' + (op > 0.4 ? '#fff' : on ? '#3f6d61' : '#c8bdb0') + '" text-anchor="middle"' + (op > 0.4 ? ' font-weight="600"' : '') + '>' + v + '</text>';
      });
    });
    s += '<text x="' + gx + '" y="' + (gy + 4 * chh + 20) + '" font-size="8.4" fill="#8c5340">9 个测试微环隙段被判成窜槽</text>';
    s += '<text x="' + gx + '" y="' + (gy + 4 * chh + 33) + '" font-size="7.8" fill="#9ba3a9">其余三类全部判对</text>';

    /* 右：40 段对照条 */
    var bx = 348, by = 62, bh = 184;
    var sh = bh / 40;
    var TR = [3, 3, 3, 3]
      .concat(new Array(5).fill(0), new Array(5).fill(1), new Array(5).fill(0),
        new Array(4).fill(2), new Array(6).fill(0), new Array(5).fill(1), new Array(6).fill(0));
    var PO = TR.map(function (v) { return v === 1 ? 2 : v; });

    s += '<text x="' + bx + '" y="52" font-size="8" fill="#9ba3a9">0 m</text>';
    s += '<text x="' + bx + '" y="' + (by + bh + 12) + '" font-size="8" fill="#9ba3a9">40 m</text>';
    ['真值', '判定'].forEach(function (t, k) {
      var cx = bx + 20 + k * 62;
      s += '<text x="' + (cx + 18) + '" y="52" font-size="8" fill="#79828a" text-anchor="middle">' + t + '</text>';
      (k === 0 ? TR : PO).forEach(function (v, i) {
        s += '<rect x="' + cx + '" y="' + (by + i * sh) + '" width="36" height="' + (sh - 0.6) + '" fill="' + CLS[v].c + '" fill-opacity="' + (k === 0 ? 0.5 : 0.85) + '"/>';
        if ([2, 6, 11, 21].indexOf(i) >= 0) s += '<rect x="' + (cx - 1) + '" y="' + (by + i * sh - 0.3) + '" width="38" height="' + sh + '" fill="none" stroke="#68726e" stroke-width="1.3"/>';
      });
    });
    /* 错判标记 */
    TR.forEach(function (v, i) {
      if (v === 1) {
        s += '<line x1="' + (bx + 118) + '" y1="' + (by + i * sh + sh / 2) + '" x2="' + (bx + 126) + '" y2="' + (by + i * sh + sh / 2) + '" stroke="#c0392b" stroke-width="1.4"/>';
      }
    });
    s += '<text x="' + (bx + 130) + '" y="' + (by + 8) + '" font-size="7.6" fill="#c0392b">错判</text>';

    s += '<rect x="24" y="' + (H - 34) + '" width="' + (W - 48) + '" height="26" rx="6" fill="#f2f7f5"/>';
    s += '<text x="36" y="' + (H - 18) + '" font-size="9.2" fill="#3f6d61">两条 5 m 长的微环隙，在判定条上变成了两段“窜槽”——<tspan font-weight="600">接着就是一轮不该做的挤水泥作业。</tspan></text>';

    s += '</svg>';
    return s;
  }

  var DATA = [
    ['CBL 幅度', '当前为合成 mV 数值', '真实接入时需核对仪器、套管与标定条件'],
    ['地层波能量', '当前为合成 formE 代理量', '未实现从实测全波列提取'],
    ['周向信息', '当前为合成 circ 代理量', '常规 CBL/VDL 不直接提供，需相应方位观测'],
    ['人工标签', '4 个 1 m 标定段，每类 1 段', '另外 36 段只作评价，不能参与质心标定']
  ];
  return {
    id: 'c1-cement', sceneId: 'c1', title: '固井质量智能评价',
    summary: '用少量标定段形成质心，比较多特征如何改变胶结状态候选',
    status: 'ready', version: '1.0.0', updated: '2026-11-01', methods: ['cv', 'ts'],
    tabs: {
      background: {
        label: '专业背景',
        judge: [
          { label: '任务类型', value: '分段分类', desc: '三特征最近质心，四类合成状态' },
          { label: '已知样本', value: '4 段标定', desc: '同井其余 36 段评价' },
          { label: '合成验证', value: '75.0% → 100%', desc: '默认条件未标定段符合率，不是现场收益' },
          { label: '难点', value: '观测边界', desc: '多特征是否真正可得、类别是否可分' }
        ],
        lede: '幅度相近的井段可能对应不同胶结状态。本例先用四段已评级样本形成四类特征质心，再判别其余井段；与固定幅度阈值对照，检查新增信息是否改变判断，以及哪些结果仍需复测和人工解释。',
        sections: [
          { no: 1, en: 'PROBLEM', title: '同一幅度档，为什么可能给出不同判断',
            html: '<p>CBL 对微环隙等条件敏感，单个幅度值不能直接决定处置。本例设定 30 / 78 mV 两个阈值作传统对照，不将这些数值当通用规范。图中均值来自完整合成剖面。</p>' +
              K.figure(figBand(), 1, '完整合成剖面中的幅度分布说明重叠问题；该图含标定段，不是测试分数。真正评价只使用另外 36 段，其中 9 个微环隙段被两档幅度规则误判。') +
              '<p>分类结果只提出胶结状态候选。挤水泥、加压或停井等作业决定还需要结合测量条件、固井记录和专业复核。</p>' },
          { no: 2, en: 'INTERVENTION', title: '智能介入：由标定样本形成三维判别依据',
            html: '<p>每个点的输入为 [幅度/100, formE, circ]。四段已知标签分别形成四类质心，新点按欧氏距离归类；每 1 m 内两个点再多数表决。本例不是固定阈值改名，也没有训练图像网络。</p>' +
              K.figure(figPath(), 2, '简化声传播关系示意。当前 formE 和 circ 由生成器直接给出，图像是解释辅助；未实现从 VDL 灰度图提取这些量。') +
              K.callout('**周向代理量不能冒充常规 VDL 的实测输入。** 真实接入时，必须先确认仪器能提供相应方位信息；数据不足就应减少结论范围。') },
          { no: 3, en: 'DATA', title: '哪些输入已实现，哪些需要真实数据补齐',
            html: K.checklist(DATA) + '<p>当前仅为固定种子合成实验。波形显示根据合成状态绘制，不用于分类；不能把这张图称为模型已经读懂的实测图像。</p>' +
              '<p><a href="https://glossary.slb.com/en/terms/c/cement_bond_log" target="_blank" rel="noopener noreferrer">SLB：cement bond log ↗</a> · <a href="https://glossary.slb.com/en/terms/v/variable-density_log" target="_blank" rel="noopener noreferrer">SLB：variable-density log ↗</a></p>' },
          { no: 4, en: 'VALIDATION', title: '比较之前先分清标定和测试',
            html: '<p>40 个评价段中，索引 2、6、11、21 用于标定，36 段用于评分。三种方法使用相同测试范围。调整强度或噪声会重新计算当前四段质心，因此此实验不证明固定模型的跨条件迁移能力。</p>' +
              K.figure(figSweep(), 3, '各点均已排除标定段。三特征分支每组条件重新标定；强度 100% 时测试符合率为 91.7%，说明补充输入也不能消除所有歧义。') }
        ]
      },
      workflow: {
        label: '案例流程', title: '案例：40 m 合成井段的标定、判别与独立留段评价',
        lead: [
          '全剖面 40 m、80 个点、40 个 1 m 段。四类各取一段标定；其余 36 段包含胶结良好 21 段、微环隙 9 段、窜槽 3 段、自由套管 3 段。',
          '先看哪些已知样本参与形成质心，再比较同一批未标定段。测试标签只用于事后统计；这是同井留段检验，尚未验证未见井泛化。'
        ],
        stats: [ ['完整剖面', '40 m / 40 段', true], ['有标签标定', '4 段', true], ['评分范围', '36 段'], ['两档幅度', '75.0%'], ['三特征质心', '100%'], ['强度 100% 时', '91.7%'] ],
        steps: [
          { name: '划分已知与待判段', role: '数据', do: '固定 4 段作为标定集，其余 36 段为测试范围，三种方法共用这一范围。', effect: '避免用记住的标定点提高测试分数', trap: '同井相邻段仍相似，不能把留段成绩当作跨井能力' },
          { name: '准备输入与阈值对照', role: '工程', do: '生成幅度、地层波能量与周向代理量；用两档或三档幅度规则作对照。', effect: '明确每种方法究竟得到哪些信息', trap: '未从实测 VDL 提取周向特征，不能宣称该输入已经现场可用' },
          { name: '用标定段形成质心', role: '学习介入', do: '每类两个标定点取三维均值，形成四个类质心。改变实验条件会重新标定。', effect: '已知类别样本直接决定分类参考', trap: '重标定与固定模型迁移是两种验证，不能混在一起比较' },
          { name: '距离分类与段内表决', role: '推理', do: '新点归入最近质心，两个采样点多数表决形成 1 m 段候选；并列时按固定类别顺序处理。', effect: '输出可放回深度的胶结状态候选', trap: '最近与次近距离之差不是校准置信度，特征重叠时仍会判错' },
          { name: '留段评价与作业复核', role: '闭环', do: '只对 36 段统计符合率、类别误判和混淆矩阵；结合原始记录安排人工解释或复测。', effect: '区分算法候选、测试结果与工程决策', trap: '判错标记使用事后真值，不是现场自动生成的复核名单' }
        ],
        metrics: { title: '同一批未标定段上的结果', html:
          K.figure(figConfuse(), 4, '默认强度 50%、噪声 1.0×。左侧矩阵只统计 36 段；右侧显示完整剖面并框出四个标定段。') +
          K.dtable(['方法', '测试符合率', '微环隙误判', '测试错段'], [
            ['两档幅度', '75.0%', '9 / 9', '9 / 36'],
            ['三档幅度', '100%', '0 / 9', '0 / 36'],
            ['三特征质心（当前条件重标定）', '100%', '0 / 9', '0 / 36']
          ]) + '<p class="small muted">固定合成数据下的复算结果，不证明现场性能；三档阈值按默认分布设定，尚无独立开发集调参。</p>' },
        fails: [
          { name: '把标定段算进测试', why: '现在已排除 4 段。测试分母为 36；完整图上显示 40 段只是保留井段上下文。' },
          { name: '输入实际上不可得', why: '周向量是合成代理特征，常规 CBL/VDL 不能自动补出完整周向观测。实测输入不足时要收缩判断范围。' },
          { name: '类别在输入空间重叠', why: '生成器在强度增大时让微环隙逐渐接近自由套管，重标定后仍会误判。需要更多观测和专业解释，不能由当前分类直接决定修井。' },
          { name: '把重标定曲线当作迁移成绩', why: '每次调整条件，标定样本随之更新；后续应增加固定模型、未见井与独立噪声种子的测试。' }
        ]
      },
      demo: { label: '可运行示范', intro: '比较两档幅度、三档幅度与三特征质心。四个标定段用“标”标出，不计入顶部 36 段测试分数。再改变合成强度和噪声，检查错段；每次调整都会重标定。', height: 870 }
    },
    demoGlobal: 'C1DEMO'
  };
};
