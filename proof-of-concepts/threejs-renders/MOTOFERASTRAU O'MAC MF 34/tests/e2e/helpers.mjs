// Ajutoare comune pentru verificările din browser (nu e un fișier *.check.mjs).
export const settle = (page) => page.waitForFunction(() => !window.__mf34.isAnimating(), null, { timeout: 10000 });
export const done = (page) => page.context().close();

// Luminozitatea medie a unui pixel din captura paginii (decodată în browser).
export async function pixelAt(page, x, y) {
  const png = await page.screenshot({ clip: { x: Math.round(x), y: Math.round(y), width: 1, height: 1 } });
  return page.evaluate(async (b64) => {
    const img = new Image();
    img.src = `data:image/png;base64,${b64}`;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = 1;
    c.height = 1;
    const g = c.getContext('2d');
    g.drawImage(img, 0, 0);
    const [r, gr, b] = g.getImageData(0, 0, 1, 1).data;
    return (r + gr + b) / 3;
  }, png.toString('base64'));
}
