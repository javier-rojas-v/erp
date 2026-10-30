export type ProductCategory =
  | 'Lubricantes y Aceites'
  | 'Filtros'
  | 'Frenos'
  | 'Suspensión y Dirección'
  | 'Motor y Correas'
  | 'Accesorios e Iluminación';

export interface Product {
  id: string;                     // UUID de la ficha de producto
  variant_id: string;             // UUID de la variante vendible
  sku: string;                    // Código interno
  part_number_factory: string;    // Número de parte fabricante (OEM)
  barcode?: string;               // Código de barras (EAN13/UPC)
  name: string;                   // Nombre descriptivo
  category: ProductCategory;      // Categoría
  brand: string;                  // Marca
  price: number;                  // Precio de venta público ($)
  stock: number;                  // current_stock
  min_stock: number;              // Umbral de stock crítico
  is_service?: boolean;           // Flag Opción A: Exento de control de inventario
  created_at?: string;
}

export interface CartItem {
  variant_id: string;             // ID único de la variante o servicio
  product_id?: string;
  sku: string;
  name: string;
  price: number;                  // Precio congelado al momento de agregar
  quantity: number;
  stock: number;                  // Límite máximo de stock retornado por la BD
  is_service: boolean;            // Flag para omitir restricción de stock
}