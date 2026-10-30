"use client";

import { useState, useEffect, useMemo, ChangeEvent } from "react";
import { getProducts, createProduct, getProductKardex, bulkCreateProducts, InventoryTransactionRow, CreateProductInput } from "@/lib/api/products";
import { Product } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/components/ui/toast";
import {
  Search,
  Plus,
  FileSpreadsheet,
  UploadCloud,
  Tag,
  X,
  Box,
  History,
  ChevronRight,
  CheckCircle2,
  FileDown,
  Loader2,
  AlertTriangle,
  Barcode,
  Layers,
  DollarSign
} from "lucide-react";

export default function InventarioPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [activeTab, setActiveTab] = useState("info");
  const [kardexList, setKardexList] = useState<InventoryTransactionRow[]>([]);
  const [isLoadingKardex, setIsLoadingKardex] = useState(false);

  // Estados de Modales
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [isSavingProduct, setIsSavingProduct] = useState(false);

  // Carga Masiva
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkParsedData, setBulkParsedData] = useState<CreateProductInput[]>([]);
  const [isParsingBulk, setIsParsingBulk] = useState(false);
  const [isUploadingBulk, setIsUploadingBulk] = useState(false);

  // Formulario Individual
  const [formName, setFormName] = useState("");
  const [formBrand, setFormBrand] = useState("");
  const [formCategory, setFormCategory] = useState("Lubricantes y Aceites");
  const [formSku, setFormSku] = useState("");
  const [formOem, setFormOem] = useState("");
  const [formBarcode, setFormBarcode] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formStock, setFormStock] = useState("");
  const [formMinStock, setFormMinStock] = useState("2");

  const loadCatalog = async () => {
    setIsLoading(true);
    const data = await getProducts();
    setProducts(data);
    setIsLoading(false);
  };

  useEffect(() => {
    loadCatalog();
  }, []);

  useEffect(() => {
    if (selectedProduct && activeTab === "kardex") {
      setIsLoadingKardex(true);
      getProductKardex(selectedProduct.id)
        .then((txs) => setKardexList(txs))
        .finally(() => setIsLoadingKardex(false));
    }
  }, [selectedProduct, activeTab]);

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

  // Lógica de Lectura CSV/Excel
  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setBulkFile(file);
    setIsParsingBulk(true);

    try {
      const text = await file.text();
      const lines = text.split(/\r\n|\n/).filter((l) => l.trim().length > 0);
      if (lines.length <= 1) {
        toast({ title: "Archivo vacío", description: "El archivo no contiene filas de repuestos.", type: "warning" });
        setIsParsingBulk(false);
        return;
      }

      const headers = lines[0].split(/[,;]/).map((h) => h.trim().toLowerCase());
      const parsedItems: CreateProductInput[] = [];

      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(/[,;]/).map((c) => c.trim().replace(/^"|"$/g, ''));
        if (cols.length < 3) continue;

        const sku = cols[0] || `SKU-${Date.now()}-${i}`;
        const name = cols[1] || "Repuesto Sin Nombre";
        const brand = cols[2] || "Genérico";
        const category = cols[3] || "General";
        const price = parseFloat(cols[4]) || 0;
        const stock = parseInt(cols[5], 10) || 0;
        const min_stock = parseInt(cols[6], 10) || 2;
        const oem = cols[7] || "";
        const barcode = cols[8] || "";

        parsedItems.push({
          sku,
          name,
          brand,
          category,
          price,
          stock,
          min_stock,
          part_number_factory: oem,
          barcode,
        });
      }

      setBulkParsedData(parsedItems);
      toast({
        title: "Archivo Procesado",
        description: `Se leyeron ${parsedItems.length} repuestos listos para importar.`,
        type: "success",
      });
    } catch (err) {
      toast({ title: "Error al leer archivo", description: "Verifica que sea un CSV o Excel válido.", type: "error" });
    } finally {
      setIsParsingBulk(false);
    }
  };

  const handleProcessBulkUpload = async () => {
    if (bulkParsedData.length === 0) return;

    setIsUploadingBulk(true);
    const result = await bulkCreateProducts(bulkParsedData);
    setIsUploadingBulk(false);

    if (!result.success) {
      toast({
        title: "Error en Carga Masiva",
        description: result.error || "No se pudieron importar los datos.",
        type: "error",
      });
      return;
    }

    toast({
      title: "Carga Masiva Completada",
      description: `Se importaron/actualizaron ${result.insertedCount} repuestos con éxito.`,
      type: "success",
    });

    setIsBulkModalOpen(false);
    setBulkFile(null);
    setBulkParsedData([]);
    loadCatalog();
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

    setIsAddModalOpen(false);
    resetForm();
    loadCatalog();
  };

  const filteredCatalog = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.part_number_factory &&
          p.part_number_factory.toLowerCase().includes(searchQuery.toLowerCase()));

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
  }, [products, searchQuery, filterStatus]);

  return (
    <div className="flex flex-col gap-6 relative">
      {/* HEADER & BUSCADOR */}
      <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-4">
        <div className="flex-1 w-full max-w-2xl">
          <h1 className="text-3xl font-bold tracking-tight">Catálogo e Inventario</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gestión centralizada de repuestos y control de stock en tiempo real.
          </p>

          <div className="flex items-center gap-2 mt-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar por Marca, Nombre, SKU o N° de Parte OEM..."
                className="pl-10 h-11 text-base bg-card border-border shadow-xs focus-visible:ring-primary"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="h-11 bg-card border border-border rounded-lg text-xs font-semibold px-3 text-foreground outline-hidden cursor-pointer"
            >
              <option value="ALL">Todos los Repuestos</option>
              <option value="CRITICAL">Stock Crítico</option>
              <option value="OUT">Agotados</option>
            </select>
          </div>
        </div>

        {/* BOTONES DE ACCIÓN */}
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
            onClick={() => {
              setBulkFile(null);
              setBulkParsedData([]);
              setIsBulkModalOpen(true);
            }}
          >
            <UploadCloud className="mr-2 h-4 w-4 text-blue-500" /> Carga Masiva (.xlsx / .csv)
          </Button>

          <Button
            className="h-10 bg-primary text-primary-foreground font-semibold shadow-xs"
            onClick={() => {
              resetForm();
              setIsAddModalOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" /> Nuevo Producto
          </Button>
        </div>
      </div>

      {/* TABLA PRINCIPAL DE DATOS */}
      <div className="rounded-xl border border-border bg-card/50 backdrop-blur-xs overflow-hidden shadow-xs">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow className="border-border">
              <TableHead>SKU / N° Parte OEM</TableHead>
              <TableHead>Producto y Categoría</TableHead>
              <TableHead>Marca</TableHead>
              <TableHead className="text-right">Precio Venta</TableHead>
              <TableHead className="text-right">Stock Disponible</TableHead>
              <TableHead className="text-center">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow className="border-border">
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    <span>Cargando catálogo actualizado...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredCatalog.length === 0 ? (
              <TableRow className="border-border">
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  No se encontraron repuestos registrados.
                </TableCell>
              </TableRow>
            ) : (
              filteredCatalog.map((product) => {
                const isLowStock = product.stock <= product.min_stock;
                const isOutOfStock = product.stock === 0;

                return (
                  <TableRow key={product.id} className="border-border hover:bg-muted/30 transition-colors">
                    <TableCell>
                      <div className="font-mono text-sm font-bold text-primary">
                        {product.sku}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 font-mono">
                        OEM: {product.part_number_factory || "S/I"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold text-foreground text-sm">
                        {product.name}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {product.category}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wide bg-primary/10 text-primary border border-primary/20">
                        <Tag className="h-3 w-3" />
                        {product.brand}
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-bold text-base">
                      ${product.price.toLocaleString("es-CL")}
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold tabular-nums ${
                          isOutOfStock
                            ? "bg-muted text-muted-foreground border border-border"
                            : isLowStock
                            ? "bg-red-500/10 text-red-500 border border-red-500/20"
                            : "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                        }`}
                      >
                        {isLowStock && !isOutOfStock && <AlertTriangle className="h-3 w-3 shrink-0" />}
                        {product.stock} un.
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="font-medium text-xs"
                        onClick={() => {
                          setSelectedProduct(product);
                          setActiveTab("info");
                        }}
                      >
                        Ver Detalles
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* FICHA LATERAL DE DETALLES MEJORADA */}
      {selectedProduct && (
        <>
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 transition-opacity"
            onClick={() => setSelectedProduct(null)}
          />
          <div className="fixed inset-y-0 right-0 z-50 w-full md:w-[580px] bg-card shadow-2xl border-l border-border flex flex-col animate-in slide-in-from-right-full duration-300">
            {/* ENCABEZADO DE LA FICHA */}
            <div className="flex items-center justify-between p-6 border-b border-border bg-muted/20">
              <div>
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-bold uppercase bg-primary/10 text-primary border border-primary/20">
                    <Tag className="h-3 w-3" />
                    {selectedProduct.brand}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded border border-border">
                    SKU: {selectedProduct.sku}
                  </span>
                </div>
                <h2 className="text-xl font-bold leading-tight">{selectedProduct.name}</h2>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedProduct(null)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* PESTAÑAS */}
            <div className="flex items-center px-6 border-b border-border bg-background">
              {[
                { id: "info", icon: Box, label: "Ficha Comercial" },
                { id: "kardex", icon: History, label: "Historial de Movimientos" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <tab.icon className="h-4 w-4" /> {tab.label}
                </button>
              ))}
            </div>

            {/* CONTENIDO DE LA FICHA */}
            <div className="flex-1 overflow-y-auto p-6">
              {activeTab === "info" && (
                <div className="space-y-6">
                  {/* Tarjetas KPI de Resumen */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-muted/30 border border-border flex flex-col justify-between">
                      <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                        <DollarSign className="h-3.5 w-3.5 text-primary" /> Precio Venta Público
                      </span>
                      <p className="text-2xl font-black text-foreground mt-2 tabular-nums">
                        ${selectedProduct.price.toLocaleString("es-CL")}
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-muted/30 border border-border flex flex-col justify-between">
                      <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                        <Layers className="h-3.5 w-3.5 text-blue-500" /> Stock Disponible
                      </span>
                      <div className="flex items-baseline gap-2 mt-2">
                        <span className="text-2xl font-black text-foreground tabular-nums">
                          {selectedProduct.stock}
                        </span>
                        <span className="text-xs text-muted-foreground">unidades</span>
                      </div>
                    </div>
                  </div>

                  {/* Estado Operativo */}
                  <div className={`p-4 rounded-xl border flex items-center gap-3 ${
                    selectedProduct.stock === 0
                      ? "bg-red-500/10 border-red-500/20 text-red-500"
                      : selectedProduct.stock <= selectedProduct.min_stock
                      ? "bg-amber-500/10 border-amber-500/20 text-amber-500"
                      : "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                  }`}>
                    <AlertTriangle className="h-5 w-5 shrink-0" />
                    <div className="flex flex-col text-xs">
                      <span className="font-bold">
                        {selectedProduct.stock === 0
                          ? "Repuesto Agotado"
                          : selectedProduct.stock <= selectedProduct.min_stock
                          ? "Alerta: Stock Crítico"
                          : "Stock en Nivel Óptimo"}
                      </span>
                      <span className="opacity-90">
                        Mínimo sugerido de seguridad: {selectedProduct.min_stock} unidades.
                      </span>
                    </div>
                  </div>

                  {/* Especificaciones y Códigos */}
                  <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border pb-2">
                      Detalles Técnicos e Identificación
                    </h4>

                    <div className="grid grid-cols-2 gap-y-3 text-xs">
                      <div>
                        <span className="text-muted-foreground block">Categoría:</span>
                        <span className="font-semibold text-foreground">{selectedProduct.category}</span>
                      </div>

                      <div>
                        <span className="text-muted-foreground block">Marca Comercial:</span>
                        <span className="font-semibold text-foreground">{selectedProduct.brand}</span>
                      </div>

                      <div>
                        <span className="text-muted-foreground block">Código OEM (Fabricante):</span>
                        <span className="font-mono font-semibold text-foreground">
                          {selectedProduct.part_number_factory || "No especificado"}
                        </span>
                      </div>

                      <div>
                        <span className="text-muted-foreground block">Código de Barras (EAN):</span>
                        <span className="font-mono font-semibold text-foreground flex items-center gap-1 mt-0.5">
                          <Barcode className="h-3.5 w-3.5 text-muted-foreground" />
                          {selectedProduct.barcode || "Sin código de barras"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "kardex" && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                    Bitácora de Entradas y Salidas
                  </h4>

                  {isLoadingKardex ? (
                    <div className="flex items-center justify-center gap-2 py-10 text-xs text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      <span>Cargando movimientos...</span>
                    </div>
                  ) : kardexList.length === 0 ? (
                    <div className="p-6 rounded-xl border border-border bg-muted/20 text-xs text-center text-muted-foreground">
                      No se registran movimientos para este repuesto.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {kardexList.map((tx) => {
                        const isEntry = tx.type === "PURCHASE_IN" || tx.type === "ADJUSTMENT_IN" || tx.type === "INITIAL_STOCK";
                        const typeLabel =
                          tx.type === "PURCHASE_IN" ? "Entrada por Reabastecimiento" :
                          tx.type === "SALE_OUT" ? "Venta en Mostrador" :
                          tx.type === "ADJUSTMENT_IN" ? "Ingreso de Carga Masiva / Ajuste" : "Ajuste de Stock";

                        return (
                          <div key={tx.id} className="p-3 rounded-lg border border-border bg-muted/20 flex items-center justify-between text-xs">
                            <div className="flex flex-col gap-0.5">
                              <span className="font-bold text-foreground">{typeLabel}</span>
                              <span className="text-muted-foreground text-[11px]">Doc: {tx.reference_document || "Sin ref."}</span>
                              <span className="text-[10px] text-muted-foreground">Por: {tx.cashier_email}</span>
                            </div>
                            <div className="text-right">
                              <span className={`font-mono font-extrabold text-sm ${isEntry ? "text-emerald-500" : "text-red-500"}`}>
                                {isEntry ? `+${tx.quantity}` : `-${tx.quantity}`} un.
                              </span>
                              <div className="text-[10px] text-muted-foreground mt-0.5">
                                {new Date(tx.created_at).toLocaleString("es-CL", { dateStyle: "short", timeStyle: "short" })}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* MODAL DE CARGA MASIVA INTEGRADO Y FUNCIONAL */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-lg rounded-xl border border-border shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-border bg-muted/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UploadCloud className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-bold">Carga Masiva de Productos</h3>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsBulkModalOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="p-6 flex flex-col gap-4">
              <label className="border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center justify-center text-center bg-muted/10 hover:bg-muted/30 transition-colors cursor-pointer">
                <FileSpreadsheet className="h-10 w-10 text-primary mb-2" />
                <p className="text-sm font-semibold">
                  {bulkFile ? bulkFile.name : "Selecciona tu archivo Excel o CSV"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Formatos compatibles: .csv, .xlsx, .xls
                </p>
                <input
                  type="file"
                  accept=".csv, .xlsx, .xls"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>

              {isParsingBulk && (
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground py-2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span>Procesando archivo...</span>
                </div>
              )}

              {bulkParsedData.length > 0 && (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-500 flex items-center justify-between">
                  <span className="font-semibold">✓ {bulkParsedData.length} repuestos listos para importar.</span>
                  <span className="font-mono text-[10px]">Estructura validada</span>
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-muted-foreground bg-muted/20 p-3 rounded-lg border border-border">
                <span>¿No tienes la plantilla oficial?</span>
                <button
                  type="button"
                  className="text-primary font-semibold hover:underline flex items-center gap-1"
                  onClick={handleDownloadTemplate}
                >
                  <FileDown className="h-3.5 w-3.5" /> Descargar Plantilla CSV
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 border-t border-border bg-background">
              <Button variant="ghost" onClick={() => setIsBulkModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                disabled={bulkParsedData.length === 0 || isUploadingBulk}
                className="bg-primary text-primary-foreground font-semibold"
                onClick={handleProcessBulkUpload}
              >
                {isUploadingBulk ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando en Catálogo...
                  </>
                ) : (
                  `Importar ${bulkParsedData.length} Productos`
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* FORMULARIO STEPPER DE CREACIÓN INDIVIDUAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-2xl rounded-xl border border-border shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-border bg-muted/30">
              <h3 className="text-lg font-bold">Crear Ficha de Producto</h3>
              <div className="flex items-center justify-between mt-4">
                {[1, 2].map((step) => (
                  <div key={step} className="flex flex-col items-center gap-1 w-1/2 relative">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold z-10 transition-colors ${currentStep >= step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground border border-border"}`}>
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
              <Button
                variant="ghost"
                onClick={() => (currentStep === 1 ? setIsAddModalOpen(false) : setCurrentStep(1))}
              >
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
      )}
    </div>
  );
}