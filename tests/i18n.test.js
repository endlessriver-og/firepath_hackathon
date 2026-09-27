import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cityData } from '../src/city-data.js';

// i18n.js also holds JSX, so read just its plain object literals instead of importing it.
const src = readFileSync(new URL('../apps/mobile/src/i18n.js', import.meta.url), 'utf8');
const literal = (start, end) => new Function(`return ${src.slice(src.indexOf(start) + start.length, src.indexOf(end)).trim().replace(/;$/, '')}`)();
const dict = literal('const dict = ', '// Short checklist titles');
const taskTitles = literal('export const taskTitles = ', 'export const translate');
const vars = s => [...String(s).matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort().join(',');

test('every English phrase exists in Spanish, Armenian and Korean with the same placeholders', () => {
  const problems = [];
  for (const lang of ['es', 'hy', 'ko']) {
    for (const [key, en] of Object.entries(dict.en)) {
      const value = dict[lang][key];
      if (value === undefined) problems.push(`${lang} missing ${key}`);
      else if (vars(value) !== vars(en)) problems.push(`${lang} ${key}: placeholders {${vars(value)}} vs {${vars(en)}}`);
    }
    // City-data card titles keep their English in city-data.js, so they only need a matching card.
    for (const key of Object.keys(dict[lang])) if (!(key in dict.en) && !(key.startsWith('cd.') && key.slice(3) in cityData)) problems.push(`${lang} has ${key}, English does not`);
    for (const id of Object.keys(cityData)) if (!(`cd.${id}` in dict[lang])) problems.push(`${lang} missing card title cd.${id}`);
  }
  assert.deepEqual(problems, []);
});

test('checklist titles cover the same tasks in every language', () => {
  const [first, ...rest] = ['es', 'hy', 'ko'].map(lang => Object.keys(taskTitles[lang]).sort().join(','));
  for (const other of rest) assert.equal(other, first);
});
