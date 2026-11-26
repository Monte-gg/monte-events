import {
  ChatMessage,
  EventType,
  Friend,
  MediaItem,
  MonteEvent,
  NotificationItem,
  UserProfile,
} from '../types';

export const EVENT_TYPES: EventType[] = [
  'Birthday',
  'Roadtrip',
  'Wedding',
  'Graduation',
  'House Party',
  'Beach Trip',
  'Hiking',
  'Concert',
  'Custom',
];

export const INITIAL_USER_PROFILE: UserProfile = {
  name: 'Monte Member',
  username: 'member',
  bio: '',
  email: '',
  phone: '',
  location: 'Nairobi, KE',
  birthday: '',
  memberSince: new Date().toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  }),
  mpesaNumber: '',
  avatarUrl: '',
  initials: 'ME',
  preferredTypes: ['Roadtrip', 'Birthday'],
};

export const SAMPLE_FRIENDS: Friend[] = [];

export const INITIAL_EVENTS: MonteEvent[] = [];

export const INITIAL_MEDIA: MediaItem[] = [];

export const INITIAL_MESSAGES: Record<string, ChatMessage[]> = {};

export const INITIAL_NOTIFICATIONS: NotificationItem[] = [];

export function formatKES(amount: number): string {
  return `KES ${Math.round(amount).toLocaleString('en-KE')}`;
}

export function formatDateShort(dateStr: string): string {
  if (!dateStr) return 'Not set';
  try {
    const d = new Date(dateStr + 'T00:00:00');
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-KE', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}
