const { createClient } = require('@supabase/supabase-js');

// Service-role client for backend (bypasses RLS).
// Env vars are validated at request time, not module load, so the serverless
// function can be imported without crashing during the build phase.
const supabase = createClient(
  process.env.SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_KEY || 'placeholder',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

module.exports = supabase;
