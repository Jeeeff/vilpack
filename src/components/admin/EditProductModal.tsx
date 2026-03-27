import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { API_URL } from "@/config/api";
import { Loader2, Save } from "lucide-react";

// Lista canônica de segmentos
const SEGMENTS = [
  "Mercado",
  "Padaria",
  "Limpeza",
  "Indústria",
  "Sacolas",
  "Bobinas",
  "Isopor",
  "Descartáveis",
];

export interface ProductToEdit {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  vitrineSegment: string | null;
  category: { id: string; name: string } | null;
}

interface EditProductModalProps {
  product: ProductToEdit | null;
  open: boolean;
  onClose: () => void;
  onProductUpdated: () => void;
}

export const EditProductModal = ({
  product,
  open,
  onClose,
  onProductUpdated,
}: EditProductModalProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    active: true,
    segments: [] as string[],
  });

  // Preenche o form quando o produto muda
  useEffect(() => {
    if (product) {
      // Segmentos: lê vitrineSegment (CSV) e também inclui category.name se for canônico
      const fromVitrine = product.vitrineSegment
        ? product.vitrineSegment.split(",").map((s) => s.trim()).filter(Boolean)
        : [];
      const fromCategory =
        product.category && SEGMENTS.includes(product.category.name)
          ? [product.category.name]
          : [];
      // Une e deduplica
      const merged = Array.from(new Set([...fromVitrine, ...fromCategory]));
      setFormData({
        name: product.name,
        description: product.description ?? "",
        active: product.active,
        segments: merged,
      });
    }
  }, [product]);

  const toggleSegment = (seg: string) => {
    setFormData((prev) => ({
      ...prev,
      segments: prev.segments.includes(seg)
        ? prev.segments.filter((s) => s !== seg)
        : [...prev.segments, seg],
    }));
  };

  const handleSave = async () => {
    if (!product) return;
    if (!formData.name.trim()) {
      toast.error("Nome do produto é obrigatório");
      return;
    }
    if (formData.segments.length === 0) {
      toast.error("Selecione pelo menos um segmento");
      return;
    }

    setLoading(true);
    const token = localStorage.getItem("admin_token");

    try {
      const res = await fetch(`${API_URL}/products/${product.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          active: formData.active,
          segments: formData.segments,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        toast.error(error.error || "Erro ao salvar produto");
        return;
      }

      toast.success("Produto atualizado!");
      onClose();
      onProductUpdated();
    } catch {
      toast.error("Erro de conexão ao salvar produto");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Produto</DialogTitle>
          <DialogDescription>
            Altere nome, descrição, segmentos e status do produto.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Nome */}
          <div>
            <Label htmlFor="edit-name" className="text-sm font-medium">
              Nome do Produto <span className="text-red-500">*</span>
            </Label>
            <Input
              id="edit-name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="mt-1"
            />
          </div>

          {/* Descrição */}
          <div>
            <Label htmlFor="edit-description" className="text-sm font-medium">
              Descrição (opcional)
            </Label>
            <Textarea
              id="edit-description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="mt-1 min-h-20 resize-none"
              placeholder="Ex: Pacote com 50 unidades..."
            />
          </div>

          {/* Segmentos — multisseleção */}
          <div>
            <Label className="text-sm font-medium">
              Segmentos <span className="text-red-500">*</span>
            </Label>
            <p className="text-xs text-zinc-500 mt-0.5 mb-2">
              Selecione um ou mais segmentos onde este produto se encaixa.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {SEGMENTS.map((seg) => {
                const checked = formData.segments.includes(seg);
                return (
                  <label
                    key={seg}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm transition-colors select-none ${
                      checked
                        ? "border-primary bg-primary/10 text-primary font-medium"
                        : "border-zinc-200 hover:border-zinc-300 text-zinc-700"
                    }`}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => toggleSegment(seg)}
                      className="shrink-0"
                    />
                    {seg}
                  </label>
                );
              })}
            </div>
            {formData.segments.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {formData.segments.map((s) => (
                  <Badge key={s} variant="secondary" className="text-xs">
                    {s}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Ativo */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="edit-active"
              checked={formData.active}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, active: checked as boolean })
              }
            />
            <Label htmlFor="edit-active" className="text-sm font-medium cursor-pointer">
              Produto ativo
            </Label>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-4">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading} className="flex-1">
            {loading ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Salvando...</>
            ) : (
              <><Save className="h-4 w-4 mr-2" />Salvar</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
