// lib/api/cash.ts
import { createClient } from "@/lib/supabase/client";
import { requireAuthenticatedUser } from "@/lib/api/auth";

export interface CashSession {
  id: string;
  opened_at: string;
  closed_at?: string | null;
  monto_inicial: number;
  monto_final_sistema: number;
  monto_final_real: number;
  diferencia: number;
  status: "OPEN" | "CLOSED";
  cashier_email: string;
}

export async function getActiveCashSession(): Promise<CashSession | null> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("cash_sessions")
      .select("*")
      .eq("status", "OPEN")
      .order("opened_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;
    return data as CashSession;
  } catch {
    return null;
  }
}

export async function closeCashSession(
  sessionId: string,
  montoSistema: number,
  montoReal: number
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAuthenticatedUser();
    const supabase = createClient();
    const diferencia = montoReal - montoSistema;

    const { error } = await supabase
      .from("cash_sessions")
      .update({
        closed_at: new Date().toISOString(),
        monto_final_sistema: montoSistema,
        monto_final_real: montoReal,
        diferencia: diferencia,
        status: "CLOSED",
      })
      .eq("id", sessionId);

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al cerrar la sesión de caja.";
    return { success: false, error: message };
  }
}

export async function openCashSession(montoInicial: number = 0): Promise<{ success: boolean; data?: CashSession; error?: string }> {
  try {
    const user = await requireAuthenticatedUser();
    const supabase = createClient();

    const { data, error } = await supabase
      .from("cash_sessions")
      .insert([
        {
          opened_at: new Date().toISOString(),
          monto_inicial: montoInicial,
          monto_final_sistema: montoInicial,
          monto_final_real: 0,
          diferencia: 0,
          status: "OPEN",
          cashier_email: user.email,
        },
      ])
      .select()
      .single();

    if (error || !data) {
      return { success: false, error: error?.message || "No se pudo abrir la caja." };
    }
    return { success: true, data: data as CashSession };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error iniciando sesión de caja.";
    return { success: false, error: message };
  }
}