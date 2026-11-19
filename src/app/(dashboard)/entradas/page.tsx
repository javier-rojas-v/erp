import StockEntriesClient from "@/features/stock-entries/stock-entries-client";
import { getProducts } from "@/lib/data/products";
import { getRecentStockEntries } from "@/lib/data/erp";

export default function EntradasPage() {
  return <Suspense fallback={null}><EntradasData /></Suspense>;
}

async function EntradasData() {
  const [products, entries] = await Promise.all([getProducts(), getRecentStockEntries()]);
  return (
    <StockEntriesClient
      catalog={products.map((product) => ({
        variant_id: product.id,
        sku: product.sku,
        name: product.name,
        current_price: product.price,
      }))}
      initialEntries={entries}
    />
  );
}
import { Suspense } from "react";
