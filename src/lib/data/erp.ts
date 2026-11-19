import "server-only";

import { createClient, requireUser } from "@/lib/supabase/server";
import type { CashSession, InventoryTransaction, Product, Sale } from "@/types";

export interface StockEntryRow {
  id: string;
  invoiceNumber: string;
  date: string;
  sku: string;
  productName: string;
  quantity: number;
  salePriceUpdated: number;
}

export interface SaleHistoryRow {
  id: string;
  date: string;
  total: number;
  paymentMethod: Sale["payment_method"];
  itemsCount: number;
  cashier: string;
  status: "COMPLETED";
}

export interface InventoryProduct extends Product {
  specifications: Record<string, string>;
  compatible_vehicles: string[];
  kardex: Array<{ id: string; date: string; type: string; qty: number; doc: string; user: string }>;
}

export interface DashboardMetrics {
  salesToday: number;
  salesYesterday: number;
  weeklyTopProduct: { name: string; sku: string; quantity: number } | null;
  cashEstimate: number;
  hasOpenCash: boolean;
}

function zonedDayStart(date: Date): Date {
  const timeZone = "America/Santiago";
  const local = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
  const utcNoon = new Date(`${local}T12:00:00.000Z`);
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(utcNoon);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const zonedAtUtc = Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day), Number(values.hour), Number(values.minute), Number(values.second));
  const offset = zonedAtUtc - utcNoon.getTime();
  return new Date(Date.parse(`${local}T00:00:00.000Z`) - offset);
}

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const { supabase, user } = await requireUser();
  const todayStart = zonedDayStart(new Date());
  const yesterdayStart = zonedDayStart(new Date(todayStart.getTime() - 12 * 60 * 60 * 1000));
  const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [{ data: todaySales, error: todayError }, { data: yesterdaySales, error: yesterdayError }, { data: weekSales, error: weekError }, { data: session, error: sessionError }] = await Promise.all([
    supabase.from("sales").select("id, total_amount").gte("created_at", todayStart.toISOString()),
    supabase.from("sales").select("id, total_amount").gte("created_at", yesterdayStart.toISOString()).lt("created_at", todayStart.toISOString()),
    supabase.from("sales").select("id").gte("created_at", weekStart.toISOString()),
    supabase.from("cash_sessions").select("id, monto_inicial").eq("user_id", user.id).eq("status", "OPEN").order("opened_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (todayError || yesterdayError || weekError || sessionError) throw new Error("No se pudieron cargar las métricas del dashboard.");

  let weeklyTopProduct: DashboardMetrics["weeklyTopProduct"] = null;
  const weekSaleIds = (weekSales ?? []).map((sale) => sale.id);
  if (weekSaleIds.length) {
    const { data: items, error: itemsError } = await supabase.from("sale_items").select("product_id, quantity").in("sale_id", weekSaleIds);
    if (itemsError) throw new Error("No se pudo calcular el producto más vendido.");
    const quantities = new Map<string, number>();
    for (const item of items ?? []) quantities.set(item.product_id, (quantities.get(item.product_id) ?? 0) + item.quantity);
    const top = [...quantities].sort((a, b) => b[1] - a[1])[0];
    if (top) {
      const { data: product, error: productError } = await supabase.from("products").select("name, sku").eq("id", top[0]).maybeSingle();
      if (productError) throw new Error("No se pudo cargar el producto más vendido.");
      if (product) weeklyTopProduct = { name: product.name, sku: product.sku, quantity: top[1] };
    }
  }

  let cashEstimate = 0;
  if (session) {
    const { data: cashSales, error: cashSalesError } = await supabase.from("sales").select("total_amount").eq("cash_session_id", session.id).eq("payment_method", "Efectivo");
    if (cashSalesError) throw new Error("No se pudo calcular el efectivo de la sesión.");
    cashEstimate = (cashSales ?? []).reduce((sum, row) => sum + row.total_amount, 0);
  }

  return {
    salesToday: (todaySales ?? []).reduce((sum, row) => sum + row.total_amount, 0),
    salesYesterday: (yesterdaySales ?? []).reduce((sum, row) => sum + row.total_amount, 0),
    weeklyTopProduct,
    cashEstimate,
    hasOpenCash: Boolean(session),
  };
}

export async function getRecentStockEntries(): Promise<StockEntryRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inventory_transactions")
    .select("id, product_id, quantity, reference_document, created_at, type")
    .eq("type", "PURCHASE_IN")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw new Error("No se pudieron cargar las entradas de inventario.");
  if (!data.length) return [];

  const ids = [...new Set(data.map((item) => item.product_id))];
  const { data: products, error: productError } = await supabase
    .from("products")
    .select("id, sku, name, price")
    .in("id", ids);
  if (productError) throw new Error("No se pudieron cargar los productos de las entradas.");
  const productsById = new Map(products.map((product) => [product.id, product]));
  return data.flatMap((item) => {
    const product = productsById.get(item.product_id);
    if (!product) return [];
    return [{
      id: item.id,
      invoiceNumber: item.reference_document ?? "S/D",
      date: new Date(item.created_at).toLocaleString("es-CL"),
      sku: product.sku,
      productName: product.name,
      quantity: item.quantity,
      salePriceUpdated: product.price,
    }];
  });
}

export async function getSalesAndActiveCash(): Promise<{ sales: SaleHistoryRow[]; cashSession: CashSession | null }> {
  const { supabase, user } = await requireUser();
  const [{ data: sales, error: salesError }, { data: cashSession, error: cashError }] = await Promise.all([
    supabase.from("sales").select("id, cash_session_id, user_id, reference_document, payment_method, total_amount, cashier_email, created_at")
      .order("created_at", { ascending: false }).limit(100),
    supabase.from("cash_sessions").select("*").eq("user_id", user.id).eq("status", "OPEN")
      .order("opened_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (salesError || cashError) throw new Error("No se pudo cargar el historial de caja.");
  const ids = (sales ?? []).map((sale) => sale.id);
  const { data: saleItems, error: itemsError } = ids.length
    ? await supabase.from("sale_items").select("sale_id, quantity").in("sale_id", ids)
    : { data: [], error: null };
  if (itemsError) throw new Error("No se pudieron cargar los artículos vendidos.");
  const counts = new Map<string, number>();
  for (const item of saleItems ?? []) counts.set(item.sale_id, (counts.get(item.sale_id) ?? 0) + item.quantity);
  const mappedSales: SaleHistoryRow[] = (sales ?? []).map((sale) => ({
    id: sale.reference_document,
    date: new Date(sale.created_at).toLocaleString("es-CL"),
    total: sale.total_amount,
    paymentMethod: sale.payment_method,
    itemsCount: counts.get(sale.id) ?? 0,
    cashier: sale.cashier_email,
    status: "COMPLETED",
  }));
  return { sales: mappedSales, cashSession: cashSession ?? null };
}

export async function getInventoryCatalog(): Promise<InventoryProduct[]> {
  const supabase = await createClient();
  const { data: products, error: productsError } = await supabase.from("products")
    .select("id, sku, part_number_factory, barcode, name, category, brand, price, cost_price, stock, min_stock, is_service, is_active, created_at")
    .eq("is_active", true).or("is_service.is.null,is_service.eq.false").order("name");
  if (productsError) throw new Error("No se pudo cargar el inventario.");
  const { data: transactions, error: transactionsError } = await supabase.from("inventory_transactions")
    .select("id, product_id, type, quantity, reference_document, created_at, cashier_email")
    .order("created_at", { ascending: false }).limit(1000);
  if (transactionsError) throw new Error("No se pudo cargar el kardex de inventario.");
  const byProduct = new Map<string, InventoryProduct["kardex"]>();
  for (const transaction of transactions as Pick<InventoryTransaction, "id" | "product_id" | "type" | "quantity" | "reference_document" | "created_at" | "cashier_email">[]) {
    const history = byProduct.get(transaction.product_id) ?? [];
    history.push({
      id: transaction.id,
      date: new Date(transaction.created_at).toLocaleDateString("es-CL"),
      type: transaction.type,
      qty: transaction.type === "SALE_OUT" ? -transaction.quantity : transaction.quantity,
      doc: transaction.reference_document ?? "S/D",
      user: transaction.cashier_email,
    });
    byProduct.set(transaction.product_id, history);
  }
  return products.map((product) => ({
    ...product,
    variant_id: product.id,
    is_service: product.is_service ?? false,
    specifications: {},
    compatible_vehicles: [],
    kardex: byProduct.get(product.id) ?? [],
  }));
}
