import "./globals.css";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/toast";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "ERP Repuestos TITO",
  description: "Sistema de gestión de inventario y ventas",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="dark">
      <body className={`${inter.className} bg-background text-foreground antialiased`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}