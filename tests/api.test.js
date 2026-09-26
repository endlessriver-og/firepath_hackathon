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
  assert.deepEqual((await ok.call('GET', '/api/me/alerts', null, token)).body.alerts, nws);
  const down = setup({ alerts: async () => { throw new Error('offline'); } });
  const t2 = await signup(down.call);
  await down.call('POST', '/api/me/address', { address: '1613 Glencoe Way' }, t2);
  const res = (await down.call('GET', '/api/me/alerts', null, t2)).body;
  assert.equal(res.unavailable, true);
  assert.equal(res.alerts.length, 0);
});
