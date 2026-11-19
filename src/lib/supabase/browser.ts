"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types";

/** Browser client for RLS-governed reads and realtime subscriptions only. */
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase no está configurado.");
  }
  return createBrowserClient<Database>(supabaseUrl, supabaseKey);
}
