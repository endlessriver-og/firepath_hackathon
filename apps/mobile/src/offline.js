import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './api';

// The last account view that loaded, kept on this device so plans and emergency steps still open offline.
export const ME_CACHE = 'firepath-me-cache';
// Checklist ticks made without a connection, as { stepId: done }, sent on the next successful load.
const PENDING = 'firepath-pending-tasks';

const read = async key => { try { return JSON.parse(await AsyncStorage.getItem(key)) || null; } catch { return null; } };
// Screens can show how many changes are still waiting to be sent.
const listeners = new Set();
export const onQueueChange = fn => { listeners.add(fn); read(PENDING).then(p => fn(Object.keys(p || {}).length)); return () => listeners.delete(fn); };
const write = (key, value) => {
  if (key === PENDING) listeners.forEach(fn => fn(Object.keys(value || {}).length));
  return (value && Object.keys(value).length ? AsyncStorage.setItem(key, JSON.stringify(value)) : AsyncStorage.removeItem(key)).catch(() => {});
};

// Every read-modify-write of the queue runs one at a time, so two quick taps or a tap during a flush never
// overwrite each other.
let chain = Promise.resolve();
const locked = fn => (chain = chain.then(fn, fn));

// Keeps a tick made offline: updates the saved plan and remembers the change for later. The returned view
// carries every queued tick, even ones a stale `me` does not have yet.
export const queueTask = (me, id, done) => locked(async () => {
  const pending = { ...(await read(PENDING)), [id]: done };
  await write(PENDING, pending);
  const next = { ...me, done: { ...me.done, ...pending } };
  await AsyncStorage.setItem(ME_CACHE, JSON.stringify(next)).catch(() => {});
  return next;
});

// A tick saved online supersedes any older queued value for the same step.
export const settleTask = id => locked(async () => {
  const pending = await read(PENDING);
  if (pending && id in pending) { delete pending[id]; await write(PENDING, pending); }
});

// Sends queued ticks once FirePath is reachable. Returns the newest account view only when every tick went
// through; otherwise null, so the caller keeps showing the saved plan with the unsent ticks. Only a step the
// server does not recognise (404) is dropped; a network, sign-in or server error keeps the rest queued.
export const flushTasks = () => locked(async () => {
  const pending = await read(PENDING);
  if (!pending) return null;
  let latest = null;
  const left = { ...pending };
  for (const [id, done] of Object.entries(pending)) {
    try { latest = await api('PUT', '/api/me/tasks', { id, done }); delete left[id]; }
    catch (e) { if (e.status !== 404) break; delete left[id]; }
  }
  await write(PENDING, left);
  return Object.keys(left).length ? null : latest;
});

// The view with any still-queued ticks laid over it, so a partial send never hides them.
export const withPending = view => locked(async () => { const pending = await read(PENDING); return pending ? { ...view, done: { ...view.done, ...pending } } : view; });

export const clearOffline = () => locked(() => { listeners.forEach(fn => fn(0)); return Promise.all([ME_CACHE, PENDING].map(k => AsyncStorage.removeItem(k).catch(() => {}))); });
