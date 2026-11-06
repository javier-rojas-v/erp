// src/lib/api/dashboard.ts
import { createClient } from "@/lib/supabase/client";

export interface DashboardStats {
  todaySalesTotal: number;
  todayCashTotal: number;
  topProductThisWeek: {
    name: string;
    sku: string;
    quantitySold: number;
  } | null;
  lowStockCount: number;
  totalInventoryValue: number;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const defaultStats: DashboardStats = {
    todaySalesTotal: 0,
    todayCashTotal: 0,
    topProductThisWeek: null,
    lowStockCount: 0,
    totalInventoryValue: 0,
  };

  try {
    const supabase = createClient();

    // Intentar invocar RPC primero
    const { data: rpcData, error: rpcError } = await supabase.rpc("get_dashboard_stats");

    if (!rpcError && rpcData) {
      return {
        todaySalesTotal: Number(rpcData.todaySalesTotal ?? rpcData.today_sales_total ?? 0),
        todayCashTotal: Number(rpcData.todayCashTotal ?? rpcData.today_cash_total ?? 0),
        topProductThisWeek: rpcData.topProductThisWeek ?? rpcData.top_product_this_week ?? null,
        lowStockCount: Number(rpcData.lowStockCount ?? rpcData.low_stock_count ?? 0),
        totalInventoryValue: Number(rpcData.totalInventoryValue ?? rpcData.total_inventory_value ?? 0),
      };
    }

    // FALLBACK DIRECTO A TABLAS SQL (Sin depender de RPC)
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).toISOString();
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString();

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const startOfWeek = sevenDaysAgo.toISOString();

    // 1. Obtener Ventas de Hoy
    const { data: salesToday } = await supabase
      .from("sales")
      .select("total_amount, payment_method")
      .gte("created_at", startOfDay)
      .lte("created_at", endOfDay);

    let todaySalesTotal = 0;
    let todayCashTotal = 0;

    if (salesToday && salesToday.length > 0) {
      salesToday.forEach((s) => {
        const amt = Number(s.total_amount) || 0;
        todaySalesTotal += amt;
        if (s.payment_method === "Efectivo") {
          todayCashTotal += amt;
        }
      });
    }

    // 2. Obtener Top Producto de la Semana
    const { data: recentSaleItems } = await supabase
      .from("sale_items")
      .select("product_id, quantity, created_at")
      .gte("created_at", startOfWeek);

    let topProductThisWeek: DashboardStats["topProductThisWeek"] = null;

    if (recentSaleItems && recentSaleItems.length > 0) {
      const productQtyMap = new Map<string, number>();
      recentSaleItems.forEach((item) => {
        const current = productQtyMap.get(item.product_id) || 0;
        productQtyMap.set(item.product_id, current + (Number(item.quantity) || 0));
      });

      let topProdId = "";
      let maxQty = 0;
      productQtyMap.forEach((qty, prodId) => {
        if (qty > maxQty) {
          maxQty = qty;
          topProdId = prodId;
        }
      });

      if (topProdId) {
        const { data: prodData } = await supabase
          .from("products")
          .select("name, sku")
          .eq("id", topProdId)
          .maybeSingle();

        if (prodData) {
          topProductThisWeek = {
            name: prodData.name,
            sku: prodData.sku,
            quantitySold: maxQty,
          };
        }
      }
    }

    // 3. Obtener Métricas de Inventario Físico
    const { data: products } = await supabase
      .from("products")
      .select("price, stock, min_stock, is_service, is_active")
      .eq("is_active", true)
      .eq("is_service", false);

    let lowStockCount = 0;
    let totalInventoryValue = 0;

    if (products) {
      products.forEach((p) => {
        const stock = Number(p.stock) || 0;
        const minStock = Number(p.min_stock) || 0;
        const price = Number(p.price) || 0;

        if (stock <= minStock) {
          lowStockCount++;
        }
        totalInventoryValue += stock * price;
      });
    }

    return {
      todaySalesTotal,
      todayCashTotal,
      topProductThisWeek,
      lowStockCount,
      totalInventoryValue,
    };
  } catch (error) {
    console.error("Error crítico obteniendo métricas de Dashboard:", error);
    return defaultStats;
  }
}