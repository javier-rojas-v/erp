import { Product } from "@/types";

export async function getProducts(): Promise<Product[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([
        {
          id: "uuid-p1",
          variant_id: "uuid-v1",
          sku: "OIL-10W40",
          part_number_factory: "MOB-10W40-4L",
          barcode: "7801234567890",
          name: "Aceite Semi-Sintético 10W40 4L",
          category: "Lubricantes y Aceites",
          brand: "Mobil",
          price: 28000,
          stock: 12,
          min_stock: 4,
          is_service: false,
          created_at: new Date().toISOString(),
        },
        {
          id: "uuid-p2",
          variant_id: "uuid-v2",
          sku: "FLT-OIL01",
          part_number_factory: "90915-YZZF2",
          barcode: "7809876543210",
          name: "Filtro de Aceite Blindado",
          category: "Filtros",
          brand: "Mann Filter",
          price: 8500,
          stock: 3, // Stock crítico
          min_stock: 5,
          is_service: false,
          created_at: new Date().toISOString(),
        },
        {
          id: "uuid-p3",
          variant_id: "uuid-v3",
          sku: "BRK-PAD02",
          part_number_factory: "0986AB1234",
          barcode: "7801122334455",
          name: "Pastillas de Freno Delanteras",
          category: "Frenos",
          brand: "Bosch",
          price: 32000,
          stock: 8,
          min_stock: 4,
          is_service: false,
          created_at: new Date().toISOString(),
        },
      ]);
    }, 200);
  });
}