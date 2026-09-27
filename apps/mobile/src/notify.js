import * as Notifications from 'expo-notifications';

// Native: local notifications through expo-notifications. notify.web.js is the browser version.
export function setupNotifications() {
  Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }) });
}

// Resolves true once shown, false when permission is refused.
export async function showTestNotification(title, body) {
  const permission = await Notifications.requestPermissionsAsync();
  if (permission.status !== 'granted') return false;
  await Notifications.scheduleNotificationAsync({ content: { title, body, data: { demo: true } }, trigger: null });
  return true;
}
