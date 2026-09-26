import { copyFileSync, mkdirSync } from 'node:fs';
mkdirSync('apps/mobile/src', { recursive: true });
for (const file of ['preparedness.js', 'sample-location.json', 'sample-sparr-heights.json']) copyFileSync(`src/${file}`, `apps/mobile/src/${file}`);
