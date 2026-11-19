// src/components/layout/sidebar.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { UserRole } from "@/types";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Truck,
  Receipt,
  TrendingUp,
  ShieldAlert,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MenuItem {
  name: string;
  href: string;
  icon: any;
  roles: UserRole[];
}

const menuItems: MenuItem[] = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard, roles: ["admin", "manager"] },
  { name: "Ventas (Caja)", href: "/ventas", icon: ShoppingCart, roles: ["admin", "manager"] },
  { name: "Inventario", href: "/inventario", icon: Package, roles: ["admin", "manager"] },
  { name: "Entradas de Stock", href: "/entradas", icon: Truck, roles: ["admin", "manager"] },
  { name: "Historial y Caja", href: "/historial", icon: Receipt, roles: ["admin", "manager"] },
  { name: "Finanzas & BI", href: "/finanzas", icon: TrendingUp, roles: ["admin", "manager"] },
  { name: "Auditoría & Logs", href: "/auditoria", icon: ShieldAlert, roles: ["admin", "manager"] },
];

export function Sidebar() {
  const pathname = usePathname();
  const [role, setRole] = useState<UserRole | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle()
          .then(({ data }) => {
            setRole((data?.role as UserRole) || "manager");
          });
      }
    });
  }, []);

  const filteredMenuItems = menuItems.filter((item) => !role || item.roles.includes(role));

  return (
    <aside className="w-64 bg-background border-r min-h-screen flex flex-col">
      <div className="p-6 border-b border-border/40">
        <h1 className="text-2xl font-bold tracking-tight text-primary">Repuestos TITO</h1>
        <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5 font-medium">
          <Shield className="h-3.5 w-3.5 text-primary" />
          <span>Gestión y ERP</span>
        </p>
      </div>
      <nav className="flex-1 px-4 space-y-1.5 mt-4">
        {filteredMenuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3.5 py-2.5 rounded-lg transition-colors text-sm font-medium",
                isActive
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.name}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}