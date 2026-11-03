// src/app/(dashboard)/finanzas/page.tsx
"use client";
/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

import { useState, useEffect, useMemo } from "react";
import { getFinancialSummary, FinancialSummary, DailyTrendPoint } from "@/lib/api/finance";
import { getExpenses } from "@/lib/api/expenses";
import { Expense } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CreateExpenseModal } from "@/components/expenses/CreateExpenseModal";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart,
  Plus,
  Search,
  Calendar,
  Loader2,
  Receipt,
  Wallet,
  ArrowUpRight,
  BarChart3,
} from "lucide-react";

type TimePreset = "today" | "week" | "month" | "custom";

export default function FinanzasPage() {
  const [timePreset, setTimePreset] = useState<TimePreset>("month");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");
  const [financialSummary, setFinancialSummary] = useState<FinancialSummary>({
    totalIncome: 0,
    cogs: 0,
    grossProfit: 0,
    grossMarginPct: 0,
    totalExpenses: 0,
    netProfit: 0,
    netMarginPct: 0,
  });
  const [dailyTrends, setDailyTrends] = useState<DailyTrendPoint[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expenseSearch, setExpenseSearch] = useState("");
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState("ALL");
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);

  // Estandarización de límites de fecha en zona horaria America/Santiago
  const { startDate, endDate } = useMemo(() => {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Santiago",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const parts = formatter.formatToParts(now);
    const year = parseInt(parts.find((p) => p.type === "year")!.value, 10);
    const month = parseInt(parts.find((p) => p.type === "month")!.value, 10) - 1;
    const day = parseInt(parts.find((p) => p.type === "day")!.value, 10);

    let start = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
    let end = new Date(Date.UTC(year, month, day, 23, 59, 59, 999));

    if (timePreset === "today") {
      start = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
    } else if (timePreset === "week") {
      const dayOfWeek = now.getDay();
      const diff = day - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      start = new Date(Date.UTC(year, month, diff, 0, 0, 0, 0));
    } else if (timePreset === "month") {
      start = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
    } else if (timePreset === "custom" && customStartDate && customEndDate) {
      const [sY, sM, sD] = customStartDate.split("-").map(Number);
      const [eY, eM, eD] = customEndDate.split("-").map(Number);
      start = new Date(Date.UTC(sY, sM - 1, sD, 0, 0, 0, 0));
      end = new Date(Date.UTC(eY, eM - 1, eD, 23, 59, 59, 999));
    }

    return { startDate: start, endDate: end };
  }, [timePreset, customStartDate, customEndDate]);

  const loadFinancialData = async () => {
    setIsLoading(true);
    try {
      const [finRes, expRes] = await Promise.all([
        getFinancialSummary(startDate, endDate),
        getExpenses(startDate, endDate),
      ]);
      setFinancialSummary(finRes.summary);
      setDailyTrends(finRes.dailyTrends);
      setExpenses(expRes);
    } catch (error) {
      console.error("Error cargando módulo financiero BI:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFinancialData();
  }, [startDate, endDate]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((exp) => {
      const q = expenseSearch.toLowerCase();
      const matchSearch =
        exp.category.toLowerCase().includes(q) ||
        (exp.description && exp.description.toLowerCase().includes(q)) ||
        exp.cashier_email.toLowerCase().includes(q);
      const matchCategory =
        expenseCategoryFilter === "ALL" ? true : exp.category === expenseCategoryFilter;
      return matchSearch && matchCategory;
    });
  }, [expenses, expenseSearch, expenseCategoryFilter]);

  const formatDateCL = (dateVal: string) => {
    try {
      const d = new Date(dateVal);
      return d.toLocaleString("es-CL", {
        dateStyle: "short",
        timeStyle: "short",
        timeZone: "America/Santiago",
      });
    } catch {
      return dateVal;
    }
  };

  const isPositiveNet = financialSummary.netProfit > 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Finanzas & BI</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Control de márgenes, estado de pérdidas y ganancias (P&L) e inteligencia de negocios.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 bg-card border border-border p-1.5 rounded-xl shadow-xs">
          {(
            [
              { id: "today", label: "Hoy" },
              { id: "week", label: "Esta Semana" },
              { id: "month", label: "Este Mes" },
              { id: "custom", label: "Personalizado" },
            ] as const
          ).map((preset) => (
            <button
              key={preset.id}
              onClick={() => setTimePreset(preset.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                timePreset === preset.id
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {preset.label}
            </button>
          ))}
          {timePreset === "custom" && (
            <div className="flex items-center gap-2 ml-2 pl-2 border-l border-border">
              <Input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="h-8 text-xs bg-background"
              />
              <span className="text-xs text-muted-foreground">a</span>
              <Input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="h-8 text-xs bg-background"
              />
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <div className="flex flex-col justify-between p-5 border border-border rounded-xl bg-card text-card-foreground shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground text-sm font-medium">
            <span>Ingresos Totales ($I$)</span>
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold tabular-nums text-foreground">
              {isLoading ? "..." : `$${financialSummary.totalIncome.toLocaleString("es-CL")}`}
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <span className="text-emerald-500 font-semibold flex items-center">
                <ArrowUpRight className="h-3 w-3" /> Facturación bruta
              </span>
            </p>
          </div>
        </div>

        <div className="flex flex-col justify-between p-5 border border-border rounded-xl bg-card text-card-foreground shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground text-sm font-medium">
            <span>Costo de Ventas (COGS)</span>
            <div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <Receipt className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold tabular-nums text-foreground">
              {isLoading ? "..." : `$${financialSummary.cogs.toLocaleString("es-CL")}`}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Costo ponderado de adquisición de mercadería
            </p>
          </div>
        </div>

        <div className="flex flex-col justify-between p-5 border border-border rounded-xl bg-card text-card-foreground shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground text-sm font-medium">
            <span>Ganancia Bruta ($GB$)</span>
            <div className="h-8 w-8 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold tabular-nums text-foreground">
              {isLoading ? "..." : `$${financialSummary.grossProfit.toLocaleString("es-CL")}`}
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center justify-between">
              <span>Margen Bruto:</span>
              <span className="font-mono font-bold text-purple-400">
                {financialSummary.grossMarginPct.toFixed(1)}%
              </span>
            </p>
          </div>
        </div>

        <div className="flex flex-col justify-between p-5 border border-border rounded-xl bg-card text-card-foreground shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-muted-foreground text-sm font-medium">
            <span>Gastos Operativos ($G$)</span>
            <div className="h-8 w-8 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center">
              <TrendingDown className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold tabular-nums text-red-400">
              {isLoading ? "..." : `$${financialSummary.totalExpenses.toLocaleString("es-CL")}`}
            </div>
            <Button
              size="xs"
              className="mt-2 w-full bg-red-600 hover:bg-red-700 text-white font-semibold text-[11px]"
              onClick={() => setIsExpenseModalOpen(true)}
            >
              <Plus className="mr-1 h-3 w-3" /> Registrar Gasto
            </Button>
          </div>
        </div>

        <div className={`flex flex-col justify-between p-5 border rounded-xl bg-card text-card-foreground shadow-sm ${
          isPositiveNet ? "border-emerald-500/40 bg-emerald-500/5" : "border-red-500/40 bg-red-500/5"
        }`}>
          <div className="flex items-center justify-between text-muted-foreground text-sm font-medium">
            <span>Ganancia Neta ($GN$)</span>
            <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
              isPositiveNet ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
            }`}>
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className={`text-2xl font-black tabular-nums ${
              isPositiveNet ? "text-emerald-400" : "text-red-400"
            }`}>
              {isLoading ? "..." : `$${financialSummary.netProfit.toLocaleString("es-CL")}`}
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center justify-between">
              <span>Margen Neto P&L:</span>
              <span className={`font-mono font-bold ${isPositiveNet ? "text-emerald-400" : "text-red-400"}`}>
                {financialSummary.netMarginPct.toFixed(1)}%
              </span>
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold tracking-tight">Comportamiento Financiero Diario (Hora Chile)</h2>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 inline-block" /> Ingresos ($I$)
            </span>
            <span className="flex items-center gap-1.5 text-blue-400">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-500 inline-block" /> COGS ($C$)
            </span>
            <span className="flex items-center gap-1.5 text-red-400">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500 inline-block" /> Gastos ($G$)
            </span>
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 inline-block" /> Utilidad Neta ($GN$)
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="h-44 flex items-center justify-center text-xs text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2 text-primary" /> Cargando tendencias...
          </div>
        ) : dailyTrends.length === 0 ? (
          <div className="h-44 flex flex-col items-center justify-center border border-dashed border-border rounded-xl bg-muted/20 text-xs text-muted-foreground">
            <PieChart className="h-8 w-8 text-muted-foreground mb-2 opacity-50" />
            <span>No se registran movimientos financieros en el período seleccionado.</span>
          </div>
        ) : (
          <div className="space-y-3 pt-2">
            {dailyTrends.map((pt) => {
              const maxVal = Math.max(pt.income, pt.cogs, pt.expenses, 1);
              const incomeWidth = Math.min(100, Math.round((pt.income / maxVal) * 100));
              const cogsWidth = Math.min(100, Math.round((pt.cogs / maxVal) * 100));
              const expenseWidth = Math.min(100, Math.round((pt.expenses / maxVal) * 100));
              return (
                <div key={pt.date} className="flex flex-col gap-1 p-2.5 rounded-lg bg-muted/30 border border-border/50">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="font-mono text-muted-foreground">{pt.date}</span>
                    <div className="flex items-center gap-3 font-mono text-xs">
                      <span className="text-emerald-400">Ing: +${pt.income.toLocaleString("es-CL")}</span>
                      <span className="text-blue-400">COGS: -${pt.cogs.toLocaleString("es-CL")}</span>
                      <span className="text-red-400">Gastos: -${pt.expenses.toLocaleString("es-CL")}</span>
                      <span className={pt.netProfit >= 0 ? "text-emerald-400 font-extrabold" : "text-red-400 font-extrabold"}>
                        = Net: ${pt.netProfit.toLocaleString("es-CL")}
                      </span>
                    </div>
                  </div>
                  <div className="w-full flex flex-col gap-1 mt-1">
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden flex">
                      <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${incomeWidth}%` }} />
                    </div>
                    {pt.cogs > 0 && (
                      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden flex">
                        <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${cogsWidth}%` }} />
                      </div>
                    )}
                    {pt.expenses > 0 && (
                      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden flex">
                        <div className="h-full bg-red-500 transition-all duration-300" style={{ width: `${expenseWidth}%` }} />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Registro de Gastos Operativos</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Histórico detallado de egresos administrativos y del local.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar gasto o correo..."
                className="pl-9 h-9 bg-background border-border text-xs w-48 sm:w-64"
                value={expenseSearch}
                onChange={(e) => setExpenseSearch(e.target.value)}
              />
            </div>
            <select
              value={expenseCategoryFilter}
              onChange={(e) => setExpenseCategoryFilter(e.target.value)}
              className="h-9 bg-card border border-border rounded-lg text-xs font-semibold px-2 text-foreground outline-hidden cursor-pointer"
            >
              <option value="ALL">Todas las Categorías</option>
              <option value="Arriendo">Arriendo</option>
              <option value="Servicios Básicos">Servicios Básicos</option>
              <option value="Sueldos y Comisiones">Sueldos y Comisiones</option>
              <option value="Herramientas y Insumos">Herramientas y Insumos</option>
              <option value="Impuestos y Patentes">Impuestos y Patentes</option>
              <option value="Otros Gastos">Otros Gastos</option>
            </select>
            <Button
              size="sm"
              className="bg-red-600 hover:bg-red-700 text-white font-semibold text-xs h-9"
              onClick={() => setIsExpenseModalOpen(true)}
            >
              <Plus className="mr-1.5 h-4 w-4" /> Registrar Nuevo Gasto
            </Button>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-background/50 overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow className="border-border">
                <TableHead>Fecha / Hora (CL)</TableHead>
                <TableHead>Categoría de Gasto</TableHead>
                <TableHead>Descripción / Concepto</TableHead>
                <TableHead>Registrado Por</TableHead>
                <TableHead className="text-right">Monto ($ CLP)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow className="border-border">
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto text-primary" />
                  </TableCell>
                </TableRow>
              ) : filteredExpenses.length === 0 ? (
                <TableRow className="border-border">
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                    No se encontraron gastos registrados en este período.
                  </TableCell>
                </TableRow>
              ) : (
                filteredExpenses.map((exp) => (
                  <TableRow key={exp.id} className="border-border hover:bg-muted/30">
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span>{formatDateCL(exp.date)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
                        {exp.category}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm font-medium text-foreground">
                      {exp.description || "Sin descripción"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono">
                      {exp.cashier_email}
                    </TableCell>
                    <TableCell className="text-right font-bold tabular-nums text-red-400 text-base">
                      -${exp.amount.toLocaleString("es-CL")}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <CreateExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        onSuccess={loadFinancialData}
      />
    </div>
  );
}
