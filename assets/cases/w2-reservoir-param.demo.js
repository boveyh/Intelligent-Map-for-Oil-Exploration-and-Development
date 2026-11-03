/* =========================================================
   w2 · 储层参数智能解释 —— 可运行示范
   ---------------------------------------------------------
   纯前端、无依赖、无外部素材（所有数据在浏览器里合成）。

   它让读者亲手验证三件事：
     1. 密度公式 φ=(ρma-ρb)/(ρma-ρf) 在高泥质段为什么会崩；
     2. 学习法相对公式法的收益有多大（默认整井留出 RMSE 3.74 → 1.54 p.u.）；
     3. 为什么"随机划分"的 R² 是自欺欺人 —— 最近一个邻居同井率 54% vs 0%。

   挂载方式：
     插件模式  window.W2DEMO(root, ctx)
     上传包模式 window.__CASE_MOUNT__(root, api)
   两者共用同一份挂载函数，样式内联注入，不依赖站点 CSS。
   ========================================================= */

(function () {
  'use strict';

  /* ---------- 常量（与 tools/probe-w2.js 保持一致） ---------- */
  var SEED = 20261023, NW = 12, NPTS = 220, K = 5;
  var TESTW = [1, 6];          // 固定留出的两口井
  // Fixed well-ID order, chosen without looking at test wells or their labels.
  var WELL_ORDER = [0, 2, 3, 4, 5, 7, 8, 9, 10, 11];
  var DEPTH0 = 2100, STEP = 0.5;

  var C = {
    ink: '#242b2e', jade: '#2f7d6b', jadeL: '#e6f1ec',
    clay: '#b26a39', clayL: '#f8ecdf', grid: '#ece8dd',
    text: '#79828a', dim: '#9ba3a9', paper: '#fdfcf9', line: '#ddd7c8'
  };

  /* ---------- 随机数 ---------- */
  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }

  /* ---------- 合成 12 口井 ----------
     每口井有各自的仪器刻度差（DEN / GR）与相带位置，
     这正是"跨井泛化"真正要面对的差异。 */
  function buildWells(options) {
    options = options || {};
    var rnd = mulberry32(options.seed || SEED);
    function gauss() {
      var u = 0, v = 0;
      while (u === 0) u = rnd();
      while (v === 0) v = rnd();
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    }
    var wells = [];
    for (var w = 0; w < NW; w++) {
      var biasDen = (rnd() - 0.5) * 0.06;
      var biasGr = (rnd() - 0.5) * 15;
      var facies = gauss() * 0.045;
      var noise = 0.9 + rnd() * 0.7;

      var nl = 6 + Math.floor(rnd() * 5);
      var vshs = [];
      for (var i = 0; i < nl; i++) vshs.push(clamp(0.05 + rnd() * 0.85, 0.05, 0.9));
      var lens = [], left = NPTS;
      for (var j = 0; j < nl; j++) {
        var n = j === nl - 1 ? left : Math.max(14, Math.round(NPTS / nl + (rnd() - 0.5) * 30));
        n = Math.min(n, left);
        lens.push(n); left -= n;
        if (left <= 0) break;
      }

      var pts = [], k = 0;
      for (var a = 0; a < lens.length; a++) {
        var vsh = vshs[a];
        for (var b = 0; b < lens[a]; b++, k++) {
          var phi = clamp(0.30 - 0.24 * vsh + facies + gauss() * 0.0012, 0.02, 0.34);
          var den = 2.65 - 1.65 * phi + 0.12 * vsh + biasDen + gauss() * 0.012 * noise;
          var gr = 22 + 100 * vsh + biasGr + gauss() * 7 * noise;
          var cnl = 0.02 + 0.55 * phi + 0.33 * vsh + gauss() * 0.015 * noise;
          pts.push({
            phi: phi, den: den, gr: gr, cnl: cnl, vsh: vsh,
            formula: clamp((2.65 - den) / 1.65, 0, 0.45),
            well: w, depth: DEPTH0 + k * STEP
          });
        }
      }
      if (TESTW.indexOf(w) >= 0) pts.forEach(function (q, j) {
        q.den += (options.denShift || 0);
        q.gr += (options.grShift || 0);
        q.cnl += (options.cnlShift || 0);
        if(options.noiseScale) { q.den += Math.sin(j*1.73+w)*options.noiseScale*.02; q.gr += Math.cos(j*2.17+w)*options.noiseScale*10; }
        q.formula=clamp((2.65-q.den)/1.65,0,.45);
      });
      wells.push({ id: w, pts: pts, biasDen: biasDen });
    }
    return wells;
  }

  /* ---------- KNN 回归（真实项目用 1D-CNN / GBDT，这里用小模型保证秒级） ---------- */
  function standardize(train) {
    var sum = [0, 0, 0], i, p;
    for (i = 0; i < train.length; i++) {
      p = train[i];
      sum[0] += p.den; sum[1] += p.gr; sum[2] += p.cnl;
    }
    var mu = [sum[0] / train.length, sum[1] / train.length, sum[2] / train.length];
    var s2 = [0, 0, 0];
    for (i = 0; i < train.length; i++) {
      p = train[i];
      s2[0] += (p.den - mu[0]) * (p.den - mu[0]);
      s2[1] += (p.gr - mu[1]) * (p.gr - mu[1]);
      s2[2] += (p.cnl - mu[2]) * (p.cnl - mu[2]);
    }
    var sd = [
      Math.sqrt(s2[0] / train.length) || 1,
      Math.sqrt(s2[1] / train.length) || 1,
      Math.sqrt(s2[2] / train.length) || 1
    ];
    return { mu: mu, sd: sd };
  }

  function fitKNN(train) {
    var s=standardize(train);
    return {train:train,mu:s.mu,sd:s.sd,X:train.map(function(p){return [p.den,p.gr,p.cnl].map(function(v,j){return (v-s.mu[j])/s.sd[j];});})};
  }
  function explainKNN(model,q) {
    var x=[q.den,q.gr,q.cnl],z=x.map(function(v,j){return (v-model.mu[j])/model.sd[j];}),best=[];
    model.X.forEach(function(a,i){
      var terms=a.map(function(v,j){return (v-z[j])*(v-z[j]);}),d=terms.reduce(function(a,b){return a+b;},0);
      if(best.length<K){best.push({d:d,i:i,terms:terms});best.sort(function(a,b){return a.d-b.d;});}
      else if(d<best[K-1].d){best[K-1]={d:d,i:i,terms:terms};best.sort(function(a,b){return a.d-b.d;});}
    });
    var neighbors=best.map(function(n){return {sample:model.train[n.i],distance:Math.sqrt(n.d),terms:n.terms};});
    return {x:x,z:z,neighbors:neighbors,prediction:neighbors.reduce(function(a,n){return a+n.sample.phi;},0)/neighbors.length};
  }
  function knnPredict(train,test) {
    var model=fitKNN(train),same=0;
    var pred=test.map(function(q){var e=explainKNN(model,q);if(e.neighbors[0].sample.well===q.well)same++;return e.prediction;});
    return {pred:pred,sameWell:same/test.length,model:model};
  }
  function fitDen(train) {
    var x=train.reduce(function(a,p){return a+p.den;},0)/train.length,y=train.reduce(function(a,p){return a+p.phi;},0)/train.length;
    var cov=0,variance=0;train.forEach(function(p){cov+=(p.den-x)*(p.phi-y);variance+=(p.den-x)*(p.den-x);});
    var slope=cov/(variance||1);return {intercept:y-slope*x,slope:slope};
  }
  function trace(ev,i,delta) {
    var q=Object.assign({},ev.profileTruth[i]);q.den+=delta||0;
    var e=explainKNN(ev.model,q),one=ev.denModel.intercept+ev.denModel.slope*q.den;
    return {version:'trace-v1',caseId:'w2-reservoir-param',index:i,label:q.depth.toFixed(3)+' m · WELL-02',role:ev.split==='well'?'整井留出；训练不含本井':'随机划分：本井样点可能参与训练',inputs:[['DEN',q.den,'g/cm³'],['GR',q.gr,'API'],['CNL',q.cnl,'v/v']],steps:[['标准化 DEN/GR/CNL',e.z.join(' / ')]].concat(e.neighbors.map(function(n,j){return ['近邻 '+(j+1)+'：井 '+(n.sample.well+1)+' / '+n.sample.depth+' m','d='+n.distance+'；φ='+n.sample.phi+'；三项平方距离='+n.terms.join(' + ')];})).concat([['DEN 单曲线回归',one],['DEN 回归截距/斜率',ev.denModel.intercept+' / '+ev.denModel.slope]]),prediction:{name:'五近邻孔隙度均值',value:e.prediction*100,unit:'p.u.'},baseline:{name:'同点密度公式',value:clamp((2.65-q.den)/1.65,0,.45)*100,unit:'p.u.'},control:{name:'本点 DEN 偏移',unit:'g/cm³',min:-.15,max:.15,step:.01},note:'孔隙度仅由训练邻居标签取均值；当前点岩心标签仅事后评分。输入试算冻结训练统计量；不更新全井分数。'};
  }

  /* ---------- 指标 ---------- */
  function r2(yt, yp) {
    var m = 0, i;
    for (i = 0; i < yt.length; i++) m += yt[i];
    m /= yt.length;
    var ss = 0, st = 0;
    for (i = 0; i < yt.length; i++) {
      ss += (yt[i] - yp[i]) * (yt[i] - yp[i]);
      st += (yt[i] - m) * (yt[i] - m);
    }
    return st ? 1 - ss / st : 0;
  }
  function rmse(yt, yp) {
    var s = 0;
    for (var i = 0; i < yt.length; i++) s += (yt[i] - yp[i]) * (yt[i] - yp[i]);
    return Math.sqrt(s / yt.length);
  }

  /* ---------- 一次评估 ---------- */
  function evaluate(wells, n, split) {
    var train = [], test = [], i, w;

    if (split === 'well') {
      var use = WELL_ORDER.slice(0, n);
      for (i = 0; i < use.length; i++) train = train.concat(wells[use[i]].pts);
      for (i = 0; i < TESTW.length; i++) test = test.concat(wells[TESTW[i]].pts);
    } else {
      /* 随机划分：与按井模式用同一批井、同一批数据量，只换划分单位 */
      var pool = [];
      var used = WELL_ORDER.slice(0, n).concat(TESTW);
      for (i = 0; i < used.length; i++) pool = pool.concat(wells[used[i]].pts);
      var rnd = mulberry32(4242 + n);
      for (i = pool.length - 1; i > 0; i--) {
        var j = Math.floor(rnd() * (i + 1));
        var t = pool[i]; pool[i] = pool[j]; pool[j] = t;
      }
      var cut = Math.round(pool.length * 0.7);
      train = pool.slice(0, cut);
      test = pool.slice(cut);
    }

    /* 剖面与按井评分使用同一留出井；随机划分模式另作混合样点对照。 */
    var profileWell = TESTW[0];
    var profile = knnPredict(train, wells[profileWell].pts);

    var res = knnPredict(train, test);
    var denModel=fitDen(train),denPred=test.map(function(q){return denModel.intercept+denModel.slope*q.den;});
    var yt = [], yp = [], yf = [], vsh = [];
    for (i = 0; i < test.length; i++) {
      yt.push(test[i].phi);
      yp.push(res.pred[i]);
      yf.push(test[i].formula);
      vsh.push(test[i].vsh);
    }

    /* 按泥质含量分组 */
    var edges = [0, 0.15, 0.3, 0.45, 0.6, 1.01];
    var bins = [];
    for (var b = 0; b < edges.length - 1; b++) {
      var idx = [];
      for (i = 0; i < test.length; i++) {
        if (vsh[i] >= edges[b] && vsh[i] < edges[b + 1]) idx.push(i);
      }
      if (idx.length < 6) { bins.push(null); continue; }
      var at = [], ap = [], af = [];
      for (i = 0; i < idx.length; i++) {
        at.push(yt[idx[i]]); ap.push(yp[idx[i]]); af.push(yf[idx[i]]);
      }
      bins.push({
        vsh: (edges[b] + edges[b + 1]) / 2,
        n: idx.length,
        ml: rmse(at, ap),
        fm: rmse(at, af)
      });
    }

    /* 散点抽样，最多 420 点 */
    var scat = [];
    var stepS = Math.max(1, Math.floor(test.length / 420));
    for (i = 0; i < test.length; i += stepS) scat.push([yt[i], yp[i]]);

    return {
      n: test.length, train: train, test: test, model: res.model, denModel: denModel, denRMSE: rmse(yt,denPred), denR2: r2(yt,denPred),
      r2: r2(yt, yp), rmse: rmse(yt, yp),
      r2f: r2(yt, yf), rmseF: rmse(yt, yf),
      sameWell: res.sameWell, bins: bins, scat: scat,
      profile: profile.pred, profileTruth: wells[profileWell].pts, profileWell: profileWell, split: split
    };
  }

  /* ---------- SVG 小工具 ---------- */
  function f(n) { return (Math.round(n * 10) / 10).toFixed(1); }
  function pct(x) { return (Math.round(x * 100)) + '%'; }
  function p10(x) { return (x * 100).toFixed(1); }

  var svgOpen = function (w, h, label) {
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" width="100%" style="display:block" ' +
      'role="img" aria-label="' + label + '" font-family="ui-sans-serif,system-ui,-apple-system,\'Segoe UI\',sans-serif">';
  };

  /* 剖面：真实 / 密度公式 / 学习法 */
  function drawProfile(ev) {
    var W = 380, H = 472;
    var x0 = 96, x1 = 318, y0 = 54, y1 = 396;
    var phiMax = 0.36;
    var tx = function (v) { return x0 + clamp(v, 0, phiMax) / phiMax * (x1 - x0); };
    var depthSpan = (NPTS - 1) * STEP;
    var ty = function (i) { return y0 + i / (NPTS - 1) * (y1 - y0); };

    var s = svgOpen(W, H, '储层孔隙度解释剖面：真实值、密度公式与学习法对比');

    /* 网格与坐标 */
    [0, 0.1, 0.2, 0.3].forEach(function (v) {
      s += '<line x1="' + tx(v) + '" y1="' + y0 + '" x2="' + tx(v) + '" y2="' + y1 + '" stroke="' + C.grid + '"/>';
      s += '<text x="' + tx(v) + '" y="' + (y1 + 14) + '" font-size="10" fill="' + C.dim + '" text-anchor="middle">' + v.toFixed(1) + '</text>';
    });
    for (var d = 0; d <= depthSpan; d += 20) {
      var yy = y0 + d / depthSpan * (y1 - y0);
      s += '<line x1="' + x0 + '" y1="' + yy + '" x2="' + x1 + '" y2="' + yy + '" stroke="' + C.grid + '" stroke-dasharray="2 4"/>';
      s += '<text x="' + (x0 - 8) + '" y="' + (yy + 3.5) + '" font-size="10" font-family="monospace" fill="' + C.dim + '" text-anchor="end">' + (DEPTH0 + d) + '</text>';
    }
    s += '<text x="' + ((x0 + x1) / 2) + '" y="' + (y1 + 32) + '" font-size="10.5" fill="' + C.text + '" text-anchor="middle">孔隙度 φ / v·v</text>';
    s += '<text x="' + (x0 - 10) + '" y="' + (y0 - 10) + '" font-size="9.5" font-family="monospace" fill="' + C.dim + '" text-anchor="end">深度 m</text>';

    /* 真实值 */
    var pts = ev.profileTruth, i, pth = [], pfm = [], pml = [];
    for (i = 0; i < pts.length; i++) {
      if (pts[i].well !== ev.profileWell) continue;
      pth.push(tx(pts[i].phi) + ',' + ty(i));
      pfm.push(tx(pts[i].formula) + ',' + ty(i));
      pml.push(tx(ev.profile[i]) + ',' + ty(i));
    }
    s += '<polyline points="' + pfm.join(' ') + '" fill="none" stroke="' + C.clay + '" stroke-width="1.2" stroke-opacity=".8"/>';
    s += '<polyline points="' + pth.join(' ') + '" fill="none" stroke="' + C.ink + '" stroke-width="1.1" stroke-opacity=".5"/>';
    s += '<polyline points="' + pml.join(' ') + '" fill="none" stroke="#ffffff" stroke-width="3.4" stroke-linejoin="round"/>';
    s += '<polyline points="' + pml.join(' ') + '" fill="none" stroke="' + C.jade + '" stroke-width="1.9" stroke-linejoin="round"/>';
    if(ev.tracePoint!=null){var selected=ev.tracePoint;s+='<path d="M'+x0+' '+ty(selected)+'H'+x1+'" stroke="#315c48" stroke-dasharray="3 3"/><circle cx="'+tx(ev.profile[selected])+'" cy="'+ty(selected)+'" r="4" fill="#fff" stroke="#315c48" stroke-width="2"/><text x="'+x0+'" y="'+(ty(selected)-7)+'" font-size="10">单点 '+pts[selected].depth.toFixed(1)+' m</text>';}

    /* 图例 */
    s += '<line x1="96" y1="14" x2="120" y2="14" stroke="' + C.ink + '" stroke-width="1.2" stroke-opacity=".6"/>';
    s += '<text x="125" y="17.5" font-size="9.5" fill="' + C.text + '">真实（岩心）</text>';
    s += '<line x1="186" y1="14" x2="210" y2="14" stroke="' + C.clay + '" stroke-width="1.7"/>';
    s += '<text x="215" y="17.5" font-size="9.5" fill="' + C.text + '">密度公式</text>';
    s += '<line x1="268" y1="14" x2="292" y2="14" stroke="' + C.jade + '" stroke-width="2"/>';
    s += '<text x="297" y="17.5" font-size="9.5" fill="' + C.text + '">学习法</text>';

    s += '<text x="96" y="' + (H - 10) + '" font-size="9.5" font-family="monospace" fill="' + C.dim + '">WELL-02 · ' + (ev.split === 'well' ? '整井留出' : '随机划分') + ' · ' + (DEPTH0) + '—' + (DEPTH0 + depthSpan) + ' m · 220 个采样点</text>';
    s += '</svg>';
    return s;
  }

  /* 散点：预测 vs 真实 */
  function drawScatter(ev) {
    var W = 330, H = 196;
    var x0 = 40, x1 = 300, y0 = 18, y1 = 152;
    var vmax = 0.36;
    var px = function (v) { return x0 + clamp(v, 0, vmax) / vmax * (x1 - x0); };
    var py = function (v) { return y1 - clamp(v, 0, vmax) / vmax * (y1 - y0); };

    var s = svgOpen(W, H, '预测孔隙度与真实孔隙度散点图');
    [0, 0.1, 0.2, 0.3].forEach(function (v) {
      s += '<line x1="' + px(v) + '" y1="' + y0 + '" x2="' + px(v) + '" y2="' + y1 + '" stroke="' + C.grid + '"/>';
      s += '<line x1="' + x0 + '" y1="' + py(v) + '" x2="' + x1 + '" y2="' + py(v) + '" stroke="' + C.grid + '"/>';
      s += '<text x="' + px(v) + '" y="' + (y1 + 13) + '" font-size="9.5" fill="' + C.dim + '" text-anchor="middle">' + v.toFixed(1) + '</text>';
      s += '<text x="' + (x0 - 6) + '" y="' + (py(v) + 3) + '" font-size="9.5" fill="' + C.dim + '" text-anchor="end">' + v.toFixed(1) + '</text>';
    });
    s += '<line x1="' + px(0) + '" y1="' + py(0) + '" x2="' + px(vmax) + '" y2="' + py(vmax) + '" stroke="' + C.ink + '" stroke-width="1" stroke-dasharray="4 3" stroke-opacity=".45"/>';
    s += '<text x="' + (x1 - 4) + '" y="' + (y0 + 12) + '" font-size="9.5" fill="' + C.dim + '" text-anchor="end">1:1</text>';

    ev.scat.forEach(function (d) {
      s += '<circle cx="' + f(px(d[0])) + '" cy="' + f(py(d[1])) + '" r="1.9" fill="' + C.jade + '" fill-opacity=".5"/>';
    });

    s += '<text x="' + ((x0 + x1) / 2) + '" y="' + (y1 + 28) + '" font-size="10" fill="' + C.text + '" text-anchor="middle">真实 φ</text>';
    s += '<text x="12" y="' + ((y0 + y1) / 2) + '" font-size="10" fill="' + C.text + '" transform="rotate(-90 12 ' + ((y0 + y1) / 2) + ')" text-anchor="middle">预测 φ</text>';
    s += '</svg>';
    return s;
  }

  /* 误差 vs 泥质含量 */
  function drawBins(ev) {
    var W = 330, H = 176;
    var x0 = 44, x1 = 306, y0 = 20, y1 = 128;
    var ymax = 5.2;
    var bins = ev.bins.filter(function (b) { return b; });
    var n = bins.length;
    var px = function (i) { return x0 + (i + 0.5) / n * (x1 - x0); };
    var py = function (v) { return y1 - clamp(v, 0, ymax) / ymax * (y1 - y0); };

    var s = svgOpen(W, H, '不同泥质含量区间下两种方法的误差对比');
    [0, 1, 2, 3, 4, 5].forEach(function (v) {
      s += '<line x1="' + x0 + '" y1="' + py(v) + '" x2="' + x1 + '" y2="' + py(v) + '" stroke="' + C.grid + '"/>';
      s += '<text x="' + (x0 - 6) + '" y="' + (py(v) + 3) + '" font-size="9.5" fill="' + C.dim + '" text-anchor="end">' + v + '</text>';
    });
    bins.forEach(function (b, i) {
      s += '<text x="' + px(i) + '" y="' + (y1 + 13) + '" font-size="9.5" fill="' + C.dim + '" text-anchor="middle">' + b.vsh.toFixed(2) + '</text>';
    });
    /* 柱 */
    bins.forEach(function (b, i) {
      var bw = Math.min(18, (x1 - x0) / n * 0.3);
      s += '<rect x="' + (px(i) - bw - 1) + '" y="' + py(b.fm * 100) + '" width="' + bw + '" height="' + (y1 - py(b.fm * 100)) + '" fill="' + C.clay + '" fill-opacity=".45" rx="1.5"/>';
      s += '<rect x="' + (px(i) + 1) + '" y="' + py(b.ml * 100) + '" width="' + bw + '" height="' + (y1 - py(b.ml * 100)) + '" fill="' + C.jade + '" fill-opacity=".75" rx="1.5"/>';
    });
    s += '<line x1="' + x0 + '" y1="' + y1 + '" x2="' + x1 + '" y2="' + y1 + '" stroke="' + C.line + '"/>';
    s += '<text x="' + ((x0 + x1) / 2) + '" y="' + (y1 + 28) + '" font-size="10" fill="' + C.text + '" text-anchor="middle">泥质含量 Vsh</text>';
    s += '<text x="12" y="' + ((y0 + y1) / 2) + '" font-size="10" fill="' + C.text + '" transform="rotate(-90 12 ' + ((y0 + y1) / 2) + ')" text-anchor="middle">RMSE / p.u.</text>';
    s += '<rect x="' + (x0 + 4) + '" y="' + (y0 - 8) + '" width="9" height="9" rx="1.5" fill="' + C.clay + '" fill-opacity=".45"/>';
    s += '<text x="' + (x0 + 17) + '" y="' + (y0 + 0) + '" font-size="9.5" fill="' + C.text + '">密度公式</text>';
    s += '<rect x="' + (x0 + 68) + '" y="' + (y0 - 8) + '" width="9" height="9" rx="1.5" fill="' + C.jade + '" fill-opacity=".75"/>';
    s += '<text x="' + (x0 + 81) + '" y="' + (y0 + 0) + '" font-size="9.5" fill="' + C.text + '">学习法</text>';
    s += '</svg>';
    return s;
  }

  /* ---------- 样式 ---------- */
  var CSS = [
    '.w2{color:var(--ink,#242b2e);font-size:13px;line-height:1.6}',
    '.w2 *{box-sizing:border-box}',
    '.w2-head{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;flex-wrap:wrap;margin-bottom:14px}',
    '.w2-kick{font-family:ui-monospace,monospace;font-size:10px;letter-spacing:.16em;color:var(--clay,#b26a39)}',
    '.w2-h3{margin:6px 0 4px;font-size:17px;font-weight:600;letter-spacing:-.01em}',
    '.w2-sub{margin:0;color:var(--ink-3,#5d666d);max-width:52ch}',
    '.w2-ctl{display:flex;gap:26px;flex-wrap:wrap;align-items:flex-end;padding:12px 14px;border:1px solid var(--line,#e9e4d8);border-radius:10px;background:var(--paper-2,#faf8f2)}',
    '.w2-ctl label{display:block;font-size:10px;font-family:ui-monospace,monospace;letter-spacing:.1em;color:var(--ink-4,#9ba3a9);margin-bottom:6px}',
    '.w2-ctl input[type=range]{width:180px;accent-color:#2f7d6b}',
    '.w2-num{font-family:ui-monospace,monospace;font-size:13px;color:#2f7d6b;font-weight:600}',
    '.w2-seg{display:inline-flex;border:1px solid var(--line,#e9e4d8);border-radius:7px;overflow:hidden;background:#fff}',
    '.w2-seg button{appearance:none;border:0;background:transparent;padding:7px 13px;font-size:12px;color:var(--ink-3,#5d666d);cursor:pointer;font-family:inherit}',
    '.w2-seg button+button{border-left:1px solid var(--line,#e9e4d8)}',
    '.w2-seg button.on{background:#2f7d6b;color:#fff;font-weight:600}',
    '.w2-grid{display:grid;grid-template-columns:minmax(280px,1.05fr) minmax(300px,1fr);gap:16px;margin-top:16px}',
    '@media(max-width:760px){.w2-grid{grid-template-columns:1fr}}',
    '.w2-panel{border:1px solid var(--line,#e9e4d8);border-radius:10px;background:#fff;padding:12px 12px 8px}',
    '.w2-pt{font-size:10px;font-family:ui-monospace,monospace;letter-spacing:.12em;color:var(--ink-4,#9ba3a9);margin-bottom:6px;display:flex;justify-content:space-between}',
    '.w2-kpi{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-bottom:12px}',
    '.w2-k{background:var(--paper-2,#faf8f2);border-radius:8px;padding:9px 10px;min-width:0}',
    '.w2-k .l{font-size:10px;color:var(--ink-4,#9ba3a9);letter-spacing:.04em}',
    '.w2-k .v{font-family:ui-monospace,monospace;font-size:16px;font-weight:600;color:#242b2e;line-height:1.25;margin-top:3px;white-space:nowrap;letter-spacing:-.01em}',
    '.w2-k .v small{font-size:9.5px;font-weight:400;color:var(--ink-4,#9ba3a9);margin-left:2px}',
    '.w2-k.bad .v{color:#b26a39}',
    '.w2-k.ok .v{color:#2f7d6b}',
    '.w2-note{margin-top:14px;padding:11px 13px;border-radius:8px;background:#e6f1ec;color:#1d5b4e;font-size:12.5px}',
    '.w2-note.warn{background:#f8ecdf;color:#8a4f27}',
    '.w2-note b{color:inherit}'
  ].join('');

  /* ---------- 挂载 ---------- */
  function mount(root) {
    var wells = buildWells();
    var state = { n: 10, split: 'well' }, currentResult, tracePoint=0;

    root.innerHTML =
      '<div class="w2">' +
      '<style>' + CSS + '</style>' +
      '<div class="w2-head"><div>' +
      '<div class="w2-kick">INTERACTIVE · 储层参数解释</div>' +
      '<h3 class="w2-h3">同一口留出井：多曲线能否改善孔隙度解释？</h3>' +
      '<p class="w2-sub">拖动滑杆改变建模用井数，切换划分方式，看 R²、误差分布和"近邻同井率"怎么变。</p>' +
      '</div></div>' +

      '<div class="w2-ctl">' +
      '<div><label for="w2n">建模井数</label><input id="w2n" type="range" min="1" max="10" step="1" value="10">' +
      '<span class="w2-num" id="w2nv">10 口</span></div>' +
      '<div><label>训练/测试划分</label><div class="w2-seg" id="w2seg">' +
      '<button data-s="well" class="on">按井划分</button><button data-s="random">随机划分</button></div></div>' +
      '<div><label>对照基线</label><span style="font-size:12px;color:#5d666d">密度公式 φ=(ρma−ρb)/(ρma−ρf)</span></div>' +
      '</div>' +

      '<div class="w2-grid">' +
      '<div class="w2-panel"><div class="w2-pt"><span>剖面 · WELL-02（留出井）</span><span>φ 0—0.36</span></div><div id="w2prof"></div></div>' +
      '<div>' +
      '<div class="w2-kpi" id="w2kpi"></div>' +
      '<div class="w2-panel" style="margin-bottom:12px"><div class="w2-pt"><span>预测 vs 真实</span><span id="w2scn"></span></div><div id="w2scat"></div></div>' +
      '<div class="w2-panel"><div class="w2-pt"><span>误差随泥质含量变化</span><span>RMSE / p.u.</span></div><div id="w2bins"></div></div>' +
      '</div></div>' +

      '<div class="w2-note" id="w2note"></div>' +
      '</div>';

    var $ = function (id) { return root.querySelector('#' + id); };

    function render() {
      var ev = evaluate(wells, state.n, state.split);currentResult=ev;

      $('w2prof').innerHTML = drawProfile(ev);
      $('w2scat').innerHTML = drawScatter(ev);
      $('w2bins').innerHTML = drawBins(ev);
      $('w2scn').textContent = ev.n + ' 点';

      $('w2kpi').innerHTML =
        '<div class="w2-k ok"><div class="l">R²（学习法）</div><div class="v">' + ev.r2.toFixed(3) + '</div></div>' +
        '<div class="w2-k ok"><div class="l">RMSE</div><div class="v">' + p10(ev.rmse) + '<small>p.u.</small></div></div>' +
        '<div class="w2-k bad"><div class="l">公式法 RMSE</div><div class="v">' + p10(ev.rmseF) + '<small>p.u.</small></div></div>' +
        '<div class="w2-k"><div class="l">近邻同井率</div><div class="v">' + pct(ev.sameWell) + '</div></div>';

      var note = $('w2note');
      var clean = ev.bins[0];
      note.className='w2-note'+(state.split==='random'?' warn':'');
      note.innerHTML='<b>'+(state.split==='random'?'随机点划分：不证明跨井泛化。':'整井留出：训练排除 WELL-02 和 WELL-07。')+'</b> 最近的一个训练邻居来自同井的测试点比例 '+pct(ev.sameWell)+'。同一测试集：多曲线 KNN RMSE '+p10(ev.rmse)+' p.u. / R² '+ev.r2.toFixed(3)+'；DEN 单曲线回归 '+p10(ev.denRMSE)+' p.u. / R² '+ev.denR2.toFixed(3)+'；密度公式 '+p10(ev.rmseF)+' p.u.。训练井按固定井号递增加入，没有按测试相似性选井。差值只支持当前合成条件，不是额外曲线的因果证明。';
    }

    $('w2n').addEventListener('input', function () {
      state.n = parseInt(this.value, 10);
      $('w2nv').textContent = state.n + ' 口';
      render();
    });

    var seg = $('w2seg');
    seg.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('button') : null;
      if (!b || !b.dataset) return;
      if (b.dataset.s === state.split) return;
      state.split = b.dataset.s;
      Array.prototype.forEach.call(seg.querySelectorAll('button'), function (x) {
        x.classList.toggle('on', x.dataset.s === state.split);
      });
      render();
    });

    render();
    $('w2prof').addEventListener('click',function(e){var bounds=this.getBoundingClientRect(),y=(e.clientY-bounds.top)/bounds.height*472;tracePoint=clamp(Math.round((y-54)/342*(NPTS-1)),0,NPTS-1);currentResult.tracePoint=tracePoint;this.innerHTML=drawProfile(currentResult);this.dispatchEvent(new Event('tracechange',{bubbles:true}));});
    return {trace:{read:function(d){return trace(currentResult,tracePoint,d);},range:function(){return {min:0,max:NPTS-1,value:tracePoint};},select:function(i){tracePoint=i;currentResult.tracePoint=i;$('w2prof').innerHTML=drawProfile(currentResult);},worst:function(){var ev=currentResult,best=0;ev.profile.forEach(function(v,i){if(Math.abs(v-ev.profileTruth[i].phi)>Math.abs(ev.profile[best]-ev.profileTruth[best].phi))best=i;});return best;}}};
  }

  window.W2DEMO = mount;
  window.__CASE_MOUNT__ = mount;
  /* 调试出口：Node 侧可直接拿到数据与图，用于自测指标与 SVG 结构 */
  window.__W2TEST__ = { buildWells: buildWells, evaluate: evaluate, fitKNN:fitKNN, explainKNN:explainKNN, fitDen:fitDen, trace:trace, r2:r2, rmse:rmse, TESTW:TESTW, WELL_ORDER:WELL_ORDER, draw: { profile: drawProfile, scatter: drawScatter, bins: drawBins } };

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
})(window,"W2DEMO",{"name":"KNN 五近邻回归 · 孔隙度预测","input":"训练井 DEN、GR、CNL＋岩心孔隙度标签","operation":"按训练统计量标准化 → 找五个近邻 → 取其孔隙度均值","why":"密度公式采用固定骨架假设；多曲线相似样本还包含泥质等响应信息。相似曲线组合的已知孔隙度提供局部参考。但本轮审计中，DEN 单曲线回归优于多曲线 KNN；更多输入和更复杂方法不自动带来收益。刻度漂移、样本覆盖不足仍会降低效果。","try":"比较学习法与密度公式在泥质段的误差；切换按井/随机划分，观察同井近邻造成的评价偏差。","selector":".w2-kpi","audit":{"metric":"RMSE / p.u. ↓","limits":"DEN 公式采用固定砂岩骨架，DEN 单变量回归由同一训练集拟合且在基准上优于多曲线 KNN；不能只与经验公式比。输入/方法对照是生成器条件结果，不是因果证明。训练顺序改为固定井号。","series":[{"axis":"denShift","value":0,"baseline":4.202658072030184,"learn":2.6233537683158588,"denOnly":1.4317415926711485},{"axis":"denShift","value":0.03,"baseline":5.8164804514674,"learn":2.815861358261079,"denOnly":1.8494453316924921},{"axis":"denShift","value":0.07,"baseline":7.99890725849762,"learn":3.797368142174224,"denOnly":3.423926792162391},{"axis":"denShift","value":0.12,"baseline":10.618736248656116,"learn":5.315918774907545,"denOnly":5.701641303907388},{"axis":"cnlShift","value":0,"baseline":4.202658072030184,"learn":2.6233537683158588,"denOnly":1.4317415926711485},{"axis":"cnlShift","value":0.04,"baseline":4.202658072030184,"learn":2.5448782238277814,"denOnly":1.4317415926711485},{"axis":"cnlShift","value":0.08,"baseline":4.202658072030184,"learn":2.884852623885255,"denOnly":1.4317415926711485},{"axis":"cnlShift","value":0.16,"baseline":4.202658072030184,"learn":3.8813455875630556,"denOnly":1.4317415926711485},{"axis":"noiseScale","value":0,"baseline":4.202658072030184,"learn":2.6233537683158588,"denOnly":1.4317415926711485},{"axis":"noiseScale","value":1,"baseline":4.2887548352813365,"learn":2.7341486111103905,"denOnly":1.588982237458524},{"axis":"noiseScale","value":2,"baseline":4.525084005302272,"learn":2.9785492865850047,"denOnly":1.9810195106178108},{"axis":"noiseScale","value":4,"baseline":5.349230537100369,"learn":3.7558708192699295,"denOnly":3.0817795777074237}]}},function installTrace(root, body, mounted, guideSteps) {
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
},[["#w2n","确认整井留出，改变训练井数量。"],["[data-trace-worst]","定位本剖面回归误差最大点，查看五个邻居。"],["[data-trace-delta]","改本点 DEN，解释距离与孔隙度均值的变化，并对照公式。"]]);if(typeof module!=="undefined")module.exports=demo;})();
