// src/lib/api/finance.ts
import { createClient } from "@/lib/supabase/client";

export interface FinancialSummary {
  totalIncome: number;      // Ingresos Totales (I)
  cogs: number;             // Costo de Ventas (COGS)
  grossProfit: number;      // Ganancia Bruta (GB = I - COGS)
  grossMarginPct: number;   // Margen Bruto %
  totalExpenses: number;    // Gastos Operativos (G)
  netProfit: number;        // Ganancia Neta Operativa (GN = GB - G)
  netMarginPct: number;     // Margen Neto %
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

    // 1. Obtención desacoplada de ventas en el período
    let { data: salesData, error: salesErr } = await supabase
      .from("sales")
      .select("id, created_at, total_amount, cashier_email, payment_method, reference_document")
      .gte("created_at", startIso)
      .lte("created_at", endIso)
      .order("created_at", { ascending: true });

    if (salesErr || !salesData) {
      console.warn("Fallo al obtener ventas por rango de fechas en BI:", salesErr?.message);
      const fallback = await supabase
        .from("sales")
        .select("id, created_at, total_amount, cashier_email, payment_method, reference_document")
        .order("created_at", { ascending: true });
      salesData = fallback.data || [];
    }

    const sales = salesData || [];
    const saleIds = sales.map((s: any) => s.id).filter(Boolean);

    // 2. Obtención de ítems de ventas para cálculo de COGS
    const saleItemsMap = new Map<string, Array<{ quantity: number; unit_price: number; unit_cost: number; product_id: string }>>();
    if (saleIds.length > 0) {
      const { data: itemsData, error: itemsErr } = await supabase
        .from("sale_items")
        .select("sale_id, product_id, quantity, unit_price, unit_cost")
        .in("sale_id", saleIds);

      if (!itemsErr && itemsData) {
        itemsData.forEach((item: any) => {
          const list = saleItemsMap.get(item.sale_id) || [];
          list.push({
            quantity: Number(item.quantity) || 0,
            unit_price: Number(item.unit_price) || 0,
            unit_cost: Number(item.unit_cost) || 0,
            product_id: item.product_id,
          });
          saleItemsMap.set(item.sale_id, list);
        });
      }
    }

    // 3. Obtención de gastos operativos
    let { data: expData, error: expErr } = await supabase
      .from("expenses")
      .select("id, category, amount, description, date, cashier_email")
      .gte("date", startIso)
      .lte("date", endIso)
      .order("date", { ascending: true });

    if (expErr || !expData) {
      console.warn("Fallo al obtener gastos por rango de fechas:", expErr?.message);
      const fallbackExp = await supabase
        .from("expenses")
        .select("id, category, amount, description, date, cashier_email")
        .order("date", { ascending: true });
      expData = fallbackExp.data || [];
    }

    const expensesList = expData || [];

    // 4. Catálogo de productos para verificación de servicio y costo base
    const { data: prodsData } = await supabase
      .from("products")
      .select("id, is_service, cost_price");

    const productMap = new Map<string, { is_service: boolean; cost_price: number }>();
    if (prodsData) {
      prodsData.forEach((p: any) => {
        productMap.set(p.id, {
          is_service: Boolean(p.is_service),
          cost_price: Number(p.cost_price) || 0,
        });
      });
    }

    let totalIncome = 0;
    let totalCogs = 0;
    const dailyMap: Record<string, { income: number; cogs: number; expenses: number }> = {};

    const getDayKey = (dateStr: string) => {
      try {
        const d = new Date(dateStr);
        const yearStr = new Intl.DateTimeFormat("en-US", { timeZone: "America/Santiago", year: "numeric" }).format(d);
        const monthStr = new Intl.DateTimeFormat("en-US", { timeZone: "America/Santiago", month: "2-digit" }).format(d);
        const dayStr = new Intl.DateTimeFormat("en-US", { timeZone: "America/Santiago", day: "2-digit" }).format(d);
        return `${dayStr}/${monthStr}/${yearStr}`;
      } catch {
        return dateStr.slice(0, 10);
      }
    };

    if (sales.length > 0) {
      sales.forEach((sale: any) => {
        const key = getDayKey(sale.created_at);
        if (!dailyMap[key]) {
          dailyMap[key] = { income: 0, cogs: 0, expenses: 0 };
        }

        const saleTotal = Number(sale.total_amount) || 0;
        totalIncome += saleTotal;
        dailyMap[key].income += saleTotal;

        const items = saleItemsMap.get(sale.id);
        if (items && items.length > 0) {
          items.forEach((item) => {
            const qty = item.quantity;
            const prodInfo = item.product_id ? productMap.get(item.product_id) : undefined;
            const isService = prodInfo ? prodInfo.is_service : false;

            let unitCost = 0;
            if (!isService) {
              unitCost = item.unit_cost > 0 ? item.unit_cost : (prodInfo?.cost_price || 0);
            }

            const itemCogs = qty * unitCost;
            totalCogs += itemCogs;
            dailyMap[key].cogs += itemCogs;
          });
        }
      });
    }

    let totalExpenses = 0;
    if (expensesList.length > 0) {
      expensesList.forEach((exp: any) => {
        const amt = Number(exp.amount) || 0;
        totalExpenses += amt;
        const key = getDayKey(exp.date || exp.created_at);
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
        const cleanA = a.replace(/[^\d/]/g, "");
        const cleanB = b.replace(/[^\d/]/g, "");
        const partsA = cleanA.split("/").map(Number);
        const partsB = cleanB.split("/").map(Number);
        const dateA = new Date(partsA[2] || 2026, (partsA[1] || 1) - 1, partsA[0] || 1).getTime();
        const dateB = new Date(partsB[2] || 2026, (partsB[1] || 1) - 1, partsB[0] || 1).getTime();
        return dateA - dateB;
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