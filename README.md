# 石油勘探开发的智能化可能性地图 · 案例工程

课程作业：在给定的门户框架上，为「测井」类别补齐全部子场景的可运行案例，并向邻接环节外延。

**站点就在仓库根目录，GitHub Pages 选 `main` / `/(root)` 即可直接跑，无需任何构建。**

## 目录

```
index.html                唯一入口，脚本加载顺序在此（GitHub Pages 根就是它）
assets/data.js            13 环节 / 63 场景元数据（已新增测井 w6 / w7）
assets/core/              外壳：路由、导航、组件、上传与示范宿主
assets/cases/             自动生成的案例插件（勿手改）
docs/                     框架自带文档：如何添加新案例
firstbreak-pick-case/     框架自带样例（考核用，勿改）

cases/<案例 id>/          案例源文件（唯一要手写的地方）
  content.js              正文：专业背景 + 案例流程（用 K 工具箱写版式）
  demo/demo.js            可运行示范：自包含，无外部依赖

packages/<案例 id>/       构建产物：可拖进「添加案例」的案例包
  case.json               清单（HTML 已展开为最终字符串）
  demo/demo.js            示范（模块模式，挂进 Shadow DOM）
  README.txt              给使用者的说明

tools/                    构建与自检
shots/                    开发期截图（不提交，git 已忽略）
```

## 三条命令

```bash
node tools/build-case.js          # 单一源 → 插件 + 上传包 + 自动挂 index.html
node tools/validate.js            # 按「添加案例」的口径逐项自检，有错退出码 1
node tools/test-w2.js             # 复算示范里的指标（防止文案和代码不一致）
```

## 部署到 GitHub Pages

1. 把仓库推到 GitHub（`main` 分支）；
2. 仓库 Settings → Pages → Source 选 **Deploy from a branch**，分支 `main`，目录 **`/(root)`**，保存；
3. 约 1 分钟后访问 `https://<用户名>.github.io/<仓库名>/`。

仓库里有 `.nojekyll`，作用是让 Pages 原样发布文件、不跑 Jekyll ——
否则 `assets/cases/_template.case.js` 这类以下划线开头的文件会被当成 Jekyll 内部文件吃掉。

本地无需服务器：直接双击 `index.html` 就能用（全部相对路径 + hash 路由）。
用 VS Code 的 Live Server 打开也可以，两者行为一致。

## 增加一个案例

1. 复制 `cases/w2-reservoir-param/` 成 `cases/<新 id>/`；
2. 改 `content.js` 里的 `id / sceneId / title / 三块内容`（`sceneId` 必须存在于 `data.js`）；
3. 改 `demo/demo.js` 的挂载函数名，并把 `window.W2DEMO` 换成新的全局名、同步 `content.js` 末尾的 `demoGlobal`；
4. `node tools/build-case.js && node tools/validate.js`；
5. 若该场景首次接入，去 `assets/data.js` 给它加 `demo: true`（否则案例库会提示"场景未标记 demo:true"）。

## 为什么是「单一源 + 两份产物」

`case.json` 里的 html 是纯字符串，不能用 `K.*`；插件里又最好用 `K.*` 保持版式一致。
所以正文只写一份（`content.js`，用 K），构建时序列化成两份：插件内联同样的字符串，上传包则是展开后的最终 HTML —— 两边渲染结果一致，改一次两边都变。

示范脚本必须**自包含**（自己注入 `<style>`、不依赖站点 CSS、不碰 `document`），
这样同一份文件既能被插件直接 mount 到页面里，也能被上传宿主挂进 Shadow DOM。

## 已接入

| 场景 | 案例 | 状态 |
|---|---|---|
| w1 测井曲线智能分层 | `welllog-layer`（框架自带） | 保留原样，不计入本次工作量 |
| w2 储层参数智能解释 | `w2-reservoir-param` | 已完成，插件 + 上传包双产物 |
| w6 测井解释报告智能成文 | — | 已新增场景，待接入 |
| w7 测井相智能识别 | — | 已新增场景，待接入 |
