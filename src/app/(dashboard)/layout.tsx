import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { requireUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Suspense fallback={null}><AuthenticatedDashboard>{children}</AuthenticatedDashboard></Suspense>;
}

async function AuthenticatedDashboard({ children }: { children: React.ReactNode }) {
  try {
    await requireUser();
  } catch {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <Topbar />
        <main className="flex-1 p-6 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
import { Suspense } from "react";
