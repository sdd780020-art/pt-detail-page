import { chromium } from 'playwright-core';
import fs from 'fs';
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const TMP = 'C:/Users/sdd78/AppData/Local/Temp/claude/c--Users-sdd78-OneDrive-Desktop-------------PT----------/7e2f5235-e6f9-4610-9c86-26f543d6847c/scratchpad';
const file = process.argv[2];
const offsets = process.argv.slice(3).map(Number);
const svg = fs.readFileSync(file, 'utf8');
const w = Math.round(Number(/width="([\d.]+)"/.exec(svg)[1]));
const html = `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.css">
<style>html,body{margin:0;padding:0;background:#0D0D0E}</style></head><body>${svg}</body></html>`;
fs.writeFileSync(`${TMP}/vfull_wrap.html`, html, 'utf8');
const browser = await chromium.launch({ executablePath: EDGE, headless: true });
const page = await browser.newPage({ viewport: { width: w, height: 1100 }, deviceScaleFactor: 1 });
await page.goto('file:///' + encodeURI(`${TMP}/vfull_wrap.html`), { waitUntil: 'networkidle', timeout: 120000 });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(3000);
for (const y of offsets) {
  await page.evaluate((v) => window.scrollTo(0, v), y);
  await page.waitForTimeout(1200);
  const out = `${TMP}/vfull_${y}.png`;
  await page.screenshot({ path: out, timeout: 120000 });
  console.log(`y=${y} → ${out}`);
}
await browser.close();
