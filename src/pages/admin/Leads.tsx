import { useEffect, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Search, Filter, MessageSquare, Phone, Mail, TrendingUp, Briefcase,
  FileText, ExternalLink, Loader2, AlertCircle, CheckCircle2, XCircle,
  Clock, MessageCircle, Users, Zap, Star, RefreshCw, CalendarCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import { API_URL } from "@/config/api";
import { FichaComercial } from "@/components/admin/FichaComercial";
import type { LeadComercial } from "@/components/admin/FichaComercial";

// ── types ──────────────────────────────────────────────────────────────────────

interface Lead {
  id: string;
  name: string | null;
  whatsapp: string | null;
  email: string | null;
  segment: string | null;
  companyName: string | null;
  city: string | null;
  status: string;
  priority: string;
  isRead: boolean;
  qualificationScore: number;
  internalNotes: string | null;
  lastInteractionAt: string;
  createdAt: string;
  followUpAt: string | null;
  interestSummary: string | null;
  productsOfInterest: string | null;
  // commercial / CRM fields
  lastPurchaseAt: string | null;
  lastPurchaseValue: string | null;
  lastUnitPrice: string | null;
  mainProducts: string | null;
  purchaseFrequency: string | null;
  avgTicket: string | null;
  commercialCondition: string | null;
  nextAction: string | null;
  summary?: {
    summary: string | null;
    needDescription: string | null;
    nextRecommendedAction: string | null;
  };
  session?: {
    messages: {
      id: string;
      role: "user" | "assistant";
      content: string;
      createdAt: string;
    }[];
  };
}

// ── status / priority helpers ─────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string; Icon: React.ElementType }> = {
  WAITING_HUMAN: { bg: "hsl(var(--admin-red-soft))",    text: "#DC2626", label: "Aguardando humano", Icon: AlertCircle   },
  QUALIFIED:     { bg: "hsl(var(--admin-green-soft))",  text: "#16A34A", label: "Qualificado",       Icon: CheckCircle2  },
  ENGAGED:       { bg: "hsl(var(--admin-blue-soft))",   text: "#2563EB", label: "Engajado",          Icon: TrendingUp    },
  NEW:           { bg: "hsl(40 14% 94%)",               text: "#6B6B6B", label: "Novo",              Icon: Clock         },
  CONVERTED:     { bg: "hsl(270 60% 95%)",              text: "#7C3AED", label: "Convertido",        Icon: CheckCircle2  },
  LOST:          { bg: "hsl(0 0% 93%)",                 text: "#9CA3AF", label: "Perdido",           Icon: XCircle       },
};

const PRIORITY_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  URGENT: { bg: "#DC2626", text: "#fff", label: "Urgente" },
  HIGH:   { bg: "#EA580C", text: "#fff", label: "Alta"    },
  MEDIUM: { bg: "#2563EB", text: "#fff", label: "Média"   },
  LOW:    { bg: "#9CA3AF", text: "#fff", label: "Baixa"   },
};

const THERMAL = [
  { min: 75, label: "Quente", bar: "#EF4444", text: "#DC2626" },
  { min: 50, label: "Morno",  bar: "#F97316", text: "#EA580C" },
  { min: 25, label: "Frio",   bar: "#3B82F6", text: "#2563EB" },
  { min: 0,  label: "Gelo",   bar: "#D1D5DB", text: "#9CA3AF" },
];

function getThermal(score: number) {
  return THERMAL.find((t) => score >= t.min)!;
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.NEW;
  const Icon = cfg.Icon;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{ background: cfg.bg, color: cfg.text }}
    >
      <Icon size={11} />
      {cfg.label}
    </span>
  );
}

function PriorityDot({ priority }: { priority: string }) {
  const cfg = PRIORITY_CONFIG[priority] ?? PRIORITY_CONFIG.MEDIUM;
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide"
      style={{ background: cfg.bg, color: cfg.text }}
    >
      {cfg.label}
    </span>
  );
}

// ── metric card ────────────────────────────────────────────────────────────────

function MetricCard({
  label, value, sub, accent, Icon,
}: {
  label: string; value: string | number; sub?: string; accent?: string; Icon: React.ElementType;
}) {
  return (
    <div
      className="admin-card flex items-start gap-4 p-5"
      style={{ flex: "1 1 0" }}
    >
      <div
        className="admin-metric-icon shrink-0"
        style={{
          background: accent ?? "hsl(var(--admin-yellow-soft))",
        }}
      >
        <Icon size={18} style={{ color: accent ? "#fff" : "hsl(var(--admin-yellow))" }} />
      </div>
      <div className="min-w-0">
        <div className="admin-label">{label}</div>
        <div className="admin-metric-value mt-0.5">{value}</div>
        {sub && (
          <div className="text-xs mt-0.5" style={{ color: "hsl(var(--admin-text-muted))" }}>
            {sub}
          </div>
        )}
      </div>
    </div>
  );
}

// ── page ───────────────────────────────────────────────────────────────────────

const AdminLeads = () => {
  const [leads,          setLeads]          = useState<Lead[]>([]);
  const [filteredLeads,  setFilteredLeads]  = useState<Lead[]>([]);
  const [selectedLead,   setSelectedLead]   = useState<Lead | null>(null);
  const [search,         setSearch]         = useState("");
  const [statusFilter,   setStatusFilter]   = useState("ALL");
  const [isLoading,      setIsLoading]      = useState(true);
  const [isUpdating,     setIsUpdating]     = useState(false);
  const [notes,          setNotes]          = useState("");
  const { toast } = useToast();

  useEffect(() => { fetchLeads(); }, []);

  useEffect(() => {
    let result = leads;
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(
        (l) =>
          l.name?.toLowerCase().includes(s) ||
          l.whatsapp?.includes(s) ||
          l.email?.toLowerCase().includes(s) ||
          l.segment?.toLowerCase().includes(s),
      );
    }
    if (statusFilter !== "ALL") result = result.filter((l) => l.status === statusFilter);
    setFilteredLeads(result);
  }, [search, statusFilter, leads]);

  const fetchLeads = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`${API_URL}/admin/leads`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) { const data = await res.json(); setLeads(Array.isArray(data) ? data : (data.leads ?? [])); }
    } catch {
      toast({ title: "Erro", description: "Falha ao carregar leads.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDetail = async (leadId: string) => {
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`${API_URL}/admin/leads/${leadId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedLead(data);
        setNotes(data.internalNotes || "");
      }
    } catch (e) {
      console.error("Erro ao buscar detalhes:", e);
    }
  };

  const handleUpdateStatus = async (leadId: string, newStatus: string) => {
    setIsUpdating(true);
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`${API_URL}/admin/leads/${leadId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        toast({ title: "Status atualizado." });
        // Update local list state — no full re-fetch needed
        setLeads((prev) => prev.map((l) => l.id === leadId ? { ...l, status: newStatus } : l));
        if (selectedLead?.id === leadId) setSelectedLead({ ...selectedLead, status: newStatus });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!selectedLead) return;
    setIsUpdating(true);
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`${API_URL}/admin/leads/${selectedLead.id}/notes`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ notes }),
      });
      if (res.ok) { toast({ title: "Notas salvas." }); setLeads((prev) => prev.map((l) => l.id === selectedLead!.id ? { ...l, internalNotes: notes } : l)); }
    } catch (e) { console.error(e); }
    finally { setIsUpdating(false); }
  };

  /** Merge partial comercial updates back into selectedLead state */
  const handleFichaSaved = (updated: Partial<LeadComercial>) => {
    if (!selectedLead) return;
    setSelectedLead({ ...selectedLead, ...updated });
    // also update the list row so followUpAt / nextAction show in table
    setLeads((prev) => prev.map((l) => l.id === selectedLead.id ? { ...l, ...updated } : l));
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `${label} copiado!` });
  };

  const handleWhatsAppHandoff = (lead: Lead) => {
    if (!lead.whatsapp) {
      toast({ title: "Erro", description: "WhatsApp não informado.", variant: "destructive" });
      return;
    }
    const phone   = lead.whatsapp.replace(/\D/g, "");
    const intl    = phone.startsWith("55") ? phone : `55${phone}`;
    const message = encodeURIComponent(
      `Olá ${lead.name || "tudo bem"}! Aqui é da Vilpack Embalagens.\n\n` +
      `Vi seu interesse em ${lead.interestSummary || "nossas soluções"} para o segmento de ${lead.segment || "seu negócio"}.\n\n` +
      `Estou entrando em contato para dar continuidade ao seu atendimento. Como posso te ajudar hoje?`,
    );
    window.open(`https://wa.me/${intl}?text=${message}`, "_blank");
  };

  // ── metrics ──────────────────────────────────────────────────────────────────
  const total      = leads.length;
  const urgent     = leads.filter((l) => l.priority === "URGENT").length;
  const hot        = leads.filter((l) => l.qualificationScore >= 75).length;
  const converted  = leads.filter((l) => l.status === "CONVERTED").length;

  // ── render ────────────────────────────────────────────────────────────────────
  return (
    <div className="admin-page">
      {/* Page header */}
      <div className="mb-5 flex items-start justify-between gap-4 flex-wrap">
        <div className="admin-page-header mb-0">
          <div className="admin-page-header-icon">
            <Users size={18} style={{ color: "hsl(42 80% 38%)" }} />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span
                className="inline-block w-1.5 h-1.5 rounded-full animate-pulse"
                style={{ background: "hsl(var(--admin-yellow))" }}
              />
              <span className="admin-label">Pipeline Comercial</span>
            </div>
            <h2 className="admin-page-header-title">CRM / Leads</h2>
            <p className="admin-page-header-sub">Pipeline comercial alimentado pela Vick</p>
          </div>
        </div>

        <button
          onClick={fetchLeads}
          disabled={isLoading}
          className="admin-btn-secondary"
        >
          <RefreshCw size={13} className={cn(isLoading && "animate-spin")} />
          {isLoading ? "Sincronizando…" : "Atualizar"}
        </button>
      </div>

      {/* Metric cards */}
      <div className="flex gap-4 mb-5 flex-wrap">
        <MetricCard label="Total de leads"    value={total}     sub="no pipeline"         Icon={Users}       />
        <MetricCard label="Score quente"      value={hot}       sub="acima de 75%"        Icon={Zap}         accent="#EA580C" />
        <MetricCard label="Urgentes"          value={urgent}    sub="precisam de ação"    Icon={AlertCircle} accent="#DC2626" />
        <MetricCard label="Convertidos"       value={converted} sub="negócios fechados"   Icon={Star}        accent="#7C3AED" />
      </div>

      {/* Filters row */}
      <div className="admin-filter-row">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: "hsl(var(--admin-text-muted))" }}
          />
          <Input
            placeholder="Nome, WhatsApp, segmento…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 bg-white text-sm"
            style={{ borderColor: "hsl(var(--admin-border))" }}
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger
            className="w-[200px] h-9 bg-white text-sm"
            style={{ borderColor: "hsl(var(--admin-border))" }}
          >
            <Filter size={13} className="mr-2" style={{ color: "hsl(var(--admin-text-muted))" }} />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos os status</SelectItem>
            <SelectItem value="WAITING_HUMAN">Aguardando humano</SelectItem>
            <SelectItem value="QUALIFIED">Qualificados</SelectItem>
            <SelectItem value="ENGAGED">Engajados</SelectItem>
            <SelectItem value="NEW">Novos</SelectItem>
            <SelectItem value="CONVERTED">Convertidos</SelectItem>
          </SelectContent>
        </Select>

        <div
          className="text-xs ml-auto"
          style={{ color: "hsl(var(--admin-text-muted))" }}
        >
          {filteredLeads.length} resultado{filteredLeads.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Table area */}
      {isLoading && leads.length === 0 ? (
        <div className="admin-card">
          <div className="admin-empty-state">
            <div className="admin-empty-state-icon">
              <Loader2 size={24} className="animate-spin" style={{ color: "hsl(var(--admin-yellow))" }} />
            </div>
            <p className="admin-empty-state-title">Carregando leads…</p>
          </div>
        </div>
      ) : filteredLeads.length === 0 ? (
        <div className="admin-card">
          <div className="admin-empty-state">
            <div className="admin-empty-state-icon">
              <Search size={24} />
            </div>
            <p className="admin-empty-state-title">Nenhum lead encontrado</p>
            <p className="admin-empty-state-sub">Ajuste os filtros ou aguarde novas interações</p>
          </div>
        </div>
      ) : (
        <div className="admin-card overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow
                  className="hover:bg-transparent border-b"
                  style={{ borderColor: "hsl(var(--admin-border))" }}
                >
                  {["Lead / Identificação", "Status & Score", "Segmento", "Última interação", ""].map((h) => (
                    <TableHead
                      key={h}
                      className={cn("admin-th", h === "" && "text-right")}
                    >
                      {h}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>

              <TableBody>
                {filteredLeads.map((lead) => {
                  const th = getThermal(lead.qualificationScore);
                  return (
                    <TableRow
                      key={lead.id}
                      className="admin-row-hover cursor-pointer border-b"
                      style={{ borderColor: "hsl(var(--admin-border))" }}
                      onClick={() => handleOpenDetail(lead.id)}
                    >
                      {/* Identity */}
                      <TableCell className="py-4">
                        <div className="flex items-center gap-3 relative">
                          {!lead.isRead && (
                            <span
                              className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full animate-pulse"
                              style={{ background: "hsl(var(--admin-yellow))" }}
                            />
                          )}
                          <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 select-none"
                            style={{
                              background:
                                lead.priority === "URGENT"
                                  ? "#DC2626"
                                  : "hsl(var(--admin-sidebar-bg))",
                              color: "#fff",
                            }}
                          >
                            {(lead.name || "L")[0].toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span
                                className="font-semibold text-sm"
                                style={{ color: "hsl(var(--admin-text-primary))" }}
                              >
                                {lead.name || "Lead Anônimo"}
                              </span>
                              <PriorityDot priority={lead.priority} />
                            </div>
                            <span
                              className="text-xs flex items-center gap-1"
                              style={{ color: "hsl(var(--admin-text-muted))" }}
                            >
                              <Phone size={10} />
                              {lead.whatsapp || "Sem contato"}
                            </span>
                          </div>
                        </div>
                      </TableCell>

                      {/* Status + score */}
                      <TableCell className="py-4">
                        <div className="flex flex-col gap-1.5">
                          <StatusBadge status={lead.status} />
                          <div className="flex items-center gap-2">
                            <div
                              className="h-1 w-20 rounded-full overflow-hidden"
                              style={{ background: "hsl(var(--admin-border))" }}
                            >
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${lead.qualificationScore}%`,
                                  background: th.bar,
                                }}
                              />
                            </div>
                            <span
                              className="text-[10px] font-bold uppercase tracking-wide"
                              style={{ color: th.text }}
                            >
                              {th.label} {lead.qualificationScore}%
                            </span>
                          </div>
                        </div>
                      </TableCell>

                      {/* Segment */}
                      <TableCell className="py-4">
                        <div className="flex items-center gap-1.5">
                          <Briefcase size={13} style={{ color: "hsl(var(--admin-text-muted))" }} />
                          <span
                            className="text-sm font-medium"
                            style={{ color: "hsl(var(--admin-text-secondary))" }}
                          >
                            {lead.segment || "—"}
                          </span>
                        </div>
                      </TableCell>

                      {/* Date */}
                      <TableCell className="py-4">
                        <span
                          className="text-sm font-medium"
                          style={{ color: "hsl(var(--admin-text-primary))" }}
                        >
                          {format(new Date(lead.lastInteractionAt), "dd MMM", { locale: ptBR })}
                        </span>
                        <br />
                        <span
                          className="text-xs"
                          style={{ color: "hsl(var(--admin-text-muted))" }}
                        >
                          {format(new Date(lead.lastInteractionAt), "HH:mm")}
                        </span>
                      </TableCell>

                      {/* Action */}
                      <TableCell className="py-4 text-right">
                        <button
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg transition-colors hover:bg-gray-100"
                          style={{ color: "hsl(var(--admin-text-muted))" }}
                          onClick={(e) => { e.stopPropagation(); handleOpenDetail(lead.id); }}
                        >
                          <ExternalLink size={14} />
                        </button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* ── Lead detail dialog ───────────────────────────────────────────────── */}
      <Dialog open={!!selectedLead} onOpenChange={(open) => !open && setSelectedLead(null)}>
        <DialogContent
          className="max-w-6xl h-[90vh] p-0 overflow-hidden border-none flex flex-col"
          style={{ borderRadius: "20px", boxShadow: "var(--admin-shadow-modal)" }}
          aria-describedby={undefined}
        >
          <DialogTitle className="sr-only">
            Detalhes do Lead {selectedLead?.name || ""}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Informações completas, histórico de conversa e ações do lead selecionado.
          </DialogDescription>

          {selectedLead && (
            <>
              {/* Modal header */}
              <div
                className="p-7 text-white shrink-0"
                style={{ background: "hsl(var(--admin-sidebar-bg))" }}
              >
                <div className="flex items-start justify-between gap-6">
                  <div className="flex items-center gap-5">
                    <div
                      className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black shrink-0"
                      style={{ background: "hsl(var(--admin-yellow))", color: "#1C1C1E" }}
                    >
                      {(selectedLead.name || "L")[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-3 flex-wrap">
                        <h2
                          className="font-bold text-xl tracking-tight"
                          style={{ color: "hsl(0 0% 95%)" }}
                        >
                          {selectedLead.name || "Lead Anônimo"}
                        </h2>
                        <StatusBadge status={selectedLead.status} />
                      </div>
                      <div
                        className="flex flex-wrap items-center gap-4 mt-1.5 text-sm"
                        style={{ color: "hsl(0 0% 55%)" }}
                      >
                        <button
                          className="flex items-center gap-1.5 hover:text-white transition-colors"
                          onClick={() => copyToClipboard(selectedLead.whatsapp || "", "WhatsApp")}
                        >
                          <Phone size={13} /> {selectedLead.whatsapp || "N/A"}
                        </button>
                        <button
                          className="flex items-center gap-1.5 hover:text-white transition-colors"
                          onClick={() => copyToClipboard(selectedLead.email || "", "E-mail")}
                        >
                          <Mail size={13} /> {selectedLead.email || "N/A"}
                        </button>
                        <span className="flex items-center gap-1.5">
                          <Briefcase size={13} /> {selectedLead.segment || "Segmento não informado"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-3 shrink-0">
                    <div className="text-right">
                      <p
                        className="admin-label"
                        style={{ color: "hsl(0 0% 40%)" }}
                      >
                        Score de conversão
                      </p>
                      <div className="flex items-baseline gap-1.5 mt-0.5">
                        <span
                          className="font-black leading-none"
                          style={{ fontSize: "2.5rem", color: "hsl(var(--admin-yellow))" }}
                        >
                          {selectedLead.qualificationScore}
                        </span>
                        <span style={{ color: "hsl(0 0% 45%)", fontWeight: 600 }}>/100</span>
                      </div>
                    </div>
                    {/* Quick actions */}
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                      <button
                        onClick={() => handleWhatsAppHandoff(selectedLead)}
                        className="inline-flex items-center gap-2 px-4 h-9 rounded-lg text-sm font-semibold transition-colors"
                        style={{
                          background: "hsl(var(--admin-yellow))",
                          color: "#1C1C1E",
                        }}
                      >
                        <MessageCircle size={14} />
                        Assumir no WhatsApp
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(selectedLead.id, "CONVERTED")}
                        disabled={isUpdating || selectedLead.status === "CONVERTED"}
                        className="inline-flex items-center gap-2 px-3 h-9 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
                        style={{
                          background: "hsl(270 60% 95%)",
                          color: "#7C3AED",
                          border: "1px solid #7C3AED40",
                        }}
                        title="Marcar como convertido"
                      >
                        <CheckCircle2 size={14} />
                        Convertido
                      </button>
                      <button
                        onClick={() => {
                          const date = prompt(
                            "Data do follow-up (AAAA-MM-DD):",
                            selectedLead.followUpAt?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
                          );
                          if (date !== null) handleFichaSaved({ followUpAt: date || null });
                        }}
                        className="inline-flex items-center gap-2 px-3 h-9 rounded-lg text-sm font-semibold transition-colors"
                        style={{
                          background: "hsl(var(--admin-blue-soft, 210 60% 95%))",
                          color: "#2563EB",
                          border: "1px solid #2563EB40",
                        }}
                        title="Agendar follow-up"
                      >
                        <CalendarCheck size={14} />
                        {selectedLead.followUpAt
                          ? format(new Date(selectedLead.followUpAt), "dd/MM", { locale: ptBR })
                          : "Follow-up"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal body */}
              <div
                className="flex-1 overflow-hidden flex"
                style={{ background: "hsl(var(--admin-bg))" }}
              >
                {/* Left column */}
                <div
                  className="w-[340px] shrink-0 flex flex-col gap-4 p-5 overflow-y-auto border-r admin-scrollbar"
                  style={{ borderColor: "hsl(var(--admin-border))" }}
                >
                  {/* Briefing by Vick */}
                  <section>
                    <div className="admin-label mb-2 flex items-center gap-1.5">
                      <TrendingUp size={11} /> Briefing by Vick
                    </div>
                    <div
                      className="admin-card p-4 text-sm leading-relaxed italic"
                      style={{ color: "hsl(var(--admin-text-secondary))" }}
                    >
                      "{selectedLead.summary?.summary || "Aguardando interação suficiente para gerar resumo…"}"
                    </div>
                  </section>

                  {/* Ficha Comercial */}
                  <FichaComercial
                    lead={selectedLead}
                    onSaved={handleFichaSaved}
                  />

                  {/* Status flow */}
                  <section>
                    <div className="admin-label mb-2 flex items-center gap-1.5">
                      <Filter size={11} /> Fluxo de atendimento
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {["NEW", "ENGAGED", "QUALIFIED", "WAITING_HUMAN", "CONVERTED", "LOST"].map((s) => {
                        const cfg   = STATUS_CONFIG[s] ?? STATUS_CONFIG.NEW;
                        const active = selectedLead.status === s;
                        return (
                          <button
                            key={s}
                            onClick={() => handleUpdateStatus(selectedLead.id, s)}
                            disabled={isUpdating}
                            className="h-8 rounded-lg text-xs font-semibold transition-all border"
                            style={{
                              background: active ? cfg.bg : "white",
                              color: active ? cfg.text : "hsl(var(--admin-text-secondary))",
                              borderColor: active ? cfg.text + "40" : "hsl(var(--admin-border))",
                              fontWeight: active ? 700 : 500,
                            }}
                          >
                            {cfg.label}
                          </button>
                        );
                      })}
                    </div>
                  </section>
                </div>

                {/* Right column — chat transcript */}
                <div className="flex-1 flex flex-col bg-white">
                  <div
                    className="px-6 py-4 border-b flex items-center justify-between shrink-0"
                    style={{ borderColor: "hsl(var(--admin-border))" }}
                  >
                    <div className="admin-label flex items-center gap-1.5">
                      <MessageSquare size={11} /> Histórico da conversa
                    </div>
                    <span
                      className="text-xs font-semibold px-2.5 py-1 rounded-full"
                      style={{
                        background: "hsl(var(--admin-bg))",
                        color: "hsl(var(--admin-text-secondary))",
                      }}
                    >
                      {selectedLead.session?.messages.length || 0} mensagens
                    </span>
                  </div>

                  <div className="flex-1 overflow-y-auto admin-scrollbar p-6 space-y-4">
                    {selectedLead.session?.messages.map((msg, idx) => (
                      <div
                        key={msg.id}
                        className={cn(
                          "flex flex-col max-w-[80%]",
                          msg.role === "user" ? "ml-auto items-end" : "items-start",
                        )}
                        style={{ animationDelay: `${idx * 30}ms` }}
                      >
                        <div
                          className="px-4 py-3 rounded-2xl text-sm leading-relaxed"
                          style={
                            msg.role === "user"
                              ? {
                                  background: "hsl(var(--admin-sidebar-bg))",
                                  color: "hsl(0 0% 92%)",
                                  borderRadius: "18px 18px 4px 18px",
                                }
                              : {
                                  background: "hsl(var(--admin-bg))",
                                  color: "hsl(var(--admin-text-primary))",
                                  border: "1px solid hsl(var(--admin-border))",
                                  borderRadius: "18px 18px 18px 4px",
                                }
                          }
                        >
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                        </div>
                        <span
                          className="text-[10px] mt-1 px-1 uppercase tracking-wide font-semibold"
                          style={{ color: "hsl(var(--admin-text-muted))" }}
                        >
                          {msg.role === "user" ? "Cliente" : "Vick"} •{" "}
                          {format(new Date(msg.createdAt), "HH:mm")}
                        </span>
                      </div>
                    ))}

                    {(!selectedLead.session?.messages ||
                      selectedLead.session.messages.length === 0) && (
                      <div
                        className="flex flex-col items-center justify-center py-20 gap-3"
                      >
                        <div
                          className="w-12 h-12 rounded-2xl flex items-center justify-center"
                          style={{ background: "hsl(var(--admin-bg))" }}
                        >
                          <MessageSquare
                            size={20}
                            style={{ color: "hsl(var(--admin-text-muted))" }}
                          />
                        </div>
                        <p
                          className="text-sm"
                          style={{ color: "hsl(var(--admin-text-secondary))" }}
                        >
                          Nenhum histórico disponível.
                        </p>
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
