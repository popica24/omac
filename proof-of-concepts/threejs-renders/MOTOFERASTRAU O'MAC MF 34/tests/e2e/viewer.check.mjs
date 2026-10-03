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

export async function assembledModelFillsViewer(ctx) {
  const page = await ctx.newPage();
  await ctx.openReady(page);
  await settle(page);
  const fill = await page.evaluate(() => window.__mf34.modelFill());
  assert.ok(fill.width >= 0.75, `modelul ocupă doar ${Math.round(fill.width * 100)}% din lățime`);
  assert.ok(fill.inside, 'modelul iese din cadru');
  await done(page);
}
