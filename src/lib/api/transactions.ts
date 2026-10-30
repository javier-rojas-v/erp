import { createClient } from "@/lib/supabase/client";

export interface StockEntryInput {
  productId: string;
  quantity: number;
  referenceDocument: string;
  newSalePrice?: number;
}

export interface POSCheckoutItem {
  product_id?: string;
  name: string;
  sku: string;
  price: number;
  quantity: number;
  is_service: boolean;
}

/**
 * Registra recepciones o entradas de stock por compra (PURCHASE_IN)
 */
export async function registerStockEntry(input: StockEntryInput): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const cashierEmail = user?.email || "caja@repuestostito.cl";

    const { data: product, error: fetchErr } = await supabase
      .from("products")
      .select("stock, price")
      .eq("id", input.productId)
      .single();

    if (fetchErr || !product) {
      return { success: false, error: "Producto no encontrado en la base de datos." };
    }

    const updatedStock = Number(product.stock) + Number(input.quantity);
    const updatedPrice = input.newSalePrice !== undefined && input.newSalePrice > 0 
      ? Number(input.newSalePrice) 
      : Number(product.price);

    const { error: txError } = await supabase
      .from("inventory_transactions")
      .insert([
        {
          product_id: input.productId,
          type: "PURCHASE_IN",
          quantity: Number(input.quantity),
          reference_document: input.referenceDocument.trim() || "FAC_RECEPCION",
          cashier_email: cashierEmail,
        },
      ]);

    if (txError) {
      return { success: false, error: `Error al registrar transacción: ${txError.message}` };
    }

    const { error: updateErr } = await supabase
      .from("products")
      .update({
        stock: updatedStock,
        price: updatedPrice,
      })
      .eq("id", input.productId);

    if (updateErr) {
      return { success: false, error: `Error al actualizar producto: ${updateErr.message}` };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Error al registrar la entrada." };
  }
}

/**
 * Obtiene todas las transacciones de inventario (Requerida por la página de Entradas)
 */
export async function getAllInventoryTransactions(): Promise<any[]> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("inventory_transactions")
      .select("*, products(sku, name, price)")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error al obtener transacciones:", error.message);
      return [];
    }
    return data || [];
  } catch (error) {
    console.error("Error de conexión al consultar transacciones:", error);
    return [];
  }
}

/**
 * Procesa ventas desde la caja POS registrando salidas (SALE_OUT) en inventory_transactions
 */
export async function processPOSSale(
  items: POSCheckoutItem[], 
  referenceDoc: string, 
  paymentMethod: string, 
  totalAmount: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const cashierEmail = user?.email || "caja@repuestostito.cl";
    const formattedRefDoc = `${referenceDoc.trim()}|${paymentMethod}`;

    for (const item of items) {
      let targetProductId = item.product_id;

      // Si es un servicio o no posee UUID válido, se asegura su registro en la tabla products
      if (item.is_service || !targetProductId || targetProductId.startsWith("srv-")) {
        const serviceSku = item.sku || "SRV-GENERICO";
        const { data: existingService } = await supabase
          .from("products")
          .select("id")
          .eq("sku", serviceSku)
          .maybeSingle();

        if (existingService) {
          targetProductId = existingService.id;
        } else {
          const { data: newService, error: createSrvErr } = await supabase
            .from("products")
            .insert({
              sku: serviceSku,
              name: item.name,
              category: "Servicios",
              brand: "Taller",
              price: item.price,
              stock: 0,
              min_stock: 0,
              is_service: true,
            })
            .select("id")
            .single();

          if (createSrvErr || !newService) {
            return { success: false, error: `No se pudo registrar el servicio "${item.name}".` };
          }
          targetProductId = newService.id;
        }
      }

      // Descontar stock para productos físicos
      if (!item.is_service) {
        const { data: prod, error: prodErr } = await supabase
          .from("products")
          .select("stock, name")
          .eq("id", targetProductId)
          .single();

        if (prodErr || !prod) {
          return { success: false, error: `Producto "${item.name}" no encontrado.` };
        }

        if (prod.stock < item.quantity) {
          return { success: false, error: `Stock insuficiente para "${item.name}". Disponible: ${prod.stock}` };
        }

        const { error: updateErr } = await supabase
          .from("products")
          .update({ stock: prod.stock - item.quantity })
          .eq("id", targetProductId);

        if (updateErr) {
          return { success: false, error: `Error al actualizar stock de "${item.name}": ${updateErr.message}` };
        }
      }

      // Insertar movimiento SALE_OUT
      const { error: txErr } = await supabase
        .from("inventory_transactions")
        .insert({
          product_id: targetProductId,
          type: "SALE_OUT",
          quantity: item.quantity,
          reference_document: formattedRefDoc,
          cashier_email: cashierEmail,
        });

      if (txErr) {
        return { success: false, error: `Error al registrar salida de "${item.name}": ${txErr.message}` };
      }
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Error general al procesar la venta." };
  }
}

/**
 * Obtiene el historial de ventas agrupando las salidas del día
 */
export async function getTodaySales() {
  try {
    const supabase = createClient();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from("inventory_transactions")
      .select("*, products(price)")
      .eq("type", "SALE_OUT")
      .gte("created_at", today.toISOString())
      .order("created_at", { ascending: false });

    if (error || !data) return [];

    const salesMap = new Map<string, {
      id: string;
      created_at: string;
      paymentMethod: string;
      cashier: string;
      itemsCount: number;
      total: number;
    }>();

    for (const tx of data) {
      const rawRef = tx.reference_document || "POS-LOCAL|Efectivo";
      const parts = rawRef.split("|");
      const docId = parts[0] || rawRef;
      const paymentMethod = parts[1] || "Efectivo";
      const itemPrice = Number((tx.products as any)?.price || 0);
      const itemQty = Number(tx.quantity || 0);

      const existing = salesMap.get(docId);
      if (existing) {
        existing.itemsCount += itemQty;
        existing.total += itemPrice * itemQty;
      } else {
        salesMap.set(docId, {
          id: docId,
          created_at: tx.created_at,
          paymentMethod: paymentMethod,
          cashier: tx.cashier_email || "Vendedor",
          itemsCount: itemQty,
          total: itemPrice * itemQty,
        });
      }
    }

    return Array.from(salesMap.values()).map((s) => ({
      id: s.id,
      date: new Date(s.created_at).toLocaleString("es-CL", { hour: '2-digit', minute: '2-digit' }),
      total: s.total,
      paymentMethod: s.paymentMethod,
      status: "COMPLETED",
      cashier: s.cashier,
      itemsCount: s.itemsCount,
    }));
  } catch (error) {
    console.error("Error al obtener ventas de hoy:", error);
    return [];
  }
}