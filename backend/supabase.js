import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl && supabaseServiceRoleKey
);

if (!isSupabaseConfigured) {
  console.warn(
    '[monte-events-api] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing. Database routes will return 503 until configured.'
  );
}

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;
