"use server";

import { createClient } from "@/lib/supabase/server";
import { loginSchema } from "@/lib/validations";
import { redirect } from "next/navigation";

export async function login(formData: FormData) {
  const parsed = loginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { error: "Ingresa un correo y contraseña válidos." };
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { error: "El acceso no está configurado. Contacta al administrador del sistema." };
  }

  let error: { message: string } | null = null;
  try {
    const supabase = await createClient();
    ({ error } = await supabase.auth.signInWithPassword(parsed.data));
  } catch {
    return { error: "No fue posible conectar con el servicio de autenticación." };
  }

  if (error) {
    return { error: "Credenciales incorrectas. Verifica tu acceso." };
  }

  redirect("/");
}
