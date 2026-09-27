import test from 'node:test';
import assert from 'node:assert/strict';
import { formatDate, hyDate } from '../src/dates.js';

// Node has full ICU, so its Armenian output is the reference for the fallback Chrome needs.
test('the Armenian date fallback matches full-ICU Armenian for every month', () => {
  for (let m = 0; m < 12; m++) {
    const d = new Date(2026, m, 5, 13, 7);
    assert.equal(hyDate(d, { long: true }), d.toLocaleDateString('hy', { month: 'long', day: 'numeric', year: 'numeric' }));
    assert.equal(hyDate(d, { time: true }), d.toLocaleString('hy', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }));
  }
});

test('dates follow the requested language', () => {
  const d = new Date(2026, 8, 28, 13, 16);
  assert.equal(formatDate(d, 'en', { long: true }), 'September 28, 2026');
  assert.match(formatDate(d, 'ko', { time: true }), /9월 28일/);
  assert.match(formatDate(d, 'hy', { long: true }), /սեպտեմբերի/);
});
