// src/lib/api/finance.ts
import { createClient } from "@/lib/supabase/client";

export interface FinancialSummary {
  totalIncome: number;
  cogs: number;
  grossProfit: number;
  grossMarginPct: number;
  totalExpenses: number;
  netProfit: number;
  netMarginPct: number;
}

export interface DailyTrendPoint {
  date: string;
  formattedDate: string;
  income: number;
  cogs: number;
  expenses: number;
  netProfit: number;
}

export function getChileDateRange(
  preset: "today" | "week" | "month" | "custom",
  customStart?: string,
  customEnd?: string
): { startDate: Date; endDate: Date } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const day = now.getDate();

  if (preset === "today") {
    return {
      startDate: new Date(year, month, day, 0, 0, 0, 0),
      endDate: new Date(year, month, day, 23, 59, 59, 999),
    };
  }

  if (preset === "week") {
    const dayOfWeek = now.getDay();
    const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(year, month, day - diffToMonday, 0, 0, 0, 0);
    return {
      startDate: monday,
      endDate: new Date(year, month, day, 23, 59, 59, 999),
    };
  }

  if (preset === "month") {
    return {
      startDate: new Date(year, month, 1, 0, 0, 0, 0),
      endDate: new Date(year, month + 1, 0, 23, 59, 59, 999),
    };
  }

  if (preset === "custom" && customStart && customEnd) {
    const [sY, sM, sD] = customStart.split("-").map(Number);
    const [eY, eM, eD] = customEnd.split("-").map(Number);
    if (sY && sM && sD && eY && eM && eD) {
      return {
        startDate: new Date(sY, sM - 1, sD, 0, 0, 0, 0),
        endDate: new Date(eY, eM - 1, eD, 23, 59, 59, 999),
      };
    }
  }

  return {
    startDate: new Date(year, month, 1, 0, 0, 0, 0),
    endDate: new Date(year, month + 1, 0, 23, 59, 59, 999),
  };
}

export async function getFinancialSummary(
  startDate: Date,
  endDate: Date
): Promise<{
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

    // 1. Consulta desacoplada de ventas
    const { data: salesData } = await supabase
      .from("sales")
      .select("id, created_at, total_amount")
      .gte("created_at", startIso)
      .lte("created_at", endIso)
      .order("created_at", { ascending: true });

    const sales = salesData || [];
    const saleIds = sales.map((s) => s.id);

    // 2. Consulta de ítems de ventas por ID
    let itemsMap = new Map<string, Array<{ quantity: number; unit_price: number; unit_cost: number; product_id: string }>>();
    if (saleIds.length > 0) {
      const { data: itemsData } = await supabase
        .from("sale_items")
        .select("sale_id, product_id, quantity, unit_price, unit_cost")
        .in("sale_id", saleIds);

      if (itemsData) {
        itemsData.forEach((item) => {
          const list = itemsMap.get(item.sale_id) || [];
          list.push({
            quantity: Number(item.quantity) || 0,
            unit_price: Number(item.unit_price) || 0,
            unit_cost: Number(item.unit_cost) || 0,
            product_id: item.product_id,
          });
          itemsMap.set(item.sale_id, list);
        });
      }
    }

    // 3. Consulta de gastos operativos
    const { data: expData } = await supabase
      .from("expenses")
      .select("id, amount, date, created_at")
      .gte("date", startIso)
      .lte("date", endIso)
      .order("date", { ascending: true });

    const expensesList = expData || [];

    // Mapas de procesamiento diario
    const dailyMap: Record<string, { income: number; cogs: number; expenses: number }> = {};

    const getDayKey = (dateStr: string): string => {
      const d = new Date(dateStr);
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    };

    let totalIncome = 0;
    let totalCogs = 0;

    sales.forEach((sale) => {
      const key = getDayKey(sale.created_at);
      if (!dailyMap[key]) {
        dailyMap[key] = { income: 0, cogs: 0, expenses: 0 };
      }

      const items = itemsMap.get(sale.id) || [];
      let itemsSum = 0;
      let cogsSum = 0;

      items.forEach((item) => {
        itemsSum += item.quantity * item.unit_price;
        cogsSum += item.quantity * item.unit_cost;
      });

      const headerAmount = Number(sale.total_amount) || 0;
      const finalSaleIncome = headerAmount > 0 ? headerAmount : itemsSum;

      totalIncome += finalSaleIncome;
      totalCogs += cogsSum;
      dailyMap[key].income += finalSaleIncome;
      dailyMap[key].cogs += cogsSum;
    });

    let totalExpenses = 0;
    expensesList.forEach((exp) => {
      const amt = Number(exp.amount) || 0;
      totalExpenses += amt;
      const key = getDayKey(exp.date || exp.created_at);
      if (!dailyMap[key]) {
        dailyMap[key] = { income: 0, cogs: 0, expenses: 0 };
      }
      dailyMap[key].expenses += amt;
    });

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
        return {
          date: key,
          formattedDate: key.slice(0, 5),
          income: item.income,
          cogs: item.cogs,
          expenses: item.expenses,
          netProfit: item.income - item.cogs - item.expenses,
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
    console.error("Error crítico calculando resumen financiero:", error);
    return { summary: defaultSummary, dailyTrends: [] };
  }
}