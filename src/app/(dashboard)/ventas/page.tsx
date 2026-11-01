// app/(dashboard)/ventas/page.tsx
"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { getProducts } from "@/lib/api/products";
import { processPOSSale } from "@/lib/api/transactions";
import { Product, CartItem } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/components/ui/toast";
import { Search, Tag, Loader2 } from "lucide-react";
import { POSServiceShortcuts } from "@/components/ventas/POSServiceShortcuts";
import { CartSummary } from "@/components/ventas/CartSummary";
import { POSCheckoutSuccessModal } from "@/components/ventas/POSCheckoutSuccessModal";

export default function VentasPage() {
  const [physicalProducts, setPhysicalProducts] = useState<Product[]>([]);
  const [workshopServices, setWorkshopServices] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<"Efectivo" | "Transferencia" | "Tarjeta">("Efectivo");
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const safeToast = (options: Parameters<typeof toast>[0]) => {
    setTimeout(() => {
      toast(options);
    }, 0);
  };

  const loadPOSData = async () => {
    setIsLoading(true);
    try {
      const [prodsData, srvsData] = await Promise.all([
        getProducts({ is_service: false }),
        getProducts({ is_service: true }),
      ]);
      setPhysicalProducts(prodsData);
      setWorkshopServices(srvsData);
    } catch (error) {
      console.error("Error al cargar datos en el POS:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPOSData();
    if (searchInputRef.current) searchInputRef.current.focus();
  }, []);

  // Agregar Repuesto Físico al carrito (validando stock real)
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
          is_service: false,
        },
      ];
    });

    safeToast({
      title: "Repuesto Agregado",
      description: `${product.name} agregado al ticket.`,
      type: "success",
    });
    return true;
  };

  // Agregar Servicio de Taller Dinámico (desde BD) al carrito
  const addServiceProductToCart = (serviceProduct: Product) => {
    const targetVariantId = serviceProduct.id;
    setCart((prev) => {
      const existing = prev.find((item) => item.variant_id === targetVariantId);
      if (existing) {
        return prev.map((item) =>
          item.variant_id === targetVariantId ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [
        ...prev,
        {
          variant_id: targetVariantId,
          product_id: serviceProduct.id,
          sku: serviceProduct.sku,
          name: serviceProduct.name,
          price: serviceProduct.price,
          quantity: 1,
          stock: 999999, // Stock virtual ilimitado
          is_service: true,
        },
      ];
    });

    safeToast({
      title: "Servicio Agregado",
      description: `${serviceProduct.name} agregado al ticket.`,
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

      const totalAmount = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
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
      loadPOSData();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Fallo inesperado al comunicarse con el servidor.";
      safeToast({
        title: "Error Crítico",
        description: message,
        type: "error",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Filtrado exclusivo para Repuestos Físicos en el buscador
  const filteredPhysicalProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return physicalProducts;
    return physicalProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        (p.part_number_factory && p.part_number_factory.toLowerCase().includes(q))
    );
  }, [physicalProducts, searchQuery]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Terminal de Ventas (POS)</h1>
        <p className="text-muted-foreground text-sm">
          Facturación en mesón, cobro de servicios y rebaja de stock físico en tiempo real.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 flex flex-col gap-4">
          {/* Accesos Rápidos a Servicios Dinámicos desde BD */}
          <POSServiceShortcuts
            services={workshopServices}
            isLoading={isLoading}
            onAddService={addServiceProductToCart}
          />

          {/* Barra de Búsqueda (Sin la insignia 'Escáner Activo') */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              type="search"
              placeholder="Buscar repuestos por SKU, nombre, marca o N° OEM..."
              className="pl-9 h-11 bg-background border-border text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Tabla de Repuestos Físicos Exclusiva */}
          <div className="rounded-xl border border-border bg-background/50 overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow className="border-border">
                  <TableHead>Repuesto / Marca</TableHead>
                  <TableHead className="text-right">Precio</TableHead>
                  <TableHead className="text-right">Stock Real</TableHead>
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
                ) : filteredPhysicalProducts.length === 0 ? (
                  <TableRow className="border-border">
                    <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                      No se encontraron repuestos físicos en el catálogo.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPhysicalProducts.map((product) => {
                    const isOutOfStock = product.stock <= 0;
                    return (
                      <TableRow key={product.id} className="border-border hover:bg-muted/30">
                        <TableCell>
                          <div className="font-medium text-foreground">{product.name}</div>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="font-mono text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                              {product.sku}
                            </span>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Tag className="h-3 w-3" /> {product.brand}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          ${product.price.toLocaleString("es-CL")}
                        </TableCell>
                        <TableCell className="text-right font-bold text-muted-foreground">
                          <span
                            className={
                              isOutOfStock
                                ? "text-muted-foreground/50 line-through"
                                : product.stock <= product.min_stock
                                ? "text-red-500"
                                : ""
                            }
                          >
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
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Resumen del Ticket de Venta (CartSummary) */}
        <div className="lg:col-span-5">
          <CartSummary
            cart={cart}
            paymentMethod={paymentMethod}
            isProcessing={isProcessing}
            onUpdateQuantity={updateQuantity}
            onRemoveFromCart={removeFromCart}
            onPaymentMethodChange={setPaymentMethod}
            onCheckout={handleCheckout}
          />
        </div>
      </div>

      <POSCheckoutSuccessModal
        isOpen={isSuccessModalOpen}
        onClose={() => setIsSuccessModalOpen(false)}
      />
    </div>
  );
}