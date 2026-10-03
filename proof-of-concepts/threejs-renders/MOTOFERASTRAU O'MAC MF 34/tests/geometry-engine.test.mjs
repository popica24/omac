import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { POSITIONS } from '../parts.js';
import { ENGINE } from '../geometry/engine.js';

const OWN = [1, 2, 3, 4, 5, 7];
const expected = POSITIONS.filter((p) => OWN.includes(p.assemblyId));
const KINDS = new Set(['plastic', 'corp', 'cauciuc', 'metal', 'otel', 'aluminiu', 'ceramica', 'filtru', 'comutator', 'sina', 'lant']);
const mat = (kind) => new THREE.MeshStandardMaterial({ name: kind, side: THREE.DoubleSide });

function boxOf(id) {
  const g = new THREE.Group();
  ENGINE[id](mat).forEach((piece) => g.add(piece));
  g.updateMatrixWorld(true);
  return new THREE.Box3().setFromObject(g);
}

test('un constructor pentru fiecare poziție a ansamblurilor 1–5 și 7, nimic în plus', () => {
  assert.deepEqual(Object.keys(ENGINE).sort(), expected.map((p) => p.id).sort());
});

test('fiecare constructor întoarce exact cantitatea de piese, fiecare cu cel puțin un mesh', () => {
  for (const p of expected) {
    const pieces = ENGINE[p.id](mat);
    assert.equal(pieces.length, p.qty, p.id);
    for (const piece of pieces) {
      let meshes = 0;
      piece.traverse((o) => { if (o.isMesh) meshes++; });
      assert.ok(meshes > 0, p.id);
    }
  }
});

test('materialele vin doar din tipurile cunoscute', () => {
  for (const p of expected) {
    const used = [];
    ENGINE[p.id]((kind) => { used.push(kind); return mat(kind); });
    assert.ok(used.length > 0 && used.every((k) => KINDS.has(k)), `${p.id}: ${used}`);
  }
});

test('piesele cheie stau unde trebuie', () => {
  const crank = boxOf('A19');
  assert.ok(crank.min.z < -10 && crank.max.z > 11, 'arborele cotit traversează motorul pe Z');
  assert.ok(boxOf('A6').min.y >= boxOf('A5').max.y - 1, 'bujia e în capul cilindrului');
  assert.ok(Math.abs(boxOf('A35').getSize(new THREE.Vector3()).x - 6.2) < 0.05, 'rulmentul 6206 are Ø 6,2 cm');
  assert.ok(Math.abs(boxOf('A66').getCenter(new THREE.Vector3()).z - 9.8) < 0.05, 'pinionul e în planul șinei');
  assert.ok(boxOf('A10').min.x > 4, 'toba e în fața cilindrului');
  assert.ok(boxOf('A48').max.x < -9, 'carburatorul e în spatele cilindrului');
  assert.ok(boxOf('A29').max.z < -8.5, 'volantul e pe partea demarorului');
  assert.ok(boxOf('A67').min.z > 6.5, 'tamburul ambreiajului e pe partea lanțului');
});
