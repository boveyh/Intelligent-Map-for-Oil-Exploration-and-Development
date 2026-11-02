/* 把某个案例的内容单独渲染成一个 HTML，便于截图逐块检查版式。
   用法：node tools/preview-html.js <caseId> [bg|wf|m|all] */
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
global.window = {};
require(path.join(ROOT, 'assets/core/kit.js'));
const K = global.window.K;

const id = process.argv[2] || 'w2-reservoir-param';
const mode = process.argv[3] || 'all';
const def = require(path.join(ROOT, 'cases', id, 'content.js'))(K);

const bg = def.tabs.background.sections.map(s => K.sec4(s.no, s.en, s.title, s.html)).join('');
const wf = def.tabs.workflow;

const blocks = [];
if (mode === 'all' || mode === 'bg') blocks.push('<h2 class="t">BACKGROUND</h2>' + bg);
if (mode === 'all' || mode === 'wf') {
  blocks.push('<h2 class="t">WORKFLOW</h2>' +
    '<h3>' + wf.title + '</h3>' +
    wf.lead.map(p => '<p>' + K.rich(p) + '</p>').join('') +
    K.cells(wf.stats) + K.pipeline(wf.steps) +
    '<h3>' + wf.metrics.title + '</h3>' + wf.metrics.html + K.fails(wf.fails));
}
if (mode === 'm') blocks.push('<h3>' + wf.metrics.title + '</h3>' + wf.metrics.html);
/* bg1 / bg2 / bg3 …：只渲染背景里的第 n 节，便于逐张图截图核对 */
if (/^bg\d+$/.test(mode)) {
  const k = Number(mode.slice(2)) - 1;
  const sec = def.tabs.background.sections[k];
  blocks.push(K.sec4(sec.no, sec.en, sec.title, sec.html));
}
if (/^wfstep$/.test(mode)) blocks.push(K.pipeline(wf.steps));

const html = '<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8">' +
  '<link rel="stylesheet" href="../assets/core/tokens.css">' +
  '<link rel="stylesheet" href="../assets/core/layout.css">' +
  '<link rel="stylesheet" href="../assets/core/ui.css">' +
  '<style>body{margin:0;padding:32px;background:#fdfcf9}.wrap{max-width:720px;margin:0 auto}' +
  'h2.t{font-size:13px;letter-spacing:.2em;color:#b26a39;font-family:monospace;margin:34px 0 10px}</style>' +
  '</head><body><div class="wrap">' + blocks.join('\n') + '</div></body></html>';

fs.writeFileSync(path.join(ROOT, 'shots/_content.html'), html, 'utf8');
console.log('written shots/_content.html (' + mode + ')');
