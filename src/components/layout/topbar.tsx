// src/components/layout/topbar.tsx
import { Bell, ShieldCheck, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logout } from "@/app/(dashboard)/actions";
import { createClient } from "@/lib/supabase/server";

export async function Topbar() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let roleLabel = "Manager (Fabián)";
  let roleBadgeClass = "bg-blue-500/10 text-blue-400 border-blue-500/20";
  let RoleIcon = UserCheck;

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const role = profile?.role || "manager";
    if (role === "admin") {
      roleLabel = "Superadmin (Javier)";
      roleBadgeClass = "bg-purple-500/10 text-purple-400 border-purple-500/20";
      RoleIcon = ShieldCheck;
    } else {
      roleLabel = "Manager (Fabián)";
      roleBadgeClass = "bg-amber-500/10 text-amber-400 border-amber-500/20";
      RoleIcon = UserCheck;
    }
  }

  const email = user?.email ?? "Usuario autenticado";
  const initials = email.slice(0, 2).toUpperCase();

  return (
    <header className="h-16 border-b border-border bg-background/50 backdrop-blur-sm px-6 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${roleBadgeClass}`}>
          <RoleIcon className="h-3.5 w-3.5" /> Rol: {roleLabel}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
          <Bell className="h-4 w-4" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary" />
        </Button>
        <div className="h-4 w-px bg-border" />
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center font-bold text-xs">
            {initials}
          </div>
          <div className="hidden sm:flex flex-col text-left">
            <span className="text-xs font-semibold leading-none">{email}</span>
            <span className="text-[10px] text-muted-foreground mt-0.5">Sesión activa</span>
          </div>
          <form action={logout}>
            <Button variant="outline" size="sm" type="submit" className="ml-2">
              Salir
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}