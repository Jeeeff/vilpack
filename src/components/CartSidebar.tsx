
import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Trash2, ShoppingCart, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { API_URL } from '@/config/api';

interface CartItem {
  id: string;
  productId: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    price: number;
    imageUrl?: string;
  };
}

interface CartSummary {
  items: Array<{
    product: string;
    price: number;
    quantity: number;
    subtotal: number;
  }>;
  total: number;
}

interface CartSidebarProps {
  sessionId: string;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function CartSidebar({ sessionId, trigger, open, onOpenChange }: CartSidebarProps) {
  const [cart, setCart] = useState<{ items: CartItem[] } | null>(null);
  const [summary, setSummary] = useState<CartSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const fetchCart = async () => {
    if (!sessionId) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/cart/${sessionId}`);
      if (!res.ok) throw new Error("Falha ao buscar carrinho");
      const data = await res.json();
      setCart(data);

      // Also fetch summary for total
      // Or calculate locally. The API has /summary endpoint? No, service has getSummary but controller uses it for checkout.
      // Actually cart object has items with product details, we can calculate total.
      // But let's check if cart object structure matches.
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar carrinho");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchCart();
    }
  }, [open, sessionId]);

  useEffect(() => {
    const handleCartUpdate = () => fetchCart();
    window.addEventListener('cart-updated', handleCartUpdate);
    return () => window.removeEventListener('cart-updated', handleCartUpdate);
  }, [sessionId]);

  const handleRemoveItem = async (itemId: string) => {
    try {
      const res = await fetch(`${API_URL}/cart/item/${itemId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error("Falha ao remover item");
      toast.success("Item removido");
      fetchCart();
    } catch (error) {
      toast.error("Erro ao remover item");
    }
  };

  const handleCheckout = async () => {
    setCheckoutLoading(true);
    try {
      const res = await fetch(`${API_URL}/cart/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          sessionId, 
          customerName: "Cliente", // Should be asked or stored
          phone: "5511999999999" // Should be asked
        }),
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erro no checkout");
      }
      
      const data = await res.json();
      if (data.link) {
        window.open(data.link, '_blank');
        toast.success("Redirecionando para WhatsApp...");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao finalizar");
    } finally {
      setCheckoutLoading(false);
    }
  };

  const calculateTotal = () => {
    if (!cart?.items) return 0;
    return cart.items.reduce((acc, item) => acc + (Number(item.product.price) * item.quantity), 0);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        {trigger}
      </SheetTrigger>
      <SheetContent className="w-[350px] sm:w-[450px] flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between">
            <span>Seu Carrinho</span>
            <Button variant="ghost" size="icon" onClick={fetchCart} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </SheetTitle>
        </SheetHeader>
        
        <ScrollArea className="flex-1 my-4 pr-4">
          {cart?.items && cart.items.length > 0 ? (
            <div className="space-y-4">
              {cart.items.map((item) => (
                <div key={item.id} className="flex items-start justify-between space-x-4 border-b pb-4">
                  <div className="flex items-start space-x-3">
                    {item.product.imageUrl && (
                      <img 
                        src={item.product.imageUrl} 
                        alt={item.product.name} 
                        className="w-12 h-12 object-cover rounded-md bg-slate-100"
                      />
                    )}
                    <div>
                      <h4 className="font-medium text-sm line-clamp-2">{item.product.name}</h4>
                      <p className="text-xs text-muted-foreground">
                        {item.quantity} x R$ {Number(item.product.price).toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end space-y-2">
                    <span className="font-bold text-sm">
                      R$ {(item.quantity * Number(item.product.price)).toFixed(2)}
                    </span>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleRemoveItem(item.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
              <ShoppingCart className="h-10 w-10 mb-2 opacity-20" />
              <p>Seu carrinho está vazio</p>
            </div>
          )}
        </ScrollArea>

        <SheetFooter className="flex-col sm:flex-col space-y-4 border-t pt-4">
          <div className="flex justify-between items-center w-full">
            <span className="font-medium">Total:</span>
            <span className="font-bold text-lg">R$ {calculateTotal().toFixed(2)}</span>
          </div>
          <Button 
            className="w-full bg-green-600 hover:bg-green-700" 
            onClick={handleCheckout}
            disabled={!cart?.items?.length || checkoutLoading}
          >
            {checkoutLoading ? "Processando..." : "Finalizar Pedido no WhatsApp"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
