export type EventType =
  | 'Birthday'
  | 'Roadtrip'
  | 'Wedding'
  | 'Graduation'
  | 'House Party'
  | 'Beach Trip'
  | 'Hiking'
  | 'Concert'
  | 'Custom';

export interface Friend {
  id: string;
  name: string;
  username: string;
  phone: string;
  email: string;
  initials: string;
  avatarColor: string;
  avatarUrl?: string;
  online: boolean;
}

export interface Guest {
  id: string;
  friendId?: string;
  name: string;
  phone: string;
  email?: string;
  initials: string;
  avatarColor: string;
  amount: number;
  paid: boolean;
  online: boolean;
  paidAt?: string;
}

export interface BudgetBreakdown {
  Transport: number;
  Food: number;
  Venue: number;
  DJ: number;
  Misc: number;
}

export interface MediaItem {
  id: string;
  eventId: string;
  eventName: string;
  type: 'photo' | 'video';
  url: string;
  thumbnail: string;
  title: string;
  uploadedBy: string;
  uploadedAt: string;
  duration?: string;
}

export interface ChatReaction {
  emoji: string;
  users: string[];
}

export interface ChatMessage {
  id: string;
  eventId: string;
  senderId: string;
  senderName: string;
  senderInitials: string;
  senderColor: string;
  isMe: boolean;
  text: string;
  timestamp: string;
  media?: {
    type: 'photo' | 'video';
    url: string;
    title?: string;
  };
  reactions: ChatReaction[];
  replyTo?: {
    id: string;
    senderName: string;
    text: string;
  };
  pinned?: boolean;
}

export interface MonteEvent {
  id: string;
  name: string;
  type: EventType;
  customType?: string;
  date: string;
  location: string;
  description: string;
  coverImage: string;
  coverGradient: string;
  totalBudget: number;
  maxGuests: number;
  costPerPerson: number;
  inviteCode: string;
  guests: Guest[];
  budgetBreakdown: BudgetBreakdown;
  unreadCount: number;
  createdBy: string;
}

export interface UserProfile {
  name: string;
  username: string;
  bio: string;
  email: string;
  phone: string;
  location: string;
  birthday: string;
  memberSince: string;
  mpesaNumber: string;
  avatarUrl: string;
  initials: string;
  preferredTypes: EventType[];
}

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  time: string;
  read: boolean;
  eventId?: string;
}

export interface PlatformMember {
  id: string;
  name: string;
  username: string;
  email?: string;
  bio: string;
  location: string;
  memberSince: string;
  avatarUrl: string;
  initials: string;
  preferredTypes: EventType[];
}

export type AppPage =
  | 'dashboard'
  | 'create'
  | 'rooms'
  | 'event-room'
  | 'chats'
  | 'members'
  | 'media'
  | 'profile';

export type EventRoomTab = 'guests' | 'budget' | 'media' | 'chat';
