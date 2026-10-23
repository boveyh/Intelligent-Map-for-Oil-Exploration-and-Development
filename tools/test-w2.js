/* w2 自测：直接调用 demo.js 里的生成器与评估器，核对文案要引用的数字。 */
global.window = {};
require('../cases/w2-reservoir-param/demo/demo.js');
const T = global.window.__W2TEST__;

const wells = T.buildWells();
const a = T.evaluate(wells, 10, 'well');
const b = T.evaluate(wells, 10, 'random');

const p = (x) => (x * 100).toFixed(2);
console.log('按井划分  n=' + a.n, 'R2=' + a.r2.toFixed(3), 'RMSE=' + p(a.rmse), '公式=' + p(a.rmseF), '同井率=' + (a.sameWell * 100).toFixed(0) + '%');
console.log('随机划分  n=' + b.n, 'R2=' + b.r2.toFixed(3), 'RMSE=' + p(b.rmse), '同井率=' + (b.sameWell * 100).toFixed(0) + '%');
console.log('公式 R2 =', a.r2f.toFixed(3));
console.log('泥质分组:', a.bins.filter(Boolean).map(x => 'vsh' + x.vsh.toFixed(2) + ' ML' + p(x.ml) + '/FM' + p(x.fm)).join('  '));

[1, 3, 5, 10].forEach(n => {
  const e = T.evaluate(wells, n, 'well');
  console.log('  建模 ' + n + ' 口井: R2=' + e.r2.toFixed(3) + ' RMSE=' + p(e.rmse));
});

['profile', 'scatter', 'bins'].forEach(k => {
  const svg = T.draw[k](a);
  const open = (svg.match(/<svg/g) || []).length, close = (svg.match(/<\/svg>/g) || []).length;
  console.log('  图 ' + k + ': ' + svg.length + ' 字节, svg ' + open + '/' + close + ', NaN=' + /NaN|undefined/.test(svg));
});
