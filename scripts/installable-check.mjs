// Ask Chrome whether the app is installable ("Add to Home Screen"). Usage: node scripts/installable-check.mjs [base-url]
import puppeteer from 'puppeteer-core';
const BASE = process.argv[2] || 'https://firepath-ruddy.vercel.app';
const browser = await puppeteer.launch({ executablePath: process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const page = await browser.newPage();
await page.goto(`${BASE}/app/`, { waitUntil: 'networkidle2' });
await new Promise(r => setTimeout(r, 2500));
const cdp = await page.createCDPSession();
const { installabilityErrors } = await cdp.send('Page.getInstallabilityErrors');
const { url, errors } = await cdp.send('Page.getAppManifest');
console.log(installabilityErrors.length ? `FAIL not installable: ${installabilityErrors.map(e => e.errorId).join(', ')}` : `ok    installable (manifest ${url})`);
if (errors.length) console.log('manifest warnings:', errors.map(e => e.message).join('; '));
process.exitCode = installabilityErrors.length ? 1 : 0;
await browser.close();
