import { useEffect, useRef, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { API_URL } from "@/config/api";
import { Upload, FileText, ImagePlus, CheckCircle2, XCircle, Loader2, Package } from "lucide-react";

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
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [search, setSearch] = useState('');
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

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.category?.name ?? '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Catálogo de Produtos</h2>
        <p className="text-zinc-500 mt-1">Importe produtos via CSV e gerencie imagens do catálogo.</p>
      </div>

      {/* Import CSV Card */}
      <Card className="border-dashed border-2 border-zinc-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5 text-primary" />
            Importar Produtos via CSV
          </CardTitle>
          <CardDescription>
            O arquivo deve ter as colunas:{' '}
            <code className="bg-zinc-100 px-1 rounded text-xs font-mono">nome</code>,{' '}
            <code className="bg-zinc-100 px-1 rounded text-xs font-mono">tipo</code> (categoria) e opcionalmente{' '}
            <code className="bg-zinc-100 px-1 rounded text-xs font-mono">descricao</code>.
            Separador: vírgula ou ponto-e-vírgula. Produtos existentes serão atualizados.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <label className="flex-1 cursor-pointer">
              <div className={`flex items-center gap-3 border-2 rounded-xl px-4 py-3 transition-colors ${
                csvFile ? 'border-primary bg-primary/5' : 'border-zinc-200 hover:border-zinc-300 bg-zinc-50'
              }`}>
                <Upload className="h-5 w-5 text-zinc-400 shrink-0" />
                <span className="text-sm text-zinc-600 truncate">
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
            <div className="rounded-xl border border-zinc-200 bg-white p-4 space-y-2">
              <p className="font-semibold text-zinc-800">{importResult.message}</p>
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
        </CardContent>
      </Card>

      {/* Product Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Produtos Cadastrados
              <Badge variant="secondary" className="ml-2">{products.length}</Badge>
            </CardTitle>
          </div>
          <Input
            placeholder="Buscar por nome ou tipo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64"
          />
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-zinc-400">
              <Package className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p>{products.length === 0 ? 'Nenhum produto cadastrado. Importe um CSV para começar.' : 'Nenhum produto encontrado.'}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Imagem</TableHead>
                  <TableHead>Nome do Produto</TableHead>
                  <TableHead>Tipo / Categoria</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Upload de Imagem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      {getImageSrc(product.imageUrl) ? (
                        <img
                          src={getImageSrc(product.imageUrl)!}
                          alt={product.name}
                          className="w-12 h-12 object-cover rounded-lg border border-zinc-200"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-zinc-100 rounded-lg border border-zinc-200 flex items-center justify-center">
                          <ImagePlus className="h-5 w-5 text-zinc-300" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-zinc-900">{product.name}</p>
                        {product.description && (
                          <p className="text-xs text-zinc-400 mt-0.5 max-w-xs truncate">{product.description}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-normal">
                        {product.category?.name ?? '—'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={product.active ? 'bg-green-100 text-green-700 border-green-200' : 'bg-zinc-100 text-zinc-500'}>
                        {product.active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <label className="cursor-pointer">
                        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${
                          uploading === product.id
                            ? 'border-zinc-200 bg-zinc-50 text-zinc-400'
                            : 'border-zinc-200 hover:border-primary hover:bg-primary/5 hover:text-primary text-zinc-600'
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminCatalog;
