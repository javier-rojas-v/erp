// components/inventory/ProductDetailDrawer.tsx
"use client";

import { useEffect, useState } from "react";
import { Product } from "@/types";
import { getProductKardex, InventoryTransactionRow } from "@/lib/api/products";
import { Button } from "@/components/ui/button";
import { X, Box, History, DollarSign, Layers, AlertTriangle, Barcode, Tag, Wrench, Loader2 } from "lucide-react";

interface ProductDetailDrawerProps {
  product: Product | null;
  onClose: () => void;
}

export function ProductDetailDrawer({ product, onClose }: ProductDetailDrawerProps) {
  const [activeTab, setActiveTab] = useState<"info" | "kardex">("info");
  const [kardexList, setKardexList] = useState<InventoryTransactionRow[]>([]);
  const [isLoadingKardex, setIsLoadingKardex] = useState(false);

  useEffect(() => {
    if (product && activeTab === "kardex") {
      setIsLoadingKardex(true);
      getProductKardex(product.id)
        .then((txs) => setKardexList(txs))
        .finally(() => setIsLoadingKardex(false));
    }
  }, [product, activeTab]);

  if (!product) return null;

  const isService = Boolean(product.is_service);

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 transition-opacity" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 w-full md:w-[580px] bg-card shadow-2xl border-l border-border flex flex-col animate-in slide-in-from-right-full duration-300">
        
        {/* Cabecera Polimórfica */}
        <div className="flex items-center justify-between p-6 border-b border-border bg-muted/20">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              {isService ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-bold uppercase bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <Wrench className="h-3 w-3" /> Servicio de Taller
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-bold uppercase bg-primary/10 text-primary border border-primary/20">
                  <Tag className="h-3 w-3" />
                  {product.brand}
                </span>
              )}
              
              <span className="font-mono text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded border border-border">
                Código: {product.sku}
              </span>
            </div>
            <h2 className="text-xl font-bold leading-tight">{product.name}</h2>
          </div>
          
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Navegación por Pestañas */}
        <div className="flex items-center px-6 border-b border-border bg-background">
          {[
            { id: "info", icon: Box, label: isService ? "Ficha de Servicio" : "Ficha Comercial" },
            { id: "kardex", icon: History, label: "Historial de Ventas / Movimientos" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as "info" | "kardex")}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon className="h-4 w-4" /> {tab.label}
            </button>
          ))}
        </div>

        {/* Contenido Principal */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === "info" && (
            <div className="space-y-6">
              
              {/* Tarjetas Superiores */}
              {isService ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-muted/30 border border-border flex flex-col justify-between">
                    <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                      <DollarSign className="h-3.5 w-3.5 text-emerald-500" /> Precio Venta Público
                    </span>
                    <p className="text-2xl font-black text-emerald-500 mt-2 tabular-nums">
                      ${product.price.toLocaleString("es-CL")}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 flex flex-col justify-between">
                    <span className="text-xs text-blue-400 font-medium flex items-center gap-1">
                      <Wrench className="h-3.5 w-3.5" /> Disponibilidad
                    </span>
                    <div className="flex items-baseline gap-2 mt-2">
                      <span className="text-lg font-bold text-foreground">Ilimitada</span>
                      <span className="text-xs text-muted-foreground">(Sin Stock Físico)</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-muted/30 border border-border flex flex-col justify-between">
                    <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                      <DollarSign className="h-3.5 w-3.5 text-primary" /> Precio Venta Público
                    </span>
                    <p className="text-2xl font-black text-foreground mt-2 tabular-nums">
                      ${product.price.toLocaleString("es-CL")}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-muted/30 border border-border flex flex-col justify-between">
                    <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                      <Layers className="h-3.5 w-3.5 text-blue-500" /> Stock Disponible
                    </span>
                    <div className="flex items-baseline gap-2 mt-2">
                      <span className="text-2xl font-black text-foreground tabular-nums">{product.stock}</span>
                      <span className="text-xs text-muted-foreground">unidades</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Indicador de Estado (Solo para Repuestos Físicos) */}
              {!isService && (
                <div
                  className={`p-4 rounded-xl border flex items-center gap-3 ${
                    product.stock === 0
                      ? "bg-red-500/10 border-red-500/20 text-red-500"
                      : product.stock <= product.min_stock
                      ? "bg-amber-500/10 border-amber-500/20 text-amber-500"
                      : "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                  }`}
                >
                  <AlertTriangle className="h-5 w-5 shrink-0" />
                  <div className="flex flex-col text-xs">
                    <span className="font-bold">
                      {product.stock === 0
                        ? "Repuesto Agotado"
                        : product.stock <= product.min_stock
                        ? "Alerta: Stock Crítico"
                        : "Stock en Nivel Óptimo"}
                    </span>
                    <span className="opacity-90">Mínimo sugerido de seguridad: {product.min_stock} unidades.</span>
                  </div>
                </div>
              )}

              {/* Ficha Informativa Estandarizada */}
              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border pb-2">
                  {isService ? "Detalles del Servicio de Taller" : "Detalles Técnicos e Identificación"}
                </h4>

                <div className="grid grid-cols-2 gap-y-3 text-xs">
                  <div>
                    <span className="text-muted-foreground block">Categoría Estandarizada:</span>
                    <span className="font-semibold text-foreground">{product.category}</span>
                  </div>

                  <div>
                    <span className="text-muted-foreground block">
                      {isService ? "Proveedor / Responsable:" : "Marca Comercial:"}
                    </span>
                    <span className="font-semibold text-foreground">{product.brand || "Taller TITO"}</span>
                  </div>

                  {!isService && (
                    <>
                      <div>
                        <span className="text-muted-foreground block">Código OEM (Fabricante):</span>
                        <span className="font-mono font-semibold text-foreground">
                          {product.part_number_factory || "No especificado"}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Código de Barras (EAN):</span>
                        <span className="font-mono font-semibold text-foreground flex items-center gap-1 mt-0.5">
                          <Barcode className="h-3.5 w-3.5 text-muted-foreground" />
                          {product.barcode || "Sin código de barras"}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Historial / Kardex */}
          {activeTab === "kardex" && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                {isService ? "Bitácora de Prestaciones y Ventas" : "Bitácora de Entradas y Salidas"}
              </h4>

              {isLoadingKardex ? (
                <div className="flex items-center justify-center gap-2 py-10 text-xs text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span>Cargando registro de transacciones...</span>
                </div>
              ) : kardexList.length === 0 ? (
                <div className="p-6 rounded-xl border border-border bg-muted/20 text-xs text-center text-muted-foreground">
                  No se registran ventas ni prestaciones asociadas.
                </div>
              ) : (
                <div className="space-y-2">
                  {kardexList.map((tx) => {
                    const isEntry = tx.type === "PURCHASE_IN" || tx.type === "ADJUSTMENT_IN" || tx.type === "INITIAL_STOCK";
                    const typeLabel =
                      tx.type === "PURCHASE_IN"
                        ? "Entrada por Reabastecimiento"
                        : tx.type === "SALE_OUT"
                        ? "Venta en Mesón"
                        : tx.type === "ADJUSTMENT_IN"
                        ? "Ingreso de Carga Masiva / Ajuste"
                        : "Ajuste de Stock";

                    return (
                      <div key={tx.id} className="p-3 rounded-lg border border-border bg-muted/20 flex items-center justify-between text-xs">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-bold text-foreground">{typeLabel}</span>
                          <span className="text-muted-foreground text-[11px]">Doc: {tx.reference_document || "Sin ref."}</span>
                          <span className="text-[10px] text-muted-foreground">Por: {tx.cashier_email}</span>
                        </div>
                        <div className="text-right">
                          <span className={`font-mono font-extrabold text-sm ${isEntry ? "text-emerald-500" : "text-red-500"}`}>
                            {isEntry ? `+${tx.quantity}` : `-${tx.quantity}`} un.
                          </span>
                          <div className="text-[10px] text-muted-foreground mt-0.5">
                            {new Date(tx.created_at).toLocaleString("es-CL", { dateStyle: "short", timeStyle: "short" })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}