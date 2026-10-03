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
