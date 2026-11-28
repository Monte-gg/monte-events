import { LocalNotifications } from '@capacitor/local-notifications';
import { isNativeApp } from './nativeApp';

export type NotificationPermissionState = 'granted' | 'denied' | 'prompt' | 'unsupported';

export async function getNotificationPermissionStatus(): Promise<NotificationPermissionState> {
  if (isNativeApp()) {
    try {
      const res = await LocalNotifications.checkPermissions();
      if (res.display === 'granted') return 'granted';
      if (res.display === 'denied') return 'denied';
      return 'prompt';
    } catch {
      return 'unsupported';
    }
  }

  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  return 'prompt';
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (isNativeApp()) {
    try {
      const res = await LocalNotifications.requestPermissions();
      return res.display === 'granted';
    } catch {
      return false;
    }
  }

  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }
  if (Notification.permission === 'granted') return true;
  try {
    const result = await Notification.requestPermission();
    return result === 'granted';
  } catch {
    return false;
  }
}

export async function sendDeviceNotification(payload: {
  title: string;
  body: string;
}): Promise<void> {
  if (isNativeApp()) {
    try {
      const perm = await LocalNotifications.checkPermissions();
      if (perm.display !== 'granted') return;
      await LocalNotifications.schedule({
        notifications: [
          {
            id: Math.floor(Date.now() % 2147483000),
            title: payload.title,
            body: payload.body,
            schedule: { at: new Date(Date.now() + 250) },
          },
        ],
      });
    } catch {
      // Non-fatal
    }
    return;
  }

  if (
    typeof window !== 'undefined' &&
    'Notification' in window &&
    Notification.permission === 'granted'
  ) {
    try {
      new Notification(payload.title, {
        body: payload.body,
        icon: './favicon.svg',
      });
    } catch {
      // Non-fatal
    }
  }
}
