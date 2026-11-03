// src/app/(dashboard)/auditoria/page.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { getAuditLogs } from "@/lib/api/audit";
import { AuditLog } from "@/types";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  ShieldAlert,
  Search,
  Calendar,
  Loader2,
  Unlock,
  Lock,
  AlertTriangle,
  Package,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";

export default function AuditoriaPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [eventTypeFilter, setEventTypeFilter] = useState("ALL");

  const loadAuditData = async () => {
    setIsLoading(true);
    try {
      const data = await getAuditLogs(150);
      setLogs(data);
    } catch (error) {
      console.error("Error al obtener logs de auditoría:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => void loadAuditData(), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const q = searchQuery.toLowerCase();
      const matchSearch =
        log.description.toLowerCase().includes(q) ||
        log.cashier_email.toLowerCase().includes(q) ||
        log.event_type.toLowerCase().includes(q);

      const matchType = eventTypeFilter === "ALL" ? true : log.event_type === eventTypeFilter;

      return matchSearch && matchType;
    });
  }, [logs, searchQuery, eventTypeFilter]);

  const formatDateCL = (dateVal: string) => {
    try {
      const d = new Date(dateVal);
      return d.toLocaleString("es-CL", {
        dateStyle: "short",
        timeStyle: "medium",
        timeZone: "America/Santiago",
      });
    } catch {
      return dateVal;
    }
  };

  const renderBadge = (eventType: AuditLog["event_type"]) => {
    switch (eventType) {
      case "CASH_OPEN":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Unlock className="h-3 w-3" /> Apertura Caja
          </span>
        );
      case "CASH_CLOSE":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Lock className="h-3 w-3" /> Cierre Cuadrado
          </span>
        );
      case "DISCREPANCY":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-500/15 text-red-500 border border-red-500/30 animate-pulse">
            <AlertTriangle className="h-3 w-3" /> Descuadre
          </span>
        );
      case "STOCK_ENTRY":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Package className="h-3 w-3" /> Entrada Stock
          </span>
        );
      case "SYSTEM_ALERT":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <ShieldAlert className="h-3 w-3" /> Alerta Sistema
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
            Evento
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">Auditoría & Logs Históricos</h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
              <ShieldCheck className="h-3.5 w-3.5" /> Monitoreo Forense
            </span>
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            Trazabilidad completa de arqueos, aperturas, descuadres de caja y recepciones de stock.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadAuditData} disabled={isLoading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} /> Actualizar Bitácora
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card p-4 rounded-xl border border-border shadow-xs">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar evento por descripción o cajero..."
            className="pl-9 h-10 bg-background border-border text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <select
          value={eventTypeFilter}
          onChange={(e) => setEventTypeFilter(e.target.value)}
          className="h-10 bg-background border border-border rounded-lg text-xs font-semibold px-3 text-foreground outline-hidden cursor-pointer"
        >
          <option value="ALL">Todos los Eventos de Auditoría</option>
          <option value="DISCREPANCY">Solo Descuadres de Caja</option>
          <option value="CASH_OPEN">Solo Aperturas de Caja</option>
          <option value="CASH_CLOSE">Solo Cierres Cuadrados</option>
          <option value="STOCK_ENTRY">Solo Entradas de Stock</option>
          <option value="SYSTEM_ALERT">Solo Alertas del Sistema</option>
        </select>
      </div>

      <div className="rounded-xl border border-border bg-background/50 overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow className="border-border">
              <TableHead>Fecha y Hora (CL)</TableHead>
              <TableHead>Tipo de Evento</TableHead>
              <TableHead>Detalle / Descripción Registrada</TableHead>
              <TableHead className="text-right">Usuario / Responsable</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow className="border-border">
                <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto text-primary" />
                </TableCell>
              </TableRow>
            ) : filteredLogs.length === 0 ? (
              <TableRow className="border-border">
                <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                  No se encontraron registros de auditoría asociados a los filtros.
                </TableCell>
              </TableRow>
            ) : (
              filteredLogs.map((log) => {
                const isDiscrepancy = log.event_type === "DISCREPANCY";
                return (
                  <TableRow
                    key={log.id}
                    className={`border-border hover:bg-muted/30 transition-colors ${
                      isDiscrepancy ? "bg-red-500/5 hover:bg-red-500/10" : ""
                    }`}
                  >
                    <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span>{formatDateCL(log.created_at)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{renderBadge(log.event_type)}</TableCell>
                    <TableCell className="text-sm font-medium text-foreground max-w-xl">
                      <span className={isDiscrepancy ? "text-red-400 font-semibold" : ""}>
                        {log.description}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-muted-foreground whitespace-nowrap">
                      {log.cashier_email}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
