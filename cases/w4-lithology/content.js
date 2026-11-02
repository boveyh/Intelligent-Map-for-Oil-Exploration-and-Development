/* =========================================================
   w4 · 岩性识别 —— 案例正文（单一源）
   ---------------------------------------------------------
   所有指标由 tools/test-w4.js 实测产出，不手填。
   ========================================================= */

module.exports = function (K) {

  /* ================= 图 1：交会图为什么是必须的 ================= */
  function figCrossplot() {
    var W = 636, H = 352;
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="五类岩性在伽马-密度交会图上的分布，以及各自的边缘分布重叠情况">';

    var X0 = 74, X1 = 424, Y0 = 34, Y1 = 232;
    var GRMIN = 0, GRMAX = 150, DNMIN = 2.25, DNMAX = 2.80;
    var X = function (v) { return X0 + (v - GRMIN) / (GRMAX - GRMIN) * (X1 - X0); };
    var Y = function (v) { return Y1 - (v - DNMIN) / (DNMAX - DNMIN) * (Y1 - Y0); };

    var F = [
      { n: '灰岩', c: '#7e5a8d', gr: [26, 8], den: [2.71, 0.028], w: 0.14 },
      { n: '砂岩', c: '#2f7d6b', gr: [40, 9], den: [2.37, 0.030], w: 0.26 },
      { n: '泥质砂岩', c: '#41699b', gr: [66, 12], den: [2.47, 0.032], w: 0.21 },
      { n: '砂质泥岩', c: '#b26a39', gr: [86, 13], den: [2.56, 0.033], w: 0.25 },
      { n: '泥岩', c: '#8d6a3f', gr: [106, 13], den: [2.63, 0.033], w: 0.14 }
    ];

    /* 网格 */
    [0, 30, 60, 90, 120, 150].forEach(function (v) {
      s += '<line x1="' + X(v) + '" y1="' + Y0 + '" x2="' + X(v) + '" y2="' + Y1 + '" stroke="#eeeae0"/>';
      s += '<text x="' + X(v) + '" y="' + (Y1 + 15) + '" font-size="9" font-family="monospace" fill="#9ba3a9" text-anchor="middle">' + v + '</text>';
    });
    [2.3, 2.4, 2.5, 2.6, 2.7, 2.8].forEach(function (v) {
      s += '<line x1="' + X0 + '" y1="' + Y(v) + '" x2="' + X1 + '" y2="' + Y(v) + '" stroke="#eeeae0"/>';
      s += '<text x="' + (X0 - 7) + '" y="' + (Y(v) + 3.5) + '" font-size="9" font-family="monospace" fill="#9ba3a9" text-anchor="end">' + v.toFixed(2) + '</text>';
    });

    /* 主图：1.4σ 椭圆 */
    var rxOf = function (sg) { return 1.4 * sg / (GRMAX - GRMIN) * (X1 - X0); };
    var ryOf = function (sd) { return 1.4 * sd / (DNMAX - DNMIN) * (Y1 - Y0); };
    F.forEach(function (f) {
      s += '<ellipse cx="' + X(f.gr[0]) + '" cy="' + Y(f.den[0]) + '" rx="' + rxOf(f.gr[1]) + '" ry="' + ryOf(f.den[1]) +
        '" fill="' + f.c + '" fill-opacity=".16" stroke="' + f.c + '" stroke-opacity=".75"/>';
      s += '<circle cx="' + X(f.gr[0]) + '" cy="' + Y(f.den[0]) + '" r="2.6" fill="' + f.c + '"/>';
      s += '<text x="' + X(f.gr[0]) + '" y="' + (Y(f.den[0]) - ryOf(f.den[1]) - 5) + '" font-size="9.5" fill="' + f.c +
        '" text-anchor="middle" font-weight="600">' + f.n + '</text>';
    });

    /* 轴 */
    s += '<line x1="' + X0 + '" y1="' + Y1 + '" x2="' + X1 + '" y2="' + Y1 + '" stroke="#c9c2b0"/>';
    s += '<line x1="' + X0 + '" y1="' + Y1 + '" x2="' + X0 + '" y2="' + Y0 + '" stroke="#c9c2b0"/>';
    s += '<text x="' + ((X0 + X1) / 2) + '" y="' + (Y1 + 28) + '" font-size="9.5" fill="#79828a" text-anchor="middle">自然伽马 GR / API</text>';
    s += '<text x="20" y="' + ((Y0 + Y1) / 2) + '" font-size="9.5" fill="#79828a" text-anchor="middle" transform="rotate(-90 20 ' + ((Y0 + Y1) / 2) + ')">密度 DEN / g·cm⁻³</text>';

    /* ---- GR 边缘分布（横条） ---- */
    var MY0 = 278, MY1 = 322;
    s += '<rect x="' + X0 + '" y="' + MY0 + '" width="' + (X1 - X0) + '" height="' + (MY1 - MY0) + '" fill="#faf8f2" stroke="#e9e4d8"/>';
    var pk = 0;
    var dens = F.map(function (f) {
      var arr = [];
      for (var i = 0; i <= 150; i++) {
        var d = f.w * Math.exp(-Math.pow(i - f.gr[0], 2) / (2 * f.gr[1] * f.gr[1]));
        arr.push(d);
        if (d > pk) pk = d;
      }
      return arr;
    });
    F.forEach(function (f, k) {
      var arr = dens[k], pts = [];
      for (var i = 0; i <= 150; i++) {
        var h = arr[i] / pk * (MY1 - MY0 - 3);
        pts.push(X(i).toFixed(1) + ',' + (MY1 - h).toFixed(1));
      }
      s += '<polygon points="' + X(0) + ',' + MY1 + ' ' + pts.join(' ') + ' ' + X(150) + ',' + MY1 +
        '" fill="' + f.c + '" fill-opacity=".13" stroke="' + f.c + '" stroke-opacity=".55" stroke-width="1"/>';
    });
    /* 重叠区高亮：灰岩 vs 砂岩 */
    var L = 30, R = 48;
    s += '<rect x="' + X(L) + '" y="' + MY0 + '" width="' + (X(R) - X(L)) + '" height="' + (MY1 - MY0) +
      '" fill="#b26a39" fill-opacity=".13" stroke="#b26a39" stroke-dasharray="3 2" stroke-opacity=".6"/>';
    s += '<text x="' + ((X(L) + X(R)) / 2) + '" y="' + (MY1 + 13) + '" font-size="9" fill="#b26a39" text-anchor="middle">灰岩 ↔ 砂岩 重叠区</text>';
    s += '<text x="' + (X0 - 8) + '" y="' + ((MY0 + MY1) / 2 + 3) + '" font-size="9" fill="#79828a" text-anchor="end">GR 边缘</text>';
    s += '<text x="' + (X0 - 8) + '" y="' + ((MY0 + MY1) / 2 + 14) + '" font-size="9" fill="#79828a" text-anchor="end">分布</text>';

    /* ---- 右侧结论 ---- */
    var AX = 444;
    s += '<text x="' + AX + '" y="' + (Y0 + 4) + '" font-size="10.5" font-weight="600" fill="#242b2e">只看一条曲线会发生什么</text>';

    s += '<text x="' + AX + '" y="' + (Y0 + 30) + '" font-size="9.5" font-weight="600" fill="#7e5a8d">灰岩</text>';
    s += '<text x="' + (AX + 40) + '" y="' + (Y0 + 30) + '" font-size="9.5" font-family="monospace" fill="#5d666d">GR 26±8　DEN 2.71</text>';
    s += '<text x="' + AX + '" y="' + (Y0 + 46) + '" font-size="9.5" font-weight="600" fill="#2f7d6b">砂岩</text>';
    s += '<text x="' + (AX + 40) + '" y="' + (Y0 + 46) + '" font-size="9.5" font-family="monospace" fill="#5d666d">GR 40±9　DEN 2.37</text>';
    s += '<text x="' + AX + '" y="' + (Y0 + 66) + '" font-size="9.5" fill="#b26a39">两条伽马分布几乎叠在一起 →</text>';
    s += '<text x="' + AX + '" y="' + (Y0 + 80) + '" font-size="9.5" fill="#b26a39">只按 GR 分档，必然把砂岩判成灰岩。</text>';
    s += '<text x="' + AX + '" y="' + (Y0 + 100) + '" font-size="9.5" fill="#5d666d">但密度差 0.34 g/cm³（约 11 个标准差），</text>';
    s += '<text x="' + AX + '" y="' + (Y0 + 114) + '" font-size="9.5" fill="#5d666d">在纵轴上一眼就分开了。</text>';

    s += '<line x1="' + AX + '" y1="' + (Y0 + 128) + '" x2="' + (W - 12) + '" y2="' + (Y0 + 128) + '" stroke="#e9e4d8"/>';

    s += '<text x="' + AX + '" y="' + (Y0 + 148) + '" font-size="9.5" font-weight="600" fill="#8d6a3f">泥岩</text>';
    s += '<text x="' + (AX + 40) + '" y="' + (Y0 + 148) + '" font-size="9.5" font-family="monospace" fill="#5d666d">GR 106±13　DEN 2.63</text>';
    s += '<text x="' + AX + '" y="' + (Y0 + 164) + '" font-size="9.5" fill="#5d666d">反过来，泥岩和灰岩的密度只差 0.08，</text>';
    s += '<text x="' + AX + '" y="' + (Y0 + 178) + '" font-size="9.5" fill="#5d666d">只按密度分又会混 —— 必须两个一起看。</text>';

    s += '</svg>';
    return s;
  }

  /* ================= 图 2：井间刻度漂移把分界搬歪 ================= */
  function figDrift() {
    var W = 636, H = 300;
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="训练井与测试井的岩性簇位置偏移，同一条阈值线在两口井上切出不同结果">';

    var GRMIN = 0, GRMAX = 150, DNMIN = 2.25, DNMAX = 2.80;
    var PW = 250, PH = 176, PY = 46;

    var F = [
      { n: '灰岩', c: '#7e5a8d', gr: 26, den: 2.71 },
      { n: '砂岩', c: '#2f7d6b', gr: 40, den: 2.37 },
      { n: '泥质砂岩', c: '#41699b', gr: 66, den: 2.47 },
      { n: '砂质泥岩', c: '#b26a39', gr: 86, den: 2.56 },
      { n: '泥岩', c: '#8d6a3f', gr: 106, den: 2.63 }
    ];
    var TH = [27, 44.3, 65.1, 81.3];
    var SHIFT = -16.7;   // 测试井 GR 整体偏移（实测：drift=1.2 时该井偏移 -16.7 API）

    function panel(px, title, sub, shift, hi) {
      var g = '';
      var X = function (v) { return px + (v - GRMIN) / (GRMAX - GRMIN) * PW; };
      var Y = function (v) { return PY + PH - (v - DNMIN) / (DNMAX - DNMIN) * PH; };

      g += '<text x="' + px + '" y="' + (PY - 26) + '" font-size="10.5" font-weight="600" fill="#242b2e">' + title + '</text>';
      g += '<text x="' + px + '" y="' + (PY - 11) + '" font-size="9.5" fill="' + (hi ? '#b26a39' : '#79828a') + '">' + sub + '</text>';

      g += '<rect x="' + px + '" y="' + PY + '" width="' + PW + '" height="' + PH + '" fill="#fbfaf5" stroke="#e9e4d8"/>';
      [0, 50, 100, 150].forEach(function (v) {
        g += '<line x1="' + X(v) + '" y1="' + PY + '" x2="' + X(v) + '" y2="' + (PY + PH) + '" stroke="#eeeae0"/>';
        g += '<text x="' + X(v) + '" y="' + (PY + PH + 13) + '" font-size="8.5" font-family="monospace" fill="#9ba3a9" text-anchor="middle">' + v + '</text>';
      });

      /* 阈值线（来自训练井，两幅图完全一样） */
      TH.forEach(function (t) {
        if (t <= GRMAX) {
          g += '<line x1="' + X(t) + '" y1="' + PY + '" x2="' + X(t) + '" y2="' + (PY + PH) + '" stroke="#b26a39" stroke-width="1.3" stroke-dasharray="5 3" stroke-opacity=".8"/>';
        }
      });

      F.forEach(function (f) {
        var gx = f.gr + shift;
        g += '<ellipse cx="' + X(gx) + '" cy="' + Y(f.den) + '" rx="' + (1.3 * 9 / 150 * PW) + '" ry="' + (1.3 * 0.03 / 0.55 * PH) + '" fill="' + f.c + '" fill-opacity=".18" stroke="' + f.c + '" stroke-opacity=".7"/>';
        g += '<circle cx="' + X(gx) + '" cy="' + Y(f.den) + '" r="2.4" fill="' + f.c + '"/>';
      });
      return g;
    }

    s += panel(20, '训练井（1—4 号）', '五个岩性簇 + 由训练集算出的四条分界线', 0, false);
    s += panel(340, '测试井（0 号）', '同一套地层，仪器刻度整体偏 ' + Math.abs(SHIFT).toFixed(1) + ' API', SHIFT, true);

    /* 中间箭头 */
    s += '<path d="M280 134h50" stroke="#b26a39" stroke-width="1.4" fill="none"/>';
    s += '<path d="M325 129.5l5.5 4.5-5.5 4.5" stroke="#b26a39" stroke-width="1.4" fill="none"/>';
    s += '<text x="305" y="128" font-size="8.5" fill="#b26a39" text-anchor="middle">同一套</text>';
    s += '<text x="305" y="152" font-size="8.5" fill="#b26a39" text-anchor="middle">地层</text>';

    /* 关键标注：测试井的砂岩被切到灰岩一侧，用红环标出 */
    var Xt = function (v) { return 340 + (v - GRMIN) / (GRMAX - GRMIN) * PW; };
    var Yt = function (v) { return PY + PH - (v - DNMIN) / (DNMAX - DNMIN) * PH; };
    var xSS = Xt(40 + SHIFT), ySS = Yt(2.37);
    s += '<ellipse cx="' + xSS + '" cy="' + ySS + '" rx="26" ry="19" fill="none" stroke="#c0392b" stroke-width="1.4" stroke-dasharray="4 3"/>';
    s += '<text x="' + (xSS + 28) + '" y="' + (ySS + 20) + '" font-size="8.5" fill="#c0392b">判成灰岩</text>';

    /* 底部说明 */
    s += '<rect x="20" y="256" width="' + (W - 40) + '" height="32" rx="6" fill="#fbf3ed"/>';
    s += '<text x="32" y="271" font-size="9.5" fill="#8c5340">测试井的砂岩中心（23.3）落到了分界线（27）的左边 —— 于是 <tspan font-weight="600">41 个砂岩样点里有 21 个被判成灰岩</tspan>。</text>';
    s += '<text x="32" y="284" font-size="9.5" fill="#8c5340">模型和阈值都没错，错的是"把一口井的绝对刻度当成全区的标准"。</text>';

    s += '</svg>';
    return s;
  }

  /* ================= 图 3：两条实测曲线 ================= */
  function figCurves() {
    var W = 636, H = 300;
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="四种方法随井间漂移与训练井数变化的合成实验曲线">';

    function chart(ox, title, sub, xmin, xmax, series, ticks, xlab) {
      var x0 = ox + 40, x1 = ox + 268, y0 = 58, y1 = 206;
      /* 下界必须放到 0.2：漂移拉满时单曲线会掉到 0.244，留在 0.4 会把线画到框外 */
      var Y = function (v) { return y1 - (v - 0.2) / 0.8 * (y1 - y0); };
      var g = '';
      g += '<text x="' + ox + '" y="26" font-size="10.5" font-weight="600" fill="#242b2e">' + title + '</text>';
      g += '<text x="' + ox + '" y="41" font-size="9" fill="#79828a">' + sub + '</text>';

      [0.2, 0.4, 0.6, 0.8, 1.0].forEach(function (v) {
        g += '<line x1="' + x0 + '" y1="' + Y(v) + '" x2="' + x1 + '" y2="' + Y(v) + '" stroke="#eeeae0"/>';
        g += '<text x="' + (x0 - 7) + '" y="' + (Y(v) + 3.5) + '" font-size="9" font-family="monospace" fill="#9ba3a9" text-anchor="end">' + v.toFixed(1) + '</text>';
      });
      g += '<line x1="' + x0 + '" y1="' + y1 + '" x2="' + x1 + '" y2="' + y1 + '" stroke="#c9c2b0"/>';

      var X = function (v) { return x0 + (v - xmin) / (xmax - xmin) * (x1 - x0); };
      series.forEach(function (se) {
        var pts = se.d.map(function (d) { return X(d[0]).toFixed(1) + ',' + Y(d[1]).toFixed(1); });
        g += '<polyline points="' + pts.join(' ') + '" fill="none" stroke="' + se.c + '" stroke-width="' + (se.w || 1.8) +
          '" stroke-dasharray="' + (se.dash || 'none') + '" stroke-linejoin="round"/>';
        if (se.dot) se.d.forEach(function (d) {
          g += '<circle cx="' + X(d[0]) + '" cy="' + Y(d[1]) + '" r="2.2" fill="' + se.c + '"/>';
        });
      });

      ticks.forEach(function (v) {
        g += '<text x="' + X(v) + '" y="' + (y1 + 14) + '" font-size="9" font-family="monospace" fill="#9ba3a9" text-anchor="middle">' + v + '</text>';
      });
      g += '<text x="' + ((x0 + x1) / 2) + '" y="' + (y1 + 29) + '" font-size="9.5" fill="#79828a" text-anchor="middle">' + xlab + '</text>';
      return g;
    }

    var DR = [0, 0.3, 0.6, 1.0, 1.4, 1.8, 2.2, 2.6, 3.0];
    s += chart(8, 'a · 井间漂移 → 宏 F1', '训练 4 口井，类别重叠 0.35', 0, 3,
      [
        { c: '#b26a39', d: [[0, 0.634], [0.3, 0.583], [0.6, 0.581], [1.0, 0.585], [1.4, 0.533], [1.8, 0.437], [2.2, 0.324], [2.6, 0.263], [3.0, 0.244]], dot: true, w: 1.6 },
        { c: '#41699b', d: [[0, 0.879], [0.3, 0.855], [0.6, 0.849], [1.0, 0.774], [1.4, 0.679], [1.8, 0.610], [2.2, 0.618], [2.6, 0.568], [3.0, 0.517]], dot: true, w: 1.6 },
        { c: '#8d6a3f', d: [[0, 0.923], [0.3, 0.891], [0.6, 0.831], [1.0, 0.798], [1.4, 0.687], [1.8, 0.613], [2.2, 0.547], [2.6, 0.564], [3.0, 0.499]], dot: true, w: 1.6 },
        { c: '#2f7d6b', d: [[0, 0.907], [0.3, 0.907], [0.6, 0.907], [1.0, 0.907], [1.4, 0.907], [1.8, 0.907], [2.2, 0.907], [2.6, 0.907], [3.0, 0.907]], dot: true, w: 2.2 }
      ],
      [0, 1, 2, 3], '井间刻度漂移（相对强度）');

    s += chart(326, 'b · 训练井数 → 宏 F1', '漂移固定 1.2，其余同左', 1, 7,
      [
        { c: '#8d6a3f', d: [[1, 0.861], [2, 0.885], [3, 0.763], [4, 0.746], [5, 0.735], [6, 0.763], [7, 0.687]], dot: true, w: 1.8 },
        { c: '#2f7d6b', d: [[1, 0.925], [2, 0.896], [3, 0.901], [4, 0.907], [5, 0.912], [6, 0.925], [7, 0.925]], dot: true, w: 2.2 }
      ],
      [1, 3, 5, 7], '参与训练的井数');

    /* 图例 */
    var LG = [
      ['#b26a39', '单曲线阈值'], ['#41699b', '交会图分区'],
      ['#8d6a3f', 'KNN 原始曲线'], ['#2f7d6b', 'KNN 井内标准化']
    ];
    LG.forEach(function (l, i) {
      var lx = 14 + i * 108;
      s += '<line x1="' + lx + '" y1="258" x2="' + (lx + 16) + '" y2="258" stroke="' + l[0] + '" stroke-width="2"/>';
      s += '<text x="' + (lx + 21) + '" y="261.5" font-size="9.5" fill="#5d666d">' + l[1] + '</text>';
    });

    s += '<line x1="312" y1="46" x2="312" y2="212" stroke="#e9e4d8" stroke-dasharray="3 4"/>';
    s += '<text x="14" y="286" font-size="9.5" fill="#79828a">左图：井间漂移加大，前三种方法全线下滑，只有井内标准化一条平线（0.907 始终不变）。</text>';
    s += '</svg>';
    return s;
  }

  /* ================= 数据清单 ================= */
  var DATA = [
    ['常规测井曲线', 'GR / DEN / CNL / AC / RT，0.125 m 采样', '至少两条，缺一不可'],
    ['岩性标签', '取心段岩心描述、岩屑录井、或成熟井解释成果', '500—3000 个层点'],
    ['标志层与标准化依据', '全区稳定分布的泥岩段或灰岩标志层', '跨井对齐的基准'],
    ['区域地层表', '本区可能出现的岩性组合', '限定候选类别，别让模型乱猜'],
    ['井径与泥浆记录', '判断密度曲线是否失真', '扩径段要剔除']
  ];

  return {

    id: 'w4-lithology',
    sceneId: 'w4',
    title: '岩性识别',
    summary: '从已知井的近邻投票识别新井岩性，追查跨井漂移造成的判断分歧',
    status: 'ready',
    version: '1.0.0',
    updated: '2026-10-31',
    methods: ['ts'],

    tabs: {
      background: {
        label: '专业背景',

        judge: [
          { label: '任务类型', value: '多变量分类', desc: '五类岩性，逐深度点判别', html: '<span style="color:var(--c-ts)">逐点分类</span>' },
          { label: '数据门槛', value: '多井曲线 + 岩性标签', desc: '取心段岩心描述或成熟井成果' },
          { label: '合成验证', value: '宏 F1 0.57 → 0.91', desc: '固定合成测试井，四种方法对照', html: '<b style="color:var(--jade-d);font-family:var(--mono)">+0.34</b>' },
          { label: '难度', value: '中', desc: '算法不难，难在井间对齐', html: K.dtag('中') }
        ],

        lede: '同一个低伽马读数可能对应不同岩性，换井后的刻度漂移又会让原有分界失效。本例让 KNN 参考已知井的岩性标签，给出测试井逐点分类；你可以选中一个深度点，追查五个近邻如何投票，并找出需要解释员复核的分歧。',

        sections: [
          {
            no: 1, en: 'PROBLEM', title: '当前做法与问题',
            html: '<p>传统做法是<b>交会图 + 人工圈区</b>：把伽马和中子、密度两两组合画成散点图，不同的岩性聚成不同的团，解释员在图上画几条线把团分开，再把图版套到每口井上逐段判读。</p>' +
              '<p>本例合成设定的第一个难点是<b>单变量不够用</b>。灰岩的伽马中心为 26 API，砂岩为 40 API，两类分布在 30—48 API 重叠；只用伽马分档会混淆部分砂岩与灰岩。这里两类密度中心相差 0.34 g/cm³，加入密度后更容易区分。这些数值是可控演示条件，不是通用岩性判别标准。</p>' +
              K.figure(figCrossplot(), 1, '合成五类岩性在 GR–DEN 平面上的位置与伽马边缘分布。**灰岩和砂岩的伽马重叠**，密度提供补充信息；后续用相同测试点比较阈值、人工分区和 KNN。') +
              '<p>第二个陷阱更隐蔽：<b>井间刻度差</b>。不同年代、不同测井公司、不同泥浆体系测出来的伽马，同一套地层能差十几到几十 API。图版是在 A 井上圈定的，搬到 B 井就歪了 —— 而歪了不会报错，它只是安静地把砂岩写成灰岩。</p>'
          },
          {
            no: 2, en: 'INTERVENTION', title: 'AI 能做什么',
            html: '<p>本例的智能介入是<b>有监督的 K 近邻分类</b>：保存训练井的 GR、DEN 与五类岩性标签，对测试点计算距离，再由五个最近样本投票。它利用已知样本形成判断，而不是新增一组人工阈值。演示会列出实际近邻、距离和票数；<b>投票份额不等于校准后的置信概率</b>。</p>' +
              '<p>第二个可检验因素是<b>井内标准化</b>。当前代码分别使用每口井完整的无标签曲线计算均值与标准差，再做 z 变换；测试井标签只用于事后评分。它适合这里各井岩性组成相近、主要差异为加性刻度漂移的合成条件。真实井若岩性组成不同，直接对齐整体分布可能掩盖地质差异；随钻只见到部分井段时，也不能沿用完整井统计量。</p>' +
              K.figure(figDrift(), 2, '同一套地层、同一批岩性，测试井的伽马整体偏了 16.7 API。训练井算出的分界线（27）没动，但测试井的砂岩簇中心（23.3）已经跑到线的左边 —— **41 个砂岩样点里 21 个被判成灰岩**。阈值和模型都没错，错的是把一口井的绝对刻度当成了全区的标准。') +
              K.callout('选一个传统分档与 KNN 不一致的点：**先看哪些训练样本投票，再看标准化是否改变近邻，最后用保留的真值评价。** 标准化的作用必须与具体数据条件一起验证。')
          },
          {
            no: 3, en: 'DATA', title: '你需要准备什么',
            html: '<p style="margin-bottom:14px">曲线从来不难拿，难的是<b>标签</b>和<b>对齐依据</b>。立项前先确认有没有一口全区稳定的标志层 —— 没有它，标准化就无从谈起。</p>' +
              K.checklist(DATA) +
              '<p style="margin-top:18px"><span class="kicker plain" style="color:var(--ink-4)">可参考的公开数据集</span></p>' +
              '<p><a href="https://github.com/bolgebrygg/Force-2020-Machine-Learning-competition" target="_blank" rel="noopener noreferrer">FORCE 2020 岩性预测竞赛：多井曲线与岩性标签 ↗</a></p>' +
              '<p><a href="https://github.com/seg/2016-ml-contest" target="_blank" rel="noopener noreferrer">SEG 2016 相分类竞赛：参考盲井评估，数据另有使用限制 ↗</a></p>' +
              '<p class="small muted">当前演示未使用上述数据。接入真实数据前须核查分发许可、类别定义及完整测试井划分。</p>'
          },
          {
            no: 4, en: 'DIFFICULTY', title: '技术难度与参考方向',
            html: '<div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-bottom:2px">' +
              K.dtag('中') + '<span class="small muted">分类算法本身很成熟；难点全在"井与井之间对不齐"。</span></div>' +
              K.meter('中') +
              '<p>重点核查三个条件：<b>井间刻度差</b>是否改变近邻，<b>单曲线重叠</b>是否需要补充特征，以及<b>薄互层</b>是否被曲线分辨率限制。前两项可在当前合成演示中控制；真实薄层响应还需要相应数据验证。</p>' +
              '<p>建议的验证顺序：先画交会图确认<b>类别在二维上是否可分</b>；再做标准化并<b>按井划分</b>验证；最后才比模型。反过来做（先选模型再调参）是这条案例里最常见的失败路径。</p>' +
              '<p style="margin-top:18px"><span class="kicker plain" style="color:var(--ink-4)">可借鉴的通用技术</span></p>' +
              K.refs(['K 近邻与随机森林', '按组划分验证', '特征标准化', '类别不均衡处理'], '#/method/ts') +
              '<p style="margin-top:18px" class="small muted">交叉环节：<a href="#/stage/welllog" style="color:var(--jade-d);font-weight:600">测井</a> · <a href="#/stage/mudlog" style="color:var(--jade-d);font-weight:600">录井</a> · <a href="#/stage/reservoir" style="color:var(--jade-d);font-weight:600">油藏</a></p>'
          }
        ]
      },

      workflow: {
        label: '案例流程',
        title: '案例：Z 区块 8 口井的岩性剖面重解释',
        lead: [
          '合成 Z 区块有 8 口井、每口 160 个深度点，预设灰岩、砂岩、泥质砂岩、砂质泥岩、泥岩五类标签。0 号井整口留出不参与训练，标签只作事后评分；训练井数可调。',
          '目标不是"训一个最准的模型"，而是**让这个模型在没参与训练的井上也能用**。这两件事差别很大：下面五个步骤里，第 1 步和第 4 步不涉及任何模型，却决定了最后那个 F1 是真的还是假的。'
        ],
        stats: [
          ['井数', '8', true], ['每井深度点', '160', true],
          ['岩性类别', '5', true], ['目标宏 F1', '≥0.90'],
          ['未做标准化', '0.57 / 0.75'], ['案例结果', '0.91']
        ],
        steps: [
          {
            name: '曲线标准化', role: '工程环节',
            do: '演示按每口井完整、无标签的 GR 和 DEN 计算均值与标准差，将曲线做 z 变换；原始 KNN 分支保留为对照。',
            effect: '检验移除合成刻度漂移后，邻居选择与分类是否改善',
            trap: '各井岩性组成差异大时，整体标准化可能去掉真实差异；测试井标签不得参与这一步'
          },
          {
            name: '标签整理与类别合并', role: '工程环节',
            do: '当前生成器直接给出五类合成标签。接入真实井时，另行核对岩心、录井和解释成果的类别体系与深度对应关系。',
            effect: '明确模型学习的目标，以及哪些标签可用于训练',
            trap: '当前没有执行真实类别合并；不能把合成五类直接当作公开数据的原始标签'
          },
          {
            name: '交会图分析与特征选择', role: '算法核心',
            do: '先画 GR–DEN、GR–CNL 交会图，确认哪些类别在二维上可分、哪些确实重叠；重叠严重的类别再补曲线（声波、元素俘获谱），而不是急着换模型。',
            effect: '把"能不能分"和"用什么分"这两件事分开判断',
            trap: '不做交会图直接上模型，等于放弃了唯一能提前发现"这类根本分不开"的机会'
          },
          {
            name: '按井划分训练与验证', role: '质控',
            do: '留出整口井做测试，绝不按深度点随机切分；同时统计训练井与测试井的曲线直方图偏移量，作为"标准化是否到位"的证据。',
            effect: '默认合成条件下，标准化 KNN 的测试井宏 F1 为 0.907；不是现场性能承诺',
            trap: '同井相邻深度随机分到两侧容易高估泛化；单口合成测试井也不足以证明跨区块适用'
          },
          {
            name: '剖面输出与人工复核', role: '闭环',
            do: '选择测试深度点，对照 GR 分档与 KNN，查看五个实际近邻及票数。分歧按钮按两方法预测选择点，不读取测试真值。',
            effect: '给解释员提供可追查的判断依据与复核线索；当前未实现人工改标回流',
            trap: '高票数也可能一起判错；不能把投票占比当作校准概率或预设自动处理比例'
          }
        ],
        metrics: {
          title: '怎么算"识别对了"',
          html: '<p>用<b>宏平均 F1</b>，不是准确率。五类里泥岩和砂岩占大头，准确率会被它们拉高；宏 F1 给每一类同等权重，薄层才不会被大户吃掉。更重要的是<b>必须在没参与训练的井上算</b>。</p>' +
            K.figure(figCurves(), 3, '左图：井间漂移从 0 加到 3，单曲线、交会图分区、KNN 原始三条线全部下滑，只有井内标准化是一条平线（0.907 始终不动）。右图：**不加标准化时，多加训练井并不带来收益**（0.86 → 0.69），因为每口井的刻度不同，混进训练集等于往模型里灌矛盾信息。') +
            K.dtable(['方法', '用到的信息', '测试井宏 F1'], [
              ['单曲线阈值', 'GR 一条曲线的三个分档', '0.57'],
              ['交会图矩形分区', 'GR + DEN，人工圈区的算法等价物', '0.72'],
              ['KNN（原始曲线）', 'GR + DEN，学习得到边界', '0.75'],
              ['KNN + 井内标准化', '同上，先做井内 z 变换', '0.91'],
              ['漂移最大时（对照）', '四种方法，漂移强度 3.0', '0.24 / 0.52 / 0.50 / 0.91']
            ])
        },
        fails: [
          { name: '灰岩与砂岩的伽马重叠', why: '两者 GR 分布重叠过半，任何只用伽马的方案都会把砂岩判成灰岩。这不是模型能力问题：二维信息里它们差 11 个标准差，加上密度立刻分开。看到单曲线方案先问一句"为什么不用交会图"。' },
          { name: '井间刻度漂移', why: '同一套地层在不同井上整体偏移十几 API，分界线一搬就歪。表现是"训练井 F1 0.95、新井 0.55"，而且不会报错。必须做标准化，并把"训练井与测试井的直方图偏移"作为交付前的必检项。' },
          { name: '薄互层被曲线响应抹平', why: '0.125 m 采样的曲线遇到 0.3 m 的单层砂，读数已经被上下泥岩拉平，标签说这是砂岩，曲线看起来像泥质砂岩。这类样本应以"薄层单独统计"的方式评估，混在总数里会掩盖问题。' },
          { name: '特殊矿物的假响应', why: '煤层低密度低伽马、黄铁矿高密度高伽马，都会破坏"伽马高=泥质多"的经验规律。区域内存在煤层或特殊矿物时，必须把它们单列一类，否则会污染相邻类的边界。' }
        ]
      },

      demo: {
        label: '可运行示范',
        intro: '先切换四种方法，比较同一合成测试井的分类。拖动深度滑杆或点选岩性柱，查看该点实际参考的五个近邻、距离和投票；点击“下一个方法分歧点”定位 GR 与 KNN 意见不同的位置。再改变井间漂移或训练井数，观察依据与结果怎样变化。',
        height: 810
      }
    },

    demoGlobal: 'W4DEMO'
  };
};
