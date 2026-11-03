// src/app/(dashboard)/historial/page.tsx
"use client";

import { useState, useEffect } from "react";
import { getActiveCashSession, closeCashSession, openCashSession, CashSession } from "@/lib/api/cash";
import { getTodaySales, TodaySaleRow } from "@/lib/api/transactions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/components/ui/toast";
import { 
  Lock, Unlock, Play, Loader2, ShieldAlert, 
  Receipt, DollarSign, ArrowLeftRight, CreditCard,
  Search, Calendar, CheckCircle2, AlertCircle
} from "lucide-react";

export default function HistorialCajaPage() {
  const [activeSession, setActiveSession] = useState<CashSession | null>(null);
  const [salesHistory, setSalesHistory] = useState<TodaySaleRow[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isClosingModalOpen, setIsClosingModalOpen] = useState(false);
  const [cashCounted, setCashCounted] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [closedSessionSummary, setClosedSessionSummary] = useState<{
    monto_final_sistema: number;
    monto_final_real: number;
    diferencia: number;
  } | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    const [sess, sales] = await Promise.all([
      getActiveCashSession(),
      getTodaySales(),
    ]);
    setActiveSession(sess);
    setSalesHistory(sales);
    setIsLoading(false);
  };

  useEffect(() => {
    const timer = window.setTimeout(() => void loadData(), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const activeSales = salesHistory.filter((s) => s.status === "COMPLETED");
  const totalEfectivo = activeSales.filter((s) => s.paymentMethod === "Efectivo").reduce((acc, s) => acc + s.total, 0);
  const totalTransferencia = activeSales.filter((s) => s.paymentMethod === "Transferencia").reduce((acc, s) => acc + s.total, 0);
  const totalTarjeta = activeSales.filter((s) => s.paymentMethod === "Tarjeta").reduce((acc, s) => acc + s.total, 0);
  const totalGeneral = totalEfectivo + totalTransferencia + totalTarjeta;

  const formatDateCL = (dateVal: string | undefined) => {
    if (!dateVal) return "N/D";
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return dateVal;
      return d.toLocaleString("es-CL", {
        dateStyle: "short",
        timeStyle: "medium",
        timeZone: "America/Santiago",
      });
    } catch {
      return dateVal;
    }
  };

  const filteredSales = salesHistory.filter((sale) => {
    const q = searchQuery.toLowerCase();
    const formattedId = sale.id ? `VEN-${sale.id.slice(0, 8).toUpperCase()}` : "";
    return (
      sale.id?.toLowerCase().includes(q) ||
      formattedId.toLowerCase().includes(q) ||
      sale.paymentMethod?.toLowerCase().includes(q) ||
      sale.cashier?.toLowerCase().includes(q)
    );
  });

  const handleOpenShift = async () => {
    setIsSubmitting(true);
    const res = await openCashSession(0);
    setIsSubmitting(false);
    if (!res.success) {
      toast({ title: "Error", description: "No se pudo abrir la caja.", type: "error" });
      return;
    }
    toast({ title: "Caja Abierta", description: "Turno iniciado correctamente.", type: "success" });
    setClosedSessionSummary(null);
    loadData();
  };

  const handleCloseShiftSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSession) return;
    const realAmount = parseFloat(cashCounted);
    if (isNaN(realAmount) || realAmount < 0) {
      toast({ title: "Monto inválido", description: "Ingresa el conteo físico correcto.", type: "warning" });
      return;
    }
    setIsSubmitting(true);
    const diff = realAmount - totalEfectivo;
    const res = await closeCashSession(activeSession.id, totalEfectivo, realAmount);
    setIsSubmitting(false);
    if (!res.success) {
      toast({ title: "Error al cerrar", description: res.error, type: "error" });
      return;
    }
    setClosedSessionSummary({ monto_final_sistema: totalEfectivo, monto_final_real: realAmount, diferencia: diff });
    toast({ 
      title: "Caja Cerrada", 
      description: diff === 0 ? "Caja totalmente cuadrada." : `Cierre con descuadre ($${diff.toLocaleString("es-CL")}).`,
      type: diff === 0 ? "success" : "warning" 
    });
    setIsClosingModalOpen(false);
    setCashCounted("");
    loadData();
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">Historial y Cierre de Caja</h1>
            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${activeSession ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-red-500/10 text-red-500 border-red-500/20"}`}>
              {activeSession ? <Unlock className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
              {activeSession ? "Caja Abierta (Turno Activo)" : "Caja Cerrada"}
            </span>
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            Auditoría de transacciones en mesón y arqueo de caja diario para control financiero.
          </p>
        </div>
        <div>
          {activeSession ? (
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold" onClick={() => {
              setCashCounted(totalEfectivo.toString());
              setIsClosingModalOpen(true);
            }}>
              <Lock className="mr-2 h-4 w-4" /> Realizar Cierre de Caja (Arqueo)
            </Button>
          ) : (
            <Button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold" onClick={handleOpenShift} disabled={isSubmitting}>
              <Play className="mr-2 h-4 w-4" /> Iniciar Nuevo Turno
            </Button>
          )}
        </div>
      </div>

      {closedSessionSummary && (
        <div className="p-4 rounded-xl border border-border bg-card shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${closedSessionSummary.diferencia === 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"}`}>
              {closedSessionSummary.diferencia === 0 ? <CheckCircle2 className="h-6 w-6" /> : <AlertCircle className="h-6 w-6" />}
            </div>
            <div>
              <h4 className="font-bold text-sm">Resumen Auditoría de Cierre Anterior</h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Esperado: <span className="font-mono font-semibold text-foreground">${closedSessionSummary.monto_final_sistema.toLocaleString("es-CL")}</span> | 
                Físico: <span className="font-mono font-semibold text-foreground">${closedSessionSummary.monto_final_real.toLocaleString("es-CL")}</span>
              </p>
            </div>
          </div>
          <span className={`text-xs font-bold px-3 py-1 rounded-full border ${closedSessionSummary.diferencia === 0 ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-amber-500/10 text-amber-500 border-amber-500/20"}`}>
            {closedSessionSummary.diferencia === 0 ? "Cuadrado Sin Diferencias" : `Descuadre Registrado: $${closedSessionSummary.diferencia.toLocaleString("es-CL")}`}
          </span>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <div className="flex flex-col justify-between p-5 border border-border rounded-xl bg-card text-card-foreground shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground text-sm font-medium">
            <span>Total Ingresos</span>
            <Receipt className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold tabular-nums">${totalGeneral.toLocaleString("es-CL")}</div>
            <p className="text-xs text-muted-foreground mt-0.5">Todas las formas de pago</p>
          </div>
        </div>
        <div className="flex flex-col justify-between p-5 border border-border rounded-xl bg-card text-card-foreground shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground text-sm font-medium">
            <span>Efectivo (Caja)</span>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold tabular-nums">${totalEfectivo.toLocaleString("es-CL")}</div>
            <p className="text-xs text-muted-foreground mt-0.5">Dinero físico esperado</p>
          </div>
        </div>
        <div className="flex flex-col justify-between p-5 border border-border rounded-xl bg-card text-card-foreground shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground text-sm font-medium">
            <span>Transferencias</span>
            <ArrowLeftRight className="h-4 w-4 text-blue-500" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold tabular-nums">${totalTransferencia.toLocaleString("es-CL")}</div>
            <p className="text-xs text-muted-foreground mt-0.5">Validado por comprobante</p>
          </div>
        </div>
        <div className="flex flex-col justify-between p-5 border border-border rounded-xl bg-card text-card-foreground shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground text-sm font-medium">
            <span>Tarjetas (POS)</span>
            <CreditCard className="h-4 w-4 text-purple-500" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold tabular-nums">${totalTarjeta.toLocaleString("es-CL")}</div>
            <p className="text-xs text-muted-foreground mt-0.5">Ventas con tarjeta</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-xl font-semibold tracking-tight">Bitácora de Transacciones</h2>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar por ID o método..."
              className="pl-9 bg-background border-border text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="rounded-xl border border-border bg-background/50 overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow className="border-border">
                <TableHead>ID Venta</TableHead>
                <TableHead>Fecha y Hora</TableHead>
                <TableHead>Método de Pago</TableHead>
                <TableHead>Cajero</TableHead>
                <TableHead className="text-right">Ítems</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow className="border-border">
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto text-primary" />
                  </TableCell>
                </TableRow>
              ) : filteredSales.length === 0 ? (
                <TableRow className="border-border">
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    No se encontraron registros de ventas hoy.
                  </TableCell>
                </TableRow>
              ) : (
                filteredSales.map((sale) => (
                  <TableRow key={sale.id} className="border-border hover:bg-muted/30">
                    <TableCell className="font-mono text-sm font-bold">
                      VEN-{sale.id ? sale.id.slice(0, 8).toUpperCase() : "00000000"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5 font-mono">
                        <Calendar className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span>{formatDateCL(sale.created_at || sale.date)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center rounded-md bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground">
                        {sale.paymentMethod}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">{sale.cashier}</TableCell>
                    <TableCell className="text-right font-bold tabular-nums">{sale.itemsCount} un.</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums text-foreground">
                      ${sale.total.toLocaleString("es-CL")}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {isClosingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="bg-card border border-border rounded-xl p-6 max-w-md w-full shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-bold">Arqueo de Caja Diario</h3>
              </div>
            </div>

            <form onSubmit={handleCloseShiftSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">Resumen del Sistema:</span>
                <div className="p-3 rounded-lg bg-muted/40 border border-border flex flex-col gap-1 text-sm">
                  <div className="flex justify-between">
                    <span>Efectivo Esperado:</span>
                    <span className="font-mono font-semibold">${totalEfectivo.toLocaleString("es-CL")}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground text-xs">
                    <span>Transferencias + Tarjetas:</span>
                    <span className="font-mono">${(totalTransferencia + totalTarjeta).toLocaleString("es-CL")}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">Conteo Físico de Efectivo ($)</label>
                <Input
                  type="number"
                  placeholder="Ej: 36500"
                  value={cashCounted}
                  onChange={(e) => setCashCounted(e.target.value)}
                  required
                />
              </div>

              {cashCounted !== "" && (
                <div className={`p-3 rounded-lg border text-sm flex items-center gap-2 ${parseFloat(cashCounted) === totalEfectivo ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-amber-500/10 text-amber-500 border-amber-500/20"}`}>
                  <ShieldAlert className="h-4 w-4 shrink-0" />
                  <span>
                    {parseFloat(cashCounted) === totalEfectivo
                      ? "Caja cuadrada sin diferencias."
                      : `Diferencia a registrar: $${(parseFloat(cashCounted) - totalEfectivo).toLocaleString("es-CL")}`}
                  </span>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setIsClosingModalOpen(false)}>Cancelar</Button>
                <Button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold" disabled={isSubmitting}>
                  {isSubmitting ? "Procesando..." : "Confirmar Cierre"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
