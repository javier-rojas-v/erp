"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/supabase/server";
import type { CashSession, PaymentMethod } from "@/types";

const paymentMethodSchema = z.enum(["Efectivo", "Transferencia", "Tarjeta"]);
const saleSchema = z.object({
  items: z.array(z.object({
    productId: z.string().uuid().optional(),
    sku: z.string().trim().min(1).max(64).optional(),
    quantity: z.number().int().min(1).max(10000),
  }).refine((item) => Boolean(item.productId || item.sku))).min(1).max(100),
  paymentMethod: paymentMethodSchema,
});
const stockEntrySchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().min(1).max(100000),
  referenceDocument: z.string().trim().max(120),
  newSalePrice: z.number().finite().nonnegative().optional(),
});
const stockAdjustmentSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().min(1).max(100000),
  adjustmentType: z.literal("ADJUSTMENT_IN"),
  referenceDocument: z.string().trim().max(120),
});
const expenseSchema = z.object({
  category: z.string().trim().min(1).max(100),
  amount: z.number().finite().positive().max(1_000_000_000),
  description: z.string().trim().max(1000).optional(),
  date: z.string().datetime({ offset: true }).optional(),
});
const expenseUpdateSchema = expenseSchema.partial().refine((value) => Object.keys(value).length > 0);
const productSchema = z.object({
  sku: z.string().trim().min(2).max(30),
  name: z.string().trim().min(3).max(120),
  category: z.string().trim().min(1).max(100),
  brand: z.string().trim().min(2).max(100),
  partNumberFactory: z.string().trim().max(100).optional(),
  price: z.number().finite().positive().max(1_000_000_000),
  stock: z.number().int().nonnegative().max(100_000_000),
  minStock: z.number().int().nonnegative().max(100_000_000),
});

export type ActionResult<T = undefined> =
  | { success: true; data?: T }
  | { success: false; error: string };

function failure(error: unknown, fallback: string): ActionResult<never> {
  if (error instanceof Error && (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN")) {
    return { success: false, error: "No tienes autorización para realizar esta operación." };
  }
  return { success: false, error: fallback };
}

export async function processPosSale(input: unknown): Promise<ActionResult<{ saleId: string; total: number }>> {
  const parsed = saleSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Los datos de la venta no son válidos." };
  try {
    const { supabase } = await requireUser();
    const items = parsed.data.items.map((item) => ({
      product_id: item.productId ?? null,
      sku: item.productId ? null : item.sku ?? null,
      quantity: item.quantity,
    }));
    const { data, error } = await supabase.rpc("process_pos_sale", {
      p_items: items,
      p_payment_method: parsed.data.paymentMethod satisfies PaymentMethod,
    });
    if (error) return { success: false, error: "No se pudo registrar la venta. Verifica la caja y el stock disponible." };
    const result = typeof data === "object" && data !== null ? data : null;
    if (!result || !("sale_id" in result) || typeof result.sale_id !== "string" || !("total_amount" in result) || typeof result.total_amount !== "number") {
      return { success: false, error: "La base de datos devolvió una respuesta inválida." };
    }
    revalidatePath("/ventas");
    revalidatePath("/historial");
    revalidatePath("/inventario");
    return { success: true, data: { saleId: result.sale_id, total: result.total_amount } };
  } catch (error) {
    return failure(error, "No se pudo registrar la venta.");
  }
}

export async function registerStockEntry(input: unknown): Promise<ActionResult> {
  const parsed = stockEntrySchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Los datos de entrada de stock no son válidos." };
  try {
    const { supabase } = await requireUser();
    const { error } = await supabase.rpc("register_stock_entry", {
      p_product_id: parsed.data.productId,
      p_quantity: parsed.data.quantity,
      p_reference_document: parsed.data.referenceDocument,
      p_new_sale_price: parsed.data.newSalePrice ?? null,
    });
    if (error) return { success: false, error: "No se pudo registrar la entrada de stock." };
    revalidatePath("/inventario");
    revalidatePath("/entradas");
    return { success: true };
  } catch (error) {
    return failure(error, "No se pudo registrar la entrada de stock.");
  }
}

export async function registerStockAdjustment(input: unknown): Promise<ActionResult> {
  const parsed = stockAdjustmentSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Los datos del ajuste no son válidos." };
  try {
    const { supabase } = await requireUser();
    const { error } = await supabase.rpc("register_stock_adjustment", {
      p_product_id: parsed.data.productId,
      p_quantity: parsed.data.quantity,
      p_adjustment_type: parsed.data.adjustmentType,
      p_reference_document: parsed.data.referenceDocument,
    });
    if (error) return { success: false, error: "No se pudo registrar el ajuste de inventario." };
    revalidatePath("/inventario");
    revalidatePath("/historial");
    return { success: true };
  } catch (error) {
    return failure(error, "No se pudo registrar el ajuste de inventario.");
  }
}

export async function createProduct(input: unknown): Promise<ActionResult> {
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Los datos del producto no son válidos." };
  try {
    const { supabase } = await requireUser();
    const { error } = await supabase.rpc("register_product", {
      p_sku: parsed.data.sku,
      p_name: parsed.data.name,
      p_category: parsed.data.category,
      p_brand: parsed.data.brand,
      p_part_number_factory: parsed.data.partNumberFactory ?? null,
      p_price: parsed.data.price,
      p_stock: parsed.data.stock,
      p_min_stock: parsed.data.minStock,
    });
    if (error) return { success: false, error: "No se pudo guardar el producto. Verifica que el SKU no esté en uso." };
    revalidatePath("/inventario");
    revalidatePath("/ventas");
    return { success: true };
  } catch (error) {
    return failure(error, "No se pudo guardar el producto.");
  }
}

export async function openCashSession(openingAmount: number): Promise<ActionResult<CashSession>> {
  const amount = z.number().finite().nonnegative().max(1_000_000_000).safeParse(openingAmount);
  if (!amount.success) return { success: false, error: "El monto inicial no es válido." };
  try {
    const { supabase } = await requireUser();
    const { data, error } = await supabase.rpc("open_cash_session", { p_monto_inicial: amount.data });
    if (error || !data || typeof data !== "object" || !("id" in data) || typeof data.id !== "string") {
      return { success: false, error: "No se pudo abrir la caja. Comprueba si ya existe una sesión abierta." };
    }
    const sessionData = data as unknown as CashSession;
    revalidatePath("/");
    return { success: true, data: sessionData };
  } catch (error) {
    return failure(error, "No se pudo abrir la caja.");
  }
}

export async function closeCashSession(sessionId: string, countedAmount: number): Promise<ActionResult<{ monto_final_sistema: number; monto_final_real: number; diferencia: number }>> {
  const input = z.object({ sessionId: z.string().uuid(), countedAmount: z.number().finite().nonnegative().max(1_000_000_000) }).safeParse({ sessionId, countedAmount });
  if (!input.success) return { success: false, error: "Los datos del cierre no son válidos." };
  try {
    const { supabase } = await requireUser();
    const { data, error } = await supabase.rpc("close_cash_session", {
      p_cash_session_id: input.data.sessionId,
      p_monto_final_real: input.data.countedAmount,
    });
    if (error || !data || typeof data !== "object" || !("monto_final_sistema" in data) || !("monto_final_real" in data) || !("diferencia" in data)) {
      return { success: false, error: "No se pudo cerrar la caja. Verifica que la sesión siga abierta." };
    }
    revalidatePath("/");
    revalidatePath("/finanzas");
    const { monto_final_sistema, monto_final_real, diferencia } = data;
    if (typeof monto_final_sistema !== "number" || typeof monto_final_real !== "number" || typeof diferencia !== "number") {
      return { success: false, error: "La base de datos devolvió un cierre inválido." };
    }
    return { success: true, data: { monto_final_sistema, monto_final_real, diferencia } };
  } catch (error) {
    return failure(error, "No se pudo cerrar la caja.");
  }
}

export async function createExpense(input: unknown): Promise<ActionResult> {
  const parsed = expenseSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Los datos del gasto no son válidos." };
  try {
    const { supabase } = await requireUser();
    const { error } = await supabase.rpc("register_expense", {
      p_category: parsed.data.category,
      p_amount: parsed.data.amount,
      p_description: parsed.data.description ?? null,
      p_date: parsed.data.date ?? new Date().toISOString(),
    });
    if (error) return { success: false, error: "No se pudo registrar el gasto." };
    revalidatePath("/finanzas");
    return { success: true };
  } catch (error) {
    return failure(error, "No se pudo registrar el gasto.");
  }
}

export async function updateExpense(expenseId: string, input: unknown): Promise<ActionResult> {
  const parsedId = z.string().uuid().safeParse(expenseId);
  const parsed = expenseUpdateSchema.safeParse(input);
  if (!parsedId.success || !parsed.success) return { success: false, error: "Los datos del gasto no son válidos." };
  try {
    const { supabase, role } = await requireUser();
    if (role !== "admin") return { success: false, error: "Solo un administrador puede modificar gastos históricos." };
    const { error } = await supabase.from("expenses").update(parsed.data).eq("id", parsedId.data);
    if (error) return { success: false, error: "No se pudo actualizar el gasto." };
    revalidatePath("/finanzas");
    return { success: true };
  } catch (error) {
    return failure(error, "No se pudo actualizar el gasto.");
  }
}

export async function deleteExpense(expenseId: string): Promise<ActionResult> {
  const parsedId = z.string().uuid().safeParse(expenseId);
  if (!parsedId.success) return { success: false, error: "El identificador del gasto no es válido." };
  try {
    const { supabase, role } = await requireUser();
    if (role !== "admin") return { success: false, error: "Solo un administrador puede eliminar gastos históricos." };
    const { error } = await supabase.from("expenses").delete().eq("id", parsedId.data);
    if (error) return { success: false, error: "No se pudo eliminar el gasto." };
    revalidatePath("/finanzas");
    return { success: true };
  } catch (error) {
    return failure(error, "No se pudo eliminar el gasto.");
  }
}
