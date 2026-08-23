import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { env } from "@/lib/env";

/**
 * One browser client for the whole app.
 *
 * The publishable (anon) key is public by design: every request it makes is
 * still evaluated against the Row Level Security policies in
 * supabase/migrations/0003_rls_policies.sql. The service-role key must never
 * appear in this codebase.
 */
export const supabase = createClient<Database>(env.supabaseUrl, env.supabasePublishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: "pkce",
    storageKey: "dma-songs-auth",
  },
  global: {
    headers: { "x-application-name": "dma_songs" },
  },
});
