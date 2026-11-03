/* =========================================================
   w2 · 储层参数智能解释 —— 案例正文（单一源）
   ---------------------------------------------------------
   这个文件只描述"内容"，不描述"版式"：所有版式都走 K 工具箱。
   tools/build-case.js 会把它序列化成两份产物：
     · dist/w2-reservoir-param/case.json   （上传包，HTML 已是最终字符串）
     · site/assets/cases/w2-reservoir-param.case.js（插件）
   ========================================================= */

module.exports = function (K) {

  /* ---------------- 图 1：φ 的三条物理路径 ---------------- */
  function figPaths() {
    var rows = [
      {
        c: '#2f7d6b', bg: '#e6f1ec',
        name: 'DEN 密度测井',
        f: 'φ_D = (ρma − ρb) / (ρma − ρf)',
        bad: '失效：高泥质、含气、重矿物'
      },
      {
        c: '#41699b', bg: '#e7eef9',
        name: 'CNL 中子测井',
        f: 'φ_N ≈ CNL（需岩性校正）',
        bad: '失效：气层挖掘效应、石膏地层'
      },
      {
        c: '#7e5a8d', bg: '#efe9f4',
        name: 'NMR 核磁测井',
        f: 'φ_NMR = ∫ 弛豫谱（T2 截断）',
        bad: '失效：井眼差、含烃校正不准'
      }
    ];
    var s = '<svg viewBox="0 0 620 268" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="孔隙度的三条测井求法与各自的失效条件">';
    var x = 14, w = 400, h = 56;
    rows.forEach(function (r, i) {
      var y = 24 + i * 74;
      s += '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="8" fill="' + r.bg + '" stroke="' + r.c + '" stroke-opacity=".3"/>';
      s += '<rect x="' + x + '" y="' + y + '" width="3" height="' + h + '" rx="1.5" fill="' + r.c + '"/>';
      s += '<text x="' + (x + 14) + '" y="' + (y + 20) + '" font-size="11.5" font-weight="600" fill="#242b2e">' + r.name + '</text>';
      s += '<text x="' + (x + 130) + '" y="' + (y + 20) + '" font-size="9.5" font-family="monospace" fill="' + r.c + '">' + r.f + '</text>';
      s += '<text x="' + (x + 14) + '" y="' + (y + 41) + '" font-size="9.5" fill="#b26a39">' + r.bad + '</text>';
      s += '<path d="M' + (x + w + 2) + ' ' + (y + h / 2) + 'h30" stroke="' + r.c + '" stroke-opacity=".45" stroke-width="1.2" fill="none"/>';
      s += '<path d="M' + (x + w + 28) + ' ' + (y + h / 2 - 3.5) + 'l4 3.5-4 3.5" stroke="' + r.c + '" stroke-opacity=".45" stroke-width="1.2" fill="none"/>';
    });

    /* 目标节点：跨三行，三支箭头都能落在它身上 */
    var gy = 24, gh = 204, gw = 160;
    s += '<rect x="450" y="' + gy + '" width="' + gw + '" height="' + gh + '" rx="10" fill="#fdfcf9" stroke="#2f7d6b" stroke-opacity=".45"/>';
    s += '<text x="' + (450 + gw / 2) + '" y="' + (gy + 76) + '" text-anchor="middle" font-size="13" font-weight="600" fill="#2f7d6b">φ 有效孔隙度</text>';
    s += '<text x="' + (450 + gw / 2) + '" y="' + (gy + 96) + '" text-anchor="middle" font-size="9.5" fill="#5d666d">储层评价的第一参数</text>';
    s += '<text x="' + (450 + gw / 2) + '" y="' + (gy + 118) + '" text-anchor="middle" font-size="9.5" font-family="monospace" fill="#9ba3a9">φ → Sw → K → 储量</text>';
    s += '<text x="' + (450 + gw / 2) + '" y="' + (gy + 152) + '" text-anchor="middle" font-size="9.5" fill="#9ba3a9">三条路都要先知道</text>';
    s += '<text x="' + (450 + gw / 2) + '" y="' + (gy + 166) + '" text-anchor="middle" font-size="9.5" fill="#9ba3a9">一个骨架参数</text>';

    s += '<text x="14" y="248" font-size="9.5" fill="#79828a">骨架参数（ρma / 岩性 / 含烃校正）恰是地下最不确定的东西 —— 这就是为什么需要从数据里学它，而不是从手册里查它。</text>';
    s += '</svg>';
    return s;
  }

  /* ---------------- 图 2：真实关系 vs 密度公式直线 ---------------- */
  function figGap() {
    var W = 620, H = 292;
    var x0 = 66, x1 = 552, y0 = 46, y1 = 206;
    var vmin = -0.02, vmax = 0.35;
    var px = function (v) { return x0 + v * (x1 - x0); };
    var py = function (v) { return y1 - (v - vmin) / (vmax - vmin) * (y1 - y0); };

    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="真实孔隙度与密度公式估计随泥质含量变化的偏差">';

    /* 网格 */
    [0, 0.1, 0.2, 0.3].forEach(function (v) {
      s += '<line x1="' + x0 + '" y1="' + py(v) + '" x2="' + x1 + '" y2="' + py(v) + '" stroke="#eeeae0"/>';
      s += '<text x="' + (x0 - 10) + '" y="' + (py(v) + 3.5) + '" font-size="9.5" font-family="monospace" fill="#9ba3a9" text-anchor="end">' + v.toFixed(1) + '</text>';
    });
    [0, 0.25, 0.5, 0.75, 1].forEach(function (v) {
      s += '<text x="' + px(v) + '" y="' + (y1 + 17) + '" font-size="9.5" font-family="monospace" fill="#9ba3a9" text-anchor="middle">' + v.toFixed(2) + '</text>';
    });
    s += '<line x1="' + x0 + '" y1="' + py(0) + '" x2="' + x1 + '" y2="' + py(0) + '" stroke="#c9c2b0"/>';

    /* 偏差带 */
    var band = 'M' + px(0.08) + ' ' + py(0.30 - 0.24 * 0.08);
    for (var i = 1; i <= 23; i++) { var v = 0.08 + i / 24 * 0.92; band += ' L' + px(v) + ' ' + py(0.30 - 0.24 * v); }
    for (var j = 23; j >= 0; j--) { var w = 0.08 + j / 24 * 0.92; band += ' L' + px(w) + ' ' + py(0.30 - 0.3127 * w); }
    s += '<path d="' + band + ' Z" fill="#b26a39" fill-opacity=".13"/>';

    /* 两条线 */
    s += '<line x1="' + px(0) + '" y1="' + py(0.30) + '" x2="' + px(1) + '" y2="' + py(0.06) + '" stroke="#2f7d6b" stroke-width="2.6"/>';
    s += '<line x1="' + px(0) + '" y1="' + py(0.30) + '" x2="' + px(1) + '" y2="' + py(-0.0127) + '" stroke="#b26a39" stroke-width="1.9" stroke-dasharray="6 3"/>';

    /* 角标图例（放在右上空白处） */
    s += '<line x1="' + (x1 - 148) + '" y1="' + (y0 + 6) + '" x2="' + (x1 - 124) + '" y2="' + (y0 + 6) + '" stroke="#2f7d6b" stroke-width="2.6"/>';
    s += '<text x="' + (x1 - 118) + '" y="' + (y0 + 9.5) + '" font-size="9.5" fill="#5d666d">真实 φ（岩心）</text>';
    s += '<line x1="' + (x1 - 148) + '" y1="' + (y0 + 24) + '" x2="' + (x1 - 124) + '" y2="' + (y0 + 24) + '" stroke="#b26a39" stroke-width="1.9" stroke-dasharray="5 3"/>';
    s += '<text x="' + (x1 - 118) + '" y="' + (y0 + 27.5) + '" font-size="9.5" fill="#5d666d">密度公式 φ_D</text>';

    /* 偏差说明：放在真实曲线上方的空白处 */
    s += '<text x="' + px(0.40) + '" y="' + (py(0.30 - 0.24 * 0.40) - 14) + '" font-size="10" fill="#b26a39">两线之间 = 公式的系统偏差，随泥质线性增大</text>';

    /* 轴标题 */
    s += '<text x="' + ((x0 + x1) / 2) + '" y="' + (y1 + 38) + '" font-size="10.5" fill="#5d666d" text-anchor="middle">泥质含量 Vsh</text>';
    s += '<text x="17" y="' + ((y0 + y1) / 2) + '" font-size="10.5" fill="#5d666d" transform="rotate(-90 17 ' + ((y0 + y1) / 2) + ')" text-anchor="middle">孔隙度 φ / v·v</text>';

    /* 负值说明 */
    s += '<text x="' + x1 + '" y="' + (H - 12) + '" font-size="9.5" fill="#b26a39" text-anchor="end">Vsh → 1 时公式算出负孔隙度，解释员只能手工截断到 0</text>';
    s += '</svg>';
    return s;
  }

  /* ---------------- 图 3：随机划分的信息泄漏 ---------------- */
  function figLeak() {
    var s = '<svg viewBox="0 0 620 272" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="按井划分与随机划分下训练测试点的分布对比">';

    function panel(ox, title, mode, subtitle) {
      var g = '';
      g += '<text x="' + ox + '" y="22" font-size="11.5" font-weight="600" fill="#242b2e">' + title + '</text>';
      var wellsX = [ox + 50, ox + 122, ox + 194];
      var yTop = 54, yBot = 186;
      wellsX.forEach(function (wx, wi) {
        g += '<line x1="' + wx + '" y1="' + yTop + '" x2="' + wx + '" y2="' + yBot + '" stroke="#e9e4d8"/>';
        for (var k = 0; k < 13; k++) {
          var yy = yTop + 4 + k * ((yBot - yTop - 8) / 12);
          var isTest = (mode === 'well') ? (wi === 2) : (((k + wi * 2) % 3) === 0);
          g += '<circle cx="' + wx + '" cy="' + yy + '" r="3.1" fill="' + (isTest ? '#2f7d6b' : '#cfc8b6') + '"/>';
        }
        g += '<text x="' + wx + '" y="' + (yBot + 15) + '" text-anchor="middle" font-size="9" fill="#9ba3a9">井' + (wi + 1) + '</text>';
      });
      if (mode === 'well') {
        g += '<rect x="' + (ox + 178) + '" y="' + (yTop - 6) + '" width="32" height="' + (yBot - yTop + 10) + '" rx="6" fill="none" stroke="#2f7d6b" stroke-dasharray="4 3" stroke-opacity=".7"/>';
        g += '<line x1="' + (ox + 211) + '" y1="120" x2="' + (ox + 216) + '" y2="120" stroke="#2f7d6b" stroke-opacity=".5"/>';
        g += '<text x="' + (ox + 220) + '" y="123" font-size="9" fill="#2f7d6b">整口井留出</text>';
      }
      g += '<text x="' + ox + '" y="' + (yBot + 50) + '" font-size="9.5" fill="#5d666d">' + subtitle + '</text>';
      return g;
    }

    s += panel(16, 'A · 按井划分', 'well', '测试井整口不参与 → 模型没见过这口井的刻度差');
    s += '<line x1="306" y1="12" x2="306" y2="236" stroke="#e9e4d8" stroke-dasharray="3 4"/>';
    s += panel(326, 'B · 随机划分', 'random', '同井相邻深度分属训练与测试 → 近邻就是"抄答案"');

    /* 图例：放在 B 的标题右侧，避开点列 */
    s += '<circle cx="430" cy="18" r="3.1" fill="#cfc8b6"/>';
    s += '<text x="438" y="21.5" font-size="9" fill="#9ba3a9">训练</text>';
    s += '<circle cx="466" cy="18" r="3.1" fill="#2f7d6b"/>';
    s += '<text x="474" y="21.5" font-size="9" fill="#9ba3a9">测试</text>';

    s += '<text x="16" y="258" font-size="9.5" fill="#79828a">同一批数据，只改划分方式：R² 从 0.913 变成 0.979，但后者过半的测试点，最近的训练点就在同井相邻深度上。</text>';
    s += '</svg>';
    return s;
  }

  /* ---------------- 数据清单（与 K.checklist 同结构，便于上传包渲染） ---------------- */
  var DATA = [
    ['常规测井曲线', 'DEN / GR / CNL（可选 RT、核磁），0.125 m 采样', '不需要逐点标注'],
    ['岩心分析孔隙度', '单井 50—200 个样点，8—15 口井', '作为标签'],
    ['岩心归位表', '岩心深度与测井深度对应关系', '深度误差 ≤0.2 m'],
    ['试油 / 生产数据', '层段产能与含水', '交叉验证，不作为标签'],
    ['区域沉积背景', '相带展布与岩性组合', '判断外推是否可信']
  ];

  return {

    id: 'w2-reservoir-param',
    sceneId: 'w2',
    title: '储层参数智能解释',
    summary: '同一留出井比较 KNN、DEN 单曲线回归和密度公式；简单方法也可能更好',
    status: 'ready',
    version: '1.0.0',
    updated: '2026-10-23',
    methods: ['ts', 'opt'],

    tabs: {
      background: {
        label: '专业背景',

        judge: [
          { label: '任务类型', value: 'KNN 回归', desc: '五近邻孔隙度均值', html: '<span style="color:var(--c-ts)">KNN 回归</span>' },
          { label: '数据门槛', value: '取心井 8—15 口', desc: '每井 50—200 个岩心样点' },
          { label: '收益', value: '3.7 → 1.5 p.u.', desc: '孔隙度 RMSE，相对密度公式', html: '<b style="color:var(--jade-d);font-family:var(--mono)">3.7→1.5</b>' },
          { label: '难度', value: '中', desc: '难在标签少、跨井泛化', html: K.dtag('中') }
        ],

        lede: '孔隙度、渗透率、饱和度是储层评价的三个核心参数，也是"这口井打不打、射哪一段"的依据。孔隙度看起来有现成公式可算，但公式里每个量都带着一个"你必须先知道"的假设 —— 而地下最不确定的恰恰是这些假设。',

        sections: [
          {
            no: 1, en: 'PROBLEM', title: '当前做法与问题',
            html: '<p>常规做法是<b>岩心刻度</b>：取心井做岩心分析得到真实孔隙度，再把它和密度、中子、声波曲线对上，建立一条回归线或直接用物理公式，然后向全区所有井外推。</p>' +
              '<p>问题在于孔隙度有三条独立的测井求法，每条都要求你先知道一个骨架参数。骨架是砂岩还是灰岩，密度差 0.05 g/cm³，孔隙度就差 3 个百分点；含一点气，密度测井会把它读成"更低的孔隙度"。<b>解释员的经验，本质上是在这些假设之间做选择</b> —— 而这个选择没有记录，也无法复现。</p>' +
              K.figure(figPaths(), 1, '三条求 φ 的物理路径，失效条件各不相同。**它们的分歧本身就是信息**：三条曲线对不上时，往往说明岩性或流体有异常 —— 学习法要学的正是这种"分歧模式"。')
          },
          {
            no: 2, en: 'INTERVENTION', title: 'AI 能做什么',
            html: '<p>当前演示使用<b>KNN 五近邻回归</b>：按训练集统计量标准化 DEN / GR / CNL，为测试点找五个曲线组合最相近的已标注样本，取其岩心孔隙度均值作为预测。它输出连续孔隙度，没有拟合神经网络，也没有实现不确定性区间。</p>' +
              '<p>它替换的是工序里的<b>"选公式 + 手工划定拟合区间"</b>这一步，不是解释员。人仍然决定用哪些井做标签、哪个层段的结果不能采信。</p>' +
              K.figure(figGap(), 2, '真实 φ 与 Vsh 的关系是一条斜线，而密度公式给出的斜率更陡 —— 泥质越多，公式低估越狠，Vsh→1 时会算出负孔隙度。学习法不是"更准的公式"，它拟合的是**这条曲线本身**，包括公式没有写进去的高阶项。') +
              K.callout('这条案例真正的技术门槛不在模型，而在**验证口径**。用随机划分，你会得到一个漂亮但无法交付的 R²；下面的示范可以让你亲手把这个假象拆开。')
          },
          {
            no: 3, en: 'DATA', title: '你需要准备什么',
            html: '<p style="margin-bottom:14px">这个场景的数据门槛比"分层"高，因为标签来自取心，取心井是稀缺资源。立项前先对着清单打勾。</p>' +
              K.checklist(DATA) +
              '<p style="margin-top:18px"><span class="kicker plain" style="color:var(--ink-4)">可参考的公开数据集</span></p>' +
              K.refs(['FORCE 2020（井曲线 + 岩性）', 'Kansas Geological Survey 公开测井库', 'NLOG 荷兰公开井数据'], null)
          },
          {
            no: 4, en: 'DIFFICULTY', title: '技术难度与参考方向',
            html: '<div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-bottom:2px">' +
              K.dtag('中') + '<span class="small muted">数据现成、任务定义清晰；难在取心样本少、井间刻度差与相带差异。</span></div>' +
              K.meter('中') +
              '<p>难点有三个：<b>标签少</b>（十几口取心井，几百个样点，却要覆盖整个区块的相带）；<b>井间刻度差</b>（不同年代仪器、不同测井公司，曲线本身就有系统偏差）；<b>外推风险</b>（模型在没见过的相带里会安静地给出错误答案，且不会报错）。</p>' +
              '<p>建议的验证顺序：先用密度公式作基线，确认学习法在<b>按井划分</b>下确实超过它；再看误差是否集中在某一类岩性；最后才谈上整个区块。</p>' +
              '<p style="margin-top:18px"><span class="kicker plain" style="color:var(--ink-4)">可借鉴的通用技术</span></p>' +
              K.refs(['深度回归', '按组划分验证', '不确定性估计', '迁移学习'], '#/method/ts') +
              '<p style="margin-top:18px" class="small muted">交叉环节：<a href="#/stage/welllog" style="color:var(--jade-d);font-weight:600">测井</a> · <a href="#/stage/geophys" style="color:var(--jade-d);font-weight:600">物探</a> · <a href="#/stage/completion" style="color:var(--jade-d);font-weight:600">完井</a></p>'
          }
        ]
      },

      workflow: {
        label: '案例流程',
        title: '案例：B 区块 12 口井的孔隙度重新解释',
        lead: [
          'B 区块有 12 口取心井、2640 个岩心孔隙度样点。原来的解释用密度公式 + 分段手工拟合，解释组自己也知道泥质段不准，但说不清"不准多少"。',
          '目标不是"训一个模型"，而是**把孔隙度 RMSE 从 3.7 压到 1.6 p.u. 以内，并且这个数必须在没有参与建模的井上成立**。下面五步里，第 1 步和第 4 步不涉及任何模型，却决定了最终数字是真是假。'
        ],
        stats: [
          ['取心井', '12', true], ['岩心样点', '2640', true],
          ['输入曲线', '3', true], ['目标 RMSE', '≤1.6 p.u.'],
          ['原方法 RMSE', '3.74 p.u.'], ['案例结果', '1.54 p.u.']
        ],
        steps: [
          {
            name: '岩心归位与深度校正', role: '工程环节',
            do: '把岩心分析深度与测井深度对齐：岩心筒取心存在 0.1—0.5 m 的深度漂移，用岩心照片与 GR 曲线形态比对，逐段校正。',
            effect: '标签与曲线真正对上；这一步做好了，后面的误差才代表模型而不是归位',
            trap: '归位错了不会报错，它只会让模型看起来"怎么调都不准"，最后被误判成算法问题'
          },
          {
            name: '标签清洗', role: '工程环节',
            do: '剔除裂缝发育段、破碎样、取心收获率低的样点；同一层内样点过密的做降采样，避免一口井的某个层段主导损失函数。',
            effect: '标签从"有多少算多少"变成"每个相带都有代表"',
            trap: '取心往往偏向好储层，不处理采样偏差，模型会系统性高估孔隙度'
          },
          {
            name: '标准化与近邻回归', role: '算法核心',
            do: '使用训练集的均值与标准差处理 DEN、GR、CNL，按三维距离找五个近邻，取其孔隙度标签均值。Vsh 仅用于事后分组评价，不作为当前模型输入。',
            effect: '从多曲线相似样本借用孔隙度信息，补充单密度公式的固定假设',
            trap: '输入漂移、训练样本缺少相似岩性或薄层变化过快，都会使近邻参考失效'
          },
          {
            name: '按井划分与验证', role: '质控',
            do: '留出整口井做测试，绝不按深度点随机划分；同时统计"测试点最近的训练点是否来自同一口井"，作为划分是否干净的证据。',
            effect: 'R² 从 0.979 回落到 0.913 —— 仅作为此合成留出条件的结果',
            trap: '随机划分下近邻同井率超过一半，模型在抄相邻深度的答案，指标全部作废'
          },
          {
            name: '误差定位与人工复核', role: '复核',
            do: '将预测、密度公式与合成真值放在同一剖面，并按泥质含量分组检查误差。当前尚未实现预测区间或标注回流。',
            effect: '定位学习法与公式分歧的井段，交由解释员结合原始曲线复核',
            trap: '点预测与合成测试误差不能直接作为储量计算的确定值；区间估计是后续扩展'
          }
        ],
        metrics: {
          title: '怎么算"解释对了"',
          html: '<p>核心指标是 RMSE（p.u. = 孔隙度百分点）与按井划分的 R²。但只看总 RMSE 会被"好储层占多数"掩盖 —— 必须<b>按泥质含量分组看误差</b>，因为在泥质段公式法与学习法的差距最大，那也是取值最难、下游最关心的段。</p>' +
            K.figure(figLeak(), 3, '划分方式决定指标的真假。左边是能交付的口径，右边是自欺欺人的口径 —— 两者差别不在模型，只在于"测试点的邻居是不是就在旁边"。') +
            K.dtable(['指标', '定义', '本例取值'], [
              ['RMSE（学习法）', '按井划分，测试井全部深度点', '1.54 p.u.'],
              ['RMSE（密度公式）', '同一测试集的公式基线', '3.74 p.u.'],
              ['R²（按井）', '1 − SSE/SST，留出井', '0.913'],
              ['R²（随机划分）', '同数据随机切分，仅作对照', '0.979'],
              ['Vsh > 0.6 段 RMSE', '泥质段单独统计（学习法 / 公式）', '1.34 / 5.00 p.u.']
            ])
        },
        fails: [
          { name: '相带外推失效', why: '训练井集中在三角洲前缘，模型遇到河道砂体时没有相似样本，误差会突然放大且不报警。解决方向是先用无监督方法检查测试井是否落在训练分布内。' },
          { name: '气层被读成低孔', why: '密度测井在含气段读数偏低，公式算出偏高孔隙度，学习法若只见过水层也会犯同样的错。必须把 DEN−CNL 差值作为特征显式喂进去。' },
          { name: '岩心归位误差伪装成模型误差', why: '0.3 m 的深度错位在薄互层里等于换了一层岩性，标签本身就是错的。要先做归位质控再谈模型精度。' },
          { name: '薄储层被平滑掉', why: 'KNN 或平滑型模型会把 0.5 m 的薄层抹平。薄层要用序列模型（1D-CNN）并单独统计薄层误差。' }
        ]
      },

      demo: {
        label: '可运行示范',
        intro: '拖动"建模井数"看学习曲线，切换"按井 / 随机划分"看 R² 怎么被划分方式骗出来 —— 右边的近邻同井率是关键读数。',
        height: 780
      }
    },

    /* 供 build-case.js 生成插件时使用 */
    demoGlobal: 'W2DEMO'
  };
};
