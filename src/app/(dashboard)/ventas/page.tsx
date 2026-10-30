"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { getProducts } from "@/lib/api/products";
import { Product, CartItem } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  Wrench,
  Tag,
  Barcode,
  Loader2,
} from "lucide-react";

export default function VentasPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<
    "Efectivo" | "Transferencia" | "Tarjeta"
  >("Efectivo");
  const [isLoading, setIsLoading] = useState(true);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Carga dinámica desde Supabase
  useEffect(() => {
    let active = true;
    getProducts()
      .then((data) => {
        if (active) setProducts(data);
      })
      .catch((error) => console.error("Error cargando catálogo desde Supabase:", error))
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (searchInputRef.current && !isLoading) {
      searchInputRef.current.focus();
    }
  }, [isLoading]);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return products;

    return products.filter((product) => {
      const matchName = product.name.toLowerCase().includes(q);
      const matchSku = product.sku.toLowerCase().includes(q);
      const matchOem = product.part_number_factory?.toLowerCase().includes(q);
      const matchBrand = product.brand.toLowerCase().includes(q);
      const matchBarcode = product.barcode?.toLowerCase().includes(q);

      return matchName || matchSku || matchOem || matchBrand || matchBarcode;
    });
  }, [products, searchQuery]);

  const addProductToCart = (product: Product): boolean => {
    const targetVariantId = product.variant_id || product.id;
    const existingItem = cart.find((item) => item.variant_id === targetVariantId);
    const currentQtyInCart = existingItem ? existingItem.quantity : 0;

    if (!product.is_service && currentQtyInCart >= product.stock) {
      toast({
        title: "Límite de stock alcanzado",
        description: `No hay más stock disponible de "${product.name}". (Disponible: ${product.stock} un.)`,
        type: "warning",
      });
      return false;
    }

    setCart((prev) => {
      const index = prev.findIndex((item) => item.variant_id === targetVariantId);
      if (index > -1) {
        return prev.map((item, idx) =>
          idx === index ? { ...item, quantity: item.quantity + 1 } : item
        );
      }

      return [
        ...prev,
        {
          variant_id: targetVariantId,
          product_id: product.id,
          sku: product.sku,
          name: product.name,
          price: product.price,
          quantity: 1,
          stock: product.stock,
          is_service: product.is_service || false,
        },
      ];
    });

    return true;
  };

  const addServiceItem = (name: string, price: number, serviceCode: string) => {
    const serviceVariantId = `srv-${serviceCode.toLowerCase()}`;

    setCart((prev) => {
      const existing = prev.find((item) => item.variant_id === serviceVariantId);
      if (existing) {
        return prev.map((item) =>
          item.variant_id === serviceVariantId
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      return [
        ...prev,
        {
          variant_id: serviceVariantId,
          sku: serviceCode,
          name: name,
          price: price,
          quantity: 1,
          stock: 999999,
          is_service: true,
        },
      ];
    });

    toast({
      title: "Servicio Agregado",
      description: `${name} ($${price.toLocaleString("es-CL")}) agregado al ticket.`,
      type: "success",
    });
  };

  const handleKeyDownSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const term = searchQuery.trim().toLowerCase();
      if (!term) return;

      const exactMatches = products.filter(
        (p) =>
          (p.barcode && p.barcode.toLowerCase() === term) ||
          p.sku.toLowerCase() === term ||
          (p.part_number_factory &&
            p.part_number_factory.toLowerCase() === term)
      );

      if (exactMatches.length === 1) {
        const productToAdd = exactMatches[0];
        const added = addProductToCart(productToAdd);
        if (added) {
          toast({
            title: "Producto Escaneado",
            description: `Se agregó ${productToAdd.name} al ticket.`,
            type: "success",
          });
          setSearchQuery("");
        }
      } else if (filteredProducts.length === 1) {
        const productToAdd = filteredProducts[0];
        const added = addProductToCart(productToAdd);
        if (added) {
          setSearchQuery("");
        }
      } else if (exactMatches.length === 0 && filteredProducts.length === 0) {
        toast({
          title: "Producto no encontrado",
          description: `No existe ningún repuesto con el código o código de barras: "${searchQuery}".`,
          type: "error",
        });
      }
    }
  };

  const updateQuantity = (variant_id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.variant_id === variant_id) {
            const newQty = item.quantity + delta;

            if (delta > 0 && !item.is_service && newQty > item.stock) {
              toast({
                title: "Stock máximo alcanzado",
                description: `No puedes agregar más de ${item.stock} unidades disponibles de este repuesto.`,
                type: "warning",
              });
              return item;
            }

            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeFromCart = (variant_id: string) => {
    setCart((prev) => prev.filter((item) => item.variant_id !== variant_id));
  };

  const totalAmount = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handleCheckout = () => {
    if (cart.length === 0) return;
    toast({
      title: "Venta registrada en sesión",
      description: "Transacción procesada correctamente en la caja.",
      type: "success",
    });
    setIsSuccessModalOpen(true);
    setCart([]);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Terminal de Ventas (Caja)</h1>
        <p className="text-muted-foreground text-sm">
          Facturación rápida en mesón, control de servicios y rebaja de stock en tiempo real.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground mr-1">
              Servicios Rápidos:
            </span>
            <Button
              variant="outline"
              size="sm"
              className="border-border bg-card hover:bg-muted font-medium text-xs"
              onClick={() =>
                addServiceItem(
                  "Mano de Obra: Cambio de Aceite y Filtro",
                  15000,
                  "SRV-ACEITE"
                )
              }
            >
              <Wrench className="mr-1.5 h-3.5 w-3.5 text-primary" />
              + Cambio de Aceite ($15.000)
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-border bg-card hover:bg-muted font-medium text-xs"
              onClick={() =>
                addServiceItem(
                  "Mano de Obra: Cambio de Pastillas de Freno",
                  20000,
                  "SRV-PASTILLAS"
                )
              }
            >
              <Wrench className="mr-1.5 h-3.5 w-3.5 text-primary" />
              + Cambio de Pastillas ($20.000)
            </Button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              autoFocus
              type="search"
              placeholder="Buscar por SKU, Nº Parte (OEM), nombre o marca..."
              className="pl-9 h-11 bg-background border-border text-sm shadow-xs focus-visible:ring-primary"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDownSearch}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border">
              <Barcode className="h-3 w-3 text-primary" />
              <span>Escáner Activo</span>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-background/50 backdrop-blur-sm overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="font-semibold">Repuesto / Marca</TableHead>
                  <TableHead className="text-right font-semibold">Precio</TableHead>
                  <TableHead className="text-right font-semibold">Stock</TableHead>
                  <TableHead className="text-center font-semibold">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow className="border-border">
                    <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                        <span>Cargando catálogo desde Supabase...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredProducts.length === 0 ? (
                  <TableRow className="border-border">
                    <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                      No hay repuestos registrados en el catálogo.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProducts.map((product) => {
                    const isCriticalStock = product.stock <= product.min_stock;
                    const isOutOfStock = product.stock <= 0 && !product.is_service;

                    return (
                      <TableRow
                        key={product.variant_id || product.id}
                        className="border-border hover:bg-muted/30"
                      >
                        <TableCell>
                          <div className="font-medium text-foreground">{product.name}</div>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="font-mono text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                              SKU: {product.sku}{" "}
                              {product.part_number_factory
                                ? `| OEM: ${product.part_number_factory}`
                                : ""}
                            </span>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Tag className="h-3 w-3" /> {product.brand}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-semibold text-foreground">
                          ${product.price.toLocaleString("es-CL")}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          <span
                            className={
                              isOutOfStock
                                ? "text-muted-foreground/60 font-normal line-through"
                                : isCriticalStock
                                ? "text-red-500 font-bold"
                                : "text-muted-foreground font-medium"
                            }
                          >
                            {product.stock} un.
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            size="sm"
                            disabled={isOutOfStock}
                            onClick={() => addProductToCart(product)}
                            className="h-8 px-3 text-xs font-semibold"
                          >
                            {isOutOfStock ? "Agotado" : "Agregar"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="lg:col-span-5 flex flex-col rounded-xl border border-border bg-card p-6 shadow-sm sticky top-6">
          <div className="flex items-center justify-between pb-4 border-b border-border">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold tracking-tight">Ticket de Venta Actual</h2>
            </div>
            <span className="text-xs text-muted-foreground bg-secondary px-2.5 py-1 rounded-md font-mono font-semibold">
              {cart.reduce((acc, item) => acc + item.quantity, 0)} ítems
            </span>
          </div>

          <div className="flex flex-col gap-3 py-4 max-h-[320px] overflow-y-auto divide-y divide-border/50">
            {cart.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-sm flex flex-col items-center gap-2">
                <ShoppingCart className="h-8 w-8 text-muted-foreground/40" />
                <span>La caja está libre. Escanea un código o agrega repuestos para comenzar.</span>
              </div>
            ) : (
              cart.map((item) => {
                const isMaxReached = !item.is_service && item.quantity >= item.stock;

                return (
                  <div
                    key={item.variant_id}
                    className="pt-3 first:pt-0 flex items-center justify-between gap-2"
                  >
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="font-medium text-sm truncate flex items-center gap-1.5">
                        {item.name}
                        {item.is_service && (
                          <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1.5 py-0.2 rounded uppercase font-bold">
                            Servicio
                          </span>
                        )}
                      </span>
                      <span className="text-xs text-muted-foreground font-mono">
                        ${item.price.toLocaleString("es-CL")} c/u{" "}
                        {!item.is_service && `(Máx: ${item.stock})`}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="outline"
                        size="icon-xs"
                        onClick={() => updateQuantity(item.variant_id, -1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="text-xs font-semibold w-6 text-center tabular-nums">
                        {item.quantity}
                      </span>
                      <Button
                        variant="outline"
                        size="icon-xs"
                        disabled={isMaxReached}
                        onClick={() => updateQuantity(item.variant_id, 1)}
                        className={isMaxReached ? "opacity-50 cursor-not-allowed" : ""}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        className="text-destructive hover:bg-destructive/10 ml-1"
                        onClick={() => removeFromCart(item.variant_id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="flex flex-col gap-2 py-3 border-t border-border">
            <span className="text-xs font-medium text-muted-foreground">Método de Pago:</span>
            <div className="grid grid-cols-3 gap-2">
              {(["Efectivo", "Transferencia", "Tarjeta"] as const).map((method) => (
                <Button
                  key={method}
                  variant={paymentMethod === method ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPaymentMethod(method)}
                  className="text-xs font-medium"
                >
                  {method}
                </Button>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-border flex flex-col gap-4 mt-auto">
            <div className="flex items-center justify-between text-lg font-bold">
              <span>Total a Cobrar:</span>
              <span className="text-primary tabular-nums text-2xl font-black">
                ${totalAmount.toLocaleString("es-CL")}
              </span>
            </div>
            <Button
              className="w-full h-11 text-base bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md"
              disabled={cart.length === 0}
              onClick={handleCheckout}
            >
              Completar Venta ({paymentMethod})
            </Button>
          </div>
        </div>
      </div>

      {isSuccessModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs">
          <div className="bg-card border border-border rounded-xl p-6 max-w-sm w-full mx-4 flex flex-col items-center text-center shadow-xl">
            <div className="h-12 w-12 rounded-full bg-emerald-500/15 text-emerald-500 flex items-center justify-center mb-4">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold">¡Venta Registrada con Éxito!</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-6">
              Transacción finalizada en la terminal de ventas.
            </p>
            <Button
              className="w-full font-semibold"
              onClick={() => setIsSuccessModalOpen(false)}
            >
              Siguiente Venta
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}