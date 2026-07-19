import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase URL or Anon Key is missing. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in .env'
  );
}

let _client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (!_client) {
    _client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    });
  }
  return _client;
}

// Lazy initialization via Proxy — createClient() is NOT called at module load time.
// This prevents the EAS Build bundling phase from crashing because
// @supabase/supabase-js tries to use native WebSocket (Node.js 22+ only)
// during client construction. On the actual device at runtime, this works fine.
export const supabase = new Proxy<SupabaseClient>({} as SupabaseClient, {
  get(_target, prop) {
    const client = getClient();
    const val = client[prop as keyof SupabaseClient];
    // Bind function-typed properties (e.g. `from`, `rpc`) so `this`
    // refers to the real client instance, not the empty Proxy target.
    return typeof val === 'function' ? val.bind(client) : val;
  },
});
