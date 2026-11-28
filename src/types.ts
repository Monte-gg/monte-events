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

export type MpesaType = 'phone' | 'till' | 'paybill' | 'pochi';

export type PaymentStatus = 'pending' | 'submitted' | 'confirmed';

export type ExpenseCategory =
  | 'Transport'
  | 'Accommodation'
  | 'Food & Drinks'
  | 'Decor'
  | 'Other';

export interface ExpenseItem {
  id: string;
  roomId: string;
  title: string;
  category: ExpenseCategory;
  amount: number;
  paidBy: string;
  createdAt?: string;
}

export interface MainGuest {
  id: string;
  name: string;
  role: string; // e.g. Headliner, Artist, Keynote Speaker, VIP, MC, Leader
}

export interface SubEvent {
  id: string;
  title: string;
  date: string;
  time?: string;
  location?: string;
}

export interface PublicInvitePreview {
  id: string;
  name: string;
  type: EventType;
  customType?: string;
  date: string;
  location: string;
  description: string;
  coverImage: string;
  coverGradient: string;
  costPerPerson: number;
  maxGuests: number;
  guestCount: number;
  paidCount: number;
  inviteCode: string;
  createdBy: string;
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
  paymentStatus?: PaymentStatus;
  mpesaCode?: string;
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
  hostId?: string;
  hostEmail?: string;
  mpesaType?: MpesaType;
  mpesaNumber?: string;
  mpesaAccount?: string;
  mpesaName?: string;
  expenses?: ExpenseItem[];
  activities?: string[];
  mainGuests?: MainGuest[];
  subEvents?: SubEvent[];
  locationPinUrl?: string;
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
  verified?: boolean;
  profileCompleted?: boolean;
}

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  time: string;
  read: boolean;
  eventId?: string;
}

export interface DirectMessage {
  id: string;
  friendId: string;
  senderName: string;
  senderInitials: string;
  isMe: boolean;
  text: string;
  timestamp: string;
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
  verified?: boolean;
  profileCompleted?: boolean;
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
