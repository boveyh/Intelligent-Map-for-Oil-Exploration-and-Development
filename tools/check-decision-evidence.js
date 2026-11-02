'use strict';
const assert = require('assert');
global.window = {};
require('../cases/pr1-dynamometer/demo/demo.js');
require('../cases/c1-cement/demo/demo.js');
const P = window.PR1CORE, C = window.C1CORE;
const geometric = [0, 1, 2, 3, 4, 5];

// A controlled prototype differs only by +2 in ripple: distance must be 2, or 0 when omitted.
const pts = P.card('ok', 1, 1234), f = P.feats(pts);
const prototype = Object.assign({}, f, { rip: f.rip + 2 });
assert(Math.abs(P.classify(pts, [prototype]).d[0] - 2) < 1e-12);
assert.strictEqual(P.classify(pts, [prototype], geometric).d[0], 0);
const tpl = P.templates();
for (const kind of P.KIND) for (const keep of [undefined, geometric]) {
  const sample = P.card(kind.k, 1, 1234), before = JSON.stringify(sample);
  const r = P.classify(sample, tpl, keep);
  assert.strictEqual(JSON.stringify(sample), before, 'Feature ablation changed the input card');
  r.contributions.forEach((terms, i) => {
    assert(Math.abs(terms.reduce((a, b) => a + b, 0) - r.d[i] ** 2) < 1e-10);
    if (keep) assert.strictEqual(terms[6], 0);
  });
}
assert.strictEqual(P.evaluate(1, 30).acc, 179 / 180);
assert.strictEqual(P.evaluate(1, 30, geometric).acc, 162 / 180);

assert.strictEqual(C.TEST_SEG.length, 36);
assert(C.TEST_SEG.every(s => !C.CAL_SEG.includes(s)));
assert.strictEqual(new Set(C.TEST_SEG.concat(C.CAL_SEG)).size, 40);
const observed = C.obs(.5, 1);
const changedTest = observed.map((p, i) => C.CAL_SEG.includes(Math.floor(i / C.SPSEG)) ? p : {amp:0, formE:0, circ:0, truth:3});
assert.deepStrictEqual(C.calibrate(changedTest), C.calibrate(observed), 'Test observations entered calibration');
for (const mu of [0, .5, .75, .85, 1]) for (const noise of [.5, 1, 2]) for (const mode of ['amp', 'amp3', 'full']) {
  const r = C.evaluate(mu, noise, mode), cm = C.confuse(r.segs);
  const count = cm.flat().reduce((a, b) => a + b, 0);
  const hit = cm.reduce((sum, row, i) => sum + row[i], 0);
  assert.strictEqual(count, 36);
  assert.strictEqual(r.agree, hit / count);
  assert.strictEqual(r.review, count - hit);
  const calibrationChanged = r.segs.slice();
  C.CAL_SEG.forEach(s => { calibrationChanged[s] = (calibrationChanged[s] + 1) % 4; });
  assert.deepStrictEqual(C.confuse(calibrationChanged), cm, 'Calibration predictions entered test metrics');
}
assert.strictEqual(C.evaluate(.5, 1, 'amp').review, 9);
assert.strictEqual(C.evaluate(1, 1, 'full').agree, 33 / 36);
console.log('PASS: same-card feature ablation; exact distance evidence; 180-card benchmarks; c1 calibration isolation and 36-segment metrics');
