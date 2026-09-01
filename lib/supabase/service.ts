import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";

// Server-only: bypasses RLS. Never import this from a Client Component or
// from any code path reachable via NEXT_PUBLIC_* bundling.
export function createServiceClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
