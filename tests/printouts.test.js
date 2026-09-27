import test from 'node:test';
import assert from 'node:assert/strict';
import { businessPosterPrintout, householdPlanPrintout, standardPrintout, standardPrintouts } from '../src/printouts.js';

const hazards = { wildfire: { status: 'in_zone', matches: [{ attributes: { FHSZ_Description: 'Very High' } }] }, flood: { status: 'outside' } };
const words = { 'hz.wildfire': { es: 'Incendio forestal' }, 'lvl.Very high': { es: 'Muy alto' } };
const t = k => words[k]?.es ?? k;

test('English sheets carry no draft-translation note', () => {
  for (const { id } of standardPrintouts) {
    const html = standardPrintout(id);
    assert.match(html, /<html lang="en">/);
    assert.doesNotMatch(html, /Traducción|native speaker/);
  }
});

test('translated sheets set the page language and say they are drafts', () => {
  for (const lang of ['es', 'hy', 'ko']) {
    for (const { id } of standardPrintouts) {
      const html = standardPrintout(id, { lang });
      assert.match(html, new RegExp(`<html lang="${lang}">`));
      assert.doesNotMatch(html, /When the shaking starts|For each person|Main breaker/);
    }
  }
  assert.match(standardPrintout('gobag', { lang: 'es' }), /Traducción preliminar/);
});

test('translated custom sheets use the app dictionary for hazard names and levels', () => {
  const home = householdPlanPrintout({ name: 'Dana', address: '1 Main', hazards, household: { members: [{ name: 'Rosa', ageGroup: 'senior', needsHelp: true }] } }, { lang: 'es', t });
  assert.match(home, /Incendio forestal \(Muy alto\)/);
  assert.match(home, /adulto mayor/);
  assert.doesNotMatch(home, /Mapped at this address|older adult|hz\.|lvl\./);
  const biz = businessPosterPrintout({ business: { name: 'Panadería', hazmat: ['propane'] }, address: '1 Main', hazards: null }, { lang: 'es', t: k => (k === 'hz.propane' ? 'Cilindros de propano' : k) });
  assert.match(biz, /Panadería: en una emergencia/);
  assert.match(biz, /Cilindros de propano/);
});

test('an unknown language falls back to English', () => {
  assert.equal(standardPrintout('earthquake', { lang: 'xx' }), standardPrintout('earthquake'));
});

test('Drop, Cover, Hold On uses the same words in the app and on the printed sheet', async () => {
  const { emergencyGuideIn } = await import('../src/playbooks.js');
  const words = { en: [/drop/i, /cover/i, /hold on/i], es: [/agáchese/i, /cúbrase/i, /sujétese/i], hy: [/կռաց/i, /ծածկվ/i, /բռնվ/i], ko: [/엎드리/, /붙잡/] };
  for (const [lang, patterns] of Object.entries(words)) {
    const app = emergencyGuideIn(lang, 'earthquake', { type: 'resident' }).steps[0].text;
    const sheet = standardPrintout('earthquake', { lang });
    for (const p of patterns) {
      assert.match(app, p, `${lang} app step lacks ${p}`);
      assert.match(sheet, p, `${lang} printed sheet lacks ${p}`);
    }
  }
});

test('pet counts read naturally: "2 dogs" in English, "강아지 2마리" in Korean', async () => {
  const { petLabel } = await import('../src/playbooks.js');
  assert.equal(petLabel({ kind: 'dogs', count: 2 }), '2 dogs');
  assert.equal(petLabel({ kind: 'cat', count: 1 }, 'es'), 'cat');
  assert.equal(petLabel({ kind: '강아지', count: 2 }, 'ko'), '강아지 2마리');
});
