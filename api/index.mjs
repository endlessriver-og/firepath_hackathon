// Vercel entry for the FirePath API: the same routes as server.mjs, with the store in a private
// Vercel Blob and hazard lookups answered by the Python function at /api/gis.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createApi, fetchNwsAlerts } from '../server/api.mjs';
import { openBlobStore } from '../server/blob-store.mjs';
import { createCombinedIndex } from '../server/combined.mjs';
import { createGeocoder } from '../server/geocode.mjs';
import { createCityRecords } from '../server/city-records.mjs';
import { createParcels } from '../server/parcels.mjs';
import { createNeighborhood } from '../server/neighborhood.mjs';

const root = resolve(import.meta.dirname, '..');
const store = openBlobStore();
let origin = '';

async function lookupHazards(payload) {
  const res = await fetch(`${origin}/api/gis`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-firepath-internal': process.env.FIREPATH_INTERNAL_KEY || '' }, body: JSON.stringify(payload), signal: AbortSignal.timeout(45_000) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'GIS lookup is unavailable.');
  return data;
}

const api = createApi({
  store, lookupHazards, fetchAlerts: fetchNwsAlerts, geocoder: createGeocoder(),
  combinedIndex: createCombinedIndex(resolve(root, 'data/map-layers/combined.json')),
  cityRecords: createCityRecords(), parcelAt: createParcels(), neighborhoodAt: createNeighborhood({ layerRoot: resolve(root, 'data/map-layers') }),
  permitCatalog: JSON.parse(readFileSync(resolve(root, 'src/glendale-permits.json'), 'utf8')),
  demoMailbox: process.env.FIREPATH_DEMO_MAILBOX !== '0',
  version: (() => { try { const v = readFileSync(resolve(root, 'VERSION'), 'utf8').trim(); return v.startsWith('$Format') ? 'unstamped' : v; } catch { return 'unknown'; } })(),
});

export default async function handler(req, res) {
  origin = `https://${req.headers['x-forwarded-host'] || req.headers.host}`;
  const url = new URL(req.url, origin);
  try { await store.load(); }
  catch (error) { console.error('store load failed', error); res.writeHead(503, { 'content-type': 'application/json' }); res.end(JSON.stringify({ error: 'FirePath storage is unavailable. Try again in a moment.' })); return; }
  // Persist any change before the response goes out, so the next request (maybe on another instance) sees it.
  const end = res.end.bind(res);
  let finished;
  res.end = (...args) => { finished = store.flush().catch(error => console.error('store flush failed', error)).then(() => end(...args)); return res; };
  if (await api(req, res, url)) { await finished; return; }
  res.end = end;
  res.writeHead(404, { 'content-type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
}
