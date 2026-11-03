"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAuthenticatedUser } from "@/lib/api/auth";

export interface DashboardStats {
  todaySalesTotal: number;
  todayCashTotal: number;
  topProductThisWeek: {
    name: string;
    sku: string;
    quantitySold: number;
  } | null;
  lowStockCount?: number;
  totalInventoryValue?: number;
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
    await requireAuthenticatedUser();
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_dashboard_stats");

    if (error || !data) {
      console.error("Error al consultar RPC de Dashboard:", error?.message);
      return defaultStats;
    }

    return data as DashboardStats;
  } catch (error) {
    console.error("Error al obtener estadísticas del Dashboard:", error);
    return defaultStats;
  }
}
