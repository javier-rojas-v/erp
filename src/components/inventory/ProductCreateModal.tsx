// components/inventory/ProductCreateModal.tsx
"use client";

import { useState, useEffect } from "react";
import { createProduct, getCategories } from "@/lib/api/products";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toast";
import { ChevronRight, CheckCircle2, Loader2, Package, Wrench } from "lucide-react";

interface ProductCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ProductCreateModal({ isOpen, onClose, onSuccess }: ProductCreateModalProps) {
  const [isService, setIsService] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);

  const [formName, setFormName] = useState("");
  const [formBrand, setFormBrand] = useState("Genérico");
  const [formCategory, setFormCategory] = useState("Lubricantes y Aceites");
  const [formSku, setFormSku] = useState("");
  const [formOem, setFormOem] = useState("");
  const [formBarcode, setFormBarcode] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formStock, setFormStock] = useState("");
  const [formMinStock, setFormMinStock] = useState("2");

  const loadCategoryOptions = async (serviceMode: boolean) => {
    setIsLoadingCategories(true);
    const fetchedCategories = await getCategories(serviceMode);
    setCategories(fetchedCategories);
    if (fetchedCategories.length > 0) {
      setFormCategory(fetchedCategories[0]);
    }
    setIsLoadingCategories(false);
  };

  useEffect(() => {
    if (isOpen) {
      loadCategoryOptions(isService);
    }
  }, [isOpen, isService]);

  if (!isOpen) return null;

  const resetForm = () => {
    setFormName("");
    setFormBrand("Genérico");
    setFormSku("");
    setFormOem("");
    setFormBarcode("");
    setFormPrice("");
    setFormStock("");
    setFormMinStock("2");
    setIsService(false);
    setCurrentStep(1);
  };

  const handleCreateProductSubmit = async () => {
    if (!formName.trim() || !formSku.trim()) {
      toast({
        title: "Campos obligatorios",
        description: "El Nombre y Código SKU son obligatorios.",
        type: "warning",
      });
      return;
    }

    const priceNum = parseFloat(formPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      toast({
        title: "Precio inválido",
        description: "El precio de venta debe ser mayor a 0.",
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
      part_number_factory: isService ? "" : formOem,
      barcode: isService ? "" : formBarcode,
      price: priceNum,
      stock: isService ? 0 : parseInt(formStock || "0", 10),
      min_stock: isService ? 0 : parseInt(formMinStock || "2", 10),
      is_service: isService,
    });
    setIsSavingProduct(false);

    if (!res.success) {
      toast({
        title: "Error al guardar",
        description: res.error || "No se pudo crear la ficha.",
        type: "error",
      });
      return;
    }

    toast({
      title: isService ? "Servicio Guardado" : "Repuesto Guardado",
      description: `"${formName}" fue ingresado correctamente.`,
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
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold">
              {isService ? "Crear Ficha de Servicio de Taller" : "Crear Ficha de Repuesto Físico"}
            </h3>
            
            <div className="inline-flex rounded-lg border border-border bg-background p-1 gap-1">
              <button
                type="button"
                onClick={() => setIsService(false)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                  !isService ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Package className="h-3.5 w-3.5" /> Repuesto
              </button>
              <button
                type="button"
                onClick={() => setIsService(true)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                  isService ? "bg-blue-600 text-white shadow-xs" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Wrench className="h-3.5 w-3.5" /> Servicio
              </button>
            </div>
          </div>

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
                  {step === 1 ? "Identificación" : isService ? "Precio Público" : "Precio & Stock Inicial"}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 min-h-[260px]">
          {currentStep === 1 && (
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="prod_name">
                  {isService ? "Nombre del Servicio *" : "Nombre del Repuesto *"}
                </Label>
                <Input
                  id="prod_name"
                  placeholder={isService ? "Ej: Mantención de Frenos Delanteros" : "Ej: Aceite Sintético 5W30 Mobil 1 4L"}
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="prod_brand">
                  {isService ? "Proveedor / Marca Interna" : "Marca del Producto *"}
                </Label>
                <Input
                  id="prod_brand"
                  placeholder={isService ? "Ej: Taller TITO" : "Ej: Mobil, Castrol, Bosch"}
                  value={formBrand}
                  onChange={(e) => setFormBrand(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="prod_category">Categoría Estandarizada *</Label>
                {isLoadingCategories ? (
                  <div className="h-8 mt-1 flex items-center text-xs text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" /> Cargando...
                  </div>
                ) : (
                  <select
                    id="prod_category"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full h-8 mt-1 rounded-md bg-background border border-input text-xs font-medium px-2 text-foreground outline-hidden cursor-pointer"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat} className="bg-background text-foreground">
                        {cat}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <Label htmlFor="prod_sku">Código Interno / SKU *</Label>
                <Input
                  id="prod_sku"
                  placeholder={isService ? "SRV-FRE-01" : "OIL-5W30-MOB"}
                  value={formSku}
                  onChange={(e) => setFormSku(e.target.value)}
                  className="mt-1"
                />
              </div>

              {!isService && (
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
              )}
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

              {!isService && (
                <>
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
                </>
              )}
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
                  <CheckCircle2 className="mr-2 h-4 w-4" /> {isService ? "Guardar Servicio" : "Guardar Producto"}
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}