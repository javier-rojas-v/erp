# Auditoría técnica — ERP Repuestos TITO

Fecha: 2026-10-29

## Estado actual

El frontend compila con TypeScript y pasa ESLint dentro del contenedor de desarrollo. El login usa Supabase Auth, las rutas del dashboard exigen una sesión válida y existe cierre de sesión. La aplicación todavía no es funcional para producción porque las pantallas operativas contienen datos mock y no persisten ventas, entradas, anulaciones ni cierres de caja en Supabase.

## Correcciones aplicadas

- Validación server-side del login con Zod y mensajes genéricos para no revelar si un correo existe.
- Comprobación de sesión mediante `auth.getUser()` tanto en `proxy.ts` como en el layout protegido.
- Manejo fail-closed si Supabase no está configurado o no responde.
- Acción de logout real que invalida la sesión en Supabase.
- Identidad de usuario del topbar tomada de la sesión, sin nombre hard-coded.
- Cabeceras HTTP defensivas: `nosniff`, `DENY`, `Referrer-Policy` y `Permissions-Policy`.
- Corrección de errores de lint, tipos `any` y efectos React que generaban renders en cascada.
- Dependencia `zod` declarada.
- Docker actualizado a Node 22, compatible con las versiones actuales de Supabase instaladas.
- Validación de que `max_stock` no sea menor que `min_stock`.

## Riesgos pendientes de prioridad alta

1. **Persistencia inexistente:** `src/lib/api/products.ts` y las pantallas de inventario, entradas, ventas e historial usan mocks. El checkout ahora bloquea la falsa confirmación y avisa que la integración está pendiente; todavía no crea `inventory_transactions`, no actualiza `product_variants` ni registra una venta.
2. **Integridad de inventario:** la rebaja de stock debe ser una función RPC/transacción en Postgres que valide stock disponible, inserte el movimiento y actualice `current_stock` atómicamente. Nunca debe confiar en el stock enviado por el navegador.
3. **RLS obligatoria:** crear políticas Supabase para que cada lectura/escritura requiera `auth.uid()` y separar permisos por rol si habrá administradores y cajeros. La clave `service_role` no debe llegar al cliente.
4. **Modelo de ventas:** el esquema suministrado no incluye `sales`, `sale_items`, método de pago ni caja. Es necesario definir esas tablas antes de conectar `/ventas` e `/historial`.
5. **Modelo de usuarios/roles:** `inventory_transactions.user_id` debe referenciar una tabla de perfiles o validarse contra `auth.users`; la autorización de administrador/cajero requiere una política explícita.

## Compatibilidad con el esquema suministrado

El catálogo esperado debe leer `products` + `product_variants` + `brands` + `categories`, proyectando `sale_price` como `price` y `current_stock` como `stock`. La interfaz todavía conserva un concepto de servicios rápidos que no existe en el esquema indicado; debe eliminarse o modelarse como productos/variantes antes de habilitar ventas reales.

## Verificaciones ejecutadas

- `npm run lint`: OK dentro del contenedor.
- `npx tsc --noEmit`: OK dentro del contenedor.
- `npm audit --omit=dev`: 4 vulnerabilidades transitivas reportadas; una de severidad alta en `body-parser` y vulnerabilidades de `deepmerge` a través de `shadcn`. `npm audit fix --force` propone cambios breaking y no se aplicó automáticamente.
- El build de Next.js llegó a compilación optimizada; el proceso final no pudo repetirse porque el servidor `next dev` mantiene el lock de `.next`. El chequeo TypeScript posterior es limpio.

## Recomendación para el siguiente incremento

Crear primero las migraciones Supabase, tipos generados y RPCs `register_sale`, `register_inventory_entry` y `annul_sale`; después reemplazar el adaptador mock por Route Handlers/Server Actions protegidas con `requireUser`, revalidar las vistas y añadir pruebas de concurrencia de stock y RLS.
