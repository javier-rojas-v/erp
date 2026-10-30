import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().email("Ingresa un correo válido").max(254),
  password: z.string().min(1, "Ingresa tu contraseña").max(256),
});

// Esquema estricto para validar la creación o edición de un producto
export const productSchema = z.object({
  sku: z.string().min(2, "El SKU debe tener al menos 2 caracteres").max(20, "SKU demasiado largo"),
  name: z.string().min(3, "El nombre del repuesto es obligatorio").max(100, "Nombre demasiado largo"),
  category: z.enum([
    'Lubricantes y Aceites',
    'Filtros',
    'Frenos',
    'Suspensión y Dirección',
    'Motor y Correas',
    'Accesorios e Iluminación'
  ], { message: "Selecciona una categoría válida" }),
  brand: z.string().min(2, "La marca es obligatoria"),
  part_number_factory: z.string().max(100).optional(),
  description: z.string().max(2000).optional(),
  specifications: z.record(z.string(), z.unknown()).default({}),
  price: z.coerce.number().positive("El precio de venta debe ser mayor a 0"),
  stock: z.coerce.number().int().nonnegative("El stock no puede ser negativo"),
  min_stock: z.coerce.number().int().nonnegative("El stock mínimo no puede ser negativo"),
  max_stock: z.coerce.number().int().positive().optional(),
}).refine(
  (values) => values.max_stock === undefined || values.max_stock >= values.min_stock,
  { message: "El stock máximo no puede ser menor al stock mínimo", path: ["max_stock"] }
);

// Tipo inferido para usar con TypeScript en los formularios
export type ProductFormValues = z.infer<typeof productSchema>;
