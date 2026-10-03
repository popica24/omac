# MF 34 Exploded View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single static page that shows the O'MAC MF 34 chainsaw in 3D, explodes it into 6 assemblies / 20 numbered positions, and links the 3D markers and the parts list both ways.

**Architecture:** Plain ES modules, no build step. `parts.js` holds all part data; `model.js` builds the chainsaw from Three.js primitives and holds the pure explode math; `ui.js` renders the DOM (model card, selector, list); `app.js` wires the scene, animation, markers and selection together. Pure modules are unit-tested with `node --test`; the page is verified end-to-end with Playwright driving Chromium against `python3 -m http.server`.

**Tech Stack:** Three.js 0.170.0 (CDN import map in the browser, npm devDependency for Node tests), Node 24 built-in test runner, Playwright (Chromium), Python 3 `http.server`.

**Spec:** `docs/superpowers/specs/2026-10-03-mf34-exploded-view-design.md`

**Deviation from the spec's file table (deliberate):** DOM rendering is split out of `app.js` into `ui.js`, so each file keeps one responsibility. `package.json` and `tests/` are added for verification only; the page itself still has no build step.

## Global Constraints

- Working directory for every command: `"/Users/popescuandrei/Documents/Projects/omac/proof-of-concepts/threejs-renders/MOTOFERASTRAU O'MAC MF 34"` — always double-quote it (spaces and an apostrophe). Below it is written `$POC`. Shell variables don't persist between tool calls, so start each command with `POC="/Users/popescuandrei/Documents/Projects/omac/proof-of-concepts/threejs-renders/MOTOFERASTRAU O'MAC MF 34" &&`, or write the full quoted path.
- Three.js version `0.170.0` everywhere: import map URLs `https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js` and `https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/`, and the npm devDependency.
- No build step. `node_modules/` exists only for tests and is git-ignored.
- All user-facing text is Romanian. Exact strings: button `Vezi piesele` / `Asamblează`; row meta `cod: [.....] · manual p. N`; wear marker `▲ uzură (propunere)`; count `6 ansambluri · 20 poziții`.
- Never write the old company name (anything containing "Pădure" / "Grădină"), never write `®`, never assign a range (Smart / MaxX / Power / ProX) to the MF 34. The body badge reads `MF 34`.
- Colors and sizes only as CSS variables at the top of `styles.css`; JavaScript reads colors from those variables (`readPalette()`), never hard-codes hex values.
- `color-scheme: light`; no `prefers-color-scheme` rules. No Google Fonts or other external font links.
- Text left-aligned; only button labels are centered (the parts-list rows are list items, so they're left-aligned).
- Touch targets ≥ 44 × 44 px; keyboard focus ring always visible (`:focus-visible` outline).
- Model units are centimetres: X = saw length (bar towards +X), Y = up, +Z = chain side, −Z = starter side.
- The project root is not a git repository yet. Each "Commit" step runs only if `git -C "$POC" rev-parse --is-inside-work-tree` succeeds; otherwise skip it.

## Review Focus

1. Clicking `Vezi piesele` again mid-animation → the motion reverses from where it is (no jump) and ends exactly at the assembled pose. Pinned in Task 2 (`stepToward` reversal test) and Task 5 (`rapidDoubleToggleReversesSmoothly`).
2. Switching assembly while a part is selected or hovered → selection and highlight are cleared; nothing stays lit in a now-dimmed assembly. Pinned in Task 5 (`switchingAssemblyClearsSelection`).
3. Opening `index.html` by double-click (`file://`, where ES modules are blocked) → a Romanian message explains how to start the local server instead of a blank page. Pinned in Task 4 (`fileProtocolShowsMessage`).
4. Browser without WebGL → a message in the viewer area; selector and list still work; the explode button is disabled. Pinned in Task 5 (`noWebGLShowsMessageListStillWorks`).
5. Phone at 390 px → no sideways scroll, viewer above the list, every visible marker at least 44 × 44 px. Pinned in Task 4 (`noHorizontalScrollAt390`) and Task 5 (`mobileExplodedLayout`, `markersHaveTouchTargets`).

---

### Task 1: Project scaffold and parts data

**Files:**
- Create: `$POC/package.json`
- Create: `$POC/.gitignore`
- Create: `$POC/parts.js`
- Test: `$POC/tests/parts.test.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces (from `parts.js`):
  - `MODEL: { name: string, shortName: string, specs: Array<[label: string, value: string]> }`
  - `ASSEMBLIES: Array<{ id: number, name: string, positions: Array<{ pos: number, name: string, pages: number[], wear: boolean }> }>`
  - `POSITIONS: Array<{ id: string, assemblyId: number, pos: number, name: string, pages: number[], wear: boolean, code: null }>` — flat, in assembly order
  - `partId(assemblyId: number, pos: number): string` → `"a{assemblyId}-p{pos}"`
  - `assemblyLabel(assembly): string` → `"1 · Capac și filtru (2)"`
  - `positionsOf(assemblyId: number): POSITIONS[number][]`

- [ ] **Step 1: Check the toolchain and create the scaffold**

Run:
```bash
cd "$POC" && node --version && python3 --version
```
Expected: Node `v20` or newer, Python 3.x.

Create `$POC/package.json`:
```json
{
  "name": "mf34-exploded-poc",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test tests/*.test.mjs",
    "e2e": "node tests/e2e.mjs"
  },
  "devDependencies": {
    "playwright": "^1.48.0",
    "three": "0.170.0"
  }
}
```

Create `$POC/.gitignore`:
```
node_modules/
```

Run:
```bash
cd "$POC" && npm install && npx playwright install chromium
```
Expected: installs without errors.

- [ ] **Step 2: Write the failing test**

Create `$POC/tests/parts.test.mjs`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MODEL, ASSEMBLIES, POSITIONS, partId, assemblyLabel, positionsOf } from '../parts.js';

test('6 ansambluri și 20 de poziții', () => {
  assert.equal(ASSEMBLIES.length, 6);
  assert.equal(POSITIONS.length, 20);
});

test('denumirile ansamblurilor, în ordine', () => {
  assert.deepEqual(ASSEMBLIES.map((a) => a.name), [
    'Capac și filtru', 'Motor', 'Mânere și comenzi', 'Frână și protecție', 'Șină și lanț', 'Rezervoare',
  ]);
});

test('denumirile pozițiilor, exact ca în spec', () => {
  assert.deepEqual(POSITIONS.map((p) => p.name), [
    'Capacul cilindrului', 'Filtrul de aer',
    'Cilindru cu aripioare', 'Bujie', 'Demaror cu coardă de pornire',
    'Mâner spate cu manetă de accelerație', 'Comutator pornire/oprire', 'Pârghie de șoc', 'Mâner față', 'Amortizoare față și spate',
    'Protecția mâinii / frâna de lanț', 'Capac protecție lanț', 'Piulița de tensionare', 'Gheara',
    'Șina de ghidaj 40 cm', 'Lanț 64DL .325" .058"', 'Pinion',
    'Rezervor combustibil cu bușon', 'Filtru de carburant', 'Rezervor ulei de lanț cu bușon',
  ]);
});

test('pozițiile încep de la 1 în fiecare ansamblu', () => {
  for (const a of ASSEMBLIES) {
    assert.deepEqual(a.positions.map((p) => p.pos), a.positions.map((_, i) => i + 1));
  }
});

test('id-uri unice în formatul a{n}-p{n}', () => {
  const ids = POSITIONS.map((p) => p.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const p of POSITIONS) assert.equal(p.id, partId(p.assemblyId, p.pos));
  assert.equal(partId(5, 2), 'a5-p2');
});

test('fiecare poziție are pagini de manual și cod null', () => {
  for (const p of POSITIONS) {
    assert.ok(p.pages.length > 0, p.id);
    assert.ok(p.pages.every((n) => Number.isInteger(n) && n > 0), p.id);
    assert.equal(p.code, null);
  }
});

test('piesele de uzură propuse sunt exact cele din spec', () => {
  assert.deepEqual(
    POSITIONS.filter((p) => p.wear).map((p) => p.id),
    ['a1-p2', 'a2-p2', 'a5-p1', 'a5-p2', 'a5-p3', 'a6-p2'],
  );
});

test('eticheta ansamblului', () => {
  assert.equal(assemblyLabel(ASSEMBLIES[0]), '1 · Capac și filtru (2)');
  assert.equal(assemblyLabel(ASSEMBLIES[2]), '3 · Mânere și comenzi (5)');
});

test('positionsOf întoarce pozițiile unui ansamblu', () => {
  assert.deepEqual(positionsOf(5).map((p) => p.id), ['a5-p1', 'a5-p2', 'a5-p3']);
});

test('specificațiile MF 34 din manual', () => {
  assert.equal(MODEL.name, 'Motoferăstrău O’MAC MF 34');
  assert.deepEqual(Object.fromEntries(MODEL.specs), {
    'Capacitate cilindrică': '52 cc',
    'Putere maximă': '2.5 kW / 3.4 CP',
    'Șină': '40 cm (15")',
    'Lanț': '64DL .325" .058"',
    'Rezervor combustibil': '0.55 L',
    'Rezervor ulei lanț': '260 ml',
    'Greutate netă': '5.0 kg',
  });
});

test('fără denumirea veche a firmei, fără ®, fără nume de gamă', () => {
  const all = JSON.stringify({ MODEL, ASSEMBLIES });
  assert.ok(!/Pădure|Padure|Grădină|Gradina/i.test(all));
  assert.ok(!all.includes('®'));
  assert.ok(!/Smart|MaxX|Power|ProX/.test(all));
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd "$POC" && npm test`
Expected: FAIL — `Cannot find module '.../parts.js'`.

- [ ] **Step 4: Write the implementation**

Create `$POC/parts.js`:
```js
// Datele PoC-ului. Denumirile pieselor provin din manualul de utilizare
// O’MAC MF 34 / MF 38 / MF 46 (numerele de pagină sunt cele tipărite).
// Manualul nu conține coduri de piese: code = null se afișează „cod: [.....]".
// Singurul fișier cu date; model.js, ui.js și app.js doar îl citesc.

export const MODEL = {
  name: 'Motoferăstrău O’MAC MF 34',
  shortName: 'MF 34',
  specs: [
    ['Capacitate cilindrică', '52 cc'],
    ['Putere maximă', '2.5 kW / 3.4 CP'],
    ['Șină', '40 cm (15")'],
    ['Lanț', '64DL .325" .058"'],
    ['Rezervor combustibil', '0.55 L'],
    ['Rezervor ulei lanț', '260 ml'],
    ['Greutate netă', '5.0 kg'],
  ],
};

export const ASSEMBLIES = [
  {
    id: 1,
    name: 'Capac și filtru',
    positions: [
      { pos: 1, name: 'Capacul cilindrului', pages: [25], wear: false },
      { pos: 2, name: 'Filtrul de aer', pages: [24], wear: true },
    ],
  },
  {
    id: 2,
    name: 'Motor',
    positions: [
      { pos: 1, name: 'Cilindru cu aripioare', pages: [25], wear: false },
      { pos: 2, name: 'Bujie', pages: [26], wear: true },
      { pos: 3, name: 'Demaror cu coardă de pornire', pages: [17], wear: false },
    ],
  },
  {
    id: 3,
    name: 'Mânere și comenzi',
    positions: [
      { pos: 1, name: 'Mâner spate cu manetă de accelerație', pages: [4, 17], wear: false },
      { pos: 2, name: 'Comutator pornire/oprire', pages: [17], wear: false },
      { pos: 3, name: 'Pârghie de șoc', pages: [17], wear: false },
      { pos: 4, name: 'Mâner față', pages: [14], wear: false },
      { pos: 5, name: 'Amortizoare față și spate', pages: [26], wear: false },
    ],
  },
  {
    id: 4,
    name: 'Frână și protecție',
    positions: [
      { pos: 1, name: 'Protecția mâinii / frâna de lanț', pages: [14], wear: false },
      { pos: 2, name: 'Capac protecție lanț', pages: [14], wear: false },
      { pos: 3, name: 'Piulița de tensionare', pages: [14], wear: false },
      { pos: 4, name: 'Gheara', pages: [14], wear: false },
    ],
  },
  {
    id: 5,
    name: 'Șină și lanț',
    positions: [
      { pos: 1, name: 'Șina de ghidaj 40 cm', pages: [4, 14], wear: true },
      { pos: 2, name: 'Lanț 64DL .325" .058"', pages: [4, 14], wear: true },
      { pos: 3, name: 'Pinion', pages: [26], wear: true },
    ],
  },
  {
    id: 6,
    name: 'Rezervoare',
    positions: [
      { pos: 1, name: 'Rezervor combustibil cu bușon', pages: [17], wear: false },
      { pos: 2, name: 'Filtru de carburant', pages: [25], wear: true },
      { pos: 3, name: 'Rezervor ulei de lanț cu bușon', pages: [17, 25], wear: false },
    ],
  },
];

export const partId = (assemblyId, pos) => `a${assemblyId}-p${pos}`;

export const POSITIONS = ASSEMBLIES.flatMap((a) =>
  a.positions.map((p) => ({ ...p, id: partId(a.id, p.pos), assemblyId: a.id, code: null })),
);

export const assemblyLabel = (a) => `${a.id} · ${a.name} (${a.positions.length})`;

export const positionsOf = (assemblyId) => POSITIONS.filter((p) => p.assemblyId === assemblyId);
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd "$POC" && npm test`
Expected: PASS, 11 tests.

- [ ] **Step 6: Commit** (only if `$POC` is inside a git repository)

```bash
cd "$POC" && git add package.json package-lock.json .gitignore parts.js tests/parts.test.mjs && git commit -m "feat(mf34): add parts data from the user manual"
```

---

### Task 2: Explode math

**Files:**
- Create: `$POC/model.js`
- Test: `$POC/tests/model-math.test.mjs`

**Interfaces:**
- Consumes: `POSITIONS` from `parts.js` (tests only).
- Produces (from `model.js`):
  - `ASSEMBLY_DIRS: Record<number, [x, y, z]>` — offset of each assembly at full explode
  - `PART_SPREAD: Record<string, [x, y, z]>` — extra offset of each position when its assembly is active
  - `easeInOutCubic(x: number): number`
  - `stepToward(current: number, target: number, dt: number, duration: number): number` — linear progress towards `target`, never overshoots
  - `explodeOffset(id: string, t: number, spread: number): { x, y, z }` — `t` = eased explode amount 0..1, `spread` = how active the part's assembly is 0..1; throws on unknown id
  - `stadiumPoints(length: number, endRadius: number, pathRadius: number, count: number): Array<{ x, y, angle }>` — evenly spaced points around a stadium (bar outline), clockwise from the top of the root end, `angle` = tangent direction

- [ ] **Step 1: Write the failing test**

Create `$POC/tests/model-math.test.mjs`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { POSITIONS } from '../parts.js';
import {
  ASSEMBLY_DIRS, PART_SPREAD, easeInOutCubic, stepToward, explodeOffset, stadiumPoints,
} from '../model.js';

const close = (a, b, eps = 1e-9) => Math.abs(a - b) < eps;

test('există direcție pentru fiecare ansamblu și separare pentru fiecare poziție', () => {
  assert.deepEqual(Object.keys(ASSEMBLY_DIRS).map(Number), [1, 2, 3, 4, 5, 6]);
  assert.deepEqual(Object.keys(PART_SPREAD).sort(), POSITIONS.map((p) => p.id).sort());
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

test('stepToward avansează și nu depășește ținta', () => {
  assert.ok(close(stepToward(0, 1, 0.3, 1.2), 0.25));
  assert.equal(stepToward(0.9, 1, 0.5, 1), 1);
  assert.equal(stepToward(0.1, 0, 0.5, 1), 0);
  assert.equal(stepToward(1, 1, 0.1, 1), 1);
});

test('stepToward se întoarce din punctul curent, fără salt', () => {
  assert.ok(close(stepToward(0.4, 0, 0.1, 1), 0.3));
});

test('explodeOffset: zero la t = 0, direcția ansamblului la t = 1', () => {
  for (const p of POSITIONS) {
    assert.deepEqual(explodeOffset(p.id, 0, 1), { x: 0, y: 0, z: 0 });
  }
  const [dx, dy, dz] = ASSEMBLY_DIRS[5];
  assert.deepEqual(explodeOffset('a5-p2', 1, 0), { x: dx, y: dy, z: dz });
});

test('explodeOffset adaugă separarea doar când ansamblul e activ', () => {
  const [dx, dy, dz] = ASSEMBLY_DIRS[1];
  const [sx, sy, sz] = PART_SPREAD['a1-p1'];
  assert.deepEqual(explodeOffset('a1-p1', 1, 1), { x: dx + sx, y: dy + sy, z: dz + sz });
  const half = explodeOffset('a1-p1', 0.5, 0.5);
  assert.ok(close(half.y, dy * 0.5 + sy * 0.25));
});

test('explodeOffset aruncă eroare pentru o poziție necunoscută', () => {
  assert.throws(() => explodeOffset('a9-p1', 1, 1), /necunoscut/);
});

test('stadiumPoints: număr, distanță față de traseu, primul punct', () => {
  const pts = stadiumPoints(40, 2.5, 2.9, 64);
  assert.equal(pts.length, 64);
  const c1 = 2.5;
  const c2 = 37.5;
  for (const p of pts) {
    let d;
    if (p.x >= c1 && p.x <= c2) d = Math.abs(p.y);
    else d = Math.hypot(p.x - (p.x < c1 ? c1 : c2), p.y);
    assert.ok(close(d, 2.9, 1e-6), `punct în afara traseului: ${JSON.stringify(p)}`);
  }
  assert.ok(close(pts[0].x, c1) && close(pts[0].y, 2.9) && close(pts[0].angle, 0));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd "$POC" && npm test`
Expected: FAIL — `Cannot find module '.../model.js'`.

- [ ] **Step 3: Write the implementation**

Create `$POC/model.js`:
```js
// Unități: centimetri. X = lungimea utilajului (șina spre +X), Y = sus,
// +Z = partea lanțului, −Z = partea demarorului.

// Cât pleacă fiecare ansamblu la explodare completă (t = 1).
export const ASSEMBLY_DIRS = {
  1: [0, 16, 0],
  2: [0, 4, -16],
  3: [-10, 10, -8],
  4: [6, 4, 14],
  5: [22, 0, 8],
  6: [0, -12, 0],
};

// Separarea suplimentară a pozițiilor din ansamblul activ.
export const PART_SPREAD = {
  'a1-p1': [0, 6, 0], 'a1-p2': [0, -2, 0],
  'a2-p1': [0, 0, 0], 'a2-p2': [0, 8, 0], 'a2-p3': [0, 0, -6],
  'a3-p1': [-6, 0, 0], 'a3-p2': [0, 4, 6], 'a3-p3': [0, 2, -6], 'a3-p4': [8, 6, -4], 'a3-p5': [0, -6, 0],
  'a4-p1': [4, 8, 0], 'a4-p2': [0, 0, 6], 'a4-p3': [0, 0, 12], 'a4-p4': [6, -4, 0],
  'a5-p1': [0, 0, 0], 'a5-p2': [0, 6, 4], 'a5-p3': [-6, 0, 4],
  'a6-p1': [-6, -4, 0], 'a6-p2': [0, -10, -6], 'a6-p3': [6, -4, 0],
};

export function easeInOutCubic(x) {
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

export function stepToward(current, target, dt, duration) {
  const step = dt / duration;
  return current < target ? Math.min(target, current + step) : Math.max(target, current - step);
}

export function explodeOffset(id, t, spread) {
  const dir = ASSEMBLY_DIRS[Number(id.slice(1, id.indexOf('-')))];
  const extra = PART_SPREAD[id];
  if (!dir || !extra) throw new Error(`Poziție necunoscută: ${id}`);
  const k = t * spread;
  return { x: dir[0] * t + extra[0] * k, y: dir[1] * t + extra[1] * k, z: dir[2] * t + extra[2] * k };
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd "$POC" && npm test`
Expected: PASS (parts + model-math suites).

- [ ] **Step 5: Commit** (only if inside a git repository)

```bash
cd "$POC" && git add model.js tests/model-math.test.mjs && git commit -m "feat(mf34): add explode math and chain path"
```

---

### Task 3: Chainsaw geometry

**Files:**
- Modify: `$POC/model.js` (add an import at the top, append code at the end)
- Test: `$POC/tests/model-build.test.mjs`

**Interfaces:**
- Consumes: `ASSEMBLIES` from `parts.js`; `stadiumPoints` from Task 2.
- Produces (from `model.js`):
  - `buildChainsaw(palette, options?) → { root: THREE.Group, core: THREE.Group, assemblies: Map<number, THREE.Group>, parts: Map<string, THREE.Object3D> }`
    - `palette: { gri, portocaliu, alb, panou, g1, g2, g3, g4, g5, g6 }` — CSS color strings
    - `options.labels: boolean` — draw the text textures (`MF 34` badge, `O’MAC` on the bar). Defaults to `typeof document !== 'undefined'`, so Node tests skip it.
    - Each part object: `name === id`, `userData.partId === id`, `userData.basePosition: THREE.Vector3` (assembled position), a descendant of `assemblies.get(assemblyId)`.
    - Every mesh has its own material instance (no sharing between parts) so parts can be dimmed and highlighted independently.
    - `core` holds the static crankcase and badge; it isn't a position and never moves.

- [ ] **Step 1: Write the failing test**

Create `$POC/tests/model-build.test.mjs`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { POSITIONS } from '../parts.js';
import { buildChainsaw } from '../model.js';

// Aceleași valori ca variabilele din styles.css; în browser se citesc din CSS.
const PALETTE = {
  gri: '#53565A', portocaliu: '#FF824B', alb: '#FFFFFF', panou: '#F2F2F3',
  g1: '#757A80', g2: '#909499', g3: '#ABAEB3', g4: '#C4C7CC', g5: '#DFE1E6', g6: '#EBEDF0',
};

const saw = buildChainsaw(PALETTE);

test('fiecare poziție are un obiect cu numele ei, în grupul ansamblului', () => {
  assert.equal(saw.parts.size, 20);
  for (const p of POSITIONS) {
    const obj = saw.parts.get(p.id);
    assert.ok(obj, p.id);
    assert.equal(obj.name, p.id);
    assert.equal(obj.userData.partId, p.id);
    assert.ok(obj.userData.basePosition.equals(obj.position), p.id);
    let parent = obj.parent;
    while (parent && parent !== saw.assemblies.get(p.assemblyId)) parent = parent.parent;
    assert.ok(parent, `${p.id} nu e în ansamblul ${p.assemblyId}`);
  }
});

test('fiecare piesă are cel puțin un mesh', () => {
  for (const [id, obj] of saw.parts) {
    let meshes = 0;
    obj.traverse((o) => { if (o.isMesh) meshes++; });
    assert.ok(meshes > 0, id);
  }
});

test('materialele nu sunt partajate între piese', () => {
  const owner = new Map();
  for (const [id, obj] of saw.parts) {
    obj.traverse((o) => {
      if (!o.material) return;
      assert.ok(!owner.has(o.material) || owner.get(o.material) === id, `${id} partajează material cu ${owner.get(o.material)}`);
      owner.set(o.material, id);
    });
  }
});

test('lanțul are 64 de zale (64DL)', () => {
  const chain = saw.parts.get('a5-p2');
  assert.ok(chain.isInstancedMesh);
  assert.equal(chain.count, 64);
});

test('carterul e fix și nu e poziție', () => {
  assert.ok(saw.core.children.length > 0);
  for (const obj of saw.parts.values()) {
    let p = obj.parent;
    while (p) { assert.notEqual(p, saw.core); p = p.parent; }
  }
});

test('lungimea totală e la scară (~80 cm cu șina de 40 cm)', () => {
  const size = new THREE.Box3().setFromObject(saw.root).getSize(new THREE.Vector3());
  assert.ok(size.x > 75 && size.x < 95, `lungime ${size.x}`);
  assert.ok(size.y > 25 && size.y < 40, `înălțime ${size.y}`);
});

test('șina are 40 cm', () => {
  const bar = saw.parts.get('a5-p1');
  const size = new THREE.Box3().setFromObject(bar).getSize(new THREE.Vector3());
  assert.ok(Math.abs(size.x - 40) < 0.01, `șina ${size.x}`);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd "$POC" && npm test`
Expected: FAIL — `buildChainsaw` is not exported.

- [ ] **Step 3: Write the implementation**

Add at the very top of `$POC/model.js` (above the units comment):
```js
import * as THREE from 'three';
import { ASSEMBLIES } from './parts.js';
```

Append to the end of `$POC/model.js`:
```js
// ——— Geometria utilajului ———
// Construit din forme simple, după fotografiile din assets/. Fiecare poziție
// e un obiect separat, cu materiale proprii, ca să poată fi mutată,
// estompată și evidențiată independent.

const assemblyOf = (id) => Number(id.slice(1, id.indexOf('-')));

function roundedRectShape(w, h, r) {
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
function rbox(w, h, d, r = 1, bevel = 0.4) {
  const iw = w - 2 * bevel;
  const ih = h - 2 * bevel;
  const ir = Math.max(0.01, Math.min(r - bevel, iw / 2, ih / 2));
  const g = new THREE.ExtrudeGeometry(roundedRectShape(iw, ih, ir), {
    depth: d - 2 * bevel, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 8,
  });
  g.translate(0, 0, -(d - 2 * bevel) / 2);
  return g;
}

function cyl(r, h, segments, axis) {
  const g = new THREE.CylinderGeometry(r, r, h, segments);
  if (axis === 'z') g.rotateX(Math.PI / 2);
  if (axis === 'x') g.rotateZ(Math.PI / 2);
  return g;
}

function materialsFactory(p) {
  const kinds = {
    plastic: { color: p.portocaliu, roughness: 0.45, metalness: 0 },
    corp: { color: p.gri, roughness: 0.6, metalness: 0 },
    cauciuc: { color: p.gri, roughness: 0.9, metalness: 0 },
    metal: { color: p.g3, roughness: 0.35, metalness: 0.7 },
    sina: { color: p.g4, roughness: 0.4, metalness: 0.5 },
    lant: { color: p.g2, roughness: 0.3, metalness: 0.8 },
    filtru: { color: p.g5, roughness: 0.8, metalness: 0 },
    comutator: { color: p.g1, roughness: 0.5, metalness: 0 },
  };
  return (kind) => new THREE.MeshStandardMaterial(kinds[kind]);
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

export function buildChainsaw(palette, { labels = typeof document !== 'undefined' } = {}) {
  const material = materialsFactory(palette);
  const mesh = (geometry, kind) => new THREE.Mesh(geometry, material(kind));

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
  const add = (id, obj, x, y, z) => {
    obj.name = id;
    obj.position.set(x, y, z);
    obj.userData.partId = id;
    obj.userData.basePosition = obj.position.clone();
    assemblies.get(assemblyOf(id)).add(obj);
    parts.set(id, obj);
  };

  // Corp fix: carterul motorului (nu e poziție în listă).
  const carter = mesh(rbox(24, 10, 12, 1.5), 'corp');
  carter.position.set(-2, 5, 0);
  core.add(carter);
  if (labels) {
    const badge = textPlane('MF 34', 6, 2.4, palette.g6);
    badge.position.set(-9, 6, -6.02);
    badge.rotation.y = Math.PI;
    core.add(badge);
  }

  // 1 · Capac și filtru
  const capac = new THREE.Group();
  capac.add(mesh(rbox(25, 8, 13, 3), 'plastic'));
  for (const z of [-3.2, 3.2]) {
    const ridge = mesh(rbox(5, 1.6, 1.2, 0.6, 0.2), 'corp');
    ridge.position.set(3, 4, z);
    capac.add(ridge);
  }
  add('a1-p1', capac, -1, 17, 0);
  add('a1-p2', mesh(rbox(9, 2.5, 8, 0.8), 'filtru'), -5, 14.5, 0);

  // 2 · Motor
  const aripioare = new THREE.Group();
  for (let i = 0; i < 6; i++) {
    const fin = mesh(rbox(7, 0.5, 9, 0.5, 0.1), 'metal');
    fin.position.y = i * 0.9;
    aripioare.add(fin);
  }
  add('a2-p1', aripioare, 3, 10, 0);

  const bujie = new THREE.Group();
  bujie.add(mesh(cyl(0.6, 3, 16, 'y'), 'filtru'));
  const hex = mesh(cyl(0.9, 1, 6, 'y'), 'metal');
  hex.position.y = -1;
  bujie.add(hex);
  add('a2-p2', bujie, 3, 16.5, 0);

  const demaror = new THREE.Group();
  demaror.add(mesh(cyl(4.5, 2, 32, 'z'), 'corp'));
  const starterGrip = mesh(rbox(3.5, 1.2, 1.4, 0.5, 0.2), 'plastic');
  starterGrip.position.set(0, 5.4, -0.4);
  demaror.add(starterGrip);
  add('a2-p3', demaror, 2, 5, -7);

  // 3 · Mânere și comenzi
  const spate = new THREE.Group();
  const rearCurve = new THREE.CatmullRomCurve3(
    [[-14, 2], [-24, 1], [-33, 2], [-35.5, 6], [-31, 11.5], [-22, 13], [-14, 13]].map(([x, y]) => new THREE.Vector3(x, y, 0)),
  );
  spate.add(mesh(new THREE.TubeGeometry(rearCurve, 64, 1.3, 12, false), 'cauciuc'));
  const rearGrip = mesh(rbox(10, 0.8, 2.8, 0.4, 0.2), 'plastic');
  rearGrip.position.set(-23, 14.1, 0);
  spate.add(rearGrip);
  const trigger = mesh(rbox(3, 1.8, 1.2, 0.4, 0.2), 'plastic');
  trigger.position.set(-19, 11.2, 0);
  spate.add(trigger);
  add('a3-p1', spate, 0, 0, 0);

  add('a3-p2', mesh(rbox(1.6, 1.2, 0.8, 0.3, 0.1), 'comutator'), -14.6, 11, 4);
  add('a3-p3', mesh(rbox(2.5, 0.8, 0.8, 0.3, 0.1), 'plastic'), -13.5, 9, -6.4);

  const frontCurve = new THREE.CatmullRomCurve3(
    [[1, -9.5], [15, -10], [23, -7], [25.5, 0], [23, 6], [17, 8]].map(([y, z]) => new THREE.Vector3(0, y, z)),
  );
  add('a3-p4', mesh(new THREE.TubeGeometry(frontCurve, 64, 1.2, 12, false), 'cauciuc'), 5, 0, 0);

  const amortizoare = new THREE.Group();
  for (const [x, y, z] of [[-14.5, 1, 3], [6, 0.5, -5]]) {
    const damper = mesh(cyl(0.9, 1.6, 16, 'x'), 'cauciuc');
    damper.position.set(x, y, z);
    amortizoare.add(damper);
  }
  add('a3-p5', amortizoare, 0, 0, 0);

  // 4 · Frână și protecție
  const guard = new THREE.Shape();
  guard.moveTo(-6, 0);
  guard.lineTo(6, 0);
  guard.lineTo(6, 14);
  guard.quadraticCurveTo(6, 16, 4, 16);
  guard.lineTo(-4, 16);
  guard.quadraticCurveTo(-6, 16, -6, 14);
  guard.lineTo(-6, 0);
  for (const x of [-3.6, 0, 3.6]) {
    const slot = new THREE.Path();
    slot.moveTo(x - 1.1, 4);
    slot.lineTo(x + 1.1, 4);
    slot.lineTo(x + 1.1, 13);
    slot.lineTo(x - 1.1, 13);
    slot.lineTo(x - 1.1, 4);
    guard.holes.push(slot);
  }
  const guardGeometry = new THREE.ExtrudeGeometry(guard, {
    depth: 1.2, bevelEnabled: true, bevelThickness: 0.2, bevelSize: 0.2, bevelSegments: 2,
  });
  guardGeometry.translate(0, 0, -0.6);
  guardGeometry.rotateY(Math.PI / 2);
  add('a4-p1', mesh(guardGeometry, 'corp'), 11.5, 12, 0);

  add('a4-p2', mesh(rbox(14, 10, 3, 2.5), 'corp'), 11, 5, 8.2);
  add('a4-p3', mesh(cyl(0.8, 0.8, 6, 'z'), 'metal'), 15, 5, 10.1);

  const spike = new THREE.Shape(
    [[0, 0], [1.6, 0], [1.6, 1], [2.8, 2], [1.6, 3], [1.6, 4], [2.8, 5], [1.6, 6], [1.6, 7], [0, 7]].map(([x, y]) => new THREE.Vector2(x, y)),
  );
  const spikeGeometry = new THREE.ExtrudeGeometry(spike, { depth: 8, bevelEnabled: false });
  spikeGeometry.translate(0, -3.5, -4);
  add('a4-p4', mesh(spikeGeometry, 'metal'), 10, 5, 0);

  // 5 · Șină și lanț — șina are exact 40 cm pe X
  const sina = new THREE.Group();
  const barShape = new THREE.Shape();
  barShape.moveTo(0, -2.5);
  barShape.lineTo(37.5, -2.5);
  barShape.absarc(37.5, 0, 2.5, -Math.PI / 2, Math.PI / 2, false);
  barShape.lineTo(0, 2.5);
  barShape.lineTo(0, -2.5);
  const barGeometry = new THREE.ExtrudeGeometry(barShape, { depth: 0.5, bevelEnabled: false, curveSegments: 24 });
  barGeometry.translate(0, 0, -0.25);
  sina.add(mesh(barGeometry, 'sina'));
  if (labels) {
    // Înlocuitor pentru logoul oficial (fără ®) până la livrarea fișierului.
    const wordmark = textPlane('O’MAC', 14, 3.2, palette.gri);
    wordmark.position.set(20, 0, 0.26);
    sina.add(wordmark);
  }
  add('a5-p1', sina, 12, 5, 6.8);

  const links = stadiumPoints(40, 2.5, 2.9, 64);
  const chain = new THREE.InstancedMesh(new THREE.BoxGeometry(0.9, 0.5, 0.7), material('lant'), links.length);
  const dummy = new THREE.Object3D();
  links.forEach((p, i) => {
    dummy.position.set(p.x, p.y, 0);
    dummy.rotation.set(0, 0, p.angle);
    dummy.updateMatrix();
    chain.setMatrixAt(i, dummy.matrix);
  });
  chain.computeBoundingBox();
  chain.computeBoundingSphere();
  add('a5-p2', chain, 12, 5, 6.8);

  add('a5-p3', mesh(cyl(1.8, 1, 7, 'z'), 'lant'), 14.5, 5, 7.4);

  // 6 · Rezervoare
  for (const [id, x, w] of [['a6-p1', -9, 10], ['a6-p3', 4, 9]]) {
    const tank = new THREE.Group();
    tank.add(mesh(rbox(w, 3, 10, 1), 'corp'));
    const cap = mesh(cyl(1.2, 1, 20, 'z'), 'comutator');
    cap.position.set(0, 0, -5.5);
    tank.add(cap);
    add(id, tank, x, -1.5, 0);
  }
  add('a6-p2', mesh(cyl(0.9, 2, 16, 'y'), 'filtru'), -9, -1.5, 0);

  root.updateMatrixWorld(true);
  return { root, core, assemblies, parts };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd "$POC" && npm test`
Expected: PASS (all three suites).

- [ ] **Step 5: Commit** (only if inside a git repository)

```bash
cd "$POC" && git add model.js tests/model-build.test.mjs && git commit -m "feat(mf34): build the chainsaw from primitives, one object per position"
```

---

### Task 4: Page shell, parts panel and browser test harness

**Files:**
- Create: `$POC/index.html`
- Create: `$POC/styles.css`
- Create: `$POC/ui.js`
- Create: `$POC/app.js` (temporary wiring; Task 5 replaces it)
- Create: `$POC/tests/e2e.mjs`
- Test: `$POC/tests/e2e/shell.check.mjs`

**Interfaces:**
- Consumes: `MODEL`, `ASSEMBLIES`, `POSITIONS`, `assemblyLabel`, `positionsOf` from `parts.js`.
- Produces:
  - `ui.js`:
    - `renderModelCard(doc: Document): void` — fills `[data-model-name]`, `[data-specs]`, `[data-count]`
    - `createPartsPanel(doc, { onAssembly(id: number), onSelect(id: string), onHover(id: string|null), onExplode() }) → { showAssembly(id: number), setSelected(id: string|null), setHighlighted(id: string|null), setExploded(on: boolean) }`
    - List rows are `<li><button class="rand" data-id="a1-p2" aria-pressed="true|false">`; highlighted rows get class `is-highlighted`.
  - DOM ids used by later tasks: `#viewer`, `#assembly` (select), `#explode` (button), `#parts` (list), `#boot-error`.
  - `window.__mf34.ready === true` once the page is wired (Task 5 extends this object).
  - `tests/e2e.mjs`: runs every named export of every `tests/e2e/*.check.mjs` as a check `async (ctx) => void`, where `ctx = { root, baseUrl, shotsDir, newPage(contextOptions?) → page (with page.errors: string[]), openReady(page, url?) }`.

- [ ] **Step 1: Write the browser test harness**

Create `$POC/tests/e2e.mjs`:
```js
// Rulează toate verificările din tests/e2e/*.check.mjs într-un Chromium real,
// cu pagina servită de `python3 -m http.server`.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { readdir, mkdir } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
const PORT = 8765;
const baseUrl = `http://127.0.0.1:${PORT}/`;
const shotsDir = path.join(root, 'screenshots');

const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: root, stdio: 'ignore' });

async function waitForServer() {
  for (let i = 0; i < 50; i++) {
    try {
      if ((await fetch(baseUrl)).ok) return;
    } catch { /* încă pornește */ }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error('Serverul local nu a pornit');
}

let failed = 0;
const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'] });
try {
  await waitForServer();
  await mkdir(shotsDir, { recursive: true });
  const ctx = {
    root,
    baseUrl,
    shotsDir,
    async newPage(options = {}) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, ...options });
      const page = await context.newPage();
      page.errors = [];
      page.on('console', (m) => { if (m.type() === 'error') page.errors.push(m.text()); });
      page.on('pageerror', (e) => page.errors.push(e.message));
      return page;
    },
    async openReady(page, url = baseUrl) {
      await page.goto(url);
      await page.waitForFunction(() => window.__mf34?.ready === true, null, { timeout: 15000 });
    },
  };
  const dir = path.join(root, 'tests', 'e2e');
  const files = (await readdir(dir)).filter((f) => f.endsWith('.check.mjs')).sort();
  for (const file of files) {
    const checks = await import(pathToFileURL(path.join(dir, file)).href);
    for (const [name, check] of Object.entries(checks)) {
      try {
        await check(ctx);
        console.log(`ok   ${file} › ${name}`);
      } catch (e) {
        failed++;
        console.log(`FAIL ${file} › ${name}\n     ${e.message}`);
      }
    }
  }
} finally {
  await browser.close();
  server.kill();
}
console.log(failed ? `\n${failed} verificări au eșuat` : '\nToate verificările au trecut');
process.exit(failed ? 1 : 0);
```

- [ ] **Step 2: Write the failing checks**

Create `$POC/tests/e2e/shell.check.mjs`:
```js
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const done = (page) => page.context().close();

export async function pageLoadsWithContent(ctx) {
  const page = await ctx.newPage();
  await ctx.openReady(page);
  assert.equal(await page.innerText('h1'), 'PIESE MF 34');
  assert.equal(await page.textContent('[data-model-name]'), 'Motoferăstrău O’MAC MF 34');
  assert.equal(await page.textContent('[data-count]'), '6 ansambluri · 20 poziții');
  assert.match(await page.textContent('[data-specs]'), /64DL \.325" \.058"/);
  const options = await page.$$eval('#assembly option', (os) => os.map((o) => o.textContent));
  assert.equal(options.length, 6);
  assert.equal(options[0], '1 · Capac și filtru (2)');
  assert.equal(await page.locator('#parts .rand').count(), 2);
  assert.match(await page.textContent('.rand[data-id="a1-p1"]'), /cod: \[\.\.\.\.\.\] · manual p\. 25/);
  assert.match(await page.textContent('.rand[data-id="a1-p2"]'), /uzură \(propunere\)/);
  assert.equal(await page.textContent('#explode'), 'Vezi piesele');
  assert.deepEqual(page.errors, []);
  await done(page);
}

export async function switchingAssemblyRendersItsRows(ctx) {
  const page = await ctx.newPage();
  await ctx.openReady(page);
  await page.selectOption('#assembly', '3');
  const ids = await page.$$eval('#parts .rand', (rs) => rs.map((r) => r.dataset.id));
  assert.deepEqual(ids, ['a3-p1', 'a3-p2', 'a3-p3', 'a3-p4', 'a3-p5']);
  await done(page);
}

export async function noForbiddenText(ctx) {
  const page = await ctx.newPage();
  await ctx.openReady(page);
  const text = await page.innerText('body');
  assert.ok(!/Pădure|Grădină/.test(text));
  assert.ok(!text.includes('®'));
  assert.ok(!/Smart|MaxX|Power LINE|ProX/.test(text));
  await done(page);
}

export async function noHorizontalScrollAt390(ctx) {
  const page = await ctx.newPage({ viewport: { width: 390, height: 844 } });
  await ctx.openReady(page);
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth) <= 390);
  const viewer = await page.locator('#viewer').boundingBox();
  const list = await page.locator('#parts').boundingBox();
  assert.ok(viewer.y < list.y, 'viewer-ul trebuie să fie deasupra listei');
  await done(page);
}

export async function fileProtocolShowsMessage(ctx) {
  const page = await ctx.newPage();
  await page.goto(pathToFileURL(path.join(ctx.root, 'index.html')).href);
  await page.waitForSelector('#boot-error', { state: 'visible', timeout: 5000 });
  assert.match(await page.textContent('#boot-error'), /server local/);
  await done(page);
}
```

- [ ] **Step 3: Run the checks to verify they fail**

Run: `cd "$POC" && npm run e2e`
Expected: every check FAILs (`index.html` doesn't exist yet, so `window.__mf34` never becomes ready).

- [ ] **Step 4: Write the page**

Create `$POC/index.html`:
```html
<!doctype html>
<html lang="ro">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>Piese MF 34</title>
  <link rel="stylesheet" href="styles.css">
  <script type="importmap">
    {
      "imports": {
        "three": "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js",
        "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/"
      }
    }
  </script>
  <script type="module" src="app.js"></script>
  <script>
    // Modulele ES nu pornesc din file://; afișăm cum se deschide corect.
    (function () {
      function show() {
        var box = document.getElementById('boot-error');
        if (box && !(window.__mf34 && window.__mf34.ready)) box.hidden = false;
      }
      if (location.protocol === 'file:') document.addEventListener('DOMContentLoaded', show);
      else setTimeout(show, 6000);
    })();
  </script>
</head>
<body>
  <p id="boot-error" class="boot-error" role="alert" hidden>
    Pagina trebuie deschisă printr-un server local: în acest folder rulați
    <code>python3 -m http.server</code> și deschideți <code>http://localhost:8000</code>.
  </p>

  <header class="antet">
    <nav class="breadcrumb" aria-label="Firimituri">
      <ol>
        <li>Acasă</li>
        <li>Piese de schimb</li>
        <li>Piese motoferăstraie</li>
        <li aria-current="page">Motoferăstrău O’MAC MF 34</li>
      </ol>
    </nav>
    <h1 class="titlu">Piese MF 34</h1>
    <p class="intro">Apasă un număr pe desen și îți spune ce piesă e. Sau invers: treci peste un rând din listă și ți-l arată pe desen. Schimbă ansamblul din lista de sus.</p>
  </header>

  <main>
    <section class="fisa" aria-label="Utilajul">
      <img src="assets/motoferastrau_o_mac_mf_34__1__jpg.webp" width="1633" height="1199"
           alt="Motoferăstrăul O’MAC MF 34 văzut din față-stânga: capac portocaliu, corp gri închis, mâner frontal și șină de 40 cm">
      <div>
        <p class="fisa-nume" data-model-name></p>
        <dl class="fisa-specs" data-specs></dl>
        <p class="fisa-numar" data-count></p>
      </div>
    </section>

    <p class="nota"><strong>Proof of concept.</strong> Denumirile pieselor provin din manualul de utilizare; codurile și prețurile nu sunt încă disponibile.</p>

    <section class="spatiu" aria-label="Schema explodată">
      <div id="viewer" class="viewer" aria-label="Desenul 3D al utilajului"></div>
      <div class="panou-piese">
        <label class="eticheta" for="assembly">Ansamblu</label>
        <select id="assembly"></select>
        <button id="explode" class="buton" type="button" aria-pressed="false">Vezi piesele</button>
        <ol id="parts" class="lista" aria-label="Pozițiile ansamblului"></ol>
      </div>
    </section>
  </main>
</body>
</html>
```

Create `$POC/styles.css`:
```css
/* Valorile de brand, ca variabile (înlocuitor pentru brand.css-ul clientului).
   Nicio culoare sau dimensiune nu se scrie în afara acestui bloc.
   Pragul de 900 px din @media nu poate fi variabilă: e pragul din caietul de sarcini. */
:root {
  color-scheme: light;

  --c-gri: #53565A;
  --c-portocaliu: #FF824B;
  --c-portocaliu-text: #A8481F;
  --c-alb: #FFFFFF;
  --c-g1: #757A80;
  --c-g2: #909499;
  --c-g3: #ABAEB3;
  --c-g4: #C4C7CC;
  --c-g5: #DFE1E6;
  --c-g6: #EBEDF0;
  --c-panou: #F2F2F3;

  --t7: 7px; --t9: 9px; --t10: 10px; --t12: 12px; --t15: 15px; --t18: 18px;
  --t22: 22px; --t26: 26px; --t32: 32px; --t38: 38px; --t46: 46px; --t54: 54px;
  --t66: 66px; --t78: 78px; --t94: 94px; --t114: 114px; --t136: 136px;

  --lh-titlu: 1.05;
  --lh-subtitlu: 1.2;
  --lh-corp: 1.3;

  /* Fișierele de font nu au fost livrate: titlurile cad pe un condensat de sistem,
     corpul pe Arial (alternativa din manualul de brand). */
  --f-titlu: "Pressio Condensed", "Helvetica Neue", "Arial Narrow", Arial, sans-serif;
  --f-corp: "Proxima Nova", Arial, Helvetica, sans-serif;

  --linie: 1px;
  --contur-focus: 3px;
  --latime-pagina: 1180px;
  --inaltime-viewer: calc(var(--t136) * 4.5);
}

*, *::before, *::after { box-sizing: border-box; }

body {
  margin: 0;
  background: var(--c-alb);
  color: var(--c-gri);
  font: var(--t15) / var(--lh-corp) var(--f-corp);
  text-align: left;
}

:focus-visible {
  outline: var(--contur-focus) solid var(--c-portocaliu-text);
  outline-offset: calc(var(--linie) * 2);
}

.antet,
main {
  max-width: var(--latime-pagina);
  margin: 0 auto;
  padding: 0 var(--t22);
}

.antet { padding-top: var(--t32); }

.breadcrumb ol {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: var(--t7);
  font-size: var(--t12);
  color: var(--c-g1);
}

.breadcrumb li + li::before {
  content: "/";
  margin-right: var(--t7);
}

.titlu {
  font-family: var(--f-titlu);
  font-stretch: condensed;
  font-weight: 700;
  font-feature-settings: "ss01" 1, "case" 1;
  text-transform: uppercase;
  font-size: var(--t54);
  line-height: var(--lh-titlu);
  margin: var(--t18) 0 var(--t12);
}

.intro {
  font-size: var(--t18);
  max-width: calc(var(--t54) * 10);
  margin: 0 0 var(--t26);
  padding-bottom: var(--t26);
  border-bottom: var(--linie) solid var(--c-gri);
}

.fisa {
  display: grid;
  grid-template-columns: calc(var(--t114) * 2) minmax(0, 1fr);
  gap: var(--t26);
  align-items: center;
  border: var(--linie) solid var(--c-g5);
  padding: var(--t18);
}

.fisa img {
  width: 100%;
  max-width: calc(var(--t114) * 2);
  height: auto;
  background: var(--c-panou);
}

.fisa-nume {
  font-family: var(--f-titlu);
  font-stretch: condensed;
  font-weight: 700;
  font-size: var(--t22);
  line-height: var(--lh-subtitlu);
  margin: 0 0 var(--t12);
}

.fisa-specs {
  display: grid;
  grid-template-columns: max-content minmax(0, 1fr);
  gap: var(--t7) var(--t18);
  margin: 0 0 var(--t12);
}

.fisa-specs dt { color: var(--c-g1); }
.fisa-specs dd { margin: 0; font-weight: 700; }
.fisa-numar { margin: 0; font-weight: 700; }

.nota {
  background: var(--c-panou);
  border-left: var(--t7) solid var(--c-portocaliu);
  padding: var(--t15) var(--t18);
  margin: var(--t26) 0;
}

.spatiu {
  display: grid;
  grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);
  gap: var(--t26);
  margin-bottom: var(--t54);
}

.viewer {
  position: relative;
  height: var(--inaltime-viewer);
  border: var(--linie) solid var(--c-g5);
  background: var(--c-panou);
  overflow: hidden;
}

.viewer canvas { display: block; }

.labels {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.marker {
  pointer-events: auto;
  width: var(--t46);
  height: var(--t46);
  padding: 0;
  border: 0;
  background: none;
  cursor: pointer;
  display: grid;
  place-items: center;
  font: 700 var(--t15) / var(--lh-titlu) var(--f-corp);
  color: var(--c-portocaliu-text);
}

.marker .cerc {
  display: grid;
  place-items: center;
  width: var(--t26);
  height: var(--t26);
  border-radius: 50%;
  background: var(--c-alb);
  border: calc(var(--linie) * 2) solid var(--c-portocaliu);
}

.marker:hover .cerc,
.marker.is-highlighted .cerc {
  background: var(--c-portocaliu-text);
  border-color: var(--c-portocaliu-text);
  color: var(--c-alb);
}

.panou-piese {
  display: flex;
  flex-direction: column;
  gap: var(--t12);
  min-height: 0;
  max-height: var(--inaltime-viewer);
}

.eticheta {
  font-size: var(--t12);
  color: var(--c-g1);
  text-transform: uppercase;
}

select,
.buton {
  min-height: var(--t46);
  font: inherit;
}

select {
  width: 100%;
  border: var(--linie) solid var(--c-g3);
  background: var(--c-alb);
  color: var(--c-gri);
  padding: 0 var(--t12);
}

.buton {
  border: 0;
  background: var(--c-gri);
  color: var(--c-alb);
  font-family: var(--f-titlu);
  font-stretch: condensed;
  font-weight: 700;
  font-size: var(--t15);
  text-transform: uppercase;
  text-align: center;
  padding: 0 var(--t22);
  cursor: pointer;
}

.buton:hover { background: var(--c-portocaliu-text); }
.buton:active { transform: translateY(var(--linie)); }
.buton:disabled { background: var(--c-g4); color: var(--c-gri); cursor: not-allowed; }

.lista {
  list-style: none;
  margin: 0;
  padding: 0;
  overflow-y: auto;
  border-top: var(--linie) solid var(--c-gri);
}

.rand {
  width: 100%;
  min-height: var(--t46);
  display: grid;
  grid-template-columns: var(--t38) minmax(0, 1fr);
  gap: var(--t12);
  align-items: start;
  text-align: left;
  font: inherit;
  color: inherit;
  background: var(--c-alb);
  border: 0;
  border-bottom: var(--linie) solid var(--c-g5);
  border-left: var(--t7) solid transparent;
  padding: var(--t12);
  cursor: pointer;
}

.rand:hover,
.rand.is-highlighted { background: var(--c-g6); }

.rand[aria-pressed="true"] {
  background: var(--c-panou);
  border-left-color: var(--c-portocaliu);
}

.poz {
  font-family: var(--f-titlu);
  font-stretch: condensed;
  font-weight: 700;
  font-size: var(--t22);
  line-height: var(--lh-titlu);
}

.nume { display: block; font-weight: 700; }
.meta { display: block; font-size: var(--t12); color: var(--c-g1); }

.uzura {
  display: inline-block;
  margin-top: var(--t7);
  font-size: var(--t12);
  font-weight: 700;
  color: var(--c-portocaliu-text);
}

.viewer-error,
.boot-error {
  margin: 0;
  padding: var(--t18);
  background: var(--c-panou);
  border-left: var(--t7) solid var(--c-portocaliu);
}

.boot-error { margin: var(--t18) var(--t22) 0; }

@media (max-width: 900px) {
  .spatiu { grid-template-columns: minmax(0, 1fr); }
  .panou-piese { max-height: none; }
  .fisa { grid-template-columns: minmax(0, 1fr); }
  .titlu { font-size: var(--t38); }
  .viewer { height: calc(var(--t136) * 3); }
}
```

Create `$POC/ui.js`:
```js
// Partea de DOM: fișa utilajului, selectorul de ansamblu și lista de poziții.
import { MODEL, ASSEMBLIES, POSITIONS, assemblyLabel, positionsOf } from './parts.js';

export function renderModelCard(doc) {
  doc.querySelector('[data-model-name]').textContent = MODEL.name;
  doc.querySelector('[data-specs]').replaceChildren(
    ...MODEL.specs.flatMap(([label, value]) => [el('dt', label), el('dd', value)]),
  );
  doc.querySelector('[data-count]').textContent = `${ASSEMBLIES.length} ansambluri · ${POSITIONS.length} poziții`;
}

export function createPartsPanel(doc, { onAssembly, onSelect, onHover, onExplode }) {
  const select = doc.getElementById('assembly');
  const button = doc.getElementById('explode');
  const list = doc.getElementById('parts');

  select.replaceChildren(...ASSEMBLIES.map((a) => {
    const option = el('option', assemblyLabel(a));
    option.value = String(a.id);
    return option;
  }));

  const rowId = (e) => e.target.closest?.('.rand')?.dataset.id ?? null;
  select.addEventListener('change', () => onAssembly(Number(select.value)));
  button.addEventListener('click', () => onExplode());
  list.addEventListener('click', (e) => { const id = rowId(e); if (id) onSelect(id); });
  list.addEventListener('mouseover', (e) => onHover(rowId(e)));
  list.addEventListener('mouseleave', () => onHover(null));
  list.addEventListener('focusin', (e) => onHover(rowId(e)));
  list.addEventListener('focusout', () => onHover(null));

  const rows = () => list.querySelectorAll('.rand');

  return {
    showAssembly(id) {
      select.value = String(id);
      list.replaceChildren(...positionsOf(id).map(row));
    },
    setSelected(id) {
      for (const r of rows()) r.setAttribute('aria-pressed', String(r.dataset.id === id));
      if (id) list.querySelector(`.rand[data-id="${id}"]`)?.scrollIntoView({ block: 'nearest' });
    },
    setHighlighted(id) {
      for (const r of rows()) r.classList.toggle('is-highlighted', r.dataset.id === id);
    },
    setExploded(on) {
      button.textContent = on ? 'Asamblează' : 'Vezi piesele';
      button.setAttribute('aria-pressed', String(on));
    },
  };
}

function row(p) {
  const button = el('button', null, 'rand');
  button.type = 'button';
  button.dataset.id = p.id;
  button.setAttribute('aria-pressed', 'false');

  const info = el('span', null, 'info');
  info.append(el('span', p.name, 'nume'), el('span', `cod: [.....] · manual p. ${p.pages.join(', ')}`, 'meta'));
  if (p.wear) {
    const wear = el('span', null, 'uzura');
    const symbol = el('span', '▲ ');
    symbol.setAttribute('aria-hidden', 'true');
    wear.append(symbol, 'uzură (propunere)');
    info.append(wear);
  }
  button.append(el('span', String(p.pos), 'poz'), info);

  const li = el('li');
  li.append(button);
  return li;
}

function el(tag, text, className) {
  const node = document.createElement(tag);
  if (text != null) node.textContent = text;
  if (className) node.className = className;
  return node;
}
```

Create `$POC/app.js` (temporary — Task 5 replaces the whole file):
```js
import { renderModelCard, createPartsPanel } from './ui.js';

const panel = createPartsPanel(document, {
  onAssembly: (id) => panel.showAssembly(id),
  onSelect: (id) => panel.setSelected(id),
  onHover: (id) => panel.setHighlighted(id),
  onExplode: () => {},
});
renderModelCard(document);
panel.showAssembly(1);

window.__mf34 = { ready: true };
```

- [ ] **Step 5: Run the checks to verify they pass**

Run: `cd "$POC" && npm run e2e && npm test`
Expected: `ok` for all five `shell.check.mjs` checks, "Toate verificările au trecut", and the unit tests still PASS.

- [ ] **Step 6: Commit** (only if inside a git repository)

```bash
cd "$POC" && git add index.html styles.css ui.js app.js tests/e2e.mjs tests/e2e/shell.check.mjs && git commit -m "feat(mf34): page shell, parts panel and browser checks"
```

---

### Task 5: 3D viewer, explode, markers and two-way linking

**Files:**
- Modify: `$POC/app.js` (replace the whole file)
- Modify: `$POC/.gitignore` (ignore screenshots)
- Test: `$POC/tests/e2e/viewer.check.mjs`

**Interfaces:**
- Consumes:
  - `ASSEMBLIES`, `POSITIONS` from `parts.js`
  - `buildChainsaw`, `explodeOffset`, `easeInOutCubic`, `stepToward` from `model.js`
  - `renderModelCard`, `createPartsPanel` from `ui.js`
  - DOM ids from Task 4; CSS classes `.labels`, `.marker`, `.cerc`, `.viewer-error`
- Produces — `window.__mf34`:
  - `ready: true`
  - `state() → { exploded: boolean, progress: number, activeAssembly: number, selected: string|null, hovered: string|null }`
  - `isAnimating() → boolean`
  - `partPositions() → Record<id, [x, y, z]>`
  - `highlightedId() → string|null` (hovered, else selected)
  - `visibleMarkerIds() → string[]`

- [ ] **Step 1: Write the failing checks**

Create `$POC/tests/e2e/viewer.check.mjs`:
```js
import assert from 'node:assert/strict';
import { POSITIONS } from '../../parts.js';

const settle = (page) => page.waitForFunction(() => !window.__mf34.isAnimating(), null, { timeout: 10000 });
const state = (page) => page.evaluate(() => window.__mf34.state());
const positions = (page) => page.evaluate(() => window.__mf34.partPositions());
const visibleMarkers = (page) => page.evaluate(() => window.__mf34.visibleMarkerIds());
const done = (page) => page.context().close();

export async function explodeAndReassembleRoundTrip(ctx) {
  const page = await ctx.newPage();
  await ctx.openReady(page);
  await settle(page);
  const start = await positions(page);
  assert.equal(Object.keys(start).length, 20);
  await page.screenshot({ path: `${ctx.shotsDir}/desktop-asamblat.png` });

  await page.click('#explode');
  await settle(page);
  const s = await state(page);
  assert.equal(s.exploded, true);
  assert.equal(s.progress, 1);
  assert.equal(await page.textContent('#explode'), 'Asamblează');
  const moved = await positions(page);
  for (const id of Object.keys(start)) assert.notDeepEqual(moved[id], start[id], `${id} nu s-a mișcat`);
  assert.deepEqual(await visibleMarkers(page), ['a1-p1', 'a1-p2']);
  await page.screenshot({ path: `${ctx.shotsDir}/desktop-explodat.png` });

  await page.click('#explode');
  await settle(page);
  assert.deepEqual(await positions(page), start);
  assert.deepEqual(await visibleMarkers(page), []);
  assert.equal(await page.textContent('#explode'), 'Vezi piesele');
  assert.deepEqual(page.errors, []);
  await done(page);
}

export async function rapidDoubleToggleReversesSmoothly(ctx) {
  const page = await ctx.newPage();
  await ctx.openReady(page);
  await settle(page);
  const start = await positions(page);
  await page.click('#explode');
  // Așteptăm stări, nu timpi ficși: randarea software din testele headless poate fi lentă.
  await page.waitForFunction(() => window.__mf34.state().progress > 0.2, null, { timeout: 5000 });
  await page.click('#explode');
  const before = (await state(page)).progress;
  assert.ok(before > 0 && before < 1, `progres la mijloc: ${before}`);
  await page.waitForFunction((b) => window.__mf34.state().progress < b, before, { timeout: 5000 });
  const after = (await state(page)).progress;
  assert.ok(after > 0, `a sărit direct la capăt în loc să se întoarcă: ${before} → ${after}`);
  await settle(page);
  assert.equal((await state(page)).progress, 0);
  assert.deepEqual(await positions(page), start);
  await done(page);
}

export async function markersLinkBothWaysForAll20(ctx) {
  const page = await ctx.newPage();
  await ctx.openReady(page);
  await page.click('#explode');
  await settle(page);
  let checked = 0;
  for (let a = 1; a <= 6; a++) {
    await page.selectOption('#assembly', String(a));
    await settle(page);
    const ids = POSITIONS.filter((p) => p.assemblyId === a).map((p) => p.id);
    assert.deepEqual(await visibleMarkers(page), ids, `markeri pentru ansamblul ${a}`);
    for (const id of ids) {
      await page.locator(`.marker[data-id="${id}"]`).dispatchEvent('click');
      assert.equal(await page.getAttribute(`.rand[data-id="${id}"]`, 'aria-pressed'), 'true', `rândul ${id}`);
      await page.hover(`.rand[data-id="${id}"]`);
      assert.equal(await page.evaluate(() => window.__mf34.highlightedId()), id);
      await page.waitForFunction(
        (pid) => document.querySelector(`.marker[data-id="${pid}"]`).classList.contains('is-highlighted'),
        id,
        { timeout: 2000 },
      );
      checked++;
    }
    if (a === 5) await page.screenshot({ path: `${ctx.shotsDir}/desktop-sina-si-lant.png` });
  }
  assert.equal(checked, 20);
  assert.deepEqual(page.errors, []);
  await done(page);
}

export async function switchingAssemblyClearsSelection(ctx) {
  const page = await ctx.newPage();
  await ctx.openReady(page);
  await page.click('#explode');
  await settle(page);
  await page.locator('.marker[data-id="a1-p2"]').dispatchEvent('click');
  assert.equal((await state(page)).selected, 'a1-p2');
  await page.mouse.move(0, 0);
  await page.selectOption('#assembly', '5');
  const s = await state(page);
  assert.equal(s.selected, null);
  assert.equal(await page.evaluate(() => window.__mf34.highlightedId()), null);
  assert.equal(await page.locator('.rand[aria-pressed="true"]').count(), 0);
  await done(page);
}

export async function keyboardOnlyPass(ctx) {
  const page = await ctx.newPage();
  await ctx.openReady(page);
  let onRow = false;
  for (let i = 0; i < 40 && !onRow; i++) {
    await page.keyboard.press('Tab');
    onRow = await page.evaluate(() => document.activeElement?.matches('.rand') ?? false);
  }
  assert.ok(onRow, 'Tab nu ajunge la lista de poziții');
  const id = await page.evaluate(() => document.activeElement.dataset.id);
  assert.notEqual(await page.evaluate(() => getComputedStyle(document.activeElement).outlineStyle), 'none');
  await page.keyboard.press('Enter');
  await settle(page);
  let s = await state(page);
  assert.equal(s.selected, id);
  assert.equal(s.exploded, true);
  await page.keyboard.press('Escape');
  s = await state(page);
  assert.equal(s.selected, null);
  await done(page);
}

export async function markersHaveTouchTargets(ctx) {
  const page = await ctx.newPage({ viewport: { width: 390, height: 844 } });
  await ctx.openReady(page);
  await page.click('#explode');
  await settle(page);
  for (const id of await visibleMarkers(page)) {
    const box = await page.locator(`.marker[data-id="${id}"]`).boundingBox();
    assert.ok(box.width >= 44 && box.height >= 44, `${id}: ${box.width}×${box.height}`);
  }
  await done(page);
}

export async function mobileExplodedLayout(ctx) {
  const page = await ctx.newPage({ viewport: { width: 390, height: 844 } });
  await ctx.openReady(page);
  await page.click('#explode');
  await settle(page);
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth) <= 390);
  await page.locator('#viewer').scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${ctx.shotsDir}/mobil-explodat.png` });
  assert.deepEqual(page.errors, []);
  await done(page);
}

export async function noWebGLShowsMessageListStillWorks(ctx) {
  const page = await ctx.newPage();
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
      return /webgl/.test(type) ? null : original.call(this, type, ...rest);
    };
  });
  await ctx.openReady(page);
  assert.ok(await page.isVisible('.viewer-error'));
  assert.ok(await page.isDisabled('#explode'));
  await page.selectOption('#assembly', '5');
  assert.equal(await page.locator('#parts .rand').count(), 3);
  await page.click('.rand[data-id="a5-p2"]');
  assert.equal(await page.getAttribute('.rand[data-id="a5-p2"]', 'aria-pressed'), 'true');
  // Three.js scrie singur o eroare în consolă când nu poate crea contextul WebGL.
  assert.deepEqual(page.errors.filter((e) => !/WebGL/i.test(e)), []);
  await done(page);
}
```

- [ ] **Step 2: Run the checks to verify they fail**

Run: `cd "$POC" && npm run e2e`
Expected: the `shell.check.mjs` checks still pass; every `viewer.check.mjs` check FAILs (`window.__mf34.isAnimating is not a function`).

- [ ] **Step 3: Write the implementation**

Append to `$POC/.gitignore`:
```
screenshots/
```

Replace the whole of `$POC/app.js` with:
```js
// Leagă totul: scena 3D, explodarea, markerii și lista de poziții.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { ASSEMBLIES, POSITIONS } from './parts.js';
import { buildChainsaw, explodeOffset, easeInOutCubic, stepToward } from './model.js';
import { renderModelCard, createPartsPanel } from './ui.js';

const EXPLODE_SECONDS = 1.2;
const SPREAD_SECONDS = 0.6;
const ASSEMBLY_OF = new Map(POSITIONS.map((p) => [p.id, p.assemblyId]));

const state = {
  exploded: false,
  progress: 0,
  activeAssembly: ASSEMBLIES[0].id,
  selected: null,
  hovered: null,
  spread: new Map(ASSEMBLIES.map((a) => [a.id, a.id === ASSEMBLIES[0].id ? 1 : 0])),
};

const panel = createPartsPanel(document, {
  onAssembly: setAssembly,
  onSelect: select,
  onHover: (id) => { state.hovered = id; refreshHighlight(); },
  onExplode: () => setExploded(!state.exploded),
});
renderModelCard(document);
panel.showAssembly(state.activeAssembly);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') select(null); });

const viewer = createViewer(document.getElementById('viewer'));
if (!viewer) document.getElementById('explode').disabled = true;

window.__mf34 = {
  ready: true,
  state: () => ({
    exploded: state.exploded,
    progress: state.progress,
    activeAssembly: state.activeAssembly,
    selected: state.selected,
    hovered: state.hovered,
  }),
  isAnimating: () => viewer?.isAnimating() ?? false,
  partPositions: () => viewer?.partPositions() ?? {},
  highlightedId,
  visibleMarkerIds: () => viewer?.visibleMarkerIds() ?? [],
};

function setExploded(on) {
  if (!viewer) return;
  state.exploded = on;
  panel.setExploded(on);
  viewer.frame(on ? 'all-exploded' : 'all');
}

function setAssembly(id) {
  state.activeAssembly = id;
  state.selected = null;
  state.hovered = null;
  panel.showAssembly(id);
  panel.setSelected(null);
  refreshHighlight();
  viewer?.frame(state.exploded ? 'assembly' : 'all');
}

function select(id) {
  state.selected = id;
  panel.setSelected(id);
  if (id && !state.exploded) setExploded(true);
  refreshHighlight();
}

function highlightedId() {
  return state.hovered ?? state.selected;
}

function refreshHighlight() {
  panel.setHighlighted(highlightedId());
}

function readPalette() {
  const css = getComputedStyle(document.documentElement);
  const v = (name) => css.getPropertyValue(name).trim();
  return {
    gri: v('--c-gri'), portocaliu: v('--c-portocaliu'), alb: v('--c-alb'), panou: v('--c-panou'),
    g1: v('--c-g1'), g2: v('--c-g2'), g3: v('--c-g3'), g4: v('--c-g4'), g5: v('--c-g5'), g6: v('--c-g6'),
  };
}

function createViewer(container) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true });
  } catch {
    const message = document.createElement('p');
    message.className = 'viewer-error';
    message.textContent = 'Vizualizarea 3D nu poate porni: browserul nu are WebGL activ. Lista pieselor funcționează în continuare.';
    container.append(message);
    return null;
  }

  const palette = readPalette();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.NeutralToneMapping;
  container.append(renderer.domElement);

  const labels = new CSS2DRenderer();
  labels.domElement.className = 'labels';
  container.append(labels.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(palette.panou);
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
  const key = new THREE.DirectionalLight(palette.alb, 1.6);
  key.position.set(40, 80, 60);
  scene.add(key);

  const camera = new THREE.PerspectiveCamera(35, 1, 1, 1000);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.minDistance = 30;
  controls.maxDistance = 260;
  controls.maxPolarAngle = Math.PI * 0.85;

  const saw = buildChainsaw(palette);
  scene.add(saw.root);

  // Materialele fiecărei piese, pentru estompare și evidențiere.
  const partMaterials = new Map();
  for (const [id, obj] of saw.parts) {
    const materials = [];
    obj.traverse((o) => {
      if (!o.material) return;
      o.material.userData.baseTransparent = o.material.transparent;
      o.material.emissive?.set(palette.portocaliu);
      o.material.emissiveIntensity = 0;
      materials.push(o.material);
    });
    partMaterials.set(id, materials);
  }

  // Markeri numerotați, prinși de centrul fiecărei piese (se mișcă odată cu ea).
  const markers = new Map();
  for (const [id, obj] of saw.parts) {
    const p = POSITIONS.find((x) => x.id === id);
    const center = new THREE.Box3().setFromObject(obj).getCenter(new THREE.Vector3());
    obj.worldToLocal(center);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'marker';
    button.dataset.id = id;
    button.setAttribute('aria-label', `Poziția ${p.pos}: ${p.name}`);
    const circle = document.createElement('span');
    circle.className = 'cerc';
    circle.textContent = String(p.pos);
    button.append(circle);
    button.addEventListener('click', (e) => { e.stopPropagation(); select(id); });
    const label = new CSS2DObject(button);
    label.position.copy(center);
    label.visible = false;
    obj.add(label);
    markers.set(id, label);
  }

  const spreadNow = (id) => state.spread.get(ASSEMBLY_OF.get(id));
  const spreadFinal = (id) => (ASSEMBLY_OF.get(id) === state.activeAssembly ? 1 : 0);

  function poseAt(eased, spreadFor) {
    for (const [id, obj] of saw.parts) {
      const o = explodeOffset(id, eased, spreadFor(id));
      const base = obj.userData.basePosition;
      obj.position.set(base.x + o.x, base.y + o.y, base.z + o.z);
    }
  }

  function boxAt(eased, filter) {
    poseAt(eased, spreadFinal);
    saw.root.updateMatrixWorld(true);
    const box = new THREE.Box3();
    for (const [id, obj] of saw.parts) if (!filter || filter(id)) box.expandByObject(obj);
    if (!filter) box.expandByObject(saw.core);
    poseAt(easeInOutCubic(state.progress), spreadNow);
    return box;
  }

  // Încadrarea camerei: o țintă spre care camera alunecă; se oprește dacă omul rotește.
  const goal = { active: false, target: new THREE.Vector3(), distance: 0 };
  controls.addEventListener('start', () => { goal.active = false; });

  function frame(mode) {
    let box;
    if (mode === 'all') box = boxAt(0);
    else if (mode === 'all-exploded') box = boxAt(1);
    else box = boxAt(1, (id) => ASSEMBLY_OF.get(id) === state.activeAssembly);
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    const vertical = THREE.MathUtils.degToRad(camera.fov);
    const horizontal = 2 * Math.atan(Math.tan(vertical / 2) * camera.aspect);
    const fit = sphere.radius / Math.sin(Math.min(vertical, horizontal) / 2);
    goal.target.copy(sphere.center);
    goal.distance = THREE.MathUtils.clamp(fit * 1.05, controls.minDistance, controls.maxDistance);
    goal.active = true;
  }

  function moveCamera(dt) {
    if (!goal.active) return;
    const k = 1 - Math.exp(-dt * 5);
    const distance = THREE.MathUtils.lerp(camera.position.distanceTo(controls.target), goal.distance, k);
    controls.target.lerp(goal.target, k);
    const direction = camera.position.clone().sub(controls.target).normalize();
    camera.position.copy(controls.target).addScaledVector(direction, distance);
    if (controls.target.distanceTo(goal.target) < 0.05 && Math.abs(distance - goal.distance) < 0.05) goal.active = false;
  }

  function applyLook(eased) {
    const hi = highlightedId();
    for (const [id, materials] of partMaterials) {
      const inActive = ASSEMBLY_OF.get(id) === state.activeAssembly;
      let opacity = 1 - 0.82 * eased * (1 - spreadNow(id));
      if (hi && id !== hi && inActive) opacity *= 0.55;
      for (const m of materials) {
        m.opacity = opacity;
        m.transparent = m.userData.baseTransparent || opacity < 0.999;
        m.depthWrite = opacity >= 0.999;
        m.emissiveIntensity = id === hi ? 0.45 : 0;
      }
    }
    for (const [id, label] of markers) {
      label.visible = eased > 0.6 && ASSEMBLY_OF.get(id) === state.activeAssembly;
      label.element.classList.toggle('is-highlighted', id === hi);
    }
  }

  function resize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    renderer.setSize(w, h);
    labels.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(container);
  resize();

  // Prima încadrare: direct, fără alunecare, din față-stânga ca în fotografii.
  frame('all');
  controls.target.copy(goal.target);
  camera.position.copy(goal.target).addScaledVector(new THREE.Vector3(60, 45, 100).normalize(), goal.distance);
  goal.active = false;

  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.05);
    state.progress = stepToward(state.progress, state.exploded ? 1 : 0, dt, EXPLODE_SECONDS);
    for (const a of ASSEMBLIES) {
      state.spread.set(a.id, stepToward(state.spread.get(a.id), a.id === state.activeAssembly ? 1 : 0, dt, SPREAD_SECONDS));
    }
    const eased = easeInOutCubic(state.progress);
    poseAt(eased, spreadNow);
    applyLook(eased);
    moveCamera(dt);
    controls.update();
    renderer.render(scene, camera);
    labels.render(scene, camera);
  });

  return {
    frame,
    isAnimating: () =>
      goal.active ||
      state.progress !== (state.exploded ? 1 : 0) ||
      ASSEMBLIES.some((a) => state.spread.get(a.id) !== (a.id === state.activeAssembly ? 1 : 0)),
    partPositions: () => Object.fromEntries([...saw.parts].map(([id, obj]) => [id, obj.position.toArray()])),
    visibleMarkerIds: () => [...markers].filter(([, label]) => label.visible).map(([id]) => id),
  };
}
```

- [ ] **Step 4: Run all checks and tests to verify they pass**

Run: `cd "$POC" && npm test && npm run e2e`
Expected: unit tests PASS; every check in `shell.check.mjs` and `viewer.check.mjs` prints `ok`; "Toate verificările au trecut". Screenshots appear in `$POC/screenshots/`: `desktop-asamblat.png`, `desktop-explodat.png`, `desktop-sina-si-lant.png`, `mobil-explodat.png`.

If `markersLinkBothWaysForAll20` fails only on the `is-highlighted` wait, the marker update runs in the render loop; confirm the loop is running (`renderer.setAnimationLoop`) before changing anything else.

- [ ] **Step 5: Commit** (only if inside a git repository)

```bash
cd "$POC" && git add app.js .gitignore tests/e2e/viewer.check.mjs && git commit -m "feat(mf34): 3D viewer with explode, markers and two-way linking"
```

---

### Task 6: Visual review, README and CLAUDE.md

**Files:**
- Create: `$POC/README.md`
- Modify: `/Users/popescuandrei/Documents/Projects/omac/CLAUDE.md` (the `proof-of-concepts/threejs-renders/` bullet under "Project state")
- Modify (only if the visual review finds a problem): `$POC/model.js` geometry numbers, `$POC/styles.css`

**Interfaces:**
- Consumes: the screenshots from Task 5; the photos in `$POC/assets/`; visual guide pages 81–85 (exploded-diagram mockup).
- Produces: documentation only.

- [ ] **Step 1: Compare the screenshots against the references**

Open `screenshots/desktop-asamblat.png` next to `assets/motoferastrau_o_mac_mf_34__1__jpg.webp`, and `screenshots/desktop-explodat.png` next to visual guide page 82 (render it with `pdftoppm -r 90 -png -f 82 -l 82 "/Users/popescuandrei/Documents/Projects/omac/docs/Ghid-vizual-machete-o-mac.pdf" /tmp/ghid`).

Check, and fix in `model.js` / `styles.css` if any fails:
- assembled: reads as the MF 34 — orange cover on top, dark body, wrap handle in front, slotted guard, rear handle with orange grip, gray bar with chain;
- exploded: no two assemblies overlap so badly that a marker is unreadable; markers sit on their parts;
- page: notice bar, model card and list match the mockup's layout; title in condensed uppercase; nothing centered except button labels;
- mobile: viewer above the list, nothing cut off at the right edge.

After any fix, rerun `npm test && npm run e2e` and expect all green.

- [ ] **Step 2: Write the README**

Create `$POC/README.md`:
```markdown
# MF 34 — schemă explodată (proof of concept)

Pagină statică pentru oferta o-mac.ro: motoferăstrăul O’MAC MF 34 în 3D, desfăcut în 6 ansambluri și 20 de poziții numerotate, legate în ambele sensuri cu lista de piese. Arată cum poate arăta modulul de piese de schimb din Faza 2.

## Cum se deschide

Modulele ES nu pornesc din `file://`, deci pagina se servește local:

    python3 -m http.server

apoi `http://localhost:8000` în browser. Three.js 0.170.0 se încarcă de pe jsDelivr, deci e nevoie de internet.

## Date

- Denumirile pieselor și specificațiile: `assets/Manual de utilizare O'MAC MF 34 MF 38 MF 46.pdf` (paginile tipărite sunt trecute la fiecare poziție).
- Manualul nu are coduri, cantități sau prețuri; pagina afișează `cod: [.....]` și nu inventează valori.
- Piesele de uzură sunt o propunere bazată pe capitolul de întreținere; clasificarea o face O’MAC.
- Toate datele sunt în `parts.js`; înlocuirea lui cu date reale nu cere modificări în alte fișiere.
- Modelul 3D e construit din forme simple după fotografiile din `assets/` (stilizat, nu fotorealist). Inscripția O’MAC de pe șină e un înlocuitor până la fișierul oficial de logo.

## Fișiere

| Fișier | Rol |
|---|---|
| `parts.js` | ansambluri și poziții (singura sursă de date) |
| `model.js` | geometria utilajului și calculul explodării |
| `ui.js` | fișa utilajului, selectorul și lista |
| `app.js` | scena 3D, animația, markerii și selecția |
| `styles.css` | variabilele de brand și stilul paginii |

## Verificare

    npm install && npx playwright install chromium
    npm test        # date, calcul și geometrie (node --test)
    npm run e2e     # pagina în Chromium; capturi în screenshots/
```

- [ ] **Step 3: Update CLAUDE.md**

In `/Users/popescuandrei/Documents/Projects/omac/CLAUDE.md`, replace the line:
```
- `proof-of-concepts/threejs-renders/`: empty so far.
```
with:
```
- `proof-of-concepts/threejs-renders/MOTOFERASTRAU O'MAC MF 34/`: pitch PoC — Three.js exploded view of the MF 34 chainsaw (see its README). No build step; serve with `python3 -m http.server` from that folder. Tests: `npm test` (node --test, pure modules) and `npm run e2e` (Playwright + Chromium); single unit test file: `node --test tests/parts.test.mjs`. All part data lives in `parts.js`, taken from the manual in `assets/`; never add codes or prices that aren't in the client's material.
```

- [ ] **Step 4: Final run**

Run: `cd "$POC" && npm test && npm run e2e`
Expected: all unit tests PASS, all browser checks `ok`.

- [ ] **Step 5: Commit** (only if inside a git repository)

```bash
cd "$POC" && git add README.md && git add ../../../CLAUDE.md && git commit -m "docs(mf34): README, CLAUDE.md and visual review fixes"
```
