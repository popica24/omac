import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { POSITIONS } from '../parts.js';
import { BODY } from '../geometry/body.js';

const OWN = [6, 8, 9, 10, 11, 12, 13];
const expected = POSITIONS.filter((p) => OWN.includes(p.assemblyId));
const KINDS = new Set(['plastic', 'corp', 'cauciuc', 'metal', 'otel', 'aluminiu', 'ceramica', 'filtru', 'comutator', 'sina', 'lant']);
const mat = (kind) => new THREE.MeshStandardMaterial({ name: kind, side: THREE.DoubleSide });

function boxOf(id) {
  const g = new THREE.Group();
  BODY[id](mat).forEach((piece) => g.add(piece));
  g.updateMatrixWorld(true);
  return new THREE.Box3().setFromObject(g);
}

test('un constructor pentru fiecare poziție a ansamblurilor 6 și 8–13, nimic în plus', () => {
  assert.deepEqual(Object.keys(BODY).sort(), expected.map((p) => p.id).sort());
});

test('fiecare constructor întoarce exact cantitatea de piese, fiecare cu cel puțin un mesh', () => {
  for (const p of expected) {
    const pieces = BODY[p.id](mat);
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
    BODY[p.id]((kind) => { used.push(kind); return mat(kind); });
    assert.ok(used.length > 0 && used.every((k) => KINDS.has(k)), `${p.id}: ${used}`);
  }
});

test('lanțul are 64 de zale, șina 40 cm', () => {
  const [chain] = BODY.B73(mat);
  assert.ok(chain.isInstancedMesh);
  assert.equal(chain.count, 64);
  assert.ok(Math.abs(boxOf('B74').getSize(new THREE.Vector3()).x - 40) < 0.01);
});

test('piesele cheie stau unde trebuie', () => {
  assert.ok(boxOf('B16').max.z < -10.5, 'carcasa demarorului e pe partea stângă (−Z)');
  assert.ok(boxOf('B64').min.z > 10, 'carcasa frânei e pe partea lanțului (+Z), peste șină');
  assert.ok(boxOf('B38').max.x < -12, 'mânerul spate e în spate');
  assert.ok(boxOf('B6').max.y > 24, 'capacul motorului acoperă capișonul bujiei');
  assert.ok(boxOf('B3').min.y > 12, 'protecția mâinii e deasupra corpului');
});
