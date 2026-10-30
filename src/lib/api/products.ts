import { createClient } from "@/lib/supabase/client";
import { Product } from "@/types";

export async function getProducts(): Promise<Product[]> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error al obtener productos de Supabase:", error);
      return [];
    }

    return (data as Product[]) || [];
  } catch (error) {
    console.error("Error de conexión con Supabase:", error);
    return [];
  }
}