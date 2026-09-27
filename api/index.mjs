// Vercel entry for the FirePath API: the same routes as server.mjs, with the store in a private
// Vercel Blob and hazard lookups answered by the Python function at /api/gis.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createApi, fetchNwsAlerts } from '../server/api.mjs';
import { openBlobStore } from '../server/blob-store.mjs';
import { serveWithStore } from '../server/serve-store.mjs';
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
  // A git-archive deploy stamps VERSION; a Git-integration build does not, but Vercel exposes the commit.
  version: (() => { let v = ''; try { v = readFileSync(resolve(root, 'VERSION'), 'utf8').trim(); } catch {} if (v && !v.startsWith('$Format')) return v; const sha = process.env.VERCEL_GIT_COMMIT_SHA; return sha ? `${sha} (git)` : v ? 'unstamped' : 'unknown'; })(),
});

const handler = serveWithStore(store, api, { onRequest: req => { origin = `https://${req.headers['x-forwarded-host'] || req.headers.host}`; return new URL(req.url, origin); } });
export default handler;
