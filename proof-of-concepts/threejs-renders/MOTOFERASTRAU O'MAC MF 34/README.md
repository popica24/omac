# MF 34 — schemă explodată (proof of concept)

Pagină statică pentru oferta o-mac.ro: motoferăstrăul O’MAC MF 34 în 3D, cu toate cele 169 de poziții din lista de piese a fabricantului, în 13 ansambluri. Fiecare poziție are piesele ei (cantitatea de pe foaie), un marker cu numărul de poziție și un rând în listă, legate în ambele sensuri. Arată cum poate arăta modulul de piese de schimb din Faza 2.

La „Vezi piesele", ansamblurile se depărtează; ansamblul ales se așază într-o grilă, rând cu rând, în ordinea de pe foaie. Piesele aceleiași poziții (de exemplu cele 9 șuruburi B8) se adună laolaltă, iar piesele mici se măresc (de cel mult 8 ori, fără să iasă din celula lor) ca să se vadă lângă cele mari. Celelalte ansambluri se estompează. Fiecare număr stă deasupra piesei lui, legat de ea printr-o linie subțire; etichetele prea apropiate se depărtează singure, ca să rămână ușor de atins și pe telefon.

## Cum se deschide

Modulele ES nu pornesc din `file://`, deci pagina se servește local:

    python3 -m http.server

apoi `http://localhost:8000` în browser. Three.js 0.170.0 e inclus în `vendor/` (licență MIT), deci pagina merge și fără internet.

## Date

- Pozițiile, denumirile originale și cantitățile: foile `assets/A Explosive view.pdf` (motor, A1–A94) și `assets/B Explosive view.pdf` (corp, B1–B75). Desenele nu se afișează pe pagină.
- Denumirile românești sunt traduceri de lucru, marcate „de verificat"; originalul englez e păstrat în `parts.js`.
- Sursele nu au coduri sau prețuri; pagina afișează `cod: [.....]` și nu inventează valori.
- Piesele de uzură sunt o propunere bazată pe capitolul de întreținere din manual; clasificarea o face O’MAC.
- Specificațiile din fișa utilajului vin din `assets/Manual de utilizare O'MAC MF 34 MF 38 MF 46.pdf`.
- Modelul 3D e construit în cod, din forme simple, după desene și fotografii: piesele standard (șuruburi, rulmenți, simeringuri, arcuri) au dimensiunile din denumire; carcasele sunt aproximări.
- Denumirea de fabrică de pe foi nu apare nicăieri în proiect (verificat de `tests/no-factory-name.test.mjs`).

## Fișiere

| Fișier | Rol |
|---|---|
| `parts.js` | cele 169 de poziții și cele 13 ansambluri (singura sursă de date) |
| `geometry/hardware.js` | piese standard parametrice și ajutoare de geometrie |
| `geometry/engine.js` | pozițiile motorului (ansamblurile 1–5 și 7) |
| `geometry/body.js` | pozițiile corpului (ansamblurile 6 și 8–13) |
| `model.js` | asamblarea, materialele, ancorele markerilor și explodarea |
| `ui.js` | fișa utilajului, selectorul și lista |
| `labels.js` | așezarea etichetelor pe ecran: deasupra pieselor, distanțate, cu linie spre piesă |
| `app.js` | scena 3D, animația, markerii și selecția |
| `styles.css` | variabilele de brand și stilul paginii |

## Verificare

    npm install && npx playwright install chromium
    npm test        # date, calcul și geometrie (node --test)
    npm run e2e     # pagina în Chromium; capturi în screenshots/
