import { chromium } from '@playwright/test';
const out = process.argv[2]; const pages = process.argv.slice(3);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
for (const [w, tag] of [[1440, 'd'], [390, 'm']]) {
  const ctx = await b.newContext({ viewport: { width: w, height: 900 }, locale: 'de-CH' });
  const p = await ctx.newPage();
  for (const path of pages) {
    await p.goto('http://localhost:3100' + path, { waitUntil: 'load' }); await p.waitForTimeout(800);
    await p.screenshot({ path: `${out}/${tag}${path.replace(/\W+/g, '_') || '_home'}.png`, fullPage: true });
  }
  await ctx.close();
}
await b.close();
