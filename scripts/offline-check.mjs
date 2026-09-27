// Offline check: open the app online (installs the service worker), cut the network, reload, and
// confirm the saved plan and the Emergency steps still appear. Needs Google Chrome installed.
// Usage: node scripts/offline-check.mjs [base-url] [lang: en|es|hy|ko]
import puppeteer from 'puppeteer-core';
import { readFileSync } from 'node:fs';
const BASE = process.argv[2] || 'https://firepath-ruddy.vercel.app', LANG = process.argv[3] || 'en';
// Labels come from the app's own dictionary, so the same check runs in every language.
const i18n = readFileSync(new URL('../apps/mobile/src/i18n.js', import.meta.url), 'utf8');
const label = key => [...i18n.matchAll(new RegExp(`'${key.replace('.', '\\.')}': '((?:[^'\\\\]|\\\\.)*)'`, 'g'))][{ en: 0, es: 1, hy: 2, ko: 3 }[LANG]][1].replace(/\\'/g, "'");
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, isMobile: true });
await page.goto(`${BASE}/app/`, { waitUntil: 'networkidle2' });
const token = await page.evaluate(async () => (await (await fetch('/api/demo/start', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })).json()).token);
await page.evaluate((t, lang) => { localStorage.setItem('firepath-session', t); localStorage.setItem('firepath-lang', lang); }, token, LANG);
await page.reload({ waitUntil: 'networkidle2' });
await new Promise(r => setTimeout(r, 2500));
const sw = await page.evaluate(async () => { const reg = await navigator.serviceWorker.getRegistration('/app/'); return { state: reg?.active?.state, controlled: !!navigator.serviceWorker.controller, caches: await caches.keys() }; });
if (!sw.controlled) { console.log('FAIL service worker not controlling the page', JSON.stringify(sw)); process.exitCode = 1; } else console.log('ok    service worker active:', sw.caches.join(', '));
await page.setOfflineMode(true);
await page.reload({ waitUntil: 'domcontentloaded' }).catch(e => console.log('reload error', e.message));
await new Promise(r => setTimeout(r, 3000));
const offlineText = await page.evaluate(() => document.body.innerText);
if (offlineText.includes(label('off.banner').split(' ')[0]) && /Dana/.test(offlineText)) console.log('ok    offline reload shows the saved plan'); else { console.log('FAIL offline reload:', offlineText.slice(0, 200)); process.exitCode = 1; }
const clicked = await page.evaluate(text => { const b = [...document.querySelectorAll('[role=button]')].find(e => e.innerText.trim() === text); b?.click(); return !!b; }, label('head.emergency'));
await new Promise(r => setTimeout(r, 800));
await page.evaluate(text => [...document.querySelectorAll('[role=button]')].find(e => e.innerText.includes(text))?.click(), label('sit.evacuate'));
await new Promise(r => setTimeout(r, 800));
const emergencyText = await page.evaluate(() => document.body.innerText);
if (clicked && emergencyText.includes(label('em.call')) && emergencyText.split('\n').filter(l => l.trim().length > 20).length >= 4) console.log('ok    Emergency steps open offline'); else { console.log('FAIL offline emergency:', emergencyText.slice(0, 200)); process.exitCode = 1; }
await browser.close();
