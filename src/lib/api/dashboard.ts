import { createClient } from "@/lib/supabase/client";

export interface DashboardStats {
  todaySalesTotal: number;
  todayCashTotal: number;
  topProductThisWeek: {
    name: string;
    sku: string;
    quantitySold: number;
  } | null;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const defaultStats: DashboardStats = {
    todaySalesTotal: 0,
    todayCashTotal: 0,
    topProductThisWeek: null,
  };

  try {
    const supabase = createClient();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // 1. Obtener ventas del día desde inventory_transactions
    const { data: todayTxs, error: salesError } = await supabase
      .from("inventory_transactions")
      .select("quantity, reference_document, products(price)")
      .eq("type", "SALE_OUT")
      .gte("created_at", today.toISOString());

    let todaySalesTotal = 0;
    let todayCashTotal = 0;

    if (!salesError && todayTxs) {
      for (const tx of todayTxs) {
        const price = Number((tx.products as any)?.price ?? 0);
        const qty = Number(tx.quantity ?? 0);
        const amount = price * qty;
        todaySalesTotal += amount;

        const refDoc = String(tx.reference_document ?? "").toLowerCase();
        if (refDoc.includes("efectivo") || refDoc.includes("cash")) {
          todayCashTotal += amount;
        }
      }
    }

    // 2. Obtener top repuesto de los últimos 7 días
    let topProductThisWeek: DashboardStats["topProductThisWeek"] = null;
    const { data: weekTxs, error: itemsError } = await supabase
      .from("inventory_transactions")
      .select("quantity, products(sku, name)")
      .eq("type", "SALE_OUT")
      .gte("created_at", sevenDaysAgo.toISOString());

    if (!itemsError && weekTxs && weekTxs.length > 0) {
      const productMap = new Map<string, { name: string; sku: string; quantity: number }>();

      for (const tx of weekTxs) {
        const prod = tx.products as any;
        if (!prod) continue;
        const sku = prod.sku || "S/K";
        const name = prod.name || "Repuesto";
        const qty = Number(tx.quantity || 0);

        const existing = productMap.get(sku);
        if (existing) {
          existing.quantity += qty;
        } else {
          productMap.set(sku, { name, sku, quantity: qty });
        }
      }

      let maxQty = 0;
      for (const p of productMap.values()) {
        if (p.quantity > maxQty) {
          maxQty = p.quantity;
          topProductThisWeek = {
            name: p.name,
            sku: p.sku,
            quantitySold: p.quantity,
          };
        }
      }
    }

    return {
      todaySalesTotal,
      todayCashTotal,
      topProductThisWeek,
    };
  } catch (error) {
    console.error("Error al obtener estadísticas del Dashboard:", error);
    return defaultStats;
  }
}