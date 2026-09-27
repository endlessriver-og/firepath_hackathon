// Hosted persistence for the Vercel deployment: the same one-document store as store.mjs, kept as a
// private Vercel Blob. Each request reloads it (cheap when unchanged, via ETag) and writes it back
// before responding if anything changed. Writes are conditional on the ETag that was read; when
// another request saved in between, the latest document is reloaded and only the records this
// request changed (per user, per session) are applied on top of it, then the write is retried.
// The very first write, before the document exists, is unconditional (there is no ETag to match).
import * as blob from '@vercel/blob';

// Previews (branch pushes) share the Blob token with production, so they get their own document and
// can never read or overwrite real accounts. Local and test runs keep the production name.
export const storePath = (env = process.env.VERCEL_ENV) => (env && env !== 'production' ? `firepath/store-${env}.json` : 'firepath/store.json');
const EMPTY = () => ({ users: {}, sessions: {} });

// Per-record changes between two versions of the document: { map: { key: value | undefined } }.
export function recordChanges(before, after) {
  const changes = {};
  for (const map of new Set([...Object.keys(before), ...Object.keys(after)])) {
    const a = before[map] || {}, b = after[map] || {};
    for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
      if (JSON.stringify(a[key]) !== JSON.stringify(b[key])) (changes[map] ||= {})[key] = b[key];
    }
  }
  return changes;
}

export function applyChanges(doc, changes) {
  for (const [map, entries] of Object.entries(changes)) {
    doc[map] ||= {};
    for (const [key, value] of Object.entries(entries)) {
      if (value === undefined) delete doc[map][key]; else doc[map][key] = value;
    }
  }
  return doc;
}

export function openBlobStore({ get = blob.get, put = blob.put, isConflict = e => e instanceof blob.BlobPreconditionFailedError, path = storePath() } = {}) {
  const data = EMPTY();
  let etag = null, loaded = JSON.stringify(data), dirty = false;
  const replace = fresh => { for (const key of Object.keys(data)) delete data[key]; Object.assign(data, EMPTY(), fresh); };
  async function fetchLatest(useEtag) {
    const result = await get(path, { access: 'private', useCache: false, ...(useEtag && etag ? { ifNoneMatch: etag } : {}) });
    if (!result || result.statusCode === 304) return result ? null : { doc: EMPTY(), etag: null };
    // Reads return a weak ETag (W/"…"); conditional writes only accept the strong form.
    return { doc: JSON.parse(await new Response(result.stream).text()), etag: result.blob.etag?.replace(/^W\//, '') ?? null };
  }
  return {
    data,
    save() { dirty = true; },
    async load() {
      const latest = await fetchLatest(true);
      if (latest) { replace(latest.doc); etag = latest.etag; }
      loaded = JSON.stringify(data);
    },
    async flush() {
      if (!dirty) return;
      dirty = false;
      const changes = recordChanges(JSON.parse(loaded), data);
      for (let attempt = 0; ; attempt++) {
        try {
          const saved = await put(path, JSON.stringify(data), { access: 'private', allowOverwrite: true, addRandomSuffix: false, contentType: 'application/json', ...(etag ? { ifMatch: etag } : {}) });
          etag = saved?.etag ?? null;
          loaded = JSON.stringify(data);
          return;
        } catch (error) {
          if (!isConflict(error) || attempt >= 3) throw error;
          const latest = await fetchLatest(false);
          replace(applyChanges(latest.doc, changes));
          etag = latest.etag;
        }
      }
    },
  };
}
