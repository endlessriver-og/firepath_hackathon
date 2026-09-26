import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTasks, describeHazard } from '../src/preparedness.js';

test('FEMA Zone X does not trigger special flood hazard action', () => {
  const flood = { status: 'in_zone', matches: [{ attributes: { FLD_ZONE: 'X', SFHA_TF: 'F' } }] };
  assert.equal(describeHazard('flood', flood).tone, 'outside');
  assert.equal(buildTasks({}, { flood }).some(task => task.id === 'flood'), false);
});

test('mapped special flood area and wildfire add relevant owner or renter actions', () => {
  const hazards = { wildfire: { status: 'in_zone', matches: [{ attributes: { FHSZ_Description: 'High' } }] }, flood: { status: 'in_zone', matches: [{ attributes: { SFHA_TF: 'T', FLD_ZONE: 'A' } }] } };
  const owner = buildTasks({ housing: 'own' }, hazards);
  const renter = buildTasks({ housing: 'rent', pets: true, assistance: true }, hazards);
  assert.match(owner.find(task => task.id === 'wildfire').title, /home hardening/);
  assert.match(renter.find(task => task.id === 'wildfire').title, /building wildfire/);
  for (const id of ['flood', 'pets', 'assistance']) assert.ok(renter.some(task => task.id === id));
});

import { readFileSync } from 'node:fs';
import { nextSteps, summarizePlace } from '../src/preparedness.js';
const civic = JSON.parse(readFileSync(new URL('../src/sample-location.json', import.meta.url)));
const sparr = JSON.parse(readFileSync(new URL('../src/sample-sparr-heights.json', import.meta.url)));

test('place summary separates mapped, outside and unchecked layers', () => {
  assert.deepEqual(summarizePlace(sparr.hazards).mapped.map(item => item.key), ['wildfire', 'liquefaction']);
  assert.equal(summarizePlace(civic.hazards).mapped.length, 0, 'Zone X and unzoned wildfire are not mapped hazards');
  const partial = summarizePlace({ wildfire: { status: 'unavailable', reason: 'timeout' } });
  assert.equal(partial.unknown.length, 7, 'unavailable and missing layers stay unknown, never outside');
});

test('mapped liquefaction adds a ground-hazard step worded for owners and renters', () => {
  assert.match(buildTasks({ housing: 'own' }, sparr.hazards).find(task => task.id === 'ground').title, /your home/);
  assert.match(buildTasks({ housing: 'rent' }, sparr.hazards).find(task => task.id === 'ground').description, /liquefaction/);
  assert.equal(buildTasks({}, civic.hazards).some(task => task.id === 'ground'), false);
});

test('next steps put official alerts, then mapped hazards, first and skip completed work', () => {
  const tasks = buildTasks({ pets: true }, sparr.hazards);
  assert.deepEqual(nextSteps(tasks).map(task => task.id), ['alerts', 'wildfire', 'ground']);
  assert.deepEqual(nextSteps(tasks, { alerts: true, wildfire: true }).map(task => task.id), ['ground', 'pets', 'kit']);
  assert.equal(nextSteps(tasks, Object.fromEntries(tasks.map(task => [task.id, true]))).length, 0);
});

test('seismic layers get plain-language detail instead of GIS metadata notes', () => {
  const inside = describeHazard('liquefaction', sparr.hazards.liquefaction);
  assert.match(inside.detail, /loose, wet soil/);
  assert.doesNotMatch(describeHazard('fault', civic.hazards.fault).detail, /attributes|quadrangle/);
  assert.match(describeHazard('wildfire', civic.hazards.wildfire).detail, /NonWildland/, 'keeps the useful CAL FIRE unzoned note');
});
