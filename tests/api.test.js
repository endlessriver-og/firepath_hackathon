import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createApi } from '../server/api.mjs';

const sparr = JSON.parse(readFileSync(new URL('../src/sample-sparr-heights.json', import.meta.url)));

function setup({ lookup = async () => sparr, alerts = async () => [] } = {}) {
  const store = { data: { users: {}, sessions: {} }, saves: 0, save() { this.saves += 1; } };
  const handle = createApi({ store, lookupHazards: lookup, fetchAlerts: alerts });
  async function call(method, path, body, token) {
    const req = { method, headers: token ? { authorization: `Bearer ${token}` } : {}, async *[Symbol.asyncIterator]() { if (body) yield JSON.stringify(body); } };
    const res = { writeHead(status) { this.status = status; }, end(text) { this.body = JSON.parse(text); } };
    await handle(req, res, new URL(path, 'http://localhost'));
    return res;
  }
  return { store, call };
}

async function signup(call, email = 'resident@example.test') {
  const res = await call('POST', '/api/account/signup', { email, password: 'correct-horse', name: 'Test Resident' });
  assert.equal(res.status, 201);
  return res.body.token;
}

test('signup stores a password hash and a hashed session, never the raw secrets', async () => {
  const { store, call } = setup();
  const token = await signup(call);
  const saved = JSON.stringify(store.data);
  assert.doesNotMatch(saved, /correct-horse/);
  assert.equal(saved.includes(token), false);
  assert.equal((await call('GET', '/api/me', null, token)).body.user.name, 'Test Resident');
  assert.equal((await call('GET', '/api/me', null, 'forged')).status, 401);
  assert.equal((await call('POST', '/api/account/signup', { email: 'RESIDENT@example.test', password: 'another-pass', name: 'X' })).status, 409);
});

test('login rejects wrong passwords and locks out after five failures', async () => {
  const { call } = setup();
  await signup(call);
  for (let i = 0; i < 5; i++) assert.equal((await call('POST', '/api/account/login', { email: 'resident@example.test', password: 'wrong-password' })).status, 401);
  assert.equal((await call('POST', '/api/account/login', { email: 'resident@example.test', password: 'correct-horse' })).status, 429);
});

test('address registration stores the matched address and hazards, marked matched not verified', async () => {
  const { call } = setup();
  const token = await signup(call);
  const res = await call('POST', '/api/me/address', { address: '1613 Glencoe Way' }, token);
  assert.equal(res.body.address.text, '1613 GLENCOE WAY, GLENDALE, CA, 91208');
  assert.equal(res.body.address.verified, 'matched');
  assert.ok(res.body.recommendations.some(r => r.id === 'zone0'), 'mapped wildfire adds the 5-foot zone step');
  const outside = setup({ lookup: async () => ({ location: { in_city: false }, hazards: {} }) });
  const other = await signup(outside.call);
  assert.equal((await outside.call('POST', '/api/me/address', { address: '1 Main St, Pasadena' }, other)).status, 422);
});

test('mailed-code verification: wrong codes count down, right code verifies, codes are single use', async () => {
  const { call } = setup();
  const token = await signup(call);
  await call('POST', '/api/me/address', { address: '1613 Glencoe Way' }, token);
  const { code } = (await call('POST', '/api/me/address/mail', null, token)).body.demoMailbox;
  assert.match(code, /^\d{6}$/);
  const wrong = await call('POST', '/api/me/address/verify', { code: code === '000000' ? '111111' : '000000' }, token);
  assert.equal(wrong.status, 400);
  assert.match(wrong.body.error, /4 tries left/);
  const ok = await call('POST', '/api/me/address/verify', { code }, token);
  assert.equal(ok.body.address.verified, 'mail');
  assert.ok(ok.body.readiness.badges.find(b => b.id === 'verified').earned);
  assert.equal((await call('POST', '/api/me/address/verify', { code }, token)).status, 400);
});

test('household facts are bounded, pets personalise steps, and the responder brief states verification and consent', async () => {
  const { call } = setup();
  const token = await signup(call);
  await call('POST', '/api/me/address', { address: '1613 Glencoe Way' }, token);
  const res = await call('PUT', '/api/me/household', { housing: 'rent', homeType: 'house', members: [{ name: 'Ana', ageGroup: 'child' }, { name: 'Lou', ageGroup: 'senior', needsHelp: true }, { name: '' }], pets: [{ kind: 'dog', count: 2, where: 'backyard' }, { kind: '' }], access: 'x'.repeat(500), shareWithResponders: true }, token);
  assert.equal(res.body.household.pets.length, 1);
  assert.equal(res.body.household.access.length, 140);
  assert.match(res.body.recommendations.find(r => r.id === 'pets').description, /2 dog/);
  const brief = (await call('GET', '/api/me/responder', null, token)).body;
  assert.match(brief.brief, /Address status: matched to a City address point; not verified/);
  assert.match(brief.brief, /2 dog \(backyard\)/);
  assert.match(brief.brief, /3 people: 1 adult, 1 child, 1 older adult; 1 may need help leaving/);
  assert.doesNotMatch(brief.brief, /Ana|Lou/, 'names stay out of the responder brief');
  assert.ok(res.body.recommendations.some(r => r.id === 'kids'));
  assert.ok(res.body.recommendations.some(r => r.id === 'assistance'));
  assert.equal(brief.connected, false);
});

test('recommendations are queryable and completing steps raises the readiness score', async () => {
  const { call } = setup();
  const token = await signup(call);
  await call('POST', '/api/me/address', { address: '1613 Glencoe Way' }, token);
  const before = (await call('GET', '/api/me', null, token)).body.readiness.score;
  const after = (await call('PUT', '/api/me/tasks', { id: 'kit', done: true }, token)).body.readiness;
  assert.ok(after.score > before);
  assert.ok(after.badges.find(b => b.id === 'kit').earned);
  const wildfire = (await call('GET', '/api/me/recommendations?category=wildfire', null, token)).body.results.map(r => r.id);
  assert.deepEqual(wildfire.sort(), ['wildfire', 'zone0']);
  assert.deepEqual((await call('GET', '/api/me/recommendations?q=furniture', null, token)).body.results.map(r => r.id), ['quake']);
  assert.deepEqual((await call('GET', '/api/me/recommendations?status=done', null, token)).body.results.map(r => r.id), ['kit']);
  await call('PUT', '/api/me/household', { pets: [{ kind: 'dog', count: 1 }] }, token);
  assert.ok((await call('GET', '/api/me/recommendations?q=pets', null, token)).body.results.some(r => r.id === 'pets'), 'plural query matches singular text');
  assert.equal((await call('PUT', '/api/me/tasks', { id: 'not-a-step', done: true }, token)).status, 404);
});

test('permit guide adds hazard-zone and renter notes and never claims to submit', async () => {
  const { call } = setup();
  const token = await signup(call);
  await call('POST', '/api/me/address', { address: '1613 Glencoe Way' }, token);
  await call('PUT', '/api/me/household', { housing: 'rent', homeType: 'house' }, token);
  const guide = (await call('POST', '/api/me/permits/guide', { type: 'addition', description: 'Add a bedroom' }, token)).body;
  assert.ok(guide.notes.some(n => /Chapter 7A/.test(n)));
  assert.ok(guide.notes.some(n => /liquefaction/.test(n)));
  assert.ok(guide.notes.some(n => /owner/.test(n)));
  assert.match(guide.summary, /Not a City submission/);
  assert.equal((await call('POST', '/api/me/permits/guide', { type: 'rocket' }, token)).status, 404);
});

test('alerts come only from the injected official source and fail closed', async () => {
  const nws = [{ id: 'a1', event: 'Red Flag Warning', severity: 'Severe' }];
  const ok = setup({ alerts: async () => nws });
  const token = await signup(ok.call);
  assert.equal((await ok.call('GET', '/api/me/alerts', null, token)).body.alerts.length, 0, 'no address, no alerts');
  await ok.call('POST', '/api/me/address', { address: '1613 Glencoe Way' }, token);
  const got = (await ok.call('GET', '/api/me/alerts', null, token)).body.alerts;
  assert.deepEqual(got.map(({ playbook, ...a }) => a), nws);
  assert.equal(got[0].playbook.kind, 'fire');
  const down = setup({ alerts: async () => { throw new Error('offline'); } });
  const t2 = await signup(down.call);
  await down.call('POST', '/api/me/address', { address: '1613 Glencoe Way' }, t2);
  const res = (await down.call('GET', '/api/me/alerts', null, t2)).body;
  assert.equal(res.unavailable, true);
  assert.equal(res.alerts.length, 0);
});

test('business accounts get their own profile, steps, badges, permits and responder brief', async () => {
  const { call } = setup();
  assert.equal((await call('POST', '/api/account/signup', { email: 'x@example.test', password: 'correct-horse', name: 'Sam', type: 'business' })).status, 400, 'business needs a name and type');
  const res = await call('POST', '/api/account/signup', { email: 'owner@example.test', password: 'correct-horse', name: 'Sam Owner', type: 'business', businessName: 'Glencoe Bakery', businessKind: 'restaurant' });
  assert.equal(res.body.business.name, 'Glencoe Bakery');
  const token = res.body.token;
  assert.equal(res.body.user.type, 'business');
  await call('POST', '/api/me/address', { address: '1613 Glencoe Way' }, token);
  assert.equal((await call('PUT', '/api/me/household', { housing: 'own' }, token)).status, 200, 'household route stays harmless');
  const me = (await call('PUT', '/api/me/business', { name: 'Glencoe Bakery', kind: 'restaurant', employees: 12, visitors: 40, hazmat: ['propane', 'rocket-fuel'], sprinklers: 'yes', contactName: 'Sam', contactPhone: '818-555-0100', shareWithResponders: true }, token)).body;
  assert.deepEqual(me.business.hazmat, ['propane']);
  const ids = me.recommendations.map(r => r.id);
  for (const id of ['contacts', 'continuity', 'hood', 'hmbp', 'zone0', 'ground']) assert.ok(ids.includes(id), id);
  assert.ok(me.readiness.badges.some(b => b.id === 'hazmat'));
  assert.equal((await call('PUT', '/api/me/tasks', { id: 'hmbp', done: true }, token)).body.readiness.badges.find(b => b.id === 'hazmat').earned, true);
  const brief = (await call('GET', '/api/me/responder', null, token)).body.brief;
  assert.match(brief, /12 staff, up to 40 visitors/);
  assert.match(brief, /Propane/);
  const guide = (await call('POST', '/api/me/permits/guide', { type: 'hmbp' }, token)).body;
  assert.match(guide.summary, /Business: Glencoe Bakery/);
  const resident = await signup(call, 'r@example.test');
  assert.equal((await call('PUT', '/api/me/business', { name: 'x' }, resident)).status, 400);
});

test('address step uses the City geocoder: suggestions, did-you-mean, street-only and coordinate lookup', async () => {
  let lookedUp = null;
  const geocoder = {
    suggest: async q => [{ text: `1613 GLENCOE WAY, GLENDALE, CA, 91208`, magicKey: 'k1' }].filter(() => q.length >= 3),
    resolve: async (text, key) => {
      if (/^613 broadway$/i.test(text)) throw Object.assign(new Error('ambiguous'), { candidates: ['613 E BROADWAY, GLENDALE, 91205', '613 W BROADWAY, GLENDALE, 91204'] });
      if (/^glencoe way$/i.test(text)) throw Object.assign(new Error('street'), { streetOnly: true });
      if (/fake/i.test(text)) return null;
      return { address: '1613 GLENCOE WAY, GLENDALE, CA, 91208', lat: 34.199, lon: -118.2306, score: key ? 100 : 86 };
    },
  };
  const store = { data: { users: {}, sessions: {} }, save() {} };
  const handle = createApi({ store, geocoder, fetchAlerts: async () => [], lookupHazards: async p => { lookedUp = p; return { location: { lat: p.lat, lon: p.lon, in_city: true, matched_address: null }, hazards: sparr.hazards }; } });
  const call = async (method, path, body, token) => { const req = { method, headers: token ? { authorization: `Bearer ${token}` } : {}, async *[Symbol.asyncIterator]() { if (body) yield JSON.stringify(body); } }; const res = { writeHead(s) { this.status = s; }, end(t) { this.body = JSON.parse(t); } }; await handle(req, res, new URL(path, 'http://localhost')); return res; };
  const token = await signup(call);
  assert.equal((await call('GET', '/api/address/suggest?q=1613 glenc', null, token)).body.suggestions[0].magicKey, 'k1');
  assert.equal((await call('GET', '/api/address/suggest?q=x', null)).status, 401, 'suggestions need a session');
  const ambiguous = await call('POST', '/api/me/address', { address: '613 Broadway' }, token);
  assert.equal(ambiguous.status, 422);
  assert.equal(ambiguous.body.candidates.length, 2);
  assert.match((await call('POST', '/api/me/address', { address: 'Glencoe Way' }, token)).body.error, /house number/);
  assert.match((await call('POST', '/api/me/address', { address: '1 Fake St' }, token)).body.error, /No Glendale address/);
  const ok = await call('POST', '/api/me/address', { address: '1613 Glencoe' }, token);
  assert.equal(ok.body.address.text, '1613 GLENCOE WAY, GLENDALE, CA, 91208');
  assert.deepEqual(lookedUp, { lat: 34.199, lon: -118.2306 }, 'hazards are checked by coordinates, not by re-geocoding');
});

import { normalizeAddress } from '../server/geocode.mjs';
test('address normalization abbreviates words and strips city, state and ZIP', () => {
  assert.equal(normalizeAddress('1601 West Mountain Street, Glendale, CA 91201'), '1601 W Mountain St');
  assert.equal(normalizeAddress('613 east broadway'), '613 E broadway');
  assert.equal(normalizeAddress('2211 N. Verdugo Road, Montrose'), '2211 N Verdugo Rd');
});

test('alert playbooks personalise steps and live alerts carry them; drills are labelled', async () => {
  const { call } = setup({ alerts: async () => [{ id: 'rf1', event: 'Red Flag Warning', severity: 'Severe' }] });
  const token = await signup(call);
  await call('POST', '/api/me/address', { address: '1613 Glencoe Way' }, token);
  await call('PUT', '/api/me/household', { members: [{ name: 'Rosa', ageGroup: 'senior' }, { name: 'Mia', ageGroup: 'child' }], pets: [{ kind: 'dogs', count: 2 }], meetNear: 'Corner mailbox' }, token);
  const live = (await call('GET', '/api/me/alerts', null, token)).body.alerts[0].playbook;
  const text = JSON.stringify(live);
  assert.equal(live.kind, 'fire');
  for (const needle of ['CAL FIRE High zone', '2 dogs', 'Rosa may need help leaving', 'school pickup plan for Mia', 'Corner mailbox', 'does not choose evacuation routes']) assert.ok(text.includes(needle), needle);
  const drill = (await call('GET', '/api/me/playbook?event=Flash%20Flood%20Warning', null, token)).body;
  assert.equal(drill.drill, true);
  assert.ok(JSON.stringify(drill).includes('Never walk or drive through moving water'));
  assert.equal((await call('GET', '/api/me/playbook?event=Zombie%20Warning', null, token)).status, 400);
  assert.ok((await call('PUT', '/api/me/tasks', { id: 'drill', done: true }, token)).body.readiness.badges.find(b => b.id === 'drill').earned);
});

import { buildPlaybook, drillEvents } from '../src/playbooks.js';
test('business playbook uses assembly point, hazmat and staff count', () => {
  const pb = buildPlaybook('Red Flag Warning', { type: 'business', business: { employees: 12, assembly: 'NE lot', hazmat: ['propane'], hazmatNote: 'rear cage', contactName: 'Sam' }, hazards: sparr.hazards });
  const text = JSON.stringify(pb);
  for (const needle of ['12 staff', 'NE lot', 'rear cage', 'Sam', 'CAL FIRE High zone']) assert.ok(text.includes(needle), needle);
  assert.equal(buildPlaybook('Tornado Warning').kind, 'general');
});

test('public address check works without an account, stores nothing, and is rate limited', async () => {
  const { store, call } = setup();
  const res = await call('POST', '/api/public/check', { address: '1613 Glencoe Way' });
  assert.equal(res.status, 200);
  assert.equal(res.body.address, '1613 GLENCOE WAY, GLENDALE, CA, 91208');
  assert.equal(res.body.layers.find(l => l.key === 'wildfire').label, 'High');
  assert.equal(res.body.layers.find(l => l.key === 'liquefaction').level, 'zone');
  assert.ok(res.body.preview.some(p => p.id === 'wildfire'));
  assert.equal(Object.keys(store.data.users).length, 0);
  assert.doesNotMatch(JSON.stringify(store.data), /GLENCOE/, 'the checked address is not persisted');
  let status;
  for (let i = 0; i < 20; i++) status = (await call('POST', '/api/public/check', { address: '1613 Glencoe Way' })).status;
  assert.equal(status, 429);
});

import { readFileSync as readCatalog } from 'node:fs';
test('permit catalog search and event plan use the City catalog and the address hazards', async () => {
  const permitCatalog = JSON.parse(readCatalog(new URL('../src/glendale-permits.json', import.meta.url)));
  const store = { data: { users: {}, sessions: {} }, save() {} };
  const handle = createApi({ store, permitCatalog, fetchAlerts: async () => [], lookupHazards: async () => sparr });
  const call = async (method, path, body, token) => { const req = { method, headers: token ? { authorization: `Bearer ${token}` } : {}, async *[Symbol.asyncIterator]() { if (body) yield JSON.stringify(body); } }; const res = { writeHead(s) { this.status = s; }, end(t) { this.body = JSON.parse(t); } }; await handle(req, res, new URL(path, 'http://localhost')); return res; };
  const search = (await call('GET', '/api/permits/search?q=block%20party')).body;
  assert.equal(search.permits[0].name, 'PW - ROW - Street Use');
  assert.ok(permitCatalog.permitTypes.length > 50, 'crawled catalog present');
  assert.deepEqual((await call('GET', '/api/permits/search?q=bakery&audience=business')).body.licenses, ['BAKERY PRODUCTS']);
  const token = await signup(call);
  await call('POST', '/api/me/address', { address: '1613 Glencoe Way' }, token);
  const plan = (await call('POST', '/api/me/permits/event', { name: 'Harvest fair', attendees: 600, answers: { commercial: true, tents: true, flame: true, publicWay: true } }, token)).body;
  const names = plan.items.map(i => `${i.type} / ${i.workClass}`);
  for (const expected of ['Commercial Special Event Permit / Special Event', 'PW - ROW - Street Use / Street Use', 'Fire General / Tent/Canopy', 'Fire General / Open Flame/Candle']) assert.ok(names.includes(expected), expected);
  assert.ok(plan.notes.some(n => /CAL FIRE High/.test(n)), 'open flame in a mapped fire zone is flagged');
  assert.ok(plan.notes.some(n => /security, medical and traffic/.test(n)));
  assert.match(plan.summary, /Harvest fair, about 600 people/);
});

import { emergencyGuide, emergencySituations } from '../src/playbooks.js';
test('emergency-now guides exist for every situation and use saved household facts', () => {
  const ctx = { type: 'resident', hazards: sparr.hazards, household: { members: [{ name: 'Rosa', ageGroup: 'senior' }], pets: [{ kind: 'dogs', count: 2 }], meetFar: 'Montrose library', contact: 'Aunt Rosa' } };
  for (const s of emergencySituations) assert.ok(emergencyGuide(s.id, ctx).steps.length >= 3, s.id);
  const evac = JSON.stringify(emergencyGuide('evacuate', ctx));
  for (const needle of ['2 dogs', 'Rosa has a ride', 'Montrose library', 'Genasys']) assert.ok(evac.includes(needle), needle);
  assert.ok(emergencyGuide('fire', ctx).steps.length <= 7, 'kept short');
  assert.equal(emergencyGuide('alien-invasion', ctx), null);
});

test('event plan can target another address and uses that site\'s hazards', async () => {
  const permitCatalog = JSON.parse(readCatalog(new URL('../src/glendale-permits.json', import.meta.url)));
  const civicLookup = JSON.parse(readCatalog(new URL('../src/sample-location.json', import.meta.url)));
  const store = { data: { users: {}, sessions: {} }, save() {} };
  const handle = createApi({ store, permitCatalog, fetchAlerts: async () => [], lookupHazards: async p => p.address === '613 E Broadway' ? { ...civicLookup, location: { ...civicLookup.location, matched_address: '613 E BROADWAY' } } : sparr });
  const call = async (method, path, body, token) => { const req = { method, headers: token ? { authorization: `Bearer ${token}` } : {}, async *[Symbol.asyncIterator]() { if (body) yield JSON.stringify(body); } }; const res = { writeHead(s) { this.status = s; }, end(t) { this.body = JSON.parse(t); } }; await handle(req, res, new URL(path, 'http://localhost')); return res; };
  const token = await signup(call);
  await call('POST', '/api/me/address', { address: '1613 Glencoe Way' }, token);
  const home = (await call('POST', '/api/me/permits/event', { answers: { flame: true } }, token)).body;
  assert.ok(home.notes.some(n => /CAL FIRE/.test(n)), 'home is in a fire zone');
  const away = (await call('POST', '/api/me/permits/event', { answers: { flame: true }, location: '613 E Broadway' }, token)).body;
  assert.equal(away.location, '613 E BROADWAY');
  assert.ok(!away.notes.some(n => /CAL FIRE/.test(n)), 'off-site event uses the off-site hazards');
  assert.equal((await call('GET', '/api/me', null, token)).body.address.text, '1613 GLENCOE WAY, GLENDALE, CA, 91208', 'registered address unchanged');
});

test('venue package: night market at Artsakh Paseo vs Brand Park, with alcohol and food', async () => {
  const permitCatalog = JSON.parse(readCatalog(new URL('../src/glendale-permits.json', import.meta.url)));
  const civicLookup = JSON.parse(readCatalog(new URL('../src/sample-location.json', import.meta.url)));
  const store = { data: { users: {}, sessions: {} }, save() {} };
  const handle = createApi({ store, permitCatalog, fetchAlerts: async () => [], lookupHazards: async p => p.lat > 34.18 ? sparr : civicLookup });
  const call = async (method, path, body, token) => { const req = { method, headers: token ? { authorization: `Bearer ${token}` } : {}, async *[Symbol.asyncIterator]() { if (body) yield JSON.stringify(body); } }; const res = { writeHead(s) { this.status = s; }, end(t) { this.body = JSON.parse(t); } }; await handle(req, res, new URL(path, 'http://localhost')); return res; };
  const list = (await call('GET', '/api/venues')).body;
  assert.ok(list.venues.some(v => v.id === 'artsakh') && list.templates.some(t => t.id === 'night-market'));
  const token = await signup(call);
  const answers = { commercial: true, tents: true, flame: true, food: true, sound: true, alcohol: true };
  const artsakh = (await call('POST', '/api/me/venues/package', { venueId: 'artsakh', name: 'Night Market', date: '2026-10-17', start: '17:00', end: '22:00', attendees: 800, answers }, token)).body;
  const names = artsakh.items.map(i => i.type);
  assert.ok(names.includes('PW - ROW - Street Use'), 'paseo is a public way');
  assert.ok(artsakh.outside.some(o => /ABC/.test(o.name)) && artsakh.outside.some(o => /food/.test(o.name)));
  assert.ok(artsakh.timeline.some(t => /ABC/.test(t.what)));
  assert.match(artsakh.note, /has not set this up/);
  assert.match(artsakh.summary, /Night Market at Artsakh Avenue Paseo/);
  assert.ok(!artsakh.notes.some(n => /CAL FIRE/.test(n)));
  const brand = (await call('POST', '/api/me/venues/package', { venueId: 'brand-park', answers }, token)).body;
  assert.ok(brand.notes.some(n => /CAL FIRE/.test(n)), 'foothill venue flags open flame');
  assert.ok(brand.outside.some(o => /park facility/.test(o.name)));
  assert.equal((await call('POST', '/api/me/venues/package', { venueId: 'moon' }, token)).status, 404);
});

import { summarizeRecords, streetAddress } from '../server/city-records.mjs';
test('city records summary lists permits and inspections, counts but never lists code cases', () => {
  const result = { TotalFound: 4, PermitsFound: 1, InspectionsFound: 1, CodeCasesFound: 1, EntityResults: [
    { ModuleName: 2, CaseNumber: 'BP1 ', CaseType: 'Re-Roof Permit', CaseStatus: 'Final', FinalDate: '2023-06-21T00:00:00', MainParcel: '5615014901' },
    { ModuleName: 4, CaseNumber: '15', CaseType: '(199) Final Building', CaseStatus: 'Passed', ScheduleDate: '2023-06-14T00:00:00' },
    { ModuleName: 5, CaseNumber: 'CE9', CaseType: 'Code Enforcement', CaseStatus: 'Open' },
  ] };
  const s = summarizeRecords(result, '1613 GLENCOE WAY');
  assert.equal(s.parcel, '5615014901');
  assert.deepEqual(s.recent.map(r => r.kind), ['Permit', 'Inspection']);
  assert.equal(s.totals.codeCases, 1);
  assert.ok(!JSON.stringify(s.recent).includes('Code Enforcement'));
  assert.equal(streetAddress('1613 GLENCOE WAY, GLENDALE, CA, 91208'), '1613 GLENCOE WAY');
  assert.match(s.searchUrl, /st=1613%20GLENCOE%20WAY$/);
});

test('demo household starts signed in with a fictional, verified, personalised profile', async () => {
  const { call } = setup();
  const res = await call('POST', '/api/demo/start');
  assert.equal(res.status, 201);
  assert.equal(res.body.user.demo, true);
  assert.equal(res.body.address.verified, 'mail');
  assert.ok(res.body.recommendations.some(r => r.id === 'kids') && res.body.recommendations.some(r => r.id === 'assistance'));
  assert.equal((await call('POST', '/api/account/login', { email: res.body.user.email, password: 'demo:no-login' })).status, 401, 'demo accounts cannot be logged into');
  assert.equal((await call('GET', '/api/me', null, res.body.token)).body.user.name, 'Dana Rivera');
});

import { emergencyGuideIn } from '../src/playbooks.js';
test('translated emergency steps keep household names and fall back to English where untranslated', () => {
  const ctx = { type: 'resident', household: { members: [{ name: 'Rosa', ageGroup: 'senior' }], pets: [{ kind: 'dogs', count: 2 }], meetFar: 'Montrose library' } };
  const es = emergencyGuideIn('es', 'evacuate', ctx);
  assert.equal(es.translated, true);
  assert.ok(es.steps.some(s => s.text.includes('Rosa')) && es.steps.some(s => s.text.includes('Montrose library')));
  for (const lang of ['hy', 'ko']) for (const id of ['earthquake', 'evacuate', 'power']) assert.ok(emergencyGuideIn(lang, id, ctx).steps.length >= 3, `${lang} ${id}`);
  const fire = emergencyGuideIn('es', 'fire', ctx);
  assert.equal(fire.translated, true, 'household weather situations use the translated playbooks');
  assert.ok(fire.steps.some(s => s.text.includes('Rosa') && s.text.includes('ayuda')));
  assert.equal(emergencyGuideIn('es', 'fire', { type: 'business', business: {} }).translated, false, 'business playbooks are English-only');
  assert.equal(emergencyGuideIn('en', 'earthquake', ctx).translated, true);
});

test('tap-to-inspect: bounds check, records keyed by parcel number, and graceful partial failures', async () => {
  const store = { data: { users: {}, sessions: {} }, save() {} };
  const recordCalls = [];
  const make = parcelAt => createApi({
    store, lookupHazards: async () => sparr, fetchAlerts: async () => [],
    combinedIndex: () => ({ score: 6, max: 11, parts: [] }),
    cityRecords: async key => { recordCalls.push(key); return { totals: { total: 1 } }; },
    parcelAt,
    neighborhoodAt: async () => ({ zoning: { code: 'R 3050' }, schools: [], notes: [] }),
  });
  async function get(handle, path) {
    const req = { method: 'GET', headers: {}, async *[Symbol.asyncIterator]() {} };
    const res = { writeHead(status) { this.status = status; }, end(text) { this.body = JSON.parse(text); } };
    await handle(req, res, new URL(path, 'http://localhost'));
    return res;
  }
  const glendale = make(async () => ({ apn: '5615-017-003', city: 'GLENDALE', address: '1606 GLENCOE WAY GLENDALE CA 91208' }));
  assert.equal((await get(glendale, '/api/public/point?lat=40.7&lon=-74')).status, 400);
  const ok = await get(glendale, '/api/public/point?lat=34.19912&lon=-118.2311');
  assert.equal(ok.status, 200);
  assert.equal(ok.body.parcel.apn, '5615-017-003');
  assert.equal(ok.body.neighborhood.zoning.code, 'R 3050');
  assert.equal(ok.body.combined.score, 6);
  assert.deepEqual(recordCalls, ['5615017003']); // the City's permit system keys parcels by AIN, no dashes

  recordCalls.length = 0;
  const outside = make(async () => ({ apn: '5800-001-001', city: 'LOS ANGELES' }));
  assert.equal((await get(outside, '/api/public/point?lat=34.15&lon=-118.25')).body.records, null);
  assert.equal(recordCalls.length, 0);

  const broken = make(async () => { throw new Error('County GIS down'); });
  const partial = await get(broken, '/api/public/point?lat=34.15&lon=-118.25');
  assert.equal(partial.status, 200);
  assert.equal(partial.body.parcel, null);
  assert.ok(partial.body.layers.length > 0);
});

test('address check answers without waiting on City records, which load from their own route', async () => {
  const store = { data: { users: {}, sessions: {} }, save() {} };
  let recordCalls = 0;
  const handle = createApi({ store, lookupHazards: async () => sparr, fetchAlerts: async () => [], cityRecords: async () => { recordCalls++; return { totals: { total: 65 } }; } });
  async function call(method, path, body) {
    const req = { method, headers: {}, async *[Symbol.asyncIterator]() { if (body) yield JSON.stringify(body); } };
    const res = { writeHead(status) { this.status = status; }, end(text) { this.body = JSON.parse(text); } };
    await handle(req, res, new URL(path, 'http://localhost'));
    return res;
  }
  const check = await call('POST', '/api/public/check', { address: '1613 Glencoe Way' });
  assert.equal(check.status, 200);
  assert.equal('records' in check.body, false);
  assert.equal(recordCalls, 0);
  const records = await call('GET', '/api/public/records?address=1613%20GLENCOE%20WAY');
  assert.equal(records.body.records.totals.total, 65);
  assert.equal((await call('GET', '/api/public/records?address=x')).status, 400);
});

test('household playbooks translate every step but keep what the household typed', () => {
  const household = { members: [{ name: 'Mia', ageGroup: 'child' }, { name: 'Rosa', ageGroup: 'senior', needsHelp: true }], pets: [{ kind: 'dogs', count: 2 }], meetNear: 'Corner mailbox', contact: 'Aunt Lucia' };
  for (const event of drillEvents) {
    const en = buildPlaybook(event, { household, hazards: sparr.hazards });
    for (const lang of ['es', 'hy', 'ko']) {
      const tr = buildPlaybook(event, { household, hazards: sparr.hazards, lang });
      assert.deepEqual(tr.groups.map(g => g.label), en.groups.map(g => g.label), `${lang} ${event}: same groups, English keys`);
      assert.deepEqual(tr.groups.map(g => g.steps.length), en.groups.map(g => g.steps.length), `${lang} ${event}: same number of steps`);
      const english = new Set(en.groups.flatMap(g => g.steps.map(s => s.text)));
      for (const step of tr.groups.flatMap(g => g.steps)) assert.ok(!english.has(step.text), `${lang} ${event}: untranslated "${step.text}"`);
      assert.ok(tr.groups.flatMap(g => g.steps).some(s => s.text.includes('Rosa')), `${lang} ${event}: keeps names`);
    }
  }
  assert.equal(buildPlaybook('Red Flag Warning', { household, lang: 'xx' }).groups[0].title, 'Do now', 'unknown languages fall back to English');
});
