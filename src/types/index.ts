// types/index.ts

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