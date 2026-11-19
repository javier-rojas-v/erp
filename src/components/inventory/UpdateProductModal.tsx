// src/components/inventory/UpdateProductModal.tsx
"use client";

import { useState, useEffect } from "react";
import { Product } from "@/types";
import { updateProduct, getCategories } from "@/lib/api/products";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toast";
import { X, CheckCircle2, Loader2, Wrench, Package, Lock } from "lucide-react";

interface UpdateProductModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function UpdateProductModal({ product, isOpen, onClose, onSuccess }: UpdateProductModalProps) {
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [minStock, setMinStock] = useState("2");
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);

  useEffect(() => {
    if (product && isOpen) {
      setName(product.name || "");
      setSku(product.sku || "");
      setBrand(product.brand || "Genérico");
      setPrice(product.price !== undefined ? product.price.toString() : "0");
      setCostPrice(product.cost_price !== undefined ? product.cost_price.toString() : "0");
      setMinStock(product.min_stock !== undefined ? product.min_stock.toString() : "2");
      const isSrv = Boolean(product.is_service);

      setIsLoadingCategories(true);
      getCategories(isSrv)
        .then((cats) => {
          setAvailableCategories(cats);
          setCategory(product.category || cats[0] || (isSrv ? "Mano de Obra" : "General"));
        })
        .finally(() => setIsLoadingCategories(false));
    }
  }, [product, isOpen]);

  if (!isOpen || !product) return null;

  const isService = Boolean(product.is_service);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({ title: "Campo requerido", description: "El nombre no puede estar vacío.", type: "warning" });
      return;
    }

    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) {
      toast({ title: "Precio inválido", description: "Ingresa un precio de venta mayor a 0.", type: "warning" });
      return;
    }

    const costPriceNum = parseFloat(costPrice);
    if (!isService && (isNaN(costPriceNum) || costPriceNum <= 0)) {
      toast({ title: "Costo inválido", description: "El costo de compra debe ser estrictamente mayor a 0 para repuestos físicos.", type: "warning" });
      return;
    }

    const minStockNum = parseInt(minStock, 10);
    if (!isService && (isNaN(minStockNum) || minStockNum < 0)) {
      toast({ title: "Stock Mínimo inválido", description: "Ingresa un valor entero mayor o igual a 0.", type: "warning" });
      return;
    }

    setIsUpdating(true);
    const payload = isService
      ? {
          name: name.trim(),
          category: category,
          price: priceNum,
        }
      : {
          name: name.trim(),
          brand: brand.trim(),
          category: category,
          price: priceNum,
          cost_price: costPriceNum,
          min_stock: minStockNum,
        };

    const res = await updateProduct(product.id, payload);
    setIsUpdating(false);

    if (!res.success) {
      toast({ title: "Error al actualizar", description: res.error, type: "error" });
      return;
    }

    toast({
      title: isService ? "Servicio Actualizado" : "Repuesto Actualizado",
      description: `"${name}" se guardó correctamente.`,
      type: "success",
    });
    onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-card w-full max-w-lg rounded-xl border border-border shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-border bg-muted/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isService ? (
              <Wrench className="h-5 w-5 text-blue-500" />
            ) : (
              <Package className="h-5 w-5 text-primary" />
            )}
            <h3 className="text-lg font-bold">
              {isService ? "Editar Servicio de Taller" : "Editar Ficha de Repuesto Físico"}
            </h3>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          {!isService && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label htmlFor="edit_sku" className="text-muted-foreground">Código SKU (Protegido por Kardex)</Label>
                <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-mono">
                  <Lock className="h-3 w-3" /> Solo lectura
                </span>
              </div>
              <Input
                id="edit_sku"
                value={sku}
                disabled
                readOnly
                className="font-mono bg-muted/50 cursor-not-allowed opacity-80"
              />
            </div>
          )}

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

          {!isService && (
            <div>
              <Label htmlFor="edit_brand">Marca del Repuesto *</Label>
              <Input
                id="edit_brand"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="mt-1"
                required
              />
            </div>
          )}

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

          <div className="grid grid-cols-2 gap-4">
            <div className={isService ? "col-span-2" : ""}>
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
            {!isService && (
              <div>
                <Label htmlFor="edit_cost_price">Costo Compra Base ($) *</Label>
                <Input
                  id="edit_cost_price"
                  type="number"
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value)}
                  className="mt-1 text-lg font-bold"
                  required
                />
              </div>
            )}
          </div>

          {!isService && (
            <div>
              <Label htmlFor="edit_min_stock">Stock Mínimo de Alerta *</Label>
              <Input
                id="edit_min_stock"
                type="number"
                value={minStock}
                onChange={(e) => setMinStock(e.target.value)}
                className="mt-1 font-semibold"
                required
              />
            </div>
          )}

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