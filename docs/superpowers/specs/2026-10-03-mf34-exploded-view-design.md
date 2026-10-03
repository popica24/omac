# MF 34 exploded-view proof of concept — design

Date: 2026-10-03 · Status: approved in conversation, awaiting written-spec review

## Purpose

A pitch piece for the o-mac.ro bid. It shows O'MAC that the Phase 2 spare-parts module (exploded diagram, `machine → assembly → position → part`) can be delivered as an interactive 3D view, using a real product they sell: the O'MAC MF 34 chainsaw.

Success: in a meeting, someone opens the page, presses one button, sees the chainsaw separate into named assemblies, and can click any numbered marker to find the part in the list (and the reverse). Nothing on the page states a fact that isn't in the client's material.

## Sources

All in `proof-of-concepts/threejs-renders/MOTOFERASTRAU O'MAC MF 34/assets/`:

- Five product photos (`*.webp`) — reference for shape and proportions; photo 1 is used as the model-card thumbnail.
- `Manual de utilizare O'MAC MF 34 MF 38 MF 46.pdf` — source of every part name and every spec value. Page references below are the printed page numbers.

The manual has **no** exploded diagram, parts list, part codes or quantities. It also uses the company's old name, which must not appear on the page.

## Content

### Real specs shown (manual p. 4, MF 34 column)

52 cc · 2.5 kW / 3.4 CP · bar 40 cm (15") · chain 64DL .325" .058" · fuel tank 0.55 L · chain-oil tank 260 ml · 5.0 kg net.

### Assemblies and positions

Position numbers restart at 1 inside each assembly, as in the client's exploded-diagram mockup. "Uzură" marks a proposed wear part (class A); the classification belongs to O'MAC, so the page labels it "propunere".

| Assembly | Pos. | Name (RO) | Manual p. | Uzură |
|---|---|---|---|---|
| 1 · Capac și filtru | 1 | Capacul cilindrului | 25 | |
| | 2 | Filtrul de aer | 24 | ✓ |
| 2 · Motor | 1 | Cilindru cu aripioare | 25 | |
| | 2 | Bujie | 26 | ✓ |
| | 3 | Demaror cu coardă de pornire | 17 | |
| 3 · Mânere și comenzi | 1 | Mâner spate cu manetă de accelerație | 4, 17 | |
| | 2 | Comutator pornire/oprire | 17 | |
| | 3 | Pârghie de șoc | 17 | |
| | 4 | Mâner față | 14 | |
| | 5 | Amortizoare față și spate | 26 | |
| 4 · Frână și protecție | 1 | Protecția mâinii / frâna de lanț | 14 | |
| | 2 | Capac protecție lanț | 14 | |
| | 3 | Piulița de tensionare | 14 | |
| | 4 | Gheara | 14 | |
| 5 · Șină și lanț | 1 | Șina de ghidaj 40 cm | 4, 14 | ✓ |
| | 2 | Lanț 64DL .325" .058" | 4, 14 | ✓ |
| | 3 | Pinion | 26 | ✓ |
| 6 · Rezervoare | 1 | Rezervor combustibil cu bușon | 17 | |
| | 2 | Filtru de carburant | 25 | ✓ |
| | 3 | Rezervor ulei de lanț cu bușon | 17, 25 | |

6 assemblies · 20 positions.

### Missing data

Every row shows `cod: [.....]` for the part code. Quantity and price aren't shown at all. No value is invented.

## Page

URL shown in the breadcrumb: `/piese/motoferastraie/mf-34` (a label only; the PoC is a single static page).

Top to bottom:

1. **Header strip** — breadcrumb `Acasă / Piese de schimb / Piese motoferăstraie / Motoferăstrău O'MAC MF 34`, title `PIESE MF 34`, one-line instruction.
2. **Model card** — photo 1, model name, the real specs above, `6 ansambluri · 20 poziții`.
3. **Notice bar** (orange left edge) — "Proof of concept. Denumirile pieselor provin din manualul de utilizare; codurile și prețurile nu sunt încă disponibile."
4. **Workspace** — 3D canvas left (~60%), right column with assembly selector, explode button and parts list. Below 900 px the canvas stacks above the list.

Parts list row: position number, name, `cod: [.....]`, manual page, and the wear marker (symbol + the word "uzură") where it applies.

## 3D model

- Built in code from primitives; no external model file. Proportions from the photos, scaled so the whole saw is ~80 cm with the 40 cm bar.
- Main pieces: orange cover (extruded rounded outline with the two grip ridges); dark-gray engine body; cylinder fins as stacked thin plates, revealed when the cover lifts; front wrap handle as a tube along a curve; slotted hand guard; rear handle loop with orange grip strip and trigger; light-gray bar with the O'MAC wordmark (no ®); ~64 repeated chain links around the bar edge.
- Every position is its own named object, grouped by assembly; ids follow `a{assembly}-p{position}` (e.g. `a5-p2` for the chain).
- The body badge reads `MF 34` — not "BASIC" (as on the physical unit) and not a range name, since the MF 34's range isn't confirmed.
- Colors only from the brand palette: `#FF824B` cover and grips, `#53565A` body, secondary grays (`#757A80 … #EBEDF0`) for bar, metal and rubber. Material differences come from roughness/metalness and lighting, not extra hues.

## Interaction

- **Explode / reassemble** — one button (`Vezi piesele` ↔ `Asamblează`), ~1.2 s eased animation. Each assembly moves along its own direction: cover up, bar and chain forward, chain cover sideways, handles up/back, tanks down. Positions within the active assembly separate slightly. Camera reframes to fit.
- **Markers** — orange numbered circles as HTML labels anchored to points on the parts. Only the active assembly's markers are shown.
- **Two-way link** — click a marker → its row highlights and scrolls into view; hover or focus a row → its part brightens, others dim, its marker highlights.
- **Assembly selector** — dropdown `N · Name (count)`. Switching fades other assemblies, moves the camera to the chosen one and swaps the list.
- **Camera** — orbit by drag, zoom by wheel/pinch, with distance and angle limits.
- **Keyboard** — Tab through selector, button and rows; Enter selects a row; Esc clears the selection. Focus ring always visible.

## Brand and accessibility

- Fonts weren't supplied: headings use a heavy condensed system font stack, body uses Arial (the manual's allowed fallback). No Google Fonts.
- All text left-aligned; button labels centered.
- `color-scheme: light`; no `prefers-color-scheme` rules.
- Small orange text uses `#A8481F`.
- Brand values live as CSS variables at the top of `styles.css` (stand-in for the client's `brand.css`); no raw color or size values elsewhere.
- Touch targets ≥ 44 × 44 px. The wear state is a symbol plus a word, never color alone.
- No horizontal page scroll at 390 px.

## Files

In `proof-of-concepts/threejs-renders/MOTOFERASTRAU O'MAC MF 34/`:

| File | Responsibility |
|---|---|
| `index.html` | Page structure, import map for Three.js from a CDN |
| `styles.css` | Brand variables + page styles |
| `parts.js` | Assemblies and positions as plain data (the table above) |
| `model.js` | Builds the chainsaw meshes; returns a map `id → Object3D` and per-assembly groups |
| `app.js` | Scene, lights, camera/controls, explode animation, markers, selection, list rendering |
| `README.md` | What it is, data sources, how to run (`python3 -m http.server`) |

`parts.js` is the only place part data lives; `model.js` and `app.js` read it. Replacing it with real catalog data later must not require changing the other files.

## Verification

Serve locally and drive a browser to confirm:

- page loads with zero console errors;
- explode and reassemble both complete and return parts to their exact start positions;
- each of the 20 markers selects its row, and each row highlights its part;
- the assembly selector switches all six assemblies;
- full keyboard-only pass (Tab / Enter / Esc);
- at 390 px: canvas above list, no horizontal scroll.

Screenshots of the assembled and exploded states, compared against the photos and the client's mockup (visual guide p. 81–85).

## Out of scope

Real part codes, quantities, prices, stock, add-to-cart, other models (MF 38 / MF 46), the official logo and brand fonts, photo-realistic modeling.
