import { useEffect, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Order {
  id: string;
  customerName: string;
  customerPhone: string;
  status: string;
  total: number;
  createdAt: string;
  sessionId: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

const AdminLeads = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingChat, setLoadingChat] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    const token = localStorage.getItem("admin_token");
    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/orders`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (response.ok) {
      setOrders(await response.json());
    }
  };

  const handleOpenChat = async (order: Order) => {
    setSelectedOrder(order);
    setLoadingChat(true);
    const token = localStorage.getItem("admin_token");
    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/orders/${order.id}/chat`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (response.ok) {
      setMessages(await response.json());
    }
    setLoadingChat(false);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight">Leads & Pedidos</h2>
      <Card>
        <CardHeader>
          <CardTitle>Últimos Pedidos</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id} className="cursor-pointer hover:bg-gray-50" onClick={() => handleOpenChat(order)}>
                  <TableCell>{format(new Date(order.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}</TableCell>
                  <TableCell>{order.customerName || "N/A"}</TableCell>
                  <TableCell>{order.customerPhone || "N/A"}</TableCell>
                  <TableCell>{order.status}</TableCell>
                  <TableCell>R$ {Number(order.total).toFixed(2)}</TableCell>
                  <TableCell><span className="text-blue-600 font-medium">Ver Chat</span></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Histórico de Conversa - {selectedOrder?.customerName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {loadingChat ? (
              <p>Carregando...</p>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-3 rounded-lg ${msg.role === 'user' ? 'bg-blue-100 text-blue-900' : 'bg-gray-100 text-gray-900'}`}>
                    <p className="text-sm font-semibold mb-1">{msg.role === 'user' ? 'Cliente' : 'Vilpack IA'}</p>
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    <span className="text-xs text-gray-500 mt-1 block">{format(new Date(msg.createdAt), "HH:mm")}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminLeads;
