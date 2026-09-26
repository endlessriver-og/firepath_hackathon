import test from 'node:test';
import assert from 'node:assert/strict';
import { buildResponderSummary } from '../src/responder.js';

test('responder preview labels resident facts and unverified parcel, with no CAD claim', () => {
  const text = buildResponderSummary({ address: 'Sample address' }, { parcelId: '123-456', pets: 'Two dogs in backyard', updatedAt: 'Sep 26' });
  assert.match(text, /NOT CONNECTED TO DISPATCH OR CAD/);
  assert.match(text, /Parcel reference \(resident entered, unverified\): 123-456/);
  assert.match(text, /Animals \/ where they may be \(resident reported\): Two dogs in backyard/);
  assert.match(text, /City permit fire zone: not connected/);
});

test('responder preview does not claim absence from missing facts or unverified zones', () => {
  const text = buildResponderSummary({}, {}, { flood: { status: 'in_zone', matches: [{ attributes: { FLD_ZONE: 'X', SFHA_TF: 'F' } }] } });
  assert.match(text, /Location: not set/);
  assert.doesNotMatch(text, /No pets|No assistance|FEMA special flood hazard area mapped/);
});
