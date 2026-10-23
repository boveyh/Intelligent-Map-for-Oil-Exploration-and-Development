/* 自动生成，请勿手改 —— 源文件 cases/w2-reservoir-param/content.js */
(function () {
  var D = {
  "id": "w2-reservoir-param",
  "sceneId": "w2",
  "title": "储层参数智能解释",
  "status": "ready",
  "version": "1.0.0",
  "updated": "2026-10-23",
  "methods": [
    "ts",
    "opt"
  ],
  "tabs": {
    "background": {
      "label": "专业背景",
      "judge": [
        {
          "label": "任务类型",
          "value": "多变量回归",
          "desc": "输出连续值，不是类别",
          "html": "<span style=\"color:var(--c-ts)\">深度回归</span>"
        },
        {
          "label": "数据门槛",
          "value": "取心井 8—15 口",
          "desc": "每井 50—200 个岩心样点"
        },
        {
          "label": "收益",
          "value": "3.7 → 1.5 p.u.",
          "desc": "孔隙度 RMSE，相对密度公式",
          "html": "<b style=\"color:var(--jade-d);font-family:var(--mono)\">3.7→1.5</b>"
        },
        {
          "label": "难度",
          "value": "中",
          "desc": "难在标签少、跨井泛化",
          "html": "<span class=\"dtag\" data-d=\"中\">难度 中</span>"
        }
      ],
      "lede": "孔隙度、渗透率、饱和度是储层评价的三个核心参数，也是\"这口井打不打、射哪一段\"的依据。孔隙度看起来有现成公式可算，但公式里每个量都带着一个\"你必须先知道\"的假设 —— 而地下最不确定的恰恰是这些假设。",
      "sections": [
        {
          "no": 1,
          "en": "PROBLEM",
          "title": "当前做法与问题",
          "html": "<p>常规做法是<b>岩心刻度</b>：取心井做岩心分析得到真实孔隙度，再把它和密度、中子、声波曲线对上，建立一条回归线或直接用物理公式，然后向全区所有井外推。</p><p>问题在于孔隙度有三条独立的测井求法，每条都要求你先知道一个骨架参数。骨架是砂岩还是灰岩，密度差 0.05 g/cm³，孔隙度就差 3 个百分点；含一点气，密度测井会把它读成\"更低的孔隙度\"。<b>解释员的经验，本质上是在这些假设之间做选择</b> —— 而这个选择没有记录，也无法复现。</p><div class=\"figure\"><svg viewBox=\"0 0 620 268\" xmlns=\"http://www.w3.org/2000/svg\" role=\"img\" aria-label=\"孔隙度的三条测井求法与各自的失效条件\"><rect x=\"14\" y=\"24\" width=\"400\" height=\"56\" rx=\"8\" fill=\"#e6f1ec\" stroke=\"#2f7d6b\" stroke-opacity=\".3\"/><rect x=\"14\" y=\"24\" width=\"3\" height=\"56\" rx=\"1.5\" fill=\"#2f7d6b\"/><text x=\"28\" y=\"44\" font-size=\"11.5\" font-weight=\"600\" fill=\"#242b2e\">DEN 密度测井</text><text x=\"144\" y=\"44\" font-size=\"9.5\" font-family=\"monospace\" fill=\"#2f7d6b\">φ_D = (ρma − ρb) / (ρma − ρf)</text><text x=\"28\" y=\"65\" font-size=\"9.5\" fill=\"#b26a39\">失效：高泥质、含气、重矿物</text><path d=\"M416 52h30\" stroke=\"#2f7d6b\" stroke-opacity=\".45\" stroke-width=\"1.2\" fill=\"none\"/><path d=\"M442 48.5l4 3.5-4 3.5\" stroke=\"#2f7d6b\" stroke-opacity=\".45\" stroke-width=\"1.2\" fill=\"none\"/><rect x=\"14\" y=\"98\" width=\"400\" height=\"56\" rx=\"8\" fill=\"#e7eef9\" stroke=\"#41699b\" stroke-opacity=\".3\"/><rect x=\"14\" y=\"98\" width=\"3\" height=\"56\" rx=\"1.5\" fill=\"#41699b\"/><text x=\"28\" y=\"118\" font-size=\"11.5\" font-weight=\"600\" fill=\"#242b2e\">CNL 中子测井</text><text x=\"144\" y=\"118\" font-size=\"9.5\" font-family=\"monospace\" fill=\"#41699b\">φ_N ≈ CNL（需岩性校正）</text><text x=\"28\" y=\"139\" font-size=\"9.5\" fill=\"#b26a39\">失效：气层挖掘效应、石膏地层</text><path d=\"M416 126h30\" stroke=\"#41699b\" stroke-opacity=\".45\" stroke-width=\"1.2\" fill=\"none\"/><path d=\"M442 122.5l4 3.5-4 3.5\" stroke=\"#41699b\" stroke-opacity=\".45\" stroke-width=\"1.2\" fill=\"none\"/><rect x=\"14\" y=\"172\" width=\"400\" height=\"56\" rx=\"8\" fill=\"#efe9f4\" stroke=\"#7e5a8d\" stroke-opacity=\".3\"/><rect x=\"14\" y=\"172\" width=\"3\" height=\"56\" rx=\"1.5\" fill=\"#7e5a8d\"/><text x=\"28\" y=\"192\" font-size=\"11.5\" font-weight=\"600\" fill=\"#242b2e\">NMR 核磁测井</text><text x=\"144\" y=\"192\" font-size=\"9.5\" font-family=\"monospace\" fill=\"#7e5a8d\">φ_NMR = ∫ 弛豫谱（T2 截断）</text><text x=\"28\" y=\"213\" font-size=\"9.5\" fill=\"#b26a39\">失效：井眼差、含烃校正不准</text><path d=\"M416 200h30\" stroke=\"#7e5a8d\" stroke-opacity=\".45\" stroke-width=\"1.2\" fill=\"none\"/><path d=\"M442 196.5l4 3.5-4 3.5\" stroke=\"#7e5a8d\" stroke-opacity=\".45\" stroke-width=\"1.2\" fill=\"none\"/><rect x=\"450\" y=\"24\" width=\"160\" height=\"204\" rx=\"10\" fill=\"#fdfcf9\" stroke=\"#2f7d6b\" stroke-opacity=\".45\"/><text x=\"530\" y=\"100\" text-anchor=\"middle\" font-size=\"13\" font-weight=\"600\" fill=\"#2f7d6b\">φ 有效孔隙度</text><text x=\"530\" y=\"120\" text-anchor=\"middle\" font-size=\"9.5\" fill=\"#5d666d\">储层评价的第一参数</text><text x=\"530\" y=\"142\" text-anchor=\"middle\" font-size=\"9.5\" font-family=\"monospace\" fill=\"#9ba3a9\">φ → Sw → K → 储量</text><text x=\"530\" y=\"176\" text-anchor=\"middle\" font-size=\"9.5\" fill=\"#9ba3a9\">三条路都要先知道</text><text x=\"530\" y=\"190\" text-anchor=\"middle\" font-size=\"9.5\" fill=\"#9ba3a9\">一个骨架参数</text><text x=\"14\" y=\"248\" font-size=\"9.5\" fill=\"#79828a\">骨架参数（ρma / 岩性 / 含烃校正）恰是地下最不确定的东西 —— 这就是为什么需要从数据里学它，而不是从手册里查它。</text></svg></div><div class=\"figcap\"><b>图 1</b><span>三条求 φ 的物理路径，失效条件各不相同。<b>它们的分歧本身就是信息</b>：三条曲线对不上时，往往说明岩性或流体有异常 —— 学习法要学的正是这种&quot;分歧模式&quot;。</span></div>"
        },
        {
          "no": 2,
          "en": "INTERVENTION",
          "title": "AI 能做什么",
          "html": "<p>把 φ 解释建模成一个<b>多曲线到连续值的回归问题</b>：输入不是一条 DEN，而是 DEN / GR / CNL 的组合及其派生量（泥质含量、曲线形态、上下趋势），输出 φ 与一个不确定性区间，用岩心样点做监督。</p><p>它替换的是工序里的<b>\"选公式 + 手工划定拟合区间\"</b>这一步，不是解释员。人仍然决定用哪些井做标签、哪个层段的结果不能采信。</p><div class=\"figure\"><svg viewBox=\"0 0 620 292\" xmlns=\"http://www.w3.org/2000/svg\" role=\"img\" aria-label=\"真实孔隙度与密度公式估计随泥质含量变化的偏差\"><line x1=\"66\" y1=\"197.35135135135135\" x2=\"552\" y2=\"197.35135135135135\" stroke=\"#eeeae0\"/><text x=\"56\" y=\"200.85135135135135\" font-size=\"9.5\" font-family=\"monospace\" fill=\"#9ba3a9\" text-anchor=\"end\">0.0</text><line x1=\"66\" y1=\"154.1081081081081\" x2=\"552\" y2=\"154.1081081081081\" stroke=\"#eeeae0\"/><text x=\"56\" y=\"157.6081081081081\" font-size=\"9.5\" font-family=\"monospace\" fill=\"#9ba3a9\" text-anchor=\"end\">0.1</text><line x1=\"66\" y1=\"110.86486486486486\" x2=\"552\" y2=\"110.86486486486486\" stroke=\"#eeeae0\"/><text x=\"56\" y=\"114.36486486486486\" font-size=\"9.5\" font-family=\"monospace\" fill=\"#9ba3a9\" text-anchor=\"end\">0.2</text><line x1=\"66\" y1=\"67.62162162162161\" x2=\"552\" y2=\"67.62162162162161\" stroke=\"#eeeae0\"/><text x=\"56\" y=\"71.12162162162161\" font-size=\"9.5\" font-family=\"monospace\" fill=\"#9ba3a9\" text-anchor=\"end\">0.3</text><text x=\"66\" y=\"223\" font-size=\"9.5\" font-family=\"monospace\" fill=\"#9ba3a9\" text-anchor=\"middle\">0.00</text><text x=\"187.5\" y=\"223\" font-size=\"9.5\" font-family=\"monospace\" fill=\"#9ba3a9\" text-anchor=\"middle\">0.25</text><text x=\"309\" y=\"223\" font-size=\"9.5\" font-family=\"monospace\" fill=\"#9ba3a9\" text-anchor=\"middle\">0.50</text><text x=\"430.5\" y=\"223\" font-size=\"9.5\" font-family=\"monospace\" fill=\"#9ba3a9\" text-anchor=\"middle\">0.75</text><text x=\"552\" y=\"223\" font-size=\"9.5\" font-family=\"monospace\" fill=\"#9ba3a9\" text-anchor=\"middle\">1.00</text><line x1=\"66\" y1=\"197.35135135135135\" x2=\"552\" y2=\"197.35135135135135\" stroke=\"#c9c2b0\"/><path d=\"M104.88 75.92432432432432 L123.50999999999999 79.9027027027027 L142.14 83.88108108108108 L160.77 87.85945945945946 L179.4 91.83783783783784 L198.03 95.8162162162162 L216.66 99.7945945945946 L235.29000000000002 103.77297297297298 L253.92 107.75135135135136 L272.55 111.72972972972974 L291.18 115.70810810810812 L309.81000000000006 119.6864864864865 L328.44 123.66486486486487 L347.06999999999994 127.64324324324325 L365.7 131.6216216216216 L384.33000000000004 135.60000000000002 L402.96 139.57837837837837 L421.59000000000003 143.55675675675676 L440.22 147.53513513513514 L458.84999999999997 151.51351351351352 L477.48 155.4918918918919 L496.11 159.47027027027028 L514.74 163.44864864864866 L533.37 167.42702702702704 L533.37 197.65974774774773 L514.74 192.47625225225224 L496.11 187.29275675675675 L477.48 182.10926126126125 L458.84999999999997 176.92576576576576 L440.22 171.74227027027027 L421.59000000000003 166.55877477477478 L402.96 161.37527927927925 L384.33000000000004 156.19178378378376 L365.7 151.0082882882883 L347.06999999999994 145.82479279279278 L328.44 140.6412972972973 L309.81000000000006 135.4578018018018 L291.18 130.2743063063063 L272.55 125.09081081081082 L253.92 119.90731531531532 L235.29000000000002 114.72381981981982 L216.66 109.54032432432433 L198.03 104.35682882882884 L179.4 99.17333333333335 L160.77 93.98983783783783 L142.14 88.80634234234233 L123.50999999999999 83.62284684684684 L104.88 78.43935135135133 Z\" fill=\"#b26a39\" fill-opacity=\".13\"/><line x1=\"66\" y1=\"67.62162162162161\" x2=\"552\" y2=\"171.40540540540542\" stroke=\"#2f7d6b\" stroke-width=\"2.6\"/><line x1=\"66\" y1=\"67.62162162162161\" x2=\"552\" y2=\"202.84324324324325\" stroke=\"#b26a39\" stroke-width=\"1.9\" stroke-dasharray=\"6 3\"/><line x1=\"404\" y1=\"52\" x2=\"428\" y2=\"52\" stroke=\"#2f7d6b\" stroke-width=\"2.6\"/><text x=\"434\" y=\"55.5\" font-size=\"9.5\" fill=\"#5d666d\">真实 φ（岩心）</text><line x1=\"404\" y1=\"70\" x2=\"428\" y2=\"70\" stroke=\"#b26a39\" stroke-width=\"1.9\" stroke-dasharray=\"5 3\"/><text x=\"434\" y=\"73.5\" font-size=\"9.5\" fill=\"#5d666d\">密度公式 φ_D</text><text x=\"260.4\" y=\"95.13513513513514\" font-size=\"10\" fill=\"#b26a39\">两线之间 = 公式的系统偏差，随泥质线性增大</text><text x=\"309\" y=\"244\" font-size=\"10.5\" fill=\"#5d666d\" text-anchor=\"middle\">泥质含量 Vsh</text><text x=\"17\" y=\"126\" font-size=\"10.5\" fill=\"#5d666d\" transform=\"rotate(-90 17 126)\" text-anchor=\"middle\">孔隙度 φ / v·v</text><text x=\"552\" y=\"280\" font-size=\"9.5\" fill=\"#b26a39\" text-anchor=\"end\">Vsh → 1 时公式算出负孔隙度，解释员只能手工截断到 0</text></svg></div><div class=\"figcap\"><b>图 2</b><span>真实 φ 与 Vsh 的关系是一条斜线，而密度公式给出的斜率更陡 —— 泥质越多，公式低估越狠，Vsh→1 时会算出负孔隙度。学习法不是&quot;更准的公式&quot;，它拟合的是<b>这条曲线本身</b>，包括公式没有写进去的高阶项。</span></div><div class=\"callout\"><span class=\"ci\">说明</span><span>这条案例真正的技术门槛不在模型，而在<b>验证口径</b>。用随机划分，你会得到一个漂亮但无法交付的 R²；下面的示范可以让你亲手把这个假象拆开。</span></div>"
        },
        {
          "no": 3,
          "en": "DATA",
          "title": "你需要准备什么",
          "html": "<p style=\"margin-bottom:14px\">这个场景的数据门槛比\"分层\"高，因为标签来自取心，取心井是稀缺资源。立项前先对着清单打勾。</p><div class=\"checklist\"><div class=\"cl-head\"><span>数据准备清单 · 5 项</span><span class=\"cl-prog\"><span id=\"cl-txt\">0 / 5</span><span class=\"cl-bar\"><i id=\"cl-fill\"></i></span></span></div><div class=\"cl-item\" data-cl=\"0\"><span class=\"cl-box\"><svg width=\"10\" height=\"10\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#fff\" stroke-width=\"4\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M4 12.5l5 5L20 6.5\"/></svg></span><span><span class=\"cl-t\">常规测井曲线</span><span class=\"cl-s\">DEN / GR / CNL（可选 RT、核磁），0.125 m 采样</span></span><span class=\"cl-n\">不需要逐点标注</span></div><div class=\"cl-item\" data-cl=\"1\"><span class=\"cl-box\"><svg width=\"10\" height=\"10\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#fff\" stroke-width=\"4\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M4 12.5l5 5L20 6.5\"/></svg></span><span><span class=\"cl-t\">岩心分析孔隙度</span><span class=\"cl-s\">单井 50—200 个样点，8—15 口井</span></span><span class=\"cl-n\">作为标签</span></div><div class=\"cl-item\" data-cl=\"2\"><span class=\"cl-box\"><svg width=\"10\" height=\"10\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#fff\" stroke-width=\"4\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M4 12.5l5 5L20 6.5\"/></svg></span><span><span class=\"cl-t\">岩心归位表</span><span class=\"cl-s\">岩心深度与测井深度对应关系</span></span><span class=\"cl-n\">深度误差 ≤0.2 m</span></div><div class=\"cl-item\" data-cl=\"3\"><span class=\"cl-box\"><svg width=\"10\" height=\"10\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#fff\" stroke-width=\"4\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M4 12.5l5 5L20 6.5\"/></svg></span><span><span class=\"cl-t\">试油 / 生产数据</span><span class=\"cl-s\">层段产能与含水</span></span><span class=\"cl-n\">交叉验证，不作为标签</span></div><div class=\"cl-item\" data-cl=\"4\"><span class=\"cl-box\"><svg width=\"10\" height=\"10\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#fff\" stroke-width=\"4\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M4 12.5l5 5L20 6.5\"/></svg></span><span><span class=\"cl-t\">区域沉积背景</span><span class=\"cl-s\">相带展布与岩性组合</span></span><span class=\"cl-n\">判断外推是否可信</span></div></div><p style=\"margin-top:18px\"><span class=\"kicker plain\" style=\"color:var(--ink-4)\">可参考的公开数据集</span></p><div class=\"refs\"><a class=\"ref\" href=\"#/method/cv\">FORCE 2020（井曲线 + 岩性）<span class=\"ar\">↗</span></a><a class=\"ref\" href=\"#/method/cv\">Kansas Geological Survey 公开测井库<span class=\"ar\">↗</span></a><a class=\"ref\" href=\"#/method/cv\">NLOG 荷兰公开井数据<span class=\"ar\">↗</span></a></div>"
        },
        {
          "no": 4,
          "en": "DIFFICULTY",
          "title": "技术难度与参考方向",
          "html": "<div style=\"display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-bottom:2px\"><span class=\"dtag\" data-d=\"中\">难度 中</span><span class=\"small muted\">数据现成、任务定义清晰；难在取心样本少、井间刻度差与相带差异。</span></div><div class=\"meter\"><i class=\"on\"></i><i class=\"on\"></i><i class=\"\"></i></div><p>难点有三个：<b>标签少</b>（十几口取心井，几百个样点，却要覆盖整个区块的相带）；<b>井间刻度差</b>（不同年代仪器、不同测井公司，曲线本身就有系统偏差）；<b>外推风险</b>（模型在没见过的相带里会安静地给出错误答案，且不会报错）。</p><p>建议的验证顺序：先用密度公式作基线，确认学习法在<b>按井划分</b>下确实超过它；再看误差是否集中在某一类岩性；最后才谈上整个区块。</p><p style=\"margin-top:18px\"><span class=\"kicker plain\" style=\"color:var(--ink-4)\">可借鉴的通用技术</span></p><div class=\"refs\"><a class=\"ref\" href=\"#/method/ts\">深度回归<span class=\"ar\">↗</span></a><a class=\"ref\" href=\"#/method/ts\">按组划分验证<span class=\"ar\">↗</span></a><a class=\"ref\" href=\"#/method/ts\">不确定性估计<span class=\"ar\">↗</span></a><a class=\"ref\" href=\"#/method/ts\">迁移学习<span class=\"ar\">↗</span></a></div><p style=\"margin-top:18px\" class=\"small muted\">交叉环节：<a href=\"#/stage/welllog\" style=\"color:var(--jade-d);font-weight:600\">测井</a> · <a href=\"#/stage/geophys\" style=\"color:var(--jade-d);font-weight:600\">物探</a> · <a href=\"#/stage/completion\" style=\"color:var(--jade-d);font-weight:600\">完井</a></p>"
        }
      ]
    },
    "workflow": {
      "label": "案例流程",
      "title": "案例：B 区块 12 口井的孔隙度重新解释",
      "lead": [
        "B 区块有 12 口取心井、2640 个岩心孔隙度样点。原来的解释用密度公式 + 分段手工拟合，解释组自己也知道泥质段不准，但说不清\"不准多少\"。",
        "目标不是\"训一个模型\"，而是**把孔隙度 RMSE 从 3.7 压到 1.6 p.u. 以内，并且这个数必须在没有参与建模的井上成立**。下面五步里，第 1 步和第 4 步不涉及任何模型，却决定了最终数字是真是假。"
      ],
      "stats": [
        [
          "取心井",
          "12",
          true
        ],
        [
          "岩心样点",
          "2640",
          true
        ],
        [
          "输入曲线",
          "3",
          true
        ],
        [
          "目标 RMSE",
          "≤1.6 p.u."
        ],
        [
          "原方法 RMSE",
          "3.74 p.u."
        ],
        [
          "案例结果",
          "1.54 p.u."
        ]
      ],
      "steps": [
        {
          "name": "岩心归位与深度校正",
          "role": "工程环节",
          "do": "把岩心分析深度与测井深度对齐：岩心筒取心存在 0.1—0.5 m 的深度漂移，用岩心照片与 GR 曲线形态比对，逐段校正。",
          "effect": "标签与曲线真正对上；这一步做好了，后面的误差才代表模型而不是归位",
          "trap": "归位错了不会报错，它只会让模型看起来\"怎么调都不准\"，最后被误判成算法问题"
        },
        {
          "name": "标签清洗",
          "role": "工程环节",
          "do": "剔除裂缝发育段、破碎样、取心收获率低的样点；同一层内样点过密的做降采样，避免一口井的某个层段主导损失函数。",
          "effect": "标签从\"有多少算多少\"变成\"每个相带都有代表\"",
          "trap": "取心往往偏向好储层，不处理采样偏差，模型会系统性高估孔隙度"
        },
        {
          "name": "特征工程",
          "role": "算法核心",
          "do": "除了三条原始曲线，显式构造泥质含量 Vsh、GR 曲线形态（上下 1 m 的均值差）、DEN 与 CNL 的差值 —— 后者正是气层与复杂岩性的指示。",
          "effect": "把解释员脑子里的\"这三条对不上，可能是气\"翻译成模型能读的特征",
          "trap": "只用 DEN 一个特征，模型就只能复现密度公式，收益接近零"
        },
        {
          "name": "按井划分与验证",
          "role": "质控",
          "do": "留出整口井做测试，绝不按深度点随机划分；同时统计\"测试点最近的训练点是否来自同一口井\"，作为划分是否干净的证据。",
          "effect": "R² 从 0.98 回落到 0.92 —— 这个更低的数才是能对外承诺的",
          "trap": "随机划分下近邻同井率超过一半，模型在抄相邻深度的答案，指标全部作废"
        },
        {
          "name": "不确定性与人工复核",
          "role": "闭环",
          "do": "用分位数回归或集成方差给出每个深度的区间宽度，解释员只复核区间最宽的那 15% —— 通常是气层、薄互层和井眼垮塌段。",
          "effect": "人力集中在真正需要判断的地方，且复核结果能回流成新标签",
          "trap": "只给点预测不给区间，下游会把它当确定值直接用于储量计算"
        }
      ],
      "metrics": {
        "title": "怎么算\"解释对了\"",
        "html": "<p>核心指标是 RMSE（p.u. = 孔隙度百分点）与按井划分的 R²。但只看总 RMSE 会被\"好储层占多数\"掩盖 —— 必须<b>按泥质含量分组看误差</b>，因为在泥质段公式法与学习法的差距最大，那也是取值最难、下游最关心的段。</p><div class=\"figure\"><svg viewBox=\"0 0 620 272\" xmlns=\"http://www.w3.org/2000/svg\" role=\"img\" aria-label=\"按井划分与随机划分下训练测试点的分布对比\"><text x=\"16\" y=\"22\" font-size=\"11.5\" font-weight=\"600\" fill=\"#242b2e\">A · 按井划分</text><line x1=\"66\" y1=\"54\" x2=\"66\" y2=\"186\" stroke=\"#e9e4d8\"/><circle cx=\"66\" cy=\"58\" r=\"3.1\" fill=\"#cfc8b6\"/><circle cx=\"66\" cy=\"68.33333333333333\" r=\"3.1\" fill=\"#cfc8b6\"/><circle cx=\"66\" cy=\"78.66666666666667\" r=\"3.1\" fill=\"#cfc8b6\"/><circle cx=\"66\" cy=\"89\" r=\"3.1\" fill=\"#cfc8b6\"/><circle cx=\"66\" cy=\"99.33333333333334\" r=\"3.1\" fill=\"#cfc8b6\"/><circle cx=\"66\" cy=\"109.66666666666667\" r=\"3.1\" fill=\"#cfc8b6\"/><circle cx=\"66\" cy=\"120\" r=\"3.1\" fill=\"#cfc8b6\"/><circle cx=\"66\" cy=\"130.33333333333334\" r=\"3.1\" fill=\"#cfc8b6\"/><circle cx=\"66\" cy=\"140.66666666666669\" r=\"3.1\" fill=\"#cfc8b6\"/><circle cx=\"66\" cy=\"151\" r=\"3.1\" fill=\"#cfc8b6\"/><circle cx=\"66\" cy=\"161.33333333333334\" r=\"3.1\" fill=\"#cfc8b6\"/><circle cx=\"66\" cy=\"171.66666666666669\" r=\"3.1\" fill=\"#cfc8b6\"/><circle cx=\"66\" cy=\"182\" r=\"3.1\" fill=\"#cfc8b6\"/><text x=\"66\" y=\"201\" text-anchor=\"middle\" font-size=\"9\" fill=\"#9ba3a9\">井1</text><line x1=\"138\" y1=\"54\" x2=\"138\" y2=\"186\" stroke=\"#e9e4d8\"/><circle cx=\"138\" cy=\"58\" r=\"3.1\" fill=\"#cfc8b6\"/><circle cx=\"138\" cy=\"68.33333333333333\" r=\"3.1\" fill=\"#cfc8b6\"/><circle cx=\"138\" cy=\"78.66666666666667\" r=\"3.1\" fill=\"#cfc8b6\"/><circle cx=\"138\" cy=\"89\" r=\"3.1\" fill=\"#cfc8b6\"/><circle cx=\"138\" cy=\"99.33333333333334\" r=\"3.1\" fill=\"#cfc8b6\"/><circle cx=\"138\" cy=\"109.66666666666667\" r=\"3.1\" fill=\"#cfc8b6\"/><circle cx=\"138\" cy=\"120\" r=\"3.1\" fill=\"#cfc8b6\"/><circle cx=\"138\" cy=\"130.33333333333334\" r=\"3.1\" fill=\"#cfc8b6\"/><circle cx=\"138\" cy=\"140.66666666666669\" r=\"3.1\" fill=\"#cfc8b6\"/><circle cx=\"138\" cy=\"151\" r=\"3.1\" fill=\"#cfc8b6\"/><circle cx=\"138\" cy=\"161.33333333333334\" r=\"3.1\" fill=\"#cfc8b6\"/><circle cx=\"138\" cy=\"171.66666666666669\" r=\"3.1\" fill=\"#cfc8b6\"/><circle cx=\"138\" cy=\"182\" r=\"3.1\" fill=\"#cfc8b6\"/><text x=\"138\" y=\"201\" text-anchor=\"middle\" font-size=\"9\" fill=\"#9ba3a9\">井2</text><line x1=\"210\" y1=\"54\" x2=\"210\" y2=\"186\" stroke=\"#e9e4d8\"/><circle cx=\"210\" cy=\"58\" r=\"3.1\" fill=\"#2f7d6b\"/><circle cx=\"210\" cy=\"68.33333333333333\" r=\"3.1\" fill=\"#2f7d6b\"/><circle cx=\"210\" cy=\"78.66666666666667\" r=\"3.1\" fill=\"#2f7d6b\"/><circle cx=\"210\" cy=\"89\" r=\"3.1\" fill=\"#2f7d6b\"/><circle cx=\"210\" cy=\"99.33333333333334\" r=\"3.1\" fill=\"#2f7d6b\"/><circle cx=\"210\" cy=\"109.66666666666667\" r=\"3.1\" fill=\"#2f7d6b\"/><circle cx=\"210\" cy=\"120\" r=\"3.1\" fill=\"#2f7d6b\"/><circle cx=\"210\" cy=\"130.33333333333334\" r=\"3.1\" fill=\"#2f7d6b\"/><circle cx=\"210\" cy=\"140.66666666666669\" r=\"3.1\" fill=\"#2f7d6b\"/><circle cx=\"210\" cy=\"151\" r=\"3.1\" fill=\"#2f7d6b\"/><circle cx=\"210\" cy=\"161.33333333333334\" r=\"3.1\" fill=\"#2f7d6b\"/><circle cx=\"210\" cy=\"171.66666666666669\" r=\"3.1\" fill=\"#2f7d6b\"/><circle cx=\"210\" cy=\"182\" r=\"3.1\" fill=\"#2f7d6b\"/><text x=\"210\" y=\"201\" text-anchor=\"middle\" font-size=\"9\" fill=\"#9ba3a9\">井3</text><rect x=\"194\" y=\"48\" width=\"32\" height=\"142\" rx=\"6\" fill=\"none\" stroke=\"#2f7d6b\" stroke-dasharray=\"4 3\" stroke-opacity=\".7\"/><line x1=\"227\" y1=\"120\" x2=\"232\" y2=\"120\" stroke=\"#2f7d6b\" stroke-opacity=\".5\"/><text x=\"236\" y=\"123\" font-size=\"9\" fill=\"#2f7d6b\">整口井留出</text><text x=\"16\" y=\"236\" font-size=\"9.5\" fill=\"#5d666d\">测试井整口不参与 → 模型没见过这口井的刻度差</text><line x1=\"306\" y1=\"12\" x2=\"306\" y2=\"236\" stroke=\"#e9e4d8\" stroke-dasharray=\"3 4\"/><text x=\"326\" y=\"22\" font-size=\"11.5\" font-weight=\"600\" fill=\"#242b2e\">B · 随机划分</text><line x1=\"376\" y1=\"54\" x2=\"376\" y2=\"186\" stroke=\"#e9e4d8\"/><circle cx=\"376\" cy=\"58\" r=\"3.1\" fill=\"#2f7d6b\"/><circle cx=\"376\" cy=\"68.33333333333333\" r=\"3.1\" fill=\"#cfc8b6\"/><circle cx=\"376\" cy=\"78.66666666666667\" r=\"3.1\" fill=\"#cfc8b6\"/><circle cx=\"376\" cy=\"89\" r=\"3.1\" fill=\"#2f7d6b\"/><circle cx=\"376\" cy=\"99.33333333333334\" r=\"3.1\" fill=\"#cfc8b6\"/><circle cx=\"376\" cy=\"109.66666666666667\" r=\"3.1\" fill=\"#cfc8b6\"/><circle cx=\"376\" cy=\"120\" r=\"3.1\" fill=\"#2f7d6b\"/><circle cx=\"376\" cy=\"130.33333333333334\" r=\"3.1\" fill=\"#cfc8b6\"/><circle cx=\"376\" cy=\"140.66666666666669\" r=\"3.1\" fill=\"#cfc8b6\"/><circle cx=\"376\" cy=\"151\" r=\"3.1\" fill=\"#2f7d6b\"/><circle cx=\"376\" cy=\"161.33333333333334\" r=\"3.1\" fill=\"#cfc8b6\"/><circle cx=\"376\" cy=\"171.66666666666669\" r=\"3.1\" fill=\"#cfc8b6\"/><circle cx=\"376\" cy=\"182\" r=\"3.1\" fill=\"#2f7d6b\"/><text x=\"376\" y=\"201\" text-anchor=\"middle\" font-size=\"9\" fill=\"#9ba3a9\">井1</text><line x1=\"448\" y1=\"54\" x2=\"448\" y2=\"186\" stroke=\"#e9e4d8\"/><circle cx=\"448\" cy=\"58\" r=\"3.1\" fill=\"#cfc8b6\"/><circle cx=\"448\" cy=\"68.33333333333333\" r=\"3.1\" fill=\"#2f7d6b\"/><circle cx=\"448\" cy=\"78.66666666666667\" r=\"3.1\" fill=\"#cfc8b6\"/><circle cx=\"448\" cy=\"89\" r=\"3.1\" fill=\"#cfc8b6\"/><circle cx=\"448\" cy=\"99.33333333333334\" r=\"3.1\" fill=\"#2f7d6b\"/><circle cx=\"448\" cy=\"109.66666666666667\" r=\"3.1\" fill=\"#cfc8b6\"/><circle cx=\"448\" cy=\"120\" r=\"3.1\" fill=\"#cfc8b6\"/><circle cx=\"448\" cy=\"130.33333333333334\" r=\"3.1\" fill=\"#2f7d6b\"/><circle cx=\"448\" cy=\"140.66666666666669\" r=\"3.1\" fill=\"#cfc8b6\"/><circle cx=\"448\" cy=\"151\" r=\"3.1\" fill=\"#cfc8b6\"/><circle cx=\"448\" cy=\"161.33333333333334\" r=\"3.1\" fill=\"#2f7d6b\"/><circle cx=\"448\" cy=\"171.66666666666669\" r=\"3.1\" fill=\"#cfc8b6\"/><circle cx=\"448\" cy=\"182\" r=\"3.1\" fill=\"#cfc8b6\"/><text x=\"448\" y=\"201\" text-anchor=\"middle\" font-size=\"9\" fill=\"#9ba3a9\">井2</text><line x1=\"520\" y1=\"54\" x2=\"520\" y2=\"186\" stroke=\"#e9e4d8\"/><circle cx=\"520\" cy=\"58\" r=\"3.1\" fill=\"#cfc8b6\"/><circle cx=\"520\" cy=\"68.33333333333333\" r=\"3.1\" fill=\"#cfc8b6\"/><circle cx=\"520\" cy=\"78.66666666666667\" r=\"3.1\" fill=\"#2f7d6b\"/><circle cx=\"520\" cy=\"89\" r=\"3.1\" fill=\"#cfc8b6\"/><circle cx=\"520\" cy=\"99.33333333333334\" r=\"3.1\" fill=\"#cfc8b6\"/><circle cx=\"520\" cy=\"109.66666666666667\" r=\"3.1\" fill=\"#2f7d6b\"/><circle cx=\"520\" cy=\"120\" r=\"3.1\" fill=\"#cfc8b6\"/><circle cx=\"520\" cy=\"130.33333333333334\" r=\"3.1\" fill=\"#cfc8b6\"/><circle cx=\"520\" cy=\"140.66666666666669\" r=\"3.1\" fill=\"#2f7d6b\"/><circle cx=\"520\" cy=\"151\" r=\"3.1\" fill=\"#cfc8b6\"/><circle cx=\"520\" cy=\"161.33333333333334\" r=\"3.1\" fill=\"#cfc8b6\"/><circle cx=\"520\" cy=\"171.66666666666669\" r=\"3.1\" fill=\"#2f7d6b\"/><circle cx=\"520\" cy=\"182\" r=\"3.1\" fill=\"#cfc8b6\"/><text x=\"520\" y=\"201\" text-anchor=\"middle\" font-size=\"9\" fill=\"#9ba3a9\">井3</text><text x=\"326\" y=\"236\" font-size=\"9.5\" fill=\"#5d666d\">同井相邻深度分属训练与测试 → 近邻就是\"抄答案\"</text><circle cx=\"430\" cy=\"18\" r=\"3.1\" fill=\"#cfc8b6\"/><text x=\"438\" y=\"21.5\" font-size=\"9\" fill=\"#9ba3a9\">训练</text><circle cx=\"466\" cy=\"18\" r=\"3.1\" fill=\"#2f7d6b\"/><text x=\"474\" y=\"21.5\" font-size=\"9\" fill=\"#9ba3a9\">测试</text><text x=\"16\" y=\"258\" font-size=\"9.5\" fill=\"#79828a\">同一批数据，只改划分方式：R² 从 0.92 变成 0.98，但后者过半的测试点，最近的训练点就在同井相邻深度上。</text></svg></div><div class=\"figcap\"><b>图 3</b><span>划分方式决定指标的真假。左边是能交付的口径，右边是自欺欺人的口径 —— 两者差别不在模型，只在于&quot;测试点的邻居是不是就在旁边&quot;。</span></div><table class=\"dtable\"><thead><tr><th>指标</th><th>定义</th><th>本例取值</th></tr></thead><tbody><tr><td>RMSE（学习法）</td><td>按井划分，测试井全部深度点</td><td>1.54 p.u.</td></tr><tr><td>RMSE（密度公式）</td><td>同一测试集的公式基线</td><td>3.74 p.u.</td></tr><tr><td>R²（按井）</td><td>1 − SSE/SST，留出井</td><td>0.92</td></tr><tr><td>R²（随机划分）</td><td>同数据随机切分，仅作对照</td><td>0.98</td></tr><tr><td>Vsh &gt; 0.6 段 RMSE</td><td>泥质段单独统计（学习法 / 公式）</td><td>1.34 / 5.00 p.u.</td></tr></tbody></table>"
      },
      "fails": [
        {
          "name": "相带外推失效",
          "why": "训练井集中在三角洲前缘，模型遇到河道砂体时没有相似样本，误差会突然放大且不报警。解决方向是先用无监督方法检查测试井是否落在训练分布内。"
        },
        {
          "name": "气层被读成低孔",
          "why": "密度测井在含气段读数偏低，公式算出偏高孔隙度，学习法若只见过水层也会犯同样的错。必须把 DEN−CNL 差值作为特征显式喂进去。"
        },
        {
          "name": "岩心归位误差伪装成模型误差",
          "why": "0.3 m 的深度错位在薄互层里等于换了一层岩性，标签本身就是错的。要先做归位质控再谈模型精度。"
        },
        {
          "name": "薄储层被平滑掉",
          "why": "KNN 或平滑型模型会把 0.5 m 的薄层抹平。薄层要用序列模型（1D-CNN）并单独统计薄层误差。"
        }
      ]
    }
  }
};
  D.tabs.demo = {
    label: "可运行示范",
    intro: "拖动\"建模井数\"看学习曲线，切换\"按井 / 随机划分\"看 R² 怎么被划分方式骗出来 —— 右边的近邻同井率是关键读数。",
    mount: function (root, ctx) {
      if (typeof window.W2DEMO !== 'function') { root.innerHTML = '<div class="callout warn"><span class="ci">缺失</span><span>示范脚本未加载：请确认 index.html 中 <b>assets/cases/w2-reservoir-param.demo.js</b> 在 shell.js 之前引入。</span></div>'; return; }
      window.W2DEMO(root, ctx);
    }
  };
  Cases.register(D);
})();
