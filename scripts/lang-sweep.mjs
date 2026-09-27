// Walks every main screen (collapsed sections opened, Profile included) in a translated language and lists English still showing (text,
// placeholders and screen-reader labels). Usage: node scripts/lang-sweep.mjs [base-url] [lang] [business]
// For hy and ko it lists Latin-script phrases. For es it also sweeps in English and lists only the phrases that come out
// identical in both languages, since Spanish is Latin script too.
// Expected leftovers: permit-search examples (the City catalog is English), venue names, "brace and bolt".
import puppeteer from 'puppeteer-core';
import { readFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, protocolTimeout: 240000 });
const p = await b.newPage(); p.setDefaultTimeout(180000); await p.setViewport({ width: 390, height: 844 });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const B = process.argv[2] || 'https://firepath-ruddy.vercel.app', LANG = process.argv[3] || 'hy', JSON_OUT = process.argv.includes('--json');
const results = {};
const english = () => p.evaluate(() => {
  const text = document.body.innerText + ' ' + [...document.querySelectorAll('input,textarea')].map(e => e.placeholder).join(' ') + ' ' + [...document.querySelectorAll('[aria-label]')].map(e => e.getAttribute('aria-label')).join(' ');
  return [...new Set(text.match(/\b[A-Za-z][a-z]+(?:[ ,'-]+[A-Za-z][a-z]+){1,}\b/g) || [])];
});
// Open collapsed sections first so their contents are checked too.
const expand = () => p.evaluate(() => document.querySelectorAll('[aria-expanded=false]').forEach(e => e.click()));
const report = async label => { await expand(); await sleep(500); results[label] = await english(); };
// Signed out
await p.goto(`${B}/app/`, { waitUntil: 'networkidle2' });
await p.evaluate(l => { localStorage.clear(); localStorage.setItem('firepath-lang', l); }, LANG);
await p.reload({ waitUntil: 'networkidle2' }); await sleep(2000);
await report('landing');
// Demo household, every tab and its sub-tabs
// Demo household by default. With "business" as the third argument, signs up a throwaway example.test business
// (generated password, City Hall's address), sweeps as that business and deletes the account at the end.
const BUSINESS = process.argv.includes('business'), password = randomBytes(9).toString('hex');
const api = (path, body, token) => p.evaluate(async (path, body, token) => (await fetch(path, { method: 'POST', headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) })).json(), path, body, token);
const token = BUSINESS
  ? (await api('/api/account/signup', { type: 'business', email: `lang-sweep-${Date.now()}@example.test`, password, name: 'Sweep Test', businessName: 'Sweep Test Cafe', businessKind: 'restaurant' })).token
  : (await api('/api/demo/start', {})).token;
if (BUSINESS) await api('/api/me/address', { address: '613 E Broadway, Glendale, CA 91206' }, token);
await p.evaluate(t => localStorage.setItem('firepath-session', t), token);
await p.reload({ waitUntil: 'networkidle2' }); await sleep(2500);
for (let i = 0; i < 5; i++) {
  await p.evaluate(i => [...document.querySelectorAll('[role=navigation] [role=tab]')][i]?.click(), i); await sleep(2000);
  await report(`tab ${i}`);
  const subs = await p.evaluate(() => [...document.querySelectorAll('main [role=tab]')].length);
  for (let j = 1; j < subs; j++) { await p.evaluate(j => [...document.querySelectorAll('main [role=tab]')][j]?.click(), j); await sleep(1500); await report(`tab ${i} sub ${j}`); }
}
// Profile and its sub-tabs (the avatar's label is translated, so read it from the dictionary)
const i18n = readFileSync(new URL('../apps/mobile/src/i18n.js', import.meta.url), 'utf8');
const profileLabel = [...i18n.matchAll(/'a11y\.profile': '([^']*)'/g)][{ en: 0, es: 1, hy: 2, ko: 3 }[LANG]][1];
await p.evaluate(l => document.querySelector(`[aria-label="${l}"]`)?.click(), profileLabel); await sleep(2000);
await report('profile');
const psubs = await p.evaluate(() => [...document.querySelectorAll('main [role=tab]')].length);
for (let j = 1; j < psubs; j++) { await p.evaluate(j => [...document.querySelectorAll('main [role=tab]')][j]?.click(), j); await sleep(1500); await report(`profile sub ${j}`); }
await p.evaluate(() => document.querySelectorAll('[aria-label]')[0].click()); await sleep(1200);
await report('emergency');
const deleted = BUSINESS ? (await api('/api/account/delete', { password }, token)).ok : true;
await b.close();
if (JSON_OUT) { console.log(JSON.stringify(results)); process.exit(0); }
// Spanish: keep only phrases the English sweep of the same screen also shows.
const en = LANG === 'es' ? JSON.parse(execFileSync(process.execPath, [fileURLToPath(import.meta.url), B, 'en', ...(BUSINESS ? ['business'] : []), '--json'], { encoding: 'utf8', maxBuffer: 1 << 24 }).trim().split('\n').pop()) : null;
for (const [label, phrases] of Object.entries(results)) {
  const shown = en ? phrases.filter(x => (en[label] || []).includes(x)) : phrases;
  console.log(`${label}: ${shown.join(' | ') || '(none)'}`);
}
if (BUSINESS) console.log('delete test account:', deleted ? 'ok' : 'FAILED');
