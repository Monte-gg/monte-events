import { supabase } from './supabase';
import {
  BudgetBreakdown,
  ChatMessage,
  ChatReaction,
  EventType,
  Guest,
  MediaItem,
  MonteEvent,
  UserProfile,
} from '../types';

export interface SupabaseSyncResult {
  connected: boolean;
  schemaReady: boolean;
  seeded: boolean;
  events: MonteEvent[] | null;
  media: MediaItem[] | null;
  messagesByEvent: Record<string, ChatMessage[]> | null;
}

export async function signInWithEmail(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signUpWithEmail(payload: {
  name: string;
  email: string;
  password: string;
  phone?: string;
}) {
  const redirectUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname}?verified=true`
      : 'https://monte-gg.github.io/monte-events/?verified=true';

  return supabase.auth.signUp({
    email: payload.email,
    password: payload.password,
    options: {
      emailRedirectTo: redirectUrl,
      data: {
        full_name: payload.name,
        phone: payload.phone || '',
      },
    },
  });
}

export async function signOutSupabase() {
  return supabase.auth.signOut();
}

/**
 * Upload a browser File (photo, video, or avatar) to Supabase Storage `event-media` bucket.
 * Falls back to a local object URL if the bucket hasn't been created yet.
 */
export async function uploadFileToStorage(
  file: File,
  folder: string
): Promise<string> {
  try {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = `${folder}/${Date.now()}-${safeName}`;
    const { error } = await supabase.storage
      .from('event-media')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      return URL.createObjectURL(file);
    }

    const { data } = supabase.storage.from('event-media').getPublicUrl(filePath);
    return data.publicUrl || URL.createObjectURL(file);
  } catch {
    return URL.createObjectURL(file);
  }
}

export async function seedInitialDataToSupabase(
  events: MonteEvent[],
  messagesByEvent: Record<string, ChatMessage[]>,
  media: MediaItem[]
): Promise<boolean> {
  try {
    const { error: evErr } = await supabase.from('events').upsert(
      events.map((event) => ({
        id: event.id,
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
      }))
    );
    if (evErr) return false;

    const allGuests = events.flatMap((event) =>
      event.guests.map((g) => ({
        id: g.id,
        event_id: event.id,
        friend_id: g.friendId || null,
        name: g.name,
        phone: g.phone,
        email: g.email || '',
        initials: g.initials,
        avatar_color: g.avatarColor,
        amount: g.amount,
        paid: g.paid,
        online: g.online,
        paid_at: g.paidAt || null,
      }))
    );
    if (allGuests.length > 0) {
      await supabase.from('event_guests').upsert(allGuests);
    }

    const allMessages = Object.values(messagesByEvent)
      .flat()
      .map((m) => ({
        id: m.id,
        event_id: m.eventId,
        sender_id: m.senderId,
        sender_name: m.senderName,
        sender_initials: m.senderInitials,
        sender_color: m.senderColor,
        text: m.text,
        timestamp_label: m.timestamp,
        media: m.media || null,
        reactions: m.reactions,
        reply_to: m.replyTo || null,
        pinned: Boolean(m.pinned),
      }));
    if (allMessages.length > 0) {
      await supabase.from('event_messages').upsert(allMessages);
    }

    if (media.length > 0) {
      await supabase.from('event_media').upsert(
        media.map((m) => ({
          id: m.id,
          event_id: m.eventId,
          event_name: m.eventName,
          type: m.type,
          url: m.url,
          thumbnail: m.thumbnail,
          title: m.title,
          uploaded_by: m.uploadedBy,
          uploaded_at: m.uploadedAt,
          duration: m.duration || null,
        }))
      );
    }
    return true;
  } catch {
    return false;
  }
}

export async function loadAllMonteData(
  currentUserId?: string,
  seedFallback?: {
    events: MonteEvent[];
    messagesByEvent: Record<string, ChatMessage[]>;
    media: MediaItem[];
  }
): Promise<SupabaseSyncResult> {
  try {
    const { data: eventsData, error: eventsErr } = await supabase
      .from('events')
      .select('*')
      .order('created_at', { ascending: false });

    if (eventsErr) {
      return {
        connected: true,
        schemaReady: false,
        seeded: false,
        events: null,
        media: null,
        messagesByEvent: null,
      };
    }

    // If database tables exist but are empty, auto-seed starter events once
    if ((!eventsData || eventsData.length === 0) && seedFallback) {
      const didSeed = await seedInitialDataToSupabase(
        seedFallback.events,
        seedFallback.messagesByEvent,
        seedFallback.media
      );
      if (didSeed) {
        return {
          connected: true,
          schemaReady: true,
          seeded: true,
          events: seedFallback.events,
          media: seedFallback.media,
          messagesByEvent: seedFallback.messagesByEvent,
        };
      }
      return {
        connected: true,
        schemaReady: true,
        seeded: false,
        events: null,
        media: null,
        messagesByEvent: null,
      };
    }

    const [{ data: guestsData }, { data: messagesData }, { data: mediaData }] =
      await Promise.all([
        supabase
          .from('event_guests')
          .select('*')
          .order('created_at', { ascending: true }),
        supabase
          .from('event_messages')
          .select('*')
          .order('created_at', { ascending: true }),
        supabase
          .from('event_media')
          .select('*')
          .order('created_at', { ascending: false }),
      ]);

    const guestsByEvent: Record<string, Guest[]> = {};
    (guestsData || []).forEach((g: Record<string, unknown>) => {
      const evId = String(g.event_id);
      if (!guestsByEvent[evId]) guestsByEvent[evId] = [];
      guestsByEvent[evId].push({
        id: String(g.id),
        friendId: g.friend_id ? String(g.friend_id) : undefined,
        name: String(g.name),
        phone: String(g.phone || ''),
        email: g.email ? String(g.email) : undefined,
        initials: String(g.initials || 'G'),
        avatarColor: String(g.avatar_color || '#1A6BFF'),
        amount: Number(g.amount || 0),
        paid: Boolean(g.paid),
        online: Boolean(g.online),
        paidAt: g.paid_at ? String(g.paid_at) : undefined,
      });
    });

    const events: MonteEvent[] = (eventsData || []).map(
      (e: Record<string, unknown>) => ({
        id: String(e.id),
        name: String(e.name),
        type: (e.type as EventType) || 'Roadtrip',
        customType: e.custom_type ? String(e.custom_type) : undefined,
        date: String(e.date),
        location: String(e.location),
        description: String(e.description || ''),
        coverImage: String(e.cover_image || ''),
        coverGradient: String(
          e.cover_gradient || 'from-[#0B2E8F] via-[#1A6BFF] to-[#2B7FFF]'
        ),
        totalBudget: Number(e.total_budget || 0),
        maxGuests: Number(e.max_guests || 10),
        costPerPerson: Number(e.cost_per_person || 0),
        inviteCode: String(e.invite_code || ''),
        guests: guestsByEvent[String(e.id)] || [],
        budgetBreakdown: (e.budget_breakdown as BudgetBreakdown) || {
          Transport: 0,
          Food: 0,
          Venue: 0,
          DJ: 0,
          Misc: 0,
        },
        unreadCount: 0,
        createdBy: String(e.created_by || 'Monte Host'),
      })
    );

    const messagesByEvent: Record<string, ChatMessage[]> = {};
    (messagesData || []).forEach((m: Record<string, unknown>) => {
      const evId = String(m.event_id);
      if (!messagesByEvent[evId]) messagesByEvent[evId] = [];
      const senderId = String(m.sender_id);
      messagesByEvent[evId].push({
        id: String(m.id),
        eventId: evId,
        senderId,
        senderName: String(m.sender_name),
        senderInitials: String(m.sender_initials || 'ME'),
        senderColor: String(m.sender_color || '#1A6BFF'),
        isMe:
          senderId === 'me' ||
          (Boolean(currentUserId) && senderId === currentUserId),
        text: String(m.text),
        timestamp: String(m.timestamp_label || 'Now'),
        media: m.media as ChatMessage['media'],
        reactions: (m.reactions as ChatReaction[]) || [],
        replyTo: m.reply_to as ChatMessage['replyTo'],
        pinned: Boolean(m.pinned),
      });
    });

    const media: MediaItem[] = (mediaData || []).map(
      (item: Record<string, unknown>) => ({
        id: String(item.id),
        eventId: String(item.event_id),
        eventName: String(item.event_name),
        type: item.type === 'video' ? 'video' : 'photo',
        url: String(item.url),
        thumbnail: String(item.thumbnail),
        title: String(item.title),
        uploadedBy: String(item.uploaded_by),
        uploadedAt: String(item.uploaded_at || 'Just now'),
        duration: item.duration ? String(item.duration) : undefined,
      })
    );

    return {
      connected: true,
      schemaReady: true,
      seeded: false,
      events,
      media,
      messagesByEvent,
    };
  } catch {
    return {
      connected: false,
      schemaReady: false,
      seeded: false,
      events: null,
      media: null,
      messagesByEvent: null,
    };
  }
}

export async function fetchProfileFromSupabase(
  userId: string
): Promise<Partial<UserProfile> | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (error || !data) return null;
    return {
      name: data.name,
      username: data.username,
      bio: data.bio || '',
      email: data.email || '',
      phone: data.phone || '',
      location: data.location || 'Nairobi, KE',
      birthday: data.birthday || '1997-08-18',
      memberSince: data.member_since || 'March 2024',
      mpesaNumber: data.mpesa_number || '',
      avatarUrl: data.avatar_url || '',
      initials: data.initials || 'ME',
      preferredTypes: (data.preferred_types as EventType[]) || [
        'Roadtrip',
        'Birthday',
      ],
    };
  } catch {
    return null;
  }
}

export async function createEventInSupabase(event: MonteEvent) {
  try {
    const { error } = await supabase.from('events').upsert({
      id: event.id,
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
    });
    if (error) return false;

    if (event.guests.length > 0) {
      await supabase.from('event_guests').upsert(
        event.guests.map((g) => ({
          id: g.id,
          event_id: event.id,
          friend_id: g.friendId || null,
          name: g.name,
          phone: g.phone,
          email: g.email || '',
          initials: g.initials,
          avatar_color: g.avatarColor,
          amount: g.amount,
          paid: g.paid,
          online: g.online,
          paid_at: g.paidAt || null,
        }))
      );
    }
    return true;
  } catch {
    return false;
  }
}

export async function toggleGuestPaidInSupabase(
  guestId: string,
  paid: boolean,
  paidAt?: string
) {
  try {
    await supabase
      .from('event_guests')
      .update({ paid, paid_at: paidAt || null })
      .eq('id', guestId);
  } catch {
    // Graceful local-first fallback
  }
}

export async function addGuestInSupabase(eventId: string, guest: Guest) {
  try {
    await supabase.from('event_guests').upsert({
      id: guest.id,
      event_id: eventId,
      friend_id: guest.friendId || null,
      name: guest.name,
      phone: guest.phone,
      email: guest.email || '',
      initials: guest.initials,
      avatar_color: guest.avatarColor,
      amount: guest.amount,
      paid: guest.paid,
      online: guest.online,
      paid_at: guest.paidAt || null,
    });
  } catch {
    // Graceful local-first fallback
  }
}

export async function sendMessageInSupabase(msg: ChatMessage) {
  try {
    await supabase.from('event_messages').upsert({
      id: msg.id,
      event_id: msg.eventId,
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
    });
  } catch {
    // Graceful local-first fallback
  }
}

export async function updateMessageReactionsInSupabase(
  messageId: string,
  reactions: ChatReaction[]
) {
  try {
    await supabase
      .from('event_messages')
      .update({ reactions })
      .eq('id', messageId);
  } catch {
    // Graceful local-first fallback
  }
}

export async function updateMessagePinInSupabase(
  messageId: string,
  pinned: boolean
) {
  try {
    await supabase
      .from('event_messages')
      .update({ pinned })
      .eq('id', messageId);
  } catch {
    // Graceful local-first fallback
  }
}

export async function uploadMediaInSupabase(items: MediaItem[]) {
  try {
    await supabase.from('event_media').upsert(
      items.map((m) => ({
        id: m.id,
        event_id: m.eventId,
        event_name: m.eventName,
        type: m.type,
        url: m.url,
        thumbnail: m.thumbnail,
        title: m.title,
        uploaded_by: m.uploadedBy,
        uploaded_at: m.uploadedAt,
        duration: m.duration || null,
      }))
    );
  } catch {
    // Graceful local-first fallback
  }
}

export async function upsertProfileInSupabase(
  userId: string | null,
  profile: UserProfile
) {
  if (!userId) return;
  try {
    await supabase.from('profiles').upsert({
      id: userId,
      name: profile.name,
      username: profile.username,
      bio: profile.bio,
      email: profile.email,
      phone: profile.phone,
      location: profile.location,
      birthday: profile.birthday,
      member_since: profile.memberSince,
      mpesa_number: profile.mpesaNumber,
      avatar_url: profile.avatarUrl,
      initials: profile.initials,
      preferred_types: profile.preferredTypes,
    });
  } catch {
    // Graceful local-first fallback
  }
}
