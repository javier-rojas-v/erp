// src/components/inventory/InventoryTable.tsx
"use client";

import { useState, useEffect } from "react";
import { Product, UserRole } from "@/types";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tag, AlertTriangle, Loader2, Edit3, Trash2, Lock } from "lucide-react";
import { deactivateProduct } from "@/lib/api/products";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/ui/toast";

interface InventoryTableProps {
  products: Product[];
  isLoading: boolean;
  onSelectProduct: (product: Product) => void;
  onEditProduct: (product: Product) => void;
  onRefreshCatalog?: () => void;
}

export function InventoryTable({
  products,
  isLoading,
  onSelectProduct,
  onEditProduct,
  onRefreshCatalog,
}: InventoryTableProps) {
  const [deactivatingProduct, setDeactivatingProduct] = useState<Product | null>(null);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [userRole, setUserRole] = useState<UserRole | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle()
          .then(({ data }) => {
            setUserRole((data?.role as UserRole) || "manager");
          });
      }
    });
  }, []);

  const handleConfirmDeactivate = async () => {
    if (!deactivatingProduct) return;

    if (userRole !== "admin") {
      toast({
        title: "Acceso Denegado",
        description: "Solo el perfil Administrador (admin) tiene permisos para desactivar repuestos.",
        type: "error",
      });
      setDeactivatingProduct(null);
      return;
    }

    setIsDeactivating(true);
    const res = await deactivateProduct(deactivatingProduct.id);
    setIsDeactivating(false);
    setDeactivatingProduct(null);

    if (!res.success) {
      toast({ title: "Error al desactivar", description: res.error, type: "error" });
      return;
    }

    toast({
      title: "Repuesto Desactivado",
      description: `"${deactivatingProduct.name}" no estará disponible en el POS, pero conserva trazabilidad en ventas pasadas.`,
      type: "success",
    });
    if (onRefreshCatalog) onRefreshCatalog();
  };

  const isAdmin = userRole === "admin";

  return (
    <>
      <div className="rounded-xl border border-border bg-card/50 backdrop-blur-xs overflow-hidden shadow-xs">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow className="border-border">
              <TableHead>SKU / N° Parte OEM</TableHead>
              <TableHead>Producto y Categoría</TableHead>
              <TableHead>Marca</TableHead>
              <TableHead className="text-right">Precio Venta</TableHead>
              <TableHead className="text-right">Stock Disponible</TableHead>
              <TableHead className="text-center">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow className="border-border">
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    <span>Cargando catálogo actualizado...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : products.length === 0 ? (
              <TableRow className="border-border">
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  No se encontraron repuestos registrados.
                </TableCell>
              </TableRow>
            ) : (
              products.map((product) => {
                const isLowStock = product.stock <= product.min_stock;
                const isOutOfStock = product.stock === 0;
                return (
                  <TableRow key={product.id} className="border-border hover:bg-muted/30 transition-colors">
                    <TableCell>
                      <div className="font-mono text-sm font-bold text-primary">{product.sku}</div>
                      <div className="text-xs text-muted-foreground mt-0.5 font-mono">
                        OEM: {product.part_number_factory || "S/I"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold text-foreground text-sm">{product.name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{product.category}</div>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wide bg-primary/10 text-primary border border-primary/20">
                        <Tag className="h-3 w-3" />
                        {product.brand}
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-bold text-base">
                      ${product.price.toLocaleString("es-CL")}
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold tabular-nums ${
                          isOutOfStock
                            ? "bg-muted text-muted-foreground border border-border"
                            : isLowStock
                            ? "bg-red-500/10 text-red-500 border border-red-500/20"
                            : "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                        }`}
                      >
                        {isLowStock && !isOutOfStock && <AlertTriangle className="h-3 w-3 shrink-0" />}
                        {product.stock} un.
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          className="font-medium text-xs border-border"
                          onClick={() => onEditProduct(product)}
                        >
                          <Edit3 className="mr-1.5 h-3.5 w-3.5 text-primary" />
                          Editar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={!isAdmin}
                          className={`font-medium text-xs ${
                            isAdmin
                              ? "text-amber-500 hover:text-amber-600 hover:bg-amber-500/10"
                              : "text-muted-foreground/40 cursor-not-allowed hover:bg-transparent opacity-60"
                          }`}
                          title={isAdmin ? "Desactivar Ficha (Baja Lógica)" : "Restringido: Requiere rol Administrador"}
                          onClick={() => isAdmin && setDeactivatingProduct(product)}
                        >
                          {!isAdmin ? <Lock className="mr-1 h-3 w-3" /> : <Trash2 className="mr-1 h-3.5 w-3.5" />}
                          Desactivar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="font-medium text-xs"
                          onClick={() => onSelectProduct(product)}
                        >
                          Ver Detalles
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {deactivatingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="bg-card border border-border rounded-xl p-6 max-w-md w-full shadow-2xl flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
                <AlertTriangle className="h-6 w-6 shrink-0" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">¿Desactivar Repuesto?</h3>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">
                  {deactivatingProduct.sku} - {deactivatingProduct.name}
                </p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              El repuesto dejará de aparecer en la terminal POS pero mantendrá su trazabilidad en ventas pasadas.
            </p>
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <Button variant="ghost" size="sm" onClick={() => setDeactivatingProduct(null)}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="bg-amber-600 hover:bg-amber-700 text-white font-semibold"
                disabled={isDeactivating}
                onClick={handleConfirmDeactivate}
              >
                {isDeactivating ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
                Confirmar Desactivación
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}