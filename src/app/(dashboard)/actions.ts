"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function logout() {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } finally {
    redirect("/login");
  }
}
