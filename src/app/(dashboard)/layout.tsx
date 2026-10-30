import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { requireUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

// Indica a Next.js 16 (cacheComponents) que este segmento es una ruta bloqueante y no debe prerenderizarse
export const instant = false;

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    await requireUser();
  } catch {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen bg-background font-sans">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <Topbar />
        <main className="flex-1 p-6 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}