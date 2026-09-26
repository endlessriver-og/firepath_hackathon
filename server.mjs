import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { resolve, extname, sep } from 'node:path';
import { createApi, fetchNwsAlerts } from './server/api.mjs';
import { openStore } from './server/store.mjs';
import { createGeocoder } from './server/geocode.mjs';
import { createCityRecords } from './server/city-records.mjs';
import { readFileSync } from 'node:fs';

const root = resolve(import.meta.dirname);
const srcRoot = resolve(root, 'src');
const audioRoot = resolve(root, 'audio');
const appRoot = resolve(root, 'dist/app');
const layerRoot = resolve(root, 'data/map-layers');
const port = Number(process.env.PORT || 5173);
const python = process.env.GLENDALE_GIS_PYTHON || 'python3';
const mime = { '.geojson': 'application/geo+json', '.ttf': 'font/ttf', '.png': 'image/png', '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg' };

function lookup(payload) {
  return new Promise((resolveLookup, reject) => {
    const child = spawn(python, [resolve(root, 'scripts/lookup-hazards.py')], { stdio: ['pipe', 'pipe', 'ignore'] });
    let output = '';
    const timer = setTimeout(() => child.kill(), 45000);
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', chunk => { output += chunk; if (output.length > 250000) child.kill(); });
    child.on('error', reject);
    child.on('close', code => { clearTimeout(timer); try { const data = JSON.parse(output); if (code === 0) resolveLookup(data); else reject(new Error(data.error)); } catch { reject(new Error('GIS lookup is unavailable. Install the Glendale GIS snapshot; see README.')); } });
    child.stdin.end(JSON.stringify(payload));
  });
}

// Combined planning index (built by scripts/build-map-layers.py): nearest ~150 m cell to a point.
let combined;
function combinedIndex(lat, lon) {
  try { combined ??= JSON.parse(readFileSync(resolve(root, 'data/map-layers/combined.json'), 'utf8')); } catch { return null; }
  let best = null, bestD = Infinity;
  for (const cell of combined.cells) { const d = (cell[0] - lat) ** 2 + ((cell[1] - lon) * 0.83) ** 2; if (d < bestD) { bestD = d; best = cell; } }
  const inCell = best && Math.sqrt(bestD) * 111_000 <= combined.grid_m;
  return { score: inCell ? best[2] : 0, max: combined.max, parts: inCell ? best[3].split(',').map(code => ({ label: combined.labels[code], points: combined.weights[code] })) : [] };
}
const hazardHits = new Map();
const api = createApi({ store: openStore(process.env.FIREPATH_DATA || resolve(root, 'data/firepath-dev.json')), lookupHazards: lookup, fetchAlerts: fetchNwsAlerts, geocoder: createGeocoder(), combinedIndex, cityRecords: createCityRecords(), permitCatalog: JSON.parse(readFileSync(resolve(root, 'src/glendale-permits.json'), 'utf8')), demoMailbox: process.env.FIREPATH_DEMO_MAILBOX !== '0' });
// The Expo dev server (port 8081) calls this API cross-origin with a bearer token; no cookies are used.
const devOrigin = /^http:\/\/(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+):8081$/;

http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (devOrigin.test(req.headers.origin || '')) {
      res.setHeader('access-control-allow-origin', req.headers.origin);
      res.setHeader('access-control-allow-headers', 'authorization, content-type');
      res.setHeader('access-control-allow-methods', 'GET, POST, PUT');
      if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
    }
    if (await api(req, res, url)) return;
    const pathname = decodeURIComponent(url.pathname);
    // The app is the front door; the original web workspace (responder training demo) lives at /classic.
    if (pathname === '/' && req.method === 'GET') { res.writeHead(302, { location: '/app/' }); res.end(); return; }
    // Public planning layers built by scripts/build-map-layers.py (not user data).
    if (pathname.startsWith('/map-layers/')) {
      const file = resolve(layerRoot, pathname.slice('/map-layers/'.length));
      if (!file.startsWith(layerRoot + sep) || !['.geojson', '.json'].includes(extname(file))) throw new Error('Invalid path');
      res.writeHead(200, { 'content-type': mime[extname(file)], 'cache-control': 'max-age=3600', 'access-control-allow-origin': '*' });
      res.end(await readFile(file));
      return;
    }
    if (pathname === '/app' || pathname.startsWith('/app/')) {
      const rel = pathname.replace(/^\/app\/?/, '');
      let file = resolve(appRoot, rel || 'index.html');
      if (!file.startsWith(appRoot + sep) || !(await stat(file).catch(() => null))?.isFile()) file = resolve(appRoot, 'index.html');
      res.writeHead(200, { 'content-type': mime[extname(file)] || 'application/octet-stream' });
      res.end(await readFile(file));
      return;
    }
    if (pathname === '/api/hazards' && req.method === 'POST') {
      // Each lookup starts a Python process: cap it per visitor (IP forwarded by the tunnel when present).
      const ip = req.headers['cf-connecting-ip'] || String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress, recent = (hazardHits.get(ip) || []).filter(t => t > Date.now() - 600_000);
      if (recent.length >= 20) throw new Error('Too many lookups. Try again in a few minutes.');
      hazardHits.set(ip, [...recent, Date.now()]);
      let body = '';
      for await (const chunk of req) { body += chunk; if (body.length > 1024) throw new Error('Request too large'); }
      const data = JSON.parse(body);
      const address = typeof data.address === 'string' ? data.address.trim() : '';
      const coordinates = Number.isFinite(data.lat) && Number.isFinite(data.lon) && data.lat >= -90 && data.lat <= 90 && data.lon >= -180 && data.lon <= 180;
      if ((address.length >= 5 && address.length <= 200) === coordinates) throw new Error('Provide one Glendale street address or latitude and longitude.');
      const result = await lookup(address ? { address } : { lat: data.lat, lon: data.lon });
      res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }); res.end(JSON.stringify(result)); return;
    }
    if (req.method !== 'GET') throw new Error('Not found');
    if (pathname !== '/classic' && pathname !== '/fire-lab.html' && pathname !== '/map.html' && !pathname.startsWith('/src/') && !pathname.startsWith('/audio/')) throw new Error('Outside public assets');
    const file = resolve(root, '.' + (pathname === '/classic' ? '/index.html' : pathname));
    if (![resolve(root, 'index.html'), resolve(root, 'fire-lab.html'), resolve(root, 'map.html')].includes(file) && !file.startsWith(srcRoot + sep) && !file.startsWith(audioRoot + sep)) throw new Error('Invalid path');
    const info = await stat(file);
    if (!info.isFile()) throw new Error('Not a file');
    res.writeHead(200, { 'content-type': mime[extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(await readFile(file));
  } catch (error) {
    const api = req.url?.startsWith('/api/');
    res.writeHead(api ? 400 : 404, { 'content-type': api ? 'application/json; charset=utf-8' : 'text/plain; charset=utf-8' });
    res.end(api ? JSON.stringify({ error: error.message || 'Lookup unavailable' }) : 'Not found');
  }
}).listen(port, () => console.log(`FirePath running at http://localhost:${port}`));
