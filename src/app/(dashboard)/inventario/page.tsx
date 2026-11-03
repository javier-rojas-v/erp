// src/app/(dashboard)/inventario/page.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import XLSX from "xlsx-js-style";
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
import { UpdateProductModal } from "@/components/inventory/UpdateProductModal";

export default function InventarioPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [activeTab, setActiveTab] = useState<"physical" | "services">("physical");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);

  const loadCatalog = async () => {
    setIsLoading(true);
    const data = await getProducts();
    setProducts(data);
    setIsLoading(false);
  };

  useEffect(() => {
    const timer = window.setTimeout(() => void loadCatalog(), 0);
    return () => window.clearTimeout(timer);
  }, []);

  /**
   * Genera y descarga la plantilla oficial de migración en formato Excel (.xlsx) nativo con estilos corporativos.
   * Modificado para inyectar estilos directamente celda por celda mediante xlsx-js-style.
   */
  const handleDownloadTemplate = () => {
    // 1. Datos base de la plantilla (Cabeceras y fila de ejemplo)
    const templateData = [
      [
        "sku", "name", "brand", "category", "price", 
        "cost_price", "stock", "min_stock", "part_number_factory", "barcode", "is_service"
      ],
      [
        "FIL-ACE-001", "Filtro de Aceite Sintético", "Bosch", "Filtros", 
        12990, 8500, 25, 5, "OEM-BS-1020", "7801234567890", false
      ]
    ];

    try {
      // 2. Crear la hoja de trabajo a partir de los datos
      const worksheet = XLSX.utils.aoa_to_sheet(templateData);

      // 3. Definir estilos profesionales de diseño corporativo
      const headerStyle = {
        font: { name: "Calibri", sz: 11, bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "1F2937" } }, // Gris oscuro elegante (Tailwind zinc-800)
        alignment: { horizontal: "center", vertical: "center" },
        border: {
          top: { style: "thin", color: { rgb: "4B5563" } },
          bottom: { style: "thin", color: { rgb: "4B5563" } },
          left: { style: "thin", color: { rgb: "4B5563" } },
          right: { style: "thin", color: { rgb: "4B5563" } }
        }
      };

      const sampleRowStyle = {
        font: { name: "Calibri", sz: 11 },
        alignment: { horizontal: "left", vertical: "center" },
        border: {
          top: { style: "thin", color: { rgb: "E5E7EB" } },
          bottom: { style: "thin", color: { rgb: "E5E7EB" } },
          left: { style: "thin", color: { rgb: "E5E7EB" } },
          right: { style: "thin", color: { rgb: "E5E7EB" } }
        }
      };

      // 4. Aplicar los estilos celda por celda recorriendo el rango de columnas (A1 hasta K2)
      const range = XLSX.utils.decode_range(worksheet["!ref"] || "A1:K2");
      for (let C = range.s.c; C <= range.e.c; ++C) {
        // Aplicar estilo a la cabecera (Fila 0)
        const headerCellRef = XLSX.utils.encode_cell({ r: 0, c: C });
        if (worksheet[headerCellRef]) {
          worksheet[headerCellRef].s = headerStyle;
        }
        
        // Aplicar estilo suave a la fila de ejemplo (Fila 1)
        const dataCellRef = XLSX.utils.encode_cell({ r: 1, c: C });
        if (worksheet[dataCellRef]) {
          worksheet[dataCellRef].s = sampleRowStyle;
        }
      }

      // 5. Configurar anchos de columna automáticos para que no queden textos cortados
      worksheet["!cols"] = [
        { wch: 15 }, // sku
        { wch: 30 }, // name
        { wch: 15 }, // brand
        { wch: 22 }, // category
        { wch: 12 }, // price
        { wch: 12 }, // cost_price
        { wch: 10 }, // stock
        { wch: 12 }, // min_stock
        { wch: 20 }, // part_number_factory
        { wch: 18 }, // barcode
        { wch: 12 }  // is_service
      ];

      // 6. Crear libro, agregar la hoja estilizada y disparar la descarga
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Plantilla Migración");
      XLSX.writeFile(workbook, "plantilla_migracion_repuestos_tito.xlsx");

      toast({
        title: "Plantilla Estilizada Generada",
        description: "Se descargó el archivo Excel con diseño corporativo automático.",
        type: "success",
      });
    } catch (error) {
      console.error("Error al generar plantilla Excel estilizada:", error);
      toast({
        title: "Error de Exportación",
        description: "No se pudo generar el archivo Excel de migración.",
        type: "error",
      });
    }
  };

  const physicalProducts = useMemo(() => {
    return products.filter((p) => !p.is_service);
  }, [products]);

  const workshopServices = useMemo(() => {
    return products.filter((p) => Boolean(p.is_service));
  }, [products]);

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
            <FileDown className="mr-2 h-4 w-4 text-emerald-500" /> Plantilla Excel (.xlsx)
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
            onEditProduct={(p) => setEditingProduct(p)}
          />
        </TabsContent>
        <TabsContent value="services">
          <ServicesTable
            services={filteredServices}
            isLoading={isLoading}
            onEditService={(srv) => setEditingProduct(srv)}
            onSelectService={(srv) => setSelectedProduct(srv)}
          />
        </TabsContent>
      </Tabs>
      <ProductDetailDrawer
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
      />
      <UpdateProductModal
        product={editingProduct}
        isOpen={Boolean(editingProduct)}
        onClose={() => setEditingProduct(null)}
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
