// Web: the browser's own Notification API, which keeps expo-notifications out of the web bundle.
export function setupNotifications() {}

// Resolves true once shown, false when permission is refused; throws when the browser has no notifications.
export async function showTestNotification(title, body) {
  if (typeof Notification === 'undefined') throw new Error('unsupported');
  const permission = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
  if (permission !== 'granted') return false;
  new Notification(title, { body });
  return true;
}
