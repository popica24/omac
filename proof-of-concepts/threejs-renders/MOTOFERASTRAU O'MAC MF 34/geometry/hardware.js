// Piese standard (șuruburi, piulițe, șaibe, rulmenți, simeringuri, arcuri…) construite
// parametric din dimensiunile din denumire, plus ajutoare de geometrie. Unități: centimetri.
// Fiecare piesă e construită pe axa +Y; așezarea în utilaj se face cu `at()`.
import * as THREE from 'three';

export const mesh = (geometry, material) => new THREE.Mesh(geometry, material);

export function group(...children) {
  const g = new THREE.Group();
  if (children.length) g.add(...children);
  return g;
}

export function at(obj, [x, y, z], [rx, ry, rz] = [0, 0, 0]) {
  obj.position.set(x, y, z);
  obj.rotation.set(rx, ry, rz);
  return obj;
}

// Rotiri care duc axa +Y a piesei pe axa cerută.
export const AXIS = {
  up: [0, 0, 0],
  down: [Math.PI, 0, 0],
  toPlusZ: [Math.PI / 2, 0, 0],
  toMinusZ: [-Math.PI / 2, 0, 0],
  toPlusX: [0, 0, -Math.PI / 2],
  toMinusX: [0, 0, Math.PI / 2],
};

// Geometriile identice (aceeași piesă standard) se refolosesc.
const cache = new Map();
const cached = (key, make) => {
  if (!cache.has(key)) cache.set(key, make());
  return cache.get(key);
};

export function roundedRectShape(w, h, r) {
  const x = -w / 2;
  const y = -h / 2;
  const s = new THREE.Shape();
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

// Cutie cu colțuri rotunjite: w pe X, h pe Y, d pe Z, centrată în origine.
export function rbox(w, h, d, r = 1, bevel = 0.4) {
  const b = Math.min(bevel, w / 4, h / 4, d / 4);
  const iw = w - 2 * b;
  const ih = h - 2 * b;
  const ir = Math.max(0.005, Math.min(r - b, iw / 2, ih / 2));
  const g = new THREE.ExtrudeGeometry(roundedRectShape(iw, ih, ir), {
    depth: d - 2 * b, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 2, curveSegments: 8,
  });
  g.translate(0, 0, -(d - 2 * b) / 2);
  return g;
}

export function lathe(profile, segments = 32, phiStart = 0, phiLength = Math.PI * 2) {
  return new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), segments, phiStart, phiLength);
}

// Inel (șaibă, garnitură rotundă): diametre d (interior) și D (exterior), grosime t pe +Y.
export function ringGeometry(d, D, t) {
  return cached(`ring|${d}|${D}|${t}`, () => lathe([[d / 2, 0], [D / 2, 0], [D / 2, t], [d / 2, t], [d / 2, 0]]));
}

export function cylinder(r, h, segments = 16, rTop = r) {
  return new THREE.CylinderGeometry(rTop, r, h, segments);
}

// Extrudare pe Z, centrată (de la −depth/2 la +depth/2).
export function extrude(shape, depth, bevel = 0) {
  const g = new THREE.ExtrudeGeometry(shape, {
    depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 16,
  });
  g.translate(0, 0, -depth / 2);
  return g;
}

export function gearShape(teeth, rOut, rRoot, rHole) {
  const s = new THREE.Shape();
  const step = (Math.PI * 2) / teeth;
  for (let k = 0; k < teeth; k++) {
    const a = k * step;
    const pts = [[rRoot, a], [rOut, a + 0.25 * step], [rOut, a + 0.5 * step], [rRoot, a + 0.75 * step]];
    pts.forEach(([r, ang], j) => {
      const x = r * Math.cos(ang);
      const y = r * Math.sin(ang);
      if (k === 0 && j === 0) s.moveTo(x, y);
      else s.lineTo(x, y);
    });
  }
  s.closePath();
  if (rHole) {
    const h = new THREE.Path();
    h.absarc(0, 0, rHole, 0, Math.PI * 2, true);
    s.holes.push(h);
  }
  return s;
}

export function tube(points, r, segments = 48) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  return new THREE.TubeGeometry(curve, segments, r, 8, false);
}

// Puncte egal distanțate pe conturul șinei (dreptunghi cu capete rotunde),
// în sensul acelor de ceasornic, pornind de sus de la capătul dinspre motor.
export function stadiumPoints(length, endRadius, pathRadius, count) {
  const c1 = endRadius;
  const c2 = length - endRadius;
  const straight = c2 - c1;
  const arc = Math.PI * pathRadius;
  const perimeter = 2 * straight + 2 * arc;
  const points = [];
  for (let i = 0; i < count; i++) {
    let d = (i * perimeter) / count;
    if (d < straight) {
      points.push({ x: c1 + d, y: pathRadius, angle: 0 });
      continue;
    }
    d -= straight;
    if (d < arc) {
      const a = Math.PI / 2 - d / pathRadius;
      points.push({ x: c2 + pathRadius * Math.cos(a), y: pathRadius * Math.sin(a), angle: a - Math.PI / 2 });
      continue;
    }
    d -= arc;
    if (d < straight) {
      points.push({ x: c2 - d, y: -pathRadius, angle: Math.PI });
      continue;
    }
    d -= straight;
    const a = -Math.PI / 2 - d / pathRadius;
    points.push({ x: c1 + pathRadius * Math.cos(a), y: pathRadius * Math.sin(a), angle: a - Math.PI / 2 });
  }
  return points;
}

// ——— Piese standard ———

export function bolt(m, { d, L, head = 'hex' }) {
  const shank = cached(`shank|${d}|${L}`, () => cylinder(d / 2, L, 12).translate(0, -L / 2, 0));
  const top = head === 'hex'
    ? cached(`hexhead|${d}`, () => cylinder(0.85 * d, 0.65 * d, 6).translate(0, 0.325 * d, 0))
    : cached(`panhead|${d}`, () => lathe([[0, 0], [0.95 * d, 0], [0.95 * d, 0.2 * d], [0.7 * d, 0.55 * d], [0, 0.62 * d]], 16));
  return group(mesh(shank, m), mesh(top, m));
}

function hexNutGeometry(d, h) {
  const s = new THREE.Shape();
  const R = 0.95 * d;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    if (i === 0) s.moveTo(R * Math.cos(a), R * Math.sin(a));
    else s.lineTo(R * Math.cos(a), R * Math.sin(a));
  }
  s.closePath();
  const hole = new THREE.Path();
  hole.absarc(0, 0, d / 2, 0, Math.PI * 2, true);
  s.holes.push(hole);
  const g = new THREE.ExtrudeGeometry(s, { depth: h, bevelEnabled: false, curveSegments: 12 });
  g.rotateX(-Math.PI / 2); // extrudarea pe +Z devine +Y
  return g;
}

export function nut(m, { d }) {
  return mesh(cached(`nut|${d}`, () => hexNutGeometry(d, 0.8 * d)), m);
}

export function flangeNut(m, { d }) {
  const n = nut(m, { d });
  n.position.y = 0.2 * d;
  return group(mesh(ringGeometry(d, 2.2 * d, 0.2 * d), m), n);
}

export function wingNut(m, { d }) {
  const g = group(nut(m, { d }));
  for (const s of [1, -1]) {
    g.add(at(mesh(rbox(1.2 * d, 1.4 * d, 0.25 * d, 0.1, 0.05), m), [s * 1.1 * d, 0.7 * d, 0]));
  }
  return g;
}

export function washer(m, { d, D, t }) {
  return mesh(ringGeometry(d, D, t), m);
}

export function oring(m, { D, w }) {
  return mesh(cached(`oring|${D}|${w}`, () => new THREE.TorusGeometry(D / 2 - w / 2, w / 2, 8, 32).rotateX(Math.PI / 2).translate(0, w / 2, 0)), m);
}

export function bearing(m, { d, D, B, needle = false }) {
  const wall = (D - d) / 2;
  const k = wall * 0.3;
  const g = group(mesh(ringGeometry(D - 2 * k, D, B), m), mesh(ringGeometry(d, d + 2 * k, B), m));
  const rMid = (d + D) / 4;
  const count = needle ? 14 : 9;
  const element = needle
    ? cached(`needle|${wall}|${B}`, () => cylinder(wall * 0.18, B * 0.8, 8))
    : cached(`ball|${wall}`, () => new THREE.SphereGeometry(wall * 0.22, 10, 8));
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    g.add(at(mesh(element, m), [rMid * Math.cos(a), B / 2, rMid * Math.sin(a)]));
  }
  return g;
}

export function seal(m, { d, D, B }) {
  const lip = d / 2 + (0.3 * (D - d)) / 2;
  return mesh(cached(`seal|${d}|${D}|${B}`, () => lathe([[d / 2, 0], [D / 2, 0], [D / 2, B], [lip, B], [d / 2, B * 0.6], [d / 2, 0]])), m);
}

export function circlip(m, { D, w }) {
  return mesh(cached(`clip|${D}|${w}`, () => new THREE.TorusGeometry(D / 2, w / 2, 6, 32, Math.PI * 1.8).rotateX(Math.PI / 2).translate(0, w / 2, 0)), m);
}

export function pin(m, { d, L }) {
  return mesh(cached(`pin|${d}|${L}`, () => cylinder(d / 2, L, 12).translate(0, L / 2, 0)), m);
}

export function rivet(m, { d, L }) {
  const dome = cached(`dome|${d}`, () => new THREE.SphereGeometry(d * 0.9, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2));
  return group(pin(m, { d, L }), at(mesh(dome, m), [0, L, 0]));
}

export function key(m, { w, h, L }) {
  return mesh(cached(`key|${w}|${h}|${L}`, () => rbox(w, L, h, w / 2, w / 6).translate(0, L / 2, 0)), m);
}

class Helix extends THREE.Curve {
  constructor(r0, r1, L, turns) {
    super();
    Object.assign(this, { r0, r1, L, turns });
  }

  getPoint(t, target = new THREE.Vector3()) {
    const a = t * this.turns * Math.PI * 2;
    const r = this.r0 + (this.r1 - this.r0) * t;
    return target.set(r * Math.cos(a), t * this.L, r * Math.sin(a));
  }
}

export function spring(m, { D, wire, L, turns, D2 = D }) {
  const key = `spring|${D}|${D2}|${wire}|${L}|${turns}`;
  return mesh(cached(key, () => new THREE.TubeGeometry(new Helix(D / 2, D2 / 2, L, turns), Math.ceil(turns * 20), wire / 2, 6, false).translate(0, wire / 2, 0)), m);
}

export function torsionSpring(m, { D, wire, turns, leg }) {
  const L = turns * wire * 1.15;
  const g = group(spring(m, { D, wire, L, turns }));
  const arm = cached(`leg|${wire}|${leg}`, () => cylinder(wire / 2, leg, 6).rotateZ(Math.PI / 2).translate(leg / 2, 0, 0));
  g.add(at(mesh(arm, m), [D / 2, wire / 2, 0], [0, 0.6, 0]));
  g.add(at(mesh(arm, m), [D / 2, L + wire / 2, 0], [0, -0.6, 0]));
  return g;
}

class Spiral extends THREE.Curve {
  constructor(r0, r1, turns) {
    super();
    Object.assign(this, { r0, r1, turns });
  }

  getPoint(u, target = new THREE.Vector3()) {
    const a = u * this.turns * Math.PI * 2;
    const r = this.r0 + (this.r1 - this.r0) * u;
    return target.set(r * Math.cos(a), 0, r * Math.sin(a));
  }
}

// Arc spiral plat (arcul demarorului): bandă de lățime `width` pe Y.
export function spiralSpring(m, { r0, r1, turns, width }) {
  const t = 0.05;
  const s = mesh(new THREE.TubeGeometry(new Spiral(r0, r1, turns), Math.ceil(turns * 40), t, 4, false), m);
  s.scale.y = width / (2 * t);
  s.position.y = width / 2;
  return group(s);
}
