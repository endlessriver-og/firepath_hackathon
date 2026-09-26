// Prototype persistence: one JSON file on the demo server (default data/firepath-dev.json, gitignored).
// Not a production database: no encryption at rest, no multi-process locking, no backups.
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

export function openStore(file) {
  let data = { users: {}, sessions: {} };
  try { data = { ...data, ...JSON.parse(readFileSync(file, 'utf8')) }; } catch {}
  return {
    data,
    save() {
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(`${file}.tmp`, JSON.stringify(data, null, 1), { mode: 0o600 });
      renameSync(`${file}.tmp`, file);
    },
  };
}
