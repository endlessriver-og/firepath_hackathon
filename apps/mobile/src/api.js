import { Platform } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN = 'firepath-session';

// The API lives on the FirePath Node server (port 5173). The built web app is served by that same
// server at /app; the Expo dev server (8081) and phones reach it on the dev machine's host.
export function apiBase() {
  if (Platform.OS === 'web') {
    const { protocol, hostname, port } = window.location;
    return port === '8081' ? `${protocol}//${hostname}:5173` : '';
  }
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  return `http://${host || 'localhost'}:5173`;
}

let token = null;
export async function loadSession() { token = await AsyncStorage.getItem(TOKEN).catch(() => null); return token; }
export async function saveSession(value) { token = value; await (value ? AsyncStorage.setItem(TOKEN, value) : AsyncStorage.removeItem(TOKEN)).catch(() => {}); }

// Called when a signed-in request finds the session gone (expired, or ended by a password change elsewhere),
// so the app can sign out instead of leaving the user stuck on "Please sign in again."
const expiredListeners = new Set();
export const onSessionExpired = fn => { expiredListeners.add(fn); return () => expiredListeners.delete(fn); };

export async function api(method, path, body) {
  let response;
  try {
    // A request that hangs counts as no connection. Reads get 20 s; changes 60 s (an address check can take 45).
    const timeout = typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? AbortSignal.timeout(method === 'GET' ? 20_000 : 60_000) : undefined;
    response = await fetch(`${apiBase()}${path}`, { method, headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined, signal: timeout });
  } catch {
    throw Object.assign(new Error("Can't reach FirePath. Check your connection and try again."), { status: 0 });
  }
  const json = await response.json().catch(() => ({}));
  if (response.status === 401 && token) expiredListeners.forEach(fn => fn());
  if (!response.ok) throw Object.assign(new Error(json.error || `Request failed (${response.status})`), { status: response.status, data: json });
  return json;
}
