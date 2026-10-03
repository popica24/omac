import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MODEL, ASSEMBLIES, POSITIONS, assemblyLabel, positionsOf } from '../parts.js';

const range = (sheet, from, to) => Array.from({ length: to - from + 1 }, (_, i) => `${sheet}${from + i}`);

test('13 ansambluri, în ordine', () => {
  assert.deepEqual(ASSEMBLIES.map((a) => a.name), [
    'Cilindru și piston', 'Toba de eșapament', 'Carter și arbore cotit', 'Aprindere și volant',
    'Admisie și carburator', 'Filtru de aer și capace', 'Ambreiaj și pompă de ulei',
    'Frână de lanț și protecție', 'Demaror', 'Mânere și comenzi', 'Rezervoare',
    'Șină, lanț și întinzător', 'Trusă de scule',
  ]);
  assert.deepEqual(ASSEMBLIES.map((a) => a.id), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
});

test('169 de poziții: A1–A94 și B1–B75, fiecare exact o dată', () => {
  assert.equal(POSITIONS.length, 169);
  const ids = POSITIONS.map((p) => p.id);
  assert.equal(new Set(ids).size, 169);
  assert.deepEqual([...ids].sort(), [...range('A', 1, 94), ...range('B', 1, 75)].sort());
});

test('numărul de poziții pe ansamblu', () => {
  assert.deepEqual(ASSEMBLIES.map((a) => a.positions.length), [9, 5, 17, 5, 18, 9, 23, 22, 13, 21, 13, 11, 3]);
});

test('cantitățile de pe foi', () => {
  const qty = Object.fromEntries(POSITIONS.map((p) => [p.id, p.qty]));
  assert.equal(POSITIONS.reduce((s, p) => s + p.qty, 0), 234);
  const multi = {
    A2: 4, A7: 4, A8: 2, A14: 2, A16: 2, A20: 2, A24: 2, A28: 5, A31: 3, A35: 2, A36: 3, A40: 3,
    A52: 2, A57: 2, A63: 3, A70: 2, A78: 2, A79: 2,
    B1: 2, B4: 8, B8: 9, B10: 3, B11: 3, B28: 3, B29: 2, B30: 2, B49: 10, B56: 3, B65: 2,
  };
  for (const p of POSITIONS) assert.equal(qty[p.id], multi[p.id] ?? 1, p.id);
});

test('fiecare poziție are denumire originală, denumire tradusă și cod null', () => {
  for (const p of POSITIONS) {
    assert.ok(p.en.length > 0 && p.name.length > 0, p.id);
    assert.equal(p.code, null);
    assert.ok(Number.isInteger(p.qty) && p.qty >= 1, p.id);
  }
});

test('câteva traduceri din spec', () => {
  const name = Object.fromEntries(POSITIONS.map((p) => [p.id, p.name]));
  assert.equal(name.A66, 'Pinion lanț');
  assert.equal(name.B22, 'Clichet demaror');
  assert.equal(name.A83, 'Supapă aerisire');
  assert.equal(name.B73, 'Lanț 64DL .325" .058"');
  assert.equal(name.B74, 'Șină de ghidaj 40 cm');
});

test('piesele de uzură propuse', () => {
  assert.deepEqual(
    POSITIONS.filter((p) => p.wear).map((p) => p.id).sort(),
    ['A14', 'A55', 'A6', 'A66', 'A69', 'A75', 'B15', 'B36', 'B73', 'B74'],
  );
});

test('eticheta ansamblului și positionsOf', () => {
  assert.equal(assemblyLabel(ASSEMBLIES[0]), '1 · Cilindru și piston (9)');
  assert.equal(assemblyLabel(ASSEMBLIES[6]), '7 · Ambreiaj și pompă de ulei (23)');
  assert.deepEqual(positionsOf(12).map((p) => p.id), ['B27', 'B28', 'B57', 'B58', 'B59', 'B60', 'B61', 'B65', 'B73', 'B74', 'B75']);
});

test('specificațiile MF 34 din manual, neschimbate', () => {
  assert.equal(MODEL.name, 'Motoferăstrău O’MAC MF 34');
  assert.equal(Object.fromEntries(MODEL.specs)['Lanț'], '64DL .325" .058"');
});

test('fără denumirea veche a firmei, fără ®, fără nume de gamă', () => {
  const all = JSON.stringify({ MODEL, ASSEMBLIES });
  assert.ok(!/Pădure|Padure|Grădină|Gradina/i.test(all));
  assert.ok(!all.includes('®'));
  assert.ok(!/Smart LINE|MaxX|Power LINE|ProX/.test(all));
});
