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
console.log('Static FirePath demo built in dist/. Open /?demo=1 for the tour, or /app/ for the resident phone app.');
