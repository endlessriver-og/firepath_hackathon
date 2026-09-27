import { copyFileSync, mkdirSync } from 'node:fs';
mkdirSync('apps/mobile/src', { recursive: true });
for (const file of ['preparedness.js', 'readiness.js', 'city-data.js', 'playbooks.js', 'permit-catalog.js', 'resources.js', 'printouts.js', 'venues.js', 'dates.js', 'sample-location.json', 'sample-sparr-heights.json']) copyFileSync(`src/${file}`, `apps/mobile/src/${file}`);
