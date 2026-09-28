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
  assert.match(home, /persona mayor/);
  assert.doesNotMatch(home, /Mapped at this address|older adult|hz\.|lvl\./);
  const biz = businessPosterPrintout({ business: { name: 'Panadería', hazmat: ['propane'] }, address: '1 Main', hazards: null }, { lang: 'es', t: k => (k === 'hz.propane' ? 'Cilindros de propano' : k) });
  assert.match(biz, /Panadería: en una emergencia/);
  assert.match(biz, /Cilindros de propano/);
});

test('an unknown language falls back to English', () => {
  assert.equal(standardPrintout('earthquake', { lang: 'xx' }), standardPrintout('earthquake'));
});

test('Drop, Cover, Hold On uses the same words in the app, the printed sheet and the business poster', async () => {
  const { emergencyGuideIn } = await import('../src/playbooks.js');
  const words = { en: [/drop/i, /cover/i, /hold on/i], es: [/agáchese/i, /cúbrase/i, /sujétese/i], hy: [/կռաց/i, /ծածկվ/i, /բռնվ/i], ko: [/엎드리/, /감싸/, /붙잡/] };
  for (const [lang, patterns] of Object.entries(words)) {
    const app = emergencyGuideIn(lang, 'earthquake', { type: 'resident' }).steps[0].text;
    const sheet = standardPrintout('earthquake', { lang });
    const poster = businessPosterPrintout({ business: { name: 'Test' } }, { lang });
    for (const p of patterns) {
      assert.match(app, p, `${lang} app step lacks ${p}`);
      assert.match(sheet, p, `${lang} printed sheet lacks ${p}`);
      assert.match(poster, p, `${lang} business poster lacks ${p}`);
    }
  }
});

test('pet counts read naturally: "2 dogs" in English, "강아지 2마리" in Korean', async () => {
  const { petLabel } = await import('../src/playbooks.js');
  assert.equal(petLabel({ kind: 'dogs', count: 2 }), '2 dogs');
  assert.equal(petLabel({ kind: 'cat', count: 1 }, 'es'), 'cat');
  assert.equal(petLabel({ kind: '강아지', count: 2 }, 'ko'), '강아지 2마리');
});

test('Korean object particle follows the last syllable', async () => {
  const { eul } = await import('../src/playbooks.js');
  assert.equal(eul('강아지 2마리'), '강아지 2마리를');
  assert.equal(eul('고양이 한 마리와 강아지'), '고양이 한 마리와 강아지를');
  assert.equal(eul('물고기'), '물고기를');
  assert.equal(eul('닭'), '닭을');
  assert.equal(eul('Mia'), 'Mia를');
  assert.equal(eul('John'), 'John을');
  assert.equal(eul('2'), '2을(를)');
});

test('Armenian endings attach to Armenian-script names, and typed places are never suffixed', async () => {
  const { hyDat, hyDef, buildPlaybook } = await import('../src/playbooks.js');
  assert.equal(hyDat('Ռոզա'), 'Ռոզային');
  assert.equal(hyDat('Արմեն'), 'Արմենին');
  assert.equal(hyDat('Rosa'), 'Rosa‑ին', 'non-breaking hyphen');
  assert.equal(hyDat('ՌՈԶԱ'), 'ՌՈԶԱյին', 'capitals');
  assert.equal(hyDef('Ռոզա'), 'Ռոզան');
  assert.equal(hyDef('Արմեն'), 'Արմենը');
  const household = { meetNear: 'Անկյունի փոստարկղը', meetFar: 'Մոնտրոզի գրադարանը', contact: 'Լյուսիա մորաքույրը', members: [{ name: 'Ռոզա', ageGroup: 'senior', needsHelp: true }] };
  const text = buildPlaybook('Red Flag Warning', { household, lang: 'hy' }).groups.flatMap(g => g.steps).map(s => s.text || s).join('\n');
  assert.doesNotMatch(text, /փոստարկղը-ում|գրադարանը-ում|մորաքույրը-ին/);
  assert.match(text, /Ռոզային/);
});

test('a hazard map that could not be checked is never printed as a clear map', () => {
  const hazards = { wildfire: { status: 'unavailable' }, flood: { status: 'unavailable' } };
  const sheet = householdPlanPrintout({ name: 'T', address: '1 Main', hazards, household: {} });
  assert.match(sheet, /could not be checked/);
  assert.match(householdPlanPrintout({ name: 'T', address: '1 Main', hazards, household: {} }, { lang: 'ko' }), /확인하지 못했습니다/);
});

test('every Emergency situation has steps in every language, for households and businesses', async () => {
  const { emergencyGuideIn, emergencySituations } = await import('../src/playbooks.js');
  const missing = [];
  for (const lang of ['es', 'hy', 'ko']) for (const s of emergencySituations) for (const type of ['resident', 'business']) {
    const g = emergencyGuideIn(lang, s.id, { type, household: {}, business: {} });
    if (!g?.translated || !g.steps.length) missing.push(`${lang}:${s.id}:${type}`);
  }
  assert.deepEqual(missing, []);
});
