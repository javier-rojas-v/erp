import DashboardClient from "@/features/dashboard/dashboard-client";
import { getProducts } from "@/lib/data/products";
import { getDashboardMetrics } from "@/lib/data/erp";

export default function DashboardPage() {
  return <Suspense fallback={null}><DashboardData /></Suspense>;
}

async function DashboardData() {
  const [products, metrics] = await Promise.all([getProducts(), getDashboardMetrics()]);
  return <DashboardClient products={products} metrics={metrics} />;
}
import { Suspense } from "react";
