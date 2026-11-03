// src/app/(dashboard)/entradas/page.tsx
"use client";

import { useState, useEffect } from "react";
import { getProducts } from "@/lib/api/products";
import { registerStockEntry, getAllInventoryTransactions, InventoryTransactionRow } from "@/lib/api/transactions";
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
import { Truck, Plus, FileText, Loader2 } from "lucide-react";

export default function EntradasPage() {
  const [catalog, setCatalog] = useState<Product[]>([]);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(true);
  const [transactions, setTransactions] = useState<InventoryTransactionRow[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [quantityInput, setQuantityInput] = useState<string>("10");
  const [costPriceInput, setCostPriceInput] = useState<string>("0"); // Nuevo campo
  const [salePriceInput, setSalePriceInput] = useState<string>("0");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    setIsLoadingCatalog(true);
    const [prods, txs] = await Promise.all([
      getProducts({ is_service: false }),
      getAllInventoryTransactions(),
    ]);
    setCatalog(prods);
    setTransactions(txs.filter((t) => t.type === "PURCHASE_IN" || t.type === "INITIAL_STOCK"));
    if (prods.length > 0) {
      setSelectedProductId(prods[0].id);
      setSalePriceInput(prods[0].price.toString());
      setCostPriceInput((prods[0].cost_price || 0).toString());
    }
    setIsLoadingCatalog(false);
  };

  useEffect(() => {
    const timer = window.setTimeout(() => void loadData(), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const handleProductSelectChange = (prodId: string) => {
    setSelectedProductId(prodId);
    const prod = catalog.find((p) => p.id === prodId);
    if (prod) {
      setSalePriceInput(prod.price.toString());
      setCostPriceInput((prod.cost_price || 0).toString());
    }
  };

  const handleSubmitEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) return;

    const qty = parseInt(quantityInput, 10);
    const costPrice = parseFloat(costPriceInput);
    const newPrice = parseFloat(salePriceInput);

    if (isNaN(qty) || qty <= 0) {
      toast({ title: "Cantidad inválida", description: "Ingresa un número mayor a 0.", type: "warning" });
      return;
    }

    if (isNaN(costPrice) || costPrice < 0) {
      toast({ title: "Costo inválido", description: "El costo de compra no puede ser negativo.", type: "warning" });
      return;
    }

    setIsSubmitting(true);
    const res = await registerStockEntry({
      productId: selectedProductId,
      quantity: qty,
      referenceDocument: invoiceNumber || "FAC-RECEPCION",
      newCostPrice: costPrice,
      newSalePrice: newPrice,
    });
    setIsSubmitting(false);

    if (!res.success) {
      toast({ title: "Error en BD", description: res.error, type: "error" });
      return;
    }

    toast({ title: "Entrada Guardada en BD", description: `Recepción agregada y costo actualizado.`, type: "success" });
    setIsModalOpen(false);
    setInvoiceNumber("");
    loadData();
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Entradas de Stock</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Registro de recepciones físicas conectado con `inventory_transactions`.
          </p>
        </div>
        <div>
          <Button
            className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold shadow-sm"
            onClick={() => setIsModalOpen(true)}
            disabled={catalog.length === 0}
          >
            <Plus className="mr-2 h-4 w-4" /> Registrar Entrada de Stock
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-background/50 backdrop-blur-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="font-semibold">N° Documento</TableHead>
              <TableHead className="font-semibold">Fecha</TableHead>
              <TableHead className="font-semibold">SKU</TableHead>
              <TableHead className="font-semibold">Repuesto</TableHead>
              <TableHead className="text-right font-semibold">Cantidad</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoadingCatalog ? (
              <TableRow className="border-border">
                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto text-primary" />
                </TableCell>
              </TableRow>
            ) : transactions.length === 0 ? (
              <TableRow className="border-border">
                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                  No hay registros de entradas de stock en Supabase.
                </TableCell>
              </TableRow>
            ) : (
              transactions.map((tx) => (
                <TableRow key={tx.id} className="border-border hover:bg-muted/30">
                  <TableCell>
                    <span className="inline-flex items-center gap-1 font-mono text-xs bg-muted px-2 py-1 rounded border border-border text-foreground">
                      <FileText className="h-3 w-3 text-primary" />
                      {tx.reference_document || "S/D"}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {new Date(tx.created_at).toLocaleString("es-CL")}
                  </TableCell>
                  <TableCell className="font-mono text-xs font-semibold">
                    {tx.products?.sku || "S/K"}
                  </TableCell>
                  <TableCell className="font-medium text-foreground text-sm">
                    {tx.products?.name || "Repuesto"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-bold text-emerald-500">
                    +{tx.quantity} un.
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="bg-card border border-border rounded-xl p-6 max-w-lg w-full shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-bold">Registrar Entrada de Stock en BD</h3>
              </div>
            </div>
            <form onSubmit={handleSubmitEntry} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="invoice">N° Factura / Boleta</Label>
                <Input
                  id="invoice"
                  placeholder="Ej: FAC-8831"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="sku_select">Seleccionar Repuesto</Label>
                <select
                  id="sku_select"
                  className="flex h-9 w-full rounded-lg border border-input bg-background px-2.5 py-1 text-sm text-foreground outline-none cursor-pointer"
                  value={selectedProductId}
                  onChange={(e) => handleProductSelectChange(e.target.value)}
                >
                  {catalog.map((p) => (
                    <option key={p.id} value={p.id} className="bg-background text-foreground">
                      {p.sku} - {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="quantity">Cantidad *</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    value={quantityInput}
                    onChange={(e) => setQuantityInput(e.target.value)}
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="cost_price">Costo Compra ($) *</Label>
                  <Input
                    id="cost_price"
                    type="number"
                    min="0"
                    value={costPriceInput}
                    onChange={(e) => setCostPriceInput(e.target.value)}
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="sale_price">Precio Venta ($) *</Label>
                  <Input
                    id="sale_price"
                    type="number"
                    min="0"
                    value={salePriceInput}
                    onChange={(e) => setSalePriceInput(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="flex flex-row gap-2 pt-3 w-full border-t border-border mt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setIsModalOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1 font-semibold" disabled={isSubmitting}>
                  {isSubmitting ? "Procesando en BD..." : "Guardar en BD"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
