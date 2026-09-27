import test from 'node:test';
import assert from 'node:assert/strict';
import { applyChanges, openBlobStore, recordChanges } from '../server/blob-store.mjs';

class Conflict extends Error {}
// An in-memory stand-in for the private Blob: versioned by an incrementing ETag.
function fakeBlob() {
  const state = { body: null, etag: null, n: 0, puts: 0 };
  return {
    state,
    get: async (path, { ifNoneMatch } = {}) => {
      if (state.body === null) return null;
      if (ifNoneMatch && ifNoneMatch === state.etag) return { statusCode: 304, stream: null, blob: { etag: state.etag } };
      return { statusCode: 200, stream: new Response(state.body).body, blob: { etag: state.etag } };
    },
    put: async (path, body, { ifMatch } = {}) => {
      state.puts++;
      if (ifMatch && ifMatch !== state.etag) throw new Conflict();
      state.body = body; state.etag = `e${++state.n}`;
      return { etag: state.etag };
    },
    isConflict: e => e instanceof Conflict,
  };
}

test('record diffs capture additions, edits and deletions per key', () => {
  const before = { users: { a: { n: 1 }, b: { n: 1 } }, sessions: { s1: 'a' } };
  const after = { users: { a: { n: 2 }, c: { n: 1 } }, sessions: { s1: 'a' } };
  const changes = recordChanges(before, after);
  assert.deepEqual(changes, { users: { a: { n: 2 }, b: undefined, c: { n: 1 } } });
  assert.deepEqual(applyChanges({ users: { b: { n: 1 }, d: { n: 9 } } }, changes), { users: { a: { n: 2 }, c: { n: 1 }, d: { n: 9 } } });
});

test('two requests saving at once both keep their changes', async () => {
  const b = fakeBlob();
  Object.assign(b.state, { body: JSON.stringify({ users: {}, sessions: {} }), etag: 'e0' }); // the production document exists
  const one = openBlobStore(b), two = openBlobStore(b);
  await one.load(); await two.load();
  one.data.users.alice = { name: 'Alice' }; one.save();
  two.data.users.bob = { name: 'Bob' }; two.data.sessions.t2 = 'bob'; two.save();
  await one.flush();
  await two.flush(); // conflicts, reloads Alice's write, reapplies Bob's records, retries
  const after = openBlobStore(b); await after.load();
  assert.deepEqual(Object.keys(after.data.users).sort(), ['alice', 'bob']);
  assert.equal(after.data.sessions.t2, 'bob');
  assert.equal(b.state.puts, 3);
});

test('an unchanged request does not write, and a reload after 304 keeps data', async () => {
  const b = fakeBlob();
  const s = openBlobStore(b);
  await s.load(); s.data.users.x = { v: 1 }; s.save(); await s.flush();
  await s.load(); // 304: same etag
  assert.equal(s.data.users.x.v, 1);
  await s.flush();
  assert.equal(b.state.puts, 1);
});

test('preview deployments use their own document, never the production accounts', async () => {
  const { storePath } = await import('../server/blob-store.mjs');
  assert.equal(storePath('production'), 'firepath/store.json');
  assert.equal(storePath(undefined), 'firepath/store.json');
  assert.equal(storePath('preview'), 'firepath/store-preview.json');
  assert.equal(storePath('development'), 'firepath/store-development.json');
});
