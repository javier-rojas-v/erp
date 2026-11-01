// components/inventory/ServicesTable.tsx
"use client";

import { Product } from "@/types";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Wrench, Edit3, Loader2 } from "lucide-react";

interface ServicesTableProps {
  services: Product[];
  isLoading: boolean;
  onEditService: (service: Product) => void;
  onSelectService: (service: Product) => void;
}

export function ServicesTable({ services, isLoading, onEditService, onSelectService }: ServicesTableProps) {
  return (
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
  );
}