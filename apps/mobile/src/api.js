import { Platform } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN = 'firepath-session';

// The API lives on the FirePath Node server (port 5173). The built web app is served by that same
// server at /app; the Expo dev server (8081) and phones reach it on the dev machine's host.
function apiBase() {
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

export async function api(method, path, body) {
  let response;
  try {
    response = await fetch(`${apiBase()}${path}`, { method, headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  } catch {
    throw Object.assign(new Error('Cannot reach the FirePath server. Is `npm start` running?'), { status: 0 });
  }
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(json.error || `Request failed (${response.status})`), { status: response.status });
  return json;
}
