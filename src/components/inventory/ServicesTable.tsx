// src/components/inventory/ServicesTable.tsx
"use client";

import { useState, useEffect } from "react";
import { Product, UserRole } from "@/types";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Wrench, Edit3, Loader2, Trash2, AlertTriangle, Lock } from "lucide-react";
import { deactivateProduct } from "@/lib/api/products";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/ui/toast";

interface ServicesTableProps {
  services: Product[];
  isLoading: boolean;
  onEditService: (service: Product) => void;
  onSelectService: (service: Product) => void;
  onRefreshCatalog?: () => void;
}

export function ServicesTable({
  services,
  isLoading,
  onEditService,
  onSelectService,
  onRefreshCatalog,
}: ServicesTableProps) {
  const [deactivatingService, setDeactivatingService] = useState<Product | null>(null);
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
    if (!deactivatingService) return;

    if (userRole !== "admin") {
      toast({
        title: "Acceso Denegado",
        description: "Solo el perfil Administrador (admin) tiene permisos para desactivar servicios.",
        type: "error",
      });
      setDeactivatingService(null);
      return;
    }

    setIsDeactivating(true);
    const res = await deactivateProduct(deactivatingService.id);
    setIsDeactivating(false);
    setDeactivatingService(null);

    if (!res.success) {
      toast({ title: "Error al desactivar", description: res.error, type: "error" });
      return;
    }

    toast({
      title: "Servicio Desactivado",
      description: `"${deactivatingService.name}" dejará de aparecer en la terminal POS.`,
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
              <TableHead>Nombre del Servicio</TableHead>
              <TableHead>Categoría de Taller</TableHead>
              <TableHead className="text-right">Precio de Venta</TableHead>
              <TableHead className="text-center">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow className="border-border">
                <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    <span>Cargando servicios de taller...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : services.length === 0 ? (
              <TableRow className="border-border">
                <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                  No se encontraron servicios de taller registrados.
                </TableCell>
              </TableRow>
            ) : (
              services.map((service) => (
                <TableRow key={service.id} className="border-border hover:bg-muted/30 transition-colors">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        <Wrench className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="font-semibold text-foreground text-sm">{service.name}</div>
                        <div className="font-mono text-xs text-muted-foreground mt-0.5">
                          Código: {service.sku}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-muted text-muted-foreground border border-border">
                      {service.category}
                    </span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-bold text-base text-emerald-500">
                    ${service.price.toLocaleString("es-CL")}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        className="font-medium text-xs border-border"
                        onClick={() => onEditService(service)}
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
                        title={isAdmin ? "Desactivar Servicio" : "Restringido: Requiere rol Administrador"}
                        onClick={() => isAdmin && setDeactivatingService(service)}
                      >
                        {!isAdmin ? <Lock className="mr-1 h-3 w-3" /> : <Trash2 className="mr-1 h-3.5 w-3.5" />}
                        Desactivar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="font-medium text-xs"
                        onClick={() => onSelectService(service)}
                      >
                        Detalles
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {deactivatingService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="bg-card border border-border rounded-xl p-6 max-w-md w-full shadow-2xl flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
                <AlertTriangle className="h-6 w-6 shrink-0" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">¿Desactivar Servicio?</h3>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">{deactivatingService.name}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              El servicio dejará de aparecer en el POS pero mantendrá su trazabilidad en ventas pasadas.
            </p>
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <Button variant="ghost" size="sm" onClick={() => setDeactivatingService(null)}>
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