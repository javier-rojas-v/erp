// src/lib/api/finance.ts
import { createClient } from "@/lib/supabase/client";

export interface FinancialSummary {
  totalIncome: number;      // Ingresos Totales (I)
  cogs: number;             // Costo de Ventas (C)
  grossProfit: number;      // Ganancia Bruta (GB = I - C)
  grossMarginPct: number;   // Margen Bruto % (GB / I * 100)
  totalExpenses: number;    // Gastos Operativos (G)
  netProfit: number;        // Ganancia Neta Operativa (GN = GB - G)
  netMarginPct: number;     // Margen Neto % (GN / I * 100)
}

export interface DailyTrendPoint {
  date: string;
  formattedDate: string;
  income: number;
  cogs: number;
  expenses: number;
  netProfit: number;
}

export async function getFinancialSummary(startDate: Date, endDate: Date): Promise<{
  summary: FinancialSummary;
  dailyTrends: DailyTrendPoint[];
}> {
  const defaultSummary: FinancialSummary = {
    totalIncome: 0,
    cogs: 0,
    grossProfit: 0,
    grossMarginPct: 0,
    totalExpenses: 0,
    netProfit: 0,
    netMarginPct: 0,
  };

  try {
    const supabase = createClient();
    const startIso = startDate.toISOString();
    const endIso = endDate.toISOString();

    // 1. Consulta de ventas uniendo unit_cost congelado y fallback del catálogo maestro
    const { data: txsData, error: txsError } = await supabase
      .from("inventory_transactions")
      .select("id, quantity, unit_cost, created_at, products(price, cost_price, is_service)")
      .eq("type", "SALE_OUT")
      .gte("created_at", startIso)
      .lte("created_at", endIso);

    if (txsError) {
      console.error("Error al consultar transacciones de ventas en BI:", txsError.message);
    }

    // 2. Consulta de egresos operativos
    const { data: expData, error: expError } = await supabase
      .from("expenses")
      .select("amount, date")
      .gte("date", startIso)
      .lte("date", endIso);

    if (expError) {
      console.error("Error al consultar gastos en BI:", expError.message);
    }

    let totalIncome = 0;
    let totalCogs = 0;
    const dailyMap: Record<string, { income: number; cogs: number; expenses: number }> = {};

    // Estandarización determinista de fecha bajo la zona horaria oficial America/Santiago
    const getDayKey = (dateStr: string) => {
      const d = new Date(dateStr);
      return d.toLocaleDateString("es-CL", {
        timeZone: "America/Santiago",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
    };

    if (txsData) {
      txsData.forEach((tx: any) => {
        const qty = Number(tx.quantity) || 0;
        const price = Number(tx.products?.price) || 0;
        const isService = Boolean(tx.products?.is_service);
        
        // Inmutabilidad del COGS: Preferir unit_cost snapshot de la transacción.
        // Si no existe (ventas históricas previas a la migración), usar products.cost_price como fallback.
        const snapshotCost = Number(tx.unit_cost);
        const fallbackCost = Number(tx.products?.cost_price) || 0;
        const costPrice = isService ? 0 : (snapshotCost > 0 ? snapshotCost : fallbackCost);

        const income = qty * price;
        const cogs = qty * costPrice;

        totalIncome += income;
        totalCogs += cogs;

        const key = getDayKey(tx.created_at);
        if (!dailyMap[key]) {
          dailyMap[key] = { income: 0, cogs: 0, expenses: 0 };
        }
        dailyMap[key].income += income;
        dailyMap[key].cogs += cogs;
      });
    }

    let totalExpenses = 0;
    if (expData) {
      expData.forEach((exp: any) => {
        const amt = Number(exp.amount) || 0;
        totalExpenses += amt;

        const key = getDayKey(exp.date);
        if (!dailyMap[key]) {
          dailyMap[key] = { income: 0, cogs: 0, expenses: 0 };
        }
        dailyMap[key].expenses += amt;
      });
    }

    const grossProfit = totalIncome - totalCogs;
    const grossMarginPct = totalIncome > 0 ? (grossProfit / totalIncome) * 100 : 0;
    const netProfit = grossProfit - totalExpenses;
    const netMarginPct = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;

    const dailyTrends: DailyTrendPoint[] = Object.keys(dailyMap)
      .sort((a, b) => {
        const [dA, mA, yA] = a.split("/").map(Number);
        const [dB, mB, yB] = b.split("/").map(Number);
        return new Date(yA, mA - 1, dA).getTime() - new Date(yB, mB - 1, dB).getTime();
      })
      .map((key) => {
        const item = dailyMap[key];
        const net = item.income - item.cogs - item.expenses;
        return {
          date: key,
          formattedDate: key.slice(0, 5),
          income: item.income,
          cogs: item.cogs,
          expenses: item.expenses,
          netProfit: net,
        };
      });

    return {
      summary: {
        totalIncome,
        cogs: totalCogs,
        grossProfit,
        grossMarginPct,
        totalExpenses,
        netProfit,
        netMarginPct,
      },
      dailyTrends,
    };
  } catch (error) {
    console.error("Error al generar resumen financiero:", error);
    return { summary: defaultSummary, dailyTrends: [] };
  }
}