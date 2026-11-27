import {
  BudgetBreakdown,
  ChatMessage,
  ChatReaction,
  EventType,
  Guest,
  MediaItem,
  MonteEvent,
} from '../types';

export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || 'https://monte-events.onrender.com'
).replace(/\/+$/, '');

export type ApiStatus = 'waking' | 'online' | 'demo';

async function fetchJson<T>(
  path: string,
  options: RequestInit = {},
  timeoutMs = 7000
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
    if (!res.ok) {
      throw new Error(`API ${res.status}`);
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

interface RawGuest {
  id: string;
  room_id: string;
  name: string;
  phone?: string;
  email?: string;
  initials?: string;
  avatar_color?: string;
  amount?: number;
  paid?: boolean;
  online?: boolean;
  paid_at?: string | null;
}

interface RawRoom {
  id: string;
  name: string;
  type?: EventType;
  custom_type?: string | null;
  date: string;
  location?: string;
  description?: string;
  cover_image?: string;
  cover_gradient?: string;
  total_budget?: number;
  max_guests?: number;
  cost_per_person?: number;
  invite_code: string;
  budget_breakdown?: BudgetBreakdown;
  created_by?: string;
  guests?: RawGuest[];
}

interface RawMessage {
  id: string;
  room_id: string;
  sender_id?: string;
  sender_name: string;
  sender_initials?: string;
  sender_color?: string;
  text: string;
  timestamp_label?: string;
  media?: ChatMessage['media'];
  reactions?: ChatReaction[];
  reply_to?: ChatMessage['replyTo'];
  pinned?: boolean;
}

interface RawMedia {
  id: string;
  room_id?: string | null;
  event_name?: string;
  type?: 'photo' | 'video';
  url: string;
  thumbnail?: string;
  title?: string;
  uploaded_by?: string;
  uploaded_at?: string;
  duration?: string | null;
}

function mapGuest(g: RawGuest): Guest {
  return {
    id: g.id,
    name: g.name,
    phone: g.phone || '',
    email: g.email || undefined,
    initials: g.initials || g.name.slice(0, 2).toUpperCase(),
    avatarColor: g.avatar_color || '#1A6BFF',
    amount: Number(g.amount || 0),
    paid: Boolean(g.paid),
    online: Boolean(g.online),
    paidAt: g.paid_at ? 'Paid' : undefined,
  };
}

function mapRoom(r: RawRoom): MonteEvent {
  return {
    id: r.id,
    name: r.name,
    type: r.type || 'Roadtrip',
    customType: r.custom_type || undefined,
    date: r.date,
    location: r.location || 'Nairobi, KE',
    description: r.description || '',
    coverImage: r.cover_image || '',
    coverGradient:
      r.cover_gradient || 'from-[#0B2E8F] via-[#1A6BFF] to-[#2B7FFF]',
    totalBudget: Number(r.total_budget || 0),
    maxGuests: Number(r.max_guests || 10),
    costPerPerson: Number(r.cost_per_person || 0),
    inviteCode: r.invite_code,
    guests: (r.guests || []).map(mapGuest),
    budgetBreakdown: r.budget_breakdown || {
      Transport: 0,
      Food: 0,
      Venue: 0,
      DJ: 0,
      Misc: 0,
    },
    unreadCount: 0,
    createdBy: r.created_by || 'Monte Host',
  };
}

function mapMessage(m: RawMessage, currentUserId?: string): ChatMessage {
  const sid = m.sender_id || 'friend';
  return {
    id: m.id,
    eventId: m.room_id,
    senderId: sid,
    senderName: m.sender_name,
    senderInitials: m.sender_initials || m.sender_name.slice(0, 2).toUpperCase(),
    senderColor: m.sender_color || '#1A6BFF',
    isMe: sid === 'me' || (Boolean(currentUserId) && sid === currentUserId),
    text: m.text,
    timestamp: m.timestamp_label || 'Now',
    media: m.media || undefined,
    reactions: m.reactions || [],
    replyTo: m.reply_to || undefined,
    pinned: Boolean(m.pinned),
  };
}

function mapMedia(m: RawMedia): MediaItem {
  return {
    id: m.id,
    eventId: m.room_id || 'general',
    eventName: m.event_name || 'Monte Event',
    type: m.type === 'video' ? 'video' : 'photo',
    url: m.url,
    thumbnail: m.thumbnail || m.url,
    title: m.title || 'Event Memory',
    uploadedBy: m.uploaded_by || 'Monte Member',
    uploadedAt: m.uploaded_at || 'Just now',
    duration: m.duration || undefined,
  };
}

export async function checkApiHealth(): Promise<boolean> {
  try {
    const res = await fetchJson<{ ok: boolean }>('/health', {}, 6000);
    return Boolean(res.ok);
  } catch {
    return false;
  }
}

export async function fetchRoomsFromApi(): Promise<MonteEvent[] | null> {
  try {
    const data = await fetchJson<{ rooms: RawRoom[] }>('/api/rooms');
    return (data.rooms || []).map(mapRoom);
  } catch {
    return null;
  }
}

export async function createRoomOnApi(
  event: MonteEvent
): Promise<MonteEvent | null> {
  try {
    const data = await fetchJson<{ room: RawRoom }>('/api/rooms', {
      method: 'POST',
      body: JSON.stringify({
        name: event.name,
        type: event.type,
        custom_type: event.customType || null,
        date: event.date,
        location: event.location,
        description: event.description,
        cover_image: event.coverImage,
        cover_gradient: event.coverGradient,
        total_budget: event.totalBudget,
        max_guests: event.maxGuests,
        cost_per_person: event.costPerPerson,
        invite_code: event.inviteCode,
        budget_breakdown: event.budgetBreakdown,
        created_by: event.createdBy,
        guests: event.guests.map((g) => ({
          name: g.name,
          phone: g.phone,
          email: g.email || '',
          initials: g.initials,
          avatar_color: g.avatarColor,
          amount: g.amount,
          paid: g.paid,
          online: g.online,
        })),
      }),
    });
    return data.room ? mapRoom(data.room) : null;
  } catch {
    return null;
  }
}

export async function deleteRoomOnApi(roomId: string): Promise<boolean> {
  try {
    await fetchJson(`/api/rooms/${encodeURIComponent(roomId)}`, {
      method: 'DELETE',
    });
    return true;
  } catch {
    return false;
  }
}

export async function addGuestOnApi(
  roomId: string,
  guest: Guest
): Promise<Guest | null> {
  try {
    const data = await fetchJson<{ guest: RawGuest }>(
      `/api/rooms/${encodeURIComponent(roomId)}/guests`,
      {
        method: 'POST',
        body: JSON.stringify({
          name: guest.name,
          phone: guest.phone,
          email: guest.email || '',
          initials: guest.initials,
          avatar_color: guest.avatarColor,
          amount: guest.amount,
          paid: guest.paid,
          online: guest.online,
        }),
      }
    );
    return data.guest ? mapGuest(data.guest) : null;
  } catch {
    return null;
  }
}

export async function toggleGuestPaymentOnApi(
  roomId: string,
  guestId: string,
  paid: boolean
): Promise<boolean> {
  try {
    await fetchJson(
      `/api/rooms/${encodeURIComponent(roomId)}/guests/${encodeURIComponent(
        guestId
      )}/payment`,
      {
        method: 'PATCH',
        body: JSON.stringify({ paid }),
      }
    );
    return true;
  } catch {
    return false;
  }
}

export async function fetchRoomMessagesFromApi(
  roomId: string,
  currentUserId?: string
): Promise<ChatMessage[] | null> {
  try {
    const data = await fetchJson<{ messages: RawMessage[] }>(
      `/api/rooms/${encodeURIComponent(roomId)}/messages`
    );
    return (data.messages || []).map((m) => mapMessage(m, currentUserId));
  } catch {
    return null;
  }
}

export async function sendRoomMessageOnApi(
  roomId: string,
  msg: ChatMessage
): Promise<ChatMessage | null> {
  try {
    const data = await fetchJson<{ message: RawMessage }>(
      `/api/rooms/${encodeURIComponent(roomId)}/messages`,
      {
        method: 'POST',
        body: JSON.stringify({
          sender_id: msg.senderId,
          sender_name: msg.senderName,
          sender_initials: msg.senderInitials,
          sender_color: msg.senderColor,
          text: msg.text,
          timestamp_label: msg.timestamp,
          media: msg.media || null,
          reactions: msg.reactions,
          reply_to: msg.replyTo || null,
          pinned: Boolean(msg.pinned),
        }),
      }
    );
    return data.message ? mapMessage(data.message, msg.senderId) : null;
  } catch {
    return null;
  }
}

export async function fetchMediaFromApi(): Promise<MediaItem[] | null> {
  try {
    const data = await fetchJson<{ media: RawMedia[] }>('/api/media');
    return (data.media || []).map(mapMedia);
  } catch {
    return null;
  }
}

export async function createMediaOnApi(
  item: MediaItem
): Promise<MediaItem | null> {
  try {
    const data = await fetchJson<{ media: RawMedia }>('/api/media', {
      method: 'POST',
      body: JSON.stringify({
        room_id: item.eventId,
        event_name: item.eventName,
        type: item.type,
        url: item.url,
        thumbnail: item.thumbnail,
        title: item.title,
        uploaded_by: item.uploadedBy,
        uploaded_at: item.uploadedAt,
        duration: item.duration || null,
      }),
    });
    return data.media ? mapMedia(data.media) : null;
  } catch {
    return null;
  }
}

export async function deleteAccountOnApi(
  accessToken: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/delete-account`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: body.error || `Request failed (${res.status})` };
    }
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Unable to reach server',
    };
  }
}

export async function sendWelcomeEmailOnApi(
  email: string,
  name?: string
): Promise<void> {
  if (!email) return;
  try {
    await fetchJson(
      '/api/emails/welcome',
      {
        method: 'POST',
        body: JSON.stringify({ email, name: name || '' }),
      },
      8000
    );
  } catch {
    // Non-blocking background email
  }
}

export async function requestPasswordResetOnApi(
  email: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    await fetchJson(
      '/api/auth/forgot-password',
      {
        method: 'POST',
        body: JSON.stringify({ email }),
      },
      10000
    );
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Unable to reach server',
    };
  }
}

export async function joinRoomOnApi(
  roomId: string,
  payload: { name: string; email?: string; phone?: string }
): Promise<{ ok: boolean; guest?: Guest; emailSent?: boolean }> {
  try {
    const data = await fetchJson<{
      ok: boolean;
      guest?: RawGuest;
      emailSent?: boolean;
    }>(
      `/api/rooms/${encodeURIComponent(roomId)}/join`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      10000
    );
    return {
      ok: Boolean(data.ok),
      guest: data.guest ? mapGuest(data.guest) : undefined,
      emailSent: Boolean(data.emailSent),
    };
  } catch {
    return { ok: false };
  }
}
