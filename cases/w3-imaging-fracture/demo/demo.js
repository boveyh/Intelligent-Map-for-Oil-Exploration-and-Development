/* =========================================================
   w3 · 成像测井裂缝识别 —— 可运行示范
   ---------------------------------------------------------
   自包含：不依赖站点 CSS / K 工具箱 / 全局 id。
   同一份文件既被插件 mount，也被上传宿主挂进 Shadow DOM。

   算法（全部真实计算，无预置结果）：
     1. 合成 FMI 展开图（背景 + 层理 + 天然缝 + 可选诱导缝）
     2. 显著度 = 局部均值 − 像素（突出高导异常，压掉背景）
     3. 正弦 Hough：在 (振幅 A, 相位 φ) 上穷举，沿正弦路径求均值
     4. 产状反算：tanθ = 2A / d，倾向 = 相位
     5. 朴素基线：阈值 + 连通域计数（把诱导缝也当裂缝）
   ========================================================= */
(function () {
  'use strict';

  /* ---------------- 几何常数 ---------------- */
  var R = 200, C = 120;                 // 深度 200 行 × 方位 120 列
  var SPAN = 1.0;                       // 图像深度窗 1.0 m
  var BORE = 0.2;                       // 井径 0.2 m
  var ROWM = SPAN / R;                  // 0.005 m / 行
  var DEPTH0 = 3120;                    // 窗口顶深（m），仅用于清单里的深度标注

  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function gauss(rnd) {
    var u = 1 - rnd(), v = rnd();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(6.2831853 * v);
  }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  /* 倾角 ↔ 正弦振幅：tanθ = 2A / d */
  function dipToA(dipDeg) { return (BORE * Math.tan(dipDeg * Math.PI / 180) / 2) / ROWM; }
  function aToDip(aPx) { return Math.atan(2 * aPx * ROWM / BORE) * 180 / Math.PI; }

  /* ---------------- 1. 合成展开图 ---------------- */
  function drawSine(img, y0, A, phase, thick, amp) {
    var s2 = Math.max(0.55, thick / 2.2), den = 2 * s2 * s2;
    for (var c = 0; c < C; c++) {
      var rf = y0 + A * Math.cos(6.2831853 * c / C - phase);
      var r0 = Math.round(rf - thick * 1.7), r1 = Math.round(rf + thick * 1.7);
      for (var r = r0; r <= r1; r++) {
        if (r < 0 || r >= R) continue;
        var d = r + 0.5 - rf;
        var w = Math.exp(-(d * d) / den) * amp;
        var i = r * C + c;
        img[i] = img[i] + w > 1 ? 1 : img[i] + w;
      }
    }
  }
  function drawVert(img, col, thick, amp, r0, r1) {
    var s2 = Math.max(0.55, thick / 2.2), den = 2 * s2 * s2;
    r0 = r0 == null ? 0 : r0; r1 = r1 == null ? R - 1 : r1;
    for (var r = r0; r <= r1; r++) {
      for (var c = Math.round(col - 3); c <= Math.round(col + 3); c++) {
        var cc = ((c % C) + C) % C;
        var d = c + 0.5 - col;
        var w = Math.exp(-(d * d) / den) * amp;
        var i = r * C + cc;
        img[i] = img[i] + w > 1 ? 1 : img[i] + w;
      }
    }
  }

  function synth(p) {
    var rnd = mulberry32(p.seed || 7);
    var img = new Float32Array(R * C);
    var i, r, c;

    /* 背景导电性 + 噪声 */
    var bg = 0.20, sg = 0.012 + p.noise * 0.0016;
    for (i = 0; i < R * C; i++) img[i] = clamp(bg + gauss(rnd) * sg, 0, 1);

    /* 层理：近水平，振幅 1—5 px（倾角 ≈ 1—4°）—— 这是最主要的干扰 */
    var beds = 4;
    for (var b = 0; b < beds; b++) {
      drawSine(img, 22 + b * 44 + rnd() * 8, 1 + rnd() * 4, rnd() * 6.2832,
        1.5, 0.26 + rnd() * 0.06);
    }

    /* 天然缝 */
    var truth = [];
    var n = Math.max(1, p.nf);
    for (var k = 0; k < n; k++) {
      var dip = clamp(p.dip + (rnd() - 0.5) * 10, 8, 78);
      var az = ((p.azim + (rnd() - 0.5) * 40) % 360 + 360) % 360;
      var A = dipToA(dip);
      var y0 = 34 + k * ((R - 68) / Math.max(1, n - 1)) * 0.92 + (rnd() - 0.5) * 8;
      var ap = clamp(p.aper * (0.82 + rnd() * 0.36), 0.8, 9);
      drawSine(img, y0, A, az * Math.PI / 180, ap, 0.52);
      truth.push({ y0: y0, A: A, az: az, dip: dip });
    }

    /* 诱导缝：沿井轴的两条竖直线，方位相差 180° */
    if (p.induced) {
      var cA = ((p.azim + 90) % 360) / 360 * C, cB = ((p.azim + 270) % 360) / 360 * C;
      [cA, cB].forEach(function (cc) {
        drawVert(img, cc, 2.4, 0.50, 0, 60);
        drawVert(img, cc, 2.4, 0.50, 72, 128);
        drawVert(img, cc, 2.4, 0.50, 140, 198);
      });
    }

    /* 逐像素抖动 */
    for (i = 0; i < R * C; i++) img[i] = clamp(img[i] + gauss(rnd) * p.noise * 0.0012, 0, 1);

    return { img: img, truth: truth };
  }

  /* ---------------- 2. 显著度 ---------------- */
  /* 纵向 25 行滑动均值作为背景估计：缝在每一列只占 1—8 行，
     用 5×5 邻域会把宽带状缝的"背景"直接算成缝本身，显着度归零 —— 这是第一版的真实缺陷。 */
  function saliency(img) {
    var half = 12, win = 2 * half + 1, out = new Float32Array(R * C), c, r, sum;
    function rr2(x) { return x < 0 ? 0 : x >= R ? R - 1 : x; }
    for (c = 0; c < C; c++) {
      sum = 0;
      for (r = -half; r <= half; r++) sum += img[rr2(r) * C + c];
      for (r = 0; r < R; r++) {
        var v = sum / win - img[r * C + c];
        out[r * C + c] = v > 0 ? v : 0;
        sum += img[rr2(r + half + 1) * C + c] - img[rr2(r - half) * C + c];
      }
    }
    return out;
  }

  /* ---------------- 3. 正弦 Hough ---------------- */
  function hough(sal, opt) {
    opt = opt || {};
    var PH = 48, AS = 30, AMIN = 9, AMAX = 78;   // AMIN=9px ≈ 12.6°，层理（1—5 px）被下限挡掉
    var MINSEP = opt.minSep || 22, MAXN = opt.maxN || 8;
    var cands = [];

    for (var ai = 0; ai < AS; ai++) {
      var A = AMIN + (AMAX - AMIN) * ai / (AS - 1);
      for (var pi = 0; pi < PH; pi++) {
        var ph = pi * 6.2831853 / PH;
        var dy = new Int16Array(C);
        for (var c = 0; c < C; c++) dy[c] = Math.round(A * Math.cos(6.2831853 * c / C - ph));

        var b1 = { s: -1, y: 0 }, b2 = { s: -1, y: 0 };
        for (var y0 = 2; y0 < R - 2; y0++) {
          var sum = 0, cnt = 0;
          for (var c2 = 0; c2 < C; c2 += 2) {
            var rr = y0 + dy[c2];
            if (rr < 0 || rr >= R) continue;
            sum += sal[rr * C + c2]; cnt++;
          }
          if (cnt < 40) continue;               // 路径大半出界，不作候选
          var sc = sum / cnt;
          if (sc > b1.s) {
            if (Math.abs(y0 - b1.y) > 4) { b2 = b1; }
            b1 = { s: sc, y: y0 };
          } else if (sc > b2.s && Math.abs(y0 - b1.y) > MINSEP) {
            b2 = { s: sc, y: y0 };
          }
        }
        cands.push({ A: A, ph: ph, y0: b1.y, score: b1.s });
        /* 同一个 (A,φ) 上的第二峰：只有分数接近才可能是另一条缝，否则是主峰的旁瓣 */
        if (b2.s > b1.s * 0.72) cands.push({ A: A, ph: ph, y0: b2.y, score: b2.s });
      }
    }

    cands.sort(function (a, b) { return b.score - a.score; });
    if (opt.proposals) {
      var proposals=[], minimum=Math.max(.028,(cands[0] ? cands[0].score : 0)*.48);
      for(var ci=0;ci<cands.length && proposals.length<60;ci++){
        var ca=cands[ci];
        if(ca.score<minimum)break;
        if(ca.y0<8||ca.y0>R-8)continue;
        if(proposals.some(function(q){return Math.abs(q.y0-ca.y0)<7 && Math.abs(q.A-ca.A)<10 && Math.abs(Math.atan2(Math.sin(q.ph-ca.ph),Math.cos(q.ph-ca.ph)))<.6;}))continue;
        proposals.push({y0:ca.y0,A:ca.A,az:ca.ph*180/Math.PI,score:ca.score});
      }
      return proposals;
    }
    /* 峰值阈值：路径平均显著度 */
    var top = cands.length ? cands[0].score : 0;
    var THR = Math.max(0.05, top * 0.80);
    var out = [];
    for (var i = 0; i < cands.length && out.length < MAXN; i++) {
      var k = cands[i];
      if (k.score < THR) break;
      if (k.y0 < 8 || k.y0 > R - 8) continue;
      var dup = false;
      for (var j = 0; j < out.length; j++) {
        if (Math.abs(out[j].y0 - k.y0) < MINSEP) { dup = true; break; }
      }
      if (dup) continue;
      out.push({ y0: k.y0, A: k.A, az: k.ph * 180 / Math.PI, score: k.score });
    }
    return out;
  }

  /* ---------------- 4. 朴素基线：阈值 + 连通域 ---------------- */
  function naive(img, thr) {
    thr = thr || 0.42;
    var mask = new Uint8Array(R * C), seen = new Uint8Array(R * C), i;
    for (i = 0; i < R * C; i++) mask[i] = img[i] > thr ? 1 : 0;
    var blobs = [], stack = [];
    for (i = 0; i < R * C; i++) {
      if (!mask[i] || seen[i]) continue;
      stack.length = 0; stack.push(i); seen[i] = 1;
      var area = 0, sy = 0, sx = 0;
      while (stack.length) {
        var q = stack.pop(), r = (q / C) | 0, c = q % C;
        area++; sy += r; sx += c;
        for (var dr = -1; dr <= 1; dr++) {
          for (var dc = -1; dc <= 1; dc++) {
            var rr = r + dr, cc = ((c + dc) % C + C) % C;
            if (rr < 0 || rr >= R) continue;
            var qi = rr * C + cc;
            if (mask[qi] && !seen[qi]) { seen[qi] = 1; stack.push(qi); }
          }
        }
      }
      if (area >= 12) blobs.push({ y0: sy / area, area: area });
    }
    return blobs;
  }

  /* ---------------- 5. 匹配与指标 ---------------- */
  /* 配对判据必须同时看深度和倾角：只按深度差配对，会把"深度对上了但倾角全错"的
     假检出算成命中，检出率虚高。倾角是该场景的输出之一，不能只当副产品。 */
  function evaluate(truth, dets, tol) {
    tol = tol || 14;
    /* 倾角容差随真值缩放：arctan 在低角度处很陡，固定的 12° 容差会把
       "A=9 px（24.5°）" 当成 15° 缝的命中，低角度区检出率虚高。 */
    var tolDipOf = function (d0) { return Math.max(4, Math.min(10, d0 * 0.12)); };
    var hit = new Array(truth.length), used = new Array(dets.length);
    var errs = [], azErrs = [], tp = 0, i, j;
    for (i = 0; i < truth.length; i++) hit[i] = false;
    for (j = 0; j < dets.length; j++) used[j] = false;

    /* 按"深度差 + 倾角差"综合距离贪心配对 */
    var pairs = [];
    for (i = 0; i < truth.length; i++) {
      for (j = 0; j < dets.length; j++) {
        var d = Math.abs(truth[i].y0 - dets[j].y0);
        if (d > tol) continue;
        var ddp = dets[j].A == null ? 0 : Math.abs(aToDip(dets[j].A) - truth[i].dip);
        if (ddp > tolDipOf(truth[i].dip)) continue;
        pairs.push({ i: i, j: j, d: d + ddp * 1.2 });
      }
    }
    pairs.sort(function (a, b) { return a.d - b.d; });
    pairs.forEach(function (p) {
      if (hit[p.i] || used[p.j]) return;
      hit[p.i] = true; used[p.j] = true; tp++;
      if (dets[p.j].A != null) {
        errs.push(Math.abs(aToDip(dets[p.j].A) - truth[p.i].dip));
        var daz = Math.abs(((dets[p.j].az - truth[p.i].az) % 360 + 540) % 360 - 180);
        azErrs.push(daz);
      }
    });
    var fp = used.filter(function (u) { return !u; }).length;
    var fn = hit.filter(function (h) { return !h; }).length;
    errs.sort(function (a, b) { return a - b; });
    azErrs.sort(function (a, b) { return a - b; });
    return {
      tp: tp, fp: fp, fn: fn,
      dipErr: errs.length ? errs[Math.floor(errs.length / 2)] : 0,
      azErr: azErrs.length ? azErrs[Math.floor(azErrs.length / 2)] : 0
    };
  }

  function run(p) {
    var s = synth(p);
    var sal = saliency(s.img);
    var dets = hough(sal);
    var blobs = naive(s.img);
    var learned=learningFilter(sal,p.cutoff);
    return {
      p: p, truth: s.truth, img: s.img, sal: sal, dets: dets, blobs: blobs,
      learning:learned, detsML:learned.dets, mL:evaluate(s.truth,learned.dets),
      mH: evaluate(s.truth, dets),
      mN: evaluate(s.truth, blobs)
    };
  }

  var LEARN_FEATURES=['路径平均显著度','连续覆盖比例','路径与邻域反差','路径最弱四分位'];
  function pathFeatures(sal,d){
    var values=[],side=0,phase=d.az*Math.PI/180;
    for(var c=0;c<C;c++){
      var y=Math.round(d.y0+d.A*Math.cos(2*Math.PI*c/C-phase));
      if(y<7||y>=R-7)continue;
      var v=0;
      for(var o=-1;o<=1;o++)v=Math.max(v,sal[(y+o)*C+c]);
      values.push(v);side+=(sal[(y-6)*C+c]+sal[(y+6)*C+c])/2;
    }
    if(!values.length)return [0,0,0,0];
    var mean=values.reduce(function(a,b){return a+b;},0)/values.length;
    var sorted=values.slice().sort(function(a,b){return a-b;});
    return [mean,values.filter(function(v){return v>.045;}).length/values.length,mean-side/values.length,sorted[Math.floor(sorted.length/4)]];
  }
  function logistic(v){return 1/(1+Math.exp(-Math.max(-30,Math.min(30,v))));}
  var learnedModel=null;
  function trainClassifier(){
    if(learnedModel)return learnedModel;
    var rows=[],seeds=[];
    for(var t=0;t<8;t++){
      var seed=4101+t*97,sample=synth({seed:seed,dip:26+t*5,azim:35+t*37,aper:2+t%4,noise:4+(t%4)*6,nf:3,induced:t%2===0}),sal=saliency(sample.img);
      seeds.push(seed);
      hough(sal,{proposals:true}).forEach(function(d){
        var labelled=sample.truth.some(function(q){return Math.abs(q.y0-d.y0)<=14 && Math.abs(aToDip(d.A)-q.dip)<=Math.max(4,Math.min(10,q.dip*.12));});
        rows.push({x:pathFeatures(sal,d),y:labelled?1:0});
      });
    }
    var mean=[0,0,0,0],sd=[0,0,0,0],weights=[0,0,0,0,0],positive=rows.filter(function(q){return q.y;}).length;
    rows.forEach(function(q){q.x.forEach(function(v,j){mean[j]+=v/rows.length;});});
    rows.forEach(function(q){q.x.forEach(function(v,j){sd[j]+=(v-mean[j])*(v-mean[j])/rows.length;});});sd=sd.map(function(v){return Math.sqrt(v)||1;});
    var x=rows.map(function(q){return [1].concat(q.x.map(function(v,j){return (v-mean[j])/sd[j];}));});
    for(var ep=0;ep<360;ep++){
      var grad=[0,0,0,0,0];rows.forEach(function(q,i){var z=0;for(var j=0;j<5;j++)z+=weights[j]*x[i][j];var error=(logistic(z)-q.y)*(q.y?(rows.length-positive)/positive:1);for(var j=0;j<5;j++)grad[j]+=error*x[i][j]/rows.length;});
      for(var j=0;j<5;j++)weights[j]-=.06*(grad[j]+(j?.02*weights[j]:0));
    }
    return learnedModel={mean:mean,sd:sd,weights:weights,seeds:seeds,samples:rows.length,positives:positive};
  }
  function explainCandidate(sal,d,model){
    model=model||trainClassifier();var x=pathFeatures(sal,d),z=x.map(function(v,j){return (v-model.mean[j])/model.sd[j];}),terms=z.map(function(v,j){return v*model.weights[j+1];}),logit=model.weights[0]+terms.reduce(function(a,b){return a+b;},0);
    return {x:x,z:z,terms:terms,logit:logit,score:logistic(logit)};
  }
  function learningFilter(sal,cutoff){
    var model=trainClassifier(),candidates=hough(sal,{proposals:true});
    candidates.forEach(function(d){d.proof=explainCandidate(sal,d,model);d.mlScore=d.proof.score;});
    candidates.sort(function(a,b){return b.mlScore-a.mlScore;});var dets=[];
    candidates.forEach(function(d){if(d.mlScore>=(cutoff==null?.5:cutoff) && dets.every(function(q){return Math.abs(d.y0-q.y0)>=22;}))dets.push(d);});
    return {model:model,candidates:candidates,dets:dets};
  }

  /* 导出纯函数，供 tools/test-w3.js 在 Node 里复算 */
  var API = {
    R: R, C: C, SPAN: SPAN, BORE: BORE, ROWM: ROWM,
    dipToA: dipToA, aToDip: aToDip,
    synth: synth, saliency: saliency, hough: hough, naive: naive,
    evaluate: evaluate, run: run, pathFeatures:pathFeatures, trainClassifier:trainClassifier, explainCandidate:explainCandidate, learningFilter:learningFilter, LEARN_FEATURES:LEARN_FEATURES
  };
  if (typeof window !== 'undefined') { window.W3CORE = API; }

  /* ---------------- 渲染 ---------------- */
  var CSS = [
    '.w3{font-size:13px;color:#242b2e;line-height:1.6}',
    '.w3 *{box-sizing:border-box}',
    '.w3 [data-w3-method]{font:12px/1.7 system-ui,sans-serif;padding:6px 11px;border:1px solid #c7cfc3;border-radius:6px;background:#fff;color:#426354;cursor:pointer}',
    '.w3 [data-w3-method][aria-pressed=true]{background:#2f7d6b;border-color:#2f7d6b;color:#fff}',
    '.w3-kpi{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-bottom:12px}',
    '.w3-k{background:#faf8f2;border-radius:8px;padding:9px 10px;min-width:0}',
    '.w3-k .l{font-size:10.5px;color:#79828a;letter-spacing:.03em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.w3-k .v{font-family:ui-monospace,monospace;font-size:16px;font-weight:600;margin-top:3px;white-space:nowrap}',
    '.w3-k .v small{font-size:10.5px;font-weight:400;color:#79828a;margin-left:3px}',
    '.w3-k.bad .v{color:#b06a39}',
    '.w3-k.good .v{color:#2f7d6b}',
    '.w3-main{display:flex;gap:16px;align-items:flex-start}',
    '.w3-img{position:relative;flex:0 0 232px;width:232px;border:1px solid #e9e4d8;border-radius:8px;overflow:hidden;background:#fff}',
    '.w3-img canvas{display:block;width:100%;height:auto;image-rendering:pixelated}',
    '.w3-ov{position:absolute;left:0;top:0;width:100%;height:100%}',
    '.w3-side{flex:1;min-width:0}',
    '.w3-side .cap{font-size:10.5px;color:#79828a;margin-bottom:2px}',
    '.w3-polar{display:block;width:100%;max-width:272px;height:auto}',
    '.w3-legend{display:flex;gap:14px;font-size:10px;color:#79828a;margin-top:-4px;flex-wrap:wrap}',
    '.w3-legend i{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:4px;vertical-align:middle}',
    '.w3-ctl{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px 16px;margin-top:14px;padding-top:12px;border-top:1px solid #eeeae0}',
    '.w3-c{min-width:0}',
    '.w3-c label{display:flex;justify-content:space-between;font-size:10.5px;color:#5d666d;margin-bottom:2px}',
    '.w3-c label b{font-family:ui-monospace,monospace;color:#242b2e;font-weight:600}',
    '.w3-c input[type=range]{width:100%;height:16px;accent-color:#2f7d6b;margin:0}',
    '.w3-c.chk{display:flex;align-items:center;gap:8px;font-size:11px;color:#5d666d}',
    '.w3-c.chk input{accent-color:#b26a39;width:14px;height:14px;margin:0}',
    '.w3-note{margin-top:12px;padding:9px 11px;border-left:3px solid #2f7d6b;background:#f2f7f5;border-radius:0 8px 8px 0;font-size:11.5px;color:#3f6d61}',
    '.w3-note.warn{border-left-color:#b26a39;background:#fbf3ed;color:#8c5340}',
    '.w3-note b{color:inherit}',
    '.w3-tbl{margin-top:6px}',
    '.w3-tbl table{width:100%;border-collapse:collapse;font-size:10.5px}',
    '.w3-tbl th{text-align:left;font-weight:500;color:#9ba3a9;font-size:9.5px;padding:0 6px 3px 0;border-bottom:1px solid #eeeae0;white-space:nowrap}',
    '.w3-tbl td{padding:3px 6px 3px 0;font-family:ui-monospace,monospace;color:#3a4247;border-bottom:1px solid #f4f1e8;white-space:nowrap}',
    '.w3-tbl td.k{color:#2f7d6b;font-weight:600}',
    '.w3-tbl td small{color:#b0a894;font-weight:400;font-family:inherit}',
    '.w3-tbl .none{color:#b0a894;font-size:10px;padding-top:6px}',
    '@media(max-width:760px){.w3-main{flex-direction:column}.w3-cv,.w3-side,.w3-track,.w3-img{flex:none;width:100%;min-width:0;max-width:100%}.w3-main canvas{width:100%!important;height:auto!important}.w3-kpi{grid-template-columns:repeat(2,minmax(0,1fr))}.w3-ctl{grid-template-columns:1fr}.w3-c[style]{grid-column:auto!important}}',
  ].join('\n');

  function injectCSS(root) {
    if (root.querySelector('style[data-w3]')) return;
    var st = document.createElement('style');
    st.setAttribute('data-w3', '1');
    st.textContent = CSS;
    root.appendChild(st);
  }

  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }

  /* 图像 → canvas */
  function paintImage(canvas, img) {
    canvas.width = C; canvas.height = R;
    var g = canvas.getContext('2d');
    var data = g.createImageData(C, R);
    var d = data.data;
    for (var i = 0; i < R * C; i++) {
      var v = img[i];
      /* 导电性越高越暗（FMI 惯例：高导异常为深色） */
      var L = Math.round(242 - 205 * v);
      L = L < 20 ? 20 : L > 248 ? 248 : L;
      var o = i * 4;
      d[o] = L + 4; d[o + 1] = L; d[o + 2] = L - 6; d[o + 3] = 255;
    }
    g.putImageData(data, 0, 0);
  }

  function sinePath(A, ph, y0) {
    var pts = [];
    for (var c = 0; c <= C; c += 2) {
      var r = y0 + A * Math.cos(6.2831853 * c / C - ph);
      pts.push((c === 0 ? 'M' : 'L') + c.toFixed(1) + ' ' + r.toFixed(1));
    }
    return pts.join(' ');
  }

  function paintOverlay(svg, res, showTruth) {
    var s = '<svg viewBox="0 0 ' + C + ' ' + R + '" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">';
    if (showTruth) {
      res.truth.forEach(function (t) {
        s += '<path d="' + sinePath(t.A, t.az * Math.PI / 180, t.y0) + '" fill="none" stroke="#b26a39" stroke-width="1.1" stroke-opacity=".85" stroke-dasharray="4 3"/>';
      });
    }
    res.dets.forEach(function (d) {
      s += '<path d="' + sinePath(d.A, d.az * Math.PI / 180, d.y0) + '" fill="none" stroke="#2f7d6b" stroke-width="1.5" stroke-linecap="round" stroke-opacity=".95"/>';
    });
    s += '</svg>';
    svg.innerHTML = s;
  }

  /* 产状极坐标：倾角为半径，倾向为方位角 */
  function paintPolar(svg, res) {
    var cx = 130, cy = 134, rmax = 96;
    var s = '<svg viewBox="0 0 260 264" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="裂缝产状：倾向与倾角分布">';
    [30, 60, 90].forEach(function (dv) {
      var r = rmax * dv / 90;
      s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="#eeeae0"/>';
      s += '<text x="' + cx + '" y="' + (cy - r - 3) + '" font-size="8" font-family="monospace" fill="#b3aa96" text-anchor="middle">' + dv + '°</text>';
    });
    [[0, '0'], [90, '90'], [180, '180'], [270, '270']].forEach(function (a) {
      var rad = a[0] * Math.PI / 180;
      s += '<line x1="' + (cx + 12 * Math.sin(rad)) + '" y1="' + (cy - 12 * Math.cos(rad)) + '" x2="' + (cx + rmax * Math.sin(rad)) + '" y2="' + (cy - rmax * Math.cos(rad)) + '" stroke="#eeeae0"/>';
      s += '<text x="' + (cx + (rmax + 11) * Math.sin(rad)) + '" y="' + (cy - (rmax + 11) * Math.cos(rad) + 3) + '" font-size="8.5" font-family="monospace" fill="#9ba3a9" text-anchor="middle">' + a[1] + '</text>';
    });

    function pt(az, dip) {
      var r = rmax * clamp(dip, 0, 90) / 90, rad = az * Math.PI / 180;
      return { x: cx + r * Math.sin(rad), y: cy - r * Math.cos(rad) };
    }
    res.truth.forEach(function (t) {
      var p = pt(t.az, t.dip);
      s += '<circle cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="4.4" fill="none" stroke="#b26a39" stroke-width="1.3"/>';
    });
    res.dets.forEach(function (d) {
      var p = pt(d.az, aToDip(d.A));
      s += '<circle cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="3" fill="#2f7d6b"/>';
      /* 误差连线 */
    });
    s += '</svg>';
    svg.innerHTML = s;
  }

  /* ---------------- mount ---------------- */
  function mount(root) {
    injectCSS(root);

    var state = { dip: 38, azim: 120, aper: 3, noise: 6, nf: 4, induced: false, showTruth: true, mode:'learn', cutoff:.5 };

    var wrap = el('div', 'w3');
    wrap.innerHTML =
      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px"><button type="button" data-w3-method="hough" aria-pressed="false">Hough 几何基线</button><button type="button" data-w3-method="learn" aria-pressed="true">候选 + 监督学习筛选</button></div>' +
      '<div class="w3-kpi">' +
        '<div class="w3-k" id="w3k1"><div class="l">天然缝（真值）</div><div class="v" id="w3v1">—</div></div>' +
        '<div class="w3-k good" id="w3k2"><div class="l" id="w3methodlabel">学习筛选命中</div><div class="v" id="w3v2">—</div></div>' +
        '<div class="w3-k bad" id="w3k3"><div class="l">阈值法误检</div><div class="v" id="w3v3">—</div></div>' +
        '<div class="w3-k" id="w3k4"><div class="l">倾角中位误差</div><div class="v" id="w3v4">—</div></div>' +
      '</div>' +
      '<div class="w3-main">' +
        '<div class="w3-img"><canvas id="w3cv"></canvas><div class="w3-ov" id="w3ov"></div></div>' +
        '<div class="w3-side">' +
          '<div class="cap">产状：倾向（方位）× 倾角（半径）—— 两种标记越近，反算越接近真值</div>' +
          '<div id="w3polar" class="w3-polar"></div>' +
          '<div class="w3-legend"><span><i style="background:#b26a39"></i>真实产状</span>' +
          '<span><i style="background:#2f7d6b"></i>算法反算</span>' +
          '<span><i style="border:1px dashed #b26a39;background:none"></i>真实正弦</span></div>' +
          '<div class="w3-tbl" id="w3tbl"></div>' +
        '</div>' +
      '</div>' +
      '<div class="w3-ctl">' +
        '<div class="w3-c"><label for="w3sd">倾角 θ<b id="w3ld">38°</b></label><input type="range" id="w3sd" min="15" max="75" value="38"></div>' +
        '<div class="w3-c"><label for="w3sa">倾向 α<b id="w3la">120°</b></label><input type="range" id="w3sa" min="0" max="355" value="120"></div>' +
        '<div class="w3-c"><label for="w3sp">开度<b id="w3lp">3 px</b></label><input type="range" id="w3sp" min="1" max="8" value="3"></div>' +
        '<div class="w3-c"><label for="w3sn">噪声<b id="w3ln">6</b></label><input type="range" id="w3sn" min="0" max="40" value="6"></div>' +
        '<div class="w3-c"><label for="w3sf">缝数<b id="w3lf">4</b></label><input type="range" id="w3sf" min="1" max="6" value="4"></div>' +
        '<div class="w3-c chk"><input type="checkbox" id="w3si"><label for="w3si" style="margin:0">叠加诱导缝（钻井造成）</label></div>' +
      '</div>' +
      '<div class="w3-note" id="w3note"></div>';
    root.appendChild(wrap);
    var learningBox=el('section','w3-learning');
    learningBox.style.cssText='margin:18px 0;padding:15px;border:1px solid #dcded2;border-radius:10px;background:#fcfbf7;font:12px/1.8 system-ui,sans-serif';
    learningBox.innerHTML='<h3 style="font-size:15px;margin:0 0 8px">标注样本怎样筛选裂缝候选？</h3><div id="w3comparison"></div><p>学习分支先放宽 Hough 搜索，再用其他合成图像的标注候选训练逻辑回归；几何基线保留原搜索规则。下表解释实际候选。</p><label for="w3cutoff">筛选分数阈值（探索） <b id="w3cutofflabel">0.50</b></label><input id="w3cutoff" type="range" min="20" max="80" step="5" value="50" style="width:100%;accent-color:#2f7d6b"><label for="w3candidate">选择候选路径</label><select id="w3candidate" style="display:block;width:100%;margin:8px 0;padding:7px"></select><div id="w3proof"></div><p id="w3training"></p>';
    wrap.insertBefore(learningBox,wrap.querySelector('#w3note'));
    var currentResult,candidateIndex=0;
    function evidence(res){
      var L=res.learning,options=L.candidates.map(function(d,i){return '<option value="'+i+'">'+(DEPTH0+d.y0*ROWM).toFixed(3)+' m · '+aToDip(d.A).toFixed(1)+'° · 分数 '+d.mlScore.toFixed(3)+'</option>';}).join('');
      root.querySelector('#w3candidate').innerHTML=options;
      candidateIndex=Math.min(candidateIndex,Math.max(0,L.candidates.length-1));root.querySelector('#w3candidate').value=candidateIndex;
      var d=L.candidates[candidateIndex];
      if(!d){root.querySelector('#w3proof').textContent='候选生成阶段没有找到路径；后续筛选无法补回遗漏。';return;}
      var e=d.proof;
      root.querySelector('#w3proof').innerHTML='<p><b>'+(L.dets.indexOf(d)>=0?'保留为候选':'未保留')+'</b> · 分数 '+e.score.toFixed(3)+'。还需满足深度间隔规则；分数不是校准正确率。</p><div style="overflow-x:auto"><table style="width:100%;font-size:11px;text-align:left"><thead><tr><th>路径特征</th><th>标准值</th><th>学得权重</th><th>实际贡献</th></tr></thead><tbody>'+LEARN_FEATURES.map(function(n,j){return '<tr><td>'+n+'</td><td>'+e.z[j].toFixed(2)+'</td><td>'+L.model.weights[j+1].toFixed(2)+'</td><td>'+e.terms[j].toFixed(2)+'</td></tr>';}).join('')+'</tbody></table></div><p>偏置 '+L.model.weights[0].toFixed(2)+' + 贡献 = '+e.logit.toFixed(2)+'，经 sigmoid 得到筛选分数。</p>';
      root.querySelector('#w3training').textContent='8 张标注训练图像，种子 '+L.model.seeds.join('、')+'；'+L.model.samples+' 个候选标签。当前图像不参与训练。阈值探索以当前真值事后评分，不作为独立泛化成绩；低倾角和未提出的路径仍可能漏检。';
    }

    var cv = root.querySelector('#w3cv');
    var ov = root.querySelector('#w3ov');
    var polar = root.querySelector('#w3polar');
    var note = root.querySelector('#w3note');

    function render() {
      var res = run(state);
      currentResult=res;
      root.querySelector('#w3comparison').textContent='Hough 基线：命中 '+res.mH.tp+'，误报 '+res.mH.fp+'，漏检 '+res.mH.fn+'；学习筛选：命中 '+res.mL.tp+'，误报 '+res.mL.fp+'，漏检 '+res.mL.fn+'。放宽搜索提出 '+res.learning.candidates.length+' 条候选，学习与间隔规则保留 '+res.detsML.length+' 条。';
      evidence(res);
      if(state.mode==='learn')res.dets=res.detsML;
      var selected=state.mode==='learn'?res.mL:res.mH;
      root.querySelectorAll('[data-w3-method]').forEach(function(b){b.setAttribute('aria-pressed',String(b.dataset.w3Method===state.mode));});
      root.querySelector('#w3methodlabel').textContent=state.mode==='learn'?'学习筛选命中':'Hough 基线命中';
      paintImage(cv, res.img);
      paintOverlay(ov, res, state.showTruth);
      paintPolar(polar, res);

      /* 检出清单：按深度排序，同时列出算法结果与真值，逐条可核对 */
      var rows = res.dets.slice().sort(function (a, b) { return a.y0 - b.y0; });
      var tb = '<table><thead><tr><th>深度 / m</th><th>倾角</th><th>倾向</th><th>真值倾角</th><th>Δ</th></tr></thead><tbody>';
      if (!rows.length) {
        tb += '</tbody></table><div class="none">本组参数下未检出任何正弦 —— 看下方说明判断是哪条失效边界。</div>';
      } else {
        rows.forEach(function (d) {
          /* 找最近的真值缝，算倾角偏差 */
          var near = null, best = 1e9;
          res.truth.forEach(function (t) {
            var dd = Math.abs(t.y0 - d.y0);
            if (dd < best) { best = dd; near = t; }
          });
          var ok = near && best <= 14;
          var dl = ok ? Math.abs(aToDip(d.A) - near.dip) : null;
          tb += '<tr><td>' + (DEPTH0 + d.y0 * ROWM).toFixed(1) + '</td>' +
            '<td class="k">' + aToDip(d.A).toFixed(1) + '°</td>' +
            '<td class="k">' + d.az.toFixed(0) + '°</td>' +
            '<td><small>' + (ok ? near.dip.toFixed(0) + '°' : '无对应') + '</small></td>' +
            '<td><small>' + (ok ? dl.toFixed(1) + '°' : '—') + '</small></td></tr>';
        });
        tb += '</tbody></table>';
      }
      root.querySelector('#w3tbl').innerHTML = tb;

      var n = res.truth.length;
      root.querySelector('#w3v1').textContent = n + ' 条';
      root.querySelector('#w3v2').innerHTML = selected.tp + ' / ' + n +
        (selected.fp ? '<small>误检 ' + selected.fp + '</small>' : '<small>无空报</small>');
      root.querySelector('#w3v3').innerHTML = res.mN.fp + ' 条' +
        '<small>阈值 ' + res.mN.tp + '/' + n + '</small>';
      root.querySelector('#w3v4').textContent = selected.tp ? selected.dipErr.toFixed(1) + '°' : '—';

      /* 提示随状态变化：每一条都对应一个真实的失效边界，不是通用广告词 */
      note.className='w3-note'+(selected.fn||selected.fp?' warn':'');
      note.innerHTML='<b>当前显示'+(state.mode==='learn'?'监督学习筛选':'Hough 几何基线')+'：</b>命中 '+selected.tp+'，误报 '+selected.fp+'，漏检 '+selected.fn+'。学习分支的筛选阈值为 '+state.cutoff.toFixed(2)+'，模型来自其他合成图像的标注候选。候选更少时也要检查漏检；当前图像的真值只用于事后评价。低倾角、弱响应或搜索范围以外的路径仍需人工核查。';
    }

    function bind(id, key, fmt, mul) {
      var inp = root.querySelector(id);
      inp.addEventListener('input', function () {
        state[key] = mul ? Number(inp.value) : Number(inp.value);
        if (fmt) fmt(Number(inp.value));
        render();
      });
    }
    bind('#w3sd', 'dip', function (v) { root.querySelector('#w3ld').textContent = v + '°'; });
    bind('#w3sa', 'azim', function (v) { root.querySelector('#w3la').textContent = v + '°'; });
    bind('#w3sp', 'aper', function (v) { root.querySelector('#w3lp').textContent = v + ' px'; });
    bind('#w3sn', 'noise', function (v) { root.querySelector('#w3ln').textContent = v; });
    bind('#w3sf', 'nf', function (v) { root.querySelector('#w3lf').textContent = v; });
    root.querySelector('#w3si').addEventListener('change', function (e) {
      state.induced = e.target.checked;
      render();
    });

    root.querySelectorAll('[data-w3-method]').forEach(function(b){b.addEventListener('click',function(){state.mode=b.dataset.w3Method;render();});});
    root.querySelector('#w3cutoff').addEventListener('input',function(e){state.cutoff=+e.target.value/100;root.querySelector('#w3cutofflabel').textContent=state.cutoff.toFixed(2);render();});
    root.querySelector('#w3candidate').addEventListener('change',function(e){candidateIndex=+e.target.value;evidence(currentResult);});

    render();
  }

  if (typeof window !== 'undefined') {
    window.W3DEMO = mount;
    window.__CASE_MOUNT__ = mount;
  }
})();
