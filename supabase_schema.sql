-- Monte Events — Host Direct Payout & PayHero Dynamic Channel Columns
-- Run this in your Supabase SQL Editor (safe & idempotent).

-- 1. Add host payout columns to public.events
ALTER TABLE IF EXISTS public.events
  ADD COLUMN IF NOT EXISTS payout_type TEXT
    CHECK (payout_type IN ('bank', 'till', 'paybill', 'personal_mpesa')),
  ADD COLUMN IF NOT EXISTS payhero_channel_id INTEGER,
  ADD COLUMN IF NOT EXISTS payout_short_code TEXT,
  ADD COLUMN IF NOT EXISTS payout_account_number TEXT;

-- 2. Add matching host payout columns to public.rooms (used by Render API & direct Supabase sync)
ALTER TABLE IF EXISTS public.rooms
  ADD COLUMN IF NOT EXISTS payout_type TEXT
    CHECK (payout_type IN ('bank', 'till', 'paybill', 'personal_mpesa')),
  ADD COLUMN IF NOT EXISTS payhero_channel_id INTEGER,
  ADD COLUMN IF NOT EXISTS payout_short_code TEXT,
  ADD COLUMN IF NOT EXISTS payout_account_number TEXT;

-- 3. Helpful index for looking up events by PayHero channel
CREATE INDEX IF NOT EXISTS idx_events_payhero_channel_id ON public.events (payhero_channel_id);
CREATE INDEX IF NOT EXISTS idx_rooms_payhero_channel_id ON public.rooms (payhero_channel_id);
