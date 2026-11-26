import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { supabase, isSupabaseConfigured } from './supabase.js';

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const FRONTEND_URL = (
  process.env.FRONTEND_URL || 'https://monte-gg.github.io/monte-events'
).replace(/\/+$/, '');

const configuredOrigins = (
  process.env.CORS_ORIGIN || 'https://monte-gg.github.io'
)
  .split(',')
  .map((o) => o.trim().replace(/\/+$/, ''))
  .filter(Boolean);

const allowedOrigins = new Set([
  ...configuredOrigins,
  'https://monte-gg.github.io',
  'http://localhost:5173',
  'http://localhost:4173',
]);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      const normalized = origin.replace(/\/+$/, '');
      if (allowedOrigins.has(normalized)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '5mb' }));

function requireSupabase(res) {
  if (!isSupabaseConfigured || !supabase) {
    res.status(503).json({
      error: 'Database is not configured on the server yet.',
    });
    return false;
  }
  return true;
}

function generateInviteCode() {
  return `MONTE-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
}

function buildInviteLink(code) {
  return `${FRONTEND_URL}/?join=${encodeURIComponent(code)}`;
}

// Health check
app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'monte-events-api',
    database: isSupabaseConfigured ? 'configured' : 'unconfigured',
    timestamp: new Date().toISOString(),
  });
});

// GET /api/rooms — list all event rooms with their guests
app.get('/api/rooms', async (_req, res) => {
  if (!requireSupabase(res)) return;
  try {
    const { data: rooms, error: roomsErr } = await supabase
      .from('rooms')
      .select('*')
      .order('created_at', { ascending: false });

    if (roomsErr) throw roomsErr;

    const { data: guests, error: guestsErr } = await supabase
      .from('guests')
      .select('*')
      .order('created_at', { ascending: true });

    if (guestsErr) throw guestsErr;

    const guestsByRoom = new Map();
    for (const g of guests || []) {
      const list = guestsByRoom.get(g.room_id) || [];
      list.push(g);
      guestsByRoom.set(g.room_id, list);
    }

    const enriched = (rooms || []).map((room) => ({
      ...room,
      invite_link: buildInviteLink(room.invite_code),
      guests: guestsByRoom.get(room.id) || [],
    }));

    res.json({ rooms: enriched });
  } catch (err) {
    console.error('GET /api/rooms failed:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch rooms' });
  }
});

// POST /api/rooms — create a new event room (+ optional initial guests)
app.post('/api/rooms', async (req, res) => {
  if (!requireSupabase(res)) return;
  try {
    const {
      name,
      type = 'Roadtrip',
      custom_type = null,
      date,
      location = 'Nairobi, KE',
      description = '',
      cover_image = '',
      cover_gradient = 'from-[#0B2E8F] via-[#1A6BFF] to-[#2B7FFF]',
      total_budget = 0,
      max_guests = 10,
      cost_per_person = 0,
      invite_code,
      budget_breakdown = {
        Transport: 0,
        Food: 0,
        Venue: 0,
        DJ: 0,
        Misc: 0,
      },
      created_by = 'Monte Host',
      guests = [],
    } = req.body || {};

    if (!name || !date) {
      return res.status(400).json({ error: 'name and date are required' });
    }

    const code = invite_code || generateInviteCode();

    const { data: room, error: roomErr } = await supabase
      .from('rooms')
      .insert({
        name,
        type,
        custom_type,
        date,
        location,
        description,
        cover_image,
        cover_gradient,
        total_budget: Number(total_budget) || 0,
        max_guests: Number(max_guests) || 10,
        cost_per_person: Number(cost_per_person) || 0,
        invite_code: code,
        budget_breakdown,
        created_by,
      })
      .select()
      .single();

    if (roomErr) throw roomErr;

    let insertedGuests = [];
    if (Array.isArray(guests) && guests.length > 0) {
      const payload = guests.map((g) => ({
        room_id: room.id,
        name: g.name,
        phone: g.phone || '',
        email: g.email || '',
        initials:
          g.initials ||
          String(g.name || 'G')
            .split(' ')
            .map((p) => p[0])
            .join('')
            .slice(0, 2)
            .toUpperCase(),
        avatar_color: g.avatar_color || g.avatarColor || '#1A6BFF',
        amount: Number(g.amount ?? room.cost_per_person) || 0,
        paid: Boolean(g.paid),
        online: Boolean(g.online),
        paid_at: g.paid ? new Date().toISOString() : null,
      }));

      const { data: gData, error: gErr } = await supabase
        .from('guests')
        .insert(payload)
        .select();

      if (gErr) throw gErr;
      insertedGuests = gData || [];
    }

    res.status(201).json({
      room: {
        ...room,
        invite_link: buildInviteLink(room.invite_code),
        guests: insertedGuests,
      },
    });
  } catch (err) {
    console.error('POST /api/rooms failed:', err);
    res.status(500).json({ error: err.message || 'Failed to create room' });
  }
});

// GET /api/rooms/:id/guests — list guests in a room
app.get('/api/rooms/:id/guests', async (req, res) => {
  if (!requireSupabase(res)) return;
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('guests')
      .select('*')
      .eq('room_id', id)
      .order('created_at', { ascending: true });

    if (error) throw error;
    res.json({ guests: data || [] });
  } catch (err) {
    console.error('GET /api/rooms/:id/guests failed:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch guests' });
  }
});

// POST /api/rooms/:id/guests — add a guest to a room
app.post('/api/rooms/:id/guests', async (req, res) => {
  if (!requireSupabase(res)) return;
  try {
    const { id } = req.params;
    const {
      name,
      phone = '',
      email = '',
      initials,
      avatar_color = '#1A6BFF',
      amount = 0,
      paid = false,
      online = false,
    } = req.body || {};

    if (!name) {
      return res.status(400).json({ error: 'Guest name is required' });
    }

    const computedInitials =
      initials ||
      String(name)
        .split(' ')
        .map((p) => p[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();

    const { data, error } = await supabase
      .from('guests')
      .insert({
        room_id: id,
        name,
        phone,
        email,
        initials: computedInitials,
        avatar_color,
        amount: Number(amount) || 0,
        paid: Boolean(paid),
        online: Boolean(online),
        paid_at: paid ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ guest: data });
  } catch (err) {
    console.error('POST /api/rooms/:id/guests failed:', err);
    res.status(500).json({ error: err.message || 'Failed to add guest' });
  }
});

// PATCH /api/rooms/:id/guests/:guestId/payment — toggle paid status & return updated counts
app.patch('/api/rooms/:id/guests/:guestId/payment', async (req, res) => {
  if (!requireSupabase(res)) return;
  try {
    const { id, guestId } = req.params;

    const { data: existing, error: fetchErr } = await supabase
      .from('guests')
      .select('*')
      .eq('id', guestId)
      .eq('room_id', id)
      .single();

    if (fetchErr || !existing) {
      return res.status(404).json({ error: 'Guest not found in room' });
    }

    const nextPaid =
      typeof req.body?.paid === 'boolean' ? req.body.paid : !existing.paid;

    const { data: updated, error: updateErr } = await supabase
      .from('guests')
      .update({
        paid: nextPaid,
        paid_at: nextPaid ? new Date().toISOString() : null,
      })
      .eq('id', guestId)
      .eq('room_id', id)
      .select()
      .single();

    if (updateErr) throw updateErr;

    const { data: allGuests, error: countErr } = await supabase
      .from('guests')
      .select('paid, amount')
      .eq('room_id', id);

    if (countErr) throw countErr;

    const totalCount = (allGuests || []).length;
    const paidList = (allGuests || []).filter((g) => g.paid);
    const paidCount = paidList.length;
    const collectedAmount = paidList.reduce(
      (sum, g) => sum + (Number(g.amount) || 0),
      0
    );

    res.json({
      guest: updated,
      counts: {
        paidCount,
        totalCount,
        collectedAmount,
      },
    });
  } catch (err) {
    console.error('PATCH payment failed:', err);
    res.status(500).json({ error: err.message || 'Failed to update payment' });
  }
});

// GET /api/rooms/:id/messages — list messages for a room
app.get('/api/rooms/:id/messages', async (req, res) => {
  if (!requireSupabase(res)) return;
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('room_id', id)
      .order('created_at', { ascending: true });

    if (error) throw error;
    res.json({ messages: data || [] });
  } catch (err) {
    console.error('GET /api/rooms/:id/messages failed:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch messages' });
  }
});

// POST /api/rooms/:id/messages — create a chat message in a room
app.post('/api/rooms/:id/messages', async (req, res) => {
  if (!requireSupabase(res)) return;
  try {
    const { id } = req.params;
    const {
      sender_id = 'me',
      sender_name = 'Monte Member',
      sender_initials = 'ME',
      sender_color = '#1A6BFF',
      text,
      timestamp_label,
      media = null,
      reactions = [],
      reply_to = null,
      pinned = false,
    } = req.body || {};

    if (!text) {
      return res.status(400).json({ error: 'Message text is required' });
    }

    const { data, error } = await supabase
      .from('messages')
      .insert({
        room_id: id,
        sender_id,
        sender_name,
        sender_initials,
        sender_color,
        text,
        timestamp_label:
          timestamp_label ||
          new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          }),
        media,
        reactions,
        reply_to,
        pinned: Boolean(pinned),
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ message: data });
  } catch (err) {
    console.error('POST /api/rooms/:id/messages failed:', err);
    res.status(500).json({ error: err.message || 'Failed to send message' });
  }
});

// GET /api/media — list Media Vault items
app.get('/api/media', async (_req, res) => {
  if (!requireSupabase(res)) return;
  try {
    const { data, error } = await supabase
      .from('media')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ media: data || [] });
  } catch (err) {
    console.error('GET /api/media failed:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch media' });
  }
});

// POST /api/media — create Media Vault metadata
app.post('/api/media', async (req, res) => {
  if (!requireSupabase(res)) return;
  try {
    const {
      room_id,
      event_name = 'Monte Event',
      type = 'photo',
      url,
      thumbnail,
      title = 'Event Memory',
      uploaded_by = 'Monte Member',
      uploaded_at = 'Just now',
      duration = null,
    } = req.body || {};

    if (!url) {
      return res.status(400).json({ error: 'Media url is required' });
    }

    const { data, error } = await supabase
      .from('media')
      .insert({
        room_id: room_id || null,
        event_name,
        type: type === 'video' ? 'video' : 'photo',
        url,
        thumbnail: thumbnail || url,
        title,
        uploaded_by,
        uploaded_at,
        duration,
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ media: data });
  } catch (err) {
    console.error('POST /api/media failed:', err);
    res.status(500).json({ error: err.message || 'Failed to save media' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(
    `[monte-events-api] listening on http://0.0.0.0:${PORT} (CORS: ${Array.from(
      allowedOrigins
    ).join(', ')})`
  );
});
