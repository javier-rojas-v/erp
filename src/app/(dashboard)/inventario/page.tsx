"use client";

import { useState, useMemo } from "react";
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
import { 
  Search, Plus, FileSpreadsheet, Download, UploadCloud, 
  Tag, X, Settings2, Box, CarFront, History, ChevronRight, CheckCircle2, FileDown
} from "lucide-react";

// --- MOCK DATA ---
const ADVANCED_CATALOG = [
  {
    id: "uuid-p1",
    variant_id: "uuid-v1",
    sku: "OIL-10W40",
    part_number_factory: "MOB-10W40-4L",
    name: "Aceite Semi-Sintético 10W40 4L",
    category: "Lubricantes y Aceites",
    brand: "Mobil",
    price: 28000,
    stock: 12,
    min_stock: 4,
    specifications: { viscosidad: "10W40", volumen_litros: "4L", norma_api: "SN/CF" },
    compatible_vehicles: ["Universal / Multimarca"],
    kardex: [
      { id: "tx-1", date: "2026-10-25", type: "PURCHASE_IN", qty: 20, doc: "FAC-9921", user: "Javier R." },
      { id: "tx-2", date: "2026-10-28", type: "SALE_OUT", qty: -8, doc: "VEN-1040", user: "Javier R." }
    ]
  },
  {
    id: "uuid-p2",
    variant_id: "uuid-v2",
    sku: "FLT-001",
    part_number_factory: "90915-YZZF2",
    name: "Filtro de Aceite Blindado",
    category: "Filtros",
    brand: "Mann Filter",
    price: 8500,
    stock: 3,
    min_stock: 5,
    specifications: { tipo: "Blindado", diametro_mm: "65 mm", rosca: "3/4-16 UNF" },
    compatible_vehicles: ["Toyota Yaris 1.5L 2018-2022", "Toyota Corolla 1.8L 2019-2023"],
    kardex: [
      { id: "tx-3", date: "2026-10-10", type: "PURCHASE_IN", qty: 10, doc: "FAC-8810", user: "Admin" },
      { id: "tx-4", date: "2026-10-29", type: "SALE_OUT", qty: -7, doc: "VEN-1042", user: "Javier R." }
    ]
  },
  {
    id: "uuid-p3",
    variant_id: "uuid-v3",
    sku: "OIL-5W30-CAST",
    part_number_factory: "CAS-5W30-4L",
    name: "Aceite Sintético EDGE 5W30 4L",
    category: "Lubricantes y Aceites",
    brand: "Castrol",
    price: 34900,
    stock: 18,
    min_stock: 6,
    specifications: { viscosidad: "5W30", volumen_litros: "4L", norma_api: "SP / ILSAC GF-6" },
    compatible_vehicles: ["Universal / Multimarca"],
    kardex: [
      { id: "tx-5", date: "2026-10-15", type: "PURCHASE_IN", qty: 25, doc: "FAC-1002", user: "Javier R." },
      { id: "tx-6", date: "2026-10-20", type: "SALE_OUT", qty: -7, doc: "VEN-1011", user: "Javier R." }
    ]
  }
];

export default function InventarioPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  
  // Estados de UI
  type InventoryProduct = (typeof ADVANCED_CATALOG)[number];
  const [selectedProduct, setSelectedProduct] = useState<InventoryProduct | null>(null);
  const [activeTab, setActiveTab] = useState("info");
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Filtrado de la grilla
  const filteredCatalog = useMemo(() => {
    return ADVANCED_CATALOG.filter(p => {
      const matchSearch = p.sku.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.part_number_factory.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchStatus = filterStatus === "ALL" 
        ? true 
        : filterStatus === "CRITICAL" ? p.stock <= p.min_stock && p.stock > 0
        : filterStatus === "OUT" ? p.stock === 0 : true;

      return matchSearch && matchStatus;
    });
  }, [searchQuery, filterStatus]);

  return (
    <div className="flex flex-col gap-6 relative">
      {/* 1. HEADER & BUSCADOR */}
      <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-4">
        <div className="flex-1 w-full max-w-2xl">
          <h1 className="text-3xl font-bold tracking-tight">Catálogo e Inventario</h1>
          <p className="text-sm text-muted-foreground mt-1">Gestión centralizada de repuestos, marcas y existencias.</p>
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar repuesto por Marca, Nombre, SKU o N° de Parte..."
              className="pl-10 h-12 text-base bg-card border-border shadow-sm focus-visible:ring-primary"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        
        <div className="flex items-center gap-2 pt-2 xl:pt-10">
          <Button variant="outline" className="h-10" onClick={() => setIsImportModalOpen(true)}>
            <FileSpreadsheet className="mr-2 h-4 w-4 text-emerald-500" /> Carga Masiva (CSV)
          </Button>
          <Button variant="outline" size="icon" className="h-10 w-10">
            <Download className="h-4 w-4" />
          </Button>
          <Button className="h-10 bg-primary text-primary-foreground font-semibold" onClick={() => setIsAddModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Nuevo Producto
          </Button>
        </div>
      </div>

      {/* 2. FILTROS RÁPIDOS */}
      <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl border border-border bg-card shadow-sm">
        <div className="flex items-center gap-2 border-r border-border pr-4">
          <Settings2 className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filtros:</span>
        </div>
        
        {/* Filtro Automotriz */}
        <select className="h-8 rounded-md border border-input bg-background px-2 text-xs outline-none">
          <option value="">Marca de Vehículo</option>
          <option value="toyota">Toyota</option>
          <option value="chevrolet">Chevrolet</option>
        </select>
        <select disabled className="h-8 rounded-md border border-input bg-background/50 px-2 text-xs outline-none opacity-50">
          <option>Modelo (Seleccione Marca)</option>
        </select>
        <select disabled className="h-8 rounded-md border border-input bg-background/50 px-2 text-xs outline-none opacity-50">
          <option>Año</option>
        </select>

        <div className="h-4 w-px bg-border mx-1" />

        {/* Filtro de Estado de Stock */}
        <select 
          className="h-8 rounded-md border border-input bg-background px-2 text-xs outline-none"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="ALL">Todos los Estados</option>
          <option value="CRITICAL">Stock Crítico</option>
          <option value="OUT">Sin Stock</option>
        </select>
      </div>

      {/* 3. TABLA PRINCIPAL DE DATOS */}
      <div className="rounded-xl border border-border bg-background/50 backdrop-blur-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow className="border-border">
              <TableHead>SKU / N° Parte</TableHead>
              <TableHead>Producto y Categoría</TableHead>
              <TableHead>Marca</TableHead>
              <TableHead className="text-right">Precio Venta</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead className="text-center">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCatalog.map((product) => (
              <TableRow key={product.id} className="border-border hover:bg-muted/30">
                <TableCell>
                  <div className="font-mono text-sm font-bold text-primary">{product.sku}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">N° Parte: {product.part_number_factory}</div>
                </TableCell>
                <TableCell>
                  <div className="font-semibold text-foreground text-sm">{product.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{product.category}</div>
                </TableCell>
                <TableCell>
                  {/* Badge de Marca con alta visibilidad para aceites y lubricantes */}
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-extrabold uppercase tracking-wide ${
                    product.category === "Lubricantes y Aceites"
                      ? "bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-xs"
                      : "bg-primary/10 text-primary border border-primary/20"
                  }`}>
                    <Tag className="h-3.5 w-3.5" />
                    {product.brand}
                  </span>
                </TableCell>
                <TableCell className="text-right tabular-nums font-bold text-base">
                  ${product.price.toLocaleString("es-CL")}
                </TableCell>
                <TableCell className="text-right">
                  <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold tabular-nums ${
                    product.stock <= product.min_stock ? "bg-red-500/10 text-red-500 border border-red-500/20" : "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                  }`}>
                    {product.stock} un.
                  </span>
                </TableCell>
                <TableCell className="text-center">
                  <Button variant="secondary" size="sm" onClick={() => setSelectedProduct(product)}>
                    Ver Detalles
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* 4. PANEL LATERAL DE DETALLES (DRAWER) */}
      {selectedProduct && (
        <>
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity" 
            onClick={() => setSelectedProduct(null)} 
          />
          
          <div className="fixed inset-y-0 right-0 z-50 w-full md:w-[580px] bg-card shadow-2xl border-l border-border flex flex-col animate-in slide-in-from-right-full duration-300">
            {/* Header del Drawer */}
            <div className="flex items-center justify-between p-6 border-b border-border bg-muted/20">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-bold uppercase ${
                    selectedProduct.category === "Lubricantes y Aceites"
                      ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                      : "bg-primary/10 text-primary"
                  }`}>
                    <Tag className="h-3 w-3" />
                    {selectedProduct.brand}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                    {selectedProduct.sku}
                  </span>
                </div>
                <h2 className="text-xl font-bold">{selectedProduct.name}</h2>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setSelectedProduct(null)}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Pestañas (Tabs) */}
            <div className="flex items-center px-6 border-b border-border bg-background">
              {[
                { id: "info", icon: Box, label: "Información & Stock" },
                { id: "specs", icon: Settings2, label: "Especificaciones Técnicas" },
                { id: "vehicles", icon: CarFront, label: "Vehículos Compatibles" },
                { id: "kardex", icon: History, label: "Historial (Kardex)" }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <tab.icon className="h-4 w-4" /> {tab.label}
                </button>
              ))}
            </div>

            {/* Contenido del Drawer */}
            <div className="flex-1 overflow-y-auto p-6">
              
              {/* Tab 1: Info Básica & Stock */}
              {activeTab === "info" && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-muted/40 border border-border">
                      <p className="text-xs text-muted-foreground font-medium">Precio de Venta Público</p>
                      <p className="text-2xl font-bold text-foreground mt-1">${selectedProduct.price.toLocaleString("es-CL")}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-muted/40 border border-border">
                      <p className="text-xs text-muted-foreground font-medium">Stock Disponible</p>
                      <p className="text-2xl font-bold text-foreground mt-1">{selectedProduct.stock} unidades</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Umbral mínimo: {selectedProduct.min_stock} un.</p>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border border-border bg-background space-y-3">
                    <h3 className="text-sm font-bold border-b border-border pb-2">Ficha Comercial</h3>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Marca del Producto</p>
                        <p className="font-bold text-foreground mt-0.5">{selectedProduct.brand}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Categoría</p>
                        <p className="font-medium text-foreground mt-0.5">{selectedProduct.category}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">N° Parte Fabricante (OEM)</p>
                        <p className="font-mono text-xs text-foreground mt-0.5">{selectedProduct.part_number_factory}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">SKU Interno</p>
                        <p className="font-mono text-xs text-foreground mt-0.5">{selectedProduct.sku}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Especificaciones Técnicas */}
              {activeTab === "specs" && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">Especificaciones técnicas registradas para este repuesto:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {Object.entries(selectedProduct.specifications).map(([key, value]) => (
                      <div key={key} className="flex flex-col p-3 rounded-lg border border-border bg-muted/20">
                        <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">{key.replace("_", " ")}</span>
                        <span className="font-medium text-sm mt-0.5 text-foreground">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab 3: Vehículos Compatibles */}
              {activeTab === "vehicles" && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">Modelos y versiones de vehículos compatibles con esta pieza:</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedProduct.compatible_vehicles.map((v: string, i: number) => (
                      <span key={i} className="inline-flex items-center px-3 py-1.5 rounded-full border border-blue-500/20 bg-blue-500/10 text-blue-400 text-xs font-medium">
                        <CarFront className="h-3.5 w-3.5 mr-1.5" /> {v}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab 4: Historial (Kardex) */}
              {activeTab === "kardex" && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">Registro de entradas, salidas y movimientos de stock:</p>
                  <div className="rounded-lg border border-border overflow-hidden">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          <TableHead className="text-xs">Fecha</TableHead>
                          <TableHead className="text-xs">Tipo Movimiento</TableHead>
                          <TableHead className="text-xs text-right">Cantidad</TableHead>
                          <TableHead className="text-xs">Documento Ref.</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedProduct.kardex.map((tx) => (
                          <TableRow key={tx.id}>
                            <TableCell className="text-xs whitespace-nowrap">{tx.date}</TableCell>
                            <TableCell>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                tx.type === 'PURCHASE_IN' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
                              }`}>
                                {tx.type === 'PURCHASE_IN' ? 'Entrada (Compra)' : 'Salida (Venta)'}
                              </span>
                            </TableCell>
                            <TableCell className="text-xs text-right font-mono font-bold">{tx.qty > 0 ? `+${tx.qty}` : tx.qty}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{tx.doc}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* 5. FORMULARIO DE CARGA (STEPPER) */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-2xl rounded-xl border border-border shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Stepper Header */}
            <div className="px-6 py-4 border-b border-border bg-muted/30">
              <h3 className="text-lg font-bold">Crear Ficha de Producto</h3>
              <div className="flex items-center justify-between mt-4">
                {[1, 2, 3, 4].map(step => (
                  <div key={step} className="flex flex-col items-center gap-1 w-1/4 relative">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold z-10 transition-colors ${
                      currentStep >= step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground border border-border"
                    }`}>
                      {step}
                    </div>
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground mt-1 text-center">
                      {step === 1 ? "General" : step === 2 ? "Precio y Stock" : step === 3 ? "Especificaciones" : "Vehículos"}
                    </span>
                    {step < 4 && (
                      <div className={`absolute top-4 left-1/2 w-full h-[2px] -z-0 ${currentStep > step ? "bg-primary" : "bg-border"}`} />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Stepper Body */}
            <div className="p-6 min-h-[280px]">
              {currentStep === 1 && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label htmlFor="prod_name">Nombre del Repuesto</Label>
                    <Input id="prod_name" placeholder="Ej: Aceite Sintético 5W30 Mobil 1 4L" className="mt-1"/>
                  </div>
                  <div>
                    <Label htmlFor="prod_brand" className="text-primary font-bold">Marca del Producto *</Label>
                    <Input id="prod_brand" placeholder="Ej: Mobil, Castrol, Bosch" className="mt-1 border-primary/40 focus-visible:ring-primary"/>
                  </div>
                  <div>
                    <Label htmlFor="prod_category">Categoría</Label>
                    <select id="prod_category" className="w-full h-8 mt-1 rounded-md bg-transparent border border-input text-sm px-2">
                      <option className="bg-background">Lubricantes y Aceites</option>
                      <option className="bg-background">Filtros</option>
                      <option className="bg-background">Frenos</option>
                      <option className="bg-background">Motor y Correas</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="prod_sku">SKU / Código Interno</Label>
                    <Input id="prod_sku" placeholder="OIL-5W30-MOB" className="mt-1"/>
                  </div>
                  <div>
                    <Label htmlFor="prod_oem">N° Parte Fabricante (OEM)</Label>
                    <Input id="prod_oem" placeholder="MOB-5W30-4L" className="mt-1"/>
                  </div>
                </div>
              )}

              {currentStep === 2 && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label htmlFor="prod_price">Precio de Venta Público ($)</Label>
                    <Input id="prod_price" type="number" placeholder="28000" className="mt-1 text-lg font-bold"/>
                  </div>
                  <div>
                    <Label htmlFor="prod_stock">Stock Inicial</Label>
                    <Input id="prod_stock" type="number" placeholder="10" className="mt-1"/>
                  </div>
                  <div>
                    <Label htmlFor="prod_min_stock">Alerta Mínima de Stock</Label>
                    <Input id="prod_min_stock" type="number" placeholder="4" className="mt-1"/>
                  </div>
                </div>
              )}

              {currentStep === 3 && (
                <div className="flex flex-col gap-4">
                  <p className="text-sm text-muted-foreground">Especificaciones técnicas para la categoría seleccionada:</p>
                  <div className="grid grid-cols-2 gap-4 bg-muted/20 p-4 rounded-lg border border-border">
                    <div>
                      <Label htmlFor="spec_visc">Viscosidad</Label>
                      <select id="spec_visc" className="w-full h-8 mt-1 rounded-md bg-transparent border border-input text-sm px-2">
                        <option className="bg-background">10W40</option>
                        <option className="bg-background">5W30</option>
                        <option className="bg-background">20W50</option>
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="spec_vol">Volumen (Litros)</Label>
                      <Input id="spec_vol" placeholder="Ej: 4L" className="mt-1"/>
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor="spec_norm">Norma API / Especificación</Label>
                      <Input id="spec_norm" placeholder="Ej: SN/CF" className="mt-1"/>
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 4 && (
                <div className="flex flex-col gap-4">
                  <Label>Agregar Vehículos Compatibles</Label>
                  <div className="flex gap-2">
                    <Input placeholder="Buscar marca o modelo de vehículo..." className="flex-1" />
                    <Button variant="outline">Añadir Vehículo</Button>
                  </div>
                  <div className="h-32 border border-dashed border-border rounded-lg bg-muted/10 flex items-center justify-center text-sm text-muted-foreground">
                    Aún no has agregado vehículos compatibles.
                  </div>
                </div>
              )}
            </div>

            {/* Stepper Footer */}
            <div className="flex items-center justify-between p-4 border-t border-border bg-background">
              <Button variant="ghost" onClick={() => currentStep === 1 ? setIsAddModalOpen(false) : setCurrentStep(s => s - 1)}>
                {currentStep === 1 ? "Cancelar" : "Atrás"}
              </Button>
              {currentStep < 4 ? (
                <Button onClick={() => setCurrentStep(s => s + 1)}>
                  Siguiente <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold" onClick={() => setIsAddModalOpen(false)}>
                  <CheckCircle2 className="mr-2 h-4 w-4"/> Guardar Producto
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 6. IMPORTACIÓN MASIVA (Mantener intacto) */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-lg rounded-xl border border-border shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold flex items-center gap-2"><FileSpreadsheet className="text-emerald-500 h-5 w-5"/> Importación Masiva</h3>
              <Button variant="ghost" size="icon" onClick={() => setIsImportModalOpen(false)}><X className="h-4 w-4"/></Button>
            </div>
            
            <Button variant="outline" className="w-full mb-6 border-dashed text-primary border-primary/50 bg-primary/5">
              <FileDown className="mr-2 h-4 w-4" /> Descargar Plantilla Oficial (.xlsx)
            </Button>

            <div className="border-2 border-dashed border-border rounded-lg p-10 bg-muted/20 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-muted/40 transition-colors">
              <UploadCloud className="h-10 w-10 text-muted-foreground mb-4" />
              <p className="text-sm font-medium">Arrastra tu archivo lleno aquí</p>
              <p className="text-xs text-muted-foreground mt-1">Soporta .csv o .xlsx. El sistema validará los productos automáticamente.</p>
            </div>
            
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="ghost" onClick={() => setIsImportModalOpen(false)}>Cancelar</Button>
              <Button disabled>Procesar Archivo</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
