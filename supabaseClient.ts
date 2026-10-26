import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Get public Supabase configuration safely in both Vite browser and Node.js environments
const metaEnv = (typeof import.meta !== 'undefined' && (import.meta as any).env) ? (import.meta as any).env : {};
const supabaseUrl = (metaEnv.VITE_SUPABASE_URL || (typeof process !== 'undefined' ? process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL : '') || '')?.trim();
const supabaseAnonKey = (metaEnv.VITE_SUPABASE_ANON_KEY || (typeof process !== 'undefined' ? process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY : '') || '')?.trim();

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  !supabaseUrl.includes('your-project-ref') &&
  !supabaseAnonKey.includes('your-anon-public-key') &&
  supabaseUrl.startsWith('http')
);

// Browser Supabase client instance (using ONLY the anon public key)
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

/**
 * Returns the current authenticated user's access token, or null if not signed in.
 * Used to attach `Authorization: Bearer <token>` to server /api/* requests.
 */
export async function getSupabaseToken(): Promise<string | null> {
  if (!supabase) return null;
  try {
    const { data } = await supabase.auth.getSession();
    return data?.session?.access_token || null;
  } catch {
    return null;
  }
}

/**
 * Performs a harmless diagnostic check on Supabase connection status.
 * Never leaks keys.
 */
export async function checkSupabaseConnection(): Promise<{
  configured: boolean;
  status: 'not_configured' | 'connected' | 'error';
  message: string;
  latencyMs?: number;
}> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      configured: false,
      status: 'not_configured',
      message: 'VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is not configured in Secrets.',
    };
  }

  const start = Date.now();
  try {
    // Harmless check using auth.getSession() and a light ping
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      return {
        configured: true,
        status: 'error',
        message: `Supabase auth check failed: ${sessionError.message}`,
        latencyMs: Date.now() - start,
      };
    }

    // Try a light metadata query on profiles with limit 0
    const { error: pingError } = await supabase
      .from('profiles')
      .select('id')
      .limit(0);

    const latencyMs = Date.now() - start;

    if (pingError) {
      // If table doesn't exist yet, guide user to run migration
      if (pingError.code === '42P01' || pingError.message.includes('relation "profiles" does not exist')) {
        return {
          configured: true,
          status: 'error',
          message: 'Connected to Supabase, but tables are missing. Please execute supabase/migrations/001_init.sql in the SQL Editor.',
          latencyMs,
        };
      }
      return {
        configured: true,
        status: 'error',
        message: `Database ping warning: ${pingError.message}`,
        latencyMs,
      };
    }

    return {
      configured: true,
      status: 'connected',
      message: sessionData?.session?.user
        ? `Connected to Supabase database (authenticated as ${sessionData.session.user.email}).`
        : 'Connected to Supabase database (ready for sign in).',
      latencyMs,
    };
  } catch (err: any) {
    return {
      configured: true,
      status: 'error',
      message: `Failed to connect to Supabase: ${err?.message || 'Network error'}`,
      latencyMs: Date.now() - start,
    };
  }
}
