"use client";

import { Product } from "@/types";
import type { DashboardMetrics } from "@/lib/data/erp";
import { 
  TrendingUp, 
  AlertTriangle, 
  Package, 
  DollarSign, 
  ArrowUpRight, 
  ShoppingCart, 
  ShieldCheck,
  Flame,
  Wallet
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function DashboardClient({ products, metrics }: { products: Product[]; metrics: DashboardMetrics }) {
  const isLoading = false;
  const salesChange = metrics.salesYesterday === 0
    ? (metrics.salesToday === 0 ? 0 : 100)
    : Math.round(((metrics.salesToday - metrics.salesYesterday) / metrics.salesYesterday) * 100);
  const currency = (amount: number) => `$${amount.toLocaleString("es-CL")}`;

  const totalProductsCount = products.length;
  const lowStockProducts = products.filter((p) => p.stock <= p.min_stock);
  
  const totalInventoryValue = products.reduce((sum, p) => sum + p.price * p.stock, 0);

  return (
    <div className="flex flex-col gap-6">
      {/* Cabecera de Bienvenida */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Centro de Mando</h1>
          <p className="text-muted-foreground mt-1">
            Resumen operativo y financiero en tiempo real para Repuestos TITO.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/ventas">
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 text-sm font-semibold shadow-md">
              <ShoppingCart className="mr-2 h-4 w-4" />
              Nueva Venta en Mesón
            </Button>
          </Link>
        </div>
      </div>

      {/* Tarjetas de Métricas Principales (KPIs) */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        
        <div className="flex flex-col justify-between p-6 border border-border rounded-xl bg-card text-card-foreground shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Ventas del Día</span>
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold tabular-nums">{currency(metrics.salesToday)}</div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <span className="text-emerald-500 font-medium flex items-center">
                <ArrowUpRight className="h-3 w-3" /> {salesChange > 0 ? "+" : ""}{salesChange}%
              </span>{" "}
              vs. ayer
            </p>
          </div>
        </div>

        <div className="flex flex-col justify-between p-6 border border-border rounded-xl bg-card text-card-foreground shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Unidades en inventario</span>
            <div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold tabular-nums">
              {isLoading ? "..." : products.reduce((sum, product) => sum + product.stock, 0).toLocaleString("es-CL")}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Suma de existencias de todas las variantes
            </p>
          </div>
        </div>

        <div className="flex flex-col justify-between p-6 border border-border rounded-xl bg-card text-card-foreground shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Alertas de Stock</span>
            <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${lowStockProducts.length > 0 ? "bg-red-500/10 text-red-500" : "bg-emerald-500/10 text-emerald-500"}`}>
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold tabular-nums">
              {isLoading ? "..." : `${lowStockProducts.length} Productos`}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {lowStockProducts.length > 0 ? "Requieren reposición urgente" : "Stock en niveles óptimos"}
            </p>
          </div>
        </div>

        <div className="flex flex-col justify-between p-6 border border-border rounded-xl bg-card text-card-foreground shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Catálogo Activo</span>
            <div className="h-8 w-8 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center">
              <Package className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold tabular-nums">
              {isLoading ? "..." : `${totalProductsCount} Ítems`}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Valorizado en ${totalInventoryValue.toLocaleString("es-CL")}
            </p>
          </div>
        </div>

      </div>

      {/* Sección Inferior: Stock Crítico y Utilidad Operativa (Reemplazo del ruido técnico) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        <div className="lg:col-span-7 rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Atención: Stock Crítico</h2>
              <p className="text-xs text-muted-foreground">Repuestos bajo el umbral mínimo en el local.</p>
            </div>
            <Link href="/inventario">
              <Button variant="outline" size="sm">Ver Inventario</Button>
            </Link>
          </div>

          <div className="flex flex-col gap-2">
            {isLoading ? (
              <div className="py-8 text-center text-sm text-muted-foreground">Cargando alertas...</div>
            ) : lowStockProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center border border-dashed border-border rounded-lg bg-muted/20">
                <ShieldCheck className="h-8 w-8 text-emerald-500 mb-2" />
                <p className="text-sm font-medium text-foreground">¡Todo en orden!</p>
                <p className="text-xs text-muted-foreground mt-0.5">No hay productos con quiebre de stock inminente.</p>
              </div>
            ) : (
              lowStockProducts.map((product) => (
                <div key={product.id} className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-muted/30">
                  <div className="flex flex-col">
                    <span className="font-medium text-sm">{product.name}</span>
                    <span className="font-mono text-xs text-muted-foreground">{product.sku} • {product.brand}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-red-500/10 text-red-500 border border-red-500/20 tabular-nums">
                      Stock: {product.stock} (Mín: {product.min_stock})
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Panel Operativo Comercial (Sustituye la tarjeta técnica de Docker/API) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-amber-500" />
              <h2 className="text-lg font-semibold tracking-tight">Top Repuesto de la Semana</h2>
            </div>
            <div className="p-4 rounded-lg bg-muted/30 border border-border/60 flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <span className="font-medium text-sm">{metrics.weeklyTopProduct?.name ?? "Sin ventas"}</span>
                <span className="text-xs font-mono bg-primary/10 text-primary px-2 py-0.5 rounded">{metrics.weeklyTopProduct?.sku ?? "—"}</span>
              </div>
              <p className="text-xs text-muted-foreground">{metrics.weeklyTopProduct?.quantity ?? 0} unidades vendidas en los últimos 7 días.</p>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-emerald-500" />
              <h2 className="text-sm font-semibold tracking-tight">Efectivo Estimado en Caja</h2>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold tabular-nums text-foreground">{currency(metrics.cashEstimate)}</span>
              <span className="text-xs text-emerald-500 font-medium">{metrics.hasOpenCash ? "Turno Abierto" : "Sin turno abierto"}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Monto físico acumulado en cajón según transacciones en efectivo del día.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
