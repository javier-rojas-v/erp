// src/lib/api/transactions.ts
import { createClient } from "@/lib/supabase/client";
import { requireAuthenticatedUser } from "@/lib/api/auth";
import { getActiveCashSession } from "@/lib/api/cash";

export interface StockEntryInput {
  productId: string;
  quantity: number;
  referenceDocument: string;
  newSalePrice?: number;
  newCostPrice?: number;
}

export interface StockAdjustmentInput {
  productId: string;
  adjustmentType: "ADJUSTMENT_IN" | "ADJUSTMENT_OUT";
  quantity: number;
  referenceDocument: string;
}

export interface POSCheckoutItem {
  product_id?: string;
  name: string;
  sku: string;
  price: number;
  cost_price?: number;
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

    if (input.newCostPrice !== undefined && input.newCostPrice <= 0) {
      return { success: false, error: "El costo de compra debe ser mayor a 0 para repuestos físicos." };
    }

    const { data, error } = await supabase.rpc("register_stock_entry", {
      p_product_id: input.productId,
      p_quantity: Number(input.quantity),
      p_reference_document: input.referenceDocument,
      p_new_sale_price: input.newSalePrice || 0,
      p_new_cost_price: input.newCostPrice || 0,
      p_cashier_email: user.email,
      p_user_id: user.id,
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

export async function registerStockAdjustment(
  input: StockAdjustmentInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireAuthenticatedUser();
    const supabase = createClient();

    const qty = Number(input.quantity);
    if (isNaN(qty) || qty <= 0) {
      return { success: false, error: "La cantidad de ajuste debe ser mayor a 0." };
    }

    const { data: prod, error: prodErr } = await supabase
      .from("products")
      .select("stock, cost_price")
      .eq("id", input.productId)
      .single();

    if (prodErr || !prod) {
      return { success: false, error: "Producto no encontrado." };
    }

    const newStock =
      input.adjustmentType === "ADJUSTMENT_IN"
        ? prod.stock + qty
        : Math.max(0, prod.stock - qty);

    const { error: txErr } = await supabase.from("inventory_transactions").insert([
      {
        product_id: input.productId,
        type: input.adjustmentType,
        quantity: qty,
        unit_cost: prod.cost_price,
        reference_document: input.referenceDocument.trim().toUpperCase(),
        cashier_email: user.email,
        user_id: user.id,
      },
    ]);

    if (txErr) return { success: false, error: txErr.message };

    const { error: updateErr } = await supabase
      .from("products")
      .update({ stock: newStock })
      .eq("id", input.productId);

    if (updateErr) return { success: false, error: updateErr.message };

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al registrar ajuste corrector.";
    return { success: false, error: message };
  }
}

export async function getAllInventoryTransactions(): Promise<any[]> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("inventory_transactions")
      .select("*, products(sku, name, price, cost_price)")
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
  _referenceDoc: string,
  paymentMethod: string,
  _totalAmount: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireAuthenticatedUser();
    const activeSession = await getActiveCashSession();
    const supabase = createClient();

    const saleId = crypto.randomUUID();
    const shortCode = saleId.slice(0, 8).toUpperCase();
    const unifiedRefDoc = `VEN-${shortCode}`;

    const { data, error } = await supabase.rpc("process_pos_sale", {
      p_items: items,
      p_reference_doc: unifiedRefDoc,
      p_payment_method: paymentMethod,
      p_cashier_email: user.email,
      p_user_id: user.id,
      p_cash_session_id: activeSession?.id || null,
    });

    if (error) {
      const totalSum = items.reduce((acc, i) => acc + (i.price * i.quantity), 0);
      const { error: saleErr } = await supabase.from("sales").insert([
        {
          id: saleId,
          cash_session_id: activeSession?.id || null,
          user_id: user.id,
          reference_document: unifiedRefDoc,
          payment_method: paymentMethod,
          total_amount: totalSum,
          cashier_email: user.email,
        },
      ]);

      if (saleErr) {
        return { success: false, error: saleErr.message };
      }

      const saleItemsRows = items.map((i) => ({
        sale_id: saleId,
        product_id: i.product_id,
        quantity: i.quantity,
        unit_price: i.price,
        unit_cost: i.is_service ? 0 : Math.max(0, Number(i.cost_price) || 0),
      }));

      await supabase.from("sale_items").insert(saleItemsRows);

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

      const inventoryRows = items.map((i) => ({
        product_id: i.product_id,
        type: "SALE_OUT",
        quantity: i.quantity,
        unit_cost: i.is_service ? 0 : Math.max(0, Number(i.cost_price) || 0),
        reference_document: unifiedRefDoc,
        cashier_email: user.email,
        user_id: user.id,
        sale_id: saleId,
        sale_group_id: saleId,
      }));

      const { error: insErr } = await supabase.from("inventory_transactions").insert(inventoryRows);
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

    if (!error && data && Array.isArray(data)) {
      return data.map((row: any) => {
        const method =
          row.paymentMethod ||
          row.paymentmethod ||
          row.payment_method ||
          "Efectivo";

        const count =
          row.itemsCount !== undefined && row.itemsCount !== null
            ? Number(row.itemsCount)
            : row.itemscount !== undefined && row.itemscount !== null
            ? Number(row.itemscount)
            : row.items_count !== undefined && row.items_count !== null
            ? Number(row.items_count)
            : 0;

        return {
          id: row.id,
          date: row.date || row.created_at,
          total: Number(row.total || row.total_amount || 0),
          paymentMethod: method,
          status: "COMPLETED",
          cashier: row.cashier || row.cashier_email || "Cajero",
          itemsCount: count,
        };
      });
    }

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const { data: salesData, error: salesErr } = await supabase
      .from("sales")
      .select("id, created_at, total_amount, payment_method, cashier_email, sale_items(quantity)")
      .gte("created_at", startOfDay.toISOString())
      .order("created_at", { ascending: false });

    if (salesErr || !salesData) return [];

    return salesData.map((s: any) => ({
      id: s.id,
      date: s.created_at,
      total: Number(s.total_amount || 0),
      paymentMethod: s.payment_method || "Efectivo",
      status: "COMPLETED",
      cashier: s.cashier_email,
      itemsCount: s.sale_items
        ? s.sale_items.reduce((acc: number, item: any) => acc + Number(item.quantity || 0), 0)
        : 0,
    }));
  } catch (error) {
    console.error("Error al obtener ventas de hoy:", error);
    return [];
  }
}