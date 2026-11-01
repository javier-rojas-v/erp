// components/inventory/ProductCreateModal.tsx
"use client";

import { useState } from "react";
import { createProduct } from "@/lib/api/products";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toast";
import { ChevronRight, CheckCircle2, Loader2 } from "lucide-react";

interface ProductCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ProductCreateModal({ isOpen, onClose, onSuccess }: ProductCreateModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSavingProduct, setIsSavingProduct] = useState(false);

  const [formName, setFormName] = useState("");
  const [formBrand, setFormBrand] = useState("");
  const [formCategory, setFormCategory] = useState("Lubricantes y Aceites");
  const [formSku, setFormSku] = useState("");
  const [formOem, setFormOem] = useState("");
  const [formBarcode, setFormBarcode] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formStock, setFormStock] = useState("");
  const [formMinStock, setFormMinStock] = useState("2");

  if (!isOpen) return null;

  const resetForm = () => {
    setFormName("");
    setFormBrand("");
    setFormCategory("Lubricantes y Aceites");
    setFormSku("");
    setFormOem("");
    setFormBarcode("");
    setFormPrice("");
    setFormStock("");
    setFormMinStock("2");
    setCurrentStep(1);
  };

  const handleCreateProductSubmit = async () => {
    if (!formName.trim() || !formBrand.trim() || !formSku.trim()) {
      toast({
        title: "Campos obligatorios",
        description: "El Nombre, Marca y SKU son obligatorios.",
        type: "warning",
      });
      return;
    }
    const priceNum = parseFloat(formPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      toast({
        title: "Precio inválido",
        description: "El precio de venta debe ser un número mayor a 0.",
        type: "warning",
      });
      return;
    }

    setIsSavingProduct(true);
    const res = await createProduct({
      name: formName,
      brand: formBrand,
      category: formCategory,
      sku: formSku,
      part_number_factory: formOem,
      barcode: formBarcode,
      price: priceNum,
      stock: parseInt(formStock || "0", 10),
      min_stock: parseInt(formMinStock || "2", 10),
      is_service: false,
    });
    setIsSavingProduct(false);

    if (!res.success) {
      toast({
        title: "Error al guardar",
        description: res.error || "No se pudo insertar el repuesto.",
        type: "error",
      });
      return;
    }

    toast({
      title: "Repuesto Guardado",
      description: `"${formName}" fue guardado correctamente en el catálogo.`,
      type: "success",
    });
    resetForm();
    onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-card w-full max-w-2xl rounded-xl border border-border shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-border bg-muted/30">
          <h3 className="text-lg font-bold">Crear Ficha de Producto</h3>
          <div className="flex items-center justify-between mt-4">
            {[1, 2].map((step) => (
              <div key={step} className="flex flex-col items-center gap-1 w-1/2 relative">
                <div
                  className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold z-10 transition-colors ${
                    currentStep >= step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground border border-border"
                  }`}
                >
                  {step}
                </div>
                <span className="text-[10px] uppercase font-semibold text-muted-foreground mt-1 text-center">
                  {step === 1 ? "Identificación" : "Precio & Stock Inicial"}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 min-h-[260px]">
          {currentStep === 1 && (
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="prod_name">Nombre del Repuesto *</Label>
                <Input
                  id="prod_name"
                  placeholder="Ej: Aceite Sintético 5W30 Mobil 1 4L"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="prod_brand">Marca del Producto *</Label>
                <Input
                  id="prod_brand"
                  placeholder="Ej: Mobil, Castrol, Bosch"
                  value={formBrand}
                  onChange={(e) => setFormBrand(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="prod_category">Categoría</Label>
                <select
                  id="prod_category"
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full h-8 mt-1 rounded-md bg-transparent border border-input text-sm px-2 text-foreground"
                >
                  <option className="bg-background text-foreground" value="Lubricantes y Aceites">Lubricantes y Aceites</option>
                  <option className="bg-background text-foreground" value="Filtros">Filtros</option>
                  <option className="bg-background text-foreground" value="Frenos">Frenos</option>
                  <option className="bg-background text-foreground" value="Suspensión y Dirección">Suspensión y Dirección</option>
                  <option className="bg-background text-foreground" value="Motor y Correas">Motor y Correas</option>
                  <option className="bg-background text-foreground" value="Accesorios e Iluminación">Accesorios e Iluminación</option>
                </select>
              </div>
              <div>
                <Label htmlFor="prod_sku">SKU / Código Interno *</Label>
                <Input
                  id="prod_sku"
                  placeholder="OIL-5W30-MOB"
                  value={formSku}
                  onChange={(e) => setFormSku(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="prod_oem">N° Parte Fabricante (OEM)</Label>
                <Input
                  id="prod_oem"
                  placeholder="MOB-5W30-4L"
                  value={formOem}
                  onChange={(e) => setFormOem(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="prod_price">Precio de Venta Público ($) *</Label>
                <Input
                  id="prod_price"
                  type="number"
                  placeholder="28000"
                  value={formPrice}
                  onChange={(e) => setFormPrice(e.target.value)}
                  className="mt-1 text-lg font-bold"
                />
              </div>
              <div>
                <Label htmlFor="prod_stock">Stock Inicial</Label>
                <Input
                  id="prod_stock"
                  type="number"
                  placeholder="10"
                  value={formStock}
                  onChange={(e) => setFormStock(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="prod_min_stock">Alerta Mínima de Stock</Label>
                <Input
                  id="prod_min_stock"
                  type="number"
                  placeholder="2"
                  value={formMinStock}
                  onChange={(e) => setFormMinStock(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between p-4 border-t border-border bg-background">
          <Button variant="ghost" onClick={() => (currentStep === 1 ? onClose() : setCurrentStep(1))}>
            {currentStep === 1 ? "Cancelar" : "Atrás"}
          </Button>
          {currentStep < 2 ? (
            <Button onClick={() => setCurrentStep(2)}>
              Siguiente <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              disabled={isSavingProduct}
              onClick={handleCreateProductSubmit}
            >
              {isSavingProduct ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" /> Guardar Producto
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}