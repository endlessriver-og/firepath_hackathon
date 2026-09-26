import { readFileSync } from 'node:fs';

// Combined planning index (built by scripts/build-map-layers.py): nearest ~150 m cell to a point.
export function createCombinedIndex(file) {
  let combined;
  return function combinedIndex(lat, lon) {
    try { combined ??= JSON.parse(readFileSync(file, 'utf8')); } catch { return null; }
    let best = null, bestD = Infinity;
    for (const cell of combined.cells) { const d = (cell[0] - lat) ** 2 + ((cell[1] - lon) * 0.83) ** 2; if (d < bestD) { bestD = d; best = cell; } }
    const inCell = best && Math.sqrt(bestD) * 111_000 <= combined.grid_m;
    return { score: inCell ? best[2] : 0, max: combined.max, parts: inCell ? best[3].split(',').map(code => ({ label: combined.labels[code], points: combined.weights[code] })) : [] };
  };
}
