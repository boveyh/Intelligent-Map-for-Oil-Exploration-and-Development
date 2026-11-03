# 石油作业智能化案例站点

展示具体作业任务里的数据、算法介入、传统对照、判断变化和人工复核。
入口是根目录 index.html，纯前端，无算法后端。可用静态服务器或 GitHub Pages 预览。

2026-11-03：新增五主例单点可追查、分步引导、生成器敏感性自审与案例懒加载。用户决定不开展真人测试，教学效果未验证。公开审计见 [查看器](docs/evidence.html) / [完整报告](docs/evidence/generator-audit.md)，真人测试方案见 [PROTOCOL](docs/teaching-test/PROTOCOL.md)。

当前：9 个自制案例 + 1 个框架样例；测井有 5 个主要学习案例、1 个标准化配套案例与原框架样例。13 个环节、61 个原场景，w6/w7 已淘汰。首页按测井任务组织，其他案例和外部导入继续自动显示。
在线入口：[GitHub Pages](https://boveyh.github.io/Intelligent-Map-for-Oil-Exploration-and-Development/)。项目说明、作业要求对照、改进路线与 AI 评分指令见 [Proposal](docs/PROPOSAL.md)。
核查、案例评价、局限和后续优先级见 [PLAN.md](PLAN.md)。
已核查的优秀项目及具体借鉴方式见 [智能化案例参考与改进](docs/2026-10-31-智能化案例参考与改进.md)。

## 本地预览

```sh
python -m http.server 8014 --bind 127.0.0.1
```

浏览器打开 http://127.0.0.1:8014/ 。**当前改版支持 HTTP(S)，不支持 file:// 双击路径**，请使用上面的本地服务器或 GitHub Pages。审计查看器会读取 JSON，浏览器的 file 跨源限制会使该路径失败；原框架可双击打开不等于改版已经验证。

## 文件

- cases/<id>/content.js：背景、流程、说明的源文件。
- cases/<id>/demo/demo.js：独立算法演示，自带样式。
- cases/shared/visual-story.js：模型图和“输入—介入—输出—影响”说明的构建源。
- cases/shared/demo-method.js：九个自制演示的实际方法、作用机制、验证操作与运行证据；构建时写入独立包。
- assets/models/：十张独立场景模型图、提示词与用途说明。
- assets/cases/：生成的插件，勿手改。
- packages/<id>/：生成的可导入包。背景模型图已内嵌，不需接收方改主站。
- assets/core/：原站点外壳、注册、导入与演示宿主。
- firstbreak-pick-case/：保留原始样例。

## 构建与核查

```sh
node tools/build-case.js
node tools/validate.js
node tools/check-visual-story.js
node tools/check-decision-evidence.js
node tools/check-learning-cases.js
node tools/check-original-interface.js
node tools/check-home-animation.js
node tools/check-demo-method.js
node tools/check-single-point-trace.js
node tools/audit-generators.js
node tools/check-case-zip.js
```

tools/test-w2.js、test-w3.js、test-w4.js、test-w5.js、test-w5n.js、test-m1.js、test-c1.js、test-pr1.js 可复算合成实验指标。
主要复算脚本已改为仓库相对路径。审计需要 Node 22+；ZIP 检查需 Python。浏览器验收需本机 Chrome 与 Playwright（仅测试依赖），运行 tools/check-browser-evidence.js；原站互导用 tools/check-original-browser.js，并先在独立端口提供课程原站。OIL_PLAYWRIGHT 可指定已有 Playwright 模块路径。页面本身不需这些测试依赖。

## 添加案例

右上角“添加案例”，可选择包内文件、整个文件夹，或“选择 ZIP 压缩包”。ZIP 可带顶层目录，也可直接拖入虚线框；每包一个 case.json，解包后继续用原校验器。支持普通 ZIP 的 Store/Deflate，不支持 RAR、7z、加密/分卷/ZIP64；展开文件总量仍不超过 6 MB。解压在浏览器本地完成。
不同 id 可挂同一个 sceneId，页顶切换；原上传器会拦截已被占用的 id，需使用新 id 或先移除旧的本地上传记录。
导入记录保存在当前浏览器当前站点的本地存储，换电脑或换站点需重新导入。
首次接入场景的操作细节见 docs/如何添加新案例.md。

## 证据范围

自制案例用固定随机种子的合成数据演示算法；数字不是现场效果。
AI 模型图只解释空间关系，不是工程仿真计算或测量结果。案例主图为静态图，各自独立、风格统一；首页案例窗用实际 KNN 数据呈现，默认暂停，主动播放后每 15 秒换段，播放“曲线—近邻投票—岩性判断”，可以暂停，离开首页时清理定时器。
w3 保留 Hough 几何基线，并增加由标注合成图像训练的候选分类器；独立留出中误报减少、漏检增加，整体 F1 略低于基线。多井标准化是数据质量配套，不统称深度学习。

2026-11-01 已用下载的原站实际导入并运行九个自制包，并将原 firstbreak 包导入改版站核对交互和刷新恢复。原上传器、注册表、演示宿主及样例文件与下载原版的哈希一致。页面与互导记录见 [验收与历史边界](docs/evidence/acceptance-2026-11-03.md)。
