// src/lib/api/expenses.ts
import { createClient } from "@/lib/supabase/client";
import { requireAuthenticatedUser } from "@/lib/api/auth";
import { getActiveCashSession } from "@/lib/api/cash";
import { Expense, ExpenseCategory, MutationResult } from "@/types";

export interface CreateExpenseInput {
  category: ExpenseCategory | string;
  amount: number;
  description?: string;
  date?: string;
}

export async function getExpenses(startDate?: Date, endDate?: Date): Promise<Expense[]> {
  try {
    const supabase = createClient();
    let query = supabase
      .from("expenses")
      .select("*")
      .order("date", { ascending: false });

    if (startDate) {
      query = query.gte("date", startDate.toISOString());
    }
    if (endDate) {
      query = query.lte("date", endDate.toISOString());
    }

    const { data, error } = await query;
    if (error) {
      console.error("Error consultando egresos operativos:", error.message);
      return [];
    }
    return (data as Expense[]) || [];
  } catch (error) {
    console.error("Error de conexión al obtener gastos:", error);
    return [];
  }
}

export async function createExpense(input: CreateExpenseInput): Promise<MutationResult<Expense>> {
  try {
    const user = await requireAuthenticatedUser();
    const activeSession = await getActiveCashSession();
    const supabase = createClient();

    const amountNum = Math.max(0, Number(input.amount) || 0);
    if (amountNum <= 0) {
      return { success: false, error: "El monto del egreso debe ser mayor a 0." };
    }
    if (!input.category || !input.category.trim()) {
      return { success: false, error: "La categoría del egreso es obligatoria." };
    }

    const expenseDate = input.date ? new Date(input.date).toISOString() : new Date().toISOString();

    const { data, error } = await supabase
      .from("expenses")
      .insert([
        {
          category: input.category.trim(),
          amount: amountNum,
          description: input.description?.trim() || null,
          date: expenseDate,
          cashier_email: user.email,
          user_id: user.id,
          cash_session_id: activeSession?.id || null,
        },
      ])
      .select()
      .single();

    if (error || !data) {
      return { success: false, error: error?.message || "No se pudo registrar el egreso." };
    }

    return { success: true, data: data as Expense };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al registrar el egreso operativo.";
    return { success: false, error: message };
  }
}

export async function updateExpense(
  id: string,
  input: Partial<CreateExpenseInput>
): Promise<MutationResult<Expense>> {
  try {
    const user = await requireAuthenticatedUser();

    // Guard RBAC: La modificación de gastos históricos está restringida exclusivamente a 'admin'
    if (user.role !== "admin") {
      return {
        success: false,
        error: "ACCESO DENEGADO: Solo el perfil Administrador (admin) tiene permisos para modificar gastos operativos.",
      };
    }

    const supabase = createClient();
    const payload: Record<string, any> = {};

    if (input.category) payload.category = input.category.trim();
    if (input.amount !== undefined) payload.amount = Math.max(0, Number(input.amount));
    if (input.description !== undefined) payload.description = input.description?.trim() || null;

    const { data, error } = await supabase
      .from("expenses")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, data: data as Expense };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al actualizar gasto.",
    };
  }
}

export async function deleteExpense(id: string): Promise<MutationResult<boolean>> {
  try {
    const user = await requireAuthenticatedUser();

    // Guard RBAC: La eliminación de gastos históricos está restringida exclusivamente a 'admin'
    if (user.role !== "admin") {
      return {
        success: false,
        error: "ACCESO DENEGADO: Solo el perfil Administrador (admin) tiene permisos para eliminar gastos operativos.",
      };
    }

    const supabase = createClient();
    const { error } = await supabase.from("expenses").delete().eq("id", id);

    if (error) return { success: false, error: error.message };
    return { success: true, data: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al eliminar gasto.",
    };
  }
}