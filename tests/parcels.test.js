import test from 'node:test';
import assert from 'node:assert/strict';
import { createParcels, parcelNotes, summarizeParcel } from '../server/parcels.mjs';

test('parcel summary keeps building facts and leaves out assessed values', () => {
  const p = summarizeParcel({ APN: '5615-017-022', SitusFullAddress: '3274 LA CRESCENTA AVE GLENDALE CA 91208', UseType: 'Residential', UseDescription: 'Single', YearBuilt1: '1939', SQFTmain1: 1546, Units1: 1, 'Shape.STArea()': 7629.4, Roll_LandValue: 999999 }, { rings: [[[0, 0], [1, 0], [1, 1], [0, 0]]] });
  assert.equal(p.apn, '5615-017-022');
  assert.equal(p.yearBuilt, 1939);
  assert.equal(p.lotSqft, 7629);
  assert.equal(p.notes.length, 2);
  assert.ok(!JSON.stringify(p).includes('999999'));
});

test('build-year notes only claim what the year supports', () => {
  assert.equal(parcelNotes(2015).length, 0);
  assert.equal(parcelNotes(1995).length, 1);
  assert.equal(parcelNotes(1950, false).length, 1); // retrofit grants are for houses only
  assert.deepEqual(parcelNotes(null), []);
  assert.match(parcelNotes(1995, true, 'ko')[0], /^1995년에 지어져/);
  assert.equal(parcelNotes(1995, true, 'xx')[0], parcelNotes(1995)[0]); // unknown language falls back to English
});

test('a tap on a street falls back to the nearest addressed parcel', async () => {
  const calls = [];
  const fetchImpl = async url => { calls.push(url); const near = url.includes('distance=');
    return { ok: true, json: async () => ({ features: near ? [
      { attributes: { APN: 'far', SitusFullAddress: '2 X ST', CENTER_LAT: 34.2, CENTER_LON: -118.2 } },
      { attributes: { APN: 'near', SitusFullAddress: '1 X ST', CENTER_LAT: 34.1801, CENTER_LON: -118.2271 } },
      { attributes: { APN: 'noaddr', SitusFullAddress: ' ', CENTER_LAT: 34.1807, CENTER_LON: -118.2272 } }] : [] }) }; };
  const parcel = await createParcels({ fetchImpl })(34.1807, -118.2272);
  assert.equal(parcel.apn, 'near');
  assert.equal(calls.length, 2);
});
