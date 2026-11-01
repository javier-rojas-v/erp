// src/lib/api/products.ts
import { createClient } from "@/lib/supabase/client";
import { requireAuthenticatedUser } from "@/lib/api/auth";
import { Product, MASTER_PRODUCT_CATEGORIES, MASTER_SERVICE_CATEGORIES, MutationResult } from "@/types";

export interface GetProductsParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  is_service?: boolean;
}

export interface PaginatedProducts {
  data: Product[];
  total: number;
  page: number;
  limit: number;
}

/**
 * Obtiene las categorías unificadas (Supabase PostgreSQL + Lista Maestra)
 * PostgreSQL actúa como única fuente de la verdad.
 */
export async function getCategories(isService: boolean = false): Promise<string[]> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("products")
      .select("category")
      .eq("is_service", isService);

    const masterCategories = isService ? MASTER_SERVICE_CATEGORIES : MASTER_PRODUCT_CATEGORIES;

    if (error || !data) {
      return Array.from(new Set(masterCategories));
    }

    const dbCategories = data
      .map((item) => item.category?.trim())
      .filter((cat): cat is string => Boolean(cat));

    return Array.from(new Set([...masterCategories, ...dbCategories]));
  } catch (error) {
    console.error("Error obteniendo maestro de categorías:", error);
    return isService ? [...MASTER_SERVICE_CATEGORIES] : [...MASTER_PRODUCT_CATEGORIES];
  }
}

/**
 * Consulta el catálogo de productos o servicios con soporte para paginación y búsqueda.
 */
export async function getProducts(params?: GetProductsParams): Promise<Product[]> {
  try {
    const supabase = createClient();
    let query = supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    if (params?.is_service !== undefined) {
      query = query.eq("is_service", params.is_service);
    }
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

/**
 * Registra un nuevo producto o servicio en el catálogo.
 */
export async function createProduct(input: CreateProductInput): Promise<MutationResult<Product>> {
  try {
    const user = await requireAuthenticatedUser();
    const supabase = createClient();
    const isService = Boolean(input.is_service);

    const formattedSku = input.sku.trim().toUpperCase();
    const formattedName = input.name.trim();
    const formattedBrand = input.brand.trim();
    const formattedPrice = Math.max(0, Number(input.price) || 0);
    const formattedStock = isService ? 0 : Math.max(0, Number(input.stock) || 0);
    const formattedMinStock = isService ? 0 : Math.max(0, Number(input.min_stock) || 0);

    const { data: productData, error: productError } = await supabase
      .from("products")
      .insert([
        {
          sku: formattedSku,
          part_number_factory: input.part_number_factory?.trim() || null,
          barcode: input.barcode?.trim() || null,
          name: formattedName,
          category: input.category,
          brand: formattedBrand,
          price: formattedPrice,
          stock: formattedStock,
          min_stock: formattedMinStock,
          is_service: isService,
        },
      ])
      .select()
      .single();

    if (productError || !productData) {
      return { success: false, error: productError?.message || "No se pudo crear el registro." };
    }

    if (!isService && formattedStock > 0) {
      await supabase.from("inventory_transactions").insert([
        {
          product_id: productData.id,
          type: "ADJUSTMENT_IN",
          quantity: formattedStock,
          reference_document: "INVENTARIO_INICIAL",
          cashier_email: user.email,
        },
      ]);
    }
    return { success: true, data: productData as Product };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error de autenticación o conexión.";
    return { success: false, error: message };
  }
}

/**
 * Actualiza una ficha existente con sanitización y resguardo estricto del SKU.
 */
export async function updateProduct(
  id: string,
  input: Partial<CreateProductInput>
): Promise<MutationResult<Product>> {
  try {
    await requireAuthenticatedUser();
    const supabase = createClient();
    const updatePayload: Record<string, unknown> = {};

    if (input.name !== undefined) updatePayload.name = input.name.trim();
    if (input.brand !== undefined) updatePayload.brand = input.brand.trim();
    if (input.category !== undefined) updatePayload.category = input.category;
    if (input.price !== undefined) updatePayload.price = Math.max(0, Number(input.price) || 0);
    if (input.stock !== undefined) updatePayload.stock = Math.max(0, Number(input.stock) || 0);
    if (input.min_stock !== undefined) updatePayload.min_stock = Math.max(0, Number(input.min_stock) || 0);
    if (input.part_number_factory !== undefined) updatePayload.part_number_factory = input.part_number_factory?.trim() || null;
    if (input.barcode !== undefined) updatePayload.barcode = input.barcode?.trim() || null;
    if (input.is_service !== undefined) updatePayload.is_service = Boolean(input.is_service);

    // Protección explícita del SKU: no se incluye en el payload bajo ninguna circunstancia

    const { data, error } = await supabase
      .from("products")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    if (error || !data) {
      return { success: false, error: error?.message || "Error al actualizar en la base de datos." };
    }
    return { success: true, data: data as Product };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al procesar la actualización.";
    return { success: false, error: message };
  }
}

/**
 * Carga masiva de catálogo vía transacción batch.
 */
export async function bulkCreateProducts(productsList: CreateProductInput[]): Promise<MutationResult<number>> {
  try {
    const user = await requireAuthenticatedUser();
    const supabase = createClient();
    const formattedProducts = productsList.map((p) => {
      const isSrv = Boolean(p.is_service);
      return {
        sku: p.sku.trim().toUpperCase(),
        part_number_factory: p.part_number_factory?.trim() || null,
        barcode: p.barcode?.trim() || null,
        name: p.name.trim(),
        category: p.category || "General",
        brand: p.brand.trim(),
        price: Math.max(0, Number(p.price) || 0),
        stock: isSrv ? 0 : Math.max(0, Number(p.stock) || 0),
        min_stock: isSrv ? 0 : Math.max(0, Number(p.min_stock) || 0),
        is_service: isSrv,
      };
    });

    const { data: insertedProducts, error } = await supabase
      .from("products")
      .upsert(formattedProducts, { onConflict: "sku" })
      .select();

    if (error) {
      return { success: false, data: 0, insertedCount: 0, error: error.message };
    }

    const count = insertedProducts?.length || 0;

    if (insertedProducts && insertedProducts.length > 0) {
      const initialTransactions = insertedProducts
        .filter((p) => !p.is_service && p.stock > 0)
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
    return { success: true, data: count, insertedCount: count };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error al procesar la carga masiva.";
    return { success: false, data: 0, insertedCount: 0, error: message };
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