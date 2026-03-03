import { useEffect, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

interface Product {
  id: string;
  name: string;
  price: number;
  imageUrl: string | null;
  active: boolean;
}

const AdminCatalog = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [uploading, setUploading] = useState<string | null>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/products`);
    if (response.ok) {
      setProducts(await response.json());
    }
  };

  const handleImageUpload = async (productId: string, file: File) => {
    setUploading(productId);
    const formData = new FormData();
    formData.append("image", file);

    const token = localStorage.getItem("admin_token");
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/products/${productId}/image`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (response.ok) {
        toast.success("Imagem atualizada com sucesso!");
        fetchProducts(); // Refresh list
      } else {
        toast.error("Erro ao enviar imagem");
      }
    } catch (error) {
      toast.error("Erro de conexão");
    } finally {
      setUploading(null);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight">Catálogo de Produtos</h2>
      <Card>
        <CardHeader>
          <CardTitle>Produtos Cadastrados</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Imagem</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Preço</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Upload Imagem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    {product.imageUrl ? (
                      <img 
                        src={`${import.meta.env.VITE_API_URL?.replace('/api', '')}${product.imageUrl}`} 
                        alt={product.name} 
                        className="w-12 h-12 object-cover rounded" 
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center text-gray-400">Sem img</div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>R$ {Number(product.price).toFixed(2)}</TableCell>
                  <TableCell>{product.active ? "Ativo" : "Inativo"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Input 
                        type="file" 
                        accept="image/*" 
                        className="w-[250px]" 
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageUpload(product.id, file);
                        }}
                        disabled={uploading === product.id}
                      />
                      {uploading === product.id && <span className="text-sm text-blue-500">Enviando...</span>}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminCatalog;
