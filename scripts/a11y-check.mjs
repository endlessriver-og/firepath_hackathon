// Accessibility audit with axe-core in Chrome across the main screens and every Profile tab (signed out and as the demo
// household) and both map pages, which also fails on anything the Content-Security-Policy blocks. Usage: node scripts/a11y-check.mjs [base-url]. Exits 1 on serious or critical issues.
import puppeteer from 'puppeteer-core';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const axeSource = readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');
const BASE = process.argv[2] || 'https://firepath-ruddy.vercel.app';
const browser = await puppeteer.launch({ executablePath: process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, protocolTimeout: 240000, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
// A just-deployed site is slow for its first requests (cold functions, map tiles): allow time, retry a load once.
page.setDefaultTimeout(120000);
const open = async url => { try { await page.goto(url, { waitUntil: 'networkidle2' }); } catch { await page.goto(url, { waitUntil: 'networkidle2' }); } };
await page.setViewport({ width: 390, height: 844, isMobile: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const found = new Map();
// Anything the Content-Security-Policy blocks on these pages is a broken resource: report it like a violation.
// axe itself fetches cross-origin stylesheets to read their rules, which connect-src refuses; those are not user-facing.
let auditing = false;
page.on('console', m => { if (!auditing && /Content Security Policy/i.test(m.text())) found.set('serious · csp-blocked', { help: 'the Content-Security-Policy blocked a resource (add its origin in vercel.json)', screens: new Set([page.url().replace(/^https?:\/\/[^/]+/, '')]), examples: [...(found.get('serious · csp-blocked')?.examples || []), m.text().slice(0, 120)].slice(0, 3) }); });
async function audit(label) {
  auditing = true;
  await page.evaluate(axeSource);
  const { violations } = await page.evaluate(() => window.axe.run(document, { resultTypes: ['violations'] }));
  await new Promise(r => setTimeout(r, 300)); auditing = false;
  for (const v of violations) {
    const key = `${v.impact} · ${v.id}`;
    const entry = found.get(key) || { help: v.help, screens: new Set(), examples: [] };
    entry.screens.add(label);
    for (const n of v.nodes.slice(0, 2)) if (entry.examples.length < 3) entry.examples.push(n.target.join(' ') + ' :: ' + n.html.slice(0, 90));
    found.set(key, entry);
  }
}
const click = (text, sel = '[role=button],[role=tab],[aria-label]') => page.evaluate((text, sel) => { const e = [...document.querySelectorAll(sel)].find(e => (e.getAttribute('aria-label') || e.innerText || '').trim() === text); e?.click(); return !!e; }, text, sel);
await open(`${BASE}/app/`);
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'networkidle2' }); await sleep(1500);
await audit('landing');
const token = await page.evaluate(async () => (await (await fetch('/api/demo/start', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })).json()).token);
await page.evaluate(t => localStorage.setItem('firepath-session', t), token);
await page.reload({ waitUntil: 'networkidle2' }); await sleep(2000);
await audit('home');
for (const tab of ['Plan', 'Alerts', 'Map', 'Permits']) { await click(tab); await sleep(1500); await audit(tab.toLowerCase()); }
// Profile and each of its tabs, with collapsed sections (password change, account deletion) opened.
await click('Profile and settings'); await sleep(1500);
const profileTabs = await page.evaluate(() => [...document.querySelectorAll('main [role=tab]')].map(e => e.innerText.trim()));
if (profileTabs.length < 3) found.set('serious · check-coverage', { help: `only ${profileTabs.length} profile tabs found; the Profile audit did not run`, screens: new Set(['profile']), examples: [] });
console.log(`info  audited profile tabs: ${profileTabs.join(', ')}`);
for (const [i, name] of profileTabs.entries()) {
  await page.evaluate(i => document.querySelectorAll('main [role=tab]')[i].click(), i); await sleep(1200);
  await page.evaluate(() => document.querySelectorAll('[aria-expanded=false]').forEach(e => e.click())); await sleep(500);
  await audit(`profile: ${name.toLowerCase()}`);
}
await click('Emergency'); await sleep(800); await audit('emergency');
// Same screens in a translated language: the page language must follow, and nothing new may break.
await page.evaluate(() => localStorage.setItem('firepath-lang', 'hy'));
await page.reload({ waitUntil: 'networkidle2' }); await sleep(2000);
const pageLang = await page.evaluate(() => document.documentElement.lang);
if (pageLang !== 'hy') found.set('serious · page-lang', { help: `page language is "${pageLang}" after switching to Armenian`, screens: new Set(['home (hy)']), examples: [] });
await audit('home (hy)');
// The two map pages, which the app embeds (the 3D one with a parcel card open).
for (const path of ['map.html?layers=combined,wildfire&lat=34.19912&lon=-118.2311', 'map3d.html?lat=34.19912&lon=-118.2311']) {
  await open(`${BASE}/${path}`); await sleep(3000);
  if (path.startsWith('map3d')) {
    await page.waitForFunction(() => typeof inspect === 'function');
    await page.evaluate(() => inspect({ lat: 34.19912, lng: -118.2311 }));
    await page.waitForFunction(() => /APN|Parcel|Could not/.test(document.getElementById('card')?.innerText || '')).catch(() => {});
  }
  await audit(path.split('?')[0]);
}
await browser.close();
const order = ['critical', 'serious', 'moderate', 'minor'];
const rows = [...found.entries()].sort((a, b) => order.indexOf(a[0].split(' · ')[0]) - order.indexOf(b[0].split(' · ')[0]));
if (!rows.length) console.log('ok    no accessibility violations found');
for (const [key, e] of rows) console.log(`${key} — ${e.help} [${[...e.screens].join(', ')}]\n    ${e.examples.join('\n    ')}`);
process.exitCode = rows.some(([k]) => /^(critical|serious)/.test(k)) ? 1 : 0;
