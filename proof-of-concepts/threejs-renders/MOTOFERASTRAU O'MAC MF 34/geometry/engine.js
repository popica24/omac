// Motorul (foaia „A Explosive view"): pozițiile ansamblurilor 1–5 și 7.
// Fiecare constructor primește `mat(tip)` și întoarce piesele poziției, deja așezate
// în utilaj. Centimetri; X spre șină, Y în sus, +Z partea lanțului, −Z partea demarorului.
// Arborele cotit e pe axa Z, la înălțimea CY; cilindrul e vertical, deasupra lui;
// evacuarea e spre +X, admisia spre −X.
import * as THREE from 'three';
import {
  mesh, group, at, AXIS, rbox, lathe, extrude, gearShape, tube, cylinder, roundedRectShape, ringGeometry,
  bolt, nut, washer, oring, bearing, seal, circlip, pin, key, spring,
} from './hardware.js';

const CY = 4;
const box = (mat, kind, [w, h, d], pos, r = 0.4) => at(mesh(rbox(w, h, d, r), mat(kind)), pos);
const hose = (mat, kind, points, r) => mesh(tube(points, r), mat(kind));

function crankcaseShape() {
  const s = roundedRectShape(14, 12, 2.2);
  const hole = new THREE.Path();
  hole.absarc(0, 0, 3.1, 0, Math.PI * 2, true);
  s.holes.push(hole);
  return s;
}

const crankcaseHalf = (mat, z0, z1) =>
  mesh(extrude(crankcaseShape(), z1 - z0, 0.2).translate(0, CY, (z0 + z1) / 2), mat('metal'));

const shockMount = (mat, x, z) => group(
  box(mat, 'cauciuc', [1.2, 1.6, 1.6], [x, -1.6, z], 0.4),
  at(pin(mat('otel'), { d: 0.3, L: 1 }), [x, -2.4, z], AXIS.down),
);

export const ENGINE = {
  // ——— 1 · Cilindru și piston ———
  A5: (mat) => {
    const m = mat('aluminiu');
    const g = group(
      mesh(lathe([[2.2, 10.5], [3.2, 10.5], [3.2, 11.2], [2.7, 11.2], [2.7, 19], [2.2, 19], [2.2, 10.5]]), m),
      mesh(lathe([[0, 19], [2.9, 19], [2.5, 19.7], [0.9, 20], [0, 20]]), m),
      box(mat, 'aluminiu', [1.6, 2.6, 3], [3.4, 15, 0]),
      box(mat, 'aluminiu', [1.6, 2.6, 3], [-3.4, 15, 0]),
    );
    for (let i = 0; i < 9; i++) g.add(at(mesh(rbox(8.6, 0.32, 8.6, 1.2, 0.1), m), [0, 11.8 + i * 0.85, 0]));
    return [g];
  },
  A6: (mat) => [at(group(
    mesh(lathe([[0, 0], [0.45, 0], [0.45, 0.9], [0.35, 0.9], [0.35, 2.4], [0.2, 2.9], [0, 2.9]], 16), mat('ceramica')),
    at(mesh(cylinder(0.75, 0.6, 6), mat('metal')), [0, 0.5, 0]),
  ), [0, 19.6, 0])],
  A7: (mat) => [[3.4, 3.4], [-3.4, 3.4], [3.4, -3.4], [-3.4, -3.4]]
    .map(([x, z]) => at(bolt(mat('otel'), { d: 0.5, L: 2 }), [x, 11.2, z])),
  A13: (mat) => [at(mesh(ringGeometry(4.4, 7, 0.1), mat('filtru')), [0, 10.38, 0])],
  A14: (mat) => [15.4, 14.9].map((y) => at(washer(mat('otel'), { d: 4.0, D: 4.42, t: 0.12 }), [0, y, 0])),
  A15: (mat) => [mesh(lathe([[0, 12], [2.18, 12], [2.18, 16.3], [1.9, 16.5], [0, 16.5]]), mat('aluminiu'))],
  A16: (mat) => [[1.85, AXIS.toPlusZ], [-1.85, AXIS.toMinusZ]]
    .map(([z, r]) => at(circlip(mat('otel'), { D: 0.8, w: 0.08 }), [0, 13, z], r)),
  A17: (mat) => [at(pin(mat('otel'), { d: 0.8, L: 3.6 }), [0, 13, -1.8], AXIS.toPlusZ)],
  A18: (mat) => [at(bearing(mat('otel'), { d: 1.1, D: 1.5, B: 1.25, needle: true }), [0, 13, -0.625], AXIS.toPlusZ)],

  // ——— 2 · Toba de eșapament ———
  A8: (mat) => [1.5, -1.5].map((dy) => at(bolt(mat('otel'), { d: 0.5, L: 8.5 }), [10.6, 15 + dy, 0], AXIS.toPlusX)),
  A9: (mat) => [box(mat, 'filtru', [0.12, 6, 6.5], [4.45, 15, 0], 0.8)],
  A10: (mat) => {
    const g = group(box(mat, 'otel', [5, 7, 8], [7.1, 15, 0], 1.6));
    for (const y of [12.6, 13.4]) g.add(box(mat, 'otel', [0.4, 0.3, 5], [9.65, y, 0], 0.1));
    return [g];
  },
  A11: (mat) => {
    const g = group(box(mat, 'aluminiu', [0.5, 6.6, 7.6], [9.9, 15, 0], 1.4));
    for (const y of [13.5, 15, 16.5]) g.add(box(mat, 'aluminiu', [0.3, 0.4, 6.4], [10.25, y, 0], 0.1));
    return [g];
  },
  A12: (mat) => [at(nut(mat('otel'), { d: 0.5 }), [10.2, 12.6, 2.8], AXIS.toPlusX)],

  // ——— 3 · Carter și arbore cotit ———
  A19: (mat) => {
    const m = mat('otel');
    return [group(
      at(mesh(cylinder(3, 1, 32), m), [0, CY, -1.2], AXIS.toPlusZ),
      at(mesh(cylinder(3, 1, 32), m), [0, CY, 1.2], AXIS.toPlusZ),
      at(mesh(cylinder(0.6, 2.4, 16), m), [0, CY + 1.6, 0], AXIS.toPlusZ),
      at(mesh(rbox(1, 7.4, 0.6, 0.3, 0.1), m), [0, 9.3, 0]),
      at(mesh(cylinder(0.75, 8.8, 16), m), [0, CY, -6.1], AXIS.toPlusZ),
      at(mesh(cylinder(0.75, 10.3, 16), m), [0, CY, 6.85], AXIS.toPlusZ),
    )];
  },
  A20: (mat) => [0.35, -0.45].map((z) => at(washer(mat('otel'), { d: 1.2, D: 2, t: 0.1 }), [0, CY + 1.6, z], AXIS.toPlusZ)),
  A21: (mat) => [at(key(mat('otel'), { w: 0.3, h: 0.3, L: 1 }), [0, CY + 0.72, -10.4], AXIS.toPlusZ)],
  A28: (mat) => [[-5.6, -1], [5.6, -1], [-5.6, 9], [5.6, 9], [0, -1.4]]
    .map(([x, y]) => at(bolt(mat('otel'), { d: 0.5, L: 3 }), [x, y, -5.3], AXIS.toMinusZ)),
  A31: (mat) => [90, 210, 330].map((deg) => {
    const a = (deg * Math.PI) / 180;
    return at(bolt(mat('otel'), { d: 0.4, L: 0.8, head: 'pan' }), [2.6 * Math.cos(a), CY + 2.6 * Math.sin(a), -6.05], AXIS.toMinusZ);
  }),
  A32: (mat) => [at(washer(mat('metal'), { d: 1.6, D: 6, t: 0.25 }), [0, CY, -6.0], AXIS.toPlusZ)],
  A33: (mat) => [at(seal(mat('cauciuc'), { d: 1.5, D: 3.5, B: 0.5 }), [0, CY, -5.7], AXIS.toPlusZ)],
  A34: (mat) => [at(circlip(mat('otel'), { D: 3.5, w: 0.15 }), [0, CY, -5.1], AXIS.toPlusZ)],
  A35: (mat) => [-4.8, 3.2].map((z) => at(bearing(mat('otel'), { d: 3, D: 6.2, B: 1.6 }), [0, CY, z], AXIS.toPlusZ)),
  A36: (mat) => [[-7.9, 0], [-7.9, 8], [7.9, 8]]
    .map(([x, y]) => at(mesh(cylinder(0.7, 1.4, 16), mat('cauciuc')), [x, y, -3], AXIS.toPlusX)),
  A37: (mat) => [crankcaseHalf(mat, -5.0, -0.2)],
  A38: (mat) => [shockMount(mat, -8.2, -3.5)],
  A39: (mat) => [mesh(extrude(crankcaseShape(), 0.1).translate(0, CY, -0.1), mat('filtru'))],
  A40: (mat) => [[-5, 9], [5, 9], [0, -1.4]].map(([x, y]) => at(pin(mat('otel'), { d: 0.4, L: 1 }), [x, y, -0.5], AXIS.toPlusZ)),
  A41: (mat) => [at(washer(mat('cauciuc'), { d: 1.6, D: 3, t: 0.4 }), [0, CY, 5.55], AXIS.toPlusZ)],
  A42: (mat) => [group(crankcaseHalf(mat, 0.2, 5.0), box(mat, 'metal', [6, 3.4, 3.8], [9.8, CY, 6.9], 0.6))],
  A43: (mat) => [shockMount(mat, 8.2, 3.5)],

  // ——— 4 · Aprindere și volant ———
  A22: (mat) => [group(
    at(mesh(cylinder(0.75, 2, 16), mat('cauciuc')), [0, 22.6, 0]),
    hose(mat, 'cauciuc', [[0, 23.6, 0], [0.3, 24.2, -0.5], [0.6, 24.3, -1.0]], 0.35),
  )],
  A23: (mat) => [group(
    box(mat, 'corp', [4.2, 2.6, 2.2], [0, 11.4, -8.8], 0.5),
    hose(mat, 'cauciuc', [[1.6, 12.2, -8.4], [2.6, 17, -6.6], [1.4, 22.4, -2.4], [0.6, 24.2, -1.0]], 0.25),
  )],
  A24: (mat) => [-1.4, 1.4].map((x) => at(bolt(mat('otel'), { d: 0.5, L: 1.8 }), [x, 11.4, -10.1], AXIS.toMinusZ)),
  A29: (mat) => {
    const m = mat('aluminiu');
    const g = group(
      at(mesh(cylinder(5.5, 1.2, 48), m), [0, CY, -9.6], AXIS.toPlusZ),
      box(mat, 'corp', [1.6, 0.8, 1.1], [0, CY - 5.4, -9.6], 0.2),
    );
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      g.add(at(mesh(rbox(0.3, 2.4, 0.8, 0.1, 0.05), m), [3.8 * Math.cos(a), CY + 3.8 * Math.sin(a), -10.6], [0, 0, a - Math.PI / 2]));
    }
    return [g];
  },
  A30: (mat) => [at(nut(mat('otel'), { d: 0.8 }), [0, CY, -10.7], AXIS.toMinusZ)],

  // ——— 5 · Admisie și carburator ———
  A1: (mat) => [box(mat, 'metal', [0.3, 2.4, 2.4], [-6.05, 15, 0], 0.3)],
  A2: (mat) => [[1.2, 1.2], [1.2, -1.2], [-1.2, 1.2], [-1.2, -1.2]]
    .map(([dy, dz]) => at(bolt(mat('otel'), { d: 0.5, L: 1.2 }), [-6.4, 15 + dy, dz], AXIS.toMinusX)),
  A3: (mat) => [box(mat, 'cauciuc', [1.2, 3.4, 3.4], [-5.3, 15, 0], 0.8)],
  A4: (mat) => [box(mat, 'filtru', [0.1, 3.2, 3.2], [-4.62, 15, 0], 0.6)],
  A44: (mat) => [at(washer(mat('otel'), { d: 0.5, D: 1.1, t: 0.1 }), [-7.1, 16.4, 1.3], AXIS.toMinusX)],
  A45: (mat) => [box(mat, 'metal', [0.4, 3.6, 3.6], [-6.85, 15, 0], 0.5)],
  A46: (mat) => [box(mat, 'filtru', [0.1, 3.4, 3.4], [-6.58, 15, 0], 0.5)],
  A47: (mat) => [box(mat, 'corp', [1, 3, 3], [-7.6, 15, 0], 0.8)],
  A48: (mat) => [group(
    box(mat, 'metal', [2.8, 3, 3.2], [-11.4, 15, 0], 0.4),
    at(mesh(cylinder(0.8, 0.2, 16), mat('otel')), [-11.4, 15.8, 1.75], AXIS.toPlusZ),
    at(pin(mat('otel'), { d: 0.3, L: 0.8 }), [-11.2, 13.5, 1.6], AXIS.down),
  )],
  A49: (mat) => [hose(mat, 'otel', [[-12.6, 14, 1.7], [-15.5, 13, 1.6], [-19.2, 11.8, 0.6]], 0.08)],
  A50: (mat) => [at(mesh(lathe([[1, 0], [1.4, 0], [1.4, 1.5], [1, 1.5], [1, 0]]), mat('cauciuc')), [-8.2, 15, 0], AXIS.toMinusX)],
  A51: (mat) => [at(oring(mat('cauciuc'), { D: 3, w: 0.3 }), [-9.75, 15, 0], AXIS.toMinusX)],
  A52: (mat) => [[1.2, 1.0], [-1.2, -1.0]].map(([dy, dz]) => at(bolt(mat('otel'), { d: 0.5, L: 5 }), [-13.2, 15 + dy, dz], AXIS.toMinusX)),
  A53: (mat) => [at(pin(mat('otel'), { d: 0.5, L: 3.8 }), [-9.6, 16.5, 0])],
  A84: (mat) => [hose(mat, 'cauciuc', [[-5, 9.6, 2.2], [-7.5, 11.4, 2.2], [-10.2, 13.2, 1.9]], 0.35)],
  A85: (mat) => [hose(mat, 'cauciuc', [[-6, 6.2, 2.6], [-8.6, 9.8, 2.8], [-10.8, 13.4, 1.9]], 0.2)],
  A86: (mat) => [at(mesh(cylinder(0.3, 0.8, 12), mat('metal')), [-10.9, 13.6, 1.9])],
  A87: (mat) => [at(mesh(new THREE.TorusGeometry(0.6, 0.2, 8, 12, Math.PI / 2), mat('cauciuc')), [-6.2, 6.0, 2.6])],

  // ——— 7 · Ambreiaj și pompă de ulei ———
  A57: (mat) => [2, -2].map((z) => at(bolt(mat('otel'), { d: 0.5, L: 1.4 }), [-6, -2.3, z], AXIS.down)),
  A58: (mat) => [hose(mat, 'otel', [[-7.2, -2.6, 1.5], [-7.8, -3.6, 1.5], [-8.6, -3.2, 1.5]], 0.12)],
  A59: (mat) => [box(mat, 'metal', [2, 0.3, 1.5], [-7, -2.6, -2], 0.1)],
  A60: (mat) => [hose(mat, 'otel', [[-8, -2.6, 0], [-8.6, -3.6, 0], [-9.4, -3, 0]], 0.12)],
  A61: (mat) => [at(seal(mat('cauciuc'), { d: 1.5, D: 2.8, B: 0.5 }), [0, CY, 5.05], AXIS.toPlusZ)],
  A62: (mat) => [box(mat, 'metal', [3, 2.4, 0.3], [2.9, 1.0, 6.95], 0.3)],
  A63: (mat) => [[1.8, 0.2], [4.0, 0.2], [2.9, 1.9]]
    .map(([x, y]) => at(bolt(mat('otel'), { d: 0.4, L: 1, head: 'pan' }), [x, y, 7.15], AXIS.toPlusZ)),
  A64: (mat) => [group(
    at(mesh(cylinder(0.9, 0.8, 24), mat('otel')), [0, CY, 6.4], AXIS.toPlusZ),
    at(spring(mat('otel'), { D: 1.9, wire: 0.12, L: 0.7, turns: 3 }), [0, CY, 6.0], AXIS.toPlusZ),
  )],
  A65: (mat) => [at(bearing(mat('otel'), { d: 1.2, D: 1.5, B: 1.45, needle: true }), [0, CY, 7.9], AXIS.toPlusZ)],
  A66: (mat) => [mesh(extrude(gearShape(7, 2.45, 1.95, 0.85), 0.6).translate(0, CY, 9.8), mat('otel'))],
  A67: (mat) => {
    const m = mat('otel');
    return [group(
      at(mesh(lathe([[0.95, 2], [3.6, 2], [3.6, 0], [3.4, 0], [3.4, 1.8], [0.95, 1.8], [0.95, 2]]), m), [0, CY, 7.0], AXIS.toPlusZ),
      at(mesh(lathe([[0.75, 1.8], [0.95, 1.8], [0.95, 2.5], [0.75, 2.5], [0.75, 1.8]]), m), [0, CY, 7.0], AXIS.toPlusZ),
    )];
  },
  A68: (mat) => [at(washer(mat('otel'), { d: 1.6, D: 2.6, t: 0.1 }), [0, CY, 6.85], AXIS.toPlusZ)],
  A69: (mat) => {
    const m = mat('metal');
    const g = group(at(mesh(cylinder(1, 1.2, 6), m), [0, CY, 8.2], AXIS.toPlusZ));
    for (let k = 0; k < 3; k++) {
      const a0 = k * ((Math.PI * 2) / 3) + 0.1;
      const a1 = a0 + 1.9;
      const s = new THREE.Shape();
      s.absarc(0, 0, 3.3, a0, a1, false);
      s.absarc(0, 0, 2.3, a1, a0, true);
      s.closePath();
      g.add(mesh(extrude(s, 1.2).translate(0, CY, 8.2), m));
    }
    return [g];
  },
  A70: (mat) => [1.3, 4.5].map((x) => at(bolt(mat('otel'), { d: 0.4, L: 1.4 }), [x, 2.3, 6.7], AXIS.toPlusZ)),
  A71: (mat) => [hose(mat, 'metal', [[4.6, 1.8, 6.3], [6.2, 2.6, 6.6], [7.2, 3.4, 8.6]], 0.15)],
  A72: (mat) => [box(mat, 'metal', [3, 2.4, 1.2], [2.9, 1.0, 6.2], 0.4)],
  A73: (mat) => [at(oring(mat('cauciuc'), { D: 1.2, w: 0.2 }), [4.6, 1.8, 5.8], AXIS.toPlusZ)],
  A74: (mat) => [hose(mat, 'cauciuc', [[1.5, 0.4, 5.8], [-3, -1, 4.2], [-8.8, -1.6, 3.0]], 0.15)],
  A75: (mat) => [at(mesh(cylinder(0.5, 1.2, 12), mat('filtru')), [-9.5, -1.6, 3.0], AXIS.toPlusX)],
  A76: (mat) => [at(mesh(cylinder(0.25, 0.5, 10), mat('cauciuc')), [7.3, 3.6, 8.8], AXIS.toPlusZ)],
  A77: (mat) => [box(mat, 'metal', [3, 1.4, 0.3], [9.8, CY, 9.25], 0.2)],
  A78: (mat) => [8, 11.5].map((x) => at(pin(mat('otel'), { d: 0.8, L: 4.2 }), [x, CY, 8.8], AXIS.toPlusZ)),
  A79: (mat) => [8.6, 11].map((x) => at(bolt(mat('otel'), { d: 0.5, L: 1 }), [x, 2.8, 9.5], AXIS.toPlusZ)),
};
