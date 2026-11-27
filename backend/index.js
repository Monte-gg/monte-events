import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { supabase, isSupabaseConfigured } from './supabase.js';
import {
  sendAccountDeletedEmail,
  sendPasswordResetEmail,
  sendPaymentConfirmedToGuestEmail,
  sendPaymentSubmittedToHostEmail,
  sendRoomJoinedEmail,
  sendWelcomeEmail,
} from './mailer.js';
import {
  initiatePayheroStkPush,
  isPayheroConfigured,
  normalizeKenyanPhone,
} from './payhero.js';

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

// GET /api/members — list registered Monte Events platform members
app.get('/api/members', async (_req, res) => {
  if (!requireSupabase(res)) return;
  try {
    const [{ data: usersData, error: usersErr }, profilesRes] =
      await Promise.all([
        supabase.auth.admin.listUsers({ page: 1, perPage: 100 }),
        supabase
          .from('profiles')
          .select(
            'id, name, username, bio, location, member_since, avatar_url, initials, preferred_types, email'
          )
          .then((r) => r)
          .catch(() => ({ data: null, error: null })),
      ]);

    if (usersErr) throw usersErr;

    const profileById = new Map();
    for (const p of profilesRes?.data || []) {
      profileById.set(p.id, p);
    }

    const members = (usersData?.users || []).map((u) => {
      const p = profileById.get(u.id);
      const meta = u.user_metadata || {};
      const name =
        p?.name ||
        meta.full_name ||
        meta.name ||
        (u.email ? u.email.split('@')[0] : 'Monte Member');
      const username =
        p?.username ||
        String(name)
          .toLowerCase()
          .replace(/[^a-z0-9_]/g, '') ||
        'member';
      const parts = String(name).trim().split(/\s+/);
      const initials =
        p?.initials ||
        ((parts[0]?.[0] || 'M') + (parts[1]?.[0] || parts[0]?.[1] || 'E')).toUpperCase();
      const createdDate = u.created_at ? new Date(u.created_at) : new Date();
      const memberSince =
        p?.member_since ||
        createdDate.toLocaleDateString('en-US', {
          month: 'short',
          year: 'numeric',
        });

      return {
        id: u.id,
        name,
        username,
        email: u.email || p?.email || '',
        bio: p?.bio || 'Monte Events community member',
        location: p?.location || 'Nairobi, KE',
        memberSince,
        avatarUrl: p?.avatar_url || meta.avatar_url || meta.picture || '',
        initials,
        preferredTypes:
          Array.isArray(p?.preferred_types) && p.preferred_types.length > 0
            ? p.preferred_types
            : ['Roadtrip', 'Birthday'],
      };
    });

    res.json({ members });
  } catch (err) {
    console.error('GET /api/members failed:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch members' });
  }
});

// GET /api/rooms — list all event rooms with their guests
app.get('/api/rooms', async (_req, res) => {
  if (!requireSupabase(res)) return;
  try {
    const [{ data: rooms, error: roomsErr }, { data: guests, error: guestsErr }, expensesRes] =
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
          .order('created_at', { ascending: false })
          .then((r) => r)
          .catch(() => ({ data: [], error: null })),
      ]);

    if (roomsErr) throw roomsErr;
    if (guestsErr) throw guestsErr;

    const guestsByRoom = new Map();
    for (const g of guests || []) {
      const list = guestsByRoom.get(g.room_id) || [];
      list.push(g);
      guestsByRoom.set(g.room_id, list);
    }

    const expensesByRoom = new Map();
    for (const ex of expensesRes?.data || []) {
      const list = expensesByRoom.get(ex.room_id) || [];
      list.push(ex);
      expensesByRoom.set(ex.room_id, list);
    }

    const enriched = (rooms || []).map((room) => ({
      ...room,
      invite_link: buildInviteLink(room.invite_code),
      guests: guestsByRoom.get(room.id) || [],
      expenses: expensesByRoom.get(room.id) || [],
    }));

    res.json({ rooms: enriched });
  } catch (err) {
    console.error('GET /api/rooms failed:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch rooms' });
  }
});

// GET /api/rooms/invite/:code — public event preview without requiring login
app.get('/api/rooms/invite/:code', async (req, res) => {
  if (!requireSupabase(res)) return;
  try {
    const code = String(req.params.code || '').trim();
    if (!code) {
      return res.status(400).json({ error: 'Invite code is required' });
    }

    const { data: room, error: roomErr } = await supabase
      .from('rooms')
      .select('*')
      .ilike('invite_code', code)
      .maybeSingle();

    if (roomErr) throw roomErr;
    if (!room) {
      return res.status(404).json({ error: 'Event invite not found' });
    }

    const { data: guests } = await supabase
      .from('guests')
      .select('paid, payment_status')
      .eq('room_id', room.id);

    const paidCount = (guests || []).filter(
      (g) => g.paid || g.payment_status === 'confirmed'
    ).length;

    res.json({
      preview: {
        id: room.id,
        name: room.name,
        type: room.type,
        custom_type: room.custom_type,
        date: room.date,
        location: room.location,
        description: room.description,
        cover_image: room.cover_image,
        cover_gradient: room.cover_gradient,
        cost_per_person: Number(room.cost_per_person || 0),
        max_guests: Number(room.max_guests || 10),
        guest_count: (guests || []).length,
        paid_count: paidCount,
        invite_code: room.invite_code,
        created_by: room.created_by,
      },
    });
  } catch (err) {
    console.error('GET /api/rooms/invite/:code failed:', err);
    res.status(500).json({ error: err.message || 'Failed to load invite preview' });
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
      host_email = null,
      mpesa_type = null,
      mpesa_number = null,
      mpesa_account = null,
      mpesa_name = null,
      activities = [],
      main_guests = [],
      sub_events = [],
      location_pin_url = null,
      guests = [],
      expenses = [],
    } = req.body || {};

    if (!name || !date) {
      return res.status(400).json({ error: 'name and date are required' });
    }

    const code = invite_code || generateInviteCode();

    const basePayload = {
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
    };

    const fullPayload = {
      ...basePayload,
      ...(mpesa_type ? { mpesa_type } : {}),
      ...(mpesa_number ? { mpesa_number } : {}),
      ...(mpesa_account ? { mpesa_account } : {}),
      ...(mpesa_name ? { mpesa_name } : {}),
      ...(host_email ? { host_email } : {}),
      ...(Array.isArray(activities) && activities.length > 0 ? { activities } : {}),
      ...(Array.isArray(main_guests) && main_guests.length > 0 ? { main_guests } : {}),
      ...(Array.isArray(sub_events) && sub_events.length > 0 ? { sub_events } : {}),
      ...(location_pin_url ? { location_pin_url } : {}),
    };

    let { data: room, error: roomErr } = await supabase
      .from('rooms')
      .insert(fullPayload)
      .select()
      .single();

    // Graceful fallback if new M-PESA columns haven't been migrated yet
    if (roomErr && /column .* does not exist/i.test(roomErr.message || '')) {
      const retry = await supabase
        .from('rooms')
        .insert(basePayload)
        .select()
        .single();
      room = retry.data;
      roomErr = retry.error;
    }

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

    let insertedExpenses = [];
    if (Array.isArray(expenses) && expenses.length > 0) {
      const expPayload = expenses.map((ex) => ({
        room_id: room.id,
        title: String(ex.title || '').trim(),
        category: ex.category || 'Other',
        amount: Number(ex.amount) || 0,
        paid_by: String(ex.paid_by || ex.paidBy || created_by || 'Host').trim(),
      })).filter((ex) => ex.title && ex.amount > 0);
      if (expPayload.length > 0) {
        const { data: eData } = await supabase
          .from('expenses')
          .insert(expPayload)
          .select();
        insertedExpenses = eData || [];
      }
    }

    res.status(201).json({
      room: {
        ...room,
        invite_link: buildInviteLink(room.invite_code),
        guests: insertedGuests,
        expenses: insertedExpenses,
      },
    });
  } catch (err) {
    console.error('POST /api/rooms failed:', err);
    res.status(500).json({ error: err.message || 'Failed to create room' });
  }
});

// PATCH /api/rooms/:id — update room budget, guest limit, location pin, activities, main guests, or sub-events
app.patch('/api/rooms/:id', async (req, res) => {
  if (!requireSupabase(res)) return;
  try {
    const { id } = req.params;
    const allowed = [
      'total_budget',
      'max_guests',
      'cost_per_person',
      'location',
      'location_pin_url',
      'activities',
      'main_guests',
      'sub_events',
    ];
    const updates = {};
    for (const key of allowed) {
      if (req.body && req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid update fields provided' });
    }
    const { data, error } = await supabase
      .from('rooms')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    res.json({ room: data });
  } catch (err) {
    console.error('PATCH /api/rooms/:id failed:', err);
    res.status(500).json({ error: err.message || 'Failed to update room' });
  }
});

// DELETE /api/rooms/:id — permanently delete an event room from both rooms & legacy events tables
app.delete('/api/rooms/:id', async (req, res) => {
  if (!requireSupabase(res)) return;
  try {
    const { id } = req.params;
    const inviteCode = String(req.query.inviteCode || '').trim();

    const ops = [
      supabase.from('rooms').delete().eq('id', id),
      supabase.from('events').delete().eq('id', id),
    ];
    if (inviteCode) {
      ops.push(supabase.from('rooms').delete().eq('invite_code', inviteCode));
      ops.push(supabase.from('events').delete().eq('invite_code', inviteCode));
    }

    await Promise.allSettled(ops);
    res.json({ ok: true, deletedId: id });
  } catch (err) {
    console.error('DELETE /api/rooms/:id failed:', err);
    res.status(500).json({ error: err.message || 'Failed to delete room' });
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

    // Non-blocking room join confirmation email if guest has an email
    if (email) {
      supabase
        .from('rooms')
        .select('*')
        .eq('id', id)
        .single()
        .then(({ data: room }) => {
          if (room) {
            void sendRoomJoinedEmail({
              email,
              name,
              room,
              frontendUrl: FRONTEND_URL,
            });
          }
        })
        .catch(() => {});
    }

    res.status(201).json({ guest: data });
  } catch (err) {
    console.error('POST /api/rooms/:id/guests failed:', err);
    res.status(500).json({ error: err.message || 'Failed to add guest' });
  }
});

// POST /api/rooms/:id/join — join a room and send confirmation email via Brevo
app.post('/api/rooms/:id/join', async (req, res) => {
  if (!requireSupabase(res)) return;
  try {
    const { id } = req.params;
    const { name, email = '', phone = '' } = req.body || {};

    const { data: room, error: roomErr } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', id)
      .single();

    if (roomErr || !room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    const guestName = name || (email ? email.split('@')[0] : 'Monte Guest');
    const initials = String(guestName)
      .split(/\s+/)
      .map((p) => p[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

    // Check if guest with same email already exists in room
    let guestRecord = null;
    if (email) {
      const { data: existing } = await supabase
        .from('guests')
        .select('*')
        .eq('room_id', id)
        .eq('email', email)
        .maybeSingle();
      guestRecord = existing;
    }

    if (!guestRecord) {
      const { data: inserted, error: insertErr } = await supabase
        .from('guests')
        .insert({
          room_id: id,
          name: guestName,
          email,
          phone,
          initials,
          avatar_color: '#1A6BFF',
          amount: Number(room.cost_per_person || 0),
          paid: false,
          online: true,
        })
        .select()
        .single();

      if (insertErr) throw insertErr;
      guestRecord = inserted;
    }

    let emailResult = { sent: false };
    if (email) {
      emailResult = await sendRoomJoinedEmail({
        email,
        name: guestName,
        room,
        frontendUrl: FRONTEND_URL,
      });
    }

    res.status(201).json({
      ok: true,
      guest: guestRecord,
      room,
      emailSent: Boolean(emailResult.sent),
    });
  } catch (err) {
    console.error('POST /api/rooms/:id/join failed:', err);
    res.status(500).json({ error: err.message || 'Failed to join room' });
  }
});

// DELETE /api/rooms/:id/guests/:guestId — host removes a guest from a room
app.delete('/api/rooms/:id/guests/:guestId', async (req, res) => {
  if (!requireSupabase(res)) return;
  try {
    const { id, guestId } = req.params;
    const { error } = await supabase
      .from('guests')
      .delete()
      .eq('id', guestId)
      .eq('room_id', id);
    if (error) throw error;
    res.json({ ok: true, deletedGuestId: guestId });
  } catch (err) {
    console.error('DELETE /api/rooms/:id/guests/:guestId failed:', err);
    res.status(500).json({ error: err.message || 'Failed to remove guest' });
  }
});

// POST /api/rooms/:id/guests/:guestId/submit-payment — guest submits M-PESA confirmation code
app.post('/api/rooms/:id/guests/:guestId/submit-payment', async (req, res) => {
  if (!requireSupabase(res)) return;
  try {
    const { id, guestId } = req.params;
    const mpesaCode = String(req.body?.mpesa_code || '')
      .trim()
      .toUpperCase();

    if (!mpesaCode || mpesaCode.length < 4) {
      return res.status(400).json({ error: 'Valid M-PESA confirmation code is required' });
    }

    const { data: updated, error: updateErr } = await supabase
      .from('guests')
      .update({
        mpesa_code: mpesaCode,
        payment_status: 'submitted',
      })
      .eq('id', guestId)
      .eq('room_id', id)
      .select()
      .single();

    if (updateErr) throw updateErr;

    // Notify host via Brevo email (non-fatal)
    const { data: room } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', id)
      .single();

    if (room?.host_email) {
      void sendPaymentSubmittedToHostEmail({
        hostEmail: room.host_email,
        hostName: room.created_by,
        guestName: updated.name,
        mpesaCode,
        amount: updated.amount || room.cost_per_person,
        room,
        frontendUrl: FRONTEND_URL,
      });
    }

    res.json({ ok: true, guest: updated });
  } catch (err) {
    console.error('POST submit-payment failed:', err);
    res.status(500).json({ error: err.message || 'Failed to submit M-PESA code' });
  }
});

// PATCH /api/rooms/:id/guests/:guestId/payment — host approves/toggles confirmed status
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
    const nextStatus = nextPaid ? 'confirmed' : 'pending';

    let { data: updated, error: updateErr } = await supabase
      .from('guests')
      .update({
        paid: nextPaid,
        payment_status: nextStatus,
        paid_at: nextPaid ? new Date().toISOString() : null,
      })
      .eq('id', guestId)
      .eq('room_id', id)
      .select()
      .single();

    if (updateErr && /column .* does not exist/i.test(updateErr.message || '')) {
      const retry = await supabase
        .from('guests')
        .update({
          paid: nextPaid,
          paid_at: nextPaid ? new Date().toISOString() : null,
        })
        .eq('id', guestId)
        .eq('room_id', id)
        .select()
        .single();
      updated = retry.data;
      updateErr = retry.error;
    }

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

    // Email guest when host confirms payment
    if (nextPaid && updated?.email) {
      const { data: room } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', id)
        .single();
      if (room) {
        void sendPaymentConfirmedToGuestEmail({
          email: updated.email,
          name: updated.name,
          amount: updated.amount || room.cost_per_person,
          mpesaCode: updated.mpesa_code,
          room,
          frontendUrl: FRONTEND_URL,
        });
      }
    }

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

// Expenses CRUD: GET / POST / DELETE /api/rooms/:id/expenses
app.get('/api/rooms/:id/expenses', async (req, res) => {
  if (!requireSupabase(res)) return;
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('room_id', id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ expenses: data || [] });
  } catch (err) {
    console.error('GET /api/rooms/:id/expenses failed:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch expenses' });
  }
});

app.post('/api/rooms/:id/expenses', async (req, res) => {
  if (!requireSupabase(res)) return;
  try {
    const { id } = req.params;
    const {
      title,
      category = 'Other',
      amount = 0,
      paid_by = 'Host',
    } = req.body || {};

    if (!title || Number(amount) <= 0) {
      return res
        .status(400)
        .json({ error: 'Expense title and positive amount are required' });
    }

    const { data, error } = await supabase
      .from('expenses')
      .insert({
        room_id: id,
        title: String(title).trim(),
        category,
        amount: Number(amount),
        paid_by: String(paid_by).trim() || 'Host',
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ expense: data });
  } catch (err) {
    console.error('POST /api/rooms/:id/expenses failed:', err);
    res.status(500).json({ error: err.message || 'Failed to add expense' });
  }
});

app.delete('/api/rooms/:id/expenses/:expenseId', async (req, res) => {
  if (!requireSupabase(res)) return;
  try {
    const { id, expenseId } = req.params;
    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', expenseId)
      .eq('room_id', id);
    if (error) throw error;
    res.json({ ok: true, deletedExpenseId: expenseId });
  } catch (err) {
    console.error('DELETE /api/rooms/:id/expenses/:expenseId failed:', err);
    res.status(500).json({ error: err.message || 'Failed to delete expense' });
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

// 1. POST /api/emails/welcome — send branded welcome email via Brevo
app.post('/api/emails/welcome', async (req, res) => {
  try {
    const { email, name = '' } = req.body || {};
    if (!email) {
      return res.status(400).json({ error: 'email is required' });
    }
    const result = await sendWelcomeEmail({
      email,
      name,
      frontendUrl: FRONTEND_URL,
    });
    res.json({ ok: true, sent: Boolean(result.sent) });
  } catch (err) {
    console.error('POST /api/emails/welcome failed:', err);
    res.json({ ok: true, sent: false });
  }
});

// 2. POST /api/auth/forgot-password — generate Supabase recovery link & email via Brevo
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email || !isSupabaseConfigured || !supabase) {
      return res.json({ ok: true });
    }

    const { data, error } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: String(email).trim(),
      options: {
        redirectTo: `${FRONTEND_URL}/?reset=true`,
      },
    });

    if (!error && data?.properties?.action_link) {
      await sendPasswordResetEmail({
        email: String(email).trim(),
        name: data.user?.user_metadata?.full_name || '',
        resetLink: data.properties.action_link,
      });
    } else if (error) {
      console.warn('[forgot-password] generateLink note:', error.message);
    }

    // Always return { ok: true } for security
    res.json({ ok: true });
  } catch (err) {
    console.error('POST /api/auth/forgot-password failed:', err);
    res.json({ ok: true });
  }
});

// 3. DELETE /api/auth/delete-account (and /api/account alias) — delete own account + send Brevo confirmation
async function handleDeleteAccount(req, res) {
  if (!requireSupabase(res)) return;
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : '';

    if (!token) {
      return res
        .status(401)
        .json({ error: 'Missing Authorization bearer token' });
    }

    const { data: userData, error: userErr } = await supabase.auth.getUser(
      token
    );
    if (userErr || !userData?.user) {
      return res.status(401).json({ error: 'Invalid or expired session token' });
    }

    const user = userData.user;
    const userId = user.id;
    const userEmail = user.email;
    const userName = user.user_metadata?.full_name || user.user_metadata?.name || '';

    // Best-effort cleanup of profile row if table exists
    try {
      await supabase.from('profiles').delete().eq('id', userId);
    } catch {
      // Ignore if profiles table is not present
    }

    const { error: deleteErr } = await supabase.auth.admin.deleteUser(userId);
    if (deleteErr) throw deleteErr;

    // Send confirmation email via Brevo (non-fatal if Brevo fails)
    if (userEmail) {
      await sendAccountDeletedEmail({
        email: userEmail,
        name: userName,
        frontendUrl: FRONTEND_URL,
      });
    }

    res.json({ ok: true, deletedUserId: userId });
  } catch (err) {
    console.error('DELETE /api/auth/delete-account failed:', err);
    res.status(500).json({ error: err.message || 'Failed to delete account' });
  }
}

app.delete('/api/auth/delete-account', handleDeleteAccount);
app.delete('/api/account', handleDeleteAccount);

// ============================================================================
// PayHero Kenya API v2 — M-PESA STK Push, Webhook & Status Polling
// ============================================================================

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const payheroPaymentsMemory = new Map();

async function confirmAttendeePayment({
  eventId,
  userEmail,
  customerName,
  phone,
  amount,
  receipt,
}) {
  if (!supabase || !eventId || !UUID_RE.test(String(eventId))) return;
  try {
    const nowIso = new Date().toISOString();
    const { data: room } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', eventId)
      .maybeSingle();

    let confirmedGuest = null;
    if (userEmail) {
      const { data: existing } = await supabase
        .from('guests')
        .select('*')
        .eq('room_id', eventId)
        .ilike('email', userEmail)
        .maybeSingle();

      if (existing) {
        const { data: g } = await supabase
          .from('guests')
          .update({
            paid: true,
            payment_status: 'confirmed',
            mpesa_code: receipt || null,
            paid_at: nowIso,
          })
          .eq('id', existing.id)
          .select()
          .maybeSingle();
        confirmedGuest = g;
      } else {
        const displayName = customerName || userEmail.split('@')[0] || 'Guest';
        const parts = displayName.trim().split(/\s+/);
        const initials = (
          (parts[0]?.[0] || 'G') + (parts[1]?.[0] || parts[0]?.[1] || '')
        ).toUpperCase();
        const { data: g } = await supabase
          .from('guests')
          .insert({
            room_id: eventId,
            name: displayName,
            email: userEmail,
            phone: phone || '',
            initials,
            avatar_color: '#1A6BFF',
            amount: Number(amount) || Number(room?.cost_per_person || 0),
            paid: true,
            payment_status: 'confirmed',
            mpesa_code: receipt || null,
            online: true,
            paid_at: nowIso,
          })
          .select()
          .maybeSingle();
        confirmedGuest = g;
      }
    }

    const recipientEmail = confirmedGuest?.email || userEmail;
    if (recipientEmail && room) {
      void sendPaymentConfirmedToGuestEmail({
        guestEmail: recipientEmail,
        guestName: confirmedGuest?.name || customerName || recipientEmail.split('@')[0],
        room,
        amountKes: Number(amount) || Number(room.cost_per_person || 0),
        frontendUrl: FRONTEND_URL,
      }).catch((mailErr) => {
        console.error('[payhero] Guest confirmation email error:', mailErr?.message);
      });
    }
  } catch (err) {
    console.error('[payhero] Failed to confirm attendee guest row:', err?.message);
  }
}

// 1. POST /api/payments/stk-push — Authenticated PayHero Kenya M-PESA STK Push
app.post('/api/payments/stk-push', async (req, res) => {
  if (!requireSupabase(res)) return;
  if (!isPayheroConfigured()) {
    return res.status(503).json({
      success: false,
      error:
        'PayHero is not configured on the server yet (missing PAYHERO_AUTH_TOKEN or PAYHERO_CHANNEL_ID).',
    });
  }

  try {
    // Require authenticated Supabase user
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. Please sign in to pay via M-PESA.',
      });
    }

    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired session. Please sign in again.',
      });
    }

    const authUser = userData.user;
    const { eventId, amount, phone, customerName } = req.body || {};
    if (!eventId || !amount || !phone) {
      return res.status(400).json({
        success: false,
        error: 'eventId, amount, and phone are required.',
      });
    }

    const normalizedPhone = normalizeKenyanPhone(phone);
    if (!normalizedPhone) {
      return res.status(400).json({
        success: false,
        error: 'Enter a valid Kenyan M-PESA number (e.g. 0712 345 678 or 0112 345 678).',
      });
    }

    const roundedAmount = Math.round(Number(amount));
    if (!roundedAmount || roundedAmount < 1) {
      return res.status(400).json({
        success: false,
        error: 'Payment amount must be at least KES 1.',
      });
    }

    const resolvedName =
      String(customerName || '').trim() ||
      authUser.user_metadata?.full_name ||
      authUser.user_metadata?.name ||
      authUser.email ||
      'Monte Guest';

    const shortId = Math.random().toString(36).substring(2, 8).toUpperCase();
    const reference = `MONTE-${Date.now()}-${shortId}`;

    // Store pending payment record in Supabase (with graceful memory fallback)
    const memoryRecord = {
      event_id: String(eventId),
      user_id: authUser.id,
      user_email: authUser.email || '',
      customer_name: resolvedName,
      amount: roundedAmount,
      phone: normalizedPhone,
      reference,
      provider: 'payhero',
      status: 'pending',
      mpesa_receipt: null,
    };
    payheroPaymentsMemory.set(reference, memoryRecord);

    try {
      const { error: insertErr } = await supabase.from('payments').insert({
        event_id: String(eventId),
        user_id: authUser.id,
        amount: roundedAmount,
        phone: normalizedPhone,
        reference,
        provider: 'payhero',
        status: 'pending',
      });
      if (insertErr) {
        console.warn('[payhero] payments table insert warning:', insertErr.message);
      }
    } catch (dbErr) {
      console.warn('[payhero] payments table insert skipped:', dbErr?.message);
    }

    await initiatePayheroStkPush({
      amount: roundedAmount,
      phone: normalizedPhone,
      reference,
      customerName: resolvedName,
    });

    return res.json({ success: true, reference });
  } catch (err) {
    console.error('POST /api/payments/stk-push failed:', err);
    return res.status(err.statusCode || 500).json({
      success: false,
      error: err.message || 'Failed to initiate M-PESA STK Push.',
    });
  }
});

// 2. POST /api/webhooks/payhero — PayHero Kenya v2 callback handler
app.post('/api/webhooks/payhero', async (req, res) => {
  try {
    const body = req.body || {};
    const payload = body.response || body;

    const reference = String(
      payload.ExternalReference ||
        payload.external_reference ||
        body.ExternalReference ||
        body.external_reference ||
        ''
    ).trim();
    const statusRaw = String(
      payload.Status || payload.status || body.Status || body.status || ''
    ).trim();
    const resultCode =
      payload.ResultCode ??
      payload.result_code ??
      body.ResultCode ??
      body.result_code;
    const mpesaReceipt = String(
      payload.MpesaReceiptNumber ||
        payload.mpesa_receipt_number ||
        body.MpesaReceiptNumber ||
        body.mpesa_receipt_number ||
        ''
    ).trim();

    if (!reference) {
      return res.status(200).json({ received: true });
    }

    const isSuccess =
      Number(resultCode) === 0 || statusRaw.toUpperCase() === 'SUCCESS';

    const memRec = payheroPaymentsMemory.get(reference) || null;

    if (isSuccess) {
      let alreadyPaid = false;
      let eventId = memRec?.event_id || null;
      let userId = memRec?.user_id || null;
      let userEmail = memRec?.user_email || '';
      let customerName = memRec?.customer_name || '';
      let phone = memRec?.phone || '';
      let amount = memRec?.amount || 0;

      if (memRec) {
        if (memRec.status === 'paid') alreadyPaid = true;
        memRec.status = 'paid';
        memRec.mpesa_receipt = mpesaReceipt || reference;
        payheroPaymentsMemory.set(reference, memRec);
      }

      if (supabase) {
        const { data: claimed } = await supabase
          .from('payments')
          .update({
            status: 'paid',
            mpesa_receipt: mpesaReceipt || reference,
          })
          .eq('reference', reference)
          .neq('status', 'paid')
          .select()
          .maybeSingle();

        if (claimed) {
          alreadyPaid = false;
          eventId = claimed.event_id || eventId;
          userId = claimed.user_id || userId;
          phone = claimed.phone || phone;
          amount = claimed.amount || amount;
        }
      }

      if (!alreadyPaid) {
        if (!userEmail && userId && supabase) {
          try {
            const { data: uData } = await supabase.auth.admin.getUserById(userId);
            if (uData?.user) {
              userEmail = uData.user.email || '';
              customerName =
                customerName ||
                uData.user.user_metadata?.full_name ||
                uData.user.user_metadata?.name ||
                '';
            }
          } catch {
            // Best-effort lookup
          }
        }

        await confirmAttendeePayment({
          eventId,
          userEmail,
          customerName,
          phone,
          amount,
          receipt: mpesaReceipt || reference,
        });
      }
    } else {
      if (memRec && memRec.status === 'pending') {
        memRec.status = 'failed';
        payheroPaymentsMemory.set(reference, memRec);
      }
      if (supabase) {
        await supabase
          .from('payments')
          .update({ status: 'failed' })
          .eq('reference', reference)
          .eq('status', 'pending');
      }
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('POST /api/webhooks/payhero failed:', err);
    return res.status(200).json({ received: true });
  }
});

// 3. GET /api/payments/status/:reference — Poll PayHero payment status
app.get('/api/payments/status/:reference', async (req, res) => {
  try {
    const reference = String(req.params.reference || '').trim();
    if (!reference) {
      return res.status(400).json({ success: false, error: 'Reference is required.' });
    }

    const memRec = payheroPaymentsMemory.get(reference) || null;
    let dbRec = null;

    if (supabase) {
      try {
        const { data } = await supabase
          .from('payments')
          .select('reference, status, mpesa_receipt, amount, event_id')
          .eq('reference', reference)
          .maybeSingle();
        if (data) dbRec = data;
      } catch {
        // Fall back to memory map
      }
    }

    const record = dbRec || memRec;
    if (!record) {
      return res.status(404).json({ success: false, error: 'Payment not found.' });
    }

    return res.json({
      success: true,
      reference,
      status: record.status || 'pending',
      mpesaReceipt: record.mpesa_receipt || null,
    });
  } catch (err) {
    console.error('GET /api/payments/status/:reference failed:', err);
    return res
      .status(500)
      .json({ success: false, error: err.message || 'Failed to check payment status.' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(
    `[monte-events-api] listening on http://0.0.0.0:${PORT} (CORS: ${Array.from(
      allowedOrigins
    ).join(', ')})`
  );
});
