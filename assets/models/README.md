# 场景模型图

`geological-contours.svg` 是首页首屏以下区域使用的静态地层线装饰，仅在页面边缘低对比呈现。它不是实测图或算法结果，不计入23张案例专属图。

2026-10-30 使用内置 image_gen 生成九张 1536×1024 概念模型图，转换为 WebP 用于站点。暖白背景、砂岩/页岩材质、青绿标记、金属仪器、柔和光照保持统一。

| 案例 | 专属图片 | 画面主题 |
|---|---|---|
| w1 分层样例 | layering.webp | 连续地层的候选分层界面 |
| w1 监督层界识别 | boundary-learning.webp | 独立井芯样本与跨井层界线索，新增独立构图 |
| w2 储层参数 | reservoir.webp | 测井工具、储层和孔隙空间 |
| w3 裂缝识别 | fracture.webp | 井壁裂缝与展开纹理 |
| w4 岩性识别 | lithology.webp | 连续井芯与五种岩性样品 |
| w5 缺失段补全 | reconstruction.webp | 扩径段缺测、相关输入与估计值 |
| w5 多井标准化 | multiwell.webp | 多井共用标志层 |
| m1 岩屑识别 | cuttings.webp | 岩屑返出、分样与显微观察 |
| c1 固井评价 | cement.webp | 套管、水泥环与声波测量 |
| pr1 工况诊断 | pump.webp | 抽油机与井下柱塞泵 |

提示词原文见 prompts.json 与 prompts-unique-cases.json。后三张使用现有储层图作为统一风格参考；原始 PNG 保留于生成工具返回的目录。
这些图不是实测资料、工程蓝图、有限元结果或储层数值模拟结果，不按真实比例。
所有场景主图均为静态图，扫描层已移除。2026-11-01 新增监督层界案例图片，使用原分层图作材质与配色参考，独立构图、单独保存，共十例十张不同图片。首页过程动画由实际 KNN 数据生成 SVG，不使用场景图片放大代替算法过程。
上传包背景图使用内嵌 data URL，接收方无需复制模型目录或修改主站。

2026-11-01 新增首页装饰背景 `home-strata-background.webp`（源图同名 PNG），由内置 image_gen 生成。主题为暖砂岩/青绿色地层剖面和测井探头，顶部留白；页面用渐变保护文字可读性。它只由首页 CSS 引用，不计入十张案例专属主图，也不打入案例包。生成提示词见 `home-strata-background.prompt.txt`。

## 2026-11-03 扩展与包体优化

新增十三张由内置image_gen生成的独立概念图；全部使用暖白、砂岩/页岩、金属、青绿色和柔和光照。960×640 WebP，13张总计1,074,532字节。完整提示词、源摘要和输出摘要见[prompts-expansion-2026-11-03.json](prompts-expansion-2026-11-03.json)。图片按分镜逐张检查，构图不同；数值图和回放由实际数据绘制，不把概念图冒充仿真。

|新案例|专属图片|
|---|---|
|钻井多参数异常预警|drilling-warning.webp|
|地震剖面断层智能识别|seismic-fault.webp|
|管道泄漏识别与区段定位|pipeline-leak.webp|
|产品质量在线软测量|quality-soft-sensor.webp|
|地球化学组合异常识别|geochem.webp|
|分段滑套智能调控|zonal-control.webp|
|射孔弹型候选智能排序|charge-ranking.webp|
|套管局部变形智能识别|casing-deformation.webp|
|化学驱配方主动筛选|formulation-search.webp|
|气测异常事件智能识别|gas-events.webp|
|跨井地层智能对比|crosswell-correlation.webp|
|固井顶替方案智能筛选|cement-displacement.webp|
|产量智能预测与区间检验|production-forecast.webp|

原十图只做960×640缩放和WebP80格式压缩，2,197,332→987,918字节，内容和构图保留；原文件可从git历史恢复，转换摘要见[optimization-2026-11-03.json](optimization-2026-11-03.json)。解决原上传器同时持久化22包时的容量问题，不改上传协议。23张案例主图各自唯一；首页装饰背景不计案例图。
