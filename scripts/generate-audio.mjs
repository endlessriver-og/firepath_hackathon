import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { rooms, computeRoutes, guidance } from '../src/model.js';

// Deliberately generates only the three verified demo states. One file per
// complete phrase means a hazard change never waits for remote TTS.
const language = process.argv.includes('--spanish') ? 'es' : 'en';
const generate = process.argv.includes('--generate');
const scenarios = [
  { blocked: [], drill: true },
  { blocked: ['KITCHEN'], drill: false },
  { blocked: ['KITCHEN', 'WEST_HALL'], drill: false }
];
const records = scenarios.flatMap(s => {
  const routes = computeRoutes(s.blocked);
  return rooms.map(room => guidance(room, routes[room], { language, drill: s.drill, blocked: s.blocked }));
});
const messages = [...new Set(records.map(record => record.text))];

console.log(`${messages.length} fixed ${language} phrases for the demo.`);
if (!generate) {
  console.log('Dry run. Add --generate to request and save ElevenLabs audio.');
  process.exit(0);
}

const key = process.env.ELEVENLABS_API_KEY;
const voice = process.env.ELEVENLABS_VOICE_ID;
if (!key || !voice) throw new Error('Set ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID in your shell. Never put them in browser code.');

const dir = resolve(import.meta.dirname, '../audio');
await mkdir(dir, { recursive: true });
let manifest = {};
try { manifest = JSON.parse(await readFile(resolve(dir, 'manifest.json'), 'utf8')); }
catch { /* First language generated in this folder. */ }
let deviceManifest = {};
try { deviceManifest = JSON.parse(await readFile(resolve(dir, 'device-manifest.json'), 'utf8')); }
catch { /* First language generated in this folder. */ }
for (const [index, text] of messages.entries()) {
  const hash = createHash('sha256').update(text).digest('hex').slice(0, 16);
  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voice)}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, model_id: 'eleven_multilingual_v2' })
  });
  if (!response.ok) throw new Error(`ElevenLabs returned HTTP ${response.status} for clip ${index + 1}. Stopping without updating the manifest.`);
  await writeFile(resolve(dir, `${hash}.mp3`), Buffer.from(await response.arrayBuffer()));
  manifest[text] = `./audio/${hash}.mp3`;
  for (const record of records.filter(record => record.text === text)) deviceManifest[`${language}:${record.id}`] = `${hash}.mp3`;
  console.log(`Saved clip ${index + 1}/${messages.length}`);
}
await writeFile(resolve(dir, 'manifest.json'), JSON.stringify(manifest, null, 2));
await writeFile(resolve(dir, 'device-manifest.json'), JSON.stringify(deviceManifest, null, 2));
console.log('Audio cached locally. Restart or refresh FirePath to use it.');
