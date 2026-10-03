import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
  at, AXIS, bolt, nut, washer, bearing, seal, spring, circlip, gearShape, extrude, stadiumPoints, rbox,
} from '../geometry/hardware.js';

const m = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide });
const box = (o) => { o.updateMatrixWorld(true); return new THREE.Box3().setFromObject(o); };
const size = (o) => box(o).getSize(new THREE.Vector3());
const close = (a, b, eps = 1e-3) => Math.abs(a - b) < eps;
function hitsDown(o, x = 0, z = 0) {
  o.updateMatrixWorld(true);
  const r = new THREE.Raycaster(new THREE.Vector3(x, 50, z), new THREE.Vector3(0, -1, 0));
  return r.intersectObject(o, true).length > 0;
}

test('șurubul M5×20: tija de 2 cm sub cap, capul deasupra', () => {
  const b = box(bolt(m, { d: 0.5, L: 2 }));
  assert.ok(close(b.min.y, -2), `min.y ${b.min.y}`);
  assert.ok(close(b.max.y, 0.325), `max.y ${b.max.y}`);
});

test('at() cu AXIS.toMinusX: capul spre −X, tija spre +X', () => {
  const b = box(at(bolt(m, { d: 0.5, L: 2 }), [0, 0, 0], AXIS.toMinusX));
  assert.ok(close(b.max.x, 2), `max.x ${b.max.x}`);
  assert.ok(b.min.x < -0.3);
});

test('AXIS.toPlusZ și AXIS.toPlusX duc +Y unde trebuie', () => {
  const v = new THREE.Vector3(0, 1, 0);
  const o = at(new THREE.Object3D(), [0, 0, 0], AXIS.toPlusZ);
  assert.ok(v.clone().applyEuler(o.rotation).distanceTo(new THREE.Vector3(0, 0, 1)) < 1e-9);
  const p = at(new THREE.Object3D(), [0, 0, 0], AXIS.toPlusX);
  assert.ok(v.clone().applyEuler(p.rotation).distanceTo(new THREE.Vector3(1, 0, 0)) < 1e-9);
});

test('șaiba are gaură: raza prin centru nu o atinge, una prin inel da', () => {
  const w = washer(m, { d: 0.5, D: 1, t: 0.1 });
  assert.equal(hitsDown(w, 0, 0), false);
  assert.equal(hitsDown(w, 0.4, 0), true);
  assert.ok(close(size(w).x, 1) && close(size(w).y, 0.1));
});

test('piulița: înălțime 0,8d și gaură', () => {
  const n = nut(m, { d: 0.5 });
  assert.ok(close(size(n).y, 0.4));
  assert.equal(hitsDown(n, 0, 0), false);
});

test('rulmentul 6206: Ø exterior 6,2 cm, lățime 1,6 cm', () => {
  const s = size(bearing(m, { d: 3, D: 6.2, B: 1.6 }));
  assert.ok(close(s.x, 6.2, 0.01) && close(s.y, 1.6, 0.01));
});

test('simeringul 15×35×5', () => {
  const s = size(seal(m, { d: 1.5, D: 3.5, B: 0.5 }));
  assert.ok(close(s.x, 3.5, 0.01) && close(s.y, 0.5, 0.01));
});

test('arcul elicoidal are înălțimea L + sârma', () => {
  assert.ok(close(size(spring(m, { D: 0.8, wire: 0.1, L: 3, turns: 10 })).y, 3.1, 0.02));
});

test('siguranța e un inel deschis', () => {
  const c = circlip(m, { D: 3.5, w: 0.15 });
  assert.ok(close(size(c).x, 3.65, 0.05));
  assert.equal(hitsDown(c, 0, 0), false);
});

test('roata dințată: 4 puncte pe dinte; extrudarea are grosimea cerută', () => {
  const s = gearShape(7, 2.45, 1.95, 0.85);
  assert.equal(s.getPoints().length >= 28, true);
  const g = extrude(s, 0.6);
  g.computeBoundingBox();
  assert.ok(close(g.boundingBox.max.z - g.boundingBox.min.z, 0.6));
});

test('rbox nu strică pereții foarte subțiri', () => {
  const g = rbox(0.1, 3, 3, 0.6);
  g.computeBoundingBox();
  const s = g.boundingBox.getSize(new THREE.Vector3());
  assert.ok(close(s.x, 0.1) && close(s.y, 3) && close(s.z, 3), s.toArray().join(' × '));
});

test('stadiumPoints: 64 de puncte pe traseul lanțului', () => {
  const pts = stadiumPoints(40, 2.5, 2.9, 64);
  assert.equal(pts.length, 64);
  for (const p of pts) {
    const d = p.x >= 2.5 && p.x <= 37.5 ? Math.abs(p.y) : Math.hypot(p.x - (p.x < 2.5 ? 2.5 : 37.5), p.y);
    assert.ok(close(d, 2.9, 1e-6));
  }
});
