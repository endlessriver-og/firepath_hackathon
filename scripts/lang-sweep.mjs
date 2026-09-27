// Walks every main screen in a translated language and lists English phrases still showing (text,
// placeholders and screen-reader labels). Usage: node scripts/lang-sweep.mjs [base-url] [lang]
// Expected leftovers: permit-search examples (the City catalog is English), venue names, "brace and bolt".
import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, protocolTimeout: 240000 });
const p = await b.newPage(); p.setDefaultTimeout(180000); await p.setViewport({ width: 390, height: 844 });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const B = process.argv[2] || 'https://firepath-ruddy.vercel.app', LANG = process.argv[3] || 'hy';
const english = () => p.evaluate(() => {
  const text = document.body.innerText + ' ' + [...document.querySelectorAll('input,textarea')].map(e => e.placeholder).join(' ') + ' ' + [...document.querySelectorAll('[aria-label]')].map(e => e.getAttribute('aria-label')).join(' ');
  return [...new Set(text.match(/\b[A-Za-z][a-z]+(?:[ ,'-]+[A-Za-z][a-z]+){1,}\b/g) || [])];
});
const report = async label => console.log(`${label}: ${(await english()).join(' | ') || '(none)'}`);
// Signed out
await p.goto(`${B}/app/`, { waitUntil: 'networkidle2' });
await p.evaluate(l => { localStorage.clear(); localStorage.setItem('firepath-lang', l); }, LANG);
await p.reload({ waitUntil: 'networkidle2' }); await sleep(2000);
await report('landing');
// Demo household, every tab and its sub-tabs
const token = await p.evaluate(async () => (await (await fetch('/api/demo/start', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })).json()).token);
await p.evaluate(t => localStorage.setItem('firepath-session', t), token);
await p.reload({ waitUntil: 'networkidle2' }); await sleep(2500);
for (let i = 0; i < 5; i++) {
  await p.evaluate(i => [...document.querySelectorAll('[role=navigation] [role=tab]')][i]?.click(), i); await sleep(2000);
  const name = await p.evaluate(i => [...document.querySelectorAll('[role=navigation] [role=tab]')][i]?.innerText.trim().replace(/\s+/g, ' '), i);
  await report(`tab ${i} ${name}`);
  const subs = await p.evaluate(() => [...document.querySelectorAll('main [role=tab]')].length);
  for (let j = 1; j < subs; j++) { await p.evaluate(j => [...document.querySelectorAll('main [role=tab]')][j]?.click(), j); await sleep(1500); await report(`  sub ${j}`); }
}
await p.evaluate(() => document.querySelectorAll('[aria-label]')[0].click()); await sleep(1200);
await report('emergency');
await b.close();
