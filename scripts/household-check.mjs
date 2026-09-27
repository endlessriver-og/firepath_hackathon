// The household path end to end: sign up as a resident (English), walk the three onboarding steps
// (who lives here, address, emergency details) to Home, verify the address with the demo-mailbox code,
// sign out and back in, then delete the account through Settings.
// Creates and deletes one example.test account. Usage: node scripts/household-check.mjs [base-url]
import puppeteer from 'puppeteer-core';
import { randomBytes } from 'node:crypto';
const BASE = process.argv[2] || 'https://firepath-ruddy.vercel.app';
const browser = await puppeteer.launch({ executablePath: process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, protocolTimeout: 240000 });
const page = await browser.newPage(); page.setDefaultTimeout(120000); await page.setViewport({ width: 390, height: 844 });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const errors = []; page.on('pageerror', e => errors.push(e.message));
page.on('response', r => { if (r.url().includes('/api/') && r.status() >= 500) errors.push(`${r.status()} ${r.url().replace(BASE, '')}`); });
page.on('dialog', d => d.accept());
let failed = false;
const step = (ok, label) => { console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${label}`); if (!ok) failed = true; return ok; };
const text = () => page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
const heading = () => page.evaluate(() => document.querySelector('[role=heading]')?.innerText || '');
const click = t => page.evaluate(t => { const e = [...document.querySelectorAll('[role=button],[role=link],[role=tab]')].reverse().find(e => e.innerText.replace(/\s+/g, ' ').trim() === t || e.innerText.includes(t)); e?.click(); return !!e; }, t);
const fill = async (label, value) => { const ok = await page.evaluate(label => { const i = [...document.querySelectorAll('input')].find(i => i.getAttribute('aria-label') === label); i?.focus(); return !!i; }, label); if (ok) await page.keyboard.type(value); return ok; };
const choose = (value) => page.evaluate(value => { const s = [...document.querySelectorAll('select')].find(s => [...s.options].some(o => o.value === value)); if (!s) return false; s.value = value; s.dispatchEvent(new Event('change', { bubbles: true })); return true; }, value);
const email = `household-check-${Date.now()}@example.test`, password = randomBytes(9).toString('hex');
let created = false;
try {
  await page.goto(`${BASE}/app/`, { waitUntil: 'networkidle2' });
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('firepath-lang', 'en'); }); await page.reload({ waitUntil: 'networkidle2' }); await sleep(1500);
  step(await click('Create an account'), 'open sign-up');
  step((await fill('Your name', 'Sam Tester')) && (await fill('Email', email)) && (await fill('Password', password)), 'fill the sign-up form');
  await click('Create account'); await sleep(3000);
  created = step(/Who lives with you/.test(await heading()), `step 1: "${await heading()}"`);
  await fill('Add someone', 'Grandpa Joe'); await sleep(300); await click('+ Add to household'); await sleep(800);
  step(/Grandpa Joe/.test(await text()), 'add a household member');
  await click('Continue'); await sleep(2500);
  step(/Where is home/.test(await heading()), `step 2: "${await heading()}"`);
  await fill('Glendale street address', '1613 Glencoe Way'); await sleep(2500);
  await page.evaluate(() => document.querySelector('[role=list] [role=button]')?.click()); await sleep(9000);
  await (click('Continue, verify later') || click('Continue')); await sleep(2500);
  step(/responders/i.test(await heading()), `step 3: "${await heading()}"`);
  await click('Finish'); await sleep(3000);
  step(/Hi Sam/.test(await text()) && /of \d+ done/.test(await text()), 'Home greets Sam and shows the checklist');
  // Everyday use: tick a checklist item, run a drill to the end, search the permit catalog.
  const doneCount = async () => Number(((await text()).match(/(\d+) of \d+ done/) || [])[1]);
  const before = await doneCount();
  await page.evaluate(() => document.querySelector('main [role=checkbox][aria-checked=false]')?.click()); await sleep(2500);
  step(await doneCount() === before + 1, `tick a checklist item (${before} → ${await doneCount()} done)`);
  await page.evaluate(() => [...document.querySelectorAll('[role=navigation] [role=tab]')].find(e => e.innerText.includes('Alerts'))?.click()); await sleep(1500);
  await click('Drill'); await sleep(1000);
  await page.evaluate(() => { const s = [...document.querySelectorAll('select')].find(s => [...s.options].some(o => o.value === 'Red Flag Warning')); s.value = 'Red Flag Warning'; s.dispatchEvent(new Event('change', { bubbles: true })); }); await sleep(3500);
  const practice = await page.evaluate(() => { const boxes = [...document.querySelectorAll('main [role=checkbox]')]; boxes.forEach(b => b.click()); return boxes.length; }); await sleep(800);
  step(practice > 0 && new RegExp(`${practice} of ${practice} practiced`).test(await text()), `practice all ${practice} drill actions`);
  step(await click('Finish practice'), 'finish the drill'); await sleep(2500);
  await page.evaluate(() => [...document.querySelectorAll('[role=navigation] [role=tab]')].find(e => e.innerText.includes('Permits'))?.click()); await sleep(1500);
  await fill('What are you planning?', 'new roof'); await sleep(2500);
  step(/Re-?roof|Roof/i.test(await text()), 'permit search finds roofing permits');
  // Verify the address with the mailed code (the demo mailbox shows it), then sign out and back in.
  await page.evaluate(() => document.querySelectorAll('[aria-label]')[1]?.click()); await sleep(1000);
  await click('Address'); await sleep(1200);
  step(await click('Mail me a code'), 'mail a verification code'); await sleep(2500);
  const code = await page.evaluate(() => (document.body.innerText.match(/DEMO MAILBOX[\s\S]{0,200}?(\d{6})/) || [])[1]);
  step(Boolean(code), `demo mailbox shows a code${code ? '' : ' (none found)'}`);
  if (code) { await fill('Code from your postcard', code); await sleep(300); await click('Verify address'); await sleep(3000); }
  step(/VERIFIED BY MAIL/.test(await text()), 'address verified');
  step(await click('Sign out'), 'sign out'); await sleep(2500);
  await click('Already registered? Sign in'); await sleep(1200);
  await fill('Email', email); await fill('Password', password); await click('Sign in'); await sleep(3000);
  step(/Hi Sam/.test(await text()), 'sign back in with the same email and password');
} finally {
  if (created) {
    await page.evaluate(() => document.querySelectorAll('[aria-label]')[1]?.click()); await sleep(1000);
    await page.evaluate(() => [...document.querySelectorAll('main [role=tab]')].pop()?.click()); await sleep(800);
    await click('Delete account'); await sleep(500); await fill('Your password', password); await sleep(300); await click('Delete my account'); await sleep(3000);
    const status = await page.evaluate(async (email, password) => (await fetch('/api/account/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password }) })).status, email, password);
    step(status === 401, 'account deleted through Settings');
  }
  step(errors.length === 0, errors.length ? `no errors (${errors.join(' | ')})` : 'no page errors or server errors');
  await browser.close();
  process.exitCode = failed ? 1 : 0;
}
