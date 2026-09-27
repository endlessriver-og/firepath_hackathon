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
