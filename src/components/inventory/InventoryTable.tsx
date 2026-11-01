// components/inventory/InventoryTable.tsx
"use client";

import { Product } from "@/types";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tag, AlertTriangle, Loader2 } from "lucide-react";

interface InventoryTableProps {
  products: Product[];
  isLoading: boolean;
  onSelectProduct: (product: Product) => void;
}

export function InventoryTable({ products, isLoading, onSelectProduct }: InventoryTableProps) {
  return (
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
          ) : products.length === 0 ? (
            <TableRow className="border-border">
              <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                No se encontraron repuestos registrados.
              </TableCell>
            </TableRow>
          ) : (
            products.map((product) => {
              const isLowStock = product.stock <= product.min_stock;
              const isOutOfStock = product.stock === 0;
              return (
                <TableRow key={product.id} className="border-border hover:bg-muted/30 transition-colors">
                  <TableCell>
                    <div className="font-mono text-sm font-bold text-primary">{product.sku}</div>
                    <div className="text-xs text-muted-foreground mt-0.5 font-mono">
                      OEM: {product.part_number_factory || "S/I"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-semibold text-foreground text-sm">{product.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{product.category}</div>
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
                      onClick={() => onSelectProduct(product)}
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
  );
}