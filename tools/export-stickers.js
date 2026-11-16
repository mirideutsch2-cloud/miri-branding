// Renders every [data-sticker] in brand-book.html to a transparent PNG in stickers/.
// Usage: node tools/export-stickers.js
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const root = path.join(__dirname, '..');
  const out = path.join(root, 'stickers');
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ deviceScaleFactor: 4, viewport: { width: 1200, height: 900 } });
  await page.goto('file://' + path.join(root, 'brand-book.html'), { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({ content: 'html,body,.board,.act{background:transparent!important}.drape{animation:none!important}.cell .slot{padding:28px}' });
  for (const el of await page.$$('[data-sticker]')) {
    const name = await el.getAttribute('data-sticker');
    const slot = (await el.evaluateHandle(e => e.closest('.slot'))).asElement();
    await slot.screenshot({ path: path.join(out, name + '.png'), omitBackground: true });
    console.log('stickers/' + name + '.png');
  }
  await browser.close();
})();
