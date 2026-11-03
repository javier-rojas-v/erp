"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAuthenticatedUser } from "@/lib/api/auth";
import { Product, MASTER_PRODUCT_CATEGORIES, MASTER_SERVICE_CATEGORIES, MutationResult } from "@/types";
import type { InventoryTransactionRow } from "@/lib/api/transactions";

export interface ProductQuery {
  is_service?: boolean;
  search?: string;
}

export interface CreateProductInput {
  sku: string;
  part_number_factory?: string;
  barcode?: string;
  name: string;
  category: string;
  brand: string;
  price: number;
  cost_price?: number;
  stock: number;
  min_stock: number;
  is_service?: boolean;
}

export async function createProduct(input: CreateProductInput): Promise<MutationResult<Product>> {
  try {
    const user = await requireAuthenticatedUser();
    const supabase = await createClient();
    const isService = Boolean(input.is_service);
    const formattedSku = input.sku.trim().toUpperCase();
    const formattedName = input.name.trim();
    const formattedBrand = input.brand.trim();
    const formattedPrice = Math.max(0, Number(input.price) || 0);
    const formattedCostPrice = isService ? 0 : Number(input.cost_price) || 0;
    const formattedStock = isService ? 0 : Math.max(0, Number(input.stock) || 0);
    const formattedMinStock = isService ? 0 : Math.max(0, Number(input.min_stock) || 0);

    if (!isService && formattedCostPrice <= 0) {
      return { success: false, error: "El costo de compra debe ser mayor a 0 para repuestos físicos." };
    }

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
          cost_price: formattedCostPrice,
          stock: formattedStock,
          min_stock: formattedMinStock,
          is_service: isService,
        },
      ])
      .select("id, sku, part_number_factory, barcode, name, category, brand, price, cost_price, stock, min_stock, is_service, created_at")
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
          unit_cost: formattedCostPrice,
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

export async function updateProduct(
  id: string,
  input: Partial<CreateProductInput>
): Promise<MutationResult<Product>> {
  try {
    await requireAuthenticatedUser();
    const supabase = await createClient();

    const { data: currentProduct } = await supabase
      .from("products")
      .select("is_service, cost_price")
      .eq("id", id)
      .single();

    const willBeService = input.is_service !== undefined ? Boolean(input.is_service) : Boolean(currentProduct?.is_service);
    
    if (input.cost_price !== undefined && !willBeService && Number(input.cost_price) <= 0) {
      return { success: false, error: "El costo de compra debe ser mayor a 0 para repuestos físicos." };
    }

    const updatePayload: Record<string, unknown> = {};

    if (input.name !== undefined) updatePayload.name = input.name.trim();
    if (input.brand !== undefined) updatePayload.brand = input.brand.trim();
    if (input.category !== undefined) updatePayload.category = input.category;
    if (input.price !== undefined) updatePayload.price = Math.max(0, Number(input.price) || 0);
    if (input.cost_price !== undefined) updatePayload.cost_price = willBeService ? 0 : Number(input.cost_price);
    if (input.stock !== undefined) updatePayload.stock = Math.max(0, Number(input.stock) || 0);
    if (input.min_stock !== undefined) updatePayload.min_stock = Math.max(0, Number(input.min_stock) || 0);
    if (input.part_number_factory !== undefined) updatePayload.part_number_factory = input.part_number_factory?.trim() || null;
    if (input.barcode !== undefined) updatePayload.barcode = input.barcode?.trim() || null;
    if (input.is_service !== undefined) updatePayload.is_service = Boolean(input.is_service);

    const { data, error } = await supabase
      .from("products")
      .update(updatePayload)
      .eq("id", id)
      .select("id, sku, part_number_factory, barcode, name, category, brand, price, cost_price, stock, min_stock, is_service, created_at")
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

export async function getProducts(params?: ProductQuery): Promise<Product[]> {
  try {
    await requireAuthenticatedUser();
    const supabase = await createClient();
    let query = supabase
      .from("products")
      .select("id, sku, part_number_factory, barcode, name, category, brand, price, cost_price, stock, min_stock, is_service, created_at")
      .order("created_at", { ascending: false });

    if (params?.is_service !== undefined) {
      query = query.eq("is_service", params.is_service);
    }

    if (params?.search?.trim()) {
      const q = `%${params.search.trim().toLowerCase()}%`;
      query = query.or(`sku.ilike.${q},name.ilike.${q},brand.ilike.${q},part_number_factory.ilike.${q}`);
    }

    const { data, error } = await query;
    if (error) {
      console.error("Error consultando catálogo:", error.message);
      return [];
    }

    return (data as Product[]) || [];
  } catch (error) {
    console.error("Error al obtener productos:", error);
    return [];
  }
}

export async function getCategories(isService: boolean = false): Promise<string[]> {
  try {
    await requireAuthenticatedUser();
    const supabase = await createClient();
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

export async function bulkCreateProducts(productsList: CreateProductInput[]): Promise<MutationResult<number>> {
  try {
    const user = await requireAuthenticatedUser();
    const supabase = await createClient();

    const formattedProducts = productsList.map((p) => {
      const isSrv = Boolean(p.is_service);

      const sku = String(p.sku || "").trim().toUpperCase();
      const name = String(p.name || "").trim();
      const brand = String(p.brand || "").trim();
      
      let category = p.category ? String(p.category).trim() : "";
      if (!category) {
        category = isSrv ? "Mano de Obra" : "General";
      }

      const price = Math.max(0, Number(p.price) || 0);
      const cost_price = isSrv ? 0 : Number(p.cost_price) || 0;

      if (!isSrv && cost_price <= 0) {
        throw new Error(`El repuesto físico [SKU: ${sku}] debe tener un costo de compra mayor a 0.`);
      }

      const stock = isSrv ? 0 : Math.max(0, Math.floor(Number(p.stock) || 0));
      const parsedMinStock = Number(p.min_stock);
      const min_stock = isSrv
        ? 0
        : isNaN(parsedMinStock) || parsedMinStock < 0
        ? 2
        : Math.floor(parsedMinStock);

      const part_number_factory =
        p.part_number_factory && String(p.part_number_factory).trim() !== ""
          ? String(p.part_number_factory).trim()
          : null;

      const barcode =
        p.barcode && String(p.barcode).trim() !== ""
          ? String(p.barcode).trim()
          : null;

      return {
        sku,
        part_number_factory,
        barcode,
        name,
        category,
        brand,
        price,
        cost_price,
        stock,
        min_stock,
        is_service: isSrv,
      };
    });

    const { data: insertedProducts, error } = await supabase
      .from("products")
      .upsert(formattedProducts, { onConflict: "sku" })
      .select("id, sku, part_number_factory, barcode, name, category, brand, price, cost_price, stock, min_stock, is_service, created_at");

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
          unit_cost: p.cost_price,
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

export async function getProductKardex(productId: string): Promise<InventoryTransactionRow[]> {
  try {
    await requireAuthenticatedUser();
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("inventory_transactions")
      .select("id, product_id, type, quantity, unit_cost, reference_document, cashier_email, sale_group_id, created_at")
      .eq("product_id", productId)
      .order("created_at", { ascending: false });

    if (error) return [];
    return (data as InventoryTransactionRow[]) || [];
  } catch {
    return [];
  }
}

export async function updateCategoryName(
  currentName: string,
  nextName: string,
  isService: boolean = false
): Promise<MutationResult<number>> {
  try {
    await requireAuthenticatedUser();
    const source = currentName.trim();
    const target = nextName.trim();
    if (!source || target.length < 2 || target.length > 80) {
      return { success: false, error: "El nombre de categoría no es válido." };
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("products")
      .update({ category: target })
      .eq("category", source)
      .eq("is_service", isService)
      .select("id");

    if (error) {
      console.error("category rename failed", { code: error.code });
      return { success: false, error: "No fue posible actualizar la categoría." };
    }
    return { success: true, data: data?.length || 0, insertedCount: data?.length || 0 };
  } catch {
    return { success: false, error: "No fue posible actualizar la categoría." };
  }
}

export async function deleteCategoryAndReassign(
  category: string,
  replacement: string,
  isService: boolean = false
): Promise<MutationResult<number>> {
  return updateCategoryName(category, replacement, isService);
}

export type { InventoryTransactionRow };
