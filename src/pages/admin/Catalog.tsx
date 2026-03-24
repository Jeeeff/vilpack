import { useEffect, useRef, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { API_URL } from "@/config/api";
import { Upload, FileText, ImagePlus, CheckCircle2, XCircle, Loader2, Package, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { CreateProductModal } from "@/components/admin/CreateProductModal";

interface Product {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  active: boolean;
  category: { id: string; name: string } | null;
}

interface ImportResult {
  message: string;
  created: number;
  updated: number;
  errors: string[];
}

const getImageSrc = (imageUrl: string | null) => {
  if (!imageUrl) return null;
  if (imageUrl.startsWith('http')) return imageUrl;
  const base = import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL.replace('/api', '')
    : '';
  return `${base}${imageUrl}`;
};

const AdminCatalog = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [uploading, setUploading] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [search, setSearch] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [batchDeleting, setBatchDeleting] = useState(false);
  const csvInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { fetchProducts(); }, []);

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`${API_URL}/products`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setProducts(await res.json());
    } catch {
      toast.error('Erro ao carregar produtos');
    }
  };

  const handleCsvImport = async () => {
    if (!csvFile) return;
    setImportLoading(true);
    setImportResult(null);
    const formData = new FormData();
    formData.append('file', csvFile);
    const token = localStorage.getItem('admin_token');
    try {
      const res = await fetch(`${API_URL}/admin/products/import-csv`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setImportResult(data);
        toast.success(data.message);
        setCsvFile(null);
        if (csvInputRef.current) csvInputRef.current.value = '';
        fetchProducts();
      } else {
        toast.error(data.error || 'Erro ao importar CSV');
      }
    } catch {
      toast.error('Erro de conexão ao importar CSV');
    } finally {
      setImportLoading(false);
    }
  };

  const handleDelete = async (productId: string) => {
    setDeleting(productId);
    const token = localStorage.getItem('admin_token');
    try {
      const res = await fetch(`${API_URL}/admin/products/${productId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        toast.success('Produto excluído.');
        setProducts((prev) => prev.filter((p) => p.id !== productId));
      } else {
        toast.error('Erro ao excluir produto');
      }
    } catch {
      toast.error('Erro de conexão');
    } finally {
      setDeleting(null);
    }
  };

  const handleBatchDelete = async () => {
    if (selectedProducts.size === 0) return;
    setBatchDeleting(true);
    const token = localStorage.getItem('admin_token');
    let successCount = 0;
    let errorCount = 0;

    try {
      for (const productId of selectedProducts) {
        try {
          const res = await fetch(`${API_URL}/admin/products/${productId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            successCount++;
          } else {
            errorCount++;
          }
        } catch {
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`${successCount} produto(s) excluído(s).`);
        setProducts((prev) => prev.filter((p) => !selectedProducts.has(p.id)));
        setSelectedProducts(new Set());
        fetchProducts();
      }
      if (errorCount > 0) {
        toast.error(`${errorCount} erro(s) ao excluir produtos.`);
      }
    } finally {
      setBatchDeleting(false);
    }
  };

  const handleImageUpload = async (productId: string, file: File) => {
    setUploading(productId);
    const formData = new FormData();
    formData.append('image', file);
    const token = localStorage.getItem('admin_token');
    try {
      const res = await fetch(`${API_URL}/admin/products/${productId}/image`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (res.ok) {
        toast.success('Imagem atualizada!');
        fetchProducts();
      } else {
        toast.error('Erro ao enviar imagem');
      }
    } catch {
      toast.error('Erro de conexão');
    } finally {
      setUploading(null);
    }
  };

  const toggleProductSelection = (productId: string) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedProducts(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedProducts.size === filtered.length) {
      setSelectedProducts(new Set());
    } else {
      const allIds = new Set(filtered.map((p) => p.id));
      setSelectedProducts(allIds);
    }
  };

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.category?.name ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const isAllSelected = filtered.length > 0 && selectedProducts.size === filtered.length;
  const isPartiallySelected = selectedProducts.size > 0 && selectedProducts.size < filtered.length;

  return (
    <div className="admin-page space-y-5">
      <div className="admin-page-header">
        <div className="admin-page-header-icon">
          <Package className="h-5 w-5 text-[hsl(42_80%_38%)]" />
        </div>
        <div>
          <h2 className="admin-page-header-title">Catálogo de Produtos</h2>
          <p className="admin-page-header-sub">Importe produtos via CSV e gerencie imagens do catálogo.</p>
        </div>
      </div>

      {/* Import CSV Card */}
      <div className="admin-card border-dashed border-2 p-6 space-y-4">
        <div>
          <h3 className="flex items-center gap-2 text-base font-semibold text-[hsl(var(--admin-text-primary))]">
            <FileText className="h-5 w-5 text-primary" />
            Importar Produtos via CSV
          </h3>
          <p className="text-sm text-[hsl(var(--admin-text-secondary))] mt-1">
            O arquivo deve ter as colunas:{' '}
            <code className="bg-zinc-100 px-1 rounded text-xs font-mono">nome</code>,{' '}
            <code className="bg-zinc-100 px-1 rounded text-xs font-mono">tipo</code> (categoria) e opcionalmente{' '}
            <code className="bg-zinc-100 px-1 rounded text-xs font-mono">descricao</code>.
            Separador: vírgula ou ponto-e-vírgula. Produtos existentes serão atualizados.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <label className="flex-1 cursor-pointer">
              <div className={`flex items-center gap-3 border-2 rounded-xl px-4 py-3 transition-colors ${
                csvFile ? 'border-[hsl(var(--admin-yellow))] bg-[hsl(var(--admin-yellow-soft))]' : 'border-[hsl(var(--admin-border))] hover:border-[hsl(var(--admin-yellow))] bg-[hsl(var(--admin-surface-raised))]'
              }`}>
                <Upload className="h-5 w-5 text-zinc-400 shrink-0" />
                <span className="text-sm text-[hsl(var(--admin-text-secondary))] truncate">
                  {csvFile ? csvFile.name : 'Clique para selecionar o arquivo .csv'}
                </span>
              </div>
              <input
                ref={csvInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => setCsvFile(e.target.files?.[0] ?? null)}
              />
            </label>
            <Button
              onClick={handleCsvImport}
              disabled={!csvFile || importLoading}
              className="shrink-0 rounded-xl px-6"
            >
              {importLoading ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Importando...</>
              ) : (
                <><Upload className="h-4 w-4 mr-2" />Importar</>
              )}
            </Button>
          </div>

          {importResult && (
            <div className="rounded-xl border border-[hsl(var(--admin-border))] bg-white p-4 space-y-2">
              <p className="font-semibold text-[hsl(var(--admin-text-primary))]">{importResult.message}</p>
              <div className="flex gap-4 text-sm">
                <span className="flex items-center gap-1 text-green-600">
                  <CheckCircle2 className="h-4 w-4" /> {importResult.created} criados
                </span>
                <span className="flex items-center gap-1 text-blue-600">
                  <CheckCircle2 className="h-4 w-4" /> {importResult.updated} atualizados
                </span>
                {importResult.errors.length > 0 && (
                  <span className="flex items-center gap-1 text-red-500">
                    <XCircle className="h-4 w-4" /> {importResult.errors.length} erros
                  </span>
                )}
              </div>
              {importResult.errors.length > 0 && (
                <ul className="text-xs text-red-500 list-disc ml-4 space-y-0.5">
                  {importResult.errors.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              )}
            </div>
          )}
      </div>

      {/* Product Table */}
      <div className="admin-card overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-5 py-4 border-b" style={{ borderColor: 'hsl(var(--admin-border))' }}>
          <div className="flex-1">
            <h3 className="flex items-center gap-2 text-base font-semibold text-[hsl(var(--admin-text-primary))]">
              <Package className="h-5 w-5" />
              Produtos Cadastrados
              <Badge variant="secondary" className="ml-2">{products.length}</Badge>
            </h3>
              {selectedProducts.size > 0 && (
              <p className="text-sm text-[hsl(var(--admin-text-muted))] mt-2">
                {selectedProducts.size} produto(s) selecionado(s)
              </p>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Input
              placeholder="Buscar por nome ou tipo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 sm:w-64"
            />
            <CreateProductModal onProductCreated={fetchProducts} />
            {selectedProducts.size > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="shrink-0"
                    disabled={batchDeleting}
                  >
                    {batchDeleting ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Excluindo...</>
                    ) : (
                      <><Trash2 className="h-4 w-4 mr-2" />Excluir selecionados ({selectedProducts.size})</>
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir {selectedProducts.size} produto(s)?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Os produtos selecionados serão removidos permanentemente do catálogo. Esta ação não pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-red-500 hover:bg-red-600"
                      onClick={handleBatchDelete}
                    >
                      Excluir {selectedProducts.size}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
        <div className="p-0">
          {filtered.length === 0 ? (
            <div className="admin-empty-state">
              <div className="admin-empty-state-icon">
                <Package className="h-6 w-6" />
              </div>
              <p className="admin-empty-state-title">
                {products.length === 0 ? 'Nenhum produto cadastrado' : 'Nenhum produto encontrado'}
              </p>
              <p className="admin-empty-state-sub">
                {products.length === 0 ? 'Importe um CSV para começar.' : 'Ajuste o filtro de busca.'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="admin-th w-10">
                    <div className="flex items-center">
                      <Checkbox
                        checked={isAllSelected}
                        onCheckedChange={toggleSelectAll}
                        aria-label="Selecionar todos"
                      />
                    </div>
                  </TableHead>
                  <TableHead className="admin-th w-16">Imagem</TableHead>
                  <TableHead className="admin-th">Nome do Produto</TableHead>
                  <TableHead className="admin-th">Tipo / Categoria</TableHead>
                  <TableHead className="admin-th">Status</TableHead>
                  <TableHead className="admin-th">Upload de Imagem</TableHead>
                  <TableHead className="admin-th w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((product) => (
                   <TableRow key={product.id} className={selectedProducts.has(product.id) ? 'bg-[hsl(var(--admin-yellow-soft))]' : ''}>
                    <TableCell>
                      <Checkbox
                        checked={selectedProducts.has(product.id)}
                        onCheckedChange={() => toggleProductSelection(product.id)}
                        aria-label={`Selecionar ${product.name}`}
                      />
                    </TableCell>
                    <TableCell>
                      {getImageSrc(product.imageUrl) ? (
                        <img
                          src={getImageSrc(product.imageUrl)!}
                          alt={product.name}
                          className="w-12 h-12 object-cover rounded-lg border border-[hsl(var(--admin-border))]"
                        />
                      ) : (
                          <div className="w-12 h-12 bg-[hsl(var(--admin-surface-raised))] rounded-lg border border-[hsl(var(--admin-border))] flex items-center justify-center">
                            <ImagePlus className="h-5 w-5 text-[hsl(var(--admin-text-muted))]" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-[hsl(var(--admin-text-primary))]">{product.name}</p>
                         {product.description && (
                           <p className="text-xs text-[hsl(var(--admin-text-muted))] mt-0.5 max-w-xs truncate">{product.description}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-normal">
                        {product.category?.name ?? '—'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                       <Badge className={product.active ? 'bg-[hsl(var(--admin-green-soft))] text-[hsl(var(--admin-green))] border-[hsl(142_60%_82%)]' : 'bg-[hsl(var(--admin-surface-raised))] text-[hsl(var(--admin-text-muted))] border-[hsl(var(--admin-border))]'}>
                        {product.active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <label className="cursor-pointer">
                        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${
                           uploading === product.id
                             ? 'border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-surface-raised))] text-[hsl(var(--admin-text-muted))]'
                             : 'border-[hsl(var(--admin-border))] hover:border-[hsl(var(--admin-yellow))] hover:bg-[hsl(var(--admin-yellow-soft))] hover:text-[hsl(42_80%_38%)] text-[hsl(var(--admin-text-secondary))]'
                        }`}>
                          {uploading === product.id ? (
                            <><Loader2 className="h-4 w-4 animate-spin" />Enviando...</>
                          ) : (
                            <><ImagePlus className="h-4 w-4" />Trocar imagem</>
                          )}
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={uploading === product.id}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleImageUpload(product.id, file);
                          }}
                        />
                      </label>
                    </TableCell>
                    <TableCell>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-[hsl(var(--admin-text-muted))] hover:text-red-500 hover:bg-red-50"
                            disabled={deleting === product.id}
                          >
                            {deleting === product.id
                              ? <Loader2 className="h-4 w-4 animate-spin" />
                              : <Trash2 className="h-4 w-4" />
                            }
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir produto?</AlertDialogTitle>
                            <AlertDialogDescription>
                              O produto <strong>{product.name}</strong> será removido permanentemente do catálogo. Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-red-500 hover:bg-red-600"
                              onClick={() => handleDelete(product.id)}
                            >
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminCatalog;
