// components/ventas/POSServiceShortcuts.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Wrench } from "lucide-react";

interface POSServiceShortcutsProps {
  onAddService: (name: string, price: number, code: string) => void;
}

export function POSServiceShortcuts({ onAddService }: POSServiceShortcutsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        className="border-border bg-card hover:bg-muted font-medium text-xs"
        onClick={() => onAddService("Mano de Obra: Cambio de Aceite", 15000, "SRV-ACEITE")}
      >
        <Wrench className="mr-1.5 h-3.5 w-3.5 text-primary" /> + Cambio de Aceite ($15.000)
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="border-border bg-card hover:bg-muted font-medium text-xs"
        onClick={() => onAddService("Mano de Obra: Cambio de Pastillas", 20000, "SRV-PASTILLAS")}
      >
        <Wrench className="mr-1.5 h-3.5 w-3.5 text-primary" /> + Cambio de Pastillas ($20.000)
      </Button>
    </div>
  );
}