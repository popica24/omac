import { test } from 'node:test';
import assert from 'node:assert/strict';
import { placeLabels } from '../labels.js';

const OPTS = { minDist: 50, lift: 30, maxBelow: 17, half: 23, width: 346, height: 544 };

function check(anchors, opts = OPTS) {
  const pos = placeLabels(anchors, opts);
  assert.equal(pos.length, anchors.length);
  for (let i = 0; i < pos.length; i++) {
    for (let j = i + 1; j < pos.length; j++) {
      const d = Math.hypot(pos[i].x - pos[j].x, pos[i].y - pos[j].y);
      assert.ok(d >= opts.minDist - 0.5, `etichetele ${i} și ${j} sunt la ${d.toFixed(1)} px`);
    }
    assert.ok(pos[i].y <= anchors[i].y - opts.maxBelow + 1e-6, `eticheta ${i} coboară peste piesă`);
    assert.ok(pos[i].x >= opts.half - 1e-6 && pos[i].x <= opts.width - opts.half + 1e-6, `eticheta ${i} iese lateral`);
    assert.ok(pos[i].y >= opts.half - 1e-6, `eticheta ${i} iese sus`);
  }
  return pos;
}

test('o etichetă singură stă chiar deasupra punctului', () => {
  const [p] = check([{ x: 100, y: 200 }]);
  assert.ok(Math.abs(p.x - 100) < 1e-6 && Math.abs(p.y - 170) < 1e-6);
});

test('etichetele departe una de alta nu se mișcă', () => {
  const pos = check([{ x: 60, y: 200 }, { x: 260, y: 400 }]);
  assert.ok(Math.abs(pos[0].y - 170) < 1e-6 && Math.abs(pos[1].x - 260) < 1e-6);
});

test('etichetele suprapuse se despart', () => {
  check([{ x: 150, y: 300 }, { x: 155, y: 302 }, { x: 160, y: 298 }]);
});

test('o grilă înghesuită de 23 de puncte (ca pe telefon) se desface', () => {
  const anchors = [];
  for (let i = 0; i < 23; i++) anchors.push({ x: 70 + (i % 5) * 48, y: 120 + Math.floor(i / 5) * 70 + (i % 2) * 12 });
  check(anchors);
});

test('punctele de lângă marginea de sus rămân în cadru', () => {
  check([{ x: 30, y: 60 }, { x: 40, y: 62 }, { x: 330, y: 58 }]);
});
