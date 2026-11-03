// components/inventory/ServiceEditModal.tsx
"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useState, useEffect } from "react";
import { Product } from "@/types";
import { updateProduct, getCategories } from "@/lib/api/products";
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
  const [category, setCategory] = useState("Mano de Obra");
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [price, setPrice] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);

  useEffect(() => {
    if (product && isOpen) {
      setName(product.name || "");
      setPrice(product.price ? product.price.toString() : "0");
      
      const isSrv = Boolean(product.is_service);
      setIsLoadingCategories(true);
      
      getCategories(isSrv)
        .then((cats) => {
          setAvailableCategories(cats);
          setCategory(product.category || cats[0] || (isSrv ? "Mano de Obra" : "Lubricantes y Aceites"));
        })
        .finally(() => setIsLoadingCategories(false));
    }
  }, [product, isOpen]);

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
            <Label htmlFor="edit_category">Categoría Estandarizada *</Label>
            {isLoadingCategories ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span>Cargando maestro de categorías...</span>
              </div>
            ) : (
              <select
                id="edit_category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full h-9 mt-1 rounded-lg bg-background border border-input text-sm px-3 text-foreground outline-hidden cursor-pointer"
                required
              >
                {availableCategories.map((cat) => (
                  <option key={cat} value={cat} className="bg-background text-foreground">
                    {cat}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <Label htmlFor="edit_price">Precio de Venta Público ($) *</Label>
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
