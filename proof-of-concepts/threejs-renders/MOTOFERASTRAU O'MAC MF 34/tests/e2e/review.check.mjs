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

// ——— Din recenzia finală ———

function minSpacing(boxes) {
  let min = Infinity;
  let pair = '';
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i].b;
      const b = boxes[j].b;
      const d = Math.hypot(a.x + a.width / 2 - b.x - b.width / 2, a.y + a.height / 2 - b.y - b.height / 2);
      if (d < min) { min = d; pair = `${boxes[i].id}/${boxes[j].id}`; }
    }
  }
  return { min, pair };
}

export async function markersSpacedRightAfterExplode(ctx) {
  for (const id of ['1', '7', '12']) {
    const page = await ctx.newPage();
    await ctx.openReady(page);
    await page.selectOption('#assembly', id);
    await page.click('#explode');
    await settle(page);
    const { min, pair } = minSpacing(await markerBoxes(page));
    assert.ok(min >= 46, `ansamblul ${id}, imediat după „Vezi piesele": ${pair} la ${Math.round(min)} px`);
    await done(page);
  }
}

export async function markersSpacedOnPhone(ctx) {
  const page = await ctx.newPage({ viewport: { width: 390, height: 844 } });
  await ctx.openReady(page);
  await page.click('#explode');
  await settle(page);
  for (const a of ASSEMBLIES) {
    await page.selectOption('#assembly', String(a.id));
    await settle(page);
    await page.locator('#viewer').scrollIntoViewIfNeeded();
    const boxes = await markerBoxes(page);
    const { min, pair } = minSpacing(boxes);
    assert.ok(min >= 46, `telefon, ansamblul ${a.id}: ${pair} la ${Math.round(min)} px`);
    const v = await page.locator('#viewer').boundingBox();
    for (const { id, b } of boxes) {
      assert.ok(b.x >= v.x && b.x + b.width <= v.x + v.width && b.y >= v.y && b.y + b.height <= v.y + v.height, `telefon, ansamblul ${a.id}: ${id} iese din cadru`);
    }
  }
  await done(page);
}

export async function markersSitAboveTheirParts(ctx) {
  const page = await ctx.newPage();
  await ctx.openReady(page);
  await page.click('#explode');
  await settle(page);
  for (const a of ASSEMBLIES) {
    await page.selectOption('#assembly', String(a.id));
    await settle(page);
    for (const { id } of await markerBoxes(page)) {
      const pill = await page.locator(`.marker[data-id="${id}"] .cerc`).boundingBox();
      const anchor = await page.evaluate((pid) => window.__mf34.anchorPoint(pid), id);
      assert.ok(pill.y + pill.height <= anchor.y + 1, `ansamblul ${a.id}: eticheta ${id} acoperă piesa`);
    }
  }
  await done(page);
}
