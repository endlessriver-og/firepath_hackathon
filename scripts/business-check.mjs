// The business path end to end: sign up as a business (Spanish), walk the three onboarding steps
// (profile, address, emergency details) to Home, then delete the account through Settings.
// Creates and deletes one example.test account. Usage: node scripts/business-check.mjs [base-url]
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
// Waits for text instead of a fixed pause: the event and venue answers look up hazards, which is slower on a
// cold server or a CI runner.
const appears = re => page.waitForFunction(src => new RegExp(src, 'i').test(document.body.innerText), { timeout: 30000 }, re.source).then(() => true, () => false);
const email = `business-check-${Date.now()}@example.test`, password = randomBytes(9).toString('hex');
let created = false;
try {
  await page.goto(`${BASE}/app/`, { waitUntil: 'networkidle2' });
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('firepath-lang', 'es'); }); await page.reload({ waitUntil: 'networkidle2' }); await sleep(1500);
  step(await click('Crear una cuenta'), 'open sign-up');
  step(await choose('business'), 'choose "Un negocio"'); await sleep(600);
  step((await fill('Nombre del negocio', 'Panadería de Prueba')) && (await fill('Su nombre (contacto principal)', 'Ana Prueba')) && (await fill('Correo electrónico', email)) && (await fill('Contraseña', password)) && (await choose('restaurant')), 'fill the business sign-up form');
  await click('Crear cuenta'); await sleep(3000);
  created = step(/negocio/i.test(await heading()), `step 1: "${await heading()}"`);
  await click('Continuar'); await sleep(2500);
  step(/dónde está el negocio/i.test(await heading()), `step 2: "${await heading()}"`);
  await fill('Dirección en Glendale', '1613 Glencoe Way'); await sleep(2500);
  await page.evaluate(() => document.querySelector('[role=list] [role=button]')?.click()); await sleep(9000);
  await (click('Continuar, verificar después') || click('Continuar')); await sleep(2500);
  step(/emergencia/i.test(await heading()), `step 3: "${await heading()}"`);
  await click('Terminar'); await sleep(3000);
  step(/Panadería de Prueba/.test(await heading()) && /de \d+ completados/.test(await text()), 'Home shows the business and its checklist');
  // Permits: a project checklist, the event planner and a City-venue package.
  await page.evaluate(() => [...document.querySelectorAll('[role=navigation] [role=tab]')].pop()?.click()); await sleep(1500);
  await click('Proyectos'); await sleep(1000);
  await choose('sign'); await sleep(800); await click('Ver mi lista de permisos'); await sleep(3000);
  step(/permiso probable/i.test(await text()), 'project guide: a new sign gives a likely permit');
  await click('← Todos los proyectos'); await sleep(1000);
  await click('Eventos'); await sleep(1000);
  await click('Empezar'); await sleep(800); await fill('Nombre del evento', 'Feria de prueba'); await click('Ver mi lista de permisos');
  step(await appears(/permisos probables de la ciudad · \d+/i), 'event planner lists likely City permits');
  const venue = await page.evaluate(() => { const s = [...document.querySelectorAll('select')].find(s => [...s.options].some(o => /Elija un lugar/.test(o.text))); const opt = s && [...s.options].find(o => o.value && !/Elija/.test(o.text)); if (!opt) return null; s.value = opt.value; s.dispatchEvent(new Event('change', { bubbles: true })); return opt.text; }); await sleep(800);
  if (venue) await click('Armar mi paquete');
  step(Boolean(venue) && await appears(/permisos de la ciudad de glendale · \d+/i), `City venue package${venue ? ` (${venue})` : ''}`);
} finally {
  if (created) {
    await page.evaluate(() => document.querySelectorAll('[aria-label]')[1]?.click()); await sleep(1000);
    await page.evaluate(() => [...document.querySelectorAll('main [role=tab]')].pop()?.click()); await sleep(800);
    await click('Eliminar cuenta'); await sleep(500); await fill('Su contraseña', password); await sleep(300); await click('Eliminar mi cuenta'); await sleep(3000);
    const status = await page.evaluate(async (email, password) => (await fetch('/api/account/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password }) })).status, email, password);
    step(status === 401, 'account deleted through Settings');
  }
  step(errors.length === 0, errors.length ? `no errors (${errors.join(' | ')})` : 'no page errors or server errors');
  await browser.close();
  process.exitCode = failed ? 1 : 0;
}
