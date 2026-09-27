import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const output = resolve(root, 'dist');
await rm(output, { recursive: true, force: true });
await mkdir(resolve(output, 'src'), { recursive: true });
for (const file of ['index.html', 'fire-lab.html', 'map.html', 'map3d.html']) await cp(resolve(root, file), resolve(output, file));
for (const file of ['app.js', 'prep.css', 'preparedness.js', 'responder.js', 'workspace.js', 'sample-location.json', 'fire-lab.js', 'model.js', 'style.css']) await cp(resolve(root, 'src', file), resolve(output, 'src', file));
// Every page's tab icon (browsers ask for /favicon.ico), and the fire lab's optional voice-clip index
// (clips come from scripts/generate-audio.mjs; without them the lab falls back to the browser's voice).
await cp(resolve(root, 'assets/pwa/favicon.ico'), resolve(output, 'favicon.ico'));
await mkdir(resolve(output, 'audio'), { recursive: true });
await writeFile(resolve(output, 'audio/manifest.json'), existsSync(resolve(root, 'audio/manifest.json')) ? await readFile(resolve(root, 'audio/manifest.json')) : '{}');
// Public planning layers for the maps (built by scripts/build-map-layers.py; committed).
await cp(resolve(root, 'data/map-layers'), resolve(output, 'map-layers'), { recursive: true });
// The resident phone app as a static web export at /app/. Requires `npm install` in apps/mobile first.
execFileSync('npx', ['expo', 'export', '--platform', 'web', '--output-dir', resolve(output, 'app')], { cwd: resolve(root, 'apps/mobile'), stdio: 'inherit', env: { ...process.env, FIREPATH_WEB_BASE: '/app' } });

// Offline shell: a service worker so the app (and its Emergency screen) still opens with no signal.
// Pages are network-first (a new deploy always wins when online); fingerprinted assets are
// cache-first; /api/ responses are personal data and are never cached.
{
  const { readFile, writeFile, readdir } = await import('node:fs/promises');
  const appDir = resolve(output, 'app');
  const jsDir = resolve(appDir, '_expo/static/js/web');
  const bundles = (await readdir(jsDir)).filter(f => f.endsWith('.js')).map(f => `/app/_expo/static/js/web/${f}`);
  const version = bundles.map(b => b.split('-').pop().replace('.js', '')).join('.') || String(Date.now());
  await writeFile(resolve(appDir, 'sw.js'), `const CACHE = 'firepath-${version}';
const SHELL = ${JSON.stringify(['/app/', ...bundles])};
self.addEventListener('install', event => { event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', event => { event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== location.origin || !url.pathname.startsWith('/app/')) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).then(res => { caches.open(CACHE).then(c => c.put('/app/', res.clone())); return res; }).catch(() => caches.match('/app/')));
    return;
  }
  event.respondWith(caches.match(event.request).then(hit => hit || fetch(event.request).then(res => { if (res.ok) caches.open(CACHE).then(c => c.put(event.request, res.clone())); return res; })));
});
`);
  // Installable: "Add to Home Screen" opens FirePath full-screen with its own icon.
  await cp(resolve(root, 'assets/pwa'), resolve(appDir, 'pwa'), { recursive: true });
  await writeFile(resolve(appDir, 'manifest.webmanifest'), JSON.stringify({
    name: 'FirePath', short_name: 'FirePath', description: 'Emergency preparedness for your Glendale address.',
    start_url: '/app/', scope: '/app/', display: 'standalone', background_color: '#F5F6F1', theme_color: '#1D5B4D',
    icons: [{ src: '/app/pwa/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' }, { src: '/app/pwa/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }],
  }, null, 1));
  const indexPath = resolve(appDir, 'index.html');
  let html = await readFile(indexPath, 'utf8');
  if (!html.includes('manifest.webmanifest')) html = html.replace('</head>', '<link rel="manifest" href="/app/manifest.webmanifest"><link rel="apple-touch-icon" href="/app/pwa/apple-touch-icon.png"><meta name="theme-color" content="#1D5B4D"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-title" content="FirePath"></head>');
  // Link previews (chat apps, Slack, social). Crawlers need an absolute image URL.
  const SITE = 'https://firepath-ruddy.vercel.app';
  const DESCRIPTION = "Check a Glendale address against seven hazard maps and the City's permit records, then get a short plan for the people who live there. Glendale pilot prototype in English, Spanish, Armenian and Korean.";
  if (!html.includes('property="og:image"')) html = html.replace('</head>', `<meta name="description" content="${DESCRIPTION}"><meta property="og:type" content="website"><meta property="og:site_name" content="FirePath"><meta property="og:title" content="FirePath: your place, your plan"><meta property="og:description" content="${DESCRIPTION}"><meta property="og:url" content="${SITE}/app/"><meta property="og:image" content="${SITE}/app/pwa/og.png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="FirePath: Your place. Your plan. A phone showing the Glendale address check."><meta name="twitter:card" content="summary_large_image"></head>`);
  // Paint something the moment the HTML arrives: the app's JavaScript takes a few seconds on a slow
  // phone. React replaces this when it mounts. The 911 line matters most if the app never loads.
  if (!html.includes('id="splash"')) html = html.replace('<div id="root"></div>', '<div id="root"><div id="splash" style="position:fixed;inset:0;background:#F5F6F1;color:#17372E;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,sans-serif;display:flex;flex-direction:column;justify-content:center;padding:32px 24px;box-sizing:border-box"><div style="font-size:15px;font-weight:900;letter-spacing:2px;color:#1D5B4D">FIREPATH</div><div style="font-size:34px;font-weight:800;margin-top:10px">Your place. Your plan.</div><div style="font-size:16px;color:#53655E;margin-top:14px">Loading…</div><div style="font-size:15px;font-weight:700;color:#B3261A;margin-top:28px">In immediate danger, call 911.</div></div><script>try{var t={"es": ["¿Qué riesgos hay en su dirección de Glendale?", "Cargando…", "Si hay peligro inmediato, llame al 911."], "hy": ["Ի՞նչ վտանգներ կան ձեր Գլենդելի հասցեում", "Բեռնվում է…", "Անմիջական վտանգի դեպքում զանգեք 911։"], "ko": ["글렌데일 주소에는 어떤 위험이 있나요?", "불러오는 중…", "긴급한 위험이 있으면 911에 전화하세요."]}[localStorage.getItem("firepath-lang") || (navigator.languages || [navigator.language || ""]).map(function (l) { return String(l).toLowerCase().split("-")[0]; }).find(function (l) { return l === "es" || l === "hy" || l === "ko" || l === "en"; })];if(t){var d=document.querySelectorAll("#splash > div");d[1].textContent=t[0];d[2].textContent=t[1];d[3].textContent=t[2];}}catch(e){}</script></div>');
  // A focus ring keyboard users can see (the browser default is a 1px line).
  if (!html.includes('id="focus-ring"')) html = html.replace('</head>', '<style id="focus-ring">:focus-visible { outline: 3px solid #17372E !important; outline-offset: 2px; }</style></head>');
  if (!html.includes('/app/sw.js')) html = html.replace('</body>', `<script>if ('serviceWorker' in navigator) navigator.serviceWorker.register('/app/sw.js', { scope: '/app/' }).catch(() => {});</script></body>`);
  await writeFile(indexPath, html);
}
console.log('Static FirePath demo built in dist/. Open /?demo=1 for the tour, or /app/ for the resident phone app.');
