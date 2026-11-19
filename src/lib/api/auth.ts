// src/lib/api/auth.ts
import { createClient } from "@/lib/supabase/client";
import { UserRole } from "@/types";

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
}

/**
 * Obtiene el usuario autenticado validando directamente la sesión y su perfil relacional en Supabase.
 */
export async function requireAuthenticatedUser(): Promise<AuthenticatedUser> {
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user || !user.email) {
    throw new Error("UNAUTHORIZED: Sesión de usuario inválida o caducada.");
  }

  // Consultar perfil para obtener su rol asignado en la BD
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const role: UserRole = profile?.role === "admin" ? "admin" : "manager";

  return {
    id: user.id,
    email: user.email,
    role,
  };
}