// Offline checklist: two ticks made with the API unreachable show at once, survive a reload, and reach the
// server when the connection returns (the online event triggers the send). Usage: node scripts/offline-ticks-check.mjs [base-url]
// The service worker is blocked so the API cut-off is exact. Exits 1 on any failure.
import puppeteer from 'puppeteer-core';
const B = process.argv[2] || 'https://firepath-ruddy.vercel.app';
let failed = false; const check = (ok, label) => { console.log(`${ok ? 'ok  ' : 'FAIL'}  ${label}`); if (!ok) failed = true; };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, protocolTimeout: 240000 });
const ctx = await b.createBrowserContext(); const p = await ctx.newPage(); await p.setViewport({ width: 390, height: 844 });
let offline = false, serverDown = false;
await p.setRequestInterception(true);
p.on('request', r => { const u = r.url(); if (u.endsWith('/sw.js')) return r.abort(); if (offline && u.includes('/api/')) return r.abort('internetdisconnected'); if (serverDown && u.includes('/api/')) return r.respond({ status: 503, contentType: 'application/json', body: '{"error":"FirePath storage is unavailable. Try again in a moment."}' }); r.continue(); });
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
// Back online, untick the first step normally before the queue is sent: the queued tick must not undo it later.
await p.evaluate(n => [...document.querySelectorAll('main [role=checkbox]')].find(c => (c.getAttribute('aria-label') || c.innerText.trim().slice(0, 30)) === n).click(), names[0]); await sleep(2500);
check(Object.keys(JSON.parse(await pending()) || {}).length === 1, 'an untick saved online removes that step from the queue');
await p.evaluate(() => dispatchEvent(new Event('online'))); await sleep(3000);
const server = await serverDone(); check(await pending() === null, 'queue empties once back online'); check(Object.values(server).filter(Boolean).length === Object.values(before).filter(v => v === 'true').length + 1, 'the server has the queued tick, and the later untick was not undone');
// A server error (not a lost connection) must not replace the plan with an error screen either.
serverDown = true;
await p.reload({ waitUntil: 'networkidle2' }); await sleep(3000);
check(await p.evaluate(() => /Dana/.test(document.body.innerText) && !/storage is unavailable/.test(document.body.innerText)), 'a server error keeps the saved plan on screen');
await b.close();
process.exitCode = failed ? 1 : 0;
