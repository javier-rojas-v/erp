// components/ventas/CartSummary.tsx
"use client";

import { CartItem } from "@/types";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Minus, Plus, Trash2, Loader2 } from "lucide-react";

interface CartSummaryProps {
  cart: CartItem[];
  paymentMethod: "Efectivo" | "Transferencia" | "Tarjeta";
  isProcessing: boolean;
  onUpdateQuantity: (variantId: string, delta: number) => void;
  onRemoveFromCart: (variantId: string) => void;
  onPaymentMethodChange: (method: "Efectivo" | "Transferencia" | "Tarjeta") => void;
  onCheckout: () => void;
}

export function CartSummary({
  cart,
  paymentMethod,
  isProcessing,
  onUpdateQuantity,
  onRemoveFromCart,
  onPaymentMethodChange,
  onCheckout,
}: CartSummaryProps) {
  const totalAmount = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalItemsCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <div className="flex flex-col rounded-xl border border-border bg-card p-6 shadow-sm sticky top-6">
      <div className="flex items-center justify-between pb-4 border-b border-border">
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold tracking-tight">Ticket de Venta Actual</h2>
        </div>
        <span className="text-xs text-muted-foreground bg-secondary px-2.5 py-1 rounded-md font-mono font-semibold">
          {totalItemsCount} Ítems
        </span>
      </div>

      <div className="flex flex-col gap-3 py-4 max-h-[300px] overflow-y-auto divide-y divide-border/50">
        {cart.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground text-sm">
            La caja está libre. Agrega repuestos o servicios para comenzar.
          </div>
        ) : (
          cart.map((item) => (
            <div key={item.variant_id} className="pt-3 first:pt-0 flex items-center justify-between gap-2">
              <div className="flex flex-col min-w-0 flex-1">
                <span className="font-medium text-sm truncate flex items-center gap-1.5">
                  {item.name}
                  {item.is_service && (
                    <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1.5 py-0.2 rounded uppercase font-bold">
                      Servicio
                    </span>
                  )}
                </span>
                <span className="text-xs text-muted-foreground font-mono">
                  ${item.price.toLocaleString("es-CL")} c/u
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Button variant="outline" size="icon-xs" onClick={() => onUpdateQuantity(item.variant_id, -1)}>
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="text-xs font-semibold w-6 text-center">{item.quantity}</span>
                <Button variant="outline" size="icon-xs" onClick={() => onUpdateQuantity(item.variant_id, 1)}>
                  <Plus className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="text-destructive ml-1"
                  onClick={() => onRemoveFromCart(item.variant_id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="flex flex-col gap-2 py-3 border-t border-border">
        <span className="text-xs font-medium text-muted-foreground">Método de Pago:</span>
        <div className="grid grid-cols-3 gap-2">
          {(["Efectivo", "Transferencia", "Tarjeta"] as const).map((method) => (
            <Button
              key={method}
              variant={paymentMethod === method ? "default" : "outline"}
              size="sm"
              onClick={() => onPaymentMethodChange(method)}
              className="text-xs font-medium"
            >
              {method}
            </Button>
          ))}
        </div>
      </div>

      <div className="pt-4 border-t border-border flex flex-col gap-4">
        <div className="flex justify-between text-xl font-bold">
          <span>Total a Cobrar:</span>
          <span className="text-primary text-2xl font-black">${totalAmount.toLocaleString("es-CL")}</span>
        </div>
        <Button
          className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
          disabled={cart.length === 0 || isProcessing}
          onClick={onCheckout}
        >
          {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Completar Venta ({paymentMethod})
        </Button>
      </div>
    </div>
  );
}