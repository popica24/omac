import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ASSEMBLY_DIRS, easeInOutCubic, stepToward, explodeOffset, gridLayout, gridColumns, stadiumPoints } from '../model.js';

const close = (a, b, eps = 1e-9) => Math.abs(a - b) < eps;

test('o direcție nenulă pentru fiecare din cele 13 ansambluri', () => {
  assert.deepEqual(Object.keys(ASSEMBLY_DIRS).map(Number), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
  for (const d of Object.values(ASSEMBLY_DIRS)) assert.ok(d.length === 3 && Math.hypot(...d) > 5);
});

test('easeInOutCubic: capete, mijloc, monotonă', () => {
  assert.equal(easeInOutCubic(0), 0);
  assert.equal(easeInOutCubic(1), 1);
  assert.ok(close(easeInOutCubic(0.5), 0.5));
  let prev = -1;
  for (let i = 0; i <= 100; i++) {
    const v = easeInOutCubic(i / 100);
    assert.ok(v >= prev);
    prev = v;
  }
});

test('stepToward avansează, nu depășește și se întoarce fără salt', () => {
  assert.ok(close(stepToward(0, 1, 0.3, 1.2), 0.25));
  assert.equal(stepToward(0.9, 1, 0.5, 1), 1);
  assert.equal(stepToward(0.1, 0, 0.5, 1), 0);
  assert.ok(close(stepToward(0.4, 0, 0.1, 1), 0.3));
});

test('explodeOffset: zero exact la t = 0, fără −0', () => {
  const o = explodeOffset([0, -12, -16], [-3, -4, -5], 0, 1);
  assert.deepEqual(o, { x: 0, y: 0, z: 0 });
  assert.ok(!Object.is(o.y, -0) && !Object.is(o.z, -0));
});

test('explodeOffset: direcția la t = 1; plus răspândirea când ansamblul e activ', () => {
  assert.deepEqual(explodeOffset([1, 2, 3], [10, 20, 30], 1, 0), { x: 1, y: 2, z: 3 });
  assert.deepEqual(explodeOffset([1, 2, 3], [10, 20, 30], 1, 1), { x: 11, y: 22, z: 33 });
  const half = explodeOffset([2, 0, 0], [8, 0, 0], 0.5, 0.5);
  assert.ok(close(half.x, 1 + 2));
});

test('gridLayout: rânduri în ordine, fără suprapuneri, cu distanța cerută', () => {
  const sizes = [{ w: 2, h: 1 }, { w: 1, h: 3 }, { w: 4, h: 2 }, { w: 1, h: 1 }, { w: 3, h: 1 }];
  const cells = gridLayout(sizes, 1, 3);
  assert.ok(cells[0].y === cells[1].y && cells[1].y === cells[2].y && cells[3].y < cells[0].y);
  assert.ok(cells[0].x < cells[1].x && cells[1].x < cells[2].x && cells[3].x < cells[4].x);
  for (let i = 0; i < cells.length; i++) {
    for (let j = i + 1; j < cells.length; j++) {
      const sepX = Math.abs(cells[i].x - cells[j].x) >= (sizes[i].w + sizes[j].w) / 2 + 1 - 1e-9;
      const sepY = Math.abs(cells[i].y - cells[j].y) >= (sizes[i].h + sizes[j].h) / 2 + 1 - 1e-9;
      assert.ok(sepX || sepY, `${i}/${j}`);
    }
  }
});

test('gridLayout: centrat; coloane implicite ≈ √(1,6·n)', () => {
  const cells = gridLayout(Array(6).fill({ w: 2, h: 1 }), 1, 3);
  const xs = cells.map((c) => c.x);
  const ys = cells.map((c) => c.y);
  assert.ok(close(Math.min(...xs) + Math.max(...xs), 0) && close(Math.min(...ys) + Math.max(...ys), 0));
  const auto = gridLayout(Array(23).fill({ w: 1, h: 1 }), 1);
  assert.equal(new Set(auto.map((c) => c.x)).size, 7);
});

test('stadiumPoints e disponibil și din model.js', () => {
  assert.equal(stadiumPoints(40, 2.5, 2.9, 64).length, 64);
});

test('gridColumns: grila are aproximativ forma viewer-ului', () => {
  // 11 celule late și joase (șina de 40 cm) → puține coloane, multe rânduri
  assert.equal(gridColumns(11, 45, 11.8, 1.1), 2);
  // 23 de celule pătrate → ~5 coloane
  assert.equal(gridColumns(23, 10, 10, 1.1), 5);
  // limite: cel puțin 1, cel mult n
  assert.equal(gridColumns(1, 5, 5, 1.1), 1);
  assert.equal(gridColumns(3, 1, 100, 1.1), 3);
});
