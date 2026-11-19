// src/components/expenses/UpdateExpenseModal.tsx
"use client";

import { useState, useEffect } from "react";
import { Expense, ExpenseCategory } from "@/types";
import { updateExpense } from "@/lib/api/expenses";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toast";
import { X, CheckCircle2, Loader2, DollarSign } from "lucide-react";

interface UpdateExpenseModalProps {
  expense: Expense | null;
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

export function UpdateExpenseModal({ expense, isOpen, onClose, onSuccess }: UpdateExpenseModalProps) {
  const [category, setCategory] = useState<ExpenseCategory>("Servicios Básicos");
  const [amount, setAmount] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (expense && isOpen) {
      setCategory(expense.category as ExpenseCategory);
      setAmount(expense.amount.toString());
      setDescription(expense.description || "");
    }
  }, [expense, isOpen]);

  if (!isOpen || !expense) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast({ title: "Monto inválido", description: "El monto debe ser mayor a 0.", type: "warning" });
      return;
    }

    setIsSubmitting(true);
    const res = await updateExpense(expense.id, {
      category,
      amount: parsedAmount,
      description,
    });
    setIsSubmitting(false);

    if (!res.success) {
      toast({ title: "Error al actualizar", description: res.error, type: "error" });
      return;
    }

    toast({ title: "Gasto Actualizado", description: "El registro de egreso fue modificado con éxito.", type: "success" });
    onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-card w-full max-w-md rounded-xl border border-border shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-border bg-muted/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-bold">Editar Gasto Operativo</h3>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          <div>
            <Label htmlFor="edit_exp_category">Categoría del Gasto *</Label>
            <select
              id="edit_exp_category"
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
            <Label htmlFor="edit_exp_amount">Monto ($ CLP) *</Label>
            <Input
              id="edit_exp_amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1 text-lg font-bold"
              required
            />
          </div>
          <div>
            <Label htmlFor="edit_exp_description">Descripción / Motivo</Label>
            <Input
              id="edit_exp_description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1"
            />
          </div>
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-border mt-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
              Guardar Cambios
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}