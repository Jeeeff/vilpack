import { useEffect, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Search, Filter, MessageSquare, Phone, Mail, TrendingUp, User, 
  Briefcase, Calendar, MessageCircle, FileText, Copy, ExternalLink,
  Loader2, AlertCircle, CheckCircle2, XCircle, Clock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";

interface Lead {
  id: string;
  name: string | null;
  whatsapp: string | null;
  email: string | null;
  segment: string | null;
  status: string;
  priority: string;
  isRead: boolean;
  qualificationScore: number;
  internalNotes: string | null;
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
  const [isUpdating, setIsUpdating] = useState(false);
  const [notes, setNotes] = useState("");
  const { toast } = useToast();

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
      toast({
        title: "Erro",
        description: "Falha ao carregar leads.",
        variant: "destructive"
      });
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
        const data = await response.json();
        setSelectedLead(data);
        setNotes(data.internalNotes || "");
      }
    } catch (error) {
      console.error("Erro ao buscar detalhes:", error);
    }
  };

  const updateStatus = async (id: string, newStatus: string) => {
    setIsUpdating(true);
    const token = localStorage.getItem("admin_token");
    try {
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
        toast({ title: "Status atualizado" });
      }
    } catch (e) {
      toast({ title: "Erro ao atualizar status", variant: "destructive" });
    } finally {
      setIsUpdating(false);
    }
  };

  const saveNotes = async () => {
    if (!selectedLead) return;
    setIsUpdating(true);
    const token = localStorage.getItem("admin_token");
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/leads/${selectedLead.id}/notes`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ notes })
      });
      if (response.ok) {
        fetchLeads();
        setSelectedLead({ ...selectedLead, internalNotes: notes });
        toast({ title: "Observações salvas" });
      }
    } catch (e) {
      toast({ title: "Erro ao salvar notas", variant: "destructive" });
    } finally {
      setIsUpdating(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `${label} copiado!` });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { class: string, icon: any, label: string }> = {
      'WAITING_HUMAN': { class: 'bg-red-100 text-red-700 border-red-200', icon: AlertCircle, label: 'Aguardando Humano' },
      'QUALIFIED': { class: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle2, label: 'Qualificado' },
      'ENGAGED': { class: 'bg-blue-100 text-blue-700 border-blue-200', icon: TrendingUp, label: 'Engajado' },
      'NEW': { class: 'bg-gray-100 text-gray-700 border-gray-200', icon: Clock, label: 'Novo' },
      'CONVERTED': { class: 'bg-purple-100 text-purple-700 border-purple-200', icon: CheckCircle2, label: 'Convertido' },
      'LOST': { class: 'bg-zinc-100 text-zinc-500 border-zinc-200', icon: XCircle, label: 'Perdido' },
    };
    
    const config = variants[status] || variants['NEW'];
    const Icon = config.icon;

    return (
      <Badge variant="outline" className={cn("font-semibold px-2 py-1 gap-1.5 flex items-center w-fit", config.class)}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, { class: string, label: string }> = {
      'URGENT': { class: 'bg-red-600 text-white border-none', label: 'Urgente' },
      'HIGH': { class: 'bg-orange-500 text-white border-none', label: 'Alta' },
      'MEDIUM': { class: 'bg-blue-500 text-white border-none', label: 'Média' },
      'LOW': { class: 'bg-zinc-400 text-white border-none', label: 'Baixa' },
    };
    
    const config = variants[priority] || variants['MEDIUM'];

    return (
      <Badge className={cn("text-[9px] h-4 px-1.5 uppercase font-black tracking-tighter", config.class)}>
        {config.label}
      </Badge>
    );
  };

  const getThermalInfo = (score: number) => {
    if (score >= 75) return { label: "Quente", color: "text-red-600", bg: "bg-red-500", icon: <TrendingUp className="h-3 w-3" /> };
    if (score >= 50) return { label: "Morno", color: "text-orange-600", bg: "bg-orange-500", icon: <TrendingUp className="h-3 w-3" /> };
    if (score >= 25) return { label: "Frio", color: "text-blue-600", bg: "bg-blue-500", icon: <TrendingUp className="h-3 w-3" /> };
    return { label: "Gelo", color: "text-gray-400", bg: "bg-gray-300", icon: <TrendingUp className="h-3 w-3" /> };
  };

  const handleWhatsAppHandoff = (lead: Lead) => {
    if (!lead.whatsapp) {
      toast({ title: "Erro", description: "WhatsApp não informado.", variant: "destructive" });
      return;
    }
    
    const cleanPhone = lead.whatsapp.replace(/\D/g, '');
    const phone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    
    const message = encodeURIComponent(
      `Olá ${lead.name || 'tudo bem'}! Aqui é da Vilpack Embalagens.\n\n` +
      `Vi seu interesse em ${lead.interestSummary || 'nossas soluções'} para o segmento de ${lead.segment || 'seu negócio'}.\n\n` +
      `Estou entrando em contato para dar continuidade ao seu atendimento. Como posso te ajudar hoje?`
    );
    
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto p-4 md:p-8 min-h-screen bg-zinc-50/30">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Painel de Performance</span>
          </div>
          <h2 className="text-4xl font-black tracking-tight text-zinc-900 flex items-center gap-4">
            Consultoria de Leads
            <Badge variant="secondary" className="bg-white border border-zinc-200 text-zinc-900 shadow-sm h-7 px-3">
              {filteredLeads.length} Ativos
            </Badge>
          </h2>
          <p className="text-zinc-500 mt-2 text-base font-medium">Pipeline comercial inteligente alimentado pela Vik.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative w-full md:w-80 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 group-focus-within:text-primary transition-colors" />
            <Input 
              placeholder="Nome, WhatsApp ou Segmento..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-white border-zinc-200 focus:ring-primary/20 h-12 rounded-xl shadow-sm"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[220px] bg-white border-zinc-200 h-12 rounded-xl shadow-sm">
              <Filter className="h-4 w-4 mr-2 text-zinc-400" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="ALL">Todos os Status</SelectItem>
              <SelectItem value="WAITING_HUMAN">Aguardando Humano</SelectItem>
              <SelectItem value="QUALIFIED">Qualificados</SelectItem>
              <SelectItem value="ENGAGED">Engajados</SelectItem>
              <SelectItem value="NEW">Novos</SelectItem>
              <SelectItem value="CONVERTED">Convertidos</SelectItem>
            </SelectContent>
          </Select>

          <Button 
            variant="outline" 
            onClick={fetchLeads} 
            disabled={isLoading}
            className="bg-white border-zinc-200 hover:bg-zinc-50 h-12 px-6 rounded-xl shadow-sm transition-all active:scale-95"
          >
            <Clock className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
            {isLoading ? "Sincronizando..." : "Sincronizar"}
          </Button>
        </div>
      </div>

      {isLoading && leads.length === 0 ? (
        <div className="h-[60vh] flex flex-col items-center justify-center bg-white rounded-3xl border border-zinc-200 shadow-sm">
          <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
          <p className="text-zinc-500 font-medium">Carregando inteligência comercial...</p>
        </div>
      ) : filteredLeads.length === 0 ? (
        <div className="h-[60vh] flex flex-col items-center justify-center bg-white rounded-3xl border border-zinc-200 shadow-sm">
          <div className="bg-zinc-50 p-6 rounded-full mb-4">
            <Search className="h-10 w-10 text-zinc-300" />
          </div>
          <h3 className="text-xl font-bold text-zinc-900">Nenhum lead encontrado</h3>
          <p className="text-zinc-500">Tente ajustar seus filtros ou busca.</p>
        </div>
      ) : (
        <Card className="border-zinc-200 shadow-2xl overflow-hidden rounded-3xl bg-white">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-zinc-50/50">
                <TableRow className="hover:bg-transparent border-b-zinc-100">
                  <TableHead className="w-[300px] py-6 font-bold text-zinc-900">Lead / Identificação</TableHead>
                  <TableHead className="font-bold text-zinc-900">Status & Qualificação</TableHead>
                  <TableHead className="font-bold text-zinc-900">Segmento</TableHead>
                  <TableHead className="font-bold text-zinc-900">Última Interação</TableHead>
                  <TableHead className="text-right py-6 font-bold text-zinc-900">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeads.map((lead) => {
                  const thermal = getThermalInfo(lead.qualificationScore);
                  return (
                    <TableRow 
                      key={lead.id} 
                      className="group cursor-pointer hover:bg-zinc-50/50 transition-colors border-b-zinc-100"
                      onClick={() => handleOpenDetail(lead.id)}
                    >
                      <TableCell className="py-5">
                        <div className="flex items-center gap-4 relative">
                          {!lead.isRead && (
                            <div className="absolute -left-1 top-0 h-2 w-2 bg-primary rounded-full animate-pulse shadow-sm shadow-primary/50" />
                          )}
                          <div className={cn(
                            "h-12 w-12 rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-lg shadow-zinc-200 group-hover:scale-105 transition-transform",
                            lead.priority === 'URGENT' ? "bg-red-600 animate-pulse" : "bg-zinc-900"
                          )}>
                            {(lead.name || 'L')[0].toUpperCase()}
                          </div>
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-zinc-900 text-base leading-none">
                                {lead.name || "Lead Anônimo"}
                              </span>
                              {getPriorityBadge(lead.priority)}
                            </div>
                            <span className="text-zinc-500 text-xs font-medium flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {lead.whatsapp || "Sem contato"}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-2">
                          {getStatusBadge(lead.status)}
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-24 bg-zinc-100 rounded-full overflow-hidden">
                              <div 
                                className={cn("h-full rounded-full transition-all duration-1000", thermal.bg)} 
                                style={{ width: `${lead.qualificationScore}%` }}
                              />
                            </div>
                            <span className={cn("text-[10px] font-black uppercase tracking-tighter", thermal.color)}>
                              {thermal.label} ({lead.qualificationScore}%)
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Briefcase className="h-4 w-4 text-zinc-400" />
                          <span className="font-semibold text-zinc-700">{lead.segment || "Não identificado"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-zinc-900">
                            {format(new Date(lead.lastInteractionAt), "dd 'de' MMM", { locale: ptBR })}
                          </span>
                          <span className="text-xs text-zinc-400 font-medium">
                            às {format(new Date(lead.lastInteractionAt), "HH:mm")}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right py-5">
                        <Button variant="ghost" size="icon" className="rounded-xl hover:bg-white hover:shadow-md transition-all">
                          <ExternalLink className="h-4 w-4 text-zinc-400" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Modal de Detalhes do Lead */}
      <Dialog open={!!selectedLead} onOpenChange={(open) => !open && setSelectedLead(null)}>
        <DialogContent className="max-w-6xl h-[90vh] p-0 overflow-hidden border-none rounded-[32px] shadow-2xl flex flex-col">
          {selectedLead && (
            <>
              {/* Header do Modal */}
              <div className="bg-zinc-900 p-8 text-white relative">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-6">
                    <div className="h-20 w-20 rounded-[24px] bg-white text-zinc-900 flex items-center justify-center text-3xl font-black shadow-2xl">
                      {(selectedLead.name || 'L')[0].toUpperCase()}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <h2 className="text-3xl font-black tracking-tight">{selectedLead.name || "Lead Anônimo"}</h2>
                        {getStatusBadge(selectedLead.status)}
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-zinc-400 font-medium">
                        <span className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer" onClick={() => copyToClipboard(selectedLead.whatsapp || '', 'WhatsApp')}>
                          <Phone className="h-4 w-4" /> {selectedLead.whatsapp || 'N/A'}
                        </span>
                        <span className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer" onClick={() => copyToClipboard(selectedLead.email || '', 'E-mail')}>
                          <Mail className="h-4 w-4" /> {selectedLead.email || 'N/A'}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Briefcase className="h-4 w-4" /> {selectedLead.segment || 'Segmento não informado'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-3">
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Score de Conversão</p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-5xl font-black leading-none">{selectedLead.qualificationScore}</span>
                        <span className="text-xl font-bold text-zinc-500">/100</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="secondary" 
                        className="bg-white/10 hover:bg-white/20 text-white border-none rounded-xl h-10 px-4"
                        onClick={() => handleWhatsAppHandoff(selectedLead)}
                      >
                        <MessageCircle className="h-4 w-4 mr-2" />
                        Assumir no WhatsApp
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Corpo do Modal */}
              <div className="flex-1 overflow-hidden flex bg-zinc-50/50">
                {/* Coluna Esquerda: Briefing & Ações */}
                <div className="w-1/3 p-8 border-r border-zinc-200 overflow-y-auto space-y-8">
                  {/* Briefing da Vik */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Briefing by Vik
                    </h3>
                    <div className="bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <FileText className="h-12 w-12" />
                      </div>
                      <p className="text-zinc-700 leading-relaxed font-medium italic relative z-10">
                        "{selectedLead.summary?.summary || "Aguardando interação suficiente para gerar resumo estratégico..."}"
                      </p>
                    </div>
                  </div>

                  {/* Observações Internas */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Notas do Time
                    </h3>
                    <div className="space-y-3">
                      <Textarea 
                        placeholder="Adicione observações estratégicas sobre este lead..." 
                        className="min-h-[120px] bg-white border-zinc-200 rounded-2xl resize-none focus:ring-primary/20 shadow-sm"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                      />
                      <Button 
                        className="w-full h-11 rounded-xl shadow-lg shadow-primary/10 transition-all active:scale-95"
                        onClick={saveNotes}
                        disabled={isUpdating}
                      >
                        {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar Observações"}
                      </Button>
                    </div>
                  </div>

                  {/* Alterar Status */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                      <Filter className="h-4 w-4" />
                      Fluxo de Atendimento
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                      {['NEW', 'ENGAGED', 'QUALIFIED', 'WAITING_HUMAN', 'CONVERTED', 'LOST'].map((s) => (
                        <Button
                          key={s}
                          variant={selectedLead.status === s ? "default" : "outline"}
                          size="sm"
                          className={cn(
                            "h-10 rounded-xl font-bold text-[11px]",
                            selectedLead.status === s && "shadow-lg shadow-primary/20"
                          )}
                          onClick={() => updateStatus(selectedLead.id, s)}
                          disabled={isUpdating}
                        >
                          {s}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Coluna Direita: Timeline de Chat */}
                <div className="flex-1 flex flex-col bg-white">
                  <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
                    <h3 className="text-sm font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Histórico da Conversa
                    </h3>
                    <Badge variant="outline" className="rounded-lg text-[10px] font-bold">
                      {selectedLead.session?.messages.length || 0} Mensagens
                    </Badge>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-8 space-y-6">
                    {selectedLead.session?.messages.map((msg, idx) => (
                      <div 
                        key={msg.id} 
                        className={cn(
                          "flex flex-col max-w-[85%] group animate-in fade-in slide-in-from-bottom-2 duration-300",
                          msg.role === 'user' ? "ml-auto items-end" : "items-start"
                        )}
                        style={{ animationDelay: `${idx * 50}ms` }}
                      >
                        <div className={cn(
                          "px-6 py-4 rounded-[28px] shadow-sm text-sm leading-relaxed",
                          msg.role === 'user' 
                            ? "bg-zinc-900 text-white rounded-tr-none" 
                            : "bg-zinc-50 border border-zinc-100 text-zinc-800 rounded-tl-none"
                        )}>
                          <p className="whitespace-pre-wrap font-medium">{msg.content}</p>
                        </div>
                        <span className="text-[10px] font-bold text-zinc-400 mt-2 px-2 uppercase tracking-tighter">
                          {msg.role === 'user' ? 'Cliente' : 'Vik'} • {format(new Date(msg.createdAt), "HH:mm")}
                        </span>
                      </div>
                    ))}
                    {(!selectedLead.session?.messages || selectedLead.session.messages.length === 0) && (
                      <div className="h-full flex flex-col items-center justify-center text-zinc-400 space-y-4">
                        <MessageSquare className="h-12 w-12 opacity-20" />
                        <p className="font-medium">Nenhum histórico disponível.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminLeads;
