import InventoryClient from "@/features/inventory/inventory-client";
import { getInventoryCatalog } from "@/lib/data/erp";

export default function InventarioPage() {
  return <Suspense fallback={null}><InventarioData /></Suspense>;
}

async function InventarioData() {
  const products = await getInventoryCatalog();
  return <InventoryClient initialProducts={products} />;
}
import { Suspense } from "react";
