// Small-phone layout check: every main screen in every language at 320 and 390 px wide. Reports a page
// that scrolls sideways, sub-tab labels that overlap or outgrow their tab, and tab rows that have to
// scroll. Usage: node scripts/layout-check.mjs [base-url] [text-scale: 1, 1.2 or 1.4] [business]. Exits 1 on overflow or overlap.
// Expected: the Armenian Profile tab row scrolls at 320 px (its labels need ~290 px at 11 px).
import puppeteer from 'puppeteer-core';
const BASE = process.argv[2] || 'https://firepath-ruddy.vercel.app', SCALE = process.argv[3] || '1', BUSINESS = process.argv[4] === 'business';
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
    // Measure each word on its own: spaces left hanging at a wrapped line's end are not overflow.
    const node = el.firstChild; if (!node || node.nodeType !== 3) continue;
    for (const m of node.data.matchAll(/\S+/g)) {
      const r = document.createRange(); r.setStart(node, m.index); r.setEnd(node, m.index + m[0].length);
      if ([...r.getClientRects()].some(x => x.left < box.left - 1 || x.right > box.right + 1)) { out.push(`text wider than its box: "${el.textContent.trim().slice(0, 40)}"`); break; }
      // A word split across two lines ("կատարվու / մ") fits the box but reads badly: the font is too big for the space.
      if (!/[-·/]/.test(m[0]) && new Set([...r.getClientRects()].map(x => Math.round(x.top))).size > 1) { out.push(`word split across lines: "${m[0]}"`); break; }
    }
  }
  return out;
});
await page.goto(`${BASE}/app/`, { waitUntil: 'networkidle2' });
// The demo household by default; with "business" as the third argument, a throwaway example.test business at City
// Hall (generated password), deleted at the end.
const password = (await import('node:crypto')).randomBytes(9).toString('hex');
const post = (path, body, t) => page.evaluate(async (path, body, t) => (await fetch(path, { method: 'POST', headers: { 'content-type': 'application/json', ...(t ? { authorization: `Bearer ${t}` } : {}) }, body: JSON.stringify(body) })).json(), path, body, t);
const token = BUSINESS
  ? (await post('/api/account/signup', { type: 'business', email: `layout-${Date.now()}@example.test`, password, name: 'Layout Test', businessName: 'Layout Test Cafe', businessKind: 'restaurant' })).token
  : (await post('/api/demo/start', {})).token;
if (BUSINESS) await post('/api/me/address', { address: '613 E Broadway, Glendale, CA 91206' }, token);
let failed = false;
try {
  for (const width of [320, 390]) for (const lang of ['en', 'es', 'hy', 'ko']) {
    await page.setViewport({ width, height: 700 });
    await page.evaluate((t, l, s) => { localStorage.clear(); localStorage.setItem('firepath-session', t); localStorage.setItem('firepath-lang', l); localStorage.setItem('firepath-scale', s); }, token, lang, SCALE);
    await page.reload({ waitUntil: 'networkidle2' }); await sleep(1500);
    const found = [];
    const note = async where => found.push(...(await inspect()).map(x => `${where}: ${x}`));
    // Signed out first: the landing page (its header holds the Emergency button).
    await page.evaluate(() => localStorage.removeItem('firepath-session')); await page.reload({ waitUntil: 'networkidle2' }); await sleep(1200);
    await note('Landing');
  // The tour's intro (the first thing judges see): its button is the landing page's dark call to action.
  const tour = await page.evaluate(() => { const b = [...document.querySelectorAll('main [role=button]')].find(e => e.innerText.startsWith('▶')); b?.click(); return !!b; }); await sleep(1000);
  if (tour) await note('Tour intro'); else found.push('Landing: tour button not found (Tour intro not checked)');
    await page.evaluate(t => localStorage.setItem('firepath-session', t), token); await page.reload({ waitUntil: 'networkidle2' }); await sleep(1500);
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
    // Below ~250 px of room (320 px at the largest text size) some Armenian words are longer than any line; a clean
    // break is the accepted outcome there, so those are notes rather than failures.
    const tight = width / Number(SCALE) < 250;
    const unique = [...new Set(found)].map(x => tight && x.includes('word split') ? x.replace(': word split', ': note: word split') : x);
    if (unique.some(x => !x.includes('note:'))) failed = true;
    console.log(`${width} ${lang} ×${SCALE}  ${unique.length ? '\n    ' + unique.join('\n    ') : 'ok'}`);
  }
} finally {
  // Delete the throwaway business even if a step above threw.
  if (BUSINESS) { await page.goto(`${BASE}/app/`).catch(() => {}); console.log('delete test account:', (await post('/api/account/delete', { password }, token).catch(() => ({}))).ok ? 'ok' : 'FAILED'); }
}
await browser.close();
process.exitCode = failed ? 1 : 0;
