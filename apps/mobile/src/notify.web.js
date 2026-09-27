// Web: the browser's own Notification API, which keeps expo-notifications out of the web bundle.
export function setupNotifications() {}

// Older Safari takes a callback instead of returning a promise.
const ask = () => new Promise(resolve => { const r = Notification.requestPermission(resolve); if (r?.then) r.then(resolve); });

// Resolves true once shown, false when permission is refused; throws when the browser has no notifications.
// Android Chrome only shows notifications through the service worker ("new Notification" throws there), so
// that path comes first; the constructor is the fallback for browsers without a ready worker.
export async function showTestNotification(title, body) {
  if (typeof Notification === 'undefined') throw new Error('unsupported');
  const permission = Notification.permission === 'granted' ? 'granted' : await ask();
  if (permission !== 'granted') return false;
  const worker = await Promise.race([navigator.serviceWorker?.getRegistration?.() ?? null, new Promise(r => setTimeout(() => r(null), 1500))]).catch(() => null);
  if (worker?.showNotification) await worker.showNotification(title, { body });
  else new Notification(title, { body });
  return true;
}
