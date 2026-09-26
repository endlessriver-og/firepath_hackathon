// Hosted persistence for the Vercel deployment: the same one-document store as store.mjs, kept as a
// private Vercel Blob. Each request reloads it (cheap when unchanged, via ETag) and writes it back
// before responding if anything changed. Prototype-grade: concurrent writers can overwrite each other.
import { get, put } from '@vercel/blob';

const PATH = 'firepath/store.json';

export function openBlobStore() {
  const data = { users: {}, sessions: {} };
  let etag = null, dirty = false;
  return {
    data,
    save() { dirty = true; },
    async load() {
      const result = await get(PATH, { access: 'private', useCache: false, ...(etag ? { ifNoneMatch: etag } : {}) });
      if (!result || result.statusCode === 304) return;
      const fresh = JSON.parse(await new Response(result.stream).text());
      // api.mjs holds a reference to `data`, so replace its contents in place.
      for (const key of Object.keys(data)) delete data[key];
      Object.assign(data, { users: {}, sessions: {} }, fresh);
      etag = result.blob.etag;
    },
    async flush() {
      if (!dirty) return;
      dirty = false;
      await put(PATH, JSON.stringify(data), { access: 'private', allowOverwrite: true, addRandomSuffix: false, contentType: 'application/json' });
      etag = null; // the next load re-reads it once
    },
  };
}
