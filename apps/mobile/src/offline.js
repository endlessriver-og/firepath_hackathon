import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './api';

// The last account view that loaded, kept on this device so plans and emergency steps still open offline.
export const ME_CACHE = 'firepath-me-cache';
// Checklist ticks made without a connection, as { stepId: done }, sent on the next successful load.
const PENDING = 'firepath-pending-tasks';

const read = async key => { try { return JSON.parse(await AsyncStorage.getItem(key)) || null; } catch { return null; } };

// Keeps a tick made offline: updates the saved plan and remembers the change for later.
export async function queueTask(me, id, done) {
  const next = { ...me, done: { ...me.done, [id]: done } };
  const pending = { ...(await read(PENDING)), [id]: done };
  await AsyncStorage.setItem(PENDING, JSON.stringify(pending)).catch(() => {});
  await AsyncStorage.setItem(ME_CACHE, JSON.stringify(next)).catch(() => {});
  return next;
}

// Sends queued ticks once FirePath is reachable. Returns the newest account view, or null if nothing was sent.
// A tick the server refuses (a step that no longer applies) is dropped; a network failure keeps the rest queued.
export async function flushTasks() {
  const pending = await read(PENDING);
  if (!pending) return null;
  let latest = null;
  const left = { ...pending };
  for (const [id, done] of Object.entries(pending)) {
    try { latest = await api('PUT', '/api/me/tasks', { id, done }); delete left[id]; }
    catch (e) { if (e.status === 0) break; delete left[id]; }
  }
  if (Object.keys(left).length) await AsyncStorage.setItem(PENDING, JSON.stringify(left)).catch(() => {});
  else await AsyncStorage.removeItem(PENDING).catch(() => {});
  return latest;
}

export const clearOffline = () => Promise.all([ME_CACHE, PENDING].map(k => AsyncStorage.removeItem(k).catch(() => {})));
