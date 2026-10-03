# MF 34 exploded view — full factory schema (169 positions) — design

Date: 2026-10-03 · Status: approved in conversation, awaiting written-spec review
Builds on: `2026-10-03-mf34-exploded-view-design.md` (the 20-position PoC, already built). Everything in that spec stays unless this one changes it.

## Purpose

Same pitch, more depth. Replace the 20 manual-derived positions with the full factory parts list for the MF 34 — 169 positions from two exploded-view sheets — and model every one of them in 3D with Three.js, so the explode shows the real parts and the real numbering. The drawings themselves are not shown on the page.

Success: every one of the 169 positions has a 3D object with its real quantity of pieces, a marker on it, and a row in the list; picking any of the 13 assemblies fans its parts out readably; nothing on the page states a fact that isn't in the client's material.

## Sources

In `proof-of-concepts/threejs-renders/MOTOFERASTRAU O'MAC MF 34/assets/`:

- `A Explosive view.pdf` — engine, positions A1–A94, with names and quantities.
- `B Explosive view.pdf` — chainsaw body, positions B1–B75, with names and quantities.
- The user manual and the five photos, as before (specs in the model card, wear-part reasoning, outside shapes).

Both sheets carry a factory model designation in their titles. **It must not appear anywhere** — not on the page, not in data files, not in code comments, not in test names. Files refer to the sources only as "A Explosive view" / "B Explosive view".

The sheets give position numbers, English names and quantities. They give **no part codes and no dimensions** beyond what the names state (e.g. "Bolt M5*20", "Bearing 6206", "Oil Seal Φ15×Φ35×5").

## Data

### Rules

- Position id = the factory position number: `A1`–`A94`, `B1`–`B75`. It is the marker label and the list's position column.
- Each position stores: `id`, `assemblyId` (1–13), Romanian name, original English name (data only, not shown), quantity, wear flag, `code: null`.
- Romanian names are working translations. The UI marks them "denumire tradusă, de verificat".
- Quantities are exactly as on the sheets. No codes, prices or stock.
- Wear flag (proposal, labelled "propunere" as before): A6, A14, A55, A66, A69, A75, B15, B36, B73, B74.

### Assemblies

| Id | Ansamblu | Positions | Count |
|---|---|---|---|
| 1 | Cilindru și piston | A5–A7, A13–A18 | 9 |
| 2 | Toba de eșapament | A8–A12 | 5 |
| 3 | Carter și arbore cotit | A19–A21, A28, A31–A43 | 17 |
| 4 | Aprindere și volant | A22–A24, A29, A30 | 5 |
| 5 | Admisie și carburator | A1–A4, A44–A53, A84–A87 | 18 |
| 6 | Filtru de aer și capace | A54–A56, B1, B2, B6, B9–B11 | 9 |
| 7 | Ambreiaj și pompă de ulei | A57–A79 | 23 |
| 8 | Frână de lanț și protecție | A80, A88–A94, B3, B5, B55, B56, B62–B64, B66–B72 | 22 |
| 9 | Demaror | B12–B24 | 13 |
| 10 | Mânere și comenzi | B4, B7, B8, B25, B26, B29, B30, B32–B35, B38–B42, B44–B47, B49 | 21 |
| 11 | Rezervoare | A25–A27, A81–A83, B31, B36, B37, B43, B52–B54 | 13 |
| 12 | Șină, lanț și întinzător | B27, B28, B57–B61, B65, B73–B75 | 11 |
| 13 | Trusă de scule | B48, B50, B51 | 3 |

13 assemblies · 169 positions; every position in exactly one assembly.

### Positions — sheet A (engine)

| Id | Original (EN) | Qty | Denumire (RO, de verificat) |
|---|---|---|---|
| A1 | Inner Guide | 1 | Ghidaj interior |
| A2 | Bolt M5*12 | 4 | Șurub M5×12 |
| A3 | Insulator | 1 | Izolator admisie |
| A4 | Gasket Insulator | 1 | Garnitură izolator |
| A5 | Cylinder | 1 | Cilindru |
| A6 | Spark Plug | 1 | Bujie |
| A7 | Bolt M5*20 | 4 | Șurub M5×20 |
| A8 | Square Screw M5*85 | 2 | Șurub M5×85 |
| A9 | Gasket Muffler | 1 | Garnitură tobă |
| A10 | Muffler | 1 | Tobă de eșapament |
| A11 | Muffler Cap | 1 | Capac tobă |
| A12 | Nut M5 | 1 | Piuliță M5 |
| A13 | Gasket Cylinder | 1 | Garnitură cilindru |
| A14 | Piston Ring | 2 | Segment piston |
| A15 | Piston | 1 | Piston |
| A16 | Snap Ring | 2 | Siguranță bolț piston |
| A17 | Piston Pin | 1 | Bolț piston |
| A18 | Needle Bearing 11*15*12.5 | 1 | Rulment cu ace 11×15×12,5 |
| A19 | Crankshaft | 1 | Arbore cotit |
| A20 | Washer | 2 | Șaibă |
| A21 | Key | 1 | Pană |
| A22 | Ignition Coil Cap | 1 | Capișon bujie |
| A23 | Ignition Coil | 1 | Bobină de aprindere |
| A24 | Bolt M5*18 | 2 | Șurub M5×18 |
| A25 | Oil palm | 1 | Sorb ulei |
| A26 | Gasket Oilcap O type | 1 | Garnitură O-ring bușon ulei |
| A27 | Oil Cap | 1 | Bușon ulei |
| A28 | Bolt M5*30 | 5 | Șurub M5×30 |
| A29 | Rotor | 1 | Volant magnetic |
| A30 | Nut M8-Fine thread | 1 | Piuliță M8 filet fin |
| A31 | Bolt M4*8 | 3 | Șurub M4×8 |
| A32 | Cover Oil Seal | 1 | Capac simering |
| A33 | Oil Seal Φ15×Φ35×5 | 1 | Simering 15×35×5 |
| A34 | Retainer Ring Ø35 | 1 | Inel de siguranță Ø35 |
| A35 | Bearing 6206 p6 | 2 | Rulment 6206 |
| A36 | Anti-vibration Left Crankcase | 3 | Amortizor antivibrații carter stânga |
| A37 | Left Crankcase | 1 | Carter stânga |
| A38 | Left double nail shock absorption | 1 | Amortizor dublu stânga |
| A39 | Gasket crankcase | 1 | Garnitură carter |
| A40 | Pin | 3 | Știft |
| A41 | Dustproof Rubber | 1 | Garnitură anti-praf |
| A42 | Right Crankcase | 1 | Carter dreapta |
| A43 | Right double nail shock absorption | 1 | Amortizor dublu dreapta |
| A44 | Washer Insulator Branket | 1 | Șaibă suport izolator |
| A45 | Insulator Branket | 1 | Suport izolator |
| A46 | Gasket Insulator Branket | 1 | Garnitură suport izolator |
| A47 | Manifold | 1 | Galerie admisie |
| A48 | Carburetor | 1 | Carburator |
| A49 | Throttle Pull Rod | 1 | Tijă accelerație |
| A50 | Intake Manifold | 1 | Racord admisie |
| A51 | Anti-vibration Intake Manifold | 1 | Amortizor racord admisie |
| A52 | Bolt M5*50 | 2 | Șurub M5×50 |
| A53 | Screw Gm5-m5x38 | 1 | Prezon M5×38 |
| A54 | Gasket Air-filter | 1 | Garnitură filtru aer |
| A55 | Air-filter | 1 | Filtru de aer |
| A56 | Butterfly clasp | 1 | Piuliță fluture |
| A57 | Bolt M5*14 | 2 | Șurub M5×14 |
| A58 | Hook | 1 | Cârlig |
| A59 | Antivibration Set Hook | 1 | Cârlig set antivibrații |
| A60 | Antivibration Hook | 1 | Cârlig antivibrații |
| A61 | Oil Seal Φ15×Φ28×5 | 1 | Simering 15×28×5 |
| A62 | Cover oil Pump | 1 | Capac pompă ulei |
| A63 | Bolt M4*10 | 3 | Șurub M4×10 |
| A64 | Worm | 1 | Melc antrenare pompă ulei |
| A65 | Needle Bearing 12*15*14.5 | 1 | Rulment cu ace 12×15×14,5 |
| A66 | Sproket | 1 | Pinion lanț |
| A67 | Clutch Drum | 1 | Tambur ambreiaj |
| A68 | Gasket Clutch | 1 | Șaibă ambreiaj |
| A69 | Clutch | 1 | Ambreiaj |
| A70 | Bolt M4×14 | 2 | Șurub M4×14 |
| A71 | Oil nozzle | 1 | Duză ulei |
| A72 | Oil Pump | 1 | Pompă ulei |
| A73 | Dustproof Rubber | 1 | Garnitură anti-praf |
| A74 | Nozzle | 1 | Tub ulei |
| A75 | Oil Filter | 1 | Filtru ulei |
| A76 | Oil nozzle cap | 1 | Capac duză ulei |
| A77 | Guide | 1 | Ghidaj |
| A78 | Screw Aym8-m8x42 | 2 | Prezon M8×42 |
| A79 | Bolt M5X10 | 2 | Șurub M5×10 |
| A80 | Bumper Spike | 1 | Gheară |
| A81 | Sponge Filter | 1 | Filtru burete |
| A82 | Snap Ring Ø10 | 1 | Inel de siguranță Ø10 |
| A83 | Went Mouth | 1 | Supapă aerisire |
| A84 | Insulation Pipe 7X70 | 1 | Tub izolator 7×70 |
| A85 | Negative Pipe | 1 | Furtun impuls |
| A86 | Nozzle Dip | 1 | Racord duză |
| A87 | Elbow | 1 | Cot |
| A88 | Front baffle metallurgical nut M5 | 1 | Piuliță M5 deflector față |
| A89 | Limit ejector return spring | 1 | Arc revenire limitator |
| A90 | Bolt ST4*10 | 1 | Șurub ST4×10 |
| A91 | Limit ejector | 1 | Limitator |
| A92 | Brake positioning block | 1 | Bloc poziționare frână |
| A93 | Washer 5X10X1 | 1 | Șaibă 5×10×1 |
| A94 | Bolt M5X20 | 1 | Șurub M5×20 |

### Positions — sheet B (chainsaw body)

| Id | Original (EN) | Qty | Denumire (RO, de verificat) |
|---|---|---|---|
| B1 | Snap for air filter cover | 2 | Clemă capac filtru aer |
| B2 | air filter cover | 1 | Capac filtru aer |
| B3 | front guard | 1 | Protecție mână (frână de lanț) |
| B4 | Bolt M5*14 | 8 | Șurub M5×14 |
| B5 | Bolt ST5X18 | 1 | Șurub ST5×18 |
| B6 | engine cover | 1 | Capac motor |
| B7 | handle | 1 | Mâner față |
| B8 | Bolt ST5X14 | 9 | Șurub ST5×14 |
| B9 | Gas deflector | 1 | Deflector gaze |
| B10 | Bolt ST3.5X10 | 3 | Șurub ST3,5×10 |
| B11 | anti-dust gap | 3 | Garnitură anti-praf |
| B12 | Buffer spring buckle | 1 | Clemă arc amortizor |
| B13 | Handle cushion spring | 1 | Arc amortizor mâner |
| B14 | Start Knob | 1 | Mâner demaror |
| B15 | Start rope | 1 | Sfoară demaror |
| B16 | Starter cover | 1 | Carcasă demaror |
| B17 | Three pad Washer | 1 | Șaibă cu trei urechi |
| B18 | Big Spring | 1 | Arc mare demaror |
| B19 | Big Sping Box | 1 | Casetă arc demaror |
| B20 | Starting rope pulley | 1 | Fulie demaror |
| B21 | Small Spring | 1 | Arc mic |
| B22 | Pony Wheel | 1 | Clichet demaror |
| B23 | Washer 5X14X1.2 | 1 | Șaibă 5×14×1,2 |
| B24 | wind deflector | 1 | Deflector aer |
| B25 | Conical pressure spring | 1 | Arc conic |
| B26 | Conical spring seat | 1 | Suport arc conic |
| B27 | Chain Blocker | 1 | Opritor lanț |
| B28 | Chain Blocker Bolt M5*13 | 3 | Șurub opritor lanț M5×13 |
| B29 | anti-dust gap | 2 | Garnitură anti-praf |
| B30 | Long damping seat | 2 | Suport amortizor lung |
| B31 | Fuel tank | 1 | Rezervor combustibil |
| B32 | Double pin | 1 | Știft dublu |
| B33 | Cylindrical shock absorption | 1 | Amortizor cilindric |
| B34 | Balancer Seat | 1 | Suport balansier |
| B35 | Balancer | 1 | Balansier |
| B36 | Fuel Filter | 1 | Filtru combustibil |
| B37 | Fuel Pipe | 1 | Furtun combustibil |
| B38 | Rear Handle | 1 | Mâner spate |
| B39 | Trigger | 1 | Trăgaci accelerație |
| B40 | Trigger torsion spring | 1 | Arc torsiune trăgaci |
| B41 | Trigger Pin Φ6X28 | 1 | Bolț trăgaci 6×28 |
| B42 | Trigger control arm | 1 | Pârghie blocare trăgaci |
| B43 | Fuel Pipe 3X5X130 | 1 | Furtun combustibil 3×5×130 |
| B44 | Balancer Seat | 1 | Suport balansier |
| B45 | Bolt M5*12 | 1 | Șurub M5×12 |
| B46 | ON/OFF Switch | 1 | Comutator pornire/oprire |
| B47 | Bolt ST5*18 | 1 | Șurub ST5×18 |
| B48 | Multipurpose spanner fixed shrapnel | 1 | Clemă fixare cheie |
| B49 | Bolt ST4X10 | 10 | Șurub ST4×10 |
| B50 | Multipurpose wrench holder | 1 | Suport cheie universală |
| B51 | Spark plug socket | 1 | Cheie bujie |
| B52 | Oil palm | 1 | Sorb ulei |
| B53 | Seal for oil cap | 1 | Garnitură bușon ulei |
| B54 | Oil tank cap | 1 | Bușon rezervor ulei |
| B55 | Brake spring cover plate | 1 | Capac arc frână |
| B56 | Bolt ST4X8 | 3 | Șurub ST4×8 |
| B57 | Chain Guider | 1 | Ghidaj lanț |
| B58 | Cover plate for chain tension | 1 | Placă capac întinzător |
| B59 | Tightening nut | 1 | Piuliță întinzător |
| B60 | Tightening buckle | 1 | Știft întinzător |
| B61 | Tightening screw | 1 | Șurub întinzător |
| B62 | Brake Pin 3X9 | 1 | Bolț frână 3×9 |
| B63 | Brake Belt | 1 | Bandă frână |
| B64 | Brake Body | 1 | Carcasă frână |
| B65 | Flange Nut M8 | 2 | Piuliță cu flanșă M8 |
| B66 | Big Spring | 1 | Arc frână |
| B67 | Brake belt connecting rod | 1 | Tijă bandă frână |
| B68 | Brake connecting piece | 1 | Piesă legătură frână |
| B69 | Main Lever | 1 | Pârghie principală frână |
| B70 | Circlip 4 | 1 | Siguranță Ø4 |
| B71 | Snapped rivet 3*9 | 1 | Nit 3×9 |
| B72 | Snapped rivet 3*13 | 1 | Nit 3×13 |
| B73 | chain | 1 | Lanț 64DL .325" .058" |
| B74 | Guide Bar | 1 | Șină de ghidaj 40 cm |
| B75 | Guide Bar Protector | 1 | Teacă șină |

## 3D model

- Still built in code from Three.js primitives; no external model files. Units stay centimetres, same axes as the PoC.
- **Parametric hardware builders**, sized from the names at real scale: bolt (metric/self-tapping, hex or Phillips head, diameter × length), nut, flange nut, wing nut, washer, ball bearing (6206), needle bearing, oil seal, retaining ring / circlip, pin, rivet, key, helical spring (compression, torsion, conical), spiral spring (starter), O-ring, gasket (thin plate with outline and holes).
- **Mechanical parts** from lathe profiles and extrusions: piston with ring grooves, finned cylinder, crankshaft with webs and pin, clutch shoes and drum, toothed sprocket, flywheel with fan blades and magnet, carburettor, oil pump with worm, brake band, starter pulley and spring cassette, muffler.
- **Housings** reworked to follow the drawings' outlines: crankcase halves, engine cover, air-filter cover, rear handle with fuel tank, starter cover with grille, brake body, front guard, front handle.
- Each position is one object (named by its id) holding exactly `quantity` pieces, placed where they belong (bolts in their holes, rings in their grooves, 64 links on the bar). Identical pieces share geometry. Each position has its own material instances (dimming/highlighting stay per position).
- Assembled: parts nest so the outside matches the photos; inner parts are hidden until exploded.
- The body badge still reads `MF 34`; the bar wordmark is still the placeholder `O’MAC` without ®.

## Explode and interaction

- Two levels, as before: each of the 13 assemblies moves away along its own direction; the active assembly's positions then fan out along that assembly's axis in the order the factory drawing stacks them (e.g. cylinder gasket → cylinder → bolts; crankshaft → bearings → seals → retaining ring). Per-position directions are hand-set so small parts are not hidden behind large ones.
- Non-active assemblies and the static core fade, as before.
- Markers: one per position, on the first piece, label = position id (`A12`). Only the active assembly's markers are shown (max 23), at least 46 px apart.
- Selector, two-way linking, keyboard, reassemble-clears-selection, camera framing: unchanged.

## Page

- Model card count: `13 ansambluri · 169 poziții`.
- Selector: `N · Name (count)` for the 13 assemblies.
- List row: line 1 — position id, Romanian name, and `buc. N` right-aligned; line 2 — `cod: [.....] · denumire tradusă, de verificat`, plus the wear marker `▲ uzură (propunere)` where flagged.
- Notice bar: "Proof of concept. Denumirile pieselor provin din lista de piese a fabricantului, traduse provizoriu; codurile și prețurile nu sunt încă disponibile."
- Long lists scroll inside the panel; selecting a marker scrolls its row into view.

## Files

In `proof-of-concepts/threejs-renders/MOTOFERASTRAU O'MAC MF 34/`:

| File | Change |
|---|---|
| `parts.js` | Replaced: 13 assemblies, 169 positions (data above) |
| `geometry/hardware.js` | New: parametric hardware builders |
| `geometry/engine.js` | New: builders for assemblies 1–5 and 7 |
| `geometry/body.js` | New: builders for assemblies 6 and 8–13 |
| `model.js` | Reworked: maps each position to its builder, assembled placement, explode direction and marker anchor; keeps the pure math (`easeInOutCubic`, `stepToward`, `explodeOffset`, `stadiumPoints`) |
| `ui.js` | List row gains `buc.` and the translation note; ids shown as-is |
| `app.js` | Minimal: core includes the new static parts; nothing else structural |
| `index.html`, `README.md` | Notice text and README updated |

## Verification

- Data: 169 positions; ids A1–A94 and B1–B75 each exactly once; every position in exactly one of 13 assemblies; quantities match the sheets; no factory model designation in any project file (the test assembles the string it searches for from fragments, so the test file itself doesn't contain it).
- Geometry: every position has an object holding exactly `quantity` pieces; every anchor on the position's own surface; no shared materials between positions; overall size still ~80–90 cm long.
- Browser, for all 13 assemblies: markers ↔ rows link both ways; markers ≥ 46 px apart; explode/reassemble returns every position to its exact start; no console errors; 390 px layout without horizontal scroll.
- Visual: a screenshot of each exploded assembly, compared with the matching region of the factory drawings for part order and layout.

## Out of scope

Showing the drawings; real codes, prices or stock; CAD-accurate housing shapes; MF 38 / MF 46.
