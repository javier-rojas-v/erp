"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { getProducts } from "@/lib/api/products";
import { processPOSSale } from "@/lib/api/transactions";
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
  Tag,
  Barcode,
  Loader2,
  Wrench
} from "lucide-react";

export default function VentasPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<"Efectivo" | "Transferencia" | "Tarjeta">("Efectivo");
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Helper para diferir notificaciones fuera del ciclo de renderizado de React
  const safeToast = (options: Parameters<typeof toast>[0]) => {
    setTimeout(() => {
      toast(options);
    }, 0);
  };

  const loadProducts = async () => {
    setIsLoading(true);
    const data = await getProducts();
    setProducts(data);
    setIsLoading(false);
  };

  useEffect(() => {
    loadProducts();
    if (searchInputRef.current) searchInputRef.current.focus();
  }, []);

  const addProductToCart = (product: Product): boolean => {
    const targetVariantId = product.variant_id || product.id;
    const existingItem = cart.find((item) => item.variant_id === targetVariantId);
    const currentQtyInCart = existingItem ? existingItem.quantity : 0;

    if (!product.is_service && currentQtyInCart >= product.stock) {
      safeToast({
        title: "Límite de stock",
        description: `No hay más stock disponible de "${product.name}".`,
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
        return prev.map((item) => item.variant_id === serviceVariantId ? { ...item, quantity: item.quantity + 1 } : item);
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

    safeToast({
      title: "Servicio Agregado",
      description: `${name} agregado al ticket.`,
      type: "success",
    });
  };

  const updateQuantity = (variant_id: string, delta: number) => {
    const targetItem = cart.find((item) => item.variant_id === variant_id);
    if (!targetItem) return;

    if (delta > 0 && !targetItem.is_service && targetItem.quantity + delta > targetItem.stock) {
      safeToast({
        title: "Stock máximo",
        description: `Solo hay ${targetItem.stock} unidades de "${targetItem.name}".`,
        type: "warning",
      });
      return;
    }

    setCart((prev) =>
      prev
        .map((item) => {
          if (item.variant_id === variant_id) {
            const newQty = item.quantity + delta;
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

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setIsProcessing(true);
    try {
      const refDoc = `POS-${Date.now().toString().slice(-6)}`;
      const checkoutItems = cart.map((i) => ({
        product_id: i.product_id || i.variant_id,
        name: i.name,
        sku: i.sku,
        price: i.price,
        quantity: i.quantity,
        is_service: i.is_service,
      }));
      const res = await processPOSSale(checkoutItems, refDoc, paymentMethod, totalAmount);
      if (!res.success) {
        safeToast({
          title: "Error al registrar la venta",
          description: res.error || "La base de datos rechazó la transacción.",
          type: "error",
        });
        return;
      }
      safeToast({
        title: "Venta Exitosa",
        description: `Transacción procesada correctamente.`,
        type: "success",
      });
      setIsSuccessModalOpen(true);
      setCart([]);
      loadProducts();
    } catch (error: any) {
      safeToast({
        title: "Error Crítico",
        description: error?.message || "Fallo inesperado al comunicarse con el servidor.",
        type: "error",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q)
    );
  }, [products, searchQuery]);

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
            <Button variant="outline" size="sm" className="border-border bg-card hover:bg-muted font-medium text-xs" onClick={() => addServiceItem("Mano de Obra: Cambio de Aceite", 15000, "SRV-ACEITE")}>
              <Wrench className="mr-1.5 h-3.5 w-3.5 text-primary" /> + Cambio de Aceite ($15.000)
            </Button>
            <Button variant="outline" size="sm" className="border-border bg-card hover:bg-muted font-medium text-xs" onClick={() => addServiceItem("Mano de Obra: Cambio de Pastillas", 20000, "SRV-PASTILLAS")}>
              <Wrench className="mr-1.5 h-3.5 w-3.5 text-primary" /> + Cambio de Pastillas ($20.000)
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              type="search"
              placeholder="Buscar por SKU, nombre o marca..."
              className="pl-9 h-11 bg-background border-border text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border">
              <Barcode className="h-3 w-3 text-primary" />
              <span>Escáner Activo</span>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-background/50 overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow className="border-border">
                  <TableHead>Repuesto / Marca</TableHead>
                  <TableHead className="text-right">Precio</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead className="text-center">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow className="border-border">
                    <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto text-primary" />
                    </TableCell>
                  </TableRow>
                ) : filteredProducts.map((product) => {
                  const isOutOfStock = product.stock <= 0 && !product.is_service;
                  return (
                    <TableRow key={product.id} className="border-border hover:bg-muted/30">
                      <TableCell>
                        <div className="font-medium text-foreground">{product.name}</div>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="font-mono text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{product.sku}</span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1"><Tag className="h-3 w-3" /> {product.brand}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-semibold">${product.price.toLocaleString("es-CL")}</TableCell>
                      <TableCell className="text-right font-bold text-muted-foreground">
                        <span className={isOutOfStock ? "text-muted-foreground/50 line-through" : product.stock <= product.min_stock ? "text-red-500" : ""}>
                          {product.stock} un.
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button size="sm" disabled={isOutOfStock} onClick={() => addProductToCart(product)}>
                          {isOutOfStock ? "Agotado" : "Agregar"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
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
          <div className="flex flex-col gap-3 py-4 max-h-[300px] overflow-y-auto divide-y divide-border/50">
            {cart.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-sm">
                La caja está libre. Agrega repuestos o servicios para comenzar.
              </div>
            ) : cart.map((item) => (
              <div key={item.variant_id} className="pt-3 first:pt-0 flex items-center justify-between gap-2">
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="font-medium text-sm truncate flex items-center gap-1.5">
                    {item.name}
                    {item.is_service && <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1.5 py-0.2 rounded uppercase font-bold">Servicio</span>}
                  </span>
                  <span className="text-xs text-muted-foreground font-mono">${item.price.toLocaleString("es-CL")} c/u</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button variant="outline" size="icon-xs" onClick={() => updateQuantity(item.variant_id, -1)}><Minus className="h-3 w-3" /></Button>
                  <span className="text-xs font-semibold w-6 text-center">{item.quantity}</span>
                  <Button variant="outline" size="icon-xs" onClick={() => updateQuantity(item.variant_id, 1)}><Plus className="h-3 w-3" /></Button>
                  <Button variant="ghost" size="icon-xs" className="text-destructive ml-1" onClick={() => removeFromCart(item.variant_id)}><Trash2 className="h-3 w-3" /></Button>
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-2 py-3 border-t border-border">
            <span className="text-xs font-medium text-muted-foreground">Método de Pago:</span>
            <div className="grid grid-cols-3 gap-2">
              {(["Efectivo", "Transferencia", "Tarjeta"] as const).map((method) => (
                <Button key={method} variant={paymentMethod === method ? "default" : "outline"} size="sm" onClick={() => setPaymentMethod(method)} className="text-xs font-medium">
                  {method}
                </Button>
              ))}
            </div>
          </div>
          <div className="pt-4 border-t border-border flex flex-col gap-4">
            <div className="flex justify-between text-xl font-bold">
              <span>Total a Cobrar:</span>
              <span className="text-primary text-2xl font-black">${totalAmount.toLocaleString("es-CL")}</span>
            </div>
            <Button
              className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              disabled={cart.length === 0 || isProcessing}
              onClick={handleCheckout}
            >
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Completar Venta ({paymentMethod})
            </Button>
          </div>
        </div>
      </div>
      {isSuccessModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs">
          <div className="bg-card border border-border rounded-xl p-6 max-w-sm w-full text-center">
            <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-3" />
            <h3 className="text-lg font-bold">¡Venta Registrada con Éxito!</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4">Transacción finalizada y stock actualizado.</p>
            <Button className="w-full font-semibold" onClick={() => setIsSuccessModalOpen(false)}>Siguiente Venta</Button>
          </div>
        </div>
      )}
    </div>
  );
}