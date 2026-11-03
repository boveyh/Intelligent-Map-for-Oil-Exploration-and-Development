/* =========================================================
   w4 · 岩性识别 —— 可运行示范（自包含，无外部依赖）
   ---------------------------------------------------------
   演示三件事：
     ① 四类岩性在 GR–DEN 交会图上重叠，单变量阈值切不干净；
     ② 井间刻度漂移会把「用 A 井训练的分界」搬歪；
     ③ 井内标准化是跨井可用的前提条件 —— 不是可选项。
   纯函数部分导出到 window.W4CORE，供 tools/test-w4.js 在 Node 里复算。
   ========================================================= */
(function () {
  'use strict';

  /* ---------------- 随机数 ---------------- */
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

  /* ---------------- 岩性定义 ---------------- */
  /* GR: API；DEN: g/cm³。
     关键设计：灰岩与砂岩的 GR 几乎重叠（26 vs 40），而密度差 0.34 ——
     只看伽马分不开，只看密度又分不开泥岩和灰岩。必须二维一起看。
     这正是岩性识别要用交会图的根本原因，也是"单变量阈值"必然失分的所在。 */
  var FACIES = [
    { key: 'ls', name: '灰岩', c: '#7e5a8d', gr: [26, 8], den: [2.71, 0.028] },
    { key: 'ss', name: '砂岩', c: '#2f7d6b', gr: [40, 9], den: [2.37, 0.030] },
    { key: 'ss-sh', name: '泥质砂岩', c: '#41699b', gr: [66, 12], den: [2.47, 0.032] },
    { key: 'sh-ss', name: '砂质泥岩', c: '#b26a39', gr: [86, 13], den: [2.56, 0.033] },
    { key: 'sh', name: '泥岩', c: '#8d6a3f', gr: [106, 13], den: [2.63, 0.033] }
  ];
  var NF = FACIES.length;

  var NW = 8;          // 总井数
  var NPTS = 160;      // 每井深度点
  var TESTW = 0;       // 固定留出的测试井
  var K = 5;

  /* ---------------- 地层序列 ----------------
     同一区块的井穿的是同一套地层，所以岩性序列应当一致（厚度略有差异），
     否则"按本井均值标准化"会连岩性比例一起改掉 —— 那样标准化就失效了，
     而失效的原因不是方法错，是井根本没穿过同样的层段。 */
  var SEQ = (function () {
    var rnd = mulberry32(7717);
    var CYCLE = [0, 1, 2, 3, 4, 3, 2, 1];   // 灰岩 → 砂岩 → … → 泥岩 → … 的一个旋回
    var seq = [], ci = 0;
    while (seq.length < NPTS) {
      var f = CYCLE[ci % CYCLE.length];
      var th = 4 + Math.floor(rnd() * 7);
      for (var t = 0; t < th && seq.length < NPTS; t++) seq.push(f);
      ci++;
    }
    return seq;
  })();

  /* ---------------- 合成数据 ---------------- */
  /* drift 放大井间系统偏差（仪器年代、刻度、泥浆差异），
     每口井有固定的一对偏移量，滑杆只是把它整体放大缩小。 */
  function buildWells(p) {
    var rnd = mulberry32(p.seed || 20261024);
    var wells = [];
    for (var w = 0; w < NW; w++) {
      var gOff = gauss(rnd) * 9.0;      // GR 偏移（API）
      var dOff = gauss(rnd) * 0.020;    // DEN 偏移（g/cm³）
      var gScl = 1 + gauss(rnd) * 0.045; // GR 刻度
      var pts = [];
      for (var i = 0; i < NPTS; i++) {
        var f = SEQ[i];
        var F = FACIES[f];
        /* overlap：相邻类向中间靠拢，0 = 分得开，1 = 严重重叠 */
        var pull = (f - 2) * 6 * p.overlap;
        var gr = F.gr[0] - pull + gauss(rnd) * F.gr[1];
        var den = F.den[0] - (f - 2) * 0.010 * p.overlap + gauss(rnd) * F.den[1];

        pts.push({
          well: w,
          depth: 2400 + i * 0.125,
          facies: f,
          gr: (gr * gScl) + gOff * p.drift,
          den: den + dOff * p.drift
        });
      }
      /* 每口井的统计量（标准化用，实际工作中由本井曲线算出） */
      var mg = 0, md = 0;
      pts.forEach(function (q) { mg += q.gr; md += q.den; });
      mg /= pts.length; md /= pts.length;
      var sg = 0, sd = 0;
      pts.forEach(function (q) { sg += (q.gr - mg) * (q.gr - mg); sd += (q.den - md) * (q.den - md); });
      sg = Math.sqrt(sg / pts.length) || 1;
      sd = Math.sqrt(sd / pts.length) || 1;
      pts.forEach(function (q) { q.zgr = (q.gr - mg) / sg; q.zden = (q.den - md) / sd; });

      wells.push({ id: w, pts: pts, mg: mg, sg: sg, md: md, sd: sd });
    }
    return wells;
  }

  /* ---------------- 方法 1：GR 单变量分档 ---------------- */
  /* 传统做法：用 GR 的三个门槛把曲线切成四档。门槛取训练集各类 GR 中位数的中点。 */
  function grThresholds(train) {
    var med = [];
    for (var f = 0; f < NF; f++) {
      var arr = train.filter(function (q) { return q.facies === f; }).map(function (q) { return q.gr; });
      arr.sort(function (a, b) { return a - b; });
      med.push(arr.length ? arr[Math.floor(arr.length / 2)] : 0);
    }
    var th = [];
    for (var i = 0; i < NF - 1; i++) th.push((med[i] + med[i + 1]) / 2);
    return th;
  }
  function predictGR(th, q) {
    for (var i = 0; i < th.length; i++) if (q.gr < th[i]) return i;
    return NF - 1;
  }

  /* ---------------- 方法 2/3：KNN ---------------- */
  function feats(q, z) { return z ? [q.zgr, q.zden] : [(q.gr - 40) / 60, (q.den - 2.5) * 10]; }

  function explainKNN(train, q, z) {
    var a = z === 'gr' ? [(q.gr-40)/60,0] : feats(q, z), best = [];
    for (var i = 0; i < train.length; i++) {
      var b = z === 'gr' ? [(train[i].gr-40)/60,0] : feats(train[i], z);
      var d = (a[0] - b[0]) * (a[0] - b[0]) + (a[1] - b[1]) * (a[1] - b[1]);
      if (best.length < K) { best.push({ d: d, f: train[i].facies, index: i }); best.sort(function (x, y) { return x.d - y.d; }); }
      else if (d < best[K - 1].d) { best[K - 1] = { d: d, f: train[i].facies, index: i }; best.sort(function (x, y) { return x.d - y.d; }); }
    }
    var vote = [0, 0, 0, 0, 0];
    best.forEach(function (o) { vote[o.f]++; });
    var mi = 0;
    for (var j = 1; j < NF; j++) if (vote[j] > vote[mi]) mi = j;
    return { prediction: mi, neighbors: best.map(function (o) {
      return { sample: train[o.index], distance: Math.sqrt(o.d), facies: o.f };
    }), votes: vote, features: a };
  }
  function predictKNN(train, q, z) { return explainKNN(train, q, z).prediction; }

  /* ---------------- 方法 1b：交会图矩形分区 ---------------- */
  /* 这是"解释员在交会图上画几条竖线横线、把图切成若干格、每格标一个岩性"
     的算法等价物。它比单曲线强，因为同时用了两个参数；
     但格子位置是绝对坐标里钉死的 —— 井间一漂移，整张网跟着歪。 */
  var GBINS = [30, 48, 64, 80, 96, 130];   // GR 分档边界（API）
  var DBINS = [2.30, 2.42, 2.53, 2.62, 2.80]; // DEN 分档边界（g/cm³）

  function boxModel(train) {
    var tab = [];
    for (var i = 0; i < GBINS.length - 1; i++) {
      tab.push([]);
      for (var j = 0; j < DBINS.length - 1; j++) tab[i].push([0, 0, 0, 0, 0]);
    }
    train.forEach(function (q) {
      var gi = -1, di = -1, i, j;
      for (i = 0; i < GBINS.length - 1; i++) if (q.gr < GBINS[i + 1]) { gi = i; break; }
      for (j = 0; j < DBINS.length - 1; j++) if (q.den < DBINS[j + 1]) { di = j; break; }
      if (gi < 0) gi = GBINS.length - 2;
      if (di < 0) di = DBINS.length - 2;
      tab[gi][di][q.facies]++;
    });
    return tab;
  }
  function predictBox(tab, q) {
    var gi = -1, di = -1, i, j;
    for (i = 0; i < GBINS.length - 1; i++) if (q.gr < GBINS[i + 1]) { gi = i; break; }
    for (j = 0; j < DBINS.length - 1; j++) if (q.den < DBINS[j + 1]) { di = j; break; }
    if (gi < 0) gi = GBINS.length - 2;
    if (di < 0) di = DBINS.length - 2;
    var v = tab[gi][di], mi = 0, mt = -1;
    for (i = 0; i < NF; i++) if (v[i] > mt) { mt = v[i]; mi = i; }
    if (mt === 0) {
      /* 空格子：退到最近的有样本格子，避免把边缘点全判成灰岩 */
      var best = 1e9, bf = 0;
      for (i = 0; i < tab.length; i++) for (j = 0; j < tab[i].length; j++) {
        var s2 = tab[i][j].reduce(function (a, b) { return a + b; }, 0);
        if (!s2) continue;
        var d = (i - gi) * (i - gi) + (j - di) * (j - di);
        if (d < best) {
          best = d;
          var mm = 0, mv = -1;
          for (var k = 0; k < NF; k++) if (tab[i][j][k] > mv) { mv = tab[i][j][k]; mm = k; }
          bf = mm;
        }
      }
      return bf;
    }
    return mi;
  }

  /* ---------------- 评价 ---------------- */
  function confusion(truth, pred) {
    var M = [];
    for (var i = 0; i < NF; i++) { M.push([0, 0, 0, 0, 0]); }
    for (var k = 0; k < truth.length; k++) M[truth[k]][pred[k]]++;
    return M;
  }
  /* 宏平均 F1：四类同等重要 —— 好砂岩样本少，不能让泥岩把指标拉高 */
  function macroF1(M) {
    var sum = 0, cnt = 0;
    for (var i = 0; i < NF; i++) {
      var tp = M[i][i], tot = 0, col = 0;
      for (var j = 0; j < NF; j++) { tot += M[i][j]; col += M[j][i]; }
      if (tot === 0) continue;
      var pr = col ? tp / col : 0, rc = tp / tot;
      sum += (pr + rc) ? 2 * pr * rc / (pr + rc) : 0;
      cnt++;
    }
    return cnt ? sum / cnt : 0;
  }

  /* ---------------- 一次完整评估 ---------------- */
  function run(p) {
    var wells = buildWells(p);
    var test = wells[TESTW].pts;
    var train = [];
    for (var w = 1; w <= p.nWells && w < NW; w++) train = train.concat(wells[w].pts);

    var th = grThresholds(train);
    var tab = boxModel(train);
    var yt = test.map(function (q) { return q.facies; });

    var ps = [
      test.map(function (q) { return predictGR(th, q); }),
      test.map(function (q) { return predictBox(tab, q); }),
      test.map(function (q) { return predictKNN(train, q, false); }),
      test.map(function (q) { return predictKNN(train, q, true); })
    ];
    var Ms = ps.map(function (p) { return confusion(yt, p); });
    return {
      wells: wells, test: test, train: train, th: th, tab: tab,
      M: Ms,
      f1: Ms.map(macroF1),
      pred: ps
    };
  }

  function profileSummary(truth, pred) {
    var errors = 0, sand = 0, trueSand = 0;
    truth.forEach(function (t, i) {
      if (pred[i] !== t) errors++;
      if (pred[i] === 1 || pred[i] === 2) sand++;
      if (t === 1 || t === 2) trueSand++;
    });
    return { errors: errors, sandThickness: sand * 0.125, trueSandThickness: trueSand * 0.125 };
  }

  function trace(r,i,delta,standard){
    var q=Object.assign({},r.test[i]),well=r.wells[TESTW];q.gr+=delta||0;q.zgr=(q.gr-well.mg)/well.sg;
    var e=explainKNN(r.train,q,standard!==false),raw=explainKNN(r.train,q,false);
    return {version:'trace-v1',caseId:'w4-lithology',index:i,label:q.depth.toFixed(3)+' m',role:'未见井；井内无标签标准化使用整井曲线',inputs:[['GR',q.gr,'API'],['DEN',q.den,'g/cm³']],steps:[['实际距离输入',e.features.join(' / ')],['固定量纲缩放 KNN',FACIES[raw.prediction].name],['原距离最近邻',raw.neighbors[0].distance]].concat(e.neighbors.map(function(n,j){return ['近邻 '+(j+1)+'：井 '+n.sample.well+' / '+n.sample.depth+' m',FACIES[n.facies].name+'；d='+n.distance];})).concat(e.votes.map(function(v,j){return [FACIES[j].name+'票数',v];})),prediction:{name:(standard===false?'固定量纲缩放':'井内标准化')+' KNN',value:FACIES[e.prediction].name,unit:'（'+e.votes[e.prediction]+'/5票）'},baseline:{name:'同点 GR 分档',value:FACIES[predictGR(r.th,q)].name,unit:''},control:{name:'本点 GR 偏移',unit:'API',min:-60,max:60,step:3},note:'只扰动当前 GR，冻结训练集和本井均值/标准差。邻居与投票读取原 KNN 函数；投票份额不是正确概率。不同缩放坐标下的距离数值不能直接当准确性比较，应看邻居身份、票数和独立评价。'};
  }

  var API = {
    FACIES: FACIES, NF: NF, NW: NW, K: K, TESTW: TESTW,
    buildWells: buildWells, grThresholds: grThresholds, predictGR: predictGR,
    predictKNN: predictKNN, explainKNN: explainKNN, predictBox: predictBox, boxModel: boxModel,
    GBINS: GBINS, DBINS: DBINS,
    confusion: confusion, macroF1: macroF1, run: run, profileSummary: profileSummary,trace:trace
  };
  if (typeof window !== 'undefined') { window.W4CORE = API; }

  /* =========================================================
     渲染
     ========================================================= */
  var CSS = [
    '.w4{font-size:13px;color:#242b2e;line-height:1.6}',
    '.w4 *{box-sizing:border-box}',
    '.w4-kpi{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-bottom:12px}',
    '.w4-k{background:#faf8f2;border-radius:8px;padding:9px 10px;min-width:0;border:1px solid transparent;text-align:left;font:inherit;cursor:pointer}',
    '.w4-k .l,.w4-k .v{display:block}.w4-k:focus-visible{outline:2px solid #2f7d6b;outline-offset:2px}',
    '.w4-k .l{font-size:10px;color:#79828a;letter-spacing:.01em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.w4-k .v{font-family:ui-monospace,monospace;font-size:15px;font-weight:600;margin-top:3px;white-space:nowrap}',
    '.w4-k .v small{font-size:10px;font-weight:400;color:#79828a;margin-left:4px}',
    '.w4-k.sel{border-color:#2f7d6b;background:#f2f7f5}',
    '.w4-k.sel .l{color:#2f7d6b;font-weight:600}',
    '.w4-main{display:flex;gap:16px;align-items:flex-start}',
    '.w4-cv{position:relative;flex:0 0 400px;width:400px;border:1px solid #e9e4d8;border-radius:8px;overflow:hidden;background:#fff}',
    '.w4-cv canvas{display:block;width:100%;height:auto}',
    '.w4-side{flex:1;min-width:0}',
    '.w4-side .cap{font-size:10.5px;color:#79828a;margin-bottom:4px}',
    '.w4-cm{width:100%;border-collapse:collapse;font-size:10px;table-layout:fixed}',
    '.w4-cm th,.w4-cm td{border:1px solid #eeeae0;text-align:center;padding:0;height:26px}',
    '.w4-cm th{font-weight:500;color:#79828a;font-size:9.5px;background:#faf8f2}',
    '.w4-cm th.rowh{text-align:right;padding-right:5px;white-space:nowrap;background:#faf8f2}',
    '.w4-cm th.corh{text-align:left;padding-left:5px;white-space:nowrap;background:#faf8f2}',
    '.w4-cm td{font-family:ui-monospace,monospace;color:#5d666d}',
    '.w4-cm td.diag{font-weight:600}',
    '.w4-ctl{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px 16px;margin-top:14px;padding-top:12px;border-top:1px solid #eeeae0}',
    '.w4-c{min-width:0}',
    '.w4-c label{display:flex;justify-content:space-between;font-size:10.5px;color:#5d666d;margin-bottom:2px}',
    '.w4-c label b{font-family:ui-monospace,monospace;color:#242b2e;font-weight:600}',
    '.w4-c input[type=range]{width:100%;height:16px;accent-color:#2f7d6b;margin:0}',
    '.w4-note{margin-top:12px;padding:9px 11px;border-left:3px solid #2f7d6b;background:#f2f7f5;border-radius:0 8px 8px 0;font-size:11.5px;color:#3f6d61}',
    '.w4-note.warn{border-left-color:#b26a39;background:#fbf3ed;color:#8c5340}',
    '.w4-note b{color:inherit}',
    '.w4-explain{padding:16px;border:1px solid #b7d4ca;background:#f2f7f5;border-radius:12px;margin:14px 0}.w4-explain h3{font-size:16px;margin:0 0 7px}.w4-explain p{font-size:12px;line-height:1.8;margin:8px 0}.w4-explain label{display:block;font-size:12px}.w4-explain input{width:100%;accent-color:#2f7d6b}.w4-explain button{padding:6px 10px;border:1px solid #b7d4ca;border-radius:6px;background:#fff;color:#235f51;cursor:pointer}.w4-evidence-row{display:flex;gap:6px;flex-wrap:wrap;margin:10px 0}.w4-neighbor{flex:1 1 105px;background:#fff;border:1px solid #ddd7c8;border-top:3px solid var(--fc);padding:8px;border-radius:5px;font-size:11px}.w4-neighbor b,.w4-neighbor span{display:block}.w4-vote{display:grid;grid-template-columns:75px 1fr 36px;align-items:center;gap:7px;font-size:11px;margin:5px 0}.w4-vote-track{background:#e7e9e1;height:9px;border-radius:3px;overflow:hidden}.w4-vote-track i{display:block;height:100%}.w4-explain:focus-visible{outline:2px solid #2f7d6b}',
    '@media(max-width:760px){.w4-main{flex-direction:column}.w4-cv,.w4-side,.w4-track,.w4-img{flex:none;width:100%;min-width:0;max-width:100%}.w4-main canvas{width:100%!important;height:auto!important}.w4-kpi{grid-template-columns:repeat(2,minmax(0,1fr))}.w4-ctl{grid-template-columns:1fr}.w4-c[style]{grid-column:auto!important}}',
  ].join('\n');

  function injectCSS(root) {
    if (root.querySelector('style[data-w4]')) return;
    var st = document.createElement('style');
    st.setAttribute('data-w4', '1');
    st.textContent = CSS;
    root.appendChild(st);
  }

  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }

  /* ---------------- 交会图 ---------------- */
  function paintPlot(canvas, res, mi, selected) {
    var W = 400, H = 340;
    var dpr = 2;
    canvas.width = W * dpr; canvas.height = H * dpr;
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    var g = canvas.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);

    var x0 = 44, x1 = 386, y0 = 16, y1 = 300;
    var GRMIN = 0, GRMAX = 150, DENMIN = 2.25, DENMAX = 2.80;
    var X = function (v) { return x0 + (v - GRMIN) / (GRMAX - GRMIN) * (x1 - x0); };
    var Y = function (v) { return y1 - (v - DENMIN) / (DENMAX - DENMIN) * (y1 - y0); };

    /* 网格 */
    g.strokeStyle = '#eeeae0'; g.lineWidth = 1;
    g.font = '9px ui-monospace,monospace'; g.fillStyle = '#9ba3a9';
    [0, 30, 60, 90, 120, 150].forEach(function (v) {
      g.beginPath(); g.moveTo(X(v), y0); g.lineTo(X(v), y1); g.stroke();
      g.textAlign = 'center'; g.fillText(String(v), X(v), y1 + 14);
    });
    [2.3, 2.4, 2.5, 2.6, 2.7, 2.8].forEach(function (v) {
      g.beginPath(); g.moveTo(x0, Y(v)); g.lineTo(x1, Y(v)); g.stroke();
      g.textAlign = 'right'; g.fillText(v.toFixed(2), x0 - 6, Y(v) + 3);
    });

    /* 决策边界 / 决策面 */
    var tw = res.wells[TESTW];
    if (mi === 0) {
      /* 单曲线：三条竖线 */
      res.th.forEach(function (t) {
        g.strokeStyle = '#b26a39'; g.lineWidth = 1.6; g.setLineDash([5, 3]);
        g.beginPath(); g.moveTo(X(t), y0); g.lineTo(X(t), y1); g.stroke();
        g.setLineDash([]);
      });
    } else {
      var NX = 48, NY = 42;
      for (var ix = 0; ix < NX; ix++) {
        for (var iy = 0; iy < NY; iy++) {
          var gr = GRMIN + (ix + 0.5) / NX * (GRMAX - GRMIN);
          var den = DENMIN + (iy + 0.5) / NY * (DENMAX - DENMIN);
          var f;
          if (mi === 1) {
            f = predictBox(res.tab, { gr: gr, den: den });
          } else if (mi === 2) {
            f = predictKNN(res.train, { gr: gr, den: den, zgr: 0, zden: 0 }, false);
          } else {
            /* 标准化模式下，画在绝对坐标上的点要先换成本井的 z 值 ——
               这也是它的局限：决策面本身是 z 空间的，映射回交会图会变形 */
            f = predictKNN(res.train, {
              gr: gr, den: den,
              zgr: (gr - tw.mg) / tw.sg, zden: (den - tw.md) / tw.sd
            }, true);
          }
          g.fillStyle = FACIES[f].c;
          g.globalAlpha = 0.11;
          g.fillRect(X(gr) - (x1 - x0) / NX / 2, Y(den) - (y1 - y0) / NY / 2, (x1 - x0) / NX + 1, (y1 - y0) / NY + 1);
        }
      }
      g.globalAlpha = 1;
      if (mi === 1) {
        /* 分区边界画出来，让"格子钉死在绝对坐标"这件事看得见 */
        g.strokeStyle = '#b26a39'; g.lineWidth = 1; g.setLineDash([4, 3]); g.globalAlpha = .75;
        GBINS.forEach(function (t) { if (t <= GRMAX) { g.beginPath(); g.moveTo(X(t), y0); g.lineTo(X(t), y1); g.stroke(); } });
        DBINS.forEach(function (t) { g.beginPath(); g.moveTo(x0, Y(t)); g.lineTo(x1, Y(t)); g.stroke(); });
        g.setLineDash([]); g.globalAlpha = 1;
      }
    }

    /* 训练点（空心）与测试点（实心） */
    res.train.forEach(function (q) {
      g.beginPath(); g.arc(X(q.gr), Y(q.den), 1.9, 0, 7);
      g.fillStyle = '#ffffff'; g.fill();
      g.strokeStyle = FACIES[q.facies].c; g.lineWidth = 1; g.stroke();
    });
    var wrong = 0;
    res.test.forEach(function (q, i) {
      var ok = res.pred[mi][i] === q.facies;
      if (!ok) wrong++;
      g.beginPath(); g.arc(X(q.gr), Y(q.den), ok ? 2.6 : 3.4, 0, 7);
      g.fillStyle = FACIES[q.facies].c;
      g.fill();
      if (!ok) {
        g.strokeStyle = '#d33'; g.lineWidth = 1.2; g.stroke();
      }
    });
    if (selected != null && res.test[selected]) {
      var picked = res.test[selected];
      g.beginPath(); g.arc(X(picked.gr), Y(picked.den), 7, 0, 7);
      g.strokeStyle = '#172e26'; g.lineWidth = 2; g.stroke();
    }

    /* 轴 */
    g.strokeStyle = '#c9c2b0'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(x0, y1); g.lineTo(x1, y1); g.moveTo(x0, y1); g.lineTo(x0, y0); g.stroke();
    g.fillStyle = '#5d666d'; g.font = '10px system-ui,sans-serif';
    g.textAlign = 'center'; g.fillText('自然伽马 GR / API', (x0 + x1) / 2, H - 8);
    g.save(); g.translate(12, (y0 + y1) / 2); g.rotate(-Math.PI / 2);
    g.textAlign = 'center'; g.fillText('密度 DEN / g·cm⁻³', 0, 0); g.restore();

    /* 错分计数：放在右下空白角，先铺白底，避免压在散点上 */
    var tx = '测试井错分 ' + wrong + ' / ' + res.test.length + ' 点';
    g.font = '10px system-ui,sans-serif';
    var tw2 = g.measureText(tx).width;
    g.fillStyle = 'rgba(255,255,255,.88)';
    g.fillRect(x1 - tw2 - 10, y1 - 20, tw2 + 10, 16);
    g.fillStyle = '#b26a39'; g.textAlign = 'right';
    g.fillText(tx, x1 - 5, y1 - 8);
  }

  var METHOD_NAME = ['GR 单曲线阈值', '交会图矩形分区', 'KNN 原始曲线', 'KNN 井内标准化'];

  /* ---------------- 混淆矩阵 ---------------- */
  function cmHTML(M) {
    var h = '<table class="w4-cm"><thead><tr><th class="corh">真值 ＼ 预测</th>';
    FACIES.forEach(function (F) { h += '<th style="font-size:8.5px">' + F.name + '</th>'; });
    h += '</tr></thead><tbody>';
    for (var i = 0; i < NF; i++) {
      h += '<tr><th class="rowh" style="color:' + FACIES[i].c + '">' + FACIES[i].name + '</th>';
      var tot = M[i].reduce(function (a, b) { return a + b; }, 0) || 1;
      for (var j = 0; j < NF; j++) {
        var v = M[i][j];
        var a = v / tot;
        h += '<td class="' + (i === j ? 'diag' : '') + '" style="background:' +
          (v ? FACIES[i].c : 'transparent') + ';' +
          (v ? 'color:#fff;opacity:' + (i === j ? 1 : Math.min(1, 0.25 + a * 1.4)) : '') + '">' + v + '</td>';
      }
      h += '</tr>';
    }
    return h + '</tbody></table>';
  }

  /* ---------------- 挂载 ---------------- */
  function mount(root) {
    injectCSS(root);

    var state = { nWells: 4, drift: 1.2, overlap: 0.35, seed: 20261024, mi: 3, sample: 80 };
    var currentResult = null;

    var wrap = el('div', 'w4');
    wrap.innerHTML =
      '<div class="w4-kpi">' +
        '<button type="button" class="w4-k" id="w4k0" data-mi="0"><span class="l">① GR 单曲线</span><span class="v" id="w4v0">—</span></button>' +
        '<button type="button" class="w4-k" id="w4k1" data-mi="1"><span class="l">② 交会图分区</span><span class="v" id="w4v1">—</span></button>' +
        '<button type="button" class="w4-k" id="w4k2" data-mi="2"><span class="l">③ KNN 原始</span><span class="v" id="w4v2">—</span></button>' +
        '<button type="button" class="w4-k" id="w4k3" data-mi="3"><span class="l">④ KNN 标准化</span><span class="v" id="w4v3">—</span></button>' +
      '</div>' +
      '<div class="w4-main">' +
        '<div class="w4-cv"><canvas id="w4cv"></canvas></div>' +
        '<div class="w4-side">' +
          '<div class="cap" id="w4cap">混淆矩阵</div>' +
          '<div id="w4cm"></div>' +
          '<div class="cap" style="margin-top:10px">图例：空心 = 训练点（1—7 号井），实心 = 测试井样点，红圈 = 分错的点</div>' +
        '</div>' +
      '</div>' +
      '<div class="w4-ctl">' +
        '<div class="w4-c"><label for="w4sn">训练井数<b id="w4ln">4 口</b></label><input type="range" id="w4sn" min="1" max="7" value="4"></div>' +
        '<div class="w4-c"><label for="w4sd">井间刻度漂移<b id="w4ld">中</b></label><input type="range" id="w4sd" min="0" max="30" value="12"></div>' +
        '<div class="w4-c"><label for="w4so">类别重叠<b id="w4lo">0.35</b></label><input type="range" id="w4so" min="0" max="100" value="35"></div>' +
      '</div>' +
      '<div class="w4-note" id="w4note"></div>';
    root.appendChild(wrap);
    var explanation = el('section', 'w4-explain');
    explanation.innerHTML = '<h3>模型为什么把这个深度点判成这类岩石？</h3>' +
      '<p>输入当前点的 GR 与密度，在已标注的其他井中寻找五个近邻。查看它们的岩性和距离，追查投票怎样形成当前判断。</p>' +
      '<label for="w4sample">选择测试井深度 <b id="w4sampledepth"></b></label><input type="range" id="w4sample" min="0" max="159" value="80">' +
      '<button type="button" id="w4disagreement">查看下一个方法分歧点</button>' +
      '<div id="w4reason" aria-live="polite"></div>';
    wrap.appendChild(explanation);
    var profile = el('section', 'w4-profile');
    profile.style.cssText = 'margin:20px 0;padding:16px;border:1px solid #ddd7c8;border-radius:12px;background:#fcfbf7';
    profile.innerHTML = '<h3 style="font-size:15px;margin:0 0 5px">分类结果落回井段，会改变什么？</h3>' +
      '<p style="font-size:12px;color:#5d666d">三列使用同一口测试井。彩色条表示岩性，右侧红点标记当前方法判错的深度。</p>' +
      '<div id="w4column"></div><div id="w4impact" aria-live="polite" style="font-size:12px;line-height:1.8"></div>';
    wrap.appendChild(profile);

    var cv = root.querySelector('#w4cv');
    var cm = root.querySelector('#w4cm');
    var note = root.querySelector('#w4note');

    var driftTxt = function (d) {
      if (d < 0.35) return '无（合成刻度一致）';
      if (d < 0.9) return '小';
      if (d < 1.6) return '中';
      return '大（合成偏移增大）';
    };

    function render(reuse) {
      var res = reuse && currentResult ? currentResult : run(state);
      currentResult = res;
      var truth = res.test.map(function (q) { return q.facies; });
      var stats = profileSummary(truth, res.pred[state.mi]);
      var baseline = profileSummary(truth, res.pred[0]);
      var svg = '<svg viewBox="0 0 520 350" role="img" aria-label="合成真值、GR 阈值与当前方法的逐深度岩性柱对照" style="width:100%;max-height:350px;font-family:system-ui,sans-serif">';
      [truth, res.pred[0], res.pred[state.mi]].forEach(function (column, col) {
        var x = 76 + col * 146;
        svg += '<text x="' + (x + 36) + '" y="23" text-anchor="middle" font-size="11" fill="#242b2e">' + ['合成真值', 'GR 阈值', METHOD_NAME[state.mi]][col] + '</text>';
        column.forEach(function (facies, i) {
          svg += '<rect data-sample="' + i + '" x="' + x + '" y="' + (40 + i * 1.625) + '" width="72" height="1.8" fill="' + FACIES[facies].c + '" style="cursor:pointer"><title>' + res.test[i].depth.toFixed(3) + ' m · ' + FACIES[facies].name + '</title></rect>';
          if (col === 2 && facies !== truth[i]) svg += '<circle cx="' + (x + 80) + '" cy="' + (40.8 + i * 1.625) + '" r="1.4" fill="#b54237"/>';
        });
        svg += '<rect x="' + (x - 2) + '" y="' + (39 + state.sample * 1.625) + '" width="76" height="3.6" fill="none" stroke="#172e26" stroke-width="1.3" pointer-events="none"/>';
      });
      svg += '<text x="5" y="46" font-size="10" fill="#5d666d">2400 m</text><text x="5" y="300" font-size="10" fill="#5d666d">2420 m</text>';
      FACIES.forEach(function (f, i) { var x = 15 + i * 101; svg += '<rect x="' + x + '" y="322" width="9" height="9" fill="' + f.c + '"/><text x="' + (x + 14) + '" y="331" font-size="10" fill="#4d565b">' + f.name + '</text>'; });
      root.querySelector('#w4column').innerHTML = svg + '</svg>';
      root.querySelector('#w4impact').textContent = 'GR 阈值错判 ' + baseline.errors + ' / ' + truth.length + ' 点；当前方法错判 ' + stats.errors + ' 点。砂岩类候选厚度：GR ' + baseline.sandThickness.toFixed(2) + ' m → 当前 ' + stats.sandThickness.toFixed(2) + ' m；合成真值 ' + stats.trueSandThickness.toFixed(2) + ' m。按砂岩 + 泥质砂岩、每点 0.125 m 统计，仅供解释对照，不代表可采层或射孔方案。';
      paintPlot(cv, res, state.mi, state.sample);
      var query = res.test[state.sample], standard = state.mi !== 2;
      var proof = explainKNN(res.train, query, standard);
      root.querySelector('#w4sampledepth').textContent = query.depth.toFixed(3) + ' m';
      root.querySelector('#w4sample').value = state.sample;
      var reason = '<p><b>输入：</b>GR ' + query.gr.toFixed(1) + ' API，DEN ' + query.den.toFixed(3) + ' g/cm³。' +
        (standard ? '井内标准化后的特征为 [' : '按固定量纲缩放后的特征为 [') + proof.features.map(function (v) { return v.toFixed(3); }).join(', ') + ']。</p>' +
        '<p><b>当前解释分支：</b>' + (standard ? 'KNN 井内标准化' : 'KNN 原始曲线') +
        (state.mi < 2 ? '。上方选中的是传统方法，此处附上标准化 KNN 的近邻证据供对照。' : '；以下是实际参与该次预测的近邻。') + '</p>' +
        '<div class="w4-evidence-row">' + proof.neighbors.map(function (n, rank) {
          return '<div class="w4-neighbor" style="--fc:' + FACIES[n.facies].c + '"><b>' + (rank + 1) + ' · ' + FACIES[n.facies].name + '</b><span>训练井 ' + n.sample.well + '</span><span>' + n.sample.depth.toFixed(3) + ' m</span><span>特征距离 ' + n.distance.toFixed(3) + '</span></div>';
        }).join('') + '</div>';
      reason += proof.votes.map(function (votes, i) { return '<div class="w4-vote"><span>' + FACIES[i].name + '</span><span class="w4-vote-track"><i style="width:' + (votes / proof.neighbors.length * 100) + '%;background:' + FACIES[i].c + '"></i></span><b>' + votes + '/' + proof.neighbors.length + '</b></div>'; }).join('');
      reason += '<p><b>输出对照：</b>GR 阈值 → ' + FACIES[res.pred[0][state.sample]].name + '；KNN → ' + FACIES[proof.prediction].name + '。合成真值 → ' + FACIES[query.facies].name + '（只用于事后评价，不参与近邻搜索）。</p>' +
        '<p><b>解释与复核：</b>' + (res.pred[0][state.sample] !== proof.prediction ? '两种方法在此处分歧，应结合曲线质量和地质记录复核该井段。' : '此处两种方法一致；一致本身仍不能证明解释正确。') + ' 投票比例是邻域一致程度，不是校准后的正确率，也不直接形成射孔方案。</p>';
      root.querySelector('#w4reason').innerHTML = reason;
      cm.innerHTML = cmHTML(res.M[state.mi]);
      root.querySelector('#w4cap').textContent = '混淆矩阵 · ' + METHOD_NAME[state.mi];

      [0, 1, 2, 3].forEach(function (i) {
        root.querySelector('#w4v' + i).innerHTML = res.f1[i].toFixed(3) + '<small>F1</small>';
        root.querySelector('#w4k' + i).classList.toggle('sel', i === state.mi);
        root.querySelector('#w4k' + i).setAttribute('aria-pressed', String(i === state.mi));
      });

      var d = res.f1[0], b = res.f1[1], k = res.f1[2], z = res.f1[3];
      if (state.drift < 0.35) {
        note.className = 'w4-note';
        note.innerHTML = '<b>当前合成刻度接近一致，可比较特征和判别方式的影响。</b>' +
          '单曲线 ' + d.toFixed(2) + ' → 交会图分区 ' + b.toFixed(2) + ' → KNN ' + k.toFixed(2) +
          ' → 井内标准化 ' + z.toFixed(2) + '。' +
          '在本例设定中，灰岩与砂岩的伽马分布重叠，密度提供补充信息。' +
          '选择方法分歧点，查看训练近邻是否支持不同于固定阈值的判断；再增加漂移，观察跨井变化。';
      } else if (z - k > 0.08) {
        note.className = 'w4-note warn';
        note.innerHTML = '<b>同一份数据，只差一步井内标准化：' + k.toFixed(2) + ' → ' + z.toFixed(2) + '。</b>' +
          '原始曲线的刻度漂移会改变样本之间的距离，进而改变近邻和投票。' +
          '井内标准化先减去本井均值、再除以本井标准差，在当前合成条件下改善了测试井分类。' +
          '选定同一深度点切换两种 KNN，检查实际近邻怎样变化；真实井还需核查岩性组成差异。';
      } else if (z - d > 0.08) {
        note.className = 'w4-note warn';
        note.innerHTML = '<b>当前标准化 KNN 优于单曲线，仍需检查具体错判。</b>' +
          '单曲线 ' + d.toFixed(2) + '、交会图分区 ' + b.toFixed(2) + '、KNN 原始 ' + k.toFixed(2) +
          '、标准化 ' + z.toFixed(2) + '。' +
          '类别重叠 ' + state.overlap.toFixed(2) + ' 时，相邻两类在交会图上本来就连成一片，' +
          '这里使用两条曲线，存在无法完全区分的样本。' +
          '可先复核标签、曲线质量和分歧井段，再用独立测试验证补充特征是否有效。';
      } else {
        note.className = 'w4-note';
        note.innerHTML = '<b>当前数据条件下，四种方法得到以下测试井结果。</b>' +
          '单曲线 ' + d.toFixed(2) + '、交会图分区 ' + b.toFixed(2) + '、KNN 原始 ' + k.toFixed(2) +
          '、标准化 ' + z.toFixed(2) + '。' +
          '固定其他条件，改变<b>类别重叠</b>或<b>训练井数</b>，观察近邻证据与测试分数是否一起改善。' +
          '更多训练样本不保证更好，是否改善应以当前测试结果判断。';
      }
    }

    function bind(id, key, fmt, scale) {
      var inp = root.querySelector(id);
      inp.addEventListener('input', function () {
        state[key] = Number(inp.value) * (scale || 1);
        if (fmt) fmt(Number(inp.value));
        render();
      });
    }
    bind('#w4sn', 'nWells', function (v) { root.querySelector('#w4ln').textContent = v + ' 口'; });
    bind('#w4sd', 'drift', function (v) {
      root.querySelector('#w4ld').textContent = driftTxt(v / 10);
    }, 0.1);
    bind('#w4so', 'overlap', function (v) {
      root.querySelector('#w4lo').textContent = (v / 100).toFixed(2);
    }, 0.01);

    [0, 1, 2, 3].forEach(function (i) {
      root.querySelector('#w4k' + i).addEventListener('click', function () {
        state.mi = i;
        render();
      });
    });

    root.querySelector('#w4sample').addEventListener('input', function (e) { state.sample = Number(e.target.value); render(true); });
    root.querySelector('#w4disagreement').addEventListener('click', function () {
      var r = currentResult, method = state.mi === 2 ? 2 : 3;
      for (var offset = 1; offset <= r.test.length; offset++) {
        var i = (state.sample + offset) % r.test.length;
        if (r.pred[0][i] !== r.pred[method][i]) { state.sample = i; render(true); return; }
      }
      root.querySelector('#w4reason').textContent = '当前数据条件下，GR 与所解释的 KNN 分支没有分歧点。可调整刻度漂移或类别重叠后再比较。';
    });
    root.querySelector('#w4column').addEventListener('click', function (e) {
      var rect = e.target.closest('[data-sample]');
      if (rect) { state.sample = Number(rect.getAttribute('data-sample')); render(true); }
    });

    render();
    return {trace:{read:function(d){return trace(currentResult,state.sample,d,state.mi!==2);},range:function(){return {min:0,max:currentResult.test.length-1,value:state.sample};},select:function(i){state.sample=i;render(true);}}};
  }

  if (typeof window !== 'undefined') {
    window.W4DEMO = mount;
    window.__CASE_MOUNT__ = mount;
  }
})();
