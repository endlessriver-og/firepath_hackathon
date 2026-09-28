// Small-phone layout check: every main screen in every language at 320 and 390 px wide. Reports a page
// that scrolls sideways, sub-tab labels that overlap or outgrow their tab, and tab rows that have to
// scroll. Usage: node scripts/layout-check.mjs [base-url] [text-scale: 1, 1.2 or 1.4]. Exits 1 on overflow or overlap.
// Expected: the Armenian Profile tab row scrolls at 320 px (its labels need ~290 px at 11 px).
import puppeteer from 'puppeteer-core';
const BASE = process.argv[2] || 'https://firepath-ruddy.vercel.app', SCALE = process.argv[3] || '1';
const browser = await puppeteer.launch({ executablePath: process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, protocolTimeout: 240000 });
const page = await browser.newPage(); page.setDefaultTimeout(180000);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const inspect = () => page.evaluate(() => {
  const out = [];
  if (document.documentElement.scrollWidth > document.documentElement.clientWidth + 1 || document.body.scrollWidth > document.body.clientWidth + 1) out.push(`page scrolls sideways (${document.documentElement.scrollWidth}px)`);
  for (const list of document.querySelectorAll('main [role=tablist]')) {
    const tabs = [...list.querySelectorAll('[role=tab]')];
    const boxes = tabs.map(t => { const r = document.createRange(); r.selectNodeContents(t); return r.getBoundingClientRect(); });
    for (let i = 1; i < boxes.length; i++) if (boxes[i].left < boxes[i - 1].right - 0.5) out.push(`tabs overlap: "${tabs[i - 1].innerText}" / "${tabs[i].innerText}"`);
    tabs.forEach((t, i) => { if (boxes[i].width > t.getBoundingClientRect().width + 0.5) out.push(`"${t.innerText}" wider than its tab`); });
    const scroller = list.parentElement?.parentElement;
    if (scroller && scroller.scrollWidth > scroller.clientWidth + 1) out.push(`note: tab row scrolls (${tabs.map(t => t.innerText).join(' · ')})`);
  }
  // A single long word (Armenian especially) cannot wrap and spills out of its tile or card.
  for (const el of document.querySelectorAll('main *')) {
    if (el.children.length || !el.textContent.trim()) continue;
    // Measure against the tile or button that holds the text: a long word can widen its own box past the tile.
    const holder = el.closest('[role=button],[role=link],[role=checkbox]') || el;
    const box = holder.getBoundingClientRect(); if (!box.width || getComputedStyle(el).overflow !== 'visible') continue; // clipped on purpose (one-line summaries)
    const r = document.createRange(); r.selectNodeContents(el);
    // Ignore space-sized boxes: pre-wrap leaves the trailing space of a wrapped line hanging past the edge.
    if ([...r.getClientRects()].some(x => x.width > 6 && (x.left < box.left - 1 || x.right > box.right + 1))) out.push(`text wider than its box: "${el.textContent.trim().slice(0, 40)}"`);
  }
  return out;
});
await page.goto(`${BASE}/app/`, { waitUntil: 'networkidle2' });
const token = await page.evaluate(async () => (await (await fetch('/api/demo/start', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })).json()).token);
let failed = false;
for (const width of [320, 390]) for (const lang of ['en', 'es', 'hy', 'ko']) {
  await page.setViewport({ width, height: 700 });
  await page.evaluate((t, l, s) => { localStorage.clear(); localStorage.setItem('firepath-session', t); localStorage.setItem('firepath-lang', l); localStorage.setItem('firepath-scale', s); }, token, lang, SCALE);
  await page.reload({ waitUntil: 'networkidle2' }); await sleep(1500);
  const found = [];
  const note = async where => found.push(...(await inspect()).map(x => `${where}: ${x}`));
  for (let i = 0; i < 5; i++) {
    await page.evaluate(i => [...document.querySelectorAll('[role=navigation] [role=tab]')][i]?.click(), i); await sleep(1200);
    const name = await page.evaluate(i => [...document.querySelectorAll('[role=navigation] [role=tab]')][i]?.innerText.trim(), i);
    await note(name || `tab ${i}`);
    const subs = await page.evaluate(() => document.querySelectorAll('main [role=tablist] [role=tab]').length);
    for (let j = 1; j < subs; j++) { await page.evaluate(j => [...document.querySelectorAll('main [role=tablist] [role=tab]')][j]?.click(), j); await sleep(900); await note(`${name} › ${j}`); }
  }
  await page.evaluate(() => document.querySelectorAll('[aria-label]')[1]?.click()); await sleep(1200); await note('Profile');
  const profileSubs = await page.evaluate(() => document.querySelectorAll('main [role=tablist] [role=tab]').length);
  for (let j = 1; j < profileSubs; j++) {
    await page.evaluate(j => [...document.querySelectorAll('main [role=tablist] [role=tab]')][j]?.click(), j); await sleep(900);
    // Open every collapsed section (privacy note, delete account, city-data cards) before measuring.
    await page.evaluate(() => [...document.querySelectorAll('main [role=button][aria-expanded=false]')].forEach(e => e.click())); await sleep(700);
    await note(`Profile › ${j}`);
  }
  await page.evaluate(() => document.querySelectorAll('[aria-label]')[0]?.click()); await sleep(800); await note('Emergency');
  const unique = [...new Set(found)];
  if (unique.some(x => !x.includes('note:'))) failed = true;
  console.log(`${width} ${lang} ×${SCALE}  ${unique.length ? '\n    ' + unique.join('\n    ') : 'ok'}`);
}
await browser.close();
process.exitCode = failed ? 1 : 0;
