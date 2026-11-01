// app/(dashboard)/page.tsx
"use client";

import { useState, useEffect } from "react";
import { getProducts } from "@/lib/api/products";
import { getDashboardStats, DashboardStats } from "@/lib/api/dashboard";
import { Product } from "@/types";
import {
  TrendingUp,
  AlertTriangle,
  Package,
  DollarSign,
  ArrowUpRight,
  ShoppingCart,
  ShieldCheck,
  Flame,
  Wallet,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    todaySalesTotal: 0,
    todayCashTotal: 0,
    topProductThisWeek: null,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([getProducts(), getDashboardStats()])
      .then(([productsData, statsData]) => {
        if (active) {
          setProducts(productsData);
          setStats(statsData);
        }
      })
      .catch((error) => console.error("Error cargando datos del dashboard:", error))
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // FASE 1: Filtrado estricto de Servicios de Taller en métricas de Inventario Físico
  const physicalProducts = products.filter((p) => !p.is_service);
  const lowStockProducts = physicalProducts.filter((p) => p.stock <= p.min_stock);
  const totalInventoryValue = physicalProducts.reduce((sum, p) => sum + p.price * p.stock, 0);
  const totalPhysicalUnits = physicalProducts.reduce((sum, p) => sum + p.stock, 0);

  return (
    <div className="flex flex-col gap-6">
      {/* Cabecera */}
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

      {/* Tarjetas KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col justify-between p-6 border border-border rounded-xl bg-card text-card-foreground shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Ventas del Día</span>
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold tabular-nums">
              {isLoading ? "..." : `$${stats.todaySalesTotal.toLocaleString("es-CL")}`}
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <span className="text-emerald-500 font-medium flex items-center">
                <ArrowUpRight className="h-3 w-3" /> Transacciones de hoy
              </span>
            </p>
          </div>
        </div>

        <div className="flex flex-col justify-between p-6 border border-border rounded-xl bg-card text-card-foreground shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Unidades Físicas</span>
            <div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold tabular-nums">
              {isLoading ? "..." : totalPhysicalUnits.toLocaleString("es-CL")}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Suma de repuestos físicos en stock (excluye servicios)
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
              {isLoading ? "..." : `${lowStockProducts.length} Repuestos`}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {lowStockProducts.length > 0 ? "Requieren reposición urgente" : "Stock físico en niveles óptimos"}
            </p>
          </div>
        </div>

        <div className="flex flex-col justify-between p-6 border border-border rounded-xl bg-card text-card-foreground shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Bodega Valorizada</span>
            <div className="h-8 w-8 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center">
              <Package className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold tabular-nums">
              {isLoading ? "..." : `$${totalInventoryValue.toLocaleString("es-CL")}`}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Valor total calculado en base a repuestos físicos
            </p>
          </div>
        </div>
      </div>

      {/* Sección Inferior: Alertas y Top Producto */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Atención: Stock Crítico (Repuestos Físicos)</h2>
              <p className="text-xs text-muted-foreground">Repuestos bajo el umbral mínimo en el local.</p>
            </div>
            <Link href="/inventario">
              <Button variant="outline" size="sm">Ver Inventario</Button>
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            {isLoading ? (
              <div className="py-8 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span>Cargando alertas...</span>
              </div>
            ) : lowStockProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center border border-dashed border-border rounded-lg bg-muted/20">
                <ShieldCheck className="h-8 w-8 text-emerald-500 mb-2" />
                <p className="text-sm font-medium text-foreground">¡Todo en orden!</p>
                <p className="text-xs text-muted-foreground mt-0.5">No hay repuestos con quiebre de stock inminente.</p>
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

        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-amber-500" />
              <h2 className="text-lg font-semibold tracking-tight">Top Item de la Semana</h2>
            </div>
            <div className="p-4 rounded-lg bg-muted/30 border border-border/60 flex flex-col gap-1.5">
              {isLoading ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                  <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
                  <span>Consultando estadísticas...</span>
                </div>
              ) : stats.topProductThisWeek ? (
                <>
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-sm">{stats.topProductThisWeek.name}</span>
                    <span className="text-xs font-mono bg-primary/10 text-primary px-2 py-0.5 rounded">
                      {stats.topProductThisWeek.sku}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {stats.topProductThisWeek.quantitySold} unidades vendidas en los últimos 7 días
                  </p>
                </>
              ) : (
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium text-sm text-muted-foreground">Sin ventas esta semana</span>
                  <p className="text-xs text-muted-foreground">Aún no se registran salidas en los últimos 7 días.</p>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-emerald-500" />
              <h2 className="text-sm font-semibold tracking-tight">Efectivo Estimado en Caja</h2>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold tabular-nums text-foreground">
                {isLoading ? "..." : `$${stats.todayCashTotal.toLocaleString("es-CL")}`}
              </span>
              <span className="text-xs text-emerald-500 font-medium">Turno Abierto</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Monto físico acumulado en cajón según transacciones en efectivo del día
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}