import test from 'node:test';
import assert from 'node:assert/strict';
import { contains, edgeMetres, metres, neighborhoodNotes } from '../server/neighborhood.mjs';

const square = { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]], [[0.4, 0.4], [0.6, 0.4], [0.6, 0.6], [0.4, 0.6], [0.4, 0.4]]] };

test('point-in-polygon respects holes and multipolygons', () => {
  assert.equal(contains(square, 0.2, 0.2), true);
  assert.equal(contains(square, 0.5, 0.5), false); // in the hole
  assert.equal(contains({ type: 'MultiPolygon', coordinates: [square.coordinates] }, 0.9, 0.9), true);
  assert.equal(contains(square, 2, 2), false);
});

test('distances are in metres', () => {
  assert.ok(Math.abs(metres(34.2, -118.23, 34.201, -118.23) - 110.5) < 1);
  assert.ok(Math.abs(edgeMetres([[[-118.23, 34.2], [-118.22, 34.2]]], 34.2001, -118.225) - 11) < 1);
});

test('notes only for school zones and historic designation', () => {
  assert.equal(neighborhoodNotes({ schoolZone: null, historicDistrict: null, historicResource: false }).length, 0);
  const notes = neighborhoodNotes({ schoolZone: 'Fremont Elementary', historicDistrict: { name: 'Rossmoyne' }, historicResource: false });
  assert.equal(notes.length, 2);
  assert.match(notes[0], /Fremont Elementary/);
});
