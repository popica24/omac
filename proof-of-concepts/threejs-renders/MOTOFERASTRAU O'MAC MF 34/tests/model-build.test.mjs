import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { ASSEMBLIES, POSITIONS } from '../parts.js';
import { buildChainsaw, explodeOffset, relayoutExplode, GRID_GAP, MAX_EXPLODE_SCALE } from '../model.js';

// Aceleași valori ca variabilele din styles.css; în browser se citesc din CSS.
const PALETTE = {
  gri: '#53565A', portocaliu: '#FF824B', alb: '#FFFFFF', panou: '#F2F2F3',
  g1: '#757A80', g2: '#909499', g3: '#ABAEB3', g4: '#C4C7CC', g5: '#DFE1E6', g6: '#EBEDF0',
};

const saw = buildChainsaw(PALETTE);
const boxOf = (o) => new THREE.Box3().setFromObject(o);

// Poziția explodată complet, cu ansamblul ei activ: piesele se adună, grupul se mută
// și se mărește în jurul centrului lui.
function explodedBox(obj) {
  const saved = obj.children.map((c) => c.position.clone());
  obj.children.forEach((c) => {
    const g = c.userData.gather;
    c.position.set(c.userData.basePosition.x + g[0], c.userData.basePosition.y + g[1], c.userData.basePosition.z + g[2]);
  });
  const o = explodeOffset(obj.userData.dir, obj.userData.spread, 1, 1);
  const S = obj.userData.explodeScale;
  const P = obj.userData.center;
  obj.scale.setScalar(S);
  obj.position.set(o.x - (S - 1) * P[0], o.y - (S - 1) * P[1], o.z - (S - 1) * P[2]);
  obj.updateMatrixWorld(true);
  const b = boxOf(obj);
  obj.children.forEach((c, i) => c.position.copy(saved[i]));
  obj.scale.setScalar(1);
  obj.position.copy(obj.userData.basePosition);
  obj.updateMatrixWorld(true);
  return b;
}

test('169 de poziții, fiecare în grupul ansamblului ei', () => {
  assert.equal(saw.parts.size, 169);
  for (const p of POSITIONS) {
    const obj = saw.parts.get(p.id);
    assert.ok(obj, p.id);
    assert.equal(obj.name, p.id);
    assert.equal(obj.parent, saw.assemblies.get(p.assemblyId), p.id);
  }
});

test('fiecare poziție are exact cantitatea de piese de pe foaie', () => {
  for (const p of POSITIONS) assert.equal(saw.parts.get(p.id).children.length, p.qty, p.id);
});

test('materialele nu sunt partajate între poziții', () => {
  const owner = new Map();
  for (const [id, obj] of saw.parts) {
    obj.traverse((o) => {
      if (!o.material) return;
      assert.ok(!owner.has(o.material) || owner.get(o.material) === id, `${id} partajează material cu ${owner.get(o.material)}`);
      owner.set(o.material, id);
    });
  }
});

test('lanțul are 64 de zale, șina 40 cm', () => {
  let links = 0;
  saw.parts.get('B73').traverse((o) => { if (o.isInstancedMesh) links = o.count; });
  assert.equal(links, 64);
  assert.ok(Math.abs(boxOf(saw.parts.get('B74')).getSize(new THREE.Vector3()).x - 40) < 0.01);
});

test('utilajul asamblat e la scară (≈ 75–80 cm cu șina de 40 cm)', () => {
  const s = boxOf(saw.root).getSize(new THREE.Vector3());
  assert.ok(s.x > 70 && s.x < 95, `lungime ${s.x}`);
  assert.ok(s.y > 25 && s.y < 40, `înălțime ${s.y}`);
});

test('core nu conține poziții', () => {
  for (const obj of saw.parts.values()) {
    let p = obj.parent;
    while (p) { assert.notEqual(p, saw.core); p = p.parent; }
  }
});

// Distanța de la un punct la suprafața unei cutii (0 pe față).
function distanceToBoxSurface(p, box) {
  if (!box.containsPoint(p)) return box.distanceToPoint(p);
  return Math.min(p.x - box.min.x, box.max.x - p.x, p.y - box.min.y, box.max.y - p.y, p.z - box.min.z, box.max.z - p.z);
}

test('fiecare ancoră de marker e pe suprafața piesei care o poartă', () => {
  for (const [id, obj] of saw.parts) {
    const piece = obj.children[obj.userData.anchorPiece];
    const anchor = piece.userData.anchor;
    assert.ok(anchor?.isVector3, `${id} nu are ancoră`);
    const world = piece.localToWorld(anchor.clone());
    let best = Infinity;
    obj.traverse((o) => { if (o.isMesh) best = Math.min(best, distanceToBoxSurface(world, boxOf(o))); });
    assert.ok(best <= 0.6, `${id}: ancora e la ${best.toFixed(2)} cm de orice suprafață`);
  }
});

test('doar teaca șinei e accesoriu', () => {
  const acc = [...saw.parts].filter(([, o]) => o.userData.accessory).map(([id]) => id);
  assert.deepEqual(acc, ['B75']);
});

test('explodat, piesele ansamblului activ nu se suprapun în planul XY', () => {
  for (const a of ASSEMBLIES) {
    const rects = a.positions.map((p) => {
      const obj = saw.parts.get(p.id);
      assert.equal(obj.userData.dir.length, 3);
      assert.equal(obj.userData.spread.length, 3);
      return { id: p.id, b: explodedBox(obj) };
    });
    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        const A = rects[i].b;
        const B = rects[j].b;
        const sepX = A.max.x + GRID_GAP - 1e-6 <= B.min.x || B.max.x + GRID_GAP - 1e-6 <= A.min.x;
        const sepY = A.max.y + GRID_GAP - 1e-6 <= B.min.y || B.max.y + GRID_GAP - 1e-6 <= A.min.y;
        assert.ok(sepX || sepY, `ansamblul ${a.id}: ${rects[i].id} se suprapune cu ${rects[j].id}`);
      }
    }
  }
});

test('la explodare, piesele unei poziții se adună compact', () => {
  for (const p of POSITIONS.filter((x) => x.qty > 1)) {
    const obj = saw.parts.get(p.id);
    const widest = Math.max(...obj.children.map((c) => boxOf(c).getSize(new THREE.Vector3()).x));
    const columns = Math.ceil(Math.sqrt(p.qty * 1.6));
    const w = explodedBox(obj).getSize(new THREE.Vector3()).x / obj.userData.explodeScale;
    assert.ok(w <= columns * (widest + 0.4) + 1e-6, `${p.id}: ${w.toFixed(1)} cm lățime`);
  }
});

test('piesele revin exact la locul lor (adunarea e zero când nu e explodat)', () => {
  for (const obj of saw.parts.values()) {
    for (const c of obj.children) {
      assert.ok(c.userData.basePosition.equals(c.position), obj.name);
      assert.equal(c.userData.gather.length, 3);
    }
  }
});

test('markerii lanțului și ai șinei stau la vârf, nu pe muchia de sus', () => {
  for (const id of ['B73', 'B74']) {
    const obj = saw.parts.get(id);
    const anchor = obj.children[0].localToWorld(obj.children[0].userData.anchor.clone());
    assert.ok(anchor.x > boxOf(obj).max.x - 1, `${id}: x ${anchor.x.toFixed(1)}`);
  }
});

test('piesele mici se măresc la explodare (între ×1 și MAX_EXPLODE_SCALE), iar cele mari rămân la scară', () => {
  for (const [id, obj] of saw.parts) {
    const S = obj.userData.explodeScale;
    assert.ok(S >= 1 && S <= MAX_EXPLODE_SCALE, `${id}: ×${S}`);
    assert.equal(obj.userData.center.length, 3);
  }
  assert.ok(saw.parts.get('B28').userData.explodeScale > 2, 'șuruburile opritorului se văd mărite');
  assert.equal(saw.parts.get('B74').userData.explodeScale, 1, 'șina e cea mai mare piesă a ansamblului ei');
});

test('grila explodată urmează forma viewer-ului (îngust pe telefon, lat pe desktop)', () => {
  const columnsOf = (aspect) => {
    const fresh = buildChainsaw(PALETTE);
    relayoutExplode(fresh.parts, aspect);
    const xs = ASSEMBLIES[6].positions.map((p) => {
      const o = fresh.parts.get(p.id);
      return Math.round((o.userData.center[0] + o.userData.spread[0]) * 1000);
    });
    return new Set(xs).size;
  };
  assert.ok(columnsOf(0.6) < columnsOf(2), `${columnsOf(0.6)} coloane la 0,6 față de ${columnsOf(2)} la 2`);
});

test('markerul unei poziții cu mai multe piese stă pe piesa din mijlocul grupului adunat', () => {
  for (const p of POSITIONS.filter((x) => x.qty > 2)) {
    const obj = saw.parts.get(p.id);
    const dist = obj.children.map((c) => Math.hypot(c.userData.gather[0] + c.position.x, c.userData.gather[1] + c.position.y));
    const centre = new THREE.Vector3(...obj.userData.center);
    const gathered = obj.children.map((c) => {
      const b = boxOf(c).getCenter(new THREE.Vector3());
      return Math.hypot(b.x + c.userData.gather[0] - centre.x, b.y + c.userData.gather[1] - centre.y);
    });
    // Grupurile simetrice (ex. 2×2) au mai multe piese la fel de aproape de mijloc: oricare e bună.
    const best = Math.min(...gathered);
    assert.ok(gathered[obj.userData.anchorPiece] <= best + 0.01, `${p.id}: markerul e pe piesa ${obj.userData.anchorPiece}, la ${gathered[obj.userData.anchorPiece].toFixed(2)} cm de mijloc (minim ${best.toFixed(2)})`);
    assert.ok(dist.length === p.qty);
  }
});
