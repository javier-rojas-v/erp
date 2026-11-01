// lib/api/products.ts
import { createClient } from "@/lib/supabase/client";
import { requireAuthenticatedUser } from "@/lib/api/auth";
import { Product } from "@/types";

export interface GetProductsParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}

export interface PaginatedProducts {
  data: Product[];
  total: number;
  page: number;
  limit: number;
}

/**
 * Consulta el catálogo de productos. Admite paginación y búsqueda nativa en BD.
 * Si no se envían parámetros, retoma comportamiento retrocompatible.
 */
export async function getProducts(params?: GetProductsParams): Promise<Product[]> {
  try {
    const supabase = createClient();
    let query = supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    if (params?.search?.trim()) {
      const q = `%${params.search.trim().toLowerCase()}%`;
      query = query.or(`sku.ilike.${q},name.ilike.${q},brand.ilike.${q},part_number_factory.ilike.${q}`);
    }

    if (params?.page && params?.limit) {
      const from = (params.page - 1) * params.limit;
      const to = from + params.limit - 1;
      query = query.range(from, to);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error consultando catálogo:", error.message);
      return [];
    }

    return (data as Product[]) || [];
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    console.error("Error de conexión al servidor:", message);
    return [];
  }
}

export interface CreateProductInput {
  sku: string;
  part_number_factory?: string;
  barcode?: string;
  name: string;
  category: string;
  brand: string;
  price: number;
  stock: number;
  min_stock: number;
  is_service?: boolean;
}

export async function createProduct(input: CreateProductInput): Promise<{ success: boolean; data?: Product; error?: string }> {
  try {
    const user = await requireAuthenticatedUser();
    const supabase = createClient();

    const { data: productData, error: productError } = await supabase
      .from("products")
      .insert([
        {
          sku: input.sku.trim().toUpperCase(),
          part_number_factory: input.part_number_factory?.trim() || null,
          barcode: input.barcode?.trim() || null,
          name: input.name.trim(),
          category: input.category,
          brand: input.brand.trim(),
          price: Number(input.price),
          stock: Number(input.stock),
          min_stock: Number(input.min_stock),
          is_service: Boolean(input.is_service),
        },
      ])
      .select()
      .single();

    if (productError || !productData) {
      return { success: false, error: productError?.message || "No se pudo crear el repuesto." };
    }

    if (input.stock > 0 && !input.is_service) {
      await supabase.from("inventory_transactions").insert([
        {
          product_id: productData.id,
          type: "ADJUSTMENT_IN",
          quantity: Number(input.stock),
          reference_document: "INVENTARIO_INICIAL",
          cashier_email: user.email,
        },
      ]);
    }

    return { success: true, data: productData as Product };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al conectar con la base de datos.";
    return { success: false, error: message };
  }
}

export async function bulkCreateProducts(productsList: CreateProductInput[]): Promise<{ success: boolean; insertedCount: number; error?: string }> {
  try {
    const user = await requireAuthenticatedUser();
    const supabase = createClient();

    const formattedProducts = productsList.map((p) => ({
      sku: p.sku.trim().toUpperCase(),
      part_number_factory: p.part_number_factory?.trim() || null,
      barcode: p.barcode?.trim() || null,
      name: p.name.trim(),
      category: p.category || "General",
      brand: p.brand.trim(),
      price: Math.max(0, Number(p.price) || 0),
      stock: Math.max(0, Number(p.stock) || 0),
      min_stock: Math.max(0, Number(p.min_stock) || 0),
      is_service: Boolean(p.is_service),
    }));

    const { data: insertedProducts, error } = await supabase
      .from("products")
      .upsert(formattedProducts, { onConflict: "sku" })
      .select();

    if (error) {
      return { success: false, insertedCount: 0, error: error.message };
    }

    if (insertedProducts && insertedProducts.length > 0) {
      const initialTransactions = insertedProducts
        .filter((p) => p.stock > 0)
        .map((p) => ({
          product_id: p.id,
          type: "ADJUSTMENT_IN",
          quantity: p.stock,
          reference_document: "CARGA_MASIVA",
          cashier_email: user.email,
        }));

      if (initialTransactions.length > 0) {
        await supabase.from("inventory_transactions").insert(initialTransactions);
      }
    }

    return { success: true, insertedCount: insertedProducts?.length || 0 };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error al procesar la carga masiva.";
    return { success: false, insertedCount: 0, error: message };
  }
}

export interface InventoryTransactionRow {
  id: string;
  product_id: string;
  type: string;
  quantity: number;
  reference_document?: string;
  cashier_email: string;
  created_at: string;
}

export async function getProductKardex(productId: string): Promise<InventoryTransactionRow[]> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("inventory_transactions")
      .select("*")
      .eq("product_id", productId)
      .order("created_at", { ascending: false });

    if (error) return [];
    return (data as InventoryTransactionRow[]) || [];
  } catch {
    return [];
  }
}