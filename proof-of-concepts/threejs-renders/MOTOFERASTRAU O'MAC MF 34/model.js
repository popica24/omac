// Asamblează utilajul: o poziție = un grup cu piesele ei (exact cantitatea de pe foaie),
// cu materiale proprii, o ancoră pentru marker pe suprafața ei și parametrii de explodare.
// Unități: centimetri. X = lungimea utilajului (șina spre +X), Y = sus,
// +Z = partea lanțului, −Z = partea demarorului.
import * as THREE from 'three';
import { ASSEMBLIES, POSITIONS } from './parts.js';
import { ENGINE } from './geometry/engine.js';
import { BODY, STARTER_BADGE_SPOT } from './geometry/body.js';

export { stadiumPoints } from './geometry/hardware.js';

// Cât pleacă fiecare ansamblu la explodare completă (t = 1).
export const ASSEMBLY_DIRS = {
  1: [0, 22, 0],
  2: [20, 8, 0],
  3: [0, -16, 0],
  4: [0, 6, -22],
  5: [-20, 8, 0],
  6: [-4, 30, 0],
  7: [8, -6, 20],
  8: [18, 14, 18],
  9: [0, 2, -28],
  10: [-26, 0, 0],
  11: [-12, -18, 0],
  12: [28, -8, 12],
  13: [-22, -16, -10],
};

// Spațiul dintre piese în grila ansamblului activ (cm).
export const GRID_GAP = 8;

// Raportul lățime/înălțime al viewer-ului pe desktop; grila explodată încearcă să-l urmeze.
export const VIEW_ASPECT = 1.1;

// La explodare, piesele mici se măresc până ocupă cel mult EXPLODE_FILL din celula lor
// (dar de cel mult MAX_EXPLODE_SCALE ori), ca un șurub să se vadă lângă un carter.
export const EXPLODE_FILL = 0.6;
export const MAX_EXPLODE_SCALE = 8;

// Accesorii care nu stau montate pe utilaj: apar doar cu ansamblul lor, explodat.
export const ACCESSORIES = new Set(['B75']);

const BUILDERS = { ...ENGINE, ...BODY };

export function easeInOutCubic(x) {
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

export function stepToward(current, target, dt, duration) {
  const step = dt / duration;
  return current < target ? Math.min(target, current + step) : Math.max(target, current - step);
}

// dir·t + spread·t·k; „+ 0" transformă −0 în 0, ca pozițiile asamblate să fie identice.
export function explodeOffset(dir, spread, t, k) {
  const s = t * k;
  return {
    x: dir[0] * t + spread[0] * s + 0,
    y: dir[1] * t + spread[1] * s + 0,
    z: dir[2] * t + spread[2] * s + 0,
  };
}

// Așază dreptunghiuri (w × h) pe rânduri, în ordine, cu `gap` între ele, centrat în origine.
// Întoarce centrul fiecăruia: x spre dreapta, y în jos.
export function gridLayout(sizes, gap, columns = Math.ceil(Math.sqrt(sizes.length * 1.6))) {
  const rows = Math.ceil(sizes.length / columns);
  const colW = Array(columns).fill(0);
  const rowH = Array(rows).fill(0);
  sizes.forEach(({ w, h }, i) => {
    const c = i % columns;
    const r = Math.floor(i / columns);
    colW[c] = Math.max(colW[c], w);
    rowH[r] = Math.max(rowH[r], h);
  });
  const colX = [];
  let x = 0;
  colW.forEach((w, c) => { colX[c] = x + w / 2; x += w + gap; });
  const rowY = [];
  let y = 0;
  rowH.forEach((h, r) => { rowY[r] = -(y + h / 2); y += h + gap; });
  const totalW = x - gap;
  const totalH = y - gap;
  return sizes.map((_, i) => ({ x: colX[i % columns] - totalW / 2, y: rowY[Math.floor(i / columns)] + totalH / 2 }));
}

// Câte coloane are grila ca forma ei (celule cellW × cellH) să semene cu viewer-ul.
export function gridColumns(n, cellW, cellH, aspect) {
  return Math.min(n, Math.max(1, Math.round(Math.sqrt((n * aspect * cellH) / cellW))));
}

function materialKinds(p) {
  return {
    plastic: { color: p.portocaliu, roughness: 0.45, metalness: 0 },
    corp: { color: p.gri, roughness: 0.6, metalness: 0 },
    cauciuc: { color: p.gri, roughness: 0.9, metalness: 0 },
    metal: { color: p.g3, roughness: 0.35, metalness: 0.7 },
    otel: { color: p.g2, roughness: 0.3, metalness: 0.8 },
    aluminiu: { color: p.g4, roughness: 0.4, metalness: 0.5 },
    ceramica: { color: p.g6, roughness: 0.3, metalness: 0 },
    filtru: { color: p.g5, roughness: 0.8, metalness: 0 },
    comutator: { color: p.g1, roughness: 0.5, metalness: 0 },
    sina: { color: p.g4, roughness: 0.4, metalness: 0.5 },
    lant: { color: p.g2, roughness: 0.3, metalness: 0.8 },
  };
}

// Text pe o placă (doar în browser): aliniat la stânga, Arial.
function textPlane(text, w, h, color) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = Math.round((512 * h) / w);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = color;
  ctx.font = `bold ${Math.round(canvas.height * 0.72)}px Arial, Helvetica, sans-serif`;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 0, canvas.height / 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshStandardMaterial({ map: texture, transparent: true, roughness: 0.6 }),
  );
}

// Inscripțiile se prind de piesele lor, ca să se miște și să se estompeze odată cu ele.
function decorate(parts, palette) {
  const badge = textPlane('MF 34', 6, 2.4, palette.g6);
  badge.position.set(...STARTER_BADGE_SPOT);
  badge.rotation.y = Math.PI;
  parts.get('B16').children[0].add(badge);
  // Înlocuitor pentru logoul oficial (fără ®) până la livrarea fișierului.
  const wordmark = textPlane('O’MAC', 14, 3.2, palette.gri);
  wordmark.position.set(20, 0, 0.26);
  parts.get('B74').children[0].add(wordmark);
}

// Markerul stă pe suprafața primei piese (în coordonatele ei, ca să se miște odată cu ea):
// se caută de sus, apoi din față (+Z), apoi din dreapta.
const ray = new THREE.Raycaster();
// Excepții: lanțul și șina sunt lungi și subțiri; de sus, markerul ar cădea pe muchia de sus,
// lipit de piesa din rândul de deasupra în grilă. La vârf (din dreapta) e clar al lor.
const ANCHOR_FROM = { B73: 'right', B74: 'right' };
function findAnchor(obj) {
  const first = obj.children[obj.userData.anchorPiece];
  const box = new THREE.Box3().setFromObject(first);
  const c = box.getCenter(new THREE.Vector3());
  const from = {
    top: [new THREE.Vector3(c.x, box.max.y + 1, c.z), new THREE.Vector3(0, -1, 0)],
    front: [new THREE.Vector3(c.x, c.y, box.max.z + 1), new THREE.Vector3(0, 0, -1)],
    right: [new THREE.Vector3(box.max.x + 1, c.y, c.z), new THREE.Vector3(-1, 0, 0)],
  };
  const preferred = ANCHOR_FROM[obj.name];
  const tries = [preferred, 'top', 'front', 'right'].filter(Boolean).map((k) => from[k]);
  for (const [origin, direction] of tries) {
    ray.set(origin, direction);
    const hit = ray.intersectObject(first, true)[0];
    if (hit) return first.worldToLocal(hit.point.clone());
  }
  return first.worldToLocal(new THREE.Vector3(c.x, box.max.y, c.z));
}

// Spațiul dintre piesele aceleiași poziții când se adună (cm).
const PIECE_GAP = 0.4;

// La explodare, piesele unei poziții (ex. cele 9 șuruburi B8) se adună într-o grilă mică
// în jurul centrului poziției, în loc să rămână împrăștiate pe tot utilajul.
function gatherPieces(obj) {
  const pieces = obj.children;
  if (pieces.length === 1) {
    pieces[0].userData.gather = [0, 0, 0];
    obj.userData.anchorPiece = 0;
    return;
  }
  const boxes = pieces.map((c) => new THREE.Box3().setFromObject(c));
  const C = boxes.reduce((acc, b) => acc.union(b), new THREE.Box3()).getCenter(new THREE.Vector3());
  const cells = gridLayout(boxes.map((b) => {
    const size = b.getSize(new THREE.Vector3());
    return { w: size.x, h: size.y };
  }), PIECE_GAP);
  pieces.forEach((c, i) => {
    const P = boxes[i].getCenter(new THREE.Vector3());
    c.userData.gather = [C.x + cells[i].x - P.x, C.y + cells[i].y - P.y, C.z - P.z];
  });
  // Markerul merge pe piesa din mijlocul grupului, nu pe cea din colț.
  const offCentre = cells.map((c) => Math.hypot(c.x, c.y));
  obj.userData.anchorPiece = offCentre.indexOf(Math.min(...offCentre));
}

// Cutia poziției cu piesele adunate (fără să mute grupul).
function gatheredBox(obj) {
  for (const c of obj.children) {
    const [gx, gy, gz] = c.userData.gather;
    const b = c.userData.basePosition;
    c.position.set(b.x + gx, b.y + gy, b.z + gz);
  }
  obj.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(obj);
  for (const c of obj.children) c.position.copy(c.userData.basePosition);
  obj.updateMatrixWorld(true);
  return box;
}

// Explodarea: fiecare ansamblu pleacă pe direcția lui; piesele ansamblului activ se așază
// într-o grilă (rând cu rând, în ordinea de pe foaie), într-un plan paralel cu XY.
// Celulele au toate mărimea celei mai mari piese: altfel o piesă lungă (șina) lățește
// grila, camera se depărtează și markerii pieselor mici ajung unii peste alții.
function layoutExplode(parts, aspect) {
  for (const a of ASSEMBLIES) {
    const objs = a.positions.map((p) => parts.get(p.id));
    const boxes = objs.map(gatheredBox);
    const all = boxes.reduce((acc, b) => acc.union(b), new THREE.Box3());
    const C = all.getCenter(new THREE.Vector3());
    const sizes = boxes.map((b) => b.getSize(new THREE.Vector3()));
    const cell = { w: Math.max(...sizes.map((s) => s.x)), h: Math.max(...sizes.map((s) => s.y)) };
    const columns = gridColumns(objs.length, cell.w + GRID_GAP, cell.h + GRID_GAP, aspect);
    const cells = gridLayout(objs.map(() => cell), GRID_GAP, columns);
    objs.forEach((o, i) => {
      const P = boxes[i].getCenter(new THREE.Vector3());
      const fit = Math.min(cell.w / Math.max(sizes[i].x, 1e-6), cell.h / Math.max(sizes[i].y, 1e-6));
      o.userData.dir = ASSEMBLY_DIRS[a.id];
      o.userData.spread = [C.x + cells[i].x - P.x, C.y + cells[i].y - P.y, C.z - P.z];
      o.userData.center = P.toArray();
      o.userData.explodeScale = THREE.MathUtils.clamp(EXPLODE_FILL * fit, 1, MAX_EXPLODE_SCALE);
    });
  }
}

// Refă grila explodată pentru alt raport lățime/înălțime al viewer-ului (ex. pe telefon).
// Pozițiile trebuie să fie în poza asamblată când se apelează.
export function relayoutExplode(parts, aspect) {
  layoutExplode(parts, aspect);
}

export function buildChainsaw(palette, { labels = typeof document !== 'undefined' } = {}) {
  const kinds = materialKinds(palette);
  const root = new THREE.Group();
  root.name = 'mf34';
  const core = new THREE.Group();
  core.name = 'core';
  root.add(core);

  const assemblies = new Map();
  for (const a of ASSEMBLIES) {
    const g = new THREE.Group();
    g.name = `a${a.id}`;
    g.userData.assemblyId = a.id;
    root.add(g);
    assemblies.set(a.id, g);
  }

  const parts = new Map();
  for (const p of POSITIONS) {
    const build = BUILDERS[p.id];
    if (!build) throw new Error(`Lipsește geometria pentru ${p.id}`);
    // Fiecare poziție are materialele ei; piesele aceleiași poziții le împart.
    const own = new Map();
    const mat = (kind) => {
      if (!kinds[kind]) throw new Error(`Material necunoscut: ${kind}`);
      if (!own.has(kind)) own.set(kind, new THREE.MeshStandardMaterial({ ...kinds[kind], side: THREE.DoubleSide }));
      return own.get(kind);
    };
    const obj = new THREE.Group();
    obj.name = p.id;
    for (const piece of build(mat)) {
      piece.userData.basePosition = piece.position.clone();
      obj.add(piece);
    }
    obj.userData.partId = p.id;
    obj.userData.basePosition = obj.position.clone();
    obj.userData.accessory = ACCESSORIES.has(p.id);
    assemblies.get(p.assemblyId).add(obj);
    parts.set(p.id, obj);
  }

  if (labels) decorate(parts, palette);
  root.updateMatrixWorld(true);
  for (const obj of parts.values()) {
    gatherPieces(obj);
    obj.children[obj.userData.anchorPiece].userData.anchor = findAnchor(obj);
  }
  layoutExplode(parts, VIEW_ASPECT);
  return { root, core, assemblies, parts };
}
