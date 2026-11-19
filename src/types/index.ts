export type UserRole = "admin" | "manager";
export type PaymentMethod = "Efectivo" | "Transferencia" | "Tarjeta";
export type InventoryTransactionType = "PURCHASE_IN" | "SALE_OUT" | "ADJUSTMENT_IN";

export type ProductCategory =
  | "Lubricantes y Aceites"
  | "Filtros"
  | "Frenos"
  | "Suspensión y Dirección"
  | "Motor y Correas"
  | "Accesorios e Iluminación"
  | "Electricidad y Baterías"
  | "General";

export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
}

export interface Product {
  id: string;
  variant_id: string;
  sku: string;
  part_number_factory: string | null;
  barcode: string | null;
  name: string;
  category: string;
  brand: string;
  price: number;
  cost_price: number;
  stock: number;
  min_stock: number;
  is_service: boolean;
  is_active: boolean;
  created_at: string;
}

export interface CartItem {
  variant_id: string;
  product_id?: string;
  sku: string;
  name: string;
  price: number;
  quantity: number;
  stock: number;
  is_service: boolean;
}

export interface MutationResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  insertedCount?: number;
}

export interface Expense {
  id: string;
  cash_session_id: string | null;
  user_id: string | null;
  category: string;
  amount: number;
  description: string | null;
  date: string;
  cashier_email: string;
  created_at: string;
}

export interface CashSession {
  id: string;
  user_id: string | null;
  opened_at: string;
  closed_at: string | null;
  monto_inicial: number | null;
  monto_final_sistema: number | null;
  monto_final_real: number | null;
  diferencia: number | null;
  status: "OPEN" | "CLOSED";
  cashier_email: string;
}

export interface Sale {
  id: string;
  cash_session_id: string | null;
  user_id: string | null;
  reference_document: string;
  payment_method: PaymentMethod;
  total_amount: number;
  cashier_email: string;
  created_at: string;
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  unit_cost: number;
  created_at: string;
}

export interface InventoryTransaction {
  id: string;
  product_id: string;
  type: InventoryTransactionType;
  quantity: number;
  reference_document: string | null;
  cashier_email: string;
  created_at: string;
  unit_cost: number;
  sale_group_id: string | null;
  user_id: string | null;
  sale_id: string | null;
}

export type { Database, Json } from "./database";
