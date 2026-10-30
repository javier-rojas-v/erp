"use client";

import { useState, useEffect } from "react";
import { getProducts } from "@/lib/api/products";
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
import { Truck, Plus, FileText, ArrowUpRight, Loader2 } from "lucide-react";

interface StockEntryTransaction {
  id: string;              // ID Recepción (ej. ENT-501)
  invoiceNumber: string;   // reference_document (Nº Factura/Boleta)
  date: string;            // Fecha de transacción
  sku: string;             // SKU del producto
  productName: string;     // Nombre del repuesto
  quantity: number;        // Cantidad Ingresada
  salePriceUpdated: number;// Precio de venta público asignado
}

export default function EntradasPage() {
  const [catalog, setCatalog] = useState<Product[]>([]);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(true);
  const [entries, setEntries] = useState<StockEntryTransaction[]>([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedVariantId, setSelectedVariantId] = useState<string>("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [quantityInput, setQuantityInput] = useState<string>("10");
  const [salePriceInput, setSalePriceInput] = useState<string>("0");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Carga del catálogo real desde Supabase para el selector de repuestos
  useEffect(() => {
    let active = true;
    getProducts()
      .then((data) => {
        if (active) {
          setCatalog(data);
          if (data.length > 0) {
            setSelectedVariantId(data[0].variant_id || data[0].id);
            setSalePriceInput(data[0].price.toString());
          }
        }
      })
      .catch((err) => {
        console.error("Error al obtener catálogo para entradas:", err);
      })
      .finally(() => {
        if (active) setIsLoadingCatalog(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const handleProductSelectChange = (variantId: string) => {
    setSelectedVariantId(variantId);
    const prod = catalog.find((p) => (p.variant_id || p.id) === variantId);
    if (prod) {
      setSalePriceInput(prod.price.toString());
    }
  };

  const handleOpenModal = () => {
    if (catalog.length > 0) {
      const first = catalog[0];
      setSelectedVariantId(first.variant_id || first.id);
      setSalePriceInput(first.price.toString());
    } else {
      setSelectedVariantId("");
      setSalePriceInput("0");
    }
    setInvoiceNumber("");
    setQuantityInput("10");
    setIsModalOpen(true);
  };

  const handleSubmitEntry = (e: React.FormEvent) => {
    e.preventDefault();
    const targetProduct = catalog.find(
      (p) => (p.variant_id || p.id) === selectedVariantId
    );

    if (!targetProduct) {
      toast({
        title: "Producto no seleccionado",
        description: "Selecciona un repuesto válido de la lista.",
        type: "warning",
      });
      return;
    }

    const qty = parseInt(quantityInput, 10);
    const newPrice = parseFloat(salePriceInput);

    if (isNaN(qty) || qty <= 0) {
      toast({
        title: "Cantidad inválida",
        description: "Ingresa un número mayor a 0.",
        type: "warning",
      });
      return;
    }

    if (isNaN(newPrice) || newPrice <= 0) {
      toast({
        title: "Precio inválido",
        description: "Ingresa un precio de venta mayor a 0.",
        type: "warning",
      });
      return;
    }

    setIsSubmitting(true);

    setTimeout(() => {
      // 1. Actualizar catálogo local
      setCatalog((prev) =>
        prev.map((p) =>
          (p.variant_id || p.id) === selectedVariantId
            ? { ...p, price: newPrice, stock: p.stock + qty }
            : p
        )
      );

      // 2. Registrar movimiento en la lista de entradas
      const newTransaction: StockEntryTransaction = {
        id: `ENT-${500 + entries.length + 1}`,
        invoiceNumber: invoiceNumber.trim() || "S/D",
        date: "Hace un momento",
        sku: targetProduct.sku,
        productName: targetProduct.name,
        quantity: qty,
        salePriceUpdated: newPrice,
      };

      setEntries((prev) => [newTransaction, ...prev]);
      setIsSubmitting(false);
      setIsModalOpen(false);

      toast({
        title: "Entrada Registrada",
        description: `Se sumaron ${qty} un. a ${targetProduct.sku}. Nuevo Precio Venta: $${newPrice.toLocaleString(
          "es-CL"
        )}`,
        type: "success",
      });
    }, 400);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Entradas de Stock (Recepción de Mercadería)
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Registro de recepciones físicas, actualización simultánea de precios de venta y control de stock (`PURCHASE_IN`).
          </p>
        </div>
        <div>
          <Button
            className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold shadow-sm"
            onClick={handleOpenModal}
            disabled={catalog.length === 0}
          >
            <Plus className="mr-2 h-4 w-4" />
            Registrar Entrada de Stock
          </Button>
        </div>
      </div>

      {/* Tabla de Entradas */}
      <div className="rounded-xl border border-border bg-background/50 backdrop-blur-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="font-semibold">ID Recepción</TableHead>
              <TableHead className="font-semibold">Nº Factura / Documento</TableHead>
              <TableHead className="font-semibold">Fecha</TableHead>
              <TableHead className="font-semibold">SKU</TableHead>
              <TableHead className="font-semibold">Repuesto</TableHead>
              <TableHead className="text-right font-semibold">Cantidad Ingresada</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.length === 0 ? (
              <TableRow className="border-border">
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  No hay registros de entradas de stock disponibles.
                </TableCell>
              </TableRow>
            ) : (
              entries.map((entry) => (
                <TableRow key={entry.id} className="border-border hover:bg-muted/30">
                  <TableCell className="font-mono font-bold text-primary">
                    {entry.id}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1 font-mono text-xs bg-muted px-2 py-1 rounded border border-border text-foreground">
                      <FileText className="h-3 w-3 text-primary" />
                      {entry.invoiceNumber}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {entry.date}
                  </TableCell>
                  <TableCell className="font-mono text-xs font-semibold">
                    {entry.sku}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-foreground text-sm">
                      {entry.productName}
                    </div>
                    <div className="text-[11px] text-emerald-500 font-mono mt-0.5 flex items-center gap-1">
                      <ArrowUpRight className="h-3 w-3" />
                      Precio Venta Asignado: ${entry.salePriceUpdated.toLocaleString("es-CL")}
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-bold text-emerald-500">
                    +{entry.quantity} un.
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modal Registrar Entrada */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="bg-card border border-border rounded-xl p-6 max-w-lg w-full shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-bold">Registrar Entrada de Stock</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-muted-foreground hover:text-foreground text-sm p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitEntry} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="invoice">Nº Factura / Boleta (`reference_document`)</Label>
                <Input
                  id="invoice"
                  placeholder="Ej: FAC-8831"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="sku_select">Seleccionar Repuesto a Ingresar</Label>
                {isLoadingCatalog ? (
                  <div className="flex items-center gap-2 h-9 text-xs text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Cargando catálogo...
                  </div>
                ) : (
                  <select
                    id="sku_select"
                    className="flex h-9 w-full rounded-lg border border-input bg-background px-2.5 py-1 text-sm text-foreground outline-none focus-visible:border-ring"
                    value={selectedVariantId}
                    onChange={(e) => handleProductSelectChange(e.target.value)}
                  >
                    {catalog.map((p) => {
                      const idVal = p.variant_id || p.id;
                      return (
                        <option
                          key={idVal}
                          value={idVal}
                          className="bg-background text-foreground"
                        >
                          {p.sku} - {p.name}
                        </option>
                      );
                    })}
                  </select>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="quantity">Cantidad a Sumar (`current_stock`)</Label>
                  <Input
                    id="quantity"
                    type="number"
                    placeholder="10"
                    min="1"
                    value={quantityInput}
                    onChange={(e) => setQuantityInput(e.target.value)}
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="sale_price">Precio de Venta público ($)</Label>
                  <Input
                    id="sale_price"
                    type="number"
                    placeholder="28000"
                    value={salePriceInput}
                    onChange={(e) => setSalePriceInput(e.target.value)}
                    required
                  />
                  <span className="text-[10px] text-muted-foreground">
                    Pre-llenado con `sale_price` actual
                  </span>
                </div>
              </div>

              <div className="flex flex-row gap-2 pt-3 w-full border-t border-border mt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="flex-1 font-semibold"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Guardando..." : "Guardar Entrada de Stock"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}