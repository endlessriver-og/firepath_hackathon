import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { searchPermits } from '../src/permit-catalog.js';

const catalog = JSON.parse(readFileSync(new URL('../src/glendale-permits.json', import.meta.url)));
const top = (q, audience) => searchPermits(catalog, q, { audience })[0]?.name || '';

test('permit search finds the same City permit from everyday words in all four languages', () => {
  const cases = [
    [/Re-Roof/, ['new roof', 'techo nuevo', 'նոր տանիք', '지붕 교체']],
    [/Solar/, ['solar panels', 'paneles solares', 'արևային վահանակներ', '태양광 설치']],
    [/Tree/, ['remove an oak tree', 'quitar un roble', 'կաղնի ծառ հեռացնել', '참나무 제거']],
    [/Street Use/, ['block party', 'fiesta de la cuadra', 'փողոցային տոն', '동네 파티']],
    [/Pool/i, ['pool', 'alberca', 'լողավազան', '수영장']],
    [/Plumbing/i, ['water heater', 'calentador de agua', 'ջրատաքացուցիչ', '온수기 교체']],
  ];
  for (const [expected, queries] of cases) for (const q of queries) assert.match(top(q), expected, `"${q}" found ${top(q) || 'nothing'}`);
});

test('translated words do not leak into English queries', () => {
  // "called" contains the Spanish "calle"; it must not pull in street-use permits.
  assert.equal(searchPermits(catalog, 'called about it').length, 0);
});

test('every example in the permit search placeholder finds a permit, in every language', () => {
  const i18n = readFileSync(new URL('../apps/mobile/src/i18n.js', import.meta.url), 'utf8');
  const examples = [...i18n.matchAll(/'pz\.ex(?:Home|Biz)': '([^']*)'/g)].map(m => m[1]);
  assert.equal(examples.length, 8);
  for (const line of examples) {
    const words = line.replace(/^(e\.g\.,|p\. ej\.,|օր\.՝|예:)\s*/, '').split(/,\s*/);
    for (const w of words) assert.ok(searchPermits(catalog, w).length, `"${w}" finds nothing`);
  }
});
