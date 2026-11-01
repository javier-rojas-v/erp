// lib/api/auth.ts
import { createClient } from "@/lib/supabase/client";

export interface AuthenticatedUser {
  id: string;
  email: string;
}

/**
 * Obtiene el usuario autenticado actual desde el servidor de autenticación.
 * Lanza un error explícito si no hay una sesión activa, impidiendo fallbacks inseguros.
 */
export async function requireAuthenticatedUser(): Promise<AuthenticatedUser> {
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user || !user.email) {
    throw new Error("UNAUTHORIZED: Sesión de usuario inválida o no autenticada.");
  }

  return {
    id: user.id,
    email: user.email,
  };
}