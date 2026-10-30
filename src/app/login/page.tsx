"use client";

import { useState, useTransition } from "react";
import { login } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Loader2, ShieldAlert } from "lucide-react";

export default function LoginPage() {
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await login(formData);
      if (result?.error) {
        setErrorMsg(result.error);
      }
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4 font-sans text-foreground">
      <div className="w-full max-w-sm bg-card border border-border/40 rounded-2xl p-8 shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] shadow-primary/5">
        
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-foreground mb-1.5">
            Repuestos TITO
          </h1>
          <p className="text-sm text-muted-foreground">
            Acceso Restringido - Gestión y ERP
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor="email" className="text-muted-foreground">Correo Electrónico</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              autoFocus
              autoComplete="email"
              className="bg-background/50 h-10"
              placeholder="admin@urustech.dev"
            />
          </div>

          <div className="flex flex-col gap-2 relative">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-muted-foreground">Contraseña</Label>
            </div>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                className="bg-background/50 h-10 pr-10"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none"
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                aria-pressed={showPassword}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {errorMsg && (
            <div role="alert" className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg animate-in fade-in-0 slide-in-from-top-1">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <Button
            type="submit"
            disabled={isPending}
            className="w-full font-semibold h-11 mt-2 shadow-md transition-all active:scale-[0.98]"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Autenticando...
              </>
            ) : (
              "Iniciar Sesión"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
