
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface ProductCardProps {
  id: string;
  name: string;
  price: number;
  imageUrl?: string;
  description?: string;
  onAddToCart: (id: string) => void;
}

export function ProductCard({ id, name, price, imageUrl, description, onAddToCart }: ProductCardProps) {
  return (
    <Card className="w-[200px] overflow-hidden shadow-md hover:shadow-lg transition-shadow bg-white">
      <div className="h-[120px] w-full bg-slate-100 relative">
        {imageUrl ? (
          <img 
            src={imageUrl} 
            alt={name} 
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-slate-400">
            Sem imagem
          </div>
        )}
      </div>
      <CardHeader className="p-3 pb-0">
        <CardTitle className="text-sm font-bold line-clamp-2 h-10 leading-tight">
          {name}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-1">
        <p className="text-xs text-muted-foreground line-clamp-2 mb-2 h-8">
          {description || "Sem descrição"}
        </p>
        <p className="font-bold text-green-700">
          R$ {price.toFixed(2)}
        </p>
      </CardContent>
      <CardFooter className="p-3 pt-0">
        <Button 
          size="sm" 
          className="w-full h-8 text-xs" 
          onClick={() => onAddToCart(id)}
        >
          <Plus className="w-3 h-3 mr-1" />
          Adicionar
        </Button>
      </CardFooter>
    </Card>
  );
}
