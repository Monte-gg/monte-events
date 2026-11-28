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

export type NotificationChannelId =
  | 'monte-payments'
  | 'monte-chats'
  | 'monte-friends'
  | 'monte-general';

let channelsInitialized = false;

async function ensureAndroidChannels(): Promise<void> {
  if (!isNativeApp() || channelsInitialized) return;
  channelsInitialized = true;
  try {
    await LocalNotifications.createChannel({
      id: 'monte-payments',
      name: 'M-PESA Payments',
      description: 'Instant M-PESA payment confirmations and receipts',
      importance: 5,
      visibility: 1,
      vibration: true,
      lights: true,
    });
    await LocalNotifications.createChannel({
      id: 'monte-chats',
      name: 'Event & Friend Chats',
      description: 'Real-time event room messages and friend DMs',
      importance: 5,
      visibility: 1,
      vibration: true,
      lights: true,
    });
    await LocalNotifications.createChannel({
      id: 'monte-friends',
      name: 'Friend Requests & Invites',
      description: 'New friend connections and event room invitations',
      importance: 5,
      visibility: 1,
      vibration: true,
      lights: true,
    });
    await LocalNotifications.createChannel({
      id: 'monte-general',
      name: 'Monte Events Alerts',
      description: 'App updates, new event rooms, and reminders',
      importance: 4,
      visibility: 1,
      vibration: true,
    });
  } catch {
    // Non-fatal on older Android versions or web
  }
}

export async function sendDeviceNotification(payload: {
  title: string;
  body: string;
  channelId?: NotificationChannelId;
}): Promise<void> {
  if (isNativeApp()) {
    try {
      let perm = await LocalNotifications.checkPermissions();
      if (perm.display === 'prompt' || perm.display === 'prompt-with-rationale') {
        perm = await LocalNotifications.requestPermissions();
      }
      if (perm.display !== 'granted') return;
      await ensureAndroidChannels();
      await LocalNotifications.schedule({
        notifications: [
          {
            id: Math.floor(Date.now() % 2147483000),
            title: payload.title,
            body: payload.body,
            channelId: payload.channelId || 'monte-general',
            schedule: { at: new Date(Date.now() + 200) },
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
