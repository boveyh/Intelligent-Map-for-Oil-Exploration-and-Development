/* =========================================================
   构建脚本：单一源 → 两份产物
   ---------------------------------------------------------
   输入  cases/<id>/content.js      案例正文（用 K 工具箱写）
         cases/<id>/demo/demo.js   可运行示范（自包含）

   输出  packages/<id>/case.json    上传包（可直接拖进「添加案例」）
         packages/<id>/demo/demo.js
         packages/<id>/README.txt
         assets/cases/<id>.case.js        插件（打开站点即见）
         assets/cases/<id>.demo.js
         index.html                       自动插入 script 标签

   用法：node tools/build-case.js [id ...]
   ========================================================= */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CASES = path.join(ROOT, 'cases');
const SITE = ROOT;   /* 站点就在仓库根目录，GitHub Pages 从 /(root) 部署 */
const PKG = path.join(ROOT, 'packages');
const { enrich, stories, plate, processHTML } = require('../cases/shared/visual-story.js');
const { wrapSource } = require('../cases/shared/demo-method.js');

/* K 工具箱是纯字符串函数，给个 window 壳就能在 Node 里跑 */
if (typeof global.window === 'undefined') global.window = {};
require(path.join(SITE, 'assets/core/kit.js'));
const K = global.window.K;

function readJSON(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }
function rmrf(p) { if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true }); }
function ensure(p) { fs.mkdirSync(p, { recursive: true }); }

/* ---------- 收集要构建的案例 ---------- */
function listCases() {
  const argv = process.argv.slice(2);
  const all = fs.readdirSync(CASES).filter((d) => fs.existsSync(path.join(CASES, d, 'content.js')));
  return argv.length ? all.filter((d) => argv.includes(d)) : all;
}

/* ---------- 读源码 ---------- */
function loadContent(id) {
  const mod = require(path.join(CASES, id, 'content.js'));
  const def = typeof mod === 'function' ? mod(K) : mod;
  if (!def || !def.id) throw new Error(id + ': content.js 没有返回含 id 的对象');
  if (!def.tabs || !def.tabs.background) throw new Error(id + ': 缺少 tabs.background');
  return enrich(def);
}

/* ---------- 插件源码 ---------- */
function pluginSource(def) {
  const g = def.demoGlobal || 'CASE_DEMO';
  const base = {
    id: def.id,
    sceneId: def.sceneId,
    title: def.title,
    summary: def.summary || '',
    previewImage: def.previewImage || '',
    algorithmType: def.algorithmType || '',
    status: def.status || 'ready',
    version: def.version || '1.0.0',
    updated: def.updated || '',
    methods: def.methods,
    tabs: {
      background: def.tabs.background,
      workflow: def.tabs.workflow
    }
  };
  const demo = def.tabs.demo || {};
  const fallback =
    "'<div class=\"callout warn\"><span class=\"ci\">缺失</span><span>示范脚本未加载：" +
    '请确认 index.html 中 <b>assets/cases/' + def.id + '.demo.js</b> 在 shell.js 之前引入。</span></div>\'';

  return '/* 自动生成，请勿手改 —— 源文件 cases/' + def.id + '/content.js */\n' +
    '(function () {\n' +
    '  var D = ' + JSON.stringify(base, null, 2) + ';\n' +
    '  var live;\n  D.tabs.demo = {\n' +
    '    label: ' + JSON.stringify(demo.label || '可运行示范') + ',\n' +
    '    intro: ' + JSON.stringify(demo.intro || '') + ',\n' +
    '    mount: function (root, ctx) {\n' +
    '      if (typeof window.' + g + ' !== \'function\') { root.innerHTML = ' + fallback + '; return; }\n' +
    '      live = window.' + g + '(root, ctx);\n' +
    '      return live;\n' +
    '    },\n' +
    '    unmount: function () { if (live && live.unmount) live.unmount(); live = null; }\n' +
    '  };\n' +
    '  var current=Cases.get(D.id); if(current && current.__lazyBuiltin && !current.imported){Object.assign(current,D);delete current.__lazyBuiltin;}else{Cases.register(D); }\n' +
    '})();\n';
}

/* ---------- 上传包清单 ---------- */
function packageJSON(def) {
  const demo = def.tabs.demo || {};
  return {
    id: def.id,
    sceneId: def.sceneId,
    title: def.title,
    summary: def.summary || '',
    status: def.status || 'ready',
    version: def.version || '1.0.0',
    updated: def.updated || '',
    methods: def.methods,
    tabs: {
      background: def.tabs.background,
      workflow: def.tabs.workflow,
      demo: {
        mode: 'module',
        js: 'demo/demo.js',
        label: demo.label || '可运行示范',
        intro: demo.intro || '',
        height: demo.height || 720
      }
    }
  };
}

function readme(def) {
  return [
    def.title + ' · 示范案例包',
    '='.repeat(40),
    '',
    '怎么用',
    '------',
    '1. 打开网站，点右上角「＋ 添加案例」；',
    '2. 把本文件夹整个拖进弹窗；',
    '3. 右侧逐项校验，全绿后点「校验并添加」；',
    '4. 页面自动跳到对应场景，三个 tab 立即出现。',
    '',
    '文件清单',
    '--------',
    '  case.json        清单：元信息 + 专业背景 + 案例流程（必需）',
    '  demo/demo.js     可运行示范（模块模式，挂进 Shadow DOM）',
    '  README.txt       本文件',
    '',
    '示范内容',
    '--------',
    (def.tabs.demo && def.tabs.demo.intro ? def.tabs.demo.intro : ''),
    '',
    '说明',
    '----',
    '纯前端、无外部依赖、无网络请求；所有数据在浏览器里按固定随机种子合成，',
    '交互指标由页面实时计算；背景和流程中的静态对照数值由 tools/test-*.js 复算。',
    '场景图为 AI 生成的静态概念模型，用于解释空间关系，不参与算法计算。'
  ].join('\n');
}

/* Add presentation to the original sample without changing its case or algorithm source. */
function builtinVisualSource() {
  const s = stories['welllog-layer'];
  const extra = {
    previewImage: 'assets/models/' + s.image + '.webp',
    algorithmType: s.type,
    background: plate(s),
    workflow: processHTML(s)
  };
  return '/* Generated presentation only; original sample algorithm remains unchanged. */\n' +
    '(function () {\n  var c = Cases.get("welllog-layer");\n  if (!c) return;\n' +
    '  var v = ' + JSON.stringify(extra) + ';\n' +
    '  c.previewImage = v.previewImage; c.algorithmType = v.algorithmType;\n' +
    '  c.tabs.background.sections[0].html = v.background + c.tabs.background.sections[0].html;\n' +
    '  c.tabs.workflow.metrics.html = v.workflow + c.tabs.workflow.metrics.html;\n' +
    '})();\n';
}

/* ---------- index.html 自动挂载 ---------- */
function patchIndex(ids) {
  const p = path.join(SITE, 'index.html');
  let html = fs.readFileSync(p, 'utf8');
  const B = '<!-- CASE-AUTOGEN:BEGIN -->';
  const E = '<!-- CASE-AUTOGEN:END -->';

  html = html.replace(new RegExp('[ \\t]*' + B + '[\\s\\S]*?' + E + '\\n?', 'g'), '');

  const block = ids.length
    ? [B, '<script src="assets/cases/welllog-layer.visual.js?v=20261103-expand1"></script>',
       '<script src="assets/cases/catalog.js?v=20261103-expand1"></script>',
       '<script src="assets/cases/w4-lithology.demo.js?v=20261103-expand1"></script>',
       '<script src="assets/core/builtin-loader.js?v=20261103-expand1"></script>', E, ''].join('\n')
    : '';

  const marker = '<!-- ↑ 新案例加在这里';
  if (block && html.indexOf(marker) >= 0) {
    html = html.replace(marker, block + '\n' + marker);
  } else if (block) {
    html = html.replace('</head>', '');
    html = html.replace('<script src="assets/core/case-demo-host.js', block + '\n<script src="assets/core/case-demo-host.js');
  }
  fs.writeFileSync(p, html, 'utf8');
}

/* ---------- 主流程 ---------- */
function main() {
  const ids = listCases();
  if (!ids.length) { console.log('没有找到可构建的案例'); return; }

  ensure(PKG);
  ensure(path.join(SITE, 'assets/cases'));
  fs.writeFileSync(path.join(SITE, 'assets/cases/welllog-layer.visual.js'), builtinVisualSource(), 'utf8');

  const built = [];
  ids.forEach((id) => {
    const def = loadContent(id);
    const pkgDir = path.join(PKG, id);
    rmrf(pkgDir);
    ensure(path.join(pkgDir, 'demo'));

    fs.writeFileSync(path.join(pkgDir, 'case.json'), JSON.stringify(packageJSON(def), null, 2), 'utf8');
    const demoSource = wrapSource(fs.readFileSync(path.join(CASES, id, 'demo/demo.js'), 'utf8'), id, def.demoGlobal || 'CASE_DEMO');
    fs.writeFileSync(path.join(pkgDir, 'demo/demo.js'), demoSource, 'utf8');
    fs.writeFileSync(path.join(pkgDir, 'README.txt'), readme(def), 'utf8');

    fs.writeFileSync(path.join(SITE, 'assets/cases', id + '.case.js'), pluginSource(def), 'utf8');
    fs.writeFileSync(path.join(SITE, 'assets/cases', id + '.demo.js'), demoSource, 'utf8');

    const kb = (fs.statSync(path.join(pkgDir, 'case.json')).size +
      fs.statSync(path.join(pkgDir, 'demo/demo.js')).size) / 1024;
    built.push({ id, kb: kb.toFixed(1), title: def.title });
    console.log('✓ ' + id + '  ' + def.title + '  ' + kb.toFixed(1) + ' KB');
  });

  /* 用全部已生成的插件重建挂载块，避免删一个案例后残留 */
  const allPlugins = fs.readdirSync(path.join(SITE, 'assets/cases'))
    .filter((f) => f.endsWith('.case.js') && !f.startsWith('_') && f !== 'welllog-layer.case.js')
    .map((f) => f.replace(/\.case\.js$/, ''));
  const catalog=allPlugins.sort().map(id=>{const d=loadContent(id);return {id:d.id,sceneId:d.sceneId,title:d.title,summary:d.summary,previewImage:d.previewImage,algorithmType:d.algorithmType,methods:d.methods,status:d.status,version:d.version,updated:d.updated,__lazyBuiltin:true,__builtinAssets:true,__demoGlobal:d.demoGlobal,tabs:{background:{judge:d.tabs.background.judge},workflow:{},demo:{}}};});
  fs.writeFileSync(path.join(SITE,'assets/cases/catalog.js'),'/* Generated lightweight built-in catalog. */\n'+catalog.map(d=>'Cases.register('+JSON.stringify(d)+');').join('\n')+'\n');
  patchIndex(allPlugins.sort());

  console.log('\n产物：packages/ 与 assets/cases/，index.html 已更新（' + allPlugins.length + ' 个插件）');
}

main();
