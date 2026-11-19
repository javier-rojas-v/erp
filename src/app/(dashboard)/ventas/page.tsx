import POSClient from "@/features/pos/pos-client";
import { getProducts } from "@/lib/data/products";

export default function VentasPage() {
  return <Suspense fallback={null}><VentasData /></Suspense>;
}

async function VentasData() {
  const products = await getProducts();
  return <POSClient initialProducts={products} />;
}
import { Suspense } from "react";
