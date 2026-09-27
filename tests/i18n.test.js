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
    // City-data card titles (cd.) and explanations (cdx.) keep their English in city-data.js, so they only need a matching card.
    for (const key of Object.keys(dict[lang])) if (!(key in dict.en) && !(/^cdx?\./.test(key) && key.split('.')[1] in cityData)) problems.push(`${lang} has ${key}, English does not`);
    for (const id of Object.keys(cityData)) for (const k of [`cd.${id}`, `cdx.${id}`]) if (!(k in dict[lang])) problems.push(`${lang} missing card text ${k}`);
  }
  assert.deepEqual(problems, []);
});

test('checklist titles cover the same tasks in every language', () => {
  const [first, ...rest] = ['es', 'hy', 'ko'].map(lang => Object.keys(taskTitles[lang]).sort().join(','));
  for (const other of rest) assert.equal(other, first);
});

test('both map pages translate every fixed phrase they pass through tr() or trv()', () => {
  for (const page of ['map.html', 'map3d.html']) {
    const html = readFileSync(new URL(`../${page}`, import.meta.url), 'utf8');
    const TX = JSON.parse(html.split('\n').find(line => line.startsWith('const TX = ')).slice('const TX = '.length).replace(/;\s*$/, ''));
    const phrases = new Set([...html.matchAll(/\btrv?\((['"])((?:(?!\1).)+)\1/g)].map(m => m[2]));
    for (const lang of ['es', 'hy', 'ko']) {
      assert.deepEqual(Object.keys(TX[lang]).sort(), Object.keys(TX.es).sort(), `${page} ${lang} keys`);
      assert.deepEqual([...phrases].filter(p => !(p in TX[lang])), [], `${page} ${lang} missing`);
      for (const [en, value] of Object.entries(TX[lang])) assert.equal(vars(value), vars(en), `${page} ${lang} placeholders in "${en}"`);
    }
  }
});
