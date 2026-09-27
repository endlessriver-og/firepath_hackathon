import { cp, mkdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const output = resolve(root, 'dist');
await rm(output, { recursive: true, force: true });
await mkdir(resolve(output, 'src'), { recursive: true });
for (const file of ['index.html', 'fire-lab.html', 'map.html', 'map3d.html']) await cp(resolve(root, file), resolve(output, file));
for (const file of ['app.js', 'prep.css', 'preparedness.js', 'responder.js', 'workspace.js', 'sample-location.json', 'fire-lab.js', 'model.js', 'style.css']) await cp(resolve(root, 'src', file), resolve(output, 'src', file));
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
  const indexPath = resolve(appDir, 'index.html');
  const html = await readFile(indexPath, 'utf8');
  if (!html.includes('/app/sw.js')) await writeFile(indexPath, html.replace('</body>', `<script>if ('serviceWorker' in navigator) navigator.serviceWorker.register('/app/sw.js', { scope: '/app/' }).catch(() => {});</script></body>`));
}
console.log('Static FirePath demo built in dist/. Open /?demo=1 for the tour, or /app/ for the resident phone app.');
