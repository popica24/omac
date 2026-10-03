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
const openContexts = new Set();
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
      openContexts.add(context);
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
      } finally {
        // O verificare picată nu-și închide pagina; o pagină lăsată deschisă randează 3D
        // în continuare și încetinește toate verificările de după.
        for (const c of openContexts) await c.close().catch(() => {});
        openContexts.clear();
      }
    }
  }
} finally {
  await browser.close();
  server.kill();
}
console.log(failed ? `\n${failed} verificări au eșuat` : '\nToate verificările au trecut');
process.exit(failed ? 1 : 0);
