/* =========================================================
   案例包自检：按「添加案例」弹窗的校验口径逐项检查
   ---------------------------------------------------------
   用法：node tools/validate.js
   检查项与 assets/core/case-upload.js 的 validate() 对齐，
   任何 ✕ 都会导致上传失败，△ 只是提示。
   ========================================================= */

'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

/* 读 data.js 拿到全站场景 id */
global.window = {};
require(path.join(ROOT, 'assets/data.js'));
const ATLAS = global.window.ATLAS;
const scenes = {};
ATLAS.stages.forEach((st) => st.scenes.forEach((sc) => { scenes[sc.id] = { stage: st.name, scene: sc }; }));

const PKG = path.join(ROOT, 'packages');
const dirs = fs.readdirSync(PKG).filter((d) => fs.statSync(path.join(PKG, d)).isDirectory());

let fail = 0, warn = 0;
const bound = {};

dirs.forEach((id) => {
  const dir = path.join(PKG, id);
  const problems = [];
  const notes = [];

  const jsonPath = path.join(dir, 'case.json');
  if (!fs.existsSync(jsonPath)) { problems.push('缺少 case.json'); }
  let pkg = null;
  try { pkg = JSON.parse(fs.readFileSync(jsonPath, 'utf8')); }
  catch (e) { problems.push('case.json 不是合法 JSON：' + e.message); }

  if (pkg) {
    if (!/^[a-z0-9][a-z0-9-]*$/.test(pkg.id || '')) problems.push('id 不是 kebab-case：' + pkg.id);
    if (pkg.id !== id) problems.push('id 与目录名不一致');
    if (!pkg.sceneId) problems.push('缺少 sceneId');
    else if (!scenes[pkg.sceneId]) problems.push('sceneId 不存在于 data.js：' + pkg.sceneId);
    else {
      bound[pkg.sceneId] = (bound[pkg.sceneId] || []).concat(id);
    }
    if (!pkg.title) problems.push('缺少 title');
    else if (pkg.title.length > 40) notes.push('title 偏长（' + pkg.title.length + ' 字）');

    const t = pkg.tabs || {};
    const b = t.background || {};
    const secs = b.sections || [];
    if (!secs.length) problems.push('background.sections 为空');
    secs.forEach((s, i) => {
      if (!s.title) problems.push('sections[' + i + '] 缺 title');
      if (!s.html) problems.push('sections[' + i + '] 缺 html');
    });
    if (secs.length < 4) notes.push('只有 ' + secs.length + ' 段（建议四段）');
    if (b.judge && b.judge.length !== 4) notes.push('judge 有 ' + b.judge.length + ' 项（建议 4 项）');
    if (!b.lede) notes.push('缺少 lede');

    const w = t.workflow || {};
    if (!w.steps || !w.steps.length) problems.push('workflow.steps 为空');
    else w.steps.forEach((s, i) => { if (!s.name) problems.push('steps[' + i + '] 缺 name'); });

    /* 示范 */
    const cfg = t.demo || {};
    const jsPath = path.join(dir, 'demo', 'demo.js');
    const htmlPath = path.join(dir, 'demo', 'index.html');
    if (!fs.existsSync(jsPath) && !fs.existsSync(htmlPath)) notes.push('没有可运行示范');
    else if (fs.existsSync(jsPath)) {
      const code = fs.readFileSync(jsPath, 'utf8');
      if (!/__CASE_MOUNT__|module\.exports|exports\.mount/.test(code)) {
        problems.push('demo.js 没有导出 mount（需要 window.__CASE_MOUNT__ 或 module.exports）');
      }
      if (/<\/script/i.test(code)) problems.push('demo.js 里含有 </script 字面量，会截断');
    }

    /* 体积 */
    const size = (fs.statSync(jsonPath).size + (fs.existsSync(jsPath) ? fs.statSync(jsPath).size : 0)) / 1024;
    if (size > 6 * 1024) problems.push('包太大：' + size.toFixed(0) + ' KB');
    else if (size > 1536) notes.push('包偏大：' + size.toFixed(0) + ' KB');
    notes.push('体积 ' + size.toFixed(1) + ' KB');
  }

  const tag = problems.length ? '✕' : '✓';
  const where = pkg && scenes[pkg.sceneId] ? ' → ' + scenes[pkg.sceneId].stage + ' / ' + scenes[pkg.sceneId].scene.name : '';
  console.log(tag + ' ' + id + (pkg ? ' · ' + pkg.title : '') + where);
  problems.forEach((p) => console.log('    ✕ ' + p));
  notes.forEach((n) => console.log('    △ ' + n));
  fail += problems.length;
  warn += notes.length;
});

/* 场景绑定冲突 */
Object.keys(bound).forEach((k) => {
  if (bound[k].length > 1) {
    console.log('△ 场景 ' + k + ' 绑定多个案例：' + bound[k].join(', ') + '（按不同 id 并存，由页顶切换器选择）');
    warn++;
  }
});

console.log('\n共 ' + dirs.length + ' 个包：' + fail + ' 个错误，' + warn + ' 个提示');
console.log('全站场景数：' + Object.keys(scenes).length + '（data.js）');
process.exit(fail ? 1 : 0);
