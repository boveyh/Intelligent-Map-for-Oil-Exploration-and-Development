# 十三例扩展验收 · 2026-11-03

当前22个自制案例＋1个原框架样例，共23个；原13模块每个新增一例，61个原场景保持，未恢复w6/w7。测井7个自制，其中五主例、一个标准化配套、一个跨井扩展。

## 已验证

|范围|证据|结论与限制|
|---|---|---|
|十三例模型|[模型检查](expansion/models-checks.json)|39个单点零扰动等于同路径预测；改输入改变中间量；改测试真值不改变推理；过去窗口与16次主动实验预算检查|
|三部分与小屏|[78项浏览器记录](expansion/browser-checks.json)|13例×背景/流程/演示×1280/375；无横溢出、坏图、挂载错误；键盘选点/试算/恢复、三步高亮、方法切换、实际回放与具名可访问滑杆|
|原站互导|[22包原站导入](expansion/original-checks.json)|未修改课程原站实际导入22包；18个实际单点面板可操作；刷新恢复22条。测试浏览器Chrome，不保证其他浏览器配额|
|原接口|[九文件哈希](expansion/original-file-hashes.json)|上传器、注册表、宿主、原案例及firstbreak文件与下载原版一致；sceneId仍来自原61场景|
|场景图|[23图映射及提示词](../../assets/models/README.md)|23张主图内容摘要互异；新增13张，共1,074,532字节。图片为概念图，演示推理另用真实数据SVG/canvas|
|条件审计|[报告](expansion-audit.md) / [JSON](expansion-audit.json)|117组设置×8个配对独立对象=936次；同一冻结模型，不按测试集调参；不是物理校准|
|首页/查看器|[呈现检查](expansion/presentation-checks.json)|13模块全部有入口；18个审计案例、179组设置；减少动态偏好暂停回放|

另外保留原五主例45项浏览器回归、单点契约、ZIP64/路径穿越/实际解压上限、原Hough/真实KNN/原首页生命周期检查。自动化键盘与AX树检查不等于真人屏幕阅读器测试；用户已选择不做真人教学测试，当前没有教学通过率或完成用时证据。

## 存储问题及修复

最初22包合计5,776,244字节，原站能逐个运行，但刷新只恢复20条；原存储会保存清单与文件文本，不能把包体总字节直接当作存储占用。保留原协议，将旧十张1536×1024图仅缩放、格式压至960×640：2,197,332→987,918字节。新十三张同尺寸，图片内容/构图不变。

当前22包合计4,331,505字节，单包137.4—245.2 KiB。实际原站重新导入22包，刷新恢复22条。没有增加浏览器权限、修改配额或改用私有接口；其他浏览器、本地已有大量数据仍可能达到各自存储上限。

试算滑杆另修复两点：先配置步长/范围再恢复试算值，防止浏览器初始范围调整把0挤到端点；质量例范围改为±0.24、步长0.02，保证0在合法刻度上。约束开度在1处向上试算会被夹回1，这是明确物理边界，验收改为向范围内部试算。模型数值与评价没有因此调优。

## 全部新增案例截图

|案例|背景|流程|演示 / 桌面 / 375px|
|---|---|---|---|
|钻井多参数异常预警|[入口](../../index.html#/scene/d2?case=d2-drilling-warning&tab=bg)|[入口](../../index.html#/scene/d2?case=d2-drilling-warning&tab=flow)|[入口](../../index.html#/scene/d2?case=d2-drilling-warning&tab=demo) · [1280px](expansion/d2-drilling-warning-1280.webp) · [375px](expansion/d2-drilling-warning-375.webp)|
|地震剖面断层智能识别|[入口](../../index.html#/scene/s1?case=s1-seismic-fault&tab=bg)|[入口](../../index.html#/scene/s1?case=s1-seismic-fault&tab=flow)|[入口](../../index.html#/scene/s1?case=s1-seismic-fault&tab=demo) · [1280px](expansion/s1-seismic-fault-1280.webp) · [375px](expansion/s1-seismic-fault-375.webp)|
|管道泄漏识别与区段定位|[入口](../../index.html#/scene/t1?case=t1-pipeline-leak&tab=bg)|[入口](../../index.html#/scene/t1?case=t1-pipeline-leak&tab=flow)|[入口](../../index.html#/scene/t1?case=t1-pipeline-leak&tab=demo) · [1280px](expansion/t1-pipeline-leak-1280.webp) · [375px](expansion/t1-pipeline-leak-375.webp)|
|产品质量在线软测量|[入口](../../index.html#/scene/r5?case=r5-quality-soft-sensor&tab=bg)|[入口](../../index.html#/scene/r5?case=r5-quality-soft-sensor&tab=flow)|[入口](../../index.html#/scene/r5?case=r5-quality-soft-sensor&tab=demo) · [1280px](expansion/r5-quality-soft-sensor-1280.webp) · [375px](expansion/r5-quality-soft-sensor-375.webp)|
|地球化学组合异常识别|[入口](../../index.html#/scene/g2?case=g2-geochem-anomaly&tab=bg)|[入口](../../index.html#/scene/g2?case=g2-geochem-anomaly&tab=flow)|[入口](../../index.html#/scene/g2?case=g2-geochem-anomaly&tab=demo) · [1280px](expansion/g2-geochem-anomaly-1280.webp) · [375px](expansion/g2-geochem-anomaly-375.webp)|
|分段滑套智能调控|[入口](../../index.html#/scene/co4?case=co4-zonal-control&tab=bg)|[入口](../../index.html#/scene/co4?case=co4-zonal-control&tab=flow)|[入口](../../index.html#/scene/co4?case=co4-zonal-control&tab=demo) · [1280px](expansion/co4-zonal-control-1280.webp) · [375px](expansion/co4-zonal-control-375.webp)|
|射孔弹型候选智能排序|[入口](../../index.html#/scene/p3?case=p3-charge-ranking&tab=bg)|[入口](../../index.html#/scene/p3?case=p3-charge-ranking&tab=flow)|[入口](../../index.html#/scene/p3?case=p3-charge-ranking&tab=demo) · [1280px](expansion/p3-charge-ranking-1280.webp) · [375px](expansion/p3-charge-ranking-375.webp)|
|套管局部变形智能识别|[入口](../../index.html#/scene/wo3?case=wo3-casing-deformation&tab=bg)|[入口](../../index.html#/scene/wo3?case=wo3-casing-deformation&tab=flow)|[入口](../../index.html#/scene/wo3?case=wo3-casing-deformation&tab=demo) · [1280px](expansion/wo3-casing-deformation-1280.webp) · [375px](expansion/wo3-casing-deformation-375.webp)|
|化学驱配方主动筛选|[入口](../../index.html#/scene/e3?case=e3-formulation-search&tab=bg)|[入口](../../index.html#/scene/e3?case=e3-formulation-search&tab=flow)|[入口](../../index.html#/scene/e3?case=e3-formulation-search&tab=demo) · [1280px](expansion/e3-formulation-search-1280.webp) · [375px](expansion/e3-formulation-search-375.webp)|
|气测异常事件智能识别|[入口](../../index.html#/scene/m2?case=m2-gas-events&tab=bg)|[入口](../../index.html#/scene/m2?case=m2-gas-events&tab=flow)|[入口](../../index.html#/scene/m2?case=m2-gas-events&tab=demo) · [1280px](expansion/m2-gas-events-1280.webp) · [375px](expansion/m2-gas-events-375.webp)|
|跨井地层智能对比|[入口](../../index.html#/scene/w1?case=w1-crosswell-correlation&tab=bg)|[入口](../../index.html#/scene/w1?case=w1-crosswell-correlation&tab=flow)|[入口](../../index.html#/scene/w1?case=w1-crosswell-correlation&tab=demo) · [1280px](expansion/w1-crosswell-correlation-1280.webp) · [375px](expansion/w1-crosswell-correlation-375.webp)|
|固井顶替方案智能筛选|[入口](../../index.html#/scene/c2?case=c2-cement-displacement&tab=bg)|[入口](../../index.html#/scene/c2?case=c2-cement-displacement&tab=flow)|[入口](../../index.html#/scene/c2?case=c2-cement-displacement&tab=demo) · [1280px](expansion/c2-cement-displacement-1280.webp) · [375px](expansion/c2-cement-displacement-375.webp)|
|产量智能预测与区间检验|[入口](../../index.html#/scene/pr2?case=pr2-production-forecast&tab=bg)|[入口](../../index.html#/scene/pr2?case=pr2-production-forecast&tab=flow)|[入口](../../index.html#/scene/pr2?case=pr2-production-forecast&tab=demo) · [1280px](expansion/pr2-production-forecast-1280.webp) · [375px](expansion/pr2-production-forecast-375.webp)|

截图取自实际操作后的场景区域；三部分的检查结果在78项记录中，不把一张图冒充完整操作证据。计划中的GR全曲线DTW、三维分割、CFD和部分固定方案对照未实现；具体差异已回填扩展计划。

## 仍需改进

外部审阅生成假设、接入许可明确的真实观测并冻结评价、复核原辅助例c1的迁移边界、真实屏幕阅读器与更多浏览器。全部数值为合成测试；重复满分和学习败给规则均公开。95分仍是目标，没有第三方评分或教学实证。

公网发布、资源哈希和首屏测量另见发布记录；上述本地检查不能自动证明公网版本已更新。
