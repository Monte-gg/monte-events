import { supabase } from './supabase';
import {
  BudgetBreakdown,
  ChatMessage,
  ChatReaction,
  EventType,
  Guest,
  MediaItem,
  MonteEvent,
  PlatformMember,
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

export async function deleteEventInSupabase(eventId: string) {
  try {
    await supabase.from('events').delete().eq('id', eventId);
  } catch {
    // Graceful fallback
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

export async function loadRoomsDirectlyFromSupabase(): Promise<MonteEvent[] | null> {
  try {
    const [{ data: rooms, error: roomsErr }, { data: guests }, { data: expenses }] =
      await Promise.all([
        supabase
          .from('rooms')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('guests')
          .select('*')
          .order('created_at', { ascending: true }),
        supabase
          .from('expenses')
          .select('*')
          .order('created_at', { ascending: false }),
      ]);

    if (roomsErr || !rooms) return null;

    const guestsByRoom = new Map<string, Guest[]>();
    for (const g of guests || []) {
      const paid = Boolean(g.paid) || g.payment_status === 'confirmed';
      const mapped: Guest = {
        id: g.id,
        name: g.name,
        phone: g.phone || '',
        email: g.email || undefined,
        initials: g.initials || String(g.name || 'G').slice(0, 2).toUpperCase(),
        avatarColor: g.avatar_color || '#1A6BFF',
        amount: Number(g.amount || 0),
        paid,
        paymentStatus: paid
          ? 'confirmed'
          : g.payment_status === 'submitted'
          ? 'submitted'
          : 'pending',
        mpesaCode: g.mpesa_code || undefined,
        online: Boolean(g.online),
        paidAt: g.paid_at ? 'Paid' : undefined,
      };
      const list = guestsByRoom.get(g.room_id) || [];
      list.push(mapped);
      guestsByRoom.set(g.room_id, list);
    }

    const expensesByRoom = new Map<string, MonteEvent['expenses']>();
    for (const ex of expenses || []) {
      const list = expensesByRoom.get(ex.room_id) || [];
      list.push({
        id: ex.id,
        roomId: ex.room_id,
        title: ex.title,
        category: ex.category || 'Other',
        amount: Number(ex.amount || 0),
        paidBy: ex.paid_by || 'Host',
        createdAt: ex.created_at,
      });
      expensesByRoom.set(ex.room_id, list);
    }

    return rooms.map((r) => ({
      id: r.id,
      name: r.name,
      type: (r.type as EventType) || 'Roadtrip',
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
      guests: guestsByRoom.get(r.id) || [],
      expenses: expensesByRoom.get(r.id) || [],
      budgetBreakdown: (r.budget_breakdown as BudgetBreakdown) || {
        Transport: 0,
        Food: 0,
        Venue: 0,
        DJ: 0,
        Misc: 0,
      },
      unreadCount: 0,
      createdBy: r.created_by || 'Monte Host',
      hostEmail: r.host_email || undefined,
      mpesaType: r.mpesa_type || undefined,
      mpesaNumber: r.mpesa_number || undefined,
      mpesaAccount: r.mpesa_account || undefined,
      mpesaName: r.mpesa_name || undefined,
      payoutType: r.payout_type || undefined,
      payheroChannelId:
        r.payhero_channel_id !== null && r.payhero_channel_id !== undefined
          ? Number(r.payhero_channel_id)
          : null,
      payoutShortCode: r.payout_short_code || undefined,
      payoutAccountNumber: r.payout_account_number || undefined,
      activities: Array.isArray(r.activities) ? r.activities : [],
      mainGuests: Array.isArray(r.main_guests) ? r.main_guests : [],
      subEvents: Array.isArray(r.sub_events) ? r.sub_events : [],
      locationPinUrl: r.location_pin_url || undefined,
    }));
  } catch {
    return null;
  }
}

export async function createRoomDirectlyInSupabase(
  event: MonteEvent
): Promise<MonteEvent | null> {
  try {
    const basePayload = {
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
    };

    const fullPayload = {
      ...basePayload,
      ...(event.hostEmail ? { host_email: event.hostEmail } : {}),
      ...(event.mpesaType ? { mpesa_type: event.mpesaType } : {}),
      ...(event.mpesaNumber ? { mpesa_number: event.mpesaNumber } : {}),
      ...(event.mpesaAccount ? { mpesa_account: event.mpesaAccount } : {}),
      ...(event.mpesaName ? { mpesa_name: event.mpesaName } : {}),
      ...(event.payoutType ? { payout_type: event.payoutType } : {}),
      ...(event.payheroChannelId ? { payhero_channel_id: event.payheroChannelId } : {}),
      ...(event.payoutShortCode ? { payout_short_code: event.payoutShortCode } : {}),
      ...(event.payoutAccountNumber
        ? { payout_account_number: event.payoutAccountNumber }
        : {}),
      ...(event.activities && event.activities.length > 0
        ? { activities: event.activities }
        : {}),
      ...(event.mainGuests && event.mainGuests.length > 0
        ? { main_guests: event.mainGuests }
        : {}),
      ...(event.subEvents && event.subEvents.length > 0
        ? { sub_events: event.subEvents }
        : {}),
      ...(event.locationPinUrl ? { location_pin_url: event.locationPinUrl } : {}),
    };

    let { data: room, error: roomErr } = await supabase
      .from('rooms')
      .insert(fullPayload)
      .select()
      .single();

    if (roomErr && /column .* does not exist/i.test(roomErr.message || '')) {
      const retry = await supabase
        .from('rooms')
        .insert(basePayload)
        .select()
        .single();
      room = retry.data;
      roomErr = retry.error;
    }

    if (roomErr || !room) return null;

    let savedGuests: Guest[] = event.guests;
    if (event.guests.length > 0) {
      const { data: gData } = await supabase
        .from('guests')
        .insert(
          event.guests.map((g) => ({
            room_id: room.id,
            name: g.name,
            phone: g.phone || '',
            email: g.email || '',
            initials: g.initials,
            avatar_color: g.avatarColor,
            amount: g.amount,
            paid: g.paid,
            online: g.online,
          }))
        )
        .select();
      if (gData && gData.length > 0) {
        savedGuests = gData.map((g) => ({
          id: g.id,
          name: g.name,
          phone: g.phone || '',
          email: g.email || undefined,
          initials: g.initials || 'G',
          avatarColor: g.avatar_color || '#1A6BFF',
          amount: Number(g.amount || 0),
          paid: Boolean(g.paid),
          paymentStatus: g.paid ? 'confirmed' : 'pending',
          online: Boolean(g.online),
        }));
      }
    }

    if (event.expenses && event.expenses.length > 0) {
      await supabase.from('expenses').insert(
        event.expenses.map((ex) => ({
          room_id: room.id,
          title: ex.title,
          category: ex.category,
          amount: ex.amount,
          paid_by: ex.paidBy,
        }))
      );
    }

    return {
      ...event,
      id: room.id,
      guests: savedGuests,
    };
  } catch {
    return null;
  }
}

export async function joinRoomDirectlyInSupabase(
  roomId: string,
  payload: { name: string; email?: string; phone?: string; amount?: number }
): Promise<Guest | null> {
  try {
    if (!roomId || roomId.startsWith('evt-')) return null;

    if (payload.email) {
      const { data: existing } = await supabase
        .from('guests')
        .select('*')
        .eq('room_id', roomId)
        .ilike('email', payload.email.trim())
        .maybeSingle();

      if (existing) {
        return {
          id: existing.id,
          name: existing.name,
          phone: existing.phone || '',
          email: existing.email || undefined,
          initials: existing.initials || payload.name.slice(0, 2).toUpperCase(),
          avatarColor: existing.avatar_color || '#1A6BFF',
          amount: Number(existing.amount || payload.amount || 0),
          paid: Boolean(existing.paid) || existing.payment_status === 'confirmed',
          paymentStatus: existing.paid ? 'confirmed' : 'pending',
          online: true,
        };
      }
    }

    const parts = payload.name.trim().split(/\s+/);
    const initials = (
      (parts[0]?.[0] || 'G') + (parts[1]?.[0] || parts[0]?.[1] || '')
    ).toUpperCase();

    const { data, error } = await supabase
      .from('guests')
      .insert({
        room_id: roomId,
        name: payload.name.trim(),
        email: (payload.email || '').trim(),
        phone: (payload.phone || '').trim(),
        initials,
        avatar_color: '#1A6BFF',
        amount: Number(payload.amount || 0),
        paid: false,
        online: true,
      })
      .select()
      .single();

    if (error || !data) return null;
    return {
      id: data.id,
      name: data.name,
      phone: data.phone || '',
      email: data.email || undefined,
      initials: data.initials || initials,
      avatarColor: data.avatar_color || '#1A6BFF',
      amount: Number(data.amount || 0),
      paid: Boolean(data.paid),
      paymentStatus: 'pending',
      online: true,
    };
  } catch {
    return null;
  }
}

export async function fetchInvitePreviewDirectlyFromSupabase(inviteCode: string) {
  try {
    const { data: room, error } = await supabase
      .from('rooms')
      .select('*')
      .ilike('invite_code', inviteCode.trim())
      .maybeSingle();
    if (error || !room) return null;

    const { data: guests } = await supabase
      .from('guests')
      .select('paid, payment_status')
      .eq('room_id', room.id);

    const paidCount = (guests || []).filter(
      (g) => g.paid || g.payment_status === 'confirmed'
    ).length;

    return {
      id: room.id,
      name: room.name,
      type: (room.type as EventType) || 'Roadtrip',
      customType: room.custom_type || undefined,
      date: room.date,
      location: room.location || 'Nairobi, KE',
      description: room.description || '',
      coverImage: room.cover_image || '',
      coverGradient:
        room.cover_gradient || 'from-[#0B2E8F] via-[#1A6BFF] to-[#2B7FFF]',
      costPerPerson: Number(room.cost_per_person || 0),
      maxGuests: Number(room.max_guests || 10),
      guestCount: (guests || []).length,
      paidCount,
      inviteCode: room.invite_code,
      createdBy: room.created_by || 'Monte Host',
    };
  } catch {
    return null;
  }
}

export async function deleteRoomDirectlyInSupabase(
  roomId: string,
  inviteCode?: string
): Promise<void> {
  try {
    const ops: PromiseLike<unknown>[] = [];
    if (roomId && !roomId.startsWith('evt-')) {
      ops.push(supabase.from('rooms').delete().eq('id', roomId));
    }
    if (inviteCode) {
      ops.push(supabase.from('rooms').delete().eq('invite_code', inviteCode));
      ops.push(supabase.from('events').delete().eq('invite_code', inviteCode));
    }
    ops.push(supabase.from('events').delete().eq('id', roomId));
    await Promise.allSettled(ops);
  } catch {
    // Graceful fallback — Render API delete also runs in parallel
  }
}

export async function loadMembersDirectlyFromSupabase(): Promise<PlatformMember[]> {
  try {
    const [profilesRes, guestsRes, roomsRes] = await Promise.all([
      supabase
        .from('profiles')
        .select(
          'id, name, username, bio, location, member_since, avatar_url, initials, preferred_types, email'
        ),
      supabase.from('guests').select('id, name, email, initials'),
      supabase.from('rooms').select('created_by, host_email'),
    ]);

    const byKey = new Map<string, PlatformMember>();

    const makeInitials = (name: string) => {
      const parts = String(name || 'Monte Member').trim().split(/\s+/);
      return (
        (parts[0]?.[0] || 'M') + (parts[1]?.[0] || parts[0]?.[1] || 'E')
      ).toUpperCase();
    };

    const makeUsername = (name: string) =>
      String(name || 'member')
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, '') || 'member';

    for (const p of profilesRes.data || []) {
      const name = String(p.name || 'Monte Member').trim();
      const email = p.email ? String(p.email).trim() : '';
      const key = (email || String(p.id)).toLowerCase();
      byKey.set(key, {
        id: String(p.id),
        name,
        username: String(p.username || makeUsername(name)),
        email,
        avatarUrl: String(p.avatar_url || ''),
        initials: String(p.initials || makeInitials(name)),
        bio: String(p.bio || 'Monte Events member'),
        location: String(p.location || 'Nairobi, KE'),
        memberSince: String(p.member_since || 'Monte Member'),
        preferredTypes: Array.isArray(p.preferred_types)
          ? (p.preferred_types as EventType[])
          : ['Roadtrip', 'Birthday'],
      });
    }

    for (const g of guestsRes.data || []) {
      const name = String(g.name || '').trim();
      const email = g.email ? String(g.email).trim() : '';
      if (!name) continue;
      const key = (email || name).toLowerCase();
      if (byKey.has(key)) continue;
      byKey.set(key, {
        id: `guest-member-${g.id}`,
        name,
        username: makeUsername(name),
        email,
        avatarUrl: '',
        initials: String(g.initials || makeInitials(name)),
        bio: 'Monte Events guest & member',
        location: 'Nairobi, KE',
        memberSince: 'Monte Member',
        preferredTypes: ['Roadtrip', 'Birthday'],
      });
    }

    for (const r of roomsRes.data || []) {
      const name = String(r.created_by || '').trim();
      const email = r.host_email ? String(r.host_email).trim() : '';
      if (!name) continue;
      const key = (email || name).toLowerCase();
      if (byKey.has(key)) continue;
      byKey.set(key, {
        id: `host-member-${makeUsername(name)}`,
        name,
        username: makeUsername(name),
        email,
        avatarUrl: '',
        initials: makeInitials(name),
        bio: 'Monte Events host',
        location: 'Nairobi, KE',
        memberSince: 'Monte Host',
        preferredTypes: ['Roadtrip', 'House Party'],
      });
    }

    return Array.from(byKey.values());
  } catch {
    return [];
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
