"use client";

import { useState } from "react";
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
  Receipt,
  DollarSign,
  CreditCard,
  ArrowLeftRight,
  Lock,
  Search,
  Calendar,
  ShieldAlert,
  Unlock,
  Play,
  RotateCcw,
  AlertCircle,
  CheckCircle2
} from "lucide-react";

interface SaleRecord {
  id: string;              // ID Venta (ej. VEN-1042)
  date: string;
  total: number;
  paymentMethod: 'Efectivo' | 'Transferencia' | 'Tarjeta';
  itemsCount: number;
  cashier: string;
  status: 'COMPLETED' | 'ANNULLED'; // Estado de la transacción
  annulmentRef?: string;          // reference_document del movimiento compensatorio (ADJUSTMENT_IN)
}

export default function HistorialCajaPage() {
  const [salesHistory, setSalesHistory] = useState<SaleRecord[]>([
    {
      id: "VEN-1042",
      date: "Hoy, 16:45",
      total: 36500,
      paymentMethod: "Efectivo",
      itemsCount: 2,
      cashier: "Javier R.",
      status: "COMPLETED",
    },
    {
      id: "VEN-1041",
      date: "Hoy, 15:20",
      total: 15000,
      paymentMethod: "Transferencia",
      itemsCount: 1,
      cashier: "Javier R.",
      status: "COMPLETED",
    },
    {
      id: "VEN-1040",
      date: "Hoy, 11:10",
      total: 64000,
      paymentMethod: "Tarjeta",
      itemsCount: 3,
      cashier: "Javier R.",
      status: "ANNULLED",
      annulmentRef: "ADJ-VEN-1040",
    },
  ]);

  const [searchQuery, setSearchQuery] = useState("");
  const [isClosingModalOpen, setIsClosingModalOpen] = useState(false);
  const [cashCounted, setCashCounted] = useState<string>("");
  const [isRegisterClosed, setIsRegisterClosed] = useState(false);
  const [closedSessionSummary, setClosedSessionSummary] = useState<{
    monto_final_sistema: number;
    monto_final_real: number;
    diferencia: number;
  } | null>(null);

  // Totales considerando solo ventas activas (COMPLETED)
  const activeSales = salesHistory.filter((s) => s.status === "COMPLETED");
  const totalEfectivo = activeSales
    .filter((s) => s.paymentMethod === "Efectivo")
    .reduce((acc, s) => acc + s.total, 0);
  const totalTransferencia = activeSales
    .filter((s) => s.paymentMethod === "Transferencia")
    .reduce((acc, s) => acc + s.total, 0);
  const totalTarjeta = activeSales
    .filter((s) => s.paymentMethod === "Tarjeta")
    .reduce((acc, s) => acc + s.total, 0);
  const totalGeneral = totalEfectivo + totalTransferencia + totalTarjeta;

  const filteredSales = salesHistory.filter(
    (sale) =>
      sale.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sale.paymentMethod.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (sale.annulmentRef && sale.annulmentRef.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // 1. Cierre de Caja y registro de monto_final_real vs monto_final_sistema
  const handleCloseRegister = (e: React.FormEvent) => {
    e.preventDefault();
    const realAmount = parseFloat(cashCounted);
    if (isNaN(realAmount) || realAmount < 0) {
      toast({ title: "Monto inválido", description: "Ingresa un número válido para el conteo físico.", type: "warning" });
      return;
    }

    const diff = realAmount - totalEfectivo;

    setClosedSessionSummary({
      monto_final_sistema: totalEfectivo,
      monto_final_real: realAmount,
      diferencia: diff,
    });

    setIsRegisterClosed(true);
    setIsClosingModalOpen(false);

    toast({
      title: "Caja Cerrada",
      description: diff === 0
        ? "Cierre guardado. Caja totalmente cuadrada."
        : `Cierre guardado con auditación de descuadre ($${diff.toLocaleString("es-CL")}).`,
      type: diff === 0 ? "success" : "warning",
    });
  };

  const handleOpenNewShift = () => {
    setIsRegisterClosed(false);
    setCashCounted("");
    setClosedSessionSummary(null);
  };

  // 2. Anulación compensatoria de venta (Cumpliendo restricción RLS de no borrar filas)
  const handleAnnulSale = (saleId: string) => {
    const target = salesHistory.find((s) => s.id === saleId);
    if (!target) return;

    const adjRef = `ADJ-${saleId}`;

    setSalesHistory((prev) =>
      prev.map((s) =>
        s.id === saleId
          ? { ...s, status: "ANNULLED", annulmentRef: adjRef }
          : s
      )
    );

    toast({
      title: "Venta Anulada",
      description: `Movimiento compensatorio ${adjRef} (ADJUSTMENT_IN) generado.`,
      type: "info",
    });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">Historial y Cierre de Caja</h1>
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${
                isRegisterClosed
                  ? "bg-red-500/10 text-red-500 border-red-500/20"
                  : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
              }`}
            >
              {isRegisterClosed ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
              {isRegisterClosed ? "Caja Cerrada" : "Caja Abierta (Turno Activo)"}
            </span>
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            Auditoría de transacciones, compensaciones de anulación y arqueo diario de caja (`cash_sessions`).
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isRegisterClosed ? (
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              onClick={handleOpenNewShift}
            >
              <Play className="mr-2 h-4 w-4" />
              Iniciar Nuevo Turno
            </Button>
          ) : (
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              onClick={() => {
                setCashCounted(totalEfectivo.toString());
                setIsClosingModalOpen(true);
              }}
            >
              <Lock className="mr-2 h-4 w-4" />
              Realizar Cierre de Caja (Arqueo)
            </Button>
          )}
        </div>
      </div>

      {/* Alerta de Sesión Cerrada y Auditoría */}
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
          <span className={`text-xs font-bold px-3 py-1 rounded-full border ${
            closedSessionSummary.diferencia === 0
              ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
              : "bg-amber-500/10 text-amber-500 border-amber-500/20"
          }`}>
            {closedSessionSummary.diferencia === 0
              ? "Cuadrado Sin Diferencias"
              : `Descuadre Registrado: $${closedSessionSummary.diferencia.toLocaleString("es-CL")}`}
          </span>
        </div>
      )}

      {/* Tarjetas Resumen */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="flex flex-col justify-between p-5 border border-border rounded-xl bg-card text-card-foreground shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground text-sm font-medium">
            <span>Total Ingresos</span>
            <Receipt className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold tabular-nums">${totalGeneral.toLocaleString("es-CL")}</div>
            <p className="text-xs text-muted-foreground mt-0.5">Solo ventas activas (COMPLETED)</p>
          </div>
        </div>

        <div className="flex flex-col justify-between p-5 border border-border rounded-xl bg-card text-card-foreground shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground text-sm font-medium">
            <span>Efectivo (`monto_final_sistema`)</span>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold tabular-nums">${totalEfectivo.toLocaleString("es-CL")}</div>
            <p className="text-xs text-muted-foreground mt-0.5">Esperado en cajón físico</p>
          </div>
        </div>

        <div className="flex flex-col justify-between p-5 border border-border rounded-xl bg-card text-card-foreground shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground text-sm font-medium">
            <span>Transferencias</span>
            <ArrowLeftRight className="h-4 w-4 text-blue-500" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold tabular-nums">${totalTransferencia.toLocaleString("es-CL")}</div>
            <p className="text-xs text-muted-foreground mt-0.5">Comprobante bancario</p>
          </div>
        </div>

        <div className="flex flex-col justify-between p-5 border border-border rounded-xl bg-card text-card-foreground shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground text-sm font-medium">
            <span>Tarjetas (POS)</span>
            <CreditCard className="h-4 w-4 text-purple-500" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold tabular-nums">${totalTarjeta.toLocaleString("es-CL")}</div>
            <p className="text-xs text-muted-foreground mt-0.5">Ventas con tarjeta crédito/débito</p>
          </div>
        </div>
      </div>

      {/* Bitácora de Transacciones con Indicador de Anulados */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-xl font-semibold tracking-tight">Bitácora de Transacciones</h2>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar por ID, método o ref..."
              className="pl-9 bg-background border-border text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="rounded-xl border border-border bg-background/50 backdrop-blur-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="font-semibold">ID Venta</TableHead>
                <TableHead className="font-semibold">Fecha y Hora</TableHead>
                <TableHead className="font-semibold">Método de Pago</TableHead>
                <TableHead className="font-semibold">Cajero</TableHead>
                <TableHead className="text-right font-semibold">Ítems</TableHead>
                <TableHead className="text-right font-semibold">Total</TableHead>
                <TableHead className="text-center font-semibold">Acciones / Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSales.length === 0 ? (
                <TableRow className="border-border">
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    No se encontraron registros de venta.
                  </TableCell>
                </TableRow>
              ) : (
                filteredSales.map((sale) => {
                  const isAnnulled = sale.status === "ANNULLED";

                  return (
                    <TableRow
                      key={sale.id}
                      className={`border-border transition-colors ${
                        isAnnulled ? "bg-destructive/5 hover:bg-destructive/10" : "hover:bg-muted/30"
                      }`}
                    >
                      <TableCell>
                        <span className={`font-mono font-medium ${isAnnulled ? "line-through text-muted-foreground" : "text-foreground"}`}>
                          {sale.id}
                        </span>
                        {isAnnulled && sale.annulmentRef && (
                          <div className="text-[10px] font-mono text-destructive mt-0.5">
                            Ajuste Ref: {sale.annulmentRef}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className={`text-muted-foreground flex items-center gap-1.5 pt-4 text-xs ${isAnnulled ? "line-through" : ""}`}>
                        <Calendar className="h-3.5 w-3.5" /> {sale.date}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center rounded-md bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground">
                          {sale.paymentMethod}
                        </span>
                      </TableCell>
                      <TableCell className={`text-sm ${isAnnulled ? "line-through text-muted-foreground" : ""}`}>
                        {sale.cashier}
                      </TableCell>
                      <TableCell className={`text-right tabular-nums ${isAnnulled ? "line-through text-muted-foreground" : ""}`}>
                        {sale.itemsCount} un.
                      </TableCell>
                      <TableCell className={`text-right tabular-nums font-semibold ${isAnnulled ? "line-through text-muted-foreground" : ""}`}>
                        ${sale.total.toLocaleString("es-CL")}
                      </TableCell>
                      <TableCell className="text-center">
                        {isAnnulled ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-destructive/15 text-destructive border border-destructive/30">
                            Anulada (`ADJUSTMENT_IN`)
                          </span>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleAnnulSale(sale.id)}
                            title="Registra ajuste compensatorio sin borrar el registro"
                          >
                            <RotateCcw className="h-3.5 w-3.5 mr-1" />
                            Anular Venta
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Modal Arqueo de Caja Diario */}
      {isClosingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="bg-card border border-border rounded-xl p-6 max-w-md w-full shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-bold">Arqueo de Caja Diario</h3>
              </div>
              <button
                onClick={() => setIsClosingModalOpen(false)}
                className="text-muted-foreground hover:text-foreground text-sm p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCloseRegister} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">Resumen del Sistema (`cash_sessions`):</span>
                <div className="p-3 rounded-lg bg-muted/40 border border-border flex flex-col gap-1 text-sm">
                  <div className="flex justify-between">
                    <span>Efectivo Esperado (`monto_final_sistema`):</span>
                    <span className="font-mono font-semibold">${totalEfectivo.toLocaleString("es-CL")}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground text-xs">
                    <span>Transferencias + Tarjetas:</span>
                    <span className="font-mono">${(totalTransferencia + totalTarjeta).toLocaleString("es-CL")}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">Conteo Físico de Efectivo ($) (`monto_final_real`)</label>
                <Input
                  type="number"
                  placeholder="Ej: 36500"
                  value={cashCounted}
                  onChange={(e) => setCashCounted(e.target.value)}
                  required
                />
              </div>

              {cashCounted !== "" && (
                <div
                  className={`p-3 rounded-lg border text-sm flex items-center gap-2 ${
                    parseFloat(cashCounted) === totalEfectivo
                      ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                      : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                  }`}
                >
                  <ShieldAlert className="h-4 w-4 shrink-0" />
                  <span>
                    {parseFloat(cashCounted) === totalEfectivo
                      ? "Caja cuadrada sin diferencias."
                      : `Diferencia a registrar en BD: $${(parseFloat(cashCounted) - totalEfectivo).toLocaleString("es-CL")}`}
                  </span>
                </div>
              )}

              <div className="flex flex-row gap-2 pt-2 w-full">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setIsClosingModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                >
                  Confirmar Cierre
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}