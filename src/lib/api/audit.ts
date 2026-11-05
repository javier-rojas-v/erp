// src/lib/api/audit.ts

import { createClient } from "@/lib/supabase/client";
import { AuditLog } from "@/types";

export async function getAuditLogs(limit: number = 100): Promise<AuditLog[]> {
  try {
    const supabase = createClient();

    // 1. Sesiones de caja (Aperturas, Cierres y Descuadres)
    const { data: sessions, error: sessError } = await supabase
      .from("cash_sessions")
      .select("*")
      .order("opened_at", { ascending: false })
      .limit(limit);

    if (sessError) {
      console.error("Error consultando sesiones de caja para auditoría:", sessError.message);
    }

    // 2. Entradas de inventario y reabastecimiento
    const { data: stockEntries, error: stockError } = await supabase
      .from("inventory_transactions")
      .select("*, products(sku, name)")
      .in("type", ["PURCHASE_IN", "ADJUSTMENT_IN"])
      .order("created_at", { ascending: false })
      .limit(limit);

    if (stockError) {
      console.error("Error consultando entradas para auditoría:", stockError.message);
    }

    // 3. Alertas de quiebre de stock inminente
    const { data: lowStockProds, error: lowStockError } = await supabase
      .from("products")
      .select("id, sku, name, stock, min_stock, created_at")
      .eq("is_service", false)
      .lte("stock", 0);

    if (lowStockError) {
      console.error("Error consultando productos agotados para alertas:", lowStockError.message);
    }

    const auditLogs: AuditLog[] = [];

    if (sessions) {
      sessions.forEach((s) => {
        if (s.opened_at) {
          auditLogs.push({
            id: `open-${s.id}`,
            event_type: "CASH_OPEN",
            description: `Apertura de turno de caja realizada por [${s.cashier_email}] con saldo inicial $${Number(s.monto_inicial || 0).toLocaleString("es-CL")}.`,
            cashier_email: s.cashier_email,
            metadata: { session_id: s.id, user_id: s.user_id, monto_inicial: s.monto_inicial },
            created_at: s.opened_at,
          });
        }
        if (s.closed_at) {
          const diff = Number(s.diferencia || 0);
          if (diff !== 0) {
            auditLogs.push({
              id: `disc-${s.id}`,
              event_type: "DISCREPANCY",
              description: `DESCUADRE DE CAJA DETECTADO: Sistema $${Number(s.monto_final_sistema || 0).toLocaleString("es-CL")} vs Real $${Number(s.monto_final_real || 0).toLocaleString("es-CL")}. Diferencia: $${diff.toLocaleString("es-CL")}. Operador: ${s.cashier_email}`,
              cashier_email: s.cashier_email,
              metadata: {
                session_id: s.id,
                user_id: s.user_id,
                monto_sistema: s.monto_final_sistema,
                monto_real: s.monto_final_real,
                diferencia: diff,
              },
              created_at: s.closed_at,
            });
          } else {
            auditLogs.push({
              id: `close-${s.id}`,
              event_type: "CASH_CLOSE",
              description: `Cierre de turno de caja completado sin diferencias. Total sistema: $${Number(s.monto_final_sistema || 0).toLocaleString("es-CL")}. Operador: ${s.cashier_email}`,
              cashier_email: s.cashier_email,
              metadata: { session_id: s.id, user_id: s.user_id, monto_final: s.monto_final_real },
              created_at: s.closed_at,
            });
          }
        }
      });
    }

    if (stockEntries) {
      stockEntries.forEach((tx) => {
        const prodName = tx.products?.name || "Repuesto";
        const sku = tx.products?.sku || "S/K";
        const doc = tx.reference_document || "S/D";
        auditLogs.push({
          id: `stock-${tx.id}`,
          event_type: "STOCK_ENTRY",
          description: `Ingreso de stock (+${tx.quantity} un.) para "${prodName}" [${sku}]. Doc: ${doc}. Registrado por: ${tx.cashier_email}`,
          cashier_email: tx.cashier_email,
          metadata: { transaction_id: tx.id, user_id: tx.user_id, quantity: tx.quantity, document: doc },
          created_at: tx.created_at,
        });
      });
    }

    if (lowStockProds) {
      lowStockProds.forEach((p) => {
        auditLogs.push({
          id: `alert-${p.id}`,
          event_type: "SYSTEM_ALERT",
          description: `ALERTA DE QUIEBRE DE STOCK: "${p.name}" [${p.sku}] tiene ${p.stock} unidades disponibles (Stock Mínimo: ${p.min_stock}).`,
          cashier_email: "Sistema ERP",
          metadata: { product_id: p.id, stock: p.stock, min_stock: p.min_stock },
          created_at: p.created_at || new Date().toISOString(),
        });
      });
    }

    auditLogs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return auditLogs.slice(0, limit);
  } catch (error) {
    console.error("Error general generando logs de auditoría:", error);
    return [];
  }
}