import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Product } from "@/types";

export async function getProducts(): Promise<Product[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("id, sku, part_number_factory, barcode, name, category, brand, price, cost_price, stock, min_stock, is_service, is_active, created_at")
    .eq("is_active", true)
    .or("is_service.is.null,is_service.eq.false")
    .order("name", { ascending: true });

  if (error) throw new Error("No se pudo cargar el catálogo de productos.");
  return data.map((product) => ({
    ...product,
    variant_id: product.id,
    part_number_factory: product.part_number_factory,
    barcode: product.barcode,
    is_service: product.is_service ?? false,
  }));
}
