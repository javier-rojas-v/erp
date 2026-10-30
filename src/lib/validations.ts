import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().email("Ingresa un correo válido").max(254),
  password: z.string().min(1, "Ingresa tu contraseña").max(256),
});

export const productSchema = z.object({
  sku: z.string().min(2, "El SKU debe tener al menos 2 caracteres").max(30, "SKU demasiado largo"),
  name: z.string().min(3, "El nombre del repuesto es obligatorio").max(120, "Nombre demasiado largo"),
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
  barcode: z.string().max(100).optional(),
  price: z.coerce.number().positive("El precio de venta debe ser mayor a 0"),
  stock: z.coerce.number().int().nonnegative("El stock no puede ser negativo"),
  min_stock: z.coerce.number().int().nonnegative("El stock mínimo no puede ser negativo"),
});

export type ProductFormValues = z.infer<typeof productSchema>;