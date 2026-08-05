import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Service-role client for the admin panel. It bypasses RLS, so it must only
// ever be imported from server code (admin pages, server actions) - never
// from a client component.

export function adminDb(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Admin panel needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
    );
  }
  return createClient(url, key);
}
