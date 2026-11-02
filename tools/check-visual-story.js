'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
global.window = {};
require('../cases/w4-lithology/demo/demo.js');
const W = window.W4CORE;
const fixture = [2, 2, 1, 2, 1, 0].map((facies, i) => ({
  zgr: i < 5 ? (i + 1) / 10 : 20, zden: 0, facies: facies, well: 1, depth: 2400 + i
}));
const query = { zgr: 0, zden: 0 };
const proof = W.explainKNN(fixture, query, true);
assert.strictEqual(proof.prediction, 2, 'Known five-neighbor vote is wrong');
assert.deepStrictEqual(proof.votes, [0, 2, 3, 0, 0]);
assert.strictEqual(proof.neighbors.length, 5);
assert.strictEqual(proof.neighbors[0].sample, fixture[0]);
assert(Math.abs(proof.neighbors[4].distance - 0.5) < 1e-12);
assert.deepStrictEqual(W.explainKNN(fixture, Object.assign({ facies: 4 }, query), true).votes, proof.votes, 'Query truth influenced inference');
assert.deepStrictEqual(W.profileSummary([0, 1, 2, 4], [1, 1, 4, 4]), { errors: 2, sandThickness: 0.25, trueSandThickness: 0.25 });
const r = W.run({ nWells: 4, drift: 1.2, overlap: 0.35, seed: 20261024 });
assert(r.train.every(p => p.well !== W.TESTW), 'Test well leaked into training');
assert.strictEqual(r.f1[3].toFixed(3), '0.907', 'Existing benchmark changed');
assert.strictEqual(r.f1[2].toFixed(3), '0.746', 'Raw KNN benchmark changed');
for (const z of [false, true]) for (const q of r.test) {
  const evidence = W.explainKNN(r.train, q, z);
  assert.strictEqual(evidence.prediction, W.predictKNN(r.train, q, z));
  assert(evidence.neighbors.every(n => n.sample.well !== W.TESTW));
  assert.strictEqual(evidence.votes.reduce((a, b) => a + b, 0), W.K);
}
for (let method = 0; method < 4; method++) {
  const summary = W.profileSummary(r.test.map(p => p.facies), r.pred[method]);
  const matrixErrors = r.M[method].reduce((sum, row, i) => sum + row.reduce((n, count, j) => n + (i === j ? 0 : count), 0), 0);
  assert.strictEqual(summary.errors, matrixErrors, 'Depth column and confusion matrix disagree');
}
const { stories } = require('../cases/shared/visual-story.js');
const { createHash } = require('crypto');
const keys = Object.keys(stories);
assert.strictEqual(keys.length, 10, 'All ten cases need a model');
assert.strictEqual(new Set(keys.map(id => stories[id].image)).size, 10, 'Cases share an image key');
const hashes = keys.map(id => createHash('sha256').update(fs.readFileSync(path.join(ROOT, 'assets/models', stories[id].image + '.webp'))).digest('hex'));
assert.strictEqual(new Set(hashes).size, 10, 'Cases share the same image content');
require('../assets/data.js');
const A = window.ATLAS;
assert.strictEqual(A.allScenes.length, 61);
assert(!A.index.byId.w6 && !A.index.byId.w7, 'Retired scenes returned');
assert.deepStrictEqual(A.index.byStage.welllog.scenes.map(s => s.id), ['w1', 'w2', 'w3', 'w4', 'w5']);
for (const id of Object.keys(stories)) {
  if (id === 'welllog-layer') continue;
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'packages', id, 'case.json'), 'utf8'));
  assert(A.index.byId[pkg.sceneId], id + ': package relies on an unknown scene');
  const bg = pkg.tabs.background.sections[0].html;
  assert(bg.includes('data:image/webp;base64,'), id + ': image is not portable');
  assert(bg.includes('ALGORITHM IN ACTION') && bg.includes('模型接收什么'), id + ': AI task panel missing');
  assert(!/oil-scan|oil-play|oilscan|扫描示意/.test(bg), id + ': decorative scan remains');
  assert(pkg.tabs.workflow.metrics.html.includes('智能方法在这条链路里做了什么'));
  assert(pkg.tabs.demo.intro.includes('合成数据'));
  assert(Buffer.byteLength(JSON.stringify(pkg)) < 6 * 1024 * 1024, id + ': package too large');
}
const overlay = fs.readFileSync(path.join(ROOT, 'assets/cases/welllog-layer.visual.js'), 'utf8');
assert(overlay.includes('data:image/webp;base64,') && !/oil-scan|oil-play|oilscan/.test(overlay));
console.log('PASS: exact KNN evidence and unchanged metrics; AI task panels; 10 unique images; 61 scenes; 9 portable packages');
