// The judges' path: signed-out landing → Explore the app → Begin → all five tour stops → Finish → Home.
// Fails on a stop that does not appear, a page error, or an API error. Usage: node scripts/tour-check.mjs [base-url]
import puppeteer from 'puppeteer-core';
const BASE = process.argv[2] || 'https://firepath-ruddy.vercel.app';
const browser = await puppeteer.launch({ executablePath: process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, protocolTimeout: 240000 });
const page = await browser.newPage(); page.setDefaultTimeout(120000); await page.setViewport({ width: 390, height: 844 });
const errors = [];
page.on('pageerror', e => errors.push('page error: ' + e.message.slice(0, 120)));
page.on('response', r => { if (r.status() >= 400 && r.url().includes('/api/')) errors.push(`${r.status()} ${r.url().replace(/.*\/api/, '/api')}`); });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const click = text => page.evaluate(text => { const e = [...document.querySelectorAll('[role=button],[role=link],[role=tab]')].reverse().find(e => e.innerText.replace(/\s+/g, ' ').includes(text)); e?.click(); return !!e; }, text);
let failed = false;
const step = (ok, label) => { console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${label}`); if (!ok) failed = true; return ok; };

await page.goto(`${BASE}/app/`, { waitUntil: 'networkidle2' });
await page.evaluate(() => localStorage.clear()); await page.reload({ waitUntil: 'networkidle2' }); await sleep(1500);
if (step(await click('Explore the app'), 'Explore the app') && step(await click('Begin'), 'Begin')) {
  step(await page.waitForFunction(() => /1 OF 5/.test(document.body.innerText), { timeout: 60000 }).then(() => true).catch(() => false), 'tour starts at 1 of 5');
  for (let n = 1; n <= 5; n++) {
    const shown = await page.waitForFunction(n => document.body.innerText.includes(`${n} OF 5`), { timeout: 20000 }, n).then(() => true).catch(() => false);
    const title = await page.evaluate(() => { const lines = document.body.innerText.split('\n').map(l => l.trim()).filter(Boolean); const i = lines.findIndex(l => / OF 5$/.test(l)); return lines.slice(i + 1).find(l => l !== 'Exit') || ''; });
    step(shown, `stop ${n} of 5${title ? ': ' + title : ''}`);
    await sleep(800);
    if (n < 5) await click('Next →'); else step(await click('Finish'), 'Finish');
  }
  step(await page.waitForFunction(() => !/OF 5/.test(document.body.innerText) && /Dana/.test(document.body.innerText), { timeout: 20000 }).then(() => true).catch(() => false), 'back on Home as the demo household');
}
step(errors.length === 0, errors.length ? `no errors (${errors.join(' | ')})` : 'no page or API errors');
await browser.close();
process.exitCode = failed ? 1 : 0;
