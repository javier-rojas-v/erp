export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type Table<Row, Insert> = {
  Row: Row;
  Insert: Insert;
  Update: Partial<Insert>;
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      products: Table<
        {
          id: string;
          sku: string;
          part_number_factory: string | null;
          barcode: string | null;
          name: string;
          category: string;
          brand: string;
          price: number;
          stock: number;
          min_stock: number;
          is_service: boolean | null;
          created_at: string;
          cost_price: number;
          is_active: boolean;
        },
        {
          id?: string;
          sku: string;
          part_number_factory?: string | null;
          barcode?: string | null;
          name: string;
          category: string;
          brand: string;
          price: number;
          stock?: number;
          min_stock?: number;
          is_service?: boolean | null;
          created_at?: string;
          cost_price?: number;
          is_active?: boolean;
        }
      >;
      inventory_transactions: Table<
        {
          id: string;
          product_id: string;
          type: "PURCHASE_IN" | "SALE_OUT" | "ADJUSTMENT_IN";
          quantity: number;
          reference_document: string | null;
          cashier_email: string;
          created_at: string;
          unit_cost: number;
          sale_group_id: string | null;
          user_id: string | null;
          sale_id: string | null;
        },
        {
          id?: string;
          product_id: string;
          type: "PURCHASE_IN" | "SALE_OUT" | "ADJUSTMENT_IN";
          quantity: number;
          reference_document?: string | null;
          cashier_email: string;
          created_at?: string;
          unit_cost?: number;
          sale_group_id?: string | null;
          user_id?: string | null;
          sale_id?: string | null;
        }
      >;
      cash_sessions: Table<
        {
          id: string;
          opened_at: string;
          closed_at: string | null;
          monto_inicial: number | null;
          monto_final_sistema: number | null;
          monto_final_real: number | null;
          diferencia: number | null;
          status: "OPEN" | "CLOSED";
          cashier_email: string;
          user_id: string | null;
        },
        {
          id?: string;
          opened_at?: string;
          closed_at?: string | null;
          monto_inicial?: number | null;
          monto_final_sistema?: number | null;
          monto_final_real?: number | null;
          diferencia?: number | null;
          status?: "OPEN" | "CLOSED";
          cashier_email: string;
          user_id?: string | null;
        }
      >;
      expenses: Table<
        {
          id: string;
          category: string;
          amount: number;
          description: string | null;
          date: string;
          cashier_email: string;
          created_at: string;
          user_id: string | null;
          cash_session_id: string | null;
        },
        {
          id?: string;
          category: string;
          amount: number;
          description?: string | null;
          date?: string;
          cashier_email: string;
          created_at?: string;
          user_id?: string | null;
          cash_session_id?: string | null;
        }
      >;
      profiles: Table<
        { id: string; role: "admin" | "manager"; created_at: string },
        { id: string; role: "admin" | "manager"; created_at?: string }
      >;
      sales: Table<
        {
          id: string;
          cash_session_id: string | null;
          user_id: string | null;
          reference_document: string;
          payment_method: "Efectivo" | "Transferencia" | "Tarjeta";
          total_amount: number;
          cashier_email: string;
          created_at: string;
        },
        {
          id?: string;
          cash_session_id?: string | null;
          user_id?: string | null;
          reference_document: string;
          payment_method: "Efectivo" | "Transferencia" | "Tarjeta";
          total_amount: number;
          cashier_email: string;
          created_at?: string;
        }
      >;
      sale_items: Table<
        {
          id: string;
          sale_id: string;
          product_id: string;
          quantity: number;
          unit_price: number;
          unit_cost: number;
          created_at: string;
        },
        {
          id?: string;
          sale_id: string;
          product_id: string;
          quantity: number;
          unit_price: number;
          unit_cost?: number;
          created_at?: string;
        }
      >;
    };
    Views: Record<string, never>;
    Functions: {
      process_pos_sale: {
        Args: { p_items: Json; p_payment_method: string };
        Returns: Json;
      };
      register_stock_entry: {
        Args: { p_product_id: string; p_quantity: number; p_reference_document: string; p_new_sale_price: number | null };
        Returns: Json;
      };
      register_stock_adjustment: {
        Args: { p_product_id: string; p_quantity: number; p_adjustment_type: string; p_reference_document: string };
        Returns: Json;
      };
      close_cash_session: {
        Args: { p_cash_session_id: string; p_monto_final_real: number };
        Returns: Json;
      };
      open_cash_session: {
        Args: { p_monto_inicial: number };
        Returns: Json;
      };
      register_expense: {
        Args: { p_category: string; p_amount: number; p_description: string | null; p_date: string };
        Returns: Json;
      };
      register_product: {
        Args: { p_sku: string; p_name: string; p_category: string; p_brand: string; p_part_number_factory: string | null; p_price: number; p_stock: number; p_min_stock: number };
        Returns: Json;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
