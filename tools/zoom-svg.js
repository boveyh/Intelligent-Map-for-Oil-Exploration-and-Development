/* 从 shots/_content.html 里抽出第 n 个 SVG，居中放大渲染，便于逐图核对 */
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const src = fs.readFileSync(path.join(ROOT, 'shots/_content.html'), 'utf8');
const all = src.match(/<svg[\s\S]*?<\/svg>/g) || [];
const n = Number(process.argv[2] || 1) - 1;
if (!all[n]) { console.error('没有第 ' + (n + 1) + ' 张图'); process.exit(1); }
const vb = /viewBox="0 0 (\d+) (\d+)"/.exec(all[n]);
const w = Number(vb[1]), h = Number(vb[2]);
const scale = 1100 / w;
const html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{margin:0;background:#fdfcf9;padding:16px}' +
  'svg{width:' + (w * scale).toFixed(0) + 'px;height:auto;display:block}</style></head><body>' + all[n] + '</body></html>';
fs.writeFileSync(path.join(ROOT, 'shots/_zoom.html'), html);
console.log('第 ' + (n + 1) + ' 张图 ' + w + '×' + h + ' → 宽 ' + (w * scale).toFixed(0));
