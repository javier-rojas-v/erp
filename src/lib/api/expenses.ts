"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAuthenticatedUser } from "@/lib/api/auth";
import { Expense, ExpenseCategory, MutationResult } from "@/types";

export interface CreateExpenseInput {
  category: ExpenseCategory | string;
  amount: number;
  description?: string;
  date?: string;
}

export async function getExpenses(startDate?: Date, endDate?: Date): Promise<Expense[]> {
  try {
    await requireAuthenticatedUser();
    const supabase = await createClient();
    let query = supabase
      .from("expenses")
      .select("id, category, amount, description, date, cashier_email, created_at")
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
    const supabase = await createClient();

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
        },
      ])
      .select("id, category, amount, description, date, cashier_email, created_at")
      .single();

    if (error || !data) {
      console.error("expense insert failed", { code: error?.code, userId: user.id });
      return { success: false, error: "No se pudo registrar el egreso." };
    }

    return { success: true, data: data as Expense };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al registrar el egreso operativo.";
    return { success: false, error: message };
  }
}
