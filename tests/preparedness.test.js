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
