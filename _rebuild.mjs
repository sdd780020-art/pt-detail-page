import { chromium } from 'playwright-core';
import * as mupdf from 'mupdf';
import fs from 'fs';

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const URL = 'https://pt-detail-page.vercel.app/';
const OUT = 'C:/Users/sdd78/OneDrive/Desktop/클로드 코드 파일모음/PT_피그마_이관_에셋';
const TMP = 'C:/Users/sdd78/AppData/Local/Temp/claude/c--Users-sdd78-OneDrive-Desktop-------------PT----------/7e2f5235-e6f9-4610-9c86-26f543d6847c/scratchpad/rebuild';
fs.mkdirSync(TMP, { recursive: true });

const NAMES = [
  '01_header_GNB', '02_lnb_섹션내비', '03_hero_히어로', '04_problem_문제VOC',
  '05_punch_결론밴드', '06_system_4STEPPT앵커', '07_step1_매칭', '08_review_앱후기',
  '09_step2_설계', '10_step3_기록', '11_step4_변화', '12_facility_시설',
  '13_vision_비전', '14_cta_최종CTA', '15_faq_자주묻는질문', '16_footer_푸터',
];

const decode = (s) => s.replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'");
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const SYMBOL_ONLY = /^[\s -⯿⸀-⹿　-〿︀-️\u{1F000}-\u{1FAFF}]+$/u;

function rawSvg(pdfPath) {
  const doc = mupdf.Document.openDocument(fs.readFileSync(pdfPath), 'application/pdf');
  const page = doc.loadPage(0);
  const buf = new mupdf.Buffer();
  const w = new mupdf.DocumentWriter(buf, 'svg', 'text=path');
  const d = w.beginPage(page.getBounds());
  page.run(d, mupdf.Matrix.identity);
  d.close(); w.endPage(); w.close();
  return Buffer.from(buf.asUint8Array()).toString('utf8');
}
const stamp = (s, pxW, pxH, title) => s
  .replace(/^(<svg[^>]*?)width="[\d.]+"\s+height="[\d.]+"/, `$1width="${pxW}" height="${pxH}"`)
  .replace(/(<svg[^>]*>)/, `$1\n<title>${esc(title)}</title>`);

function parseGlyphs(svg) {
  const out = []; const re = /<use\b([^>]*?)\/>/g; let m;
  while ((m = re.exec(svg)) !== null) {
    const a = m[1];
    const dt = /data-text="([^"]*)"/.exec(a); if (!dt) continue;
    const tr = /transform="matrix\(([^)]+)\)"/.exec(a); if (!tr) continue;
    const fill = /fill="([^"]*)"/.exec(a);
    const p = tr[1].split(',').map(Number);
    out.push({ idx: m.index, ch: decode(dt[1]), size: Math.abs(p[0]), x: p[4], y: p[5], fill: fill ? fill[1] : '#000000' });
  }
  return out;
}

// 글리프 사이 간격(step)으로 이어붙일지 판단.
//  - 한글 한 글자 진행폭 ≈ 0.83×size, 공백 글리프 뒤 ≈ 0.19×size → 정상 문장은 1.0 미만
//  - CSS로 벌린 간격(푸터 링크 등)은 1.6×size 이상 → 여기서 끊어야 링크별 웨이트가 제대로 잡힘
const MERGE_MAX = 1.25;
const SPACE_MIN = 1.0;

function groupRuns(glyphs) {
  const sorted = [...glyphs].sort((a, b) => (a.y - b.y) || (a.x - b.x));
  const runs = []; let cur = null;
  for (const g of sorted) {
    const step = cur ? g.x - cur.prevX : 0;
    const same = cur && Math.abs(g.y - cur.y) < 0.6 && Math.abs(g.size - cur.size) < 0.2
      && g.fill === cur.fill && step > -cur.size * 0.05 && step < cur.size * MERGE_MAX;
    if (!same) { cur = { y: g.y, x: g.x, prevX: g.x, size: g.size, fill: g.fill, chars: [g.ch], firstIdx: g.idx, glyphIdx: [g.idx] }; runs.push(cur); }
    else {
      if (step > cur.size * SPACE_MIN && cur.chars[cur.chars.length - 1] !== ' ' && g.ch !== ' ') cur.chars.push(' ');
      cur.chars.push(g.ch); cur.prevX = g.x; cur.glyphIdx.push(g.idx);
    }
  }
  return runs.map((r) => ({ ...r, text: r.chars.join('').replace(/\s+$/, '') })).filter((r) => r.text.trim().length);
}

function resolveStyle(run, domTexts, pxPerUnit) {
  const px = run.size * pxPerUnit; const t = run.text.trim();
  let best = null; let bs = -1;
  for (const d of domTexts) {
    if (Math.abs(d.size - px) > 1.2) continue;
    let s = -1;
    if (d.text === t) s = 1000 + t.length;
    else if (t.length >= 2 && d.text.includes(t)) s = 600 + t.length;
    else if (d.text.length >= 2 && t.includes(d.text)) s = 500 + d.text.length;
    if (s > bs) { bs = s; best = d; }
  }
  if (!best) { const c = domTexts.filter((d) => Math.abs(d.size - px) <= 1.5); if (c.length) best = c[0]; }
  return best ? { weight: best.weight, ls: best.ls, style: best.style } : { weight: '400', ls: 0, style: 'normal' };
}

function toHybrid(svg, domTexts, pxPerUnit, pxW, pxH, title) {
  const glyphs = parseGlyphs(svg); const runs = groupRuns(glyphs);
  const replaceAt = new Map(); const keepPath = new Set();
  for (const r of runs) {
    if (SYMBOL_ONLY.test(r.text)) { r.glyphIdx.forEach((i) => keepPath.add(i)); continue; }
    const fi = resolveStyle(r, domTexts, pxPerUnit);
    const lsU = fi.ls / pxPerUnit;
    const attrs = [`x="${r.x.toFixed(2)}"`, `y="${r.y.toFixed(2)}"`, `font-family="Pretendard"`,
      `font-size="${r.size.toFixed(2)}"`, `font-weight="${fi.weight}"`,
      fi.style !== 'normal' ? `font-style="${fi.style}"` : '',
      Math.abs(lsU) > 0.01 ? `letter-spacing="${lsU.toFixed(3)}"` : '',
      `fill="${r.fill}"`, `xml:space="preserve"`].filter(Boolean).join(' ');
    replaceAt.set(r.firstIdx, `<text ${attrs}>${esc(r.text)}</text>`);
  }
  const lenOf = new Map(); const re = /<use\b[^>]*?\/>/g; let m;
  while ((m = re.exec(svg)) !== null) lenOf.set(m.index, m[0].length);
  let s = svg;
  for (const idx of glyphs.map((g) => g.idx).sort((a, b) => b - a)) {
    if (keepPath.has(idx)) continue;
    s = s.slice(0, idx) + (replaceAt.get(idx) || '') + s.slice(idx + (lenOf.get(idx) || 0));
  }
  return { svg: stamp(s, pxW, pxH, title), glyphs: glyphs.length, runs: runs.length };
}

const DOM_TEXTS = () => {
  const res = []; const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n;
  while ((n = w.nextNode())) {
    const t = n.textContent.replace(/\s+/g, ' ').trim(); if (!t) continue;
    const el = n.parentElement; if (!el) continue;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    res.push({ text: t, size: parseFloat(cs.fontSize), weight: cs.fontWeight, ls: cs.letterSpacing === 'normal' ? 0 : parseFloat(cs.letterSpacing), style: cs.fontStyle });
  }
  return res;
};

async function freshPage(browser, width, height) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1, isMobile: width < 500, hasTouch: width < 500 });
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 90000 });
  await page.evaluate(() => {
    document.querySelectorAll('[data-count]').forEach((el) => {
      const t = parseInt(el.dataset.count, 10);
      const clone = el.cloneNode(false);
      clone.removeAttribute('data-count');
      clone.innerHTML = t.toLocaleString('ko-KR') + '<span class="unit">' + (el.dataset.suffix || '') + '</span>';
      el.replaceWith(clone);
    });
  });
  await page.evaluate(async () => {
    await new Promise((res) => { let y = 0; const st = () => { y += 600; window.scrollTo(0, y); if (y < document.body.scrollHeight) setTimeout(st, 35); else { window.scrollTo(0, 0); setTimeout(res, 700); } }; st(); });
  });
  await page.evaluate(() => {
    const s = document.createElement('style');
    s.textContent = `.header,.lnb{position:static!important}.float-cta,.lightbox{display:none!important}*,*::before,*::after{animation-play-state:paused!important;transition:none!important}.reveal,[class*="reveal"]{opacity:1!important;transform:none!important}html,body{margin:0!important}`;
    document.head.appendChild(s);
    document.querySelectorAll('.marquee__row').forEach((r) => {
      r.scrollLeft = 0;
      Object.defineProperty(r, 'scrollLeft', { get: () => 0, set: () => {}, configurable: true });
    });
  });
  await page.evaluate(async () => {
    const imgs = [...document.images]; imgs.forEach((i) => { i.loading = 'eager'; });
    await Promise.all(imgs.map((i) => (i.complete ? i.decode().catch(() => {}) : new Promise((r) => { i.onload = i.onerror = r; }))));
  });
  await page.waitForTimeout(1200);
  await page.evaluate(() => {
    document.querySelectorAll('*').forEach((el) => {
      const cs = getComputedStyle(el);
      ['minHeight', 'height', 'maxHeight', 'paddingTop', 'paddingBottom', 'marginTop', 'marginBottom', 'fontSize', 'top', 'bottom'].forEach((p) => {
        const v = cs[p]; if (v && v !== 'auto' && v !== 'none' && v.endsWith('px')) el.style[p] = v;
      });
    });
    void document.body.offsetHeight;
  });
  await page.emulateMedia({ media: 'screen' });
  await page.waitForTimeout(900);
  return page;
}

async function section(browser, label, width, height, i) {
  const page = await freshPage(browser, width, height);
  const h = await page.evaluate((idx) => {
    const kids = [...document.querySelectorAll('body > *')].filter((el) => {
      const s = getComputedStyle(el);
      return s.display !== 'none' && s.position !== 'fixed' && el.offsetHeight >= 40;
    });
    kids.forEach((el, j) => { el.style.display = j === idx ? '' : 'none'; });
    [document.documentElement, document.body].forEach((el) => {
      el.style.height = 'auto'; el.style.minHeight = '0'; el.style.maxHeight = 'none'; el.style.margin = '0'; el.style.padding = '0';
    });
    void document.body.offsetHeight;
    return Math.max(Math.ceil(kids[idx].getBoundingClientRect().height), document.body.scrollHeight);
  }, i);
  await page.waitForTimeout(350);
  const domTexts = await page.evaluate(DOM_TEXTS);
  const pdf = `${TMP}/${label}_${i}.pdf`;
  await page.pdf({ path: pdf, width: `${width}px`, height: `${h}px`, printBackground: true, margin: { top: '0', bottom: '0', left: '0', right: '0' } });
  await page.close();
  const raw = rawSvg(pdf);
  const ppu = width / parseFloat(/viewBox="0 0 ([\d.]+)/.exec(raw)[1]);
  return { h, ...toHybrid(raw, domTexts, ppu, width, h, NAMES[i]) };
}

async function full(browser, label, width, height) {
  const page = await freshPage(browser, width, height);
  const domTexts = await page.evaluate(DOM_TEXTS);
  const docH = await page.evaluate(() => document.documentElement.scrollHeight);
  const pdf = `${TMP}/${label}_full.pdf`;
  await page.pdf({ path: pdf, width: `${width}px`, height: `${docH + 4}px`, printBackground: true, margin: { top: '0', bottom: '0', left: '0', right: '0' } });
  await page.close();
  const raw = rawSvg(pdf);
  const ppu = width / parseFloat(/viewBox="0 0 ([\d.]+)/.exec(raw)[1]);
  return { h: docH + 4, ...toHybrid(raw, domTexts, ppu, width, docH + 4, `${label} 전체 (텍스트 편집 가능)`) };
}

async function run(label, width, height, dir) {
  fs.mkdirSync(`${OUT}/${dir}`, { recursive: true });
  const browser = await chromium.launch({ executablePath: EDGE, headless: true });
  console.log(`\n[${label}]`);
  for (let i = 0; i < NAMES.length; i += 1) {
    let r = await section(browser, label, width, height, i);
    if (r.glyphs === 0 && r.h > 150) { console.log(`  ↻ ${NAMES[i]} 재시도`); r = await section(browser, label, width, height, i); }
    fs.writeFileSync(`${OUT}/${dir}/${NAMES[i]}.svg`, r.svg, 'utf8');
    console.log(`  ${NAMES[i].padEnd(24)} ${width}x${String(r.h).padEnd(5)} 글리프 ${String(r.glyphs).padStart(4)} → 텍스트 ${String(r.runs).padStart(3)}줄  ${(r.svg.length / 1024).toFixed(0)}KB`);
  }
  const f = await full(browser, label, width, height);
  fs.mkdirSync(`${OUT}/08_SVG_편집가능_풀페이지`, { recursive: true });
  fs.writeFileSync(`${OUT}/08_SVG_편집가능_풀페이지/${label}_전체_텍스트편집가능.svg`, f.svg, 'utf8');
  console.log(`  ${'풀페이지'.padEnd(22)} ${width}x${f.h} 글리프 ${f.glyphs} → 텍스트 ${f.runs}줄  ${(f.svg.length / 1048576).toFixed(1)}MB`);
  await browser.close();
}

await run('데스크탑1440', 1440, 900, '05_SVG_편집가능_데스크탑1440');
await run('모바일390', 390, 844, '06_SVG_편집가능_모바일390');
console.log('\n완료 →', OUT);
