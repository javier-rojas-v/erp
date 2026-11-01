// src/components/expenses/CreateExpenseModal.tsx
"use client";

import { useState } from "react";
import { createExpense } from "@/lib/api/expenses";
import { ExpenseCategory } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toast";
import { X, CheckCircle2, Loader2, DollarSign } from "lucide-react";

interface CreateExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  "Arriendo",
  "Servicios Básicos",
  "Sueldos y Comisiones",
  "Herramientas y Insumos",
  "Impuestos y Patentes",
  "Otros Gastos",
];

export function CreateExpenseModal({ isOpen, onClose, onSuccess }: CreateExpenseModalProps) {
  const [category, setCategory] = useState<ExpenseCategory>("Servicios Básicos");
  const [amount, setAmount] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast({
        title: "Monto inválido",
        description: "Ingresa un monto de gasto mayor a 0.",
        type: "warning",
      });
      return;
    }

    setIsSubmitting(true);
    const res = await createExpense({
      category,
      amount: parsedAmount,
      description,
    });
    setIsSubmitting(false);

    if (!res.success) {
      toast({
        title: "Error al registrar gasto",
        description: res.error || "No se pudo guardar el registro de egreso.",
        type: "error",
      });
      return;
    }

    toast({
      title: "Egreso Registrado",
      description: `Gasto por $${parsedAmount.toLocaleString("es-CL")} guardado con éxito.`,
      type: "success",
    });

    setAmount("");
    setDescription("");
    setCategory("Servicios Básicos");
    onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-card w-full max-w-md rounded-xl border border-border shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-border bg-muted/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-red-500" />
            <h3 className="text-lg font-bold">Registrar Egreso Operativo</h3>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          <div>
            <Label htmlFor="exp_category">Categoría del Gasto *</Label>
            <select
              id="exp_category"
              value={category}
              onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
              className="w-full h-9 mt-1 rounded-lg bg-background border border-input text-sm px-3 text-foreground outline-hidden cursor-pointer"
              required
            >
              {EXPENSE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat} className="bg-background text-foreground">
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="exp_amount">Monto del Egreso ($ CLP) *</Label>
            <Input
              id="exp_amount"
              type="number"
              placeholder="Ej: 45000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1 text-lg font-bold"
              required
            />
          </div>

          <div>
            <Label htmlFor="exp_description">Descripción / Motivo</Label>
            <Input
              id="exp_description"
              placeholder="Ej: Pago servicio de luz local comercial"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-border mt-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold"
            >
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-2 h-4 w-4" />
              )}
              Guardar Egreso
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}