"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAuthenticatedUser } from "@/lib/api/auth";

export interface StockEntryInput {
  productId: string;
  quantity: number;
  referenceDocument: string;
  newSalePrice?: number;
  newCostPrice?: number;
}

export interface POSCheckoutItem {
  product_id?: string;
  variant_id?: string;
  name: string;
  sku: string;
  price: number;
  cost_price?: number;
  quantity: number;
  is_service: boolean;
}

export interface InventoryTransactionRow {
  id: string;
  product_id: string | null;
  type: string;
  quantity: number;
  unit_cost: number;
  reference_document: string | null;
  cashier_email: string | null;
  sale_group_id?: string | null;
  created_at: string;
  products?: { sku: string; name: string; price?: number; cost_price?: number } | null;
}

export interface TodaySaleRow {
  id: string;
  date?: string;
  created_at?: string;
  total: number;
  paymentMethod: string;
  status: "COMPLETED";
  cashier: string;
  itemsCount: number;
}

function isValidPositiveInteger(value: number): boolean {
  return Number.isInteger(value) && value > 0;
}

export async function registerStockEntry(input: StockEntryInput): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireAuthenticatedUser();
    const quantity = Number(input.quantity);
    const newCostPrice = Number(input.newCostPrice ?? 0);
    const newSalePrice = Number(input.newSalePrice ?? 0);

    if (!isValidPositiveInteger(quantity) || !input.productId || !input.referenceDocument.trim()) {
      return { success: false, error: "Los datos de la entrada no son válidos." };
    }
    if (!Number.isFinite(newCostPrice) || newCostPrice < 0 || !Number.isFinite(newSalePrice) || newSalePrice < 0) {
      return { success: false, error: "Los precios no son válidos." };
    }

    const supabase = await createClient();
    const { data, error } = await supabase.rpc("register_stock_entry", {
      p_product_id: input.productId,
      p_quantity: quantity,
      p_reference_document: input.referenceDocument.trim(),
      p_new_sale_price: newSalePrice,
      p_new_cost_price: newCostPrice,
      p_cashier_email: user.email,
    });

    if (error) {
      console.error("register_stock_entry failed", { code: error.code, userId: user.id });
      return { success: false, error: "No fue posible registrar la entrada." };
    }
    return (data as { success: boolean; error?: string }) || { success: true };
  } catch {
    return { success: false, error: "No fue posible registrar la entrada." };
  }
}

export async function getAllInventoryTransactions(): Promise<InventoryTransactionRow[]> {
  try {
    await requireAuthenticatedUser();
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("inventory_transactions")
      .select("id, product_id, type, quantity, unit_cost, reference_document, cashier_email, sale_group_id, created_at, products(sku, name, price, cost_price)")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("inventory transactions query failed", { code: error.code });
      return [];
    }
    return ((data || []).map((row) => ({
      ...row,
      products: Array.isArray(row.products) ? row.products[0] || null : row.products,
    })) as unknown as InventoryTransactionRow[]);
  } catch {
    return [];
  }
}

export async function processPOSSale(items: POSCheckoutItem[], referenceDoc: string, paymentMethod: string): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireAuthenticatedUser();
    if (!items.length || !referenceDoc.trim() || !paymentMethod.trim()) {
      return { success: false, error: "La venta no contiene datos válidos." };
    }

    const supabase = await createClient();
    const { data, error } = await supabase.rpc("process_pos_sale", {
      p_items: items.map((item) => ({
        product_id: item.product_id ?? item.variant_id ?? null,
        quantity: item.quantity,
        is_service: item.is_service,
      })),
      p_reference_doc: referenceDoc.trim(),
      p_payment_method: paymentMethod.trim(),
      p_cashier_email: user.email,
    });

    if (error) {
      console.error("process_pos_sale failed", { code: error.code, userId: user.id });
      return { success: false, error: "No fue posible registrar la venta." };
    }
    const result = data as { success?: boolean; error?: string } | null;
    return result?.success === false
      ? { success: false, error: result.error || "La venta fue rechazada." }
      : { success: true };
  } catch {
    return { success: false, error: "No fue posible procesar la venta." };
  }
}

export async function getTodaySales(): Promise<TodaySaleRow[]> {
  try {
    await requireAuthenticatedUser();
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_today_sales");
    if (error) {
      console.error("today sales query failed", { code: error.code });
      return [];
    }
    return (data as TodaySaleRow[]) || [];
  } catch {
    return [];
  }
}
