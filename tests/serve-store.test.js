import test from 'node:test';
import assert from 'node:assert/strict';
import { openBlobStore } from '../server/blob-store.mjs';
import { serveWithStore } from '../server/serve-store.mjs';

// An in-memory stand-in for Vercel Blob with ETags, so another "instance" can write between requests.
class Conflict extends Error {}
function fakeBlob(doc) {
  const state = { doc: JSON.stringify(doc), etag: 1 };
  const tag = () => `"${state.etag}"`;
  return {
    state,
    get: async (path, { ifNoneMatch } = {}) => ifNoneMatch === tag() ? { statusCode: 304 } : { statusCode: 200, stream: new Blob([state.doc]).stream(), blob: { etag: `W/${tag()}` } },
    put: async (path, body, { ifMatch } = {}) => { if (state.fail) throw new Error('blob down'); if (ifMatch && ifMatch !== tag()) throw new Conflict(); state.doc = body; state.etag++; return { etag: tag() }; },
    otherInstanceWrites: change => { const d = JSON.parse(state.doc); change(d); state.doc = JSON.stringify(d); state.etag++; },
    read: () => JSON.parse(state.doc),
  };
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
const call = (handler, method, path) => { const res = { writeHead(status) { this.status = status; }, end(body) { this.body = body; } }; return handler({ method, url: path, headers: {} }, res).then(() => res); };

test('overlapping requests on one instance never lose a change, even when another instance writes in between', async () => {
  const blob = fakeBlob({ users: { a: { name: 'A' }, b: { name: 'B' } }, sessions: {} });
  const store = openBlobStore({ get: blob.get, put: blob.put, isConflict: e => e instanceof Conflict, path: 'test.json' });
  // A slow change (like an address lookup) and a quick one, both on this instance.
  const api = async (req, res, url) => {
    if (url.pathname === '/api/slow') { const user = store.data.users.a; await sleep(60); user.name = 'A2'; }
    if (url.pathname === '/api/quick') store.data.users.b.name = 'B2';
    store.save(); res.writeHead(200); res.end('{}'); return true;
  };
  const handler = serveWithStore(store, api);
  const slow = call(handler, 'POST', '/api/slow');
  await sleep(10);
  blob.otherInstanceWrites(d => { d.users.c = { name: 'C' }; });
  const quick = call(handler, 'POST', '/api/quick');
  const [r1, r2] = await Promise.all([slow, quick]);
  assert.equal(r1.status, 200); assert.equal(r2.status, 200);
  const saved = blob.read().users;
  assert.equal(saved.a.name, 'A2', 'the slow change is kept');
  assert.equal(saved.b.name, 'B2', 'the quick change is kept');
  assert.equal(saved.c.name, 'C', 'the other instance\'s change is kept');
});

test('a change that cannot be saved answers 503, not a success', async () => {
  const blob = fakeBlob({ users: {}, sessions: {} });
  const store = openBlobStore({ get: blob.get, put: blob.put, isConflict: e => e instanceof Conflict, path: 'test.json' });
  const handler = serveWithStore(store, async (req, res) => { store.data.users.x = { name: 'X' }; store.save(); res.writeHead(201); res.end('{"token":"t"}'); return true; });
  blob.state.fail = true;
  const res = await call(handler, 'POST', '/api/account/signup');
  assert.equal(res.status, 503);
  assert.match(res.body, /could not save/);
});
