// src/lib/api/transactions.ts
import { createClient } from "@/lib/supabase/client";
import { requireAuthenticatedUser } from "@/lib/api/auth";

export interface StockEntryInput {
  productId: string;
  quantity: number;
  referenceDocument: string;
  newSalePrice?: number;
}

export interface POSCheckoutItem {
  product_id?: string;
  name: string;
  sku: string;
  price: number;
  quantity: number;
  is_service: boolean;
}

export interface TodaySaleRow {
  id: string;
  date: string;
  total: number;
  paymentMethod: string;
  status: "COMPLETED";
  cashier: string;
  itemsCount: number;
}

export async function registerStockEntry(input: StockEntryInput): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireAuthenticatedUser();
    const supabase = createClient();
    const { data, error } = await supabase.rpc("register_stock_entry", {
      p_product_id: input.productId,
      p_quantity: Number(input.quantity),
      p_reference_document: input.referenceDocument,
      p_new_sale_price: input.newSalePrice || 0,
      p_cashier_email: user.email,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return (data as { success: boolean; error?: string }) || { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al registrar la entrada.";
    return { success: false, error: message };
  }
}

export async function getAllInventoryTransactions(): Promise<any[]> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("inventory_transactions")
      .select("*, products(sku, name, price)")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error al obtener transacciones:", error.message);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Error de conexión al consultar transacciones:", error);
    return [];
  }
}

export async function processPOSSale(
  items: POSCheckoutItem[],
  referenceDoc: string,
  paymentMethod: string,
  _totalAmount: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireAuthenticatedUser();
    const supabase = createClient();

    const formattedRefDoc = referenceDoc.includes(paymentMethod)
      ? referenceDoc
      : `${referenceDoc} - ${paymentMethod}`;

    const { data, error } = await supabase.rpc("process_pos_sale", {
      p_items: items,
      p_reference_doc: formattedRefDoc,
      p_payment_method: paymentMethod,
      p_cashier_email: user.email,
    });

    if (error) {
      // Inserción directa garantizada en caso de no existir RPC almacenado
      for (const item of items) {
        if (!item.is_service && item.product_id) {
          const { data: prod } = await supabase
            .from("products")
            .select("stock")
            .eq("id", item.product_id)
            .single();

          if (prod) {
            await supabase
              .from("products")
              .update({ stock: Math.max(0, prod.stock - item.quantity) })
              .eq("id", item.product_id);
          }
        }
      }

      const rows = items.map((i) => ({
        product_id: i.product_id,
        type: "SALE_OUT",
        quantity: i.quantity,
        reference_document: formattedRefDoc,
        cashier_email: user.email,
      }));

      const { error: insErr } = await supabase.from("inventory_transactions").insert(rows);
      if (insErr) {
        return { success: false, error: insErr.message };
      }
      return { success: true };
    }

    const res = data as { success: boolean; error?: string };
    if (res && !res.success) {
      return { success: false, error: res.error || "No se pudo procesar la venta." };
    }

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error general al procesar la venta.";
    return { success: false, error: message };
  }
}

export async function getTodaySales(): Promise<TodaySaleRow[]> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase.rpc("get_today_sales");

    if (error || !data) {
      console.error("Error obteniendo ventas de hoy vía RPC:", error?.message);
      return [];
    }

    return data as TodaySaleRow[];
  } catch (error) {
    console.error("Error al obtener ventas de hoy:", error);
    return [];
  }
}