import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

// Screens must show text through t(). This scan finds English written straight into the screen code:
// JSX text, text-bearing props and capitalised multi-word string literals. Anything on the allowlist is
// English on purpose (with the reason); anything else is a leak to translate or, deliberately, allowlist.
const ALLOWED = new Set([
  // Brand.
  'FIREPATH', 'FirePath',
  // English source text that is looked up in the translation tables (taskTitles, vq., br., err.).
  'Pack a go bag', 'Make a contact plan', 'Secure heavy items', 'Pack for pets', 'Arrange help and backup power', 'Know your building exits',
  'Plan school pickup', 'Clear combustibles near the building', 'Review wildfire protections', 'Ask about seismic safety', 'Review flood coverage',
  'Practice an alert', 'Review responder notes', 'Set up a staff contact tree', 'Choose an assembly point', 'Make a continuity plan',
  'Check extinguishers and exits', 'Service kitchen suppression', 'Plan help for evacuation', 'Check hazardous materials filing',
  'Do now', 'Check on', 'Before you leave',
  'Ticketed or run by a business', 'Food vendors', 'Cooking or open flame', 'Alcohol served', 'Amplified sound or music', 'Commercial filming',
  'Needs help', 'Wildfire map',
  'Device not connected.', 'Connect the device first.', 'Print this plan',
  // English source text for the "How FirePath connects" page, looked up as sys.<english> in every language.
  'How FirePath connects', 'Data coming in', 'Checked live for each registered address', 'Autocomplete and address matching', 'Public records per address',
  'Would match every order to the exact address', 'Would send consented notes en route and suggest open routes', 'Address and parcel as the shared key',
  'Household and business profiles with consent', 'Playbook engine', 'Turns any alert or emergency into steps for this household',
  'Permit matcher and event packages', 'Out to people and devices', 'Phone and web app', 'Printed sheets on the fridge or break room',
  'Custom plans that work with no power or signal', 'Responder brief',
  'One address-keyed record links public data, your household and your devices, so every alert turns into steps for the people actually there.',
  'FirePath in the middle',
  // Default text in the USB command to the ESP32 device. Its firmware has no display and never shows it
  // (examples/esp32_preparedness only acknowledges and sounds).
  'FirePath test',
  // The judging walkthrough: pitch material, English by design.
  'How FirePath meets the judging criteria', 'Exit walkthrough',
]);
// Data and content modules that hold English source text by design (translated elsewhere or English on purpose).
const SKIP = /^(i18n|printouts|playbooks|readiness|preparedness|permit-catalog|venues|resources|city-data|icons|responder|model|walkthrough)\.js$|^sample/;
const PATTERN = />\s*[←→↗↓]?\s*([A-Z][A-Za-z ,.'’!?-]{5,})\s*[←→↗↓]?\s*<|(?:accessibilityLabel|label|placeholder|title|hint|summary|caption)="([^"]*[A-Za-z]{3,} [A-Za-z]{3,}[^"]*)"|['`]([A-Z][A-Za-z]+(?: [a-z]+){1,}[.!?]?)['`]/g;

test('screens contain no untranslated English beyond the allowlist', () => {
  const dir = new URL('../apps/mobile/src/', import.meta.url);
  const files = [...readdirSync(dir).filter(f => f.endsWith('.js') && !SKIP.test(f)).map(f => new URL(f, dir)), new URL('../apps/mobile/App.js', import.meta.url)];
  const leaks = [];
  for (const file of files) {
    readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
      if (line.trim().startsWith('//')) return;
      for (const m of line.matchAll(PATTERN)) {
        const text = m[1] || m[2] || m[3];
        if (!ALLOWED.has(text.trim())) leaks.push(`${file.pathname.split('/').pop()}:${i + 1} "${text.trim()}"`);
      }
    });
  }
  assert.deepEqual(leaks, []);
});
