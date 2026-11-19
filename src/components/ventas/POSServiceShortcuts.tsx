// components/ventas/POSServiceShortcuts.tsx
"use client";

import { Product } from "@/types";
import { Button } from "@/components/ui/button";
import { Wrench, PlusCircle, ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";

interface POSServiceShortcutsProps {
  services: Product[];
  isLoading?: boolean;
  onAddService: (service: Product) => void;
}

export function POSServiceShortcuts({
  services,
  isLoading = false,
  onAddService,
}: POSServiceShortcutsProps) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        <span>Cargando servicios de taller dinámicos...</span>
      </div>
    );
  }

  if (services.length === 0) {
    return (
      <div className="flex items-center justify-between p-3 rounded-lg border border-dashed border-border bg-muted/20 text-xs">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Wrench className="h-4 w-4 text-primary" />
          <span>No hay servicios de taller registrados en la base de datos.</span>
        </div>
        <Link
          href="/inventario"
          className="text-primary font-semibold hover:underline flex items-center gap-1"
        >
          <span>Crear Servicios</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
        <Wrench className="h-3.5 w-3.5 text-primary" /> Servicios de Taller Rápidos
      </span>
      <div className="flex flex-wrap items-center gap-2">
        {services.map((service) => (
          <Button
            key={service.id}
            variant="outline"
            size="sm"
            className="border-border bg-card hover:bg-muted font-medium text-xs shadow-xs"
            onClick={() => onAddService(service)}
          >
            <PlusCircle className="mr-1.5 h-3.5 w-3.5 text-blue-400" />
            {service.name} (${service.price.toLocaleString("es-CL")})
          </Button>
        ))}
      </div>
    </div>
  );
}