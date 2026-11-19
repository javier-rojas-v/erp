// src/components/inventory/BulkUploadModal.tsx
"use client";

import { useState, ChangeEvent } from "react";
import XLSX from "xlsx-js-style";
import { productSchema } from "@/lib/validations";
import { CreateProductInput, bulkCreateProducts } from "@/lib/api/products";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { UploadCloud, X, FileSpreadsheet, FileDown, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";

interface BulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onDownloadTemplate: () => void;
}

interface ValidationError {
  row: number;
  message: string;
}

export function BulkUploadModal({ isOpen, onClose, onSuccess, onDownloadTemplate }: BulkUploadModalProps) {
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkParsedData, setBulkParsedData] = useState<CreateProductInput[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [isParsingBulk, setIsParsingBulk] = useState(false);
  const [isUploadingBulk, setIsUploadingBulk] = useState(false);

  if (!isOpen) return null;

  /**
   * Helper para extraer el valor de la celda de una fila sin importar la variación
   * en el casing de las cabeceras (mayúsculas/minúsculas) o sinónimos comunes.
   */
  const getRowValue = (rowObj: Record<string, any>, keyNames: string[]): any => {
    for (const key of Object.keys(rowObj)) {
      const normalizedKey = key.trim().toLowerCase();
      if (keyNames.includes(normalizedKey)) {
        return rowObj[key];
      }
    }
    return undefined;
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setBulkFile(file);
    setIsParsingBulk(true);
    setValidationErrors([]);
    setBulkParsedData([]);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rawData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet);

      if (!rawData || rawData.length === 0) {
        toast({ title: "Archivo vacío", description: "El archivo no contiene registros.", type: "warning" });
        setIsParsingBulk(false);
        return;
      }

      const validItems: CreateProductInput[] = [];
      const errors: ValidationError[] = [];

      // Iterar fila por fila validando preventivamente con Zod
      rawData.forEach((row, index) => {
        const excelRowNumber = index + 2; // Fila 1 es la cabecera, los datos inician en fila 2

        const rawSku = getRowValue(row, ["sku"]) ?? "";
        const rawName = getRowValue(row, ["name", "nombre"]) ?? "";
        const rawBrand = getRowValue(row, ["brand", "marca"]) ?? "";
        const rawCategory = getRowValue(row, ["category", "categoria", "categoría"]) ?? "";
        const rawPrice = getRowValue(row, ["price", "precio"]);
        const rawCostPrice = getRowValue(row, ["cost_price", "costo"]);
        const rawStock = getRowValue(row, ["stock"]);
        const rawMinStock = getRowValue(row, ["min_stock", "minstock", "stock_minimo"]);
        const rawOem = getRowValue(row, ["part_number_factory", "oem", "numero_parte"]) ?? "";
        const rawBarcode = getRowValue(row, ["barcode", "codigobarra", "codigo_barra"]) ?? "";
        const rawIsService = getRowValue(row, ["is_service", "servicio", "es_servicio"]);

        const isServiceBool =
          typeof rawIsService === "boolean"
            ? rawIsService
            : String(rawIsService || "").trim().toUpperCase() === "TRUE" || String(rawIsService || "").trim() === "1";

        const formattedInput = {
          sku: String(rawSku || "").trim().toUpperCase(),
          name: String(rawName || "").trim(),
          brand: String(rawBrand || "").trim(),
          category: String(rawCategory || "").trim(),
          price: rawPrice !== undefined && rawPrice !== null && rawPrice !== "" ? Number(rawPrice) : NaN,
          cost_price: rawCostPrice !== undefined && rawCostPrice !== null && rawCostPrice !== "" ? Number(rawCostPrice) : 0,
          stock: rawStock !== undefined && rawStock !== null && rawStock !== "" ? Number(rawStock) : 0,
          min_stock: rawMinStock !== undefined && rawMinStock !== null && rawMinStock !== "" ? Number(rawMinStock) : 2,
          part_number_factory: rawOem ? String(rawOem).trim() : "",
          barcode: rawBarcode ? String(rawBarcode).trim() : "",
          is_service: isServiceBool,
        };

        const result = productSchema.safeParse(formattedInput);

        if (!result.success) {
          const firstErrorMsg = result.error.errors[0]?.message || "Datos inválidos";
          const skuDisplay = formattedInput.sku || "VACÍO";
          errors.push({
            row: excelRowNumber,
            message: `Fila ${excelRowNumber} [SKU: ${skuDisplay}]: ${firstErrorMsg}`,
          });
        } else {
          validItems.push(result.data as CreateProductInput);
        }
      });

      setValidationErrors(errors);
      setBulkParsedData(validItems);

      if (errors.length > 0) {
        toast({
          title: "Se encontraron errores de validación",
          description: `El archivo tiene ${errors.length} fila(s) con errores que deben corregirse.`,
          type: "error",
        });
      } else {
        toast({
          title: "Archivo Validado con Éxito",
          description: `${validItems.length} repuestos listos para importar sin errores.`,
          type: "success",
        });
      }
    } catch (error) {
      console.error("Error al procesar el archivo Excel:", error);
      toast({ title: "Error de lectura", description: "No se pudo procesar el archivo Excel o CSV.", type: "error" });
    } finally {
      setIsParsingBulk(false);
    }
  };

  const handleProcessBulkUpload = async () => {
    if (validationErrors.length > 0 || bulkParsedData.length === 0) return;

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
      title: "Migración Exitosa",
      description: `Se importaron/actualizaron ${result.insertedCount} productos con éxito.`,
      type: "success",
    });

    setBulkFile(null);
    setBulkParsedData([]);
    setValidationErrors([]);
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
            <p className="text-sm font-semibold">{bulkFile ? bulkFile.name : "Selecciona tu archivo CSV o Excel"}</p>
            <p className="text-xs text-muted-foreground mt-1">Formatos compatibles: .xlsx, .xls, .csv</p>
            <input type="file" accept=".csv, .xlsx, .xls" className="hidden" onChange={handleFileChange} />
          </label>

          {isParsingBulk && (
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground py-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span>Validando estructura con esquema ERP...</span>
            </div>
          )}

          {validationErrors.length > 0 && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 max-h-40 overflow-y-auto flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5 text-red-500 font-bold text-xs">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>Errores detectados en la estructura ({validationErrors.length}):</span>
              </div>
              {validationErrors.map((err, idx) => (
                <span key={idx} className="text-xs text-red-400 font-mono pl-5">
                  - {err.message}
                </span>
              ))}
            </div>
          )}

          {validationErrors.length === 0 && bulkParsedData.length > 0 && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-500 flex items-center justify-between">
              <span className="font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" />
                {bulkParsedData.length} ítems listos para importar.
              </span>
              <span className="font-mono text-[10px]">Estructura validada</span>
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-muted-foreground bg-muted/20 p-3 rounded-lg border border-border">
            <span>¿No tienes la plantilla oficial?</span>
            <button
              type="button"
              className="text-primary font-semibold hover:underline flex items-center gap-1 cursor-pointer"
              onClick={onDownloadTemplate}
            >
              <FileDown className="h-3.5 w-3.5" /> Descargar Plantilla Excel (.xlsx)
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between p-4 border-t border-border bg-background">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            disabled={bulkParsedData.length === 0 || validationErrors.length > 0 || isUploadingBulk}
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