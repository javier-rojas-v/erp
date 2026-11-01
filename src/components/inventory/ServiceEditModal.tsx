// components/inventory/ServiceEditModal.tsx
"use client";

import { useState, useEffect } from "react";
import { Product } from "@/types";
import { updateProduct } from "@/lib/api/products";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toast";
import { X, CheckCircle2, Loader2, Wrench } from "lucide-react";

interface ServiceEditModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ServiceEditModal({ product, isOpen, onClose, onSuccess }: ServiceEditModalProps) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Mano de Obra / Servicios");
  const [price, setPrice] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (product) {
      setName(product.name || "");
      setCategory(product.category || "Mano de Obra / Servicios");
      setPrice(product.price ? product.price.toString() : "0");
    }
  }, [product]);

  if (!isOpen || !product) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({ title: "Campo requerido", description: "El nombre no puede estar vacío.", type: "warning" });
      return;
    }
    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum < 0) {
      toast({ title: "Precio inválido", description: "Ingresa un monto válido.", type: "warning" });
      return;
    }

    setIsUpdating(true);
    const res = await updateProduct(product.id, {
      name: name,
      category: category,
      price: priceNum,
    });
    setIsUpdating(false);

    if (!res.success) {
      toast({ title: "Error al actualizar", description: res.error, type: "error" });
      return;
    }

    toast({ title: "Actualizado", description: `"${name}" fue modificado con éxito.`, type: "success" });
    onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-card w-full max-w-md rounded-xl border border-border shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-border bg-muted/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-bold">
              {product.is_service ? "Editar Servicio de Taller" : "Editar Ficha de Repuesto"}
            </h3>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          <div>
            <Label htmlFor="edit_name">Nombre *</Label>
            <Input
              id="edit_name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1"
              required
            />
          </div>

          <div>
            <Label htmlFor="edit_category">Categoría</Label>
            <Input
              id="edit_category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1"
              required
            />
          </div>

          <div>
            <Label htmlFor="edit_price">Precio de Venta ($) *</Label>
            <Input
              id="edit_price"
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="mt-1 text-lg font-bold"
              required
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-border mt-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isUpdating} className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
              {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
              Guardar Cambios
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}