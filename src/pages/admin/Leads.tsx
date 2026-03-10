import { useEffect, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Search, Filter, MessageSquare, Phone, Mail, TrendingUp, User, Briefcase, Calendar, MessageCircle, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface Lead {
  id: string;
  name: string | null;
  whatsapp: string | null;
  email: string | null;
  segment: string | null;
  status: string;
  qualificationScore: number;
  lastInteractionAt: string;
  createdAt: string;
  interestSummary: string | null;
  productsOfInterest: string | null;
  summary?: {
    summary: string | null;
    needDescription: string | null;
    nextRecommendedAction: string | null;
  };
  session?: {
    messages: {
      id: string;
      role: 'user' | 'assistant';
      content: string;
      createdAt: string;
    }[];
  };
}

const AdminLeads = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchLeads();
  }, []);

  useEffect(() => {
    let result = leads;
    
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(l => 
        l.name?.toLowerCase().includes(s) || 
        l.whatsapp?.includes(s) || 
        l.email?.toLowerCase().includes(s) ||
        l.segment?.toLowerCase().includes(s)
      );
    }

    if (statusFilter !== "ALL") {
      result = result.filter(l => l.status === statusFilter);
    }

    setFilteredLeads(result);
  }, [search, statusFilter, leads]);

  const fetchLeads = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("admin_token");
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/leads`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        setLeads(await response.json());
      }
    } catch (error) {
      console.error("Erro ao buscar leads:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDetail = async (leadId: string) => {
    try {
      const token = localStorage.getItem("admin_token");
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/leads/${leadId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        setSelectedLead(await response.json());
      }
    } catch (error) {
      console.error("Erro ao buscar detalhes do lead:", error);
    }
  };

  const updateStatus = async (id: string, newStatus: string) => {
    const token = localStorage.getItem("admin_token");
    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/leads/${id}/status`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}` 
      },
      body: JSON.stringify({ status: newStatus })
    });
    if (response.ok) {
      fetchLeads();
      if (selectedLead?.id === id) {
        setSelectedLead({ ...selectedLead, status: newStatus });
      }
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      'WAITING_HUMAN': 'bg-red-100 text-red-700 border-red-200',
      'QUALIFIED': 'bg-green-100 text-green-700 border-green-200',
      'ENGAGED': 'bg-blue-100 text-blue-700 border-blue-200',
      'NEW': 'bg-gray-100 text-gray-700 border-gray-200',
      'CONVERTED': 'bg-purple-100 text-purple-700 border-purple-200',
      'LOST': 'bg-zinc-100 text-zinc-500 border-zinc-200',
    };
    
    const labels: Record<string, string> = {
      'WAITING_HUMAN': 'Aguardando Humano',
      'QUALIFIED': 'Qualificado',
      'ENGAGED': 'Engajado',
      'NEW': 'Novo',
      'CONVERTED': 'Convertido',
      'LOST': 'Perdido',
    };

    return (
      <Badge variant="outline" className={cn("font-semibold px-2 py-0.5", variants[status] || variants['NEW'])}>
        {labels[status] || status}
      </Badge>
    );
  };

  const getScoreColor = (score: number) => {
    if (score >= 75) return "text-red-600";
    if (score >= 50) return "text-green-600";
    if (score >= 25) return "text-blue-600";
    return "text-gray-500";
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900">Gestão de Leads</h2>
          <p className="text-zinc-500 mt-1 text-sm">Acompanhe e converta as oportunidades geradas pela Vik.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <Input 
              placeholder="Buscar por nome, zap ou segmento..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-white border-zinc-200 focus:ring-primary/20"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px] bg-white border-zinc-200">
              <Filter className="h-4 w-4 mr-2 text-zinc-400" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos os Status</SelectItem>
              <SelectItem value="WAITING_HUMAN">Aguardando Humano</SelectItem>
              <SelectItem value="QUALIFIED">Qualificados</SelectItem>
              <SelectItem value="ENGAGED">Engajados</SelectItem>
              <SelectItem value="NEW">Novos</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={fetchLeads} className="bg-white border-zinc-200 hover:bg-zinc-50">
            Atualizar
          </Button>
        </div>
      </div>

      <Card className="border-zinc-200 shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-zinc-50/50">
            <TableRow>
              <TableHead className="w-[250px]">Cliente</TableHead>
              <TableHead>Segmento</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Última Interação</TableHead>
              <TableHead className="text-right">Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-zinc-500">Carregando leads...</TableCell>
              </TableRow>
            ) : filteredLeads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-zinc-500">Nenhum lead encontrado.</TableCell>
              </TableRow>
            ) : filteredLeads.map((lead) => (
              <TableRow 
                key={lead.id} 
                className="cursor-pointer hover:bg-zinc-50/80 transition-colors group" 
                onClick={() => handleOpenDetail(lead.id)}
              >
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-bold text-zinc-900 group-hover:text-primary transition-colors">
                      {lead.name || "Visitante Anônimo"}
                    </span>
                    <span className="text-xs text-zinc-500 flex items-center gap-1 mt-0.5">
                      <Phone className="h-3 w-3" /> {lead.whatsapp || "N/A"}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="bg-zinc-100 text-zinc-600 font-medium">
                    {lead.segment || "Não identificado"}
                  </Badge>
                </TableCell>
                <TableCell>{getStatusBadge(lead.status)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="w-12 bg-zinc-100 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className={cn("h-full", lead.qualificationScore >= 75 ? "bg-red-500" : lead.qualificationScore >= 50 ? "bg-green-500" : "bg-blue-500")} 
                        style={{ width: `${lead.qualificationScore}%` }} 
                      />
                    </div>
                    <span className={cn("text-xs font-bold w-8", getScoreColor(lead.qualificationScore))}>
                      {lead.qualificationScore}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-zinc-500 text-xs">
                  {format(new Date(lead.lastInteractionAt), "dd MMM, HH:mm", { locale: ptBR })}
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" className="text-primary font-bold hover:bg-primary/5">
                    Detalhes
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={!!selectedLead} onOpenChange={(open) => !open && setSelectedLead(null)}>
        <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0 border-none rounded-3xl overflow-hidden shadow-2xl">
          <DialogHeader className="p-6 bg-zinc-900 text-white shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-primary p-3 rounded-2xl">
                  <User className="h-6 w-6 text-zinc-900" />
                </div>
                <div>
                  <DialogTitle className="text-2xl font-bold">{selectedLead?.name || "Visitante Anônimo"}</DialogTitle>
                  <DialogDescription className="text-zinc-400 flex items-center gap-3 mt-1">
                    <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {selectedLead?.whatsapp || "N/A"}</span>
                    <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {selectedLead?.email || "N/A"}</span>
                  </DialogDescription>
                </div>
              </div>
              <div className="flex items-center gap-3 pr-8">
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Status Atual</p>
                  <div className="mt-1">{selectedLead && getStatusBadge(selectedLead.status)}</div>
                </div>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex flex-col md:flex-row bg-zinc-50">
            {/* Left Col: Info & Summary */}
            <div className="w-full md:w-1/3 p-6 space-y-6 overflow-y-auto border-r border-zinc-200 scrollbar-thin">
              <section className="space-y-3">
                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                  <TrendingUp className="h-3 w-3" /> Qualificação
                </h4>
                <Card className="border-none shadow-sm bg-white p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-zinc-500">Commercial Score</span>
                    <span className={cn("text-xl font-black", getScoreColor(selectedLead?.qualificationScore || 0))}>
                      {selectedLead?.qualificationScore}/100
                    </span>
                  </div>
                  <div className="w-full bg-zinc-100 h-2 rounded-full overflow-hidden">
                    <div 
                      className={cn("h-full transition-all duration-1000", selectedLead?.qualificationScore && selectedLead.qualificationScore >= 75 ? "bg-red-500" : selectedLead?.qualificationScore && selectedLead.qualificationScore >= 50 ? "bg-green-500" : "bg-blue-500")} 
                      style={{ width: `${selectedLead?.qualificationScore}%` }} 
                    />
                  </div>
                </Card>
              </section>

              <section className="space-y-3">
                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                  <Briefcase className="h-3 w-3" /> Contexto do Negócio
                </h4>
                <div className="grid grid-cols-1 gap-2">
                  <div className="bg-white p-3 rounded-xl border border-zinc-100 shadow-sm">
                    <p className="text-[10px] text-zinc-400 font-bold uppercase">Segmento</p>
                    <p className="text-sm font-medium text-zinc-800 mt-0.5">{selectedLead?.segment || "Não informado"}</p>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-zinc-100 shadow-sm">
                    <p className="text-[10px] text-zinc-400 font-bold uppercase">Produtos de Interesse</p>
                    <p className="text-sm font-medium text-zinc-800 mt-0.5">{selectedLead?.productsOfInterest || "Nenhum citado"}</p>
                  </div>
                </div>
              </section>

              <section className="space-y-3">
                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                  <FileText className="h-3 w-3" /> Resumo da Vik
                </h4>
                <div className="bg-primary/5 border border-primary/10 p-4 rounded-2xl relative">
                  <div className="absolute -top-2 -right-2 bg-primary text-zinc-900 p-1.5 rounded-lg shadow-md">
                    <TrendingUp className="h-3 w-3" />
                  </div>
                  <p className="text-sm text-zinc-700 leading-relaxed italic">
                    "{selectedLead?.summary?.summary || "Resumo ainda não gerado."}"
                  </p>
                  {selectedLead?.summary?.nextRecommendedAction && (
                    <div className="mt-4 pt-4 border-t border-primary/10">
                      <p className="text-[10px] text-primary font-bold uppercase">Ação Recomendada</p>
                      <p className="text-xs font-bold text-zinc-800 mt-1">
                        🚀 {selectedLead.summary.nextRecommendedAction}
                      </p>
                    </div>
                  )}
                </div>
              </section>

              <section className="space-y-3">
                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                  <Calendar className="h-3 w-3" /> Operacional
                </h4>
                <div className="space-y-3">
                  <Select 
                    value={selectedLead?.status} 
                    onValueChange={(val) => selectedLead && updateStatus(selectedLead.id, val)}
                  >
                    <SelectTrigger className="w-full bg-white">
                      <SelectValue placeholder="Mudar Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="WAITING_HUMAN">Aguardando Humano</SelectItem>
                      <SelectItem value="QUALIFIED">Qualificado</SelectItem>
                      <SelectItem value="ENGAGED">Engajado</SelectItem>
                      <SelectItem value="CONVERTED">Convertido</SelectItem>
                      <SelectItem value="LOST">Perdido</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Button className="w-full gap-2" variant="outline" asChild>
                    <a href={`https://wa.me/${selectedLead?.whatsapp}`} target="_blank" rel="noreferrer">
                      <MessageCircle className="h-4 w-4" /> Assumir no WhatsApp
                    </a>
                  </Button>
                </div>
              </section>
            </div>

            {/* Right Col: Chat History */}
            <div className="flex-1 flex flex-col bg-white">
              <div className="p-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                  <MessageSquare className="h-3 w-3" /> Histórico da Conversa
                </h4>
                <span className="text-[10px] text-zinc-400 font-medium">Sessão: {selectedLead?.id.slice(0, 8)}</span>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
                {selectedLead?.session?.messages.map((msg) => (
                  <div key={msg.id} className={cn("flex flex-col", msg.role === 'user' ? "items-end" : "items-start")}>
                    <div className={cn(
                      "max-w-[85%] p-4 rounded-2xl shadow-sm text-sm leading-relaxed",
                      msg.role === 'user' 
                        ? "bg-zinc-900 text-white rounded-tr-none" 
                        : "bg-zinc-100 text-zinc-800 rounded-tl-none border border-zinc-200"
                    )}>
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                    <span className="text-[10px] text-zinc-400 mt-1.5 font-medium px-1">
                      {msg.role === 'user' ? 'Cliente' : 'Vik'} • {format(new Date(msg.createdAt), "HH:mm")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminLeads;
