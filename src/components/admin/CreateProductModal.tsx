import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { API_URL } from "@/config/api";
import { Plus, Loader2, Upload } from "lucide-react";

// Lista canônica de segmentos — mesma usada na Vitrine e no site público
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

interface CreateProductModalProps {
  onProductCreated: () => void;
}

export const CreateProductModal = ({ onProductCreated }: CreateProductModalProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    segments: [] as string[],
    active: true,
  });

  const toggleSegment = (seg: string) => {
    setFormData((prev) => ({
      ...prev,
      segments: prev.segments.includes(seg)
        ? prev.segments.filter((s) => s !== seg)
        : [...prev.segments, seg],
    }));
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Imagem muito grande (máx 5MB)');
        return;
      }
      if (!file.type.startsWith('image/')) {
        toast.error('Arquivo deve ser uma imagem');
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleCreateProduct = async () => {
    if (!formData.name.trim()) {
      toast.error('Nome do produto é obrigatório');
      return;
    }
    if (formData.segments.length === 0) {
      toast.error('Selecione pelo menos um segmento');
      return;
    }

    setLoading(true);
    const token = localStorage.getItem('admin_token');

    try {
      const productRes = await fetch(`${API_URL}/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          segments: formData.segments,
          active: formData.active,
        }),
      });

      if (!productRes.ok) {
        const error = await productRes.json();
        toast.error(error.error || 'Erro ao criar produto');
        setLoading(false);
        return;
      }

      const product = await productRes.json();

      // Upload de imagem opcional
      if (imageFile) {
        const formDataImage = new FormData();
        formDataImage.append('image', imageFile);
        const imageRes = await fetch(`${API_URL}/admin/products/${product.id}/image`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formDataImage,
        });
        if (!imageRes.ok) {
          toast.warning('Produto criado mas erro ao enviar imagem');
        } else {
          toast.success('Produto criado com imagem!');
        }
      } else {
        toast.success('Produto criado com sucesso!');
      }

      setFormData({ name: '', description: '', segments: [], active: true });
      setImageFile(null);
      setImagePreview(null);
      setOpen(false);
      onProductCreated();
    } catch {
      toast.error('Erro de conexão ao criar produto');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-xl px-6">
          <Plus className="h-4 w-4 mr-2" />
          Novo Produto
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Criar Novo Produto</DialogTitle>
          <DialogDescription>
            Preencha os dados do produto. Você pode adicionar imagem agora ou depois.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Image Preview */}
          {imagePreview && (
            <div className="relative w-full">
              <img
                src={imagePreview}
                alt="Preview"
                className="w-full h-40 object-cover rounded-lg border border-zinc-200"
              />
              <button
                onClick={() => { setImageFile(null); setImagePreview(null); }}
                className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-1 rounded"
              >
                ✕
              </button>
            </div>
          )}

          {/* Image Upload */}
          <div>
            <Label htmlFor="image" className="block text-sm font-medium mb-2">
              Imagem (opcional)
            </Label>
            <label className="flex items-center gap-2 px-4 py-2 border-2 border-zinc-200 rounded-lg cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors">
              <Upload className="h-4 w-4 text-zinc-400" />
              <span className="text-sm text-zinc-600">
                {imageFile ? imageFile.name : 'Clique para selecionar imagem'}
              </span>
              <input
                ref={imageInputRef}
                id="image"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageSelect}
              />
            </label>
          </div>

          {/* Nome */}
          <div>
            <Label htmlFor="name" className="text-sm font-medium">
              Nome do Produto <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              placeholder="Ex: Sacola Kraft Pequena"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="mt-1"
            />
          </div>

          {/* Descrição */}
          <div>
            <Label htmlFor="description" className="text-sm font-medium">
              Descrição (opcional)
            </Label>
            <Textarea
              id="description"
              placeholder="Ex: Pacote com 50 unidades..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="mt-1 min-h-20 resize-none"
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
              id="active"
              checked={formData.active}
              onCheckedChange={(checked) => setFormData({ ...formData, active: checked as boolean })}
            />
            <Label htmlFor="active" className="text-sm font-medium cursor-pointer">
              Produto ativo
            </Label>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-4">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading} className="flex-1">
            Cancelar
          </Button>
          <Button onClick={handleCreateProduct} disabled={loading} className="flex-1">
            {loading ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Criando...</>
            ) : (
              <><Plus className="h-4 w-4 mr-2" />Criar Produto</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
