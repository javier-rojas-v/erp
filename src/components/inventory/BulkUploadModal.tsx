// components/inventory/BulkUploadModal.tsx
"use client";

import { useState, ChangeEvent } from "react";
import { CreateProductInput, bulkCreateProducts } from "@/lib/api/products";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { UploadCloud, X, FileSpreadsheet, FileDown, Loader2 } from "lucide-react";

interface BulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onDownloadTemplate: () => void;
}

export function BulkUploadModal({ isOpen, onClose, onSuccess, onDownloadTemplate }: BulkUploadModalProps) {
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkParsedData, setBulkParsedData] = useState<CreateProductInput[]>([]);
  const [isParsingBulk, setIsParsingBulk] = useState(false);
  const [isUploadingBulk, setIsUploadingBulk] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBulkFile(file);
    setIsParsingBulk(true);
    try {
      const text = await file.text();
      const lines = text.split(/\r\n|\n/).filter((l) => l.trim().length > 0);
      if (lines.length <= 1) {
        toast({ title: "Archivo vacío", description: "El archivo no contiene filas de repuestos.", type: "warning" });
        setIsParsingBulk(false);
        return;
      }
      const parsedItems: CreateProductInput[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(/[,;]/).map((c) => c.trim().replace(/^"|"$/g, ''));
        if (cols.length < 3) continue;
        const sku = cols[0] || `SKU-${Date.now()}-${i}`;
        const name = cols[1] || "Repuesto Sin Nombre";
        const brand = cols[2] || "Genérico";
        const category = cols[3] || "General";
        const price = parseFloat(cols[4]) || 0;
        const stock = parseInt(cols[5], 10) || 0;
        const min_stock = parseInt(cols[6], 10) || 2;
        const oem = cols[7] || "";
        const barcode = cols[8] || "";
        parsedItems.push({
          sku,
          name,
          brand,
          category,
          price,
          stock,
          min_stock,
          part_number_factory: oem,
          barcode,
        });
      }
      setBulkParsedData(parsedItems);
      toast({
        title: "Archivo Procesado",
        description: `Se leyeron ${parsedItems.length} repuestos listos para importar.`,
        type: "success",
      });
    } catch {
      toast({ title: "Error al leer archivo", description: "Verifica que sea un CSV o Excel válido.", type: "error" });
    } finally {
      setIsParsingBulk(false);
    }
  };

  const handleProcessBulkUpload = async () => {
    if (bulkParsedData.length === 0) return;
    setIsUploadingBulk(true);
    const result = await bulkCreateProducts(bulkParsedData);
    setIsUploadingBulk(false);
    if (!result.success) {
      toast({
        title: "Error en Carga Masiva",
        description: result.error || "No se pudieron importar los datos.",
        type: "error",
      });
      return;
    }
    toast({
      title: "Carga Masiva Completada",
      description: `Se importaron/actualizaron ${result.insertedCount} repuestos con éxito.`,
      type: "success",
    });
    setBulkFile(null);
    setBulkParsedData([]);
    onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-card w-full max-w-lg rounded-xl border border-border shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-border bg-muted/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UploadCloud className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-bold">Carga Masiva de Productos</h3>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="p-6 flex flex-col gap-4">
          <label className="border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center justify-center text-center bg-muted/10 hover:bg-muted/30 transition-colors cursor-pointer">
            <FileSpreadsheet className="h-10 w-10 text-primary mb-2" />
            <p className="text-sm font-semibold">{bulkFile ? bulkFile.name : "Selecciona tu archivo Excel o CSV"}</p>
            <p className="text-xs text-muted-foreground mt-1">Formatos compatibles: .csv, .xlsx, .xls</p>
            <input type="file" accept=".csv, .xlsx, .xls" className="hidden" onChange={handleFileChange} />
          </label>
          {isParsingBulk && (
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground py-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span>Procesando archivo...</span>
            </div>
          )}
          {bulkParsedData.length > 0 && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-500 flex items-center justify-between">
              <span className="font-semibold">✓ {bulkParsedData.length} repuestos listos para importar.</span>
              <span className="font-mono text-[10px]">Estructura validada</span>
            </div>
          )}
          <div className="flex items-center justify-between text-xs text-muted-foreground bg-muted/20 p-3 rounded-lg border border-border">
            <span>¿No tienes la plantilla oficial?</span>
            <button
              type="button"
              className="text-primary font-semibold hover:underline flex items-center gap-1"
              onClick={onDownloadTemplate}
            >
              <FileDown className="h-3.5 w-3.5" /> Descargar Plantilla CSV
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between p-4 border-t border-border bg-background">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            disabled={bulkParsedData.length === 0 || isUploadingBulk}
            className="bg-primary text-primary-foreground font-semibold"
            onClick={handleProcessBulkUpload}
          >
            {isUploadingBulk ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando en Catálogo...
              </>
            ) : (
              `Importar ${bulkParsedData.length} Productos`
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}