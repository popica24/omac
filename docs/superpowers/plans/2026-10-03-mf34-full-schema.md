# MF 34 Full Factory Schema Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 20-position PoC data with the full factory parts list (169 positions, 13 assemblies) and model every position in Three.js, with its real quantity of pieces, markers, list rows and a readable explode.

**Architecture:** `parts.js` holds the 169 positions. `geometry/hardware.js` has parametric builders for standard parts (bolts, nuts, washers, bearings, seals, springs…). `geometry/engine.js` and `geometry/body.js` hold one builder per position, each returning that position's pieces already placed in the saw. `model.js` assembles them, gives every position its own materials, finds marker anchors by raycasting, and lays out the explode: each assembly moves along its own direction, and the active assembly's parts spread into a gap-separated grid (row by row, in factory-number order). `app.js`/`ui.js` change only where ids, labels and quantities show.

**Tech Stack:** Three.js 0.170.0 (vendored in `vendor/`, npm devDependency for Node tests), Node built-in test runner, Playwright + Chromium, Python `http.server`.

**Spec:** `docs/superpowers/specs/2026-10-03-mf34-full-schema-design.md` (builds on `docs/superpowers/specs/2026-10-03-mf34-exploded-view-design.md`)

**Deliberate reading of the spec:** "fan out along that assembly's axis in the order the factory drawing stacks them" is implemented as a gap-separated grid filled row by row in factory-number order. A single line of up to 23 parts would make markers far closer than 46 px; the grid keeps the order and guarantees no overlap.

## Global Constraints

- Working directory for every command: `"/Users/popescuandrei/Documents/Projects/omac/proof-of-concepts/threejs-renders/MOTOFERASTRAU O'MAC MF 34"` — always double-quoted. Written `$POC` below; start each shell command with `POC="/Users/popescuandrei/Documents/Projects/omac/proof-of-concepts/threejs-renders/MOTOFERASTRAU O'MAC MF 34" &&` or write the full quoted path.
- The factory model designation printed on the two source sheets must not appear in any project file, page text, comment or test name. Tests that check for it build the string from fragments (`['TT', '4303'].join('')`). Refer to the sources only as "A Explosive view" / "B Explosive view".
- Position ids are the factory numbers `A1`–`A94`, `B1`–`B75`; they are the marker labels and the list's position column.
- Exact UI strings: count `13 ansambluri · 169 poziții`; selector `N · Nume (count)`; row meta `cod: [.....] · denumire tradusă, de verificat`; quantity `buc. N`; wear `▲ uzură (propunere)`; buttons `Vezi piesele` / `Asamblează`; notice `Proof of concept. Denumirile pieselor provin din lista de piese a fabricantului, traduse provizoriu; codurile și prețurile nu sunt încă disponibile.`
- No codes, prices or stock invented; quantities exactly as on the sheets.
- Brand rules unchanged from the PoC: colors only via CSS variables (JS reads them with `readPalette()`), `color-scheme: light`, no `prefers-color-scheme`, no Google Fonts, no `®`, no range names, left-aligned text (numbers in columns right-aligned, button labels centered), touch targets ≥ 44 px, visible focus ring.
- Model units: centimetres. X = saw length (bar towards +X), Y = up, +Z = chain/clutch side, −Z = starter side. Crankshaft axis is Z at height `CY = 4`; cylinder vertical above it; exhaust +X, intake −X.
- Material kinds (the only values a builder may pass to `mat()`): `plastic`, `corp`, `cauciuc`, `metal`, `otel`, `aluminiu`, `ceramica`, `filtru`, `comutator`, `sina`, `lant`.
- The project has no git repository. Each "Commit" step runs only if `git -C "$POC" rev-parse --is-inside-work-tree` succeeds; otherwise skip it.

## Review Focus

1. The bar scabbard (B75) is an accessory: it must not float over the bar when assembled or when another assembly is active; it shows only when exploded with assembly 12 active. Pinned in Task 7 (`scabbardOnlyWithItsAssembly`).
2. Three-character marker labels (`A12`, `B48`) must fit inside the marker without overflowing. Pinned in Task 7 (`markerLabelsFit`).
3. For every one of the 13 assemblies, every visible marker stays inside the viewer frame. Pinned in Task 7 (`activeMarkersInsideViewer`).
4. Romanian names (ș ț ă î â) and quantities in the list match the data exactly for all 13 assemblies. Pinned in Task 6 (`allRowNamesMatchData`).
5. The factory designation never reaches the rendered page (text or HTML). Pinned in Task 6 (`noForbiddenText`) and, for files, Task 1 (`no-factory-name.test.mjs`).

---

### Task 1: Parts data — 169 positions, 13 assemblies

**Files:**
- Modify (replace whole file): `$POC/parts.js`
- Modify (replace whole file): `$POC/tests/parts.test.mjs`
- Create: `$POC/tests/no-factory-name.test.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces (from `parts.js`):
  - `MODEL` — unchanged from the PoC.
  - `ASSEMBLIES: Array<{ id: number (1–13), name: string, positions: Array<{ id: string, en: string, name: string, qty: number, wear: boolean }> }>`
  - `POSITIONS: Array<{ id, en, name, qty, wear, assemblyId: number, code: null }>` — flat, assembly order, then factory order inside each assembly.
  - `assemblyLabel(a) → "1 · Cilindru și piston (9)"`
  - `positionsOf(assemblyId) → POSITIONS[number][]`
  - `partId` is removed (ids are the factory numbers now).

Note: after this task `tests/model-*.test.mjs` and the browser checks fail (they still expect the old 20 ids). Tasks 2–7 bring them back. This task's own command runs only its two test files.

- [ ] **Step 1: Write the failing tests**

Replace `$POC/tests/parts.test.mjs` with:
```js
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
```

Create `$POC/tests/no-factory-name.test.mjs`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const SKIP = new Set(['node_modules', 'vendor', 'assets', 'screenshots']);
const TEXT = /\.(js|mjs|html|css|md|json)$/;
// Denumirea de fabrică se compune din bucăți, ca nici acest fișier să n-o conțină.
const FORBIDDEN = ['TT', '4303'].join('');

function files(dir) {
  return readdirSync(dir).flatMap((name) => {
    if (SKIP.has(name)) return [];
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) return files(p);
    return TEXT.test(name) ? [p] : [];
  });
}

test('denumirea de fabrică nu apare în niciun fișier al proiectului', () => {
  const hits = files(root).filter((f) => readFileSync(f, 'utf8').includes(FORBIDDEN));
  assert.deepEqual(hits, []);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd "$POC" && node --test tests/parts.test.mjs tests/no-factory-name.test.mjs`
Expected: `parts.test.mjs` FAILs (old data: 6 assemblies, 20 positions); `no-factory-name.test.mjs` PASSes (nothing contains the designation yet — it guards the future).

- [ ] **Step 3: Write the implementation**

Replace `$POC/parts.js` with:
```js
// Datele PoC-ului: lista de piese a fabricantului (foile „A Explosive view" — motor —
// și „B Explosive view" — corp), cu denumirile traduse provizoriu în română.
// Specificațiile modelului provin din manualul de utilizare.
// Sursele nu au coduri de piesă: code = null se afișează „cod: [.....]".
// Singurul fișier cu date; restul codului doar îl citește.

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

// Piese de uzură: propunere, pe baza capitolului de întreținere din manual.
const WEAR = new Set(['A6', 'A14', 'A55', 'A66', 'A69', 'A75', 'B15', 'B36', 'B73', 'B74']);

// [poziție, denumire originală, cantitate, denumire tradusă]
const SHEET = [
  ['A1', 'Inner Guide', 1, 'Ghidaj interior'],
  ['A2', 'Bolt M5*12', 4, 'Șurub M5×12'],
  ['A3', 'Insulator', 1, 'Izolator admisie'],
  ['A4', 'Gasket Insulator', 1, 'Garnitură izolator'],
  ['A5', 'Cylinder', 1, 'Cilindru'],
  ['A6', 'Spark Plug', 1, 'Bujie'],
  ['A7', 'Bolt M5*20', 4, 'Șurub M5×20'],
  ['A8', 'Square Screw M5*85', 2, 'Șurub M5×85'],
  ['A9', 'Gasket Muffler', 1, 'Garnitură tobă'],
  ['A10', 'Muffler', 1, 'Tobă de eșapament'],
  ['A11', 'Muffler Cap', 1, 'Capac tobă'],
  ['A12', 'Nut M5', 1, 'Piuliță M5'],
  ['A13', 'Gasket Cylinder', 1, 'Garnitură cilindru'],
  ['A14', 'Piston Ring', 2, 'Segment piston'],
  ['A15', 'Piston', 1, 'Piston'],
  ['A16', 'Snap Ring', 2, 'Siguranță bolț piston'],
  ['A17', 'Piston Pin', 1, 'Bolț piston'],
  ['A18', 'Needle Bearing 11*15*12.5', 1, 'Rulment cu ace 11×15×12,5'],
  ['A19', 'Crankshaft', 1, 'Arbore cotit'],
  ['A20', 'Washer', 2, 'Șaibă'],
  ['A21', 'Key', 1, 'Pană'],
  ['A22', 'Ignition Coil Cap', 1, 'Capișon bujie'],
  ['A23', 'Ignition Coil', 1, 'Bobină de aprindere'],
  ['A24', 'Bolt M5*18', 2, 'Șurub M5×18'],
  ['A25', 'Oil palm', 1, 'Sorb ulei'],
  ['A26', 'Gasket Oilcap O type', 1, 'Garnitură O-ring bușon ulei'],
  ['A27', 'Oil Cap', 1, 'Bușon ulei'],
  ['A28', 'Bolt M5*30', 5, 'Șurub M5×30'],
  ['A29', 'Rotor', 1, 'Volant magnetic'],
  ['A30', 'Nut M8-Fine thread', 1, 'Piuliță M8 filet fin'],
  ['A31', 'Bolt M4*8', 3, 'Șurub M4×8'],
  ['A32', 'Cover Oil Seal', 1, 'Capac simering'],
  ['A33', 'Oil Seal Φ15×Φ35×5', 1, 'Simering 15×35×5'],
  ['A34', 'Retainer Ring Ø35', 1, 'Inel de siguranță Ø35'],
  ['A35', 'Bearing 6206 p6', 2, 'Rulment 6206'],
  ['A36', 'Anti-vibration Left Crankcase', 3, 'Amortizor antivibrații carter stânga'],
  ['A37', 'Left Crankcase', 1, 'Carter stânga'],
  ['A38', 'Left double nail shock absorption', 1, 'Amortizor dublu stânga'],
  ['A39', 'Gasket crankcase', 1, 'Garnitură carter'],
  ['A40', 'Pin', 3, 'Știft'],
  ['A41', 'Dustproof Rubber', 1, 'Garnitură anti-praf'],
  ['A42', 'Right Crankcase', 1, 'Carter dreapta'],
  ['A43', 'Right double nail shock absorption', 1, 'Amortizor dublu dreapta'],
  ['A44', 'Washer Insulator Branket', 1, 'Șaibă suport izolator'],
  ['A45', 'Insulator Branket', 1, 'Suport izolator'],
  ['A46', 'Gasket Insulator Branket', 1, 'Garnitură suport izolator'],
  ['A47', 'Manifold', 1, 'Galerie admisie'],
  ['A48', 'Carburetor', 1, 'Carburator'],
  ['A49', 'Throttle Pull Rod', 1, 'Tijă accelerație'],
  ['A50', 'Intake Manifold', 1, 'Racord admisie'],
  ['A51', 'Anti-vibration Intake Manifold', 1, 'Amortizor racord admisie'],
  ['A52', 'Bolt M5*50', 2, 'Șurub M5×50'],
  ['A53', 'Screw Gm5-m5x38', 1, 'Prezon M5×38'],
  ['A54', 'Gasket Air-filter', 1, 'Garnitură filtru aer'],
  ['A55', 'Air-filter', 1, 'Filtru de aer'],
  ['A56', 'Butterfly clasp', 1, 'Piuliță fluture'],
  ['A57', 'Bolt M5*14', 2, 'Șurub M5×14'],
  ['A58', 'Hook', 1, 'Cârlig'],
  ['A59', 'Antivibration Set Hook', 1, 'Cârlig set antivibrații'],
  ['A60', 'Antivibration Hook', 1, 'Cârlig antivibrații'],
  ['A61', 'Oil Seal Φ15×Φ28×5', 1, 'Simering 15×28×5'],
  ['A62', 'Cover oil Pump', 1, 'Capac pompă ulei'],
  ['A63', 'Bolt M4*10', 3, 'Șurub M4×10'],
  ['A64', 'Worm', 1, 'Melc antrenare pompă ulei'],
  ['A65', 'Needle Bearing 12*15*14.5', 1, 'Rulment cu ace 12×15×14,5'],
  ['A66', 'Sproket', 1, 'Pinion lanț'],
  ['A67', 'Clutch Drum', 1, 'Tambur ambreiaj'],
  ['A68', 'Gasket Clutch', 1, 'Șaibă ambreiaj'],
  ['A69', 'Clutch', 1, 'Ambreiaj'],
  ['A70', 'Bolt M4×14', 2, 'Șurub M4×14'],
  ['A71', 'Oil nozzle', 1, 'Duză ulei'],
  ['A72', 'Oil Pump', 1, 'Pompă ulei'],
  ['A73', 'Dustproof Rubber', 1, 'Garnitură anti-praf'],
  ['A74', 'Nozzle', 1, 'Tub ulei'],
  ['A75', 'Oil Filter', 1, 'Filtru ulei'],
  ['A76', 'Oil nozzle cap', 1, 'Capac duză ulei'],
  ['A77', 'Guide', 1, 'Ghidaj'],
  ['A78', 'Screw Aym8-m8x42', 2, 'Prezon M8×42'],
  ['A79', 'Bolt M5X10', 2, 'Șurub M5×10'],
  ['A80', 'Bumper Spike', 1, 'Gheară'],
  ['A81', 'Sponge Filter', 1, 'Filtru burete'],
  ['A82', 'Snap Ring Ø10', 1, 'Inel de siguranță Ø10'],
  ['A83', 'Went Mouth', 1, 'Supapă aerisire'],
  ['A84', 'Insulation Pipe 7X70', 1, 'Tub izolator 7×70'],
  ['A85', 'Negative Pipe', 1, 'Furtun impuls'],
  ['A86', 'Nozzle Dip', 1, 'Racord duză'],
  ['A87', 'Elbow', 1, 'Cot'],
  ['A88', 'Front baffle metallurgical nut M5', 1, 'Piuliță M5 deflector față'],
  ['A89', 'Limit ejector return spring', 1, 'Arc revenire limitator'],
  ['A90', 'Bolt ST4*10', 1, 'Șurub ST4×10'],
  ['A91', 'Limit ejector', 1, 'Limitator'],
  ['A92', 'Brake positioning block', 1, 'Bloc poziționare frână'],
  ['A93', 'Washer 5X10X1', 1, 'Șaibă 5×10×1'],
  ['A94', 'Bolt M5X20', 1, 'Șurub M5×20'],
  ['B1', 'Snap for air filter cover', 2, 'Clemă capac filtru aer'],
  ['B2', 'air filter cover', 1, 'Capac filtru aer'],
  ['B3', 'front guard', 1, 'Protecție mână (frână de lanț)'],
  ['B4', 'Bolt M5*14', 8, 'Șurub M5×14'],
  ['B5', 'Bolt ST5X18', 1, 'Șurub ST5×18'],
  ['B6', 'engine cover', 1, 'Capac motor'],
  ['B7', 'handle', 1, 'Mâner față'],
  ['B8', 'Bolt ST5X14', 9, 'Șurub ST5×14'],
  ['B9', 'Gas deflector', 1, 'Deflector gaze'],
  ['B10', 'Bolt ST3.5X10', 3, 'Șurub ST3,5×10'],
  ['B11', 'anti-dust gap', 3, 'Garnitură anti-praf'],
  ['B12', 'Buffer spring buckle', 1, 'Clemă arc amortizor'],
  ['B13', 'Handle cushion spring', 1, 'Arc amortizor mâner'],
  ['B14', 'Start Knob', 1, 'Mâner demaror'],
  ['B15', 'Start rope', 1, 'Sfoară demaror'],
  ['B16', 'Starter cover', 1, 'Carcasă demaror'],
  ['B17', 'Three pad Washer', 1, 'Șaibă cu trei urechi'],
  ['B18', 'Big Spring', 1, 'Arc mare demaror'],
  ['B19', 'Big Sping Box', 1, 'Casetă arc demaror'],
  ['B20', 'Starting rope pulley', 1, 'Fulie demaror'],
  ['B21', 'Small Spring', 1, 'Arc mic'],
  ['B22', 'Pony Wheel', 1, 'Clichet demaror'],
  ['B23', 'Washer 5X14X1.2', 1, 'Șaibă 5×14×1,2'],
  ['B24', 'wind deflector', 1, 'Deflector aer'],
  ['B25', 'Conical pressure spring', 1, 'Arc conic'],
  ['B26', 'Conical spring seat', 1, 'Suport arc conic'],
  ['B27', 'Chain Blocker', 1, 'Opritor lanț'],
  ['B28', 'Chain Blocker Bolt M5*13', 3, 'Șurub opritor lanț M5×13'],
  ['B29', 'anti-dust gap', 2, 'Garnitură anti-praf'],
  ['B30', 'Long damping seat', 2, 'Suport amortizor lung'],
  ['B31', 'Fuel tank', 1, 'Rezervor combustibil'],
  ['B32', 'Double pin', 1, 'Știft dublu'],
  ['B33', 'Cylindrical shock absorption', 1, 'Amortizor cilindric'],
  ['B34', 'Balancer Seat', 1, 'Suport balansier'],
  ['B35', 'Balancer', 1, 'Balansier'],
  ['B36', 'Fuel Filter', 1, 'Filtru combustibil'],
  ['B37', 'Fuel Pipe', 1, 'Furtun combustibil'],
  ['B38', 'Rear Handle', 1, 'Mâner spate'],
  ['B39', 'Trigger', 1, 'Trăgaci accelerație'],
  ['B40', 'Trigger torsion spring', 1, 'Arc torsiune trăgaci'],
  ['B41', 'Trigger Pin Φ6X28', 1, 'Bolț trăgaci 6×28'],
  ['B42', 'Trigger control arm', 1, 'Pârghie blocare trăgaci'],
  ['B43', 'Fuel Pipe 3X5X130', 1, 'Furtun combustibil 3×5×130'],
  ['B44', 'Balancer Seat', 1, 'Suport balansier'],
  ['B45', 'Bolt M5*12', 1, 'Șurub M5×12'],
  ['B46', 'ON/OFF Switch', 1, 'Comutator pornire/oprire'],
  ['B47', 'Bolt ST5*18', 1, 'Șurub ST5×18'],
  ['B48', 'Multipurpose spanner fixed shrapnel', 1, 'Clemă fixare cheie'],
  ['B49', 'Bolt ST4X10', 10, 'Șurub ST4×10'],
  ['B50', 'Multipurpose wrench holder', 1, 'Suport cheie universală'],
  ['B51', 'Spark plug socket', 1, 'Cheie bujie'],
  ['B52', 'Oil palm', 1, 'Sorb ulei'],
  ['B53', 'Seal for oil cap', 1, 'Garnitură bușon ulei'],
  ['B54', 'Oil tank cap', 1, 'Bușon rezervor ulei'],
  ['B55', 'Brake spring cover plate', 1, 'Capac arc frână'],
  ['B56', 'Bolt ST4X8', 3, 'Șurub ST4×8'],
  ['B57', 'Chain Guider', 1, 'Ghidaj lanț'],
  ['B58', 'Cover plate for chain tension', 1, 'Placă capac întinzător'],
  ['B59', 'Tightening nut', 1, 'Piuliță întinzător'],
  ['B60', 'Tightening buckle', 1, 'Știft întinzător'],
  ['B61', 'Tightening screw', 1, 'Șurub întinzător'],
  ['B62', 'Brake Pin 3X9', 1, 'Bolț frână 3×9'],
  ['B63', 'Brake Belt', 1, 'Bandă frână'],
  ['B64', 'Brake Body', 1, 'Carcasă frână'],
  ['B65', 'Flange Nut M8', 2, 'Piuliță cu flanșă M8'],
  ['B66', 'Big Spring', 1, 'Arc frână'],
  ['B67', 'Brake belt connecting rod', 1, 'Tijă bandă frână'],
  ['B68', 'Brake connecting piece', 1, 'Piesă legătură frână'],
  ['B69', 'Main Lever', 1, 'Pârghie principală frână'],
  ['B70', 'Circlip 4', 1, 'Siguranță Ø4'],
  ['B71', 'Snapped rivet 3*9', 1, 'Nit 3×9'],
  ['B72', 'Snapped rivet 3*13', 1, 'Nit 3×13'],
  ['B73', 'chain', 1, 'Lanț 64DL .325" .058"'],
  ['B74', 'Guide Bar', 1, 'Șină de ghidaj 40 cm'],
  ['B75', 'Guide Bar Protector', 1, 'Teacă șină'],
];

// „A5-A7" → A5, A6, A7
function ids(...ranges) {
  return ranges.flatMap((r) => {
    const [from, to = from] = r.split('-');
    const sheet = from[0];
    const a = Number(from.slice(1));
    const b = Number(to.slice(1));
    return Array.from({ length: b - a + 1 }, (_, i) => `${sheet}${a + i}`);
  });
}

const ASSEMBLY_LIST = [
  [1, 'Cilindru și piston', ids('A5-A7', 'A13-A18')],
  [2, 'Toba de eșapament', ids('A8-A12')],
  [3, 'Carter și arbore cotit', ids('A19-A21', 'A28', 'A31-A43')],
  [4, 'Aprindere și volant', ids('A22-A24', 'A29', 'A30')],
  [5, 'Admisie și carburator', ids('A1-A4', 'A44-A53', 'A84-A87')],
  [6, 'Filtru de aer și capace', ids('A54-A56', 'B1', 'B2', 'B6', 'B9-B11')],
  [7, 'Ambreiaj și pompă de ulei', ids('A57-A79')],
  [8, 'Frână de lanț și protecție', ids('A80', 'A88-A94', 'B3', 'B5', 'B55', 'B56', 'B62-B64', 'B66-B72')],
  [9, 'Demaror', ids('B12-B24')],
  [10, 'Mânere și comenzi', ids('B4', 'B7', 'B8', 'B25', 'B26', 'B29', 'B30', 'B32-B35', 'B38-B42', 'B44-B47', 'B49')],
  [11, 'Rezervoare', ids('A25-A27', 'A81-A83', 'B31', 'B36', 'B37', 'B43', 'B52-B54')],
  [12, 'Șină, lanț și întinzător', ids('B27', 'B28', 'B57-B61', 'B65', 'B73-B75')],
  [13, 'Trusă de scule', ids('B48', 'B50', 'B51')],
];

const BY_ID = new Map(SHEET.map(([id, en, qty, name]) => [id, { id, en, name, qty, wear: WEAR.has(id) }]));

export const ASSEMBLIES = ASSEMBLY_LIST.map(([id, name, list]) => ({
  id,
  name,
  positions: list.map((pid) => {
    const p = BY_ID.get(pid);
    if (!p) throw new Error(`Poziție lipsă din listă: ${pid}`);
    return p;
  }),
}));

export const POSITIONS = ASSEMBLIES.flatMap((a) => a.positions.map((p) => ({ ...p, assemblyId: a.id, code: null })));

export const assemblyLabel = (a) => `${a.id} · ${a.name} (${a.positions.length})`;

export const positionsOf = (assemblyId) => POSITIONS.filter((p) => p.assemblyId === assemblyId);
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd "$POC" && node --test tests/parts.test.mjs tests/no-factory-name.test.mjs`
Expected: PASS, 11 tests.

- [ ] **Step 5: Commit** (only if inside a git repository)

```bash
cd "$POC" && git add parts.js tests/parts.test.mjs tests/no-factory-name.test.mjs && git commit -m "feat(mf34): full factory parts list, 169 positions in 13 assemblies"
```

---
### Task 2: Parametric hardware library

**Files:**
- Create: `$POC/geometry/hardware.js`
- Test: `$POC/tests/hardware.test.mjs`

**Interfaces:**
- Consumes: nothing project-specific.
- Produces (from `geometry/hardware.js`, all units cm):
  - `mesh(geometry, material) → THREE.Mesh`
  - `group(...children) → THREE.Group`
  - `at(obj, [x, y, z], [rx, ry, rz]?) → obj` — sets position and rotation.
  - `AXIS` — rotations that turn a piece's +Y axis towards: `up` (+Y), `down` (−Y), `toPlusZ`, `toMinusZ`, `toPlusX`, `toMinusX`.
  - Geometry: `roundedRectShape(w, h, r)`, `rbox(w, h, d, r = 1, bevel = 0.4)` (centred), `lathe(profile [[r, y], …], segments = 32, phiStart = 0, phiLength = 2π)`, `ringGeometry(d, D, t)` (axis +Y, from y 0 to t), `cylinder(r, h, segments = 16, rTop = r)` (centred), `extrude(shape, depth, bevel = 0)` (centred on Z), `gearShape(teeth, rOut, rRoot, rHole)`, `tube(points [[x,y,z], …], r, segments = 48)`, `stadiumPoints(length, endRadius, pathRadius, count) → [{ x, y, angle }]`.
  - Pieces (`m` = material; every piece is built along +Y, base at y = 0 except bolts):
    - `bolt(m, { d, L, head = 'hex' | 'pan' })` — shank from y = −L to 0, head above 0.
    - `nut(m, { d })` (height 0.8d, with hole), `flangeNut(m, { d })`, `wingNut(m, { d })`
    - `washer(m, { d, D, t })`, `oring(m, { D, w })`, `bearing(m, { d, D, B, needle = false })`, `seal(m, { d, D, B })`, `circlip(m, { D, w })` (open ring), `pin(m, { d, L })`, `rivet(m, { d, L })`, `key(m, { w, h, L })`
    - `spring(m, { D, wire, L, turns, D2 = D })` (helix, height L + wire), `torsionSpring(m, { D, wire, turns, leg })`, `spiralSpring(m, { r0, r1, turns, width })`

- [ ] **Step 1: Write the failing test**

Create `$POC/tests/hardware.test.mjs`:
```js
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
  assert.ok(close(s.x, 0.1, 1e-6) && close(s.y, 3, 1e-6) && close(s.z, 3, 1e-6));
});

test('stadiumPoints: 64 de puncte pe traseul lanțului', () => {
  const pts = stadiumPoints(40, 2.5, 2.9, 64);
  assert.equal(pts.length, 64);
  for (const p of pts) {
    const d = p.x >= 2.5 && p.x <= 37.5 ? Math.abs(p.y) : Math.hypot(p.x - (p.x < 2.5 ? 2.5 : 37.5), p.y);
    assert.ok(close(d, 2.9, 1e-6));
  }
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd "$POC" && node --test tests/hardware.test.mjs`
Expected: FAIL — `Cannot find module '.../geometry/hardware.js'`.

- [ ] **Step 3: Write the implementation**

Create `$POC/geometry/hardware.js`:
```js
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd "$POC" && node --test tests/hardware.test.mjs`
Expected: PASS, 13 tests.

- [ ] **Step 5: Commit** (only if inside a git repository)

```bash
cd "$POC" && git add geometry/hardware.js tests/hardware.test.mjs && git commit -m "feat(mf34): parametric hardware library"
```

---
### Task 3: Engine geometry (assemblies 1–5 and 7)

**Files:**
- Create: `$POC/geometry/engine.js`
- Test: `$POC/tests/geometry-engine.test.mjs`

**Interfaces:**
- Consumes: `POSITIONS` from `parts.js` (tests); everything listed under Task 2 from `geometry/hardware.js`.
- Produces: `ENGINE: Record<positionId, (mat: (kind: string) => THREE.Material) => THREE.Object3D[]>` — one builder per position of assemblies 1, 2, 3, 4, 5 and 7 (77 builders). Each builder returns exactly `qty` pieces, already placed in saw coordinates (cm). `mat(kind)` is the only source of materials; `kind` is one of the material kinds in Global Constraints.

- [ ] **Step 1: Write the failing test**

Create `$POC/tests/geometry-engine.test.mjs`:
```js
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd "$POC" && node --test tests/geometry-engine.test.mjs`
Expected: FAIL — `Cannot find module '.../geometry/engine.js'`.

- [ ] **Step 3: Write the implementation**

Create `$POC/geometry/engine.js`:
```js
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd "$POC" && node --test tests/geometry-engine.test.mjs`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit** (only if inside a git repository)

```bash
cd "$POC" && git add geometry/engine.js tests/geometry-engine.test.mjs && git commit -m "feat(mf34): engine geometry, 77 positions"
```

---
### Task 4: Body geometry (assemblies 6 and 8–13)

**Files:**
- Create: `$POC/geometry/body.js`
- Test: `$POC/tests/geometry-body.test.mjs`

**Interfaces:**
- Consumes: `POSITIONS` from `parts.js` (tests); Task 2's `geometry/hardware.js` exports.
- Produces:
  - `BODY: Record<positionId, (mat) => THREE.Object3D[]>` — one builder per position of assemblies 6, 8, 9, 10, 11, 12, 13 (92 builders), same contract as `ENGINE`.
  - `BAR_ORIGIN = [-2.5, 4, 9.8]` — where the bar's root end sits; the bar piece (`BODY.B74(mat)[0]`) is placed there, so a child added at local `(20, 0, 0.26)` lands on the bar's outer face (used by `model.js` for the wordmark).
  - `STARTER_BADGE_SPOT = [-3.5, 10, -13.45]` — a point on the starter cover's outer face (used by `model.js` for the `MF 34` badge).

- [ ] **Step 1: Write the failing test**

Create `$POC/tests/geometry-body.test.mjs`:
```js
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd "$POC" && node --test tests/geometry-body.test.mjs`
Expected: FAIL — `Cannot find module '.../geometry/body.js'`.

- [ ] **Step 3: Write the implementation**

Create `$POC/geometry/body.js`:
```js
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
const REAR_SCREWS = [[-17, 0], [-21, 0], [-25, 0], [-29, 1], [-32, 4], [-17, 9], [-21, 10], [-26, 10], [-30, 8]];

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
  B67: (mat) => [hose(mat, 'otel', [[3.4, 7.8, 8.4], [5, 9.6, 9.2], [6.2, 11, 9.8]], 0.12)],
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
  B49: (mat) => [...REAR_SCREWS, [-33, 3]]
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd "$POC" && node --test tests/geometry-body.test.mjs`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit** (only if inside a git repository)

```bash
cd "$POC" && git add geometry/body.js tests/geometry-body.test.mjs && git commit -m "feat(mf34): body geometry, 92 positions"
```

---
### Task 5: Model — assemble 169 positions, anchors, explode layout

**Files:**
- Modify (replace whole file): `$POC/model.js`
- Modify (replace whole file): `$POC/tests/model-math.test.mjs`
- Modify (replace whole file): `$POC/tests/model-build.test.mjs`

**Interfaces:**
- Consumes: `ASSEMBLIES`, `POSITIONS` (Task 1); `ENGINE` (Task 3); `BODY`, `STARTER_BADGE_SPOT` (Task 4; the bar piece from `BODY.B74` is already at `BAR_ORIGIN`, so the wordmark goes at local `(20, 0, 0.26)`); `stadiumPoints` (Task 2).
- Produces (from `model.js`):
  - `ASSEMBLY_DIRS: Record<1..13, [x, y, z]>`, `GRID_GAP: number` (cm between parts in the exploded grid), `ACCESSORIES: Set<string>` (`B75`).
  - `easeInOutCubic(x)`, `stepToward(current, target, dt, duration)` — unchanged.
  - `explodeOffset(dir: number[3], spread: number[3], t: number, k: number) → { x, y, z }` — **new signature**: `dir·t + spread·t·k`, with −0 normalised to 0.
  - `gridLayout(sizes: {w, h}[], gap: number, columns = ceil(√(1.6·n))) → {x, y}[]` — cell centres, row-major, rows going down, grid centred on 0.
  - `stadiumPoints` — re-exported from `geometry/hardware.js`.
  - `buildChainsaw(palette, { labels }?) → { root, core, assemblies: Map<number, Group>, parts: Map<id, Group> }`. Each part: `name === id`; direct children = its pieces (exactly `qty`); `userData` = `{ partId, basePosition, anchor: Vector3 (on the first piece's surface), dir: number[3], spread: number[3], accessory: boolean }`. `core` holds no positions.

- [ ] **Step 1: Write the failing tests**

Replace `$POC/tests/model-math.test.mjs` with:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ASSEMBLY_DIRS, easeInOutCubic, stepToward, explodeOffset, gridLayout, stadiumPoints } from '../model.js';

const close = (a, b, eps = 1e-9) => Math.abs(a - b) < eps;

test('o direcție nenulă pentru fiecare din cele 13 ansambluri', () => {
  assert.deepEqual(Object.keys(ASSEMBLY_DIRS).map(Number), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
  for (const d of Object.values(ASSEMBLY_DIRS)) assert.ok(d.length === 3 && Math.hypot(...d) > 5);
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

test('stepToward avansează, nu depășește și se întoarce fără salt', () => {
  assert.ok(close(stepToward(0, 1, 0.3, 1.2), 0.25));
  assert.equal(stepToward(0.9, 1, 0.5, 1), 1);
  assert.equal(stepToward(0.1, 0, 0.5, 1), 0);
  assert.ok(close(stepToward(0.4, 0, 0.1, 1), 0.3));
});

test('explodeOffset: zero exact la t = 0, fără −0', () => {
  const o = explodeOffset([0, -12, -16], [-3, -4, -5], 0, 1);
  assert.deepEqual(o, { x: 0, y: 0, z: 0 });
  assert.ok(!Object.is(o.y, -0) && !Object.is(o.z, -0));
});

test('explodeOffset: direcția la t = 1; plus răspândirea când ansamblul e activ', () => {
  assert.deepEqual(explodeOffset([1, 2, 3], [10, 20, 30], 1, 0), { x: 1, y: 2, z: 3 });
  assert.deepEqual(explodeOffset([1, 2, 3], [10, 20, 30], 1, 1), { x: 11, y: 22, z: 33 });
  const half = explodeOffset([2, 0, 0], [8, 0, 0], 0.5, 0.5);
  assert.ok(close(half.x, 1 + 2));
});

test('gridLayout: rânduri în ordine, fără suprapuneri, cu distanța cerută', () => {
  const sizes = [{ w: 2, h: 1 }, { w: 1, h: 3 }, { w: 4, h: 2 }, { w: 1, h: 1 }, { w: 3, h: 1 }];
  const cells = gridLayout(sizes, 1, 3);
  assert.ok(cells[0].y === cells[1].y && cells[1].y === cells[2].y && cells[3].y < cells[0].y);
  assert.ok(cells[0].x < cells[1].x && cells[1].x < cells[2].x && cells[3].x < cells[4].x);
  for (let i = 0; i < cells.length; i++) {
    for (let j = i + 1; j < cells.length; j++) {
      const sepX = Math.abs(cells[i].x - cells[j].x) >= (sizes[i].w + sizes[j].w) / 2 + 1 - 1e-9;
      const sepY = Math.abs(cells[i].y - cells[j].y) >= (sizes[i].h + sizes[j].h) / 2 + 1 - 1e-9;
      assert.ok(sepX || sepY, `${i}/${j}`);
    }
  }
});

test('gridLayout: centrat; coloane implicite ≈ √(1,6·n)', () => {
  const cells = gridLayout(Array(6).fill({ w: 2, h: 1 }), 1, 3);
  const xs = cells.map((c) => c.x);
  const ys = cells.map((c) => c.y);
  assert.ok(close(Math.min(...xs) + Math.max(...xs), 0) && close(Math.min(...ys) + Math.max(...ys), 0));
  const auto = gridLayout(Array(23).fill({ w: 1, h: 1 }), 1);
  assert.equal(new Set(auto.map((c) => c.x)).size, 7);
});

test('stadiumPoints e disponibil și din model.js', () => {
  assert.equal(stadiumPoints(40, 2.5, 2.9, 64).length, 64);
});
```

Replace `$POC/tests/model-build.test.mjs` with:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { ASSEMBLIES, POSITIONS } from '../parts.js';
import { buildChainsaw, explodeOffset, GRID_GAP } from '../model.js';

// Aceleași valori ca variabilele din styles.css; în browser se citesc din CSS.
const PALETTE = {
  gri: '#53565A', portocaliu: '#FF824B', alb: '#FFFFFF', panou: '#F2F2F3',
  g1: '#757A80', g2: '#909499', g3: '#ABAEB3', g4: '#C4C7CC', g5: '#DFE1E6', g6: '#EBEDF0',
};

const saw = buildChainsaw(PALETTE);
const boxOf = (o) => new THREE.Box3().setFromObject(o);

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

test('fiecare ancoră de marker e pe suprafața piesei ei', () => {
  for (const [id, obj] of saw.parts) {
    const anchor = obj.userData.anchor;
    assert.ok(anchor?.isVector3, `${id} nu are ancoră`);
    const world = obj.localToWorld(anchor.clone());
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
      const o = explodeOffset(obj.userData.dir, obj.userData.spread, 1, 1);
      return { id: p.id, b: boxOf(obj).translate(new THREE.Vector3(o.x, o.y, o.z)) };
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd "$POC" && node --test tests/model-math.test.mjs tests/model-build.test.mjs`
Expected: FAIL — `does not provide an export named 'gridLayout'` (and the old `model.js` still uses the 20 old ids).

- [ ] **Step 3: Write the implementation**

Replace `$POC/model.js` with:
```js
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
export const GRID_GAP = 4;

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

// Markerul stă pe suprafața primei piese: se caută de sus, apoi din față (+Z), apoi din dreapta.
const ray = new THREE.Raycaster();
function findAnchor(obj) {
  const first = obj.children[0];
  const box = new THREE.Box3().setFromObject(first);
  const c = box.getCenter(new THREE.Vector3());
  const tries = [
    [new THREE.Vector3(c.x, box.max.y + 1, c.z), new THREE.Vector3(0, -1, 0)],
    [new THREE.Vector3(c.x, c.y, box.max.z + 1), new THREE.Vector3(0, 0, -1)],
    [new THREE.Vector3(box.max.x + 1, c.y, c.z), new THREE.Vector3(-1, 0, 0)],
  ];
  for (const [origin, direction] of tries) {
    ray.set(origin, direction);
    const hit = ray.intersectObject(first, true)[0];
    if (hit) return obj.worldToLocal(hit.point.clone());
  }
  return obj.worldToLocal(new THREE.Vector3(c.x, box.max.y, c.z));
}

// Explodarea: fiecare ansamblu pleacă pe direcția lui; piesele ansamblului activ se așază
// într-o grilă (rând cu rând, în ordinea de pe foaie), într-un plan paralel cu XY.
function layoutExplode(parts) {
  for (const a of ASSEMBLIES) {
    const objs = a.positions.map((p) => parts.get(p.id));
    const boxes = objs.map((o) => new THREE.Box3().setFromObject(o));
    const all = boxes.reduce((acc, b) => acc.union(b), new THREE.Box3());
    const C = all.getCenter(new THREE.Vector3());
    const cells = gridLayout(boxes.map((b) => {
      const s = b.getSize(new THREE.Vector3());
      return { w: s.x, h: s.y };
    }), GRID_GAP);
    objs.forEach((o, i) => {
      const P = boxes[i].getCenter(new THREE.Vector3());
      o.userData.dir = ASSEMBLY_DIRS[a.id];
      o.userData.spread = [C.x + cells[i].x - P.x, C.y + cells[i].y - P.y, C.z - P.z];
    });
  }
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
    for (const piece of build(mat)) obj.add(piece);
    obj.userData.partId = p.id;
    obj.userData.basePosition = obj.position.clone();
    obj.userData.accessory = ACCESSORIES.has(p.id);
    assemblies.get(p.assemblyId).add(obj);
    parts.set(p.id, obj);
  }

  if (labels) decorate(parts, palette);
  root.updateMatrixWorld(true);
  for (const obj of parts.values()) obj.userData.anchor = findAnchor(obj);
  layoutExplode(parts);
  return { root, core, assemblies, parts };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd "$POC" && npm test`
Expected: all unit suites PASS (parts, no-factory-name, hardware, geometry-engine, geometry-body, model-math, model-build).

If `fiecare ancoră de marker e pe suprafața piesei ei` fails for a few ids, the cause is a raycast hitting a deep concave spot; give that builder's first piece a shape where the top-centre ray lands on an outer face (for example, put a solid sub-mesh first in the piece's group), and record a ruling. Do not loosen the 0.6 cm threshold.

- [ ] **Step 5: Commit** (only if inside a git repository)

```bash
cd "$POC" && git add model.js tests/model-math.test.mjs tests/model-build.test.mjs && git commit -m "feat(mf34): assemble 169 positions with anchors and grid explode"
```

---
### Task 6: Page — ids, quantities, notice, wiring to the new model

**Files:**
- Modify: `$POC/ui.js` (function `row`)
- Modify: `$POC/app.js` (explode call, marker labels, accessory visibility, debug API)
- Modify: `$POC/styles.css` (marker pill, list row columns)
- Modify: `$POC/index.html` (notice text)
- Modify (replace whole file): `$POC/tests/e2e/shell.check.mjs`

**Interfaces:**
- Consumes: Task 1 data (`p.id`, `p.name`, `p.qty`, `p.wear`); Task 5 model (`explodeOffset(dir, spread, t, k)`, `userData.dir`, `userData.spread`, `userData.accessory`).
- Produces:
  - List row: `<button class="rand" data-id="A12">` with `.poz` (the id), `.nume`, `.meta`, optional `.uzura`, and `.buc` (`buc. N`).
  - Marker: `<button class="marker" data-id="A12"><span class="cerc">A12</span></button>`, `aria-label="Poziția A12: Piuliță M5"`.
  - `window.__mf34.partVisible(id) → boolean` (added to the existing debug API).

- [ ] **Step 1: Write the failing checks**

Replace `$POC/tests/e2e/shell.check.mjs` with:
```js
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ASSEMBLIES } from '../../parts.js';

const done = (page) => page.context().close();

export async function pageLoadsWithContent(ctx) {
  const page = await ctx.newPage();
  await ctx.openReady(page);
  assert.equal(await page.innerText('h1'), 'PIESE MF 34');
  assert.equal(await page.textContent('[data-model-name]'), 'Motoferăstrău O’MAC MF 34');
  assert.equal(await page.textContent('[data-count]'), '13 ansambluri · 169 poziții');
  assert.match(await page.textContent('.nota'), /lista de piese a fabricantului, traduse provizoriu/);
  const options = await page.$$eval('#assembly option', (os) => os.map((o) => o.textContent));
  assert.equal(options.length, 13);
  assert.equal(options[0], '1 · Cilindru și piston (9)');
  assert.equal(options[6], '7 · Ambreiaj și pompă de ulei (23)');
  assert.equal(await page.locator('#parts .rand').count(), 9);
  assert.equal(await page.textContent('.rand[data-id="A5"] .poz'), 'A5');
  assert.equal(await page.textContent('.rand[data-id="A5"] .meta'), 'cod: [.....] · denumire tradusă, de verificat');
  assert.equal(await page.textContent('.rand[data-id="A7"] .buc'), 'buc. 4');
  assert.match(await page.textContent('.rand[data-id="A6"]'), /uzură \(propunere\)/);
  assert.equal(await page.textContent('#explode'), 'Vezi piesele');
  assert.deepEqual(page.errors, []);
  await done(page);
}

export async function switchingAssemblyRendersItsRows(ctx) {
  const page = await ctx.newPage();
  await ctx.openReady(page);
  await page.selectOption('#assembly', '3');
  const ids = await page.$$eval('#parts .rand', (rs) => rs.map((r) => r.dataset.id));
  assert.deepEqual(ids, ASSEMBLIES[2].positions.map((p) => p.id));
  await done(page);
}

export async function allRowNamesMatchData(ctx) {
  const page = await ctx.newPage();
  await ctx.openReady(page);
  for (const a of ASSEMBLIES) {
    await page.selectOption('#assembly', String(a.id));
    const rows = await page.$$eval('#parts .rand', (rs) => rs.map((r) => ({
      id: r.dataset.id, name: r.querySelector('.nume').textContent, qty: r.querySelector('.buc').textContent,
    })));
    assert.deepEqual(rows, a.positions.map((p) => ({ id: p.id, name: p.name, qty: `buc. ${p.qty}` })), `ansamblul ${a.id}`);
  }
  await done(page);
}

export async function noForbiddenText(ctx) {
  const page = await ctx.newPage();
  await ctx.openReady(page);
  const factory = ['TT', '4303'].join('');
  for (const a of ASSEMBLIES) {
    await page.selectOption('#assembly', String(a.id));
    const text = await page.innerText('body');
    const html = await page.content();
    assert.ok(!text.includes(factory) && !html.includes(factory), `denumirea de fabrică apare (ansamblul ${a.id})`);
    assert.ok(!/Pădure|Grădină/.test(text));
    assert.ok(!text.includes('®'));
    assert.ok(!/Smart LINE|MaxX|Power LINE|ProX/.test(text));
  }
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

- [ ] **Step 2: Run the checks to verify they fail**

Run: `cd "$POC" && npm run e2e`
Expected: `shell.check.mjs` checks FAIL — the page doesn't become ready (`app.js` still calls `explodeOffset` with the old signature and labels markers with `p.pos`), or the count reads the old value. Viewer/review checks also fail; Task 7 updates them.

- [ ] **Step 3: Write the implementation**

In `$POC/index.html`, replace:
```html
    <p class="nota"><strong>Proof of concept.</strong> Denumirile pieselor provin din manualul de utilizare; codurile și prețurile nu sunt încă disponibile.</p>
```
with:
```html
    <p class="nota"><strong>Proof of concept.</strong> Denumirile pieselor provin din lista de piese a fabricantului, traduse provizoriu; codurile și prețurile nu sunt încă disponibile.</p>
```

In `$POC/ui.js`, replace the whole `row` function with:
```js
function row(p) {
  const button = el('button', null, 'rand');
  button.type = 'button';
  button.dataset.id = p.id;
  button.setAttribute('aria-pressed', 'false');

  const info = el('span', null, 'info');
  info.append(el('span', p.name, 'nume'), el('span', 'cod: [.....] · denumire tradusă, de verificat', 'meta'));
  if (p.wear) {
    const wear = el('span', null, 'uzura');
    const symbol = el('span', '▲ ');
    symbol.setAttribute('aria-hidden', 'true');
    wear.append(symbol, 'uzură (propunere)');
    info.append(wear);
  }
  button.append(el('span', p.id, 'poz'), info, el('span', `buc. ${p.qty}`, 'buc'));

  const li = el('li');
  li.append(button);
  return li;
}
```

In `$POC/app.js`:

1. Replace:
```js
      const o = explodeOffset(id, eased, spreadFor(id));
```
with:
```js
      const o = explodeOffset(obj.userData.dir, obj.userData.spread, eased, spreadFor(id));
```

2. Replace:
```js
    button.setAttribute('aria-label', `Poziția ${p.pos}: ${p.name}`);
    const circle = document.createElement('span');
    circle.className = 'cerc';
    circle.textContent = String(p.pos);
```
with:
```js
    button.setAttribute('aria-label', `Poziția ${p.id}: ${p.name}`);
    const circle = document.createElement('span');
    circle.className = 'cerc';
    circle.textContent = p.id;
```

3. Replace:
```js
  const spreadNow = (id) => state.spread.get(ASSEMBLY_OF.get(id));
```
with:
```js
  const spreadNow = (id) => state.spread.get(ASSEMBLY_OF.get(id));
  // Accesoriile (teaca șinei) nu stau pe utilaj: apar doar explodat, cu ansamblul lor activ.
  const accessories = [...saw.parts].filter(([, o]) => o.userData.accessory).map(([id]) => id);
```

4. Replace:
```js
    for (const m of coreMaterials) setOpacity(m, 1 - 0.82 * eased);
```
with:
```js
    for (const m of coreMaterials) setOpacity(m, 1 - 0.82 * eased);
    for (const id of accessories) saw.parts.get(id).visible = eased > 0.01 && spreadNow(id) > 0.5;
```

5. Replace:
```js
    visibleMarkerIds: () => [...markers].filter(([, label]) => label.visible).map(([id]) => id),
```
with:
```js
    visibleMarkerIds: () => [...markers].filter(([, label]) => label.visible).map(([id]) => id),
    partVisible: (id) => saw.parts.get(id).visible,
```

6. Replace:
```js
  modelFill: () => viewer?.modelFill() ?? null,
```
with:
```js
  modelFill: () => viewer?.modelFill() ?? null,
  partVisible: (id) => viewer?.partVisible(id) ?? false,
```

In `$POC/styles.css`:

1. Replace:
```css
.marker .cerc {
  display: grid;
  place-items: center;
  width: var(--t26);
  height: var(--t26);
  border-radius: 50%;
  background: var(--c-alb);
  border: calc(var(--linie) * 2) solid var(--c-portocaliu);
}
```
with:
```css
/* Etichete de 2–3 caractere (A5, B48): pastilă care se lărgește după text. */
.marker .cerc {
  display: grid;
  place-items: center;
  min-width: var(--t26);
  height: var(--t26);
  padding: 0 var(--t7);
  border-radius: var(--t15);
  font-size: var(--t12);
  white-space: nowrap;
  background: var(--c-alb);
  border: calc(var(--linie) * 2) solid var(--c-portocaliu);
}
```

2. Replace:
```css
  grid-template-columns: var(--t38) minmax(0, 1fr);
```
(inside `.rand`) with:
```css
  grid-template-columns: var(--t46) minmax(0, 1fr) max-content;
```

3. Replace:
```css
.poz {
  font-family: var(--f-titlu);
  font-stretch: condensed;
  font-weight: 700;
  font-size: var(--t22);
  line-height: var(--lh-titlu);
}
```
with:
```css
.poz {
  font-family: var(--f-titlu);
  font-stretch: condensed;
  font-weight: 700;
  font-size: var(--t18);
  line-height: var(--lh-titlu);
}

/* Cantitatea: cifră în coloană, aliniată la dreapta. */
.buc {
  text-align: right;
  font-weight: 700;
  white-space: nowrap;
}
```

- [ ] **Step 4: Run the checks to verify they pass**

Run: `cd "$POC" && npm test && npm run e2e`
Expected: unit tests PASS; every check in `shell.check.mjs` prints `ok`. (`viewer.check.mjs` and `review.check.mjs` may still fail on the old 20 ids; Task 7 replaces them.)

- [ ] **Step 5: Commit** (only if inside a git repository)

```bash
cd "$POC" && git add ui.js app.js styles.css index.html tests/e2e/shell.check.mjs && git commit -m "feat(mf34): page shows factory ids, quantities and translation note"
```

---
### Task 7: Browser checks for all 13 assemblies

**Files:**
- Modify (replace whole file): `$POC/tests/e2e/viewer.check.mjs`
- Modify (replace whole file): `$POC/tests/e2e/review.check.mjs`
- Modify (only if a check fails on layout): `$POC/model.js` (`GRID_GAP`, `ASSEMBLY_DIRS`)

**Interfaces:**
- Consumes: `ASSEMBLIES`, `POSITIONS` (Task 1); the debug API `window.__mf34` (`state`, `isAnimating`, `partPositions`, `highlightedId`, `visibleMarkerIds`, `screenPoint`, `modelFill`, `partVisible`); helpers `settle`, `done`, `pixelAt` from `tests/e2e/helpers.mjs`.
- Produces: screenshots `screenshots/desktop-asamblat.png`, `desktop-explodat.png`, `mobil-explodat.png`, and `ansamblu-1.png` … `ansamblu-13.png` (viewer only), used by Task 8.

- [ ] **Step 1: Write the checks**

Replace `$POC/tests/e2e/viewer.check.mjs` with:
```js
import assert from 'node:assert/strict';
import { ASSEMBLIES } from '../../parts.js';
import { settle, done, pixelAt } from './helpers.mjs';

const state = (page) => page.evaluate(() => window.__mf34.state());
const positions = (page) => page.evaluate(() => window.__mf34.partPositions());
const visibleMarkers = (page) => page.evaluate(() => window.__mf34.visibleMarkerIds());
const idsOf = (a) => a.positions.map((p) => p.id);

export async function explodeAndReassembleRoundTrip(ctx) {
  const page = await ctx.newPage();
  await ctx.openReady(page);
  await settle(page);
  const start = await positions(page);
  assert.equal(Object.keys(start).length, 169);
  await page.screenshot({ path: `${ctx.shotsDir}/desktop-asamblat.png` });

  await page.click('#explode');
  await settle(page);
  const s = await state(page);
  assert.equal(s.exploded, true);
  assert.equal(s.progress, 1);
  assert.equal(await page.textContent('#explode'), 'Asamblează');
  const moved = await positions(page);
  for (const id of Object.keys(start)) assert.notDeepEqual(moved[id], start[id], `${id} nu s-a mișcat`);
  assert.deepEqual(await visibleMarkers(page), idsOf(ASSEMBLIES[0]));
  await page.screenshot({ path: `${ctx.shotsDir}/desktop-explodat.png` });

  await page.click('#explode');
  await settle(page);
  assert.deepEqual(await positions(page), start);
  assert.deepEqual(await visibleMarkers(page), []);
  assert.deepEqual(page.errors, []);
  await done(page);
}

export async function rapidDoubleToggleReversesSmoothly(ctx) {
  const page = await ctx.newPage();
  await ctx.openReady(page);
  await settle(page);
  const start = await positions(page);
  await page.click('#explode');
  await page.waitForFunction(() => window.__mf34.state().progress > 0.2, null, { timeout: 5000 });
  await page.click('#explode');
  const before = (await state(page)).progress;
  assert.ok(before > 0 && before < 1, `progres la mijloc: ${before}`);
  await page.waitForFunction((b) => window.__mf34.state().progress < b, before, { timeout: 5000 });
  assert.ok((await state(page)).progress > 0, 'a sărit direct la capăt');
  await settle(page);
  assert.equal((await state(page)).progress, 0);
  assert.deepEqual(await positions(page), start);
  await done(page);
}

export async function markersLinkBothWaysForAll169(ctx) {
  const page = await ctx.newPage();
  await ctx.openReady(page);
  await page.click('#explode');
  await settle(page);
  let checked = 0;
  for (const a of ASSEMBLIES) {
    await page.selectOption('#assembly', String(a.id));
    await settle(page);
    assert.deepEqual(await visibleMarkers(page), idsOf(a), `markeri pentru ansamblul ${a.id}`);
    await page.mouse.move(0, 0);
    await page.locator('#viewer').screenshot({ path: `${ctx.shotsDir}/ansamblu-${a.id}.png` });
    for (const id of idsOf(a)) {
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
  }
  assert.equal(checked, 169);
  assert.deepEqual(page.errors, []);
  await done(page);
}

export async function switchingAssemblyClearsSelection(ctx) {
  const page = await ctx.newPage();
  await ctx.openReady(page);
  await page.click('#explode');
  await settle(page);
  await page.locator('.marker[data-id="A6"]').dispatchEvent('click');
  assert.equal((await state(page)).selected, 'A6');
  await page.mouse.move(0, 0);
  await page.selectOption('#assembly', '12');
  assert.equal((await state(page)).selected, null);
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
  await page.selectOption('#assembly', '12');
  assert.equal(await page.locator('#parts .rand').count(), 11);
  await page.click('.rand[data-id="B73"]');
  assert.equal(await page.getAttribute('.rand[data-id="B73"]', 'aria-pressed'), 'true');
  // Three.js scrie singur o eroare în consolă când nu poate crea contextul WebGL.
  assert.deepEqual(page.errors.filter((e) => !/WebGL/i.test(e)), []);
  await done(page);
}

export async function inactiveAssembliesRenderFaded(ctx) {
  const page = await ctx.newPage();
  await ctx.openReady(page);
  await page.click('#explode');
  await settle(page);
  await page.mouse.move(0, 0);
  await page.locator('#viewer').scrollIntoViewIfNeeded();
  // Capacul motorului (B6, ansamblul 6) e inactiv cât timp e activ ansamblul 1.
  const { x, y } = await page.evaluate(() => window.__mf34.screenPoint('B6'));
  const brightness = await pixelAt(page, x, y);
  assert.ok(brightness > 170, `capacul nu e estompat: luminozitate ${brightness}`);
  await done(page);
}
```

Replace `$POC/tests/e2e/review.check.mjs` with:
```js
// Verificări din recenziile anterioare și din „Review Focus" al planului.
import assert from 'node:assert/strict';
import { ASSEMBLIES } from '../../parts.js';
import { settle, done } from './helpers.mjs';

export async function loadsWithoutExternalRequests(ctx) {
  const page = await ctx.newPage();
  const external = [];
  page.on('request', (r) => { if (!r.url().startsWith(ctx.baseUrl)) external.push(r.url()); });
  await ctx.openReady(page);
  await settle(page);
  assert.deepEqual(external, [], 'pagina trebuie să meargă fără internet');
  await done(page);
}

export async function slowLoadDoesNotLeaveFalseBanner(ctx) {
  const page = await ctx.newPage();
  await page.route('**/three.module.js', async (route) => {
    await new Promise((r) => setTimeout(r, 8000));
    await route.continue();
  });
  await page.goto(ctx.baseUrl);
  await page.waitForFunction(() => window.__mf34?.ready === true, null, { timeout: 30000 });
  assert.equal(await page.isVisible('#boot-error'), false, 'mesajul de eroare rămâne după încărcare');
  await done(page);
}

async function markerBoxes(page) {
  const ids = await page.evaluate(() => window.__mf34.visibleMarkerIds());
  const out = [];
  for (const id of ids) out.push({ id, b: await page.locator(`.marker[data-id="${id}"]`).boundingBox() });
  return out;
}

export async function markersAreSpacedApart(ctx) {
  const page = await ctx.newPage();
  await ctx.openReady(page);
  await page.click('#explode');
  await settle(page);
  for (const a of ASSEMBLIES) {
    await page.selectOption('#assembly', String(a.id));
    await settle(page);
    const centers = (await markerBoxes(page)).map(({ id, b }) => ({ id, x: b.x + b.width / 2, y: b.y + b.height / 2 }));
    for (let i = 0; i < centers.length; i++) {
      for (let j = i + 1; j < centers.length; j++) {
        const d = Math.hypot(centers[i].x - centers[j].x, centers[i].y - centers[j].y);
        assert.ok(d >= 46, `ansamblul ${a.id}: ${centers[i].id} și ${centers[j].id} sunt la ${Math.round(d)} px`);
      }
    }
  }
  await done(page);
}

export async function activeMarkersInsideViewer(ctx) {
  const page = await ctx.newPage();
  await ctx.openReady(page);
  await page.click('#explode');
  await settle(page);
  for (const a of ASSEMBLIES) {
    await page.selectOption('#assembly', String(a.id));
    await settle(page);
    await page.locator('#viewer').scrollIntoViewIfNeeded();
    const v = await page.locator('#viewer').boundingBox();
    for (const { id, b } of await markerBoxes(page)) {
      const cx = b.x + b.width / 2;
      const cy = b.y + b.height / 2;
      assert.ok(cx >= v.x && cx <= v.x + v.width && cy >= v.y && cy <= v.y + v.height, `ansamblul ${a.id}: ${id} iese din cadru`);
    }
  }
  await done(page);
}

export async function markerLabelsFit(ctx) {
  const page = await ctx.newPage({ viewport: { width: 390, height: 844 } });
  await ctx.openReady(page);
  await page.click('#explode');
  for (const a of [ASSEMBLIES[6], ASSEMBLIES[9]]) {
    await page.selectOption('#assembly', String(a.id));
    await settle(page);
    const overflow = await page.$$eval('.marker .cerc', (els) => els
      .filter((e) => e.offsetParent !== null && e.scrollWidth > e.clientWidth)
      .map((e) => e.textContent));
    assert.deepEqual(overflow, [], `ansamblul ${a.id}`);
  }
  await done(page);
}

export async function scabbardOnlyWithItsAssembly(ctx) {
  const page = await ctx.newPage();
  await ctx.openReady(page);
  const visible = () => page.evaluate(() => window.__mf34.partVisible('B75'));
  await settle(page);
  assert.equal(await visible(), false, 'teaca e vizibilă pe utilajul asamblat');
  await page.click('#explode');
  await settle(page);
  assert.equal(await visible(), false, 'teaca e vizibilă cu alt ansamblu activ');
  await page.selectOption('#assembly', '12');
  await settle(page);
  assert.equal(await visible(), true, 'teaca lipsește din ansamblul ei');
  await page.click('#explode');
  await settle(page);
  assert.equal(await visible(), false, 'teaca rămâne după asamblare');
  await done(page);
}

export async function secondaryTextMeetsAA(ctx) {
  const page = await ctx.newPage();
  await ctx.openReady(page);
  const results = await page.evaluate(() => {
    const lum = (rgb) => {
      const [r, g, b] = rgb.match(/\d+/g).slice(0, 3).map(Number).map((v) => {
        const c = v / 255;
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
    const hover = getComputedStyle(document.documentElement).getPropertyValue('--c-g6').trim();
    const toRgb = (hex) => `rgb(${parseInt(hex.slice(1, 3), 16)}, ${parseInt(hex.slice(3, 5), 16)}, ${parseInt(hex.slice(5, 7), 16)})`;
    return ['.breadcrumb li', '.fisa-specs dt', '.eticheta', '.meta', '.buc'].map((sel) => {
      const color = getComputedStyle(document.querySelector(sel)).color;
      return { sel, white: ratio(color, 'rgb(255, 255, 255)'), hover: ratio(color, toRgb(hover)) };
    });
  });
  for (const r of results) {
    assert.ok(r.white >= 4.5, `${r.sel} pe alb: ${r.white.toFixed(2)}:1`);
    assert.ok(r.hover >= 4.5, `${r.sel} pe rândul evidențiat: ${r.hover.toFixed(2)}:1`);
  }
  await done(page);
}

export async function focusRingIsNotClipped(ctx) {
  const page = await ctx.newPage();
  await ctx.openReady(page);
  await page.focus('.rand[data-id="A5"]');
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  const fits = await page.evaluate(() => {
    const el = document.activeElement;
    const s = getComputedStyle(el);
    const grow = parseFloat(s.outlineOffset) + parseFloat(s.outlineWidth);
    const r = el.getBoundingClientRect();
    const clip = el.closest('.lista').getBoundingClientRect();
    return el.matches('.rand') && r.left - grow >= clip.left && r.right + grow <= clip.right && r.top - grow >= clip.top;
  });
  assert.ok(fits, 'conturul de focus iese din zona vizibilă a listei');
  await done(page);
}

export async function reassembleClearsSelection(ctx) {
  const page = await ctx.newPage();
  await ctx.openReady(page);
  await page.click('#explode');
  await settle(page);
  await page.locator('.marker[data-id="A6"]').dispatchEvent('click');
  await page.click('#explode');
  await page.mouse.move(0, 0);
  await settle(page);
  assert.equal((await page.evaluate(() => window.__mf34.state())).selected, null);
  assert.equal(await page.evaluate(() => window.__mf34.highlightedId()), null);
  await done(page);
}
```

- [ ] **Step 2: Run the checks**

Run: `cd "$POC" && npm run e2e > /tmp/mf34-e2e.log 2>&1; grep -E -A2 "^FAIL|verificări" /tmp/mf34-e2e.log`
Expected: the checks that depend only on wiring pass. `markersAreSpacedApart` and `activeMarkersInsideViewer` are the ones most likely to fail on first run, because spacing depends on how much the camera has to zoom out to fit each grid.

- [ ] **Step 3: Tune the layout until every check passes**

For each failure, change only these constants in `$POC/model.js` and re-run `npm test && npm run e2e`:
- Markers closer than 46 px inside one assembly → raise `GRID_GAP` (try 5, then 6).
- A marker outside the viewer → that assembly's grid is clipped by the camera framing; reduce the assembly's `ASSEMBLY_DIRS` entry so its grid stays nearer the saw, or raise the `'assembly'` framing factor in `app.js` (`fit * (mode === 'assembly' ? 1.05 : 0.82)` → 1.15).
- Record each change as a ruling in the ledger (what failed, what you changed).

Expected after tuning: `npm test` PASS and `npm run e2e` prints "Toate verificările au trecut".

- [ ] **Step 4: Commit** (only if inside a git repository)

```bash
cd "$POC" && git add tests/e2e/viewer.check.mjs tests/e2e/review.check.mjs model.js app.js && git commit -m "test(mf34): browser checks for all 13 assemblies"
```

---
### Task 8: Visual review against the factory drawings, README, CLAUDE.md

**Files:**
- Modify: `$POC/README.md`
- Modify: `/Users/popescuandrei/Documents/Projects/omac/CLAUDE.md` (the MF 34 PoC bullet)
- Modify (only if the review finds a problem): `$POC/geometry/engine.js`, `$POC/geometry/body.js`, `$POC/model.js`

**Interfaces:**
- Consumes: `screenshots/ansamblu-1.png` … `ansamblu-13.png`, `desktop-asamblat.png` (Task 7); the two source sheets in `assets/`.
- Produces: documentation only, plus any geometry fixes the review needs.

- [ ] **Step 1: Render the sheets for comparison (outside the project)**

Run:
```bash
S=/tmp/mf34-sheets && mkdir -p $S && cd "$POC/assets" && pdftoppm -r 110 -png "A Explosive view.pdf" $S/A && pdftoppm -r 110 -png "B Explosive view.pdf" $S/B && ls $S
```
Expected: `A-1.png`, `B-1.png`. These stay in `/tmp`; they are never copied into the project.

- [ ] **Step 2: Compare**

View `screenshots/desktop-asamblat.png` next to `assets/motoferastrau_o_mac_mf_34__1__jpg.webp`, and each `screenshots/ansamblu-N.png` next to the matching region of the sheets (assemblies 1–5 and 7: sheet A; 6 and 8–13: sheet B). Check:
- assembled: the outside reads as the MF 34 — orange top cover, dark body and starter cover, wrap handle, slotted guard, rear handle with orange grip, bar and chain; no inner part pokes through the covers;
- each exploded assembly: every part is visible and recognisable for what its name says (bolt, spring, bearing, gasket…), and its marker sits on it;
- nothing from another assembly hides the active grid.

Fix any problem in the builder or in `ASSEMBLY_DIRS`, re-run `npm test && npm run e2e` (expect all green), and record the change as a ruling.

- [ ] **Step 3: Update the README**

In `$POC/README.md`, replace the first paragraph and the "Date" section with:
```markdown
# MF 34 — schemă explodată (proof of concept)

Pagină statică pentru oferta o-mac.ro: motoferăstrăul O’MAC MF 34 în 3D, cu toate cele 169 de poziții din lista de piese a fabricantului, în 13 ansambluri. Fiecare poziție are piesele ei (cantitatea de pe foaie), un marker cu numărul de poziție și un rând în listă, legate în ambele sensuri. Arată cum poate arăta modulul de piese de schimb din Faza 2.

## Date

- Pozițiile, denumirile originale și cantitățile: foile `assets/A Explosive view.pdf` (motor, A1–A94) și `assets/B Explosive view.pdf` (corp, B1–B75). Desenele nu se afișează pe pagină.
- Denumirile românești sunt traduceri de lucru, marcate „de verificat"; originalul englez e păstrat în `parts.js`.
- Sursele nu au coduri sau prețuri; pagina afișează `cod: [.....]` și nu inventează valori.
- Piesele de uzură sunt o propunere bazată pe capitolul de întreținere din manual; clasificarea o face O’MAC.
- Specificațiile din fișa utilajului vin din `assets/Manual de utilizare O'MAC MF 34 MF 38 MF 46.pdf`.
- Modelul 3D e construit în cod, din forme simple, după desene și fotografii: piesele standard (șuruburi, rulmenți, simeringuri, arcuri) au dimensiunile din denumire; carcasele sunt aproximări.
- Denumirea de fabrică de pe foi nu apare nicăieri în proiect (verificat de `tests/no-factory-name.test.mjs`).
```

And replace the "Fișiere" table with:
```markdown
| Fișier | Rol |
|---|---|
| `parts.js` | cele 169 de poziții și cele 13 ansambluri (singura sursă de date) |
| `geometry/hardware.js` | piese standard parametrice și ajutoare de geometrie |
| `geometry/engine.js` | pozițiile motorului (ansamblurile 1–5 și 7) |
| `geometry/body.js` | pozițiile corpului (ansamblurile 6 și 8–13) |
| `model.js` | asamblarea, materialele, ancorele markerilor și explodarea |
| `ui.js` | fișa utilajului, selectorul și lista |
| `app.js` | scena 3D, animația, markerii și selecția |
| `styles.css` | variabilele de brand și stilul paginii |
```

- [ ] **Step 4: Update CLAUDE.md**

In `/Users/popescuandrei/Documents/Projects/omac/CLAUDE.md`, replace the sentence:
```
All part data lives in `parts.js`, taken from the manual in `assets/`; never add codes or prices that aren't in the client's material.
```
with:
```
All part data (169 positions from the factory exploded-view sheets in `assets/`) lives in `parts.js`; geometry is in `geometry/` (one builder per position). Never add codes or prices that aren't in the client's material, and never write the factory model designation printed on those sheets anywhere in the project (`tests/no-factory-name.test.mjs` enforces it).
```

- [ ] **Step 5: Final run**

Run: `cd "$POC" && npm test && npm run e2e`
Expected: all unit suites PASS; "Toate verificările au trecut".

- [ ] **Step 6: Commit** (only if inside a git repository)

```bash
cd "$POC" && git add README.md geometry model.js && git commit -m "docs(mf34): README for the full schema; visual review fixes"
```
