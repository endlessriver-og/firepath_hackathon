// Request handling around the one-document store on a serverless host (see api/index.mjs).
// One instance can serve several requests at once, and they share one in-memory copy of the store. A reload in
// one request replaces the objects another is still changing, and that change would be silently lost. So a
// request that changes data runs alone on this instance; reads may overlap each other. First come, first served.
export function rwLock() {
  let readers = 0, writing = false;
  const queue = [];
  const next = () => {
    while (queue.length) {
      const head = queue[0];
      if (writing || (head.write && readers)) return;
      queue.shift();
      if (head.write) writing = true; else readers++;
      head.resolve();
      if (head.write) return;
    }
  };
  return {
    acquire: write => new Promise(resolve => { queue.push({ write, resolve }); next(); }),
    release: write => { if (write) writing = false; else readers--; next(); },
  };
}
// Wraps the API for a serverless host: load the shared store, run the route, save before answering.
export function serveWithStore(store, api, { onRequest = () => {} } = {}) {
  const lock = rwLock();
  return async function handler(req, res) {
    const url = onRequest(req) || new URL(req.url, 'http://localhost');
    // Public, account-free routes never touch the store, so they skip the Blob read and the lock.
    const stateless = /^\/api\/(public\/|permits(\/search)?$|venues$|health$)/.test(url.pathname);
    const write = req.method !== 'GET';
    if (!stateless) await lock.acquire(write);
    try {
      try { if (!stateless) await store.load(); }
      catch (error) { console.error('store load failed', error); res.writeHead(503, { 'content-type': 'application/json' }); res.end(JSON.stringify({ error: 'FirePath storage is unavailable. Try again in a moment.' })); return; }
      // Persist any change before the response goes out, so the next request (maybe on another instance) sees
      // it. The status waits for the write: if saving fails, the answer is 503, never a success that was not kept.
      const writeHead = res.writeHead.bind(res), end = res.end.bind(res);
      let head = [200], finished;
      res.writeHead = (...args) => { head = args; return res; };
      res.end = (...args) => {
        finished = store.flush().then(() => { writeHead(...head); end(...args); }, error => {
          console.error('store flush failed', error);
          writeHead(503, { 'content-type': 'application/json', 'cache-control': 'no-store' });
          end(JSON.stringify({ error: 'FirePath could not save that. Try again in a moment.' }));
        });
        return res;
      };
      if (await api(req, res, url)) { await finished; return; }
      res.writeHead = writeHead; res.end = end;
      res.writeHead(404, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
    } finally {
      if (!stateless) lock.release(write);
    }
  };
}
