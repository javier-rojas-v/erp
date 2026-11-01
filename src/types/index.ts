// src/types/index.ts

export type ProductCategory =
  | 'Lubricantes y Aceites'
  | 'Filtros'
  | 'Frenos'
  | 'Suspensión y Dirección'
  | 'Motor y Correas'
  | 'Accesorios e Iluminación'
  | 'Electricidad y Baterías'
  | 'General';

export type ServiceCategory =
  | 'Mano de Obra'
  | 'Diagnóstico'
  | 'Mantención Preventiva'
  | 'Reparación de Taller'
  | 'Alineación y Balanceo';

export const MASTER_PRODUCT_CATEGORIES: ProductCategory[] = [
  'Lubricantes y Aceites',
  'Filtros',
  'Frenos',
  'Suspensión y Dirección',
  'Motor y Correas',
  'Accesorios e Iluminación',
  'Electricidad y Baterías',
  'General',
];

export const MASTER_SERVICE_CATEGORIES: ServiceCategory[] = [
  'Mano de Obra',
  'Diagnóstico',
  'Mantención Preventiva',
  'Reparación de Taller',
  'Alineación y Balanceo',
];

export interface MutationResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  insertedCount?: number;
}

export interface Product {
  id: string;
  variant_id?: string;
  sku: string;
  part_number_factory?: string | null;
  barcode?: string | null;
  name: string;
  category: ProductCategory | ServiceCategory | string;
  brand: string;
  price: number;
  cost_price: number; // Nuevo campo para cálculo de COGS
  stock: number;
  min_stock: number;
  is_service?: boolean;
  created_at?: string;
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

export type ExpenseCategory =
  | 'Arriendo'
  | 'Servicios Básicos'
  | 'Sueldos y Comisiones'
  | 'Herramientas y Insumos'
  | 'Impuestos y Patentes'
  | 'Otros Gastos';

export interface Expense {
  id: string;
  category: ExpenseCategory | string;
  amount: number;
  description?: string | null;
  date: string;
  cashier_email: string;
  created_at?: string;
}

export interface AuditLog {
  id: string;
  event_type: 'CASH_OPEN' | 'CASH_CLOSE' | 'DISCREPANCY' | 'STOCK_ENTRY' | 'SYSTEM_ALERT';
  description: string;
  cashier_email: string;
  metadata?: Record<string, any>;
  created_at: string;
}