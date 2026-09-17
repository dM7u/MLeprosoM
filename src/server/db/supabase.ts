import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseConfig } from "../env";

/** Cliente privilegiado: solo para futuros procesos internos autorizados. */
export function createSupabaseAdminClient() {
  const { url, secretKey } = getSupabaseConfig();
  return createClient(url, secretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
