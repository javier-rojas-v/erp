"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Package, ShoppingCart, Truck, Receipt } from "lucide-react";
import { cn } from "@/lib/utils";

const menuItems = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Ventas (Caja)", href: "/ventas", icon: ShoppingCart },
  { name: "Inventario", href: "/inventario", icon: Package },
  { name: "Entradas de Stock", href: "/entradas", icon: Truck },
  { name: "Historial y Caja", href: "/historial", icon: Receipt } // (o el icono que prefieras)
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-background border-r min-h-screen flex flex-col">
      <div className="p-6">
        <h1 className="text-2xl font-bold tracking-tight text-primary">Repuestos TITO</h1>
        <p className="text-sm text-muted-foreground mt-1">Gestión y ERP</p>
      </div>

      <nav className="flex-1 px-4 space-y-2 mt-4">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium",
                isActive 
                  ? "bg-primary text-primary-foreground" 
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}