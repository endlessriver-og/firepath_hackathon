import test from 'node:test';
import assert from 'node:assert/strict';
import { buildWorkspace } from '../src/workspace.js';

test('exercise changes fact priority without turning resident facts into verified City data', () => {
  const draft = { pets: 'Two dogs in backyard', access: 'Rear alley', occupants: 'Three people', updatedAt: 'Sep 26' };
  const earthquake = buildWorkspace({ scenario: 'earthquake', source: 'local', profile: { address: 'Example address' }, draft });
  const wildfire = buildWorkspace({ scenario: 'wildfire', source: 'local', profile: { address: 'Example address' }, draft });
  assert.equal(earthquake.facts[0].key, 'occupants');
  assert.equal(wildfire.facts[0].key, 'pets');
  assert.match(wildfire.readout, /Resident entered · unverified/);
  assert.match(wildfire.readout, /EXERCISE ONLY - NO LIVE CALL/);
  assert.doesNotMatch(wildfire.readout, /CAL FIRE wildfire hazard zone mapped/);
});

test('mapped planning status only appears for a linked local property, never for fictional training record', () => {
  const hazards = { wildfire: { status: 'in_zone', matches: [{ attributes: { FHSZ_Description: 'High' } }] } };
  const fictional = buildWorkspace({ source: 'fictional', hazards });
  const local = buildWorkspace({ source: 'local', profile: { lat: 34.1, lon: -118.2 }, hazards });
  assert.equal(fictional.mapLinked, false);
  assert.equal(local.mapLinked, true);
  assert.match(local.readout, /public planning layer, not a live event/);
});

test('empty local draft is unknown rather than a negative finding', () => {
  const brief = buildWorkspace({ source: 'local' });
  assert.equal(brief.facts.length, 0);
  assert.match(brief.readout, /Missing information is unknown/);
});
