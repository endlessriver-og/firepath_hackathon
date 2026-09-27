// Offline checklist: two ticks made with the API unreachable show at once, survive a reload, and reach the
// server when the connection returns (the online event triggers the send). Usage: node scripts/offline-ticks-check.mjs [base-url]
// The service worker is blocked so the API cut-off is exact. Exits 1 on any failure.
import puppeteer from 'puppeteer-core';
const B = process.argv[2] || 'https://firepath-ruddy.vercel.app';
let failed = false; const check = (ok, label) => { console.log(`${ok ? 'ok  ' : 'FAIL'}  ${label}`); if (!ok) failed = true; };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, protocolTimeout: 240000 });
const ctx = await b.createBrowserContext(); const p = await ctx.newPage(); await p.setViewport({ width: 390, height: 844 });
let offline = false;
await p.setRequestInterception(true);
p.on('request', r => { const u = r.url(); if (u.endsWith('/sw.js')) return r.abort(); if (offline && u.includes('/api/')) return r.abort('internetdisconnected'); r.continue(); });
p.on('dialog', async d => { check(false, `no error dialog (got: ${d.message()})`); await d.dismiss(); });
await p.goto(`${B}/app/`, { waitUntil: 'networkidle2' });
const token = await p.evaluate(async () => (await (await fetch('/api/demo/start', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })).json()).token);
await p.evaluate(t => localStorage.setItem('firepath-session', t), token);
await p.reload({ waitUntil: 'networkidle2' }); await sleep(3000);
const serverDone = () => p.evaluate(async t => (await (await fetch('/api/me', { headers: { authorization: `Bearer ${t}` } })).json()).done, token);
const pending = () => p.evaluate(() => localStorage.getItem('firepath-pending-tasks'));
const boxes = () => p.evaluate(() => Object.fromEntries([...document.querySelectorAll('main [role=checkbox]')].map(c => [c.getAttribute('aria-label') || c.innerText.trim().slice(0, 30), c.getAttribute('aria-checked')])));
const planTab = async () => { await p.evaluate(() => [...document.querySelectorAll('[role=navigation] [role=tab]')][1]?.click()); await sleep(1500); };
await planTab();
const before = await boxes(); const names = Object.keys(before).filter(k => before[k] === 'false').slice(0, 2);
offline = true;
for (const n of names) { await p.evaluate(n => [...document.querySelectorAll('main [role=checkbox]')].find(c => (c.getAttribute('aria-label') || c.innerText.trim().slice(0, 30)) === n).click(), n); await sleep(1200); }
const now = await boxes(); check(names.length === 2 && names.every(n => now[n] === 'true'), 'offline ticks show at once'); check(Object.keys(JSON.parse(await pending()) || {}).length === 2, 'both ticks queued on this device');
await p.reload({ waitUntil: 'networkidle2' }); await sleep(3000); await planTab();
const after = await boxes(); check(names.every(n => after[n] === 'true'), 'ticks survive an offline reload');
offline = false;
await p.evaluate(() => dispatchEvent(new Event('online'))); await sleep(3000);
const server = await serverDone(); check(await pending() === null, 'queue empties once back online'); check(Object.values(server).filter(Boolean).length === Object.values(before).filter(v => v === 'true').length + 2, 'the server has both ticks');
await b.close();
process.exitCode = failed ? 1 : 0;
