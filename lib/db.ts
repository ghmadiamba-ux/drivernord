import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

let _db: SupabaseClient | null = null;

function connect(): SupabaseClient {
  if (_db) return _db;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url) throw new Error('SUPABASE_URL is not configured');
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured');
  _db = createClient(url, key);
  return _db;
}

// Lazy proxy — defers client creation to the first DB call so route handlers
// can catch misconfiguration errors via their own try/catch, rather than
// receiving an unhandled module-level throw that bypasses all error handling.
export const db: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = connect();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const val = (client as any)[prop as string];
    return typeof val === 'function' ? (val as (...a: unknown[]) => unknown).bind(client) : val;
  },
});
