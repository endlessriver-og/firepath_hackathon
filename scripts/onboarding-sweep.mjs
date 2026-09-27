// Signs up through the app's own form in a translated language, walks every onboarding step (household,
// address, emergency details) to Home and lists English still showing at each step, then deletes the account.
// Complements lang-sweep, which starts from an API-created account and so never sees onboarding.
// Usage: node scripts/onboarding-sweep.mjs [lang: hy|ko] [base-url] [business]. Expected leftovers: the test name, City record
// and agency names on Home.
import puppeteer from 'puppeteer-core';
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
const LANG = process.argv[2] || 'hy', B = process.argv[3] || 'https://firepath-ruddy.vercel.app', BUSINESS = process.argv[4] === 'business';
const i18n = readFileSync('apps/mobile/src/i18n.js', 'utf8');
const val = k => [...i18n.matchAll(new RegExp(`'${k.replace('.', '\\.')}': '((?:[^'\\\\]|\\\\.)*)'`, 'g'))][{ en: 0, es: 1, hy: 2, ko: 3 }[LANG]][1].replace(/\\'/g, "'");
const sleep = ms => new Promise(r => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, protocolTimeout: 240000 });
const p = await (await b.createBrowserContext()).newPage(); await p.setViewport({ width: 390, height: 844 });
const email = `ob-${Date.now()}@example.test`, password = randomBytes(9).toString('hex');
await p.goto(`${B}/app/`, { waitUntil: 'networkidle2' });
await p.evaluate(l => { localStorage.clear(); localStorage.setItem('firepath-lang', l); }, LANG);
await p.reload({ waitUntil: 'networkidle2' }); await sleep(1500);
const click = t => p.evaluate(t => { const e = [...document.querySelectorAll('[role=button],[role=link],[role=tab]')].reverse().find(e => e.innerText.replace(/\s+/g, ' ').trim() === t || e.innerText.includes(t)); e?.click(); return !!e; }, t);
const fill = async (label, value) => { const ok = await p.evaluate(label => { const i = [...document.querySelectorAll('input')].find(i => i.getAttribute('aria-label') === label); i?.focus(); return !!i; }, label); if (ok) await p.keyboard.type(value); return ok; };
const latin = async label => { await p.evaluate(() => document.querySelectorAll('[aria-expanded=false]').forEach(e => e.click())); await sleep(400); const text = await p.evaluate(() => document.querySelector('main')?.innerText + ' ' + [...document.querySelectorAll('input,textarea')].map(e => e.placeholder).join(' ') + ' ' + [...document.querySelectorAll('main [aria-label]')].map(e => e.getAttribute('aria-label')).join(' ')); console.log(label, '| LATIN:', [...new Set(text.match(/\b[A-Za-z][a-z]+(?:[ ,'-]+[A-Za-z][a-z]+){1,}\b/g) || [])].join(' | ') || '(none)'); return text; };
console.log('create:', await click(val('land.create'))); await sleep(1200);
await latin('sign-up form');
if (BUSINESS) {
  // The account-type and business-type pickers are <select>s.
  await p.evaluate(() => { const s = [...document.querySelectorAll('main select')][0]; s.value = 'business'; s.dispatchEvent(new Event('change', { bubbles: true })); }); await sleep(600);
  await fill(val('au.bizName'), 'Ob Test Cafe');
  await p.evaluate(() => { const s = [...document.querySelectorAll('main select')][1]; s.value = 'restaurant'; s.dispatchEvent(new Event('change', { bubbles: true })); }); await sleep(400);
  await latin('business sign-up form');
}
console.log('filled:', await fill(val(BUSINESS ? 'au.nameKey' : 'au.name'), 'Ob Test'), await fill(val('au.email'), email), await fill(val('au.password'), password));
await click(val('au.createBtn')); await sleep(3500);
const t1 = await latin('onboarding step A'); console.log('   ', t1.slice(0, 120).replace(/\n/g, ' / '));
// Walk forward: press the primary button on each step up to 4 times, entering the address when a field is present.
for (let i = 0; i < 4; i++) {
  const addr = await p.$('main input[placeholder]');
  const buttons = await p.evaluate(() => [...document.querySelectorAll('main [role=button]')].map(e => e.innerText.trim()).filter(Boolean));
  console.log('   buttons:', buttons.slice(0, 6).join(' | '));
  if (!buttons.length) break;
  const empty = await p.evaluate(() => { const i = [...document.querySelectorAll('main input')].find(i => !i.value && i.type !== 'password'); if (i) i.setAttribute('data-e', '1'); return !!i; });
  if (empty && buttons.length === 1) { await p.type('main input[data-e]', '1613 Glencoe Way'); await sleep(2000); await p.keyboard.press('Escape').catch(() => {}); }
  await p.evaluate(() => { const bs = [...document.querySelectorAll('main [role=button]')].filter(e => e.innerText.trim()); bs[bs.length - 1].click(); }); await sleep(12000);
  const tx = await latin(`onboarding step ${String.fromCharCode(66 + i)}`); console.log('   ', tx.slice(0, 100).replace(/\n/g, ' / '));
}
const token = await p.evaluate(() => localStorage.getItem('firepath-session'));
console.log('deleted:', await p.evaluate(async (t, pw) => (await fetch('/api/account/delete', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${t}` }, body: JSON.stringify({ password: pw }) })).ok, token, password));
await b.close();
