// components/layout/topbar.tsx
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logout } from "@/app/(dashboard)/actions";
import { createClient } from "@/lib/supabase/server";

export async function Topbar() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const email = user?.email ?? "Usuario autenticado";
  const initials = email.slice(0, 2).toUpperCase();

  return (
    <header className="h-16 border-b border-border bg-background/50 backdrop-blur-sm px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Espacio estructural izquierdo */}
      <div className="flex items-center gap-3">
        {/* Eliminado: Indicador estético 'Sistema Seguro (Local Principal)' */}
      </div>

      {/* Perfil y Accesos de Usuario */}
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