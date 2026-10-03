// Așezarea etichetelor (markerilor) pe ecran: fiecare pornește chiar deasupra piesei ei;
// cele prea apropiate se împing una pe alta până ajung la `minDist`, fără să coboare peste
// piesă și fără să iasă din cadru. O linie subțire leagă apoi eticheta de piesă.
// Toate valorile sunt în pixeli, în coordonatele viewer-ului (0,0 = colțul din stânga sus).

export function placeLabels(anchors, { minDist, lift, maxBelow, half, width, height, iterations = 160 }) {
  const preferred = anchors.map((a) => ({ x: a.x, y: a.y - lift }));
  const pos = preferred.map((p) => ({ ...p }));

  const clamp = (p, a) => {
    p.x = Math.min(width - half, Math.max(half, p.x));
    const bottom = Math.max(half, Math.min(height - half, a.y - maxBelow));
    p.y = Math.min(bottom, Math.max(half, p.y));
  };
  pos.forEach((p, i) => clamp(p, anchors[i]));

  for (let it = 0; it < iterations; it++) {
    // În prima jumătate etichetele sunt trase ușor spre locul preferat; apoi doar se despart.
    const spring = it < iterations / 2 ? 0.05 : 0;
    let moved = false;
    for (let i = 0; i < pos.length; i++) {
      for (let j = i + 1; j < pos.length; j++) {
        let ux = pos[j].x - pos[i].x;
        let uy = pos[j].y - pos[i].y;
        const d = Math.hypot(ux, uy);
        if (d >= minDist) continue;
        if (d < 1e-6) {
          // Puncte identice: le despărțim pe o direcție care depinde de index, ca să nu stea pe loc.
          const angle = (i * 2.399 + j) % (Math.PI * 2);
          ux = Math.cos(angle);
          uy = Math.sin(angle);
        } else {
          ux /= d;
          uy /= d;
        }
        const push = (minDist - d) / 2 + 0.01;
        pos[i].x -= ux * push;
        pos[i].y -= uy * push;
        pos[j].x += ux * push;
        pos[j].y += uy * push;
        moved = true;
      }
    }
    pos.forEach((p, i) => {
      p.x += (preferred[i].x - p.x) * spring;
      p.y += (preferred[i].y - p.y) * spring;
      clamp(p, anchors[i]);
    });
    if (!moved && spring === 0) break;
  }
  return pos;
}
