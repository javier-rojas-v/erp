"use client";
/* eslint-disable react/no-unescaped-entities */

import { useState, useEffect } from "react";
import { getCategories, updateCategoryName, deleteCategoryAndReassign } from "@/lib/api/products";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { X, Tags, Edit3, Trash2, CheckCircle2, Loader2, AlertTriangle } from "lucide-react";

interface CategoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CategoryManagerModal({ isOpen, onClose, onSuccess }: CategoryManagerModalProps) {
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const loadCategories = async () => {
    setIsLoading(true);
    // Cargamos tanto de repuestos como de servicios
    const [physCats, srvCats] = await Promise.all([getCategories(false), getCategories(true)]);
    const combined = Array.from(new Set([...physCats, ...srvCats])).sort();
    setCategories(combined);
    setIsLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      const timer = window.setTimeout(() => {
        void loadCategories();
        setEditingCategory(null);
      }, 0);
      return () => window.clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRename = async (oldName: string) => {
    if (!editValue.trim() || editValue === oldName) {
      setEditingCategory(null);
      return;
    }
    setIsProcessing(true);
    const res = await updateCategoryName(oldName, editValue);
    setIsProcessing(false);

    if (!res.success) {
      toast({ title: "Error", description: res.error, type: "error" });
      return;
    }
    toast({ title: "Categoría Actualizada", description: `Se renombró a "${editValue}".`, type: "success" });
    setEditingCategory(null);
    loadCategories();
    onSuccess();
  };

  const handleDelete = async (categoryName: string) => {
    if (!confirm(`¿Estás seguro de eliminar la categoría "${categoryName}"? Los productos se reasignarán a "General".`)) return;
    
    setIsProcessing(true);
    const res = await deleteCategoryAndReassign(categoryName, "General");
    setIsProcessing(false);

    if (!res.success) {
      toast({ title: "Error", description: res.error, type: "error" });
      return;
    }
    toast({ title: "Categoría Eliminada", description: `Los productos fueron reasignados a "General".`, type: "success" });
    loadCategories();
    onSuccess();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-card w-full max-w-md rounded-xl border border-border shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-border bg-muted/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tags className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-bold">Gestión de Categorías</h3>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} disabled={isProcessing}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[60vh] flex flex-col gap-3">
          <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-blue-500 flex items-start gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>Al renombrar una categoría, se actualizará automáticamente en todos los productos asociados. Al eliminarla, los productos pasarán a la categoría "General".</span>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : categories.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-4">No hay categorías registradas.</p>
          ) : (
            categories.map((cat) => (
              <div key={cat} className="flex items-center justify-between p-3 rounded-lg border border-border bg-background hover:bg-muted/30 transition-colors">
                {editingCategory === cat ? (
                  <div className="flex items-center gap-2 w-full">
                    <Input 
                      value={editValue} 
                      onChange={(e) => setEditValue(e.target.value)} 
                      className="h-8 text-sm"
                      autoFocus
                    />
                    <Button size="icon-sm" className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0" onClick={() => handleRename(cat)} disabled={isProcessing}>
                      {isProcessing ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                    </Button>
                    <Button size="icon-sm" variant="ghost" onClick={() => setEditingCategory(null)} disabled={isProcessing}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <span className="text-sm font-semibold">{cat}</span>
                    <div className="flex items-center gap-1">
                      <Button size="icon-sm" variant="ghost" onClick={() => { setEditingCategory(cat); setEditValue(cat); }}>
                        <Edit3 className="h-3.5 w-3.5 text-primary" />
                      </Button>
                      {cat !== "General" && (
                        <Button size="icon-sm" variant="ghost" onClick={() => handleDelete(cat)} disabled={isProcessing}>
                          <Trash2 className="h-3.5 w-3.5 text-red-500" />
                        </Button>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
