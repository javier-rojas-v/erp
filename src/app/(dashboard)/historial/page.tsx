import CashHistoryClient from "@/features/cash-sessions/cash-history-client";
import { getSalesAndActiveCash } from "@/lib/data/erp";

export default function HistorialCajaPage() {
  return <Suspense fallback={null}><HistorialData /></Suspense>;
}

async function HistorialData() {
  const { sales, cashSession } = await getSalesAndActiveCash();
  return <CashHistoryClient initialSales={sales} initialCashSession={cashSession} />;
}
import { Suspense } from "react";
