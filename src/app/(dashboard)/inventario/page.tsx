// app/(dashboard)/inventario/page.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { getProducts } from "@/lib/api/products";
import { Product } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { Search, Plus, UploadCloud, FileDown, Package, Wrench } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { InventoryTable } from "@/components/inventory/InventoryTable";
import { ServicesTable } from "@/components/inventory/ServicesTable";
import { ProductDetailDrawer } from "@/components/inventory/ProductDetailDrawer";
import { BulkUploadModal } from "@/components/inventory/BulkUploadModal";
import { ProductCreateModal } from "@/components/inventory/ProductCreateModal";
import { ServiceEditModal } from "@/components/inventory/ServiceEditModal";

export default function InventarioPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [activeTab, setActiveTab] = useState<"physical" | "services">("physical");

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [editingService, setEditingService] = useState<Product | null>(null);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);

  const loadCatalog = async () => {
    setIsLoading(true);
    const data = await getProducts();
    setProducts(data);
    setIsLoading(false);
  };

  useEffect(() => {
    loadCatalog();
  }, []);

  const handleDownloadTemplate = () => {
    const csvContent =
      "data:text/csv;charset=utf-8,SKU,Nombre,Marca,Categoria,Precio,Stock,StockMinimo,OEM,CodigoBarra\nOIL-5W30,Aceite Sintetico 5W30,Mobil,Lubricantes y Aceites,28000,10,2,MOB-5W30,780123456789\nFIL-HU711,Filtro de Aceite Mann,Mann Filter,Filtros,9500,15,3,HU711x,780987654321";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "plantilla_carga_masiva_repuestos.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({
      title: "Plantilla Descargada",
      description: "Se ha generado la plantilla CSV de ejemplo.",
      type: "success",
    });
  };

  // Separa explícitamente repuestos físicos y servicios de taller
  const physicalProducts = useMemo(() => {
    return products.filter((p) => !p.is_service);
  }, [products]);

  const workshopServices = useMemo(() => {
    return products.filter((p) => Boolean(p.is_service));
  }, [products]);

  // Filtros aplicados sobre Repuestos Físicos
  const filteredPhysicalProducts = useMemo(() => {
    return physicalProducts.filter((p) => {
      const q = searchQuery.toLowerCase();
      const matchSearch =
        p.sku.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        (p.part_number_factory && p.part_number_factory.toLowerCase().includes(q));

      const matchStatus =
        filterStatus === "ALL"
          ? true
          : filterStatus === "CRITICAL"
          ? p.stock <= p.min_stock && p.stock > 0
          : filterStatus === "OUT"
          ? p.stock === 0
          : true;

      return matchSearch && matchStatus;
    });
  }, [physicalProducts, searchQuery, filterStatus]);

  // Filtros aplicados sobre Servicios de Taller (sin alertas de stock)
  const filteredServices = useMemo(() => {
    return workshopServices.filter((s) => {
      const q = searchQuery.toLowerCase();
      return (
        s.name.toLowerCase().includes(q) ||
        s.sku.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q)
      );
    });
  }, [workshopServices, searchQuery]);

  return (
    <div className="flex flex-col gap-6 relative">
      <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-4">
        <div className="flex-1 w-full max-w-2xl">
          <h1 className="text-3xl font-bold tracking-tight">Catálogo e Inventario</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gestión centralizada de repuestos físicos y servicios de taller en tiempo real.
          </p>
          
          <div className="flex items-center gap-2 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder={
                  activeTab === "physical"
                    ? "Buscar repuestos por Marca, Nombre, SKU o N° OEM..."
                    : "Buscar servicios por Nombre o Categoría..."
                }
                className="pl-10 h-11 text-base bg-card border-border shadow-xs focus-visible:ring-primary"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* El filtro por estado (Stock Crítico / Agotados) SOLO aplica sobre Repuestos Físicos */}
            {activeTab === "physical" && (
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="h-11 bg-card border border-border rounded-lg text-xs font-semibold px-3 text-foreground outline-hidden cursor-pointer"
              >
                <option value="ALL">Todos los Repuestos</option>
                <option value="CRITICAL">Stock Crítico</option>
                <option value="OUT">Agotados</option>
              </select>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-2 xl:pt-10">
          <Button
            variant="outline"
            className="h-10 bg-card border-border shadow-xs hover:bg-muted font-medium text-xs"
            onClick={handleDownloadTemplate}
          >
            <FileDown className="mr-2 h-4 w-4 text-emerald-500" /> Plantilla CSV
          </Button>
          <Button
            variant="outline"
            className="h-10 bg-card border-border shadow-xs hover:bg-muted font-medium text-xs"
            onClick={() => setIsBulkModalOpen(true)}
          >
            <UploadCloud className="mr-2 h-4 w-4 text-blue-500" /> Carga Masiva (.xlsx / .csv)
          </Button>
          <Button
            className="h-10 bg-primary text-primary-foreground font-semibold shadow-xs"
            onClick={() => setIsAddModalOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" /> Nuevo Repuesto / Servicio
          </Button>
        </div>
      </div>

      {/* Pestañas (Tabs) de Shadcn UI */}
      <Tabs
        defaultValue="physical"
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as "physical" | "services")}
      >
        <TabsList>
          <TabsTrigger value="physical" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            <span>Repuestos Físicos</span>
            <span className="ml-1 px-2 py-0.5 text-[10px] rounded-full bg-primary/10 text-primary font-bold">
              {physicalProducts.length}
            </span>
          </TabsTrigger>

          <TabsTrigger value="services" className="flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            <span>Servicios de Taller</span>
            <span className="ml-1 px-2 py-0.5 text-[10px] rounded-full bg-blue-500/10 text-blue-400 font-bold">
              {workshopServices.length}
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="physical">
          <InventoryTable
            products={filteredPhysicalProducts}
            isLoading={isLoading}
            onSelectProduct={(p) => setSelectedProduct(p)}
          />
        </TabsContent>

        <TabsContent value="services">
          <ServicesTable
            services={filteredServices}
            isLoading={isLoading}
            onEditService={(srv) => setEditingService(srv)}
            onSelectService={(srv) => setSelectedProduct(srv)}
          />
        </TabsContent>
      </Tabs>

      {/* Modales y Drawers Retrocompatibles */}
      <ProductDetailDrawer
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
      />

      <ServiceEditModal
        product={editingService}
        isOpen={Boolean(editingService)}
        onClose={() => setEditingService(null)}
        onSuccess={loadCatalog}
      />

      <BulkUploadModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        onSuccess={loadCatalog}
        onDownloadTemplate={handleDownloadTemplate}
      />

      <ProductCreateModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={loadCatalog}
      />
    </div>
  );
}