import { cp, mkdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const output = resolve(root, 'dist');
await rm(output, { recursive: true, force: true });
await mkdir(resolve(output, 'src'), { recursive: true });
for (const file of ['index.html', 'fire-lab.html']) await cp(resolve(root, file), resolve(output, file));
for (const file of ['app.js', 'prep.css', 'preparedness.js', 'responder.js', 'workspace.js', 'sample-location.json', 'fire-lab.js', 'model.js', 'style.css']) await cp(resolve(root, 'src', file), resolve(output, 'src', file));
console.log('Static FirePath demo built in dist/. Open /?demo=1 to start the tour.');
