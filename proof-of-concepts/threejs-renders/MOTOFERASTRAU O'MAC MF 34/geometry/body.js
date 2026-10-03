// Corpul (foaia „B Explosive view") plus piesele din foaia A care țin de el:
// pozițiile ansamblurilor 6 și 8–13. Același contract ca în engine.js.
// Centimetri; X spre șină, Y în sus, +Z partea lanțului, −Z partea demarorului.
import * as THREE from 'three';
import {
  mesh, group, at, AXIS, rbox, lathe, extrude, tube, cylinder, ringGeometry, stadiumPoints,
  bolt, nut, flangeNut, wingNut, washer, oring, circlip, pin, rivet, spring, torsionSpring, spiralSpring,
} from './hardware.js';

const CY = 4;
export const BAR_ORIGIN = [-2.5, CY, 9.8];
export const STARTER_BADGE_SPOT = [-3.5, 10, -13.45];

const box = (mat, kind, [w, h, d], pos, r = 0.4) => at(mesh(rbox(w, h, d, r), mat(kind)), pos);
const hose = (mat, kind, points, r) => mesh(tube(points, r), mat(kind));
const cap = (m) => group(
  mesh(lathe([[0, 0], [1.4, 0], [1.4, 0.9], [1.1, 1.1], [0, 1.1]]), m),
  at(mesh(rbox(2.2, 0.4, 0.4, 0.15, 0.05), m), [0, 1.2, 0]),
);

// Șuruburile carcaselor mânerului spate (stânga: B8, dreapta: B49).
const REAR_SCREWS = [[-17, 0], [-19.5, -2], [-22, 0], [-24.5, -2], [-27, 0], [-29.5, -2], [-32, 0], [-18, -2.4], [-31, -2.4]];

export const BODY = {
  // ——— 6 · Filtru de aer și capace ———
  A54: (mat) => [box(mat, 'filtru', [7, 0.1, 7.5], [-9.6, 18.1, 0], 0.8)],
  A55: (mat) => {
    const g = group(box(mat, 'filtru', [6.6, 2, 7], [-9.6, 19.2, 0], 1));
    for (const z of [-2.4, -0.8, 0.8, 2.4]) g.add(box(mat, 'filtru', [6.2, 0.25, 0.3], [-9.6, 20.3, z], 0.1));
    return [g];
  },
  A56: (mat) => [at(wingNut(mat('otel'), { d: 0.5 }), [-9.6, 20.3, 0])],
  B1: (mat) => [2.2, -2.2].map((z) => box(mat, 'corp', [0.5, 1.2, 1], [-13.7, 25.2, z], 0.2)),
  B2: (mat) => [box(mat, 'plastic', [9, 1.6, 10], [-9, 25.6, 0], 1.5)],
  B6: (mat) => [group(
    box(mat, 'plastic', [22, 12, 13], [-2, 18.9, 0], 3),
    box(mat, 'corp', [5, 1.6, 1.2], [2, 24.9, 3.2], 0.6),
    box(mat, 'corp', [5, 1.6, 1.2], [2, 24.9, -3.2], 0.6),
  )],
  B9: (mat) => [box(mat, 'metal', [0.6, 6, 7], [10.6, 15.5, 0], 1)],
  B10: (mat) => [[17.6, 2.5], [17.6, -2.5], [13.2, 0]]
    .map(([y, z]) => at(bolt(mat('otel'), { d: 0.35, L: 1, head: 'pan' }), [11.0, y, z], AXIS.toPlusX)),
  B11: (mat) => [[[-13.1, 14, 4], AXIS.toMinusX], [[-13.1, 14, -4], AXIS.toMinusX], [[9.1, 13.6, -4.6], AXIS.toPlusX]]
    .map(([pos, r]) => at(washer(mat('cauciuc'), { d: 0.4, D: 1, t: 0.3 }), pos, r)),

  // ——— 8 · Frână de lanț și protecție ———
  A80: (mat) => {
    const s = new THREE.Shape(
      [[0, 0], [1.6, 0], [1.6, 1], [2.8, 2], [1.6, 3], [1.6, 4], [2.8, 5], [1.6, 6], [1.6, 7], [0, 7]].map(([x, y]) => new THREE.Vector2(x, y)),
    );
    return [mesh(extrude(s, 8).translate(7.1, CY - 3.5, 0), mat('metal'))];
  },
  A88: (mat) => [at(nut(mat('otel'), { d: 0.5 }), [11.8, 13.2, 6.6], AXIS.toPlusZ)],
  A89: (mat) => [at(spring(mat('otel'), { D: 0.4, wire: 0.05, L: 1.2, turns: 7 }), [10.4, 12.6, 5.6], AXIS.toPlusZ)],
  A90: (mat) => [at(bolt(mat('otel'), { d: 0.4, L: 1, head: 'pan' }), [10.6, 11.4, 7.0], AXIS.toPlusZ)],
  A91: (mat) => [box(mat, 'metal', [0.6, 2.5, 0.4], [10.2, 12.2, 6.4], 0.1)],
  A92: (mat) => [box(mat, 'corp', [1.2, 1, 0.8], [9.2, 10.8, 6.3], 0.2)],
  A93: (mat) => [at(washer(mat('otel'), { d: 0.5, D: 1, t: 0.1 }), [11.2, 12.4, 7.0], AXIS.toPlusZ)],
  A94: (mat) => [at(bolt(mat('otel'), { d: 0.5, L: 2 }), [11.2, 12.4, 7.1], AXIS.toPlusZ)],
  B3: (mat) => {
    const s = new THREE.Shape();
    s.moveTo(-6, 0);
    s.lineTo(6, 0);
    s.lineTo(6, 14);
    s.quadraticCurveTo(6, 16, 4, 16);
    s.lineTo(-4, 16);
    s.quadraticCurveTo(-6, 16, -6, 14);
    s.lineTo(-6, 0);
    for (const x of [-3.6, 0, 3.6]) {
      const slot = new THREE.Path();
      slot.moveTo(x - 1.1, 4);
      slot.lineTo(x + 1.1, 4);
      slot.lineTo(x + 1.1, 13);
      slot.lineTo(x - 1.1, 13);
      slot.lineTo(x - 1.1, 4);
      s.holes.push(slot);
    }
    return [mesh(extrude(s, 1.2, 0.2).rotateY(Math.PI / 2).translate(9.6, 12.5, 0), mat('corp'))];
  },
  B5: (mat) => [at(bolt(mat('otel'), { d: 0.5, L: 1.8, head: 'pan' }), [9.6, 13.4, 6.8], AXIS.toPlusZ)],
  B55: (mat) => [box(mat, 'metal', [3, 2.5, 0.2], [7, 10, 10.6], 0.2)],
  B56: (mat) => [[6, 9.2], [8, 9.2], [7, 10.9]]
    .map(([x, y]) => at(bolt(mat('otel'), { d: 0.4, L: 0.8, head: 'pan' }), [x, y, 10.8], AXIS.toPlusZ)),
  B62: (mat) => [at(pin(mat('otel'), { d: 0.3, L: 0.9 }), [8, 11, 9.9], AXIS.toPlusZ)],
  B63: (mat) => [at(mesh(lathe([[3.7, 0], [3.85, 0], [3.85, 1.4], [3.7, 1.4], [3.7, 0]], 32, 0.4, Math.PI * 1.7), mat('otel')), [0, CY, 7.3], AXIS.toPlusZ)],
  B64: (mat) => [group(
    box(mat, 'corp', [15, 11, 2.6], [6.5, 5, 11.7], 3),
    box(mat, 'corp', [3, 1.2, 0.4], [10, 2.4, 13.1], 0.2),
  )],
  B66: (mat) => [at(spring(mat('otel'), { D: 0.8, wire: 0.1, L: 3.2, turns: 10 }), [3.6, 11.2, 9.9], AXIS.toPlusX)],
  B67: (mat) => [at(pin(mat('otel'), { d: 0.24, L: 3.2 }), [3.2, 9.6, 9.2], AXIS.toPlusX)],
  B68: (mat) => [box(mat, 'metal', [1.5, 0.8, 0.3], [7, 12.2, 9.9], 0.1)],
  B69: (mat) => [at(mesh(rbox(4.2, 1, 0.4, 0.4, 0.1), mat('metal')), [8.6, 12.4, 10.0], [0, 0, 0.35])],
  B70: (mat) => [at(circlip(mat('otel'), { D: 0.4, w: 0.06 }), [9.5, 13.2, 10.3], AXIS.toPlusZ)],
  B71: (mat) => [at(rivet(mat('otel'), { d: 0.3, L: 0.9 }), [7.4, 12.0, 9.6], AXIS.toPlusZ)],
  B72: (mat) => [at(rivet(mat('otel'), { d: 0.3, L: 1.3 }), [9.6, 12.8, 9.4], AXIS.toPlusZ)],

  // ——— 9 · Demaror ———
  B12: (mat) => [box(mat, 'metal', [0.8, 0.4, 0.8], [3.5, 12.3, -12.1], 0.1)],
  B13: (mat) => [at(spring(mat('otel'), { D: 0.5, wire: 0.06, L: 1.2, turns: 6 }), [3.5, 12.5, -12.1])],
  B14: (mat) => [box(mat, 'plastic', [4, 1.2, 1.6], [3.5, 14.6, -12.4], 0.5)],
  B15: (mat) => [hose(mat, 'filtru', [[0.4, 7.3, -11.7], [2.2, 10.5, -12.2], [3.5, 13.9, -12.4]], 0.15)],
  B16: (mat) => {
    const g = group(box(mat, 'corp', [15, 14, 2.6], [-1, 5.6, -12.1], 3));
    for (let i = 0; i < 6; i++) g.add(box(mat, 'corp', [0.4, 5, 0.3], [-6 + i * 1.1, 4.5, -13.5], 0.1));
    return [g];
  },
  B17: (mat) => [at(washer(mat('otel'), { d: 0.6, D: 1.6, t: 0.1 }), [0, CY, -11.0], AXIS.toMinusZ)],
  B18: (mat) => [at(spiralSpring(mat('otel'), { r0: 0.6, r1: 2.6, turns: 6, width: 0.5 }), [0, CY, -12.7], AXIS.toPlusZ)],
  B19: (mat) => [at(mesh(lathe([[0.4, 0], [2.8, 0], [2.8, 0.8], [2.65, 0.8], [2.65, 0.1], [0.4, 0.1], [0.4, 0]]), mat('corp')), [0, CY, -13.1], AXIS.toPlusZ)],
  B20: (mat) => [at(mesh(lathe([[0.4, 0], [3.2, 0], [3.2, 0.25], [2.6, 0.4], [3.2, 0.55], [3.2, 0.8], [0.4, 0.8], [0.4, 0]]), mat('corp')), [0, CY, -12.2], AXIS.toPlusZ)],
  B21: (mat) => [at(spring(mat('otel'), { D: 0.3, wire: 0.04, L: 0.6, turns: 5 }), [1.3, 5.3, -11.3], AXIS.toPlusZ)],
  B22: (mat) => [at(mesh(rbox(1.4, 0.5, 0.3, 0.2, 0.05), mat('metal')), [1.5, 5.8, -11.0], [0, 0, 0.5])],
  B23: (mat) => [at(washer(mat('otel'), { d: 0.5, D: 1.4, t: 0.12 }), [0, CY, -11.2], AXIS.toMinusZ)],
  B24: (mat) => [at(mesh(ringGeometry(2, 11, 0.15), mat('corp')), [0, CY, -10.85], AXIS.toMinusZ)],

  // ——— 10 · Mânere și comenzi ———
  B4: (mat) => [[3, -2, -13.6], [3, -2, -14.6], [3, 16.2, 8.2], [3, 16.2, 9.0], [-14.6, -3.2, 3], [-14.6, -3.2, -3], [-16, -3.2, 3.6], [-16, -3.2, -3.6]]
    .map((pos) => at(bolt(mat('otel'), { d: 0.5, L: 1.4 }), pos, AXIS.down)),
  B7: (mat) => [hose(mat, 'cauciuc', [[3, -1, -14], [3, 12, -14.5], [3, 22, -11], [3, 27, 0], [3, 23, 6], [3, 17, 8.6]], 1.2)],
  B8: (mat) => REAR_SCREWS.map(([x, y]) => at(bolt(mat('otel'), { d: 0.5, L: 1.4, head: 'pan' }), [x, y, -5.8], AXIS.toMinusZ)),
  B25: (mat) => [at(spring(mat('otel'), { D: 0.9, D2: 0.5, wire: 0.1, L: 1.4, turns: 5 }), [-6, -3.8, 0])],
  B26: (mat) => [at(mesh(lathe([[0, 0], [0.7, 0], [0.7, 0.2], [0.4, 0.4], [0, 0.4]]), mat('metal')), [-6, -4.2, 0])],
  B29: (mat) => [4.2, -4.2].map((z) => at(washer(mat('cauciuc'), { d: 0.4, D: 1, t: 0.3 }), [-14.7, 6, z], AXIS.toMinusX)),
  B30: (mat) => [3, -3].map((z) => at(mesh(cylinder(0.7, 2.2, 16), mat('cauciuc')), [-13.4, -2.2, z], AXIS.toPlusX)),
  B32: (mat) => [group(
    box(mat, 'metal', [0.4, 0.6, 1.6], [-13.5, 8, 4.8], 0.1),
    at(pin(mat('otel'), { d: 0.4, L: 2 }), [-13.5, 8, 4.2], AXIS.toMinusX),
    at(pin(mat('otel'), { d: 0.4, L: 2 }), [-13.5, 8, 5.4], AXIS.toMinusX),
  )],
  B33: (mat) => [at(mesh(cylinder(0.8, 2, 16), mat('cauciuc')), [8.2, -2.4, 0], AXIS.toPlusX)],
  B34: (mat) => [box(mat, 'corp', [1.5, 1, 1.5], [-14.9, 10.2, 0], 0.3)],
  B35: (mat) => [box(mat, 'metal', [1, 2.2, 0.8], [-16.4, 10.6, 0], 0.2)],
  B38: (mat) => {
    const loop = [[-16, 2], [-24, 1], [-33, 2], [-35.5, 6], [-31, 11.5], [-22, 13], [-15.5, 13]].map(([x, y]) => [x, y, 0]);
    return [group(
      box(mat, 'corp', [18, 4, 11], [-25, -1, 0], 2),
      hose(mat, 'corp', loop, 1.3),
      box(mat, 'plastic', [10, 0.8, 2.8], [-23, 14.1, 0], 0.4),
    )];
  },
  B39: (mat) => [box(mat, 'plastic', [3, 1.8, 1.2], [-19.5, 11.2, 0], 0.4)],
  B40: (mat) => [at(torsionSpring(mat('otel'), { D: 0.5, wire: 0.06, turns: 4, leg: 0.8 }), [-18.4, 12.2, -0.15], AXIS.toPlusZ)],
  B41: (mat) => [at(pin(mat('otel'), { d: 0.6, L: 2.8 }), [-18.4, 12.2, -1.4], AXIS.toPlusZ)],
  B42: (mat) => [box(mat, 'corp', [5, 0.6, 1], [-21.5, 14.8, 0], 0.25)],
  B44: (mat) => [box(mat, 'corp', [1.5, 1, 1.5], [-14.9, 0.6, 0], 0.3)],
  B45: (mat) => [at(bolt(mat('otel'), { d: 0.5, L: 1.2 }), [-15.2, 12.8, 4.9], AXIS.toPlusZ)],
  B46: (mat) => [box(mat, 'comutator', [1.6, 1.2, 0.8], [-15.6, 12.4, 4.3], 0.2)],
  B47: (mat) => [at(bolt(mat('otel'), { d: 0.5, L: 1.8, head: 'pan' }), [-16, 4, 5.8], AXIS.toPlusZ)],
  B49: (mat) => [...REAR_SCREWS, [-33.5, -1]]
    .map(([x, y]) => at(bolt(mat('otel'), { d: 0.4, L: 1, head: 'pan' }), [x, y, 5.8], AXIS.toPlusZ)),

  // ——— 11 · Rezervoare ———
  A25: (mat) => [at(mesh(cylinder(0.45, 1.6, 12), mat('filtru')), [-11.5, -2.4, -3.8], AXIS.toPlusZ)],
  A26: (mat) => [at(oring(mat('cauciuc'), { D: 2.2, w: 0.2 }), [-11.5, -2, -5.3], AXIS.toMinusZ)],
  A27: (mat) => [at(cap(mat('corp')), [-11.5, -2, -5.5], AXIS.toMinusZ)],
  A81: (mat) => [at(mesh(cylinder(0.5, 1, 12), mat('filtru')), [-14.2, 2, 5.0], AXIS.toPlusZ)],
  A82: (mat) => [at(circlip(mat('otel'), { D: 1, w: 0.08 }), [-14.2, 2, 5.6], AXIS.toPlusZ)],
  A83: (mat) => [at(mesh(cylinder(0.45, 0.6, 12, 0.25), mat('cauciuc')), [-14.2, 2, 6.0], AXIS.toPlusZ)],
  B31: (mat) => [box(mat, 'corp', [9, 4, 10.5], [-11.5, -2, 0], 1.4)],
  B36: (mat) => [at(mesh(cylinder(0.5, 1.4, 12), mat('filtru')), [-11.5, -3, 2])],
  B37: (mat) => [hose(mat, 'cauciuc', [[-11.5, -2.3, 2], [-11.3, -1.2, 2.4], [-11, -0.5, 2.6]], 0.15)],
  B43: (mat) => [hose(mat, 'cauciuc', [[-11, -0.5, 2.6], [-11.6, 6, 3.0], [-11.3, 13.4, 1.7]], 0.25)],
  B52: (mat) => [at(mesh(cylinder(0.4, 1.4, 12), mat('filtru')), [-6, -1.6, 4.2], AXIS.toPlusZ)],
  B53: (mat) => [at(oring(mat('cauciuc'), { D: 2, w: 0.2 }), [-6, -1, 5.5], AXIS.toPlusZ)],
  B54: (mat) => [at(cap(mat('corp')), [-6, -1, 5.7], AXIS.toPlusZ)],

  // ——— 12 · Șină, lanț și întinzător ———
  B27: (mat) => [box(mat, 'metal', [0.6, 2.2, 1.6], [5.2, 0.4, 9.8], 0.2)],
  B28: (mat) => [[5.0, 1.2], [5.4, -0.2], [4.6, -0.2]]
    .map(([x, y]) => at(bolt(mat('otel'), { d: 0.5, L: 1.3 }), [x, y, 10.7], AXIS.toPlusZ)),
  B57: (mat) => [box(mat, 'metal', [2.5, 1.5, 0.3], [12.8, 1.8, 10.25], 0.2)],
  B58: (mat) => [box(mat, 'metal', [2.5, 1.2, 0.2], [10, 2.4, 10.45], 0.1)],
  B59: (mat) => [at(nut(mat('otel'), { d: 0.5 }), [10.6, 2.4, 10.2], AXIS.toPlusX)],
  B60: (mat) => [at(pin(mat('otel'), { d: 0.4, L: 0.6 }), [13.2, 4.9, 9.5], AXIS.toPlusZ)],
  B61: (mat) => [at(bolt(mat('otel'), { d: 0.5, L: 4, head: 'pan' }), [7.2, 2.4, 10.2], AXIS.toMinusX)],
  B65: (mat) => [8, 11.5].map((x) => at(flangeNut(mat('otel'), { d: 0.8 }), [x, CY, 13.0], AXIS.toPlusZ)),
  B73: (mat) => {
    const links = stadiumPoints(40, 2.5, 2.9, 64);
    const chain = new THREE.InstancedMesh(new THREE.BoxGeometry(0.9, 0.5, 0.7), mat('lant'), links.length);
    const dummy = new THREE.Object3D();
    links.forEach((p, i) => {
      dummy.position.set(p.x, p.y, 0);
      dummy.rotation.set(0, 0, p.angle);
      dummy.updateMatrix();
      chain.setMatrixAt(i, dummy.matrix);
    });
    chain.computeBoundingBox();
    chain.computeBoundingSphere();
    return [at(chain, BAR_ORIGIN)];
  },
  B74: (mat) => {
    const s = new THREE.Shape();
    s.moveTo(0, -2.5);
    s.lineTo(37.5, -2.5);
    s.absarc(37.5, 0, 2.5, -Math.PI / 2, Math.PI / 2, false);
    s.lineTo(0, 2.5);
    s.lineTo(0, -2.5);
    return [at(mesh(extrude(s, 0.5), mat('sina')), BAR_ORIGIN)];
  },
  B75: (mat) => [box(mat, 'corp', [37, 6.8, 1.4], [17.5, CY, 9.8], 1.5)],

  // ——— 13 · Trusă de scule ———
  B48: (mat) => [box(mat, 'metal', [2, 0.2, 1.2], [-23.5, -3.3, 0], 0.05)],
  B50: (mat) => [box(mat, 'corp', [3.4, 0.8, 2.2], [-21.5, -3.5, 0], 0.3)],
  B51: (mat) => {
    const m = mat('otel');
    const tool = group(
      at(mesh(cylinder(0.9, 3.6, 6), m), [0, 1.8, 0]),
      at(mesh(cylinder(0.3, 5, 12), m), [0, 3.2, 0], [Math.PI / 2, 0, 0]),
    );
    return [at(tool, [-24, -4.6, 0], AXIS.toPlusX)];
  },
};
