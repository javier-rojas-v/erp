// components/ventas/POSCheckoutSuccessModal.tsx
"use client";

import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

interface POSCheckoutSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function POSCheckoutSuccessModal({ isOpen, onClose }: POSCheckoutSuccessModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs">
      <div className="bg-card border border-border rounded-xl p-6 max-w-sm w-full text-center">
        <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-3" />
        <h3 className="text-lg font-bold">¡Venta Registrada con Éxito!</h3>
        <p className="text-sm text-muted-foreground mt-1 mb-4">Transacción finalizada y stock actualizado.</p>
        <Button className="w-full font-semibold" onClick={onClose}>
          Siguiente Venta
        </Button>
      </div>
    </div>
  );
}