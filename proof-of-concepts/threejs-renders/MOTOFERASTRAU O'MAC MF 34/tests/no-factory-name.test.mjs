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
