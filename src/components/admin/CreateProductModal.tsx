import { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { API_URL } from "@/config/api";
import { Plus, Loader2, Upload } from "lucide-react";

interface Category {
  id: string;
  name: string;
}

interface CreateProductModalProps {
  onProductCreated: () => void;
}

export const CreateProductModal = ({ onProductCreated }: CreateProductModalProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    categoryId: '',
    active: true,
  });

  useEffect(() => {
    if (open) {
      fetchCategories();
    }
  }, [open]);

  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`${API_URL}/categories`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch {
      toast.error('Erro ao carregar categorias');
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validar tamanho (5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Imagem muito grande (máx 5MB)');
        return;
      }
      // Validar tipo
      if (!file.type.startsWith('image/')) {
        toast.error('Arquivo deve ser uma imagem');
        return;
      }
      setImageFile(file);
      // Preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateProduct = async () => {
    // Validações
    if (!formData.name.trim()) {
      toast.error('Nome do produto é obrigatório');
      return;
    }
    if (!formData.categoryId) {
      toast.error('Categoria é obrigatória');
      return;
    }

    setLoading(true);
    const token = localStorage.getItem('admin_token');

    try {
      // Criar produto
      const productRes = await fetch(`${API_URL}/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          categoryId: formData.categoryId,
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

      // Se houver imagem, fazer upload
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

      // Limpar form
      setFormData({ name: '', description: '', categoryId: '', active: true });
      setImageFile(null);
      setImagePreview(null);
      setOpen(false);

      // Callback
      onProductCreated();
    } catch (error) {
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
                onClick={() => {
                  setImageFile(null);
                  setImagePreview(null);
                }}
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

          {/* Categoria */}
          <div>
            <Label htmlFor="category" className="text-sm font-medium">
              Categoria <span className="text-red-500">*</span>
            </Label>
            <Select value={formData.categoryId} onValueChange={(value) => setFormData({ ...formData, categoryId: value })}>
              <SelectTrigger id="category" className="mt-1">
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={loading}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleCreateProduct}
            disabled={loading}
            className="flex-1"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Criando...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Criar Produto
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
