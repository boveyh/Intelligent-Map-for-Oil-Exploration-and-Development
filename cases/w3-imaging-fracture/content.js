/* =========================================================
   w3 · 成像测井裂缝识别 —— 案例正文（单一源）
   ---------------------------------------------------------
   所有指标由 tools/test-w3.js 实测产出，不手填。
   tools/build-case.js 序列化成插件 + 上传包两份产物。
   ========================================================= */

module.exports = function (K) {

  /* ---------------- 图 1：圆柱面 → 展开图上的正弦 ---------------- */
  function figGeometry() {
    var W = 640, H = 312;
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="倾斜裂缝面与井壁相交，展开后成为正弦曲线">';

    /* ---------- 左：井筒与交线 ---------- */
    s += '<text x="14" y="18" font-size="10.5" font-weight="600" fill="#242b2e">① 井壁是圆柱面</text>';
    var cx = 112, rx = 48, tY = 52, bY = 226, ery = 10;
    s += '<path d="M' + (cx - rx) + ' ' + tY + ' L' + (cx - rx) + ' ' + bY +
      ' A' + rx + ' ' + ery + ' 0 0 0 ' + (cx + rx) + ' ' + bY +
      ' L' + (cx + rx) + ' ' + tY + ' Z" fill="#fbfaf5" stroke="#c9c2b0"/>';
    s += '<ellipse cx="' + cx + '" cy="' + tY + '" rx="' + rx + '" ry="' + ery + '" fill="#f4f1e8" stroke="#c9c2b0"/>';
    /* 井轴 */
    s += '<line x1="' + cx + '" y1="' + (tY + 2) + '" x2="' + cx + '" y2="' + (bY - 2) + '" stroke="#c9c2b0" stroke-dasharray="3 4"/>';
    /* 交线：一个完整椭圆（绕井壁一周） */
    s += '<ellipse cx="' + cx + '" cy="140" rx="' + rx + '" ry="26" fill="none" stroke="#b26a39" stroke-width="2.4"/>';
    s += '<path d="M' + (cx - rx) + ' 140 A' + rx + ' 26 0 0 0 ' + (cx + rx) + ' 140" fill="none" stroke="#b26a39" stroke-width="1" stroke-dasharray="3 3" stroke-opacity=".45"/>';
    /* 标注 */
    s += '<line x1="16" y1="126" x2="58" y2="132" stroke="#b26a39" stroke-width=".9" stroke-opacity=".6"/>';
    s += '<text x="14" y="122" font-size="9.5" fill="#b26a39">裂缝面</text>';
    s += '<text x="14" y="134" font-size="9.5" fill="#b26a39">与井壁交线</text>';
    s += '<text x="' + cx + '" y="' + (bY + 24) + '" font-size="9.5" fill="#79828a" text-anchor="middle">井眼直径 D，交线绕一周</text>';

    /* ---------- 箭头 ---------- */
    s += '<path d="M204 140h30" stroke="#2f7d6b" stroke-width="1.4" fill="none"/>';
    s += '<path d="M230 135.5l5.5 4.5-5.5 4.5" stroke="#2f7d6b" stroke-width="1.4" fill="none"/>';
    s += '<text x="219" y="126" font-size="9.5" fill="#2f7d6b" text-anchor="middle">展开</text>';

    /* ---------- 右：展开图 ---------- */
    s += '<text x="250" y="18" font-size="10.5" font-weight="600" fill="#242b2e">② 沿母线剪开摊平 → 交线必然是正弦</text>';
    var x0 = 254, x1 = 588, yA = 44, yB = 226;
    var y0 = 135, A = 30;

    s += '<rect x="' + x0 + '" y="' + yA + '" width="' + (x1 - x0) + '" height="' + (yB - yA) + '" fill="#fbfaf5" stroke="#e9e4d8"/>';
    [1, 2, 3].forEach(function (k) {
      var xx = x0 + k / 4 * (x1 - x0);
      s += '<line x1="' + xx + '" y1="' + yA + '" x2="' + xx + '" y2="' + yB + '" stroke="#eeeae0"/>';
    });
    [0.25, 0.5, 0.75].forEach(function (k) {
      s += '<line x1="' + x0 + '" y1="' + (yA + k * (yB - yA)) + '" x2="' + x1 + '" y2="' + (yA + k * (yB - yA)) + '" stroke="#eeeae0"/>';
    });

    /* 正弦 */
    var pts = [];
    for (var i = 0; i <= 120; i++) {
      var xx2 = x0 + i / 120 * (x1 - x0);
      var yy2 = y0 - A * Math.cos(2 * Math.PI * (xx2 - x0) / (x1 - x0));
      pts.push(xx2.toFixed(1) + ',' + yy2.toFixed(1));
    }
    s += '<polyline points="' + pts.join(' ') + '" fill="none" stroke="#b26a39" stroke-width="2.4" stroke-linejoin="round"/>';

    /* 方位刻度 */
    [0, 1, 2, 3, 4].forEach(function (k) {
      var xx = x0 + k / 4 * (x1 - x0);
      var hi = k === 2;
      s += '<line x1="' + xx + '" y1="' + yB + '" x2="' + xx + '" y2="' + (yB + 4) + '" stroke="#c9c2b0"/>';
      s += '<text x="' + xx + '" y="' + (yB + 16) + '" font-size="9.5" font-family="monospace" fill="' + (hi ? '#b26a39' : '#9ba3a9') + '" text-anchor="middle"' + (hi ? ' font-weight="600"' : '') + '>' + (k * 90) + '°</text>';
    });
    s += '<text x="' + ((x0 + x1) / 2) + '" y="' + (yB + 31) + '" font-size="9.5" fill="#79828a" text-anchor="middle">方位角（绕井壁 360°）</text>';

    /* 深度轴 */
    var xd = x1 + 16;
    s += '<path d="M' + xd + ' ' + (yA + 2) + 'v' + (yB - yA - 6) + '" stroke="#c9c2b0" fill="none"/>';
    s += '<path d="M' + (xd - 3.5) + ' ' + (yB - 8) + 'l3.5 5 3.5-5" stroke="#c9c2b0" fill="none"/>';
    s += '<text x="' + (xd + 8) + '" y="' + ((yA + yB) / 2) + '" font-size="9.5" fill="#79828a" text-anchor="middle" transform="rotate(-90 ' + (xd + 8) + ' ' + ((yA + yB) / 2) + ')">深度</text>';

    /* 峰谷差 */
    var xr = x1 - 54;
    s += '<line x1="' + x0 + '" y1="' + (y0 - A) + '" x2="' + xr + '" y2="' + (y0 - A) + '" stroke="#b26a39" stroke-dasharray="3 3" stroke-opacity=".5"/>';
    s += '<line x1="' + (x0 + (x1 - x0) / 2) + '" y1="' + (y0 + A) + '" x2="' + xr + '" y2="' + (y0 + A) + '" stroke="#b26a39" stroke-dasharray="3 3" stroke-opacity=".5"/>';
    s += '<line x1="' + xr + '" y1="' + (y0 - A) + '" x2="' + xr + '" y2="' + (y0 + A) + '" stroke="#b26a39" stroke-width="1.1"/>';
    s += '<path d="M' + (xr - 3.5) + ' ' + (y0 - A + 5) + 'l3.5-5 3.5 5" stroke="#b26a39" stroke-width="1.1" fill="none"/>';
    s += '<path d="M' + (xr - 3.5) + ' ' + (y0 + A - 5) + 'l3.5 5 3.5-5" stroke="#b26a39" stroke-width="1.1" fill="none"/>';
    s += '<text x="' + (xr + 6) + '" y="' + (y0 - 2) + '" font-size="9.5" fill="#b26a39">峰谷差</text>';
    s += '<text x="' + (xr + 6) + '" y="' + (y0 + 11) + '" font-size="9.5" font-family="monospace" fill="#b26a39">= D·tanθ</text>';

    /* 相位 */
    var xT = x0 + (x1 - x0) / 2;
    s += '<circle cx="' + xT + '" cy="' + (y0 + A) + '" r="3.4" fill="#b26a39"/>';
    s += '<line x1="' + xT + '" y1="' + (y0 + A + 4) + '" x2="' + xT + '" y2="' + yB + '" stroke="#b26a39" stroke-dasharray="3 3" stroke-opacity=".55"/>';
    s += '<text x="' + (xT + 8) + '" y="' + (y0 + A - 7) + '" font-size="9.5" fill="#b26a39">最低点方位 = 倾向 α</text>';

    /* ---------- 公式条 ---------- */
    s += '<rect x="14" y="262" width="' + (W - 28) + '" height="40" rx="6" fill="#f4f1e8"/>';
    s += '<text x="26" y="279" font-size="10" font-family="monospace" fill="#5d666d">y(α) = y₀ + A·sin(α + φ)        A = (D/2)·tanθ</text>';
    s += '<text x="26" y="294" font-size="9.5" fill="#79828a">振幅只由倾角决定，相位只由倾向决定 —— 两个量互不干扰，这是能可靠反算的前提。</text>';
    s += '</svg>';
    return s;
  }

  /* ---------------- 图 2：三种高导异常的形态 ---------------- */
  function figMorph() {
    var W = 640, H = 264;
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="层理、天然裂缝、诱导缝在同一幅展开图上的形态差异">';

    var PW = 182, PH = 150, PY = 36;
    var xs = [16, 229, 442];

    function frame(x, name, tag, tagC) {
      var g = '';
      g += '<rect x="' + x + '" y="' + PY + '" width="' + PW + '" height="' + PH + '" fill="#f7f5ee" stroke="#ddd6c6"/>';
      [1, 2, 3].forEach(function (k) {
        g += '<line x1="' + (x + k * PW / 4) + '" y1="' + PY + '" x2="' + (x + k * PW / 4) + '" y2="' + (PY + PH) + '" stroke="#e8e2d3"/>';
      });
      g += '<text x="' + x + '" y="' + (PY - 8) + '" font-size="10.5" font-weight="600" fill="#242b2e">' + name + '</text>';
      g += '<text x="' + (x + PW) + '" y="' + (PY - 8) + '" font-size="9" fill="' + tagC + '" text-anchor="end">' + tag + '</text>';
      return g;
    }
    /* 展开图上的一条正弦迹线，跨满整幅（周期 = 井壁一周） */
    function trace(x, cy, amp, phase, wid, op) {
      var p = [];
      for (var i = 0; i <= 64; i++) {
        var xx = x + i / 64 * PW;
        var yy = cy + amp * Math.sin(2 * Math.PI * i / 64 + phase);
        p.push(xx.toFixed(1) + ',' + yy.toFixed(1));
      }
      return '<polyline points="' + p.join(' ') + '" fill="none" stroke="#3a3a3a" stroke-width="' + wid + '" stroke-opacity="' + op + '" stroke-linejoin="round"/>';
    }

    /* A · 层理：平行的近水平线，振幅 1—2 px */
    s += frame(xs[0], '层理', '振幅 1—2 px', '#2f7d6b');
    for (var k = 0; k < 7; k++) {
      s += trace(xs[0], PY + 16 + k * 20, 1.5, -Math.PI / 2, 1.5, .78);
    }

    /* B · 天然裂缝：单条大振幅正弦 */
    s += frame(xs[1], '天然裂缝', '振幅 = D/2·tanθ', '#b26a39');
    s += trace(xs[1], PY + 22, 1.3, -Math.PI / 2, 1.2, .34);
    s += trace(xs[1], PY + 128, 1.3, -Math.PI / 2, 1.2, .34);
    s += trace(xs[1], PY + PH / 2, 34, -Math.PI / 2, 1.9, .9);
    /* A 标注：带箭头的尺寸线 */
    var xb = xs[1] + 26;
    s += '<line x1="' + xb + '" y1="' + (PY + PH / 2 - 34) + '" x2="' + xb + '" y2="' + (PY + PH / 2 + 34) + '" stroke="#b26a39" stroke-width="1"/>';
    s += '<path d="M' + (xb - 3.2) + ' ' + (PY + PH / 2 - 29) + 'l3.2-4.5 3.2 4.5" stroke="#b26a39" stroke-width="1" fill="none"/>';
    s += '<path d="M' + (xb - 3.2) + ' ' + (PY + PH / 2 + 29) + 'l3.2 4.5 3.2-4.5" stroke="#b26a39" stroke-width="1" fill="none"/>';
    s += '<text x="' + (xb + 6) + '" y="' + (PY + PH / 2 + 3) + '" font-size="9" fill="#b26a39">2A</text>';

    /* C · 诱导缝：沿井轴的直线 */
    s += frame(xs[2], '诱导缝', '振幅 ≈ 0', '#7e5a8d');
    s += '<line x1="' + (xs[2] + 54) + '" y1="' + (PY + 3) + '" x2="' + (xs[2] + 54) + '" y2="' + (PY + PH - 3) + '" stroke="#3a3a3a" stroke-width="1.9" stroke-opacity=".82"/>';
    s += '<line x1="' + (xs[2] + 126) + '" y1="' + (PY + 3) + '" x2="' + (xs[2] + 126) + '" y2="' + (PY + PH - 3) + '" stroke="#3a3a3a" stroke-width="1.9" stroke-opacity=".82"/>';
    s += '<line x1="' + (xs[2] + 90) + '" y1="' + (PY + 34) + '" x2="' + (xs[2] + 90) + '" y2="' + (PY + PH - 34) + '" stroke="#3a3a3a" stroke-width="1.1" stroke-opacity=".3"/>';

    /* 判语 */
    var verdicts = [
      ['不可分', '与低角度缝重叠', '#2f7d6b'],
      ['可检出', '形状唯一，产状可算', '#b26a39'],
      ['形状排除', '垮塌崩落与它同形', '#7e5a8d']
    ];
    verdicts.forEach(function (v, i) {
      s += '<text x="' + xs[i] + '" y="' + (PY + PH + 19) + '" font-size="10.5" font-weight="600" fill="' + v[2] + '">' + v[0] + '</text>';
      s += '<text x="' + xs[i] + '" y="' + (PY + PH + 34) + '" font-size="9.5" fill="#79828a">' + v[1] + '</text>';
    });

    s += '<text x="16" y="' + (H - 8) + '" font-size="9.5" fill="#79828a">三者都是高导异常、在图上都呈深色。颜色一样，只有形状不同 —— 所以判据必须建在形状上。</text>';
    s += '</svg>';
    return s;
  }

  /* ---------------- 图 3：两条失效边界（实测曲线） ---------------- */
  function figLimit() {
    var W = 640, H = 274;
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="检出率随开度与倾角变化的实测曲线">';

    function chart(ox, title, xlab, xmin, xmax, pts, shadeTo, shadeTxt, tickFmt) {
      var x0 = ox + 44, x1 = ox + 268, y0 = 44, y1 = 190;
      var X = function (v) { return x0 + (v - xmin) / (xmax - xmin) * (x1 - x0); };
      var Y = function (p) { return y1 - p / 100 * (y1 - y0); };
      var g = '';
      g += '<text x="' + ox + '" y="26" font-size="10.5" font-weight="600" fill="#242b2e">' + title + '</text>';

      /* 失效区阴影：标签竖排，带再窄也放得下 */
      if (shadeTo != null) {
        var bx = (X(xmin) + X(shadeTo)) / 2, by = (y0 + y1) / 2;
        g += '<rect x="' + X(xmin) + '" y="' + y0 + '" width="' + (X(shadeTo) - X(xmin)) + '" height="' + (y1 - y0) + '" fill="#b26a39" fill-opacity=".07"/>';
        g += '<text x="' + bx + '" y="' + by + '" font-size="8.5" fill="#b26a39" text-anchor="middle" transform="rotate(-90 ' + bx + ' ' + by + ')">' + shadeTxt + '</text>';
      }
      /* 网格与刻度 */
      [0, 50, 100].forEach(function (p) {
        g += '<line x1="' + x0 + '" y1="' + Y(p) + '" x2="' + x1 + '" y2="' + Y(p) + '" stroke="#eeeae0"/>';
        g += '<text x="' + (x0 - 8) + '" y="' + (Y(p) + 3.5) + '" font-size="9" font-family="monospace" fill="#9ba3a9" text-anchor="end">' + p + '%</text>';
      });
      g += '<line x1="' + x0 + '" y1="' + y1 + '" x2="' + x1 + '" y2="' + y1 + '" stroke="#c9c2b0"/>';

      /* 曲线 */
      var pp = pts.map(function (d) { return X(d[0]).toFixed(1) + ',' + Y(d[1]).toFixed(1); });
      g += '<polyline points="' + pp.join(' ') + '" fill="none" stroke="#2f7d6b" stroke-width="2" stroke-linejoin="round"/>';
      pts.forEach(function (d) {
        g += '<circle cx="' + X(d[0]) + '" cy="' + Y(d[1]) + '" r="2.4" fill="#2f7d6b"/>';
      });

      /* x 刻度 */
      tickFmt.forEach(function (v) {
        g += '<text x="' + X(v) + '" y="' + (y1 + 15) + '" font-size="9" font-family="monospace" fill="#9ba3a9" text-anchor="middle">' + v + '</text>';
      });
      g += '<text x="' + ((x0 + x1) / 2) + '" y="' + (y1 + 32) + '" font-size="9.5" fill="#79828a" text-anchor="middle">' + xlab + '</text>';
      return g;
    }

    s += chart(8, 'a · 开度 → 检出率（倾角 40° 固定）', '开度 / px', 1, 8,
      [[1, 10], [1.5, 55], [2, 83], [2.5, 85], [3, 95], [4, 98], [5, 100], [6, 100], [8, 100]],
      2, '亚分辨率', [1, 2, 3, 4, 5, 6, 7, 8]);

    s += chart(324, 'b · 倾角 → 检出率（开度 3 px）', '倾角 / °', 12, 75,
      [[12, 0], [15, 0], [18, 35], [20, 48], [24, 60], [28, 78], [35, 80], [45, 95], [60, 100], [75, 100]],
      20, '层理区', [12, 30, 45, 60, 75]);

    /* 分隔 */
    s += '<line x1="312" y1="34" x2="312" y2="196" stroke="#e9e4d8" stroke-dasharray="3 4"/>';

    s += '<text x="8" y="' + (H - 26) + '" font-size="9.5" fill="#5d666d">两条边界不是调参调出来的，是<tspan font-weight="600" fill="#b26a39">物理下限</tspan>：开度 1 px 时对比度只剩几个灰度级，检出率掉到 10%；</text>';
    s += '<text x="8" y="' + (H - 11) + '" font-size="9.5" fill="#5d666d">倾角 20° 时正弦振幅与层理重叠，检出率 48%，15° 以下为 0。这两个区域内算法该输出"不可判"，而不是硬给一个数。<tspan fill="#9ba3a9">（每组 40 个种子）</tspan></text>';
    s += '</svg>';
    return s;
  }

  /* ---------------- 数据清单 ---------------- */
  return {
    id:'w3-imaging-fracture',sceneId:'w3',title:'成像测井裂缝识别',summary:'几何搜索提出路径，再用已标注样本学习筛选；比较保留、误报与漏检',status:'ready',version:'1.1.0',updated:'2026-11-01',methods:['cv'],demoGlobal:'W3DEMO',
    tabs:{
      background:{label:'专业背景',lede:'井壁展开图中的裂缝、层理和诱导条带可能相似。本例先按几何关系提出路径，再用其他图像中已标注的候选训练筛选器，给解释员一份可追查依据的裂缝候选。',judge:[
        {label:'任务类型',value:'候选检测与分类',desc:'Hough + 监督逻辑回归'},
        {label:'训练材料',value:'8 张合成标注图',desc:'与测试图种子分离'},
      {label:'合成验证',value:'误报 10 → 5，漏检 8 → 13',desc:'20 张留出图，学习筛选的取舍'},
        {label:'难度',value:'高',desc:'候选遗漏与图像条件失配'}
      ],sections:[
        {no:1,en:'TASK',title:'从井壁纹理提出可复核的路径',html:'<p>井壁展开后，斜交圆柱面的平面可表现为正弦轨迹。路径的振幅与相位提供产状候选；形状相近不代表一定是天然或有效裂缝。</p>'+K.figure(figGeometry(),1,'圆柱井壁与展开图的简化几何关系。该图解释参数含义；演示数据为合成灰度图，不是现场测量。')},
        {no:2,en:'LEARNING',title:'哪些判断由样本学习得到',html:'<p>Hough 是几何候选生成器。新增分支从 8 张独立合成训练图的候选中读取标注，学习四种路径响应的组合：平均显著度、覆盖比例、路径与邻域反差、最弱四分位。训练标准化参数和逻辑回归权重均由训练候选得到。</p><p>测试时只读灰度图与候选路径，不读取当前真值。解释面板列出当前候选的真实特征、学得权重和分数贡献。</p>'+K.figure(figMorph(),2,'传统几何线索说明：不同纹理可能产生候选或干扰。图中的基线说明不代表学习分支已经取得相同成绩。')},
        {no:3,en:'DATA',title:'训练、候选与测试分别是什么',html:K.checklist([['训练图像','固定 8 个种子的合成图','候选按标注深度与倾角匹配得到二分类标签'],['模型输入','四个路径响应特征','无测试真值，也不由概念模型图推理'],['当前测试图','独立合成参数与种子','真值只作事后匹配与误差评价']])+'<p>学习分支使用放宽的候选池；Hough 对照保留原本严格搜索规则。比较时同时说明候选来源、筛选阈值和漏检，不能仅用保留条数声称更准确。</p>'},
        {no:4,en:'REVIEW',title:'模型输出怎样支持解释复核',html:'<p>被保留的路径可回到井壁图上，解释员核对连续性、产状和原始测量条件；未保留候选可查看分数与各项贡献。提高筛选阈值可能减少误报，也可能增加漏检。</p>'+K.callout('**候选阶段漏掉的裂缝，后续分类器无法补回。** 低倾角、弱响应及真实图像泛化仍需独立验证；不把几何反算等同于裂缝有效性评价。')}
      ]},
      workflow:{label:'案例流程',title:'案例：合成井壁图像的候选生成、学习筛选与复核',lead:['8 张带标注图像用于拟合筛选器；当前图像独立生成。学习模型处理的是路径响应特征，不是训练好的卷积网络。','两种方法在同一测试图上统计命中、误报和漏检。Hough 对照与学习分支的候选规则不同，会同时说明；后者不保证优于前者。'],stats:[['输入图像','200 × 120',true],['训练图像','8 张',true],['学习特征','4 个路径响应'],['方法','逻辑回归筛选'],['对照','Hough 几何基线'],['输出','路径与产状候选']],steps:[
        {name:'整理训练标注',role:'数据',do:'在独立合成训练图上运行候选生成；按标注深度和倾角判定哪些候选与裂缝匹配。',effect:'标签明确进入训练过程',trap:'合成标注标准不等于真实解释员的一致性'},
        {name:'学习组合判据',role:'智能介入',do:'提取四个路径特征，由训练统计量标准化，拟合正类加权的逻辑回归。',effect:'学得响应组合及其权重',trap:'加权训练分数未校准为正确概率'},
        {name:'提出测试候选',role:'几何',do:'对当前图像计算显著度并放宽 Hough 搜索，形成有限候选池。严格 Hough 作为单独对照。',effect:'保留一定弱响应路径供筛选器判断',trap:'搜索范围与候选上限可能提前漏掉裂缝'},
        {name:'模型筛选与间隔约束',role:'推理',do:'逐条计算学习分数，按阈值及 22 行最小深度间隔保留；显示被保留和被拒绝的实际贡献。',effect:'从候选池形成可复核清单',trap:'减少条数不自动意味着更高准确率'},
        {name:'同图评价并复核',role:'闭环',do:'用事后真值一一匹配深度与倾角，分别统计误报漏检；点击候选追查输入与权重。',effect:'解释清楚结果改变在哪里',trap:'在当前真值上调阈值属于探索，不能把最优分数当独立测试成绩'}
      ],metrics:{title:'同时报告保留、命中、误报与漏检',html:'<p>演示实时显示当前图像结果。另在模型与默认阈值固定后，对种子 20001 起、间隔 19 的 20 张独立合成图检验，共 60 条标注裂缝：Hough 命中 52、误报 10、漏检 8，汇总 F1 为 0.852；学习分支命中 47、误报 5、漏检 13，F1 为 0.839。</p><p><b>学习筛选减少了误报，也增加了漏检，此处整体 F1 略降。</b>完整结果保留在留出记录中，不只展示默认成功图。倾角和方位误差仅在匹配成功的路径上计算，不能掩盖漏检。</p>'},fails:[
        {name:'候选生成遗漏',why:'当前振幅搜索下限、候选上限和间隔规则限制可检出的路径；学习筛选无法生成未出现的候选。'},
        {name:'弱缝或强噪声',why:'路径响应与背景接近时，模型可能同时拒绝真实裂缝；需要查看漏检而非只看误报减少。'},
        {name:'标注与测试条件变化',why:'模型只见过固定合成条件，换噪声、纹理或真实图像后必须重新验证。'},
        {name:'把分数当作结论',why:'筛选分数不是校准置信度，产状候选也不等于有效流动通道或压裂建议。'}
      ]},
      demo:{label:'可运行示范',intro:'切换 Hough 基线与学习筛选，对照同图命中、误报和漏检；选择候选查看实际特征与贡献，再调筛选阈值、倾角或噪声观察取舍。图像为合成展开图，学习分数未校准。',height:1250}
    }
  };
};
