/**
 * FichaComercial.tsx
 *
 * Painel de ficha comercial do cliente — CRM Vilpack.
 * Exibido na lateral direita do modal de detalhe do lead.
 * Focado em praticidade para atendimento individual.
 *
 * Permite edição inline de todos os campos comerciais.
 */
import { useState } from "react";
import {
  Building2, MapPin, ShoppingBag, Calendar, DollarSign,
  RefreshCw, Target, Clock, FileText, ChevronDown, ChevronUp,
  Check, Loader2, Pencil, X,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { API_URL } from "@/config/api";

// ── types ──────────────────────────────────────────────────────────────────────

export interface LeadComercial {
  id: string;
  companyName: string | null;
  city: string | null;
  segment: string | null;
  lastPurchaseAt: string | null;
  lastPurchaseValue: string | null;
  lastUnitPrice: string | null;
  mainProducts: string | null;
  purchaseFrequency: string | null;
  avgTicket: string | null;
  commercialCondition: string | null;
  nextAction: string | null;
  internalNotes: string | null;
  followUpAt: string | null;
}

interface Props {
  lead: LeadComercial;
  onSaved: (updated: Partial<LeadComercial>) => void;
}

// ── helpers ────────────────────────────────────────────────────────────────────

function formatCurrency(val: string | null): string {
  if (!val) return "—";
  const n = parseFloat(val);
  if (isNaN(n)) return val;
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(val: string | null): string {
  if (!val) return "—";
  try {
    return format(new Date(val), "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return val;
  }
}

// ── inline edit field ──────────────────────────────────────────────────────────

function EditField({
  label,
  value,
  onSave,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string | null;
  onSave: (val: string) => Promise<void>;
  placeholder?: string;
  type?: "text" | "date" | "number";
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(draft);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setDraft(value ?? "");
    setEditing(false);
  };

  return (
    <div className="group">
      <div
        className="text-[10px] font-semibold uppercase tracking-widest mb-0.5"
        style={{ color: "hsl(var(--admin-text-muted))" }}
      >
        {label}
      </div>
      {editing ? (
        <div className="flex items-center gap-1.5">
          <input
            type={type}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={placeholder}
            autoFocus
            className="flex-1 min-w-0 px-2 py-1 text-sm rounded-lg border outline-none"
            style={{
              borderColor: "hsl(var(--admin-yellow))",
              background: "white",
              color: "hsl(var(--admin-text-primary))",
              boxShadow: "0 0 0 2px hsl(var(--admin-yellow-soft))",
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
              if (e.key === "Escape") handleCancel();
            }}
          />
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 transition-colors"
            style={{ background: "hsl(var(--admin-yellow))", color: "#1C1C1E" }}
          >
            {saving ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
          </button>
          <button
            onClick={handleCancel}
            className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 transition-colors hover:bg-gray-100"
            style={{ color: "hsl(var(--admin-text-muted))" }}
          >
            <X size={11} />
          </button>
        </div>
      ) : (
        <div
          className="flex items-center gap-1.5 min-h-[24px] cursor-pointer rounded px-1 -mx-1 transition-colors hover:bg-[hsl(var(--admin-bg))]"
          onClick={() => { setDraft(value ?? ""); setEditing(true); }}
          title="Clique para editar"
        >
          <span
            className="text-sm flex-1"
            style={{
              color: value ? "hsl(var(--admin-text-primary))" : "hsl(var(--admin-text-muted))",
              fontStyle: value ? "normal" : "italic",
            }}
          >
            {value || placeholder || "—"}
          </span>
          <Pencil
            size={10}
            className="shrink-0 opacity-0 group-hover:opacity-60 transition-opacity"
            style={{ color: "hsl(var(--admin-text-muted))" }}
          />
        </div>
      )}
    </div>
  );
}

// ── main component ─────────────────────────────────────────────────────────────

export function FichaComercial({ lead, onSaved }: Props) {
  const [expanded, setExpanded] = useState(true);
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState(lead.internalNotes ?? "");

  const patchLead = async (fields: Partial<LeadComercial>) => {
    const token = localStorage.getItem("admin_token");
    const res = await fetch(`${API_URL}/admin/leads/${lead.id}/comercial`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(fields),
    });
    if (res.ok) {
      onSaved(fields);
    } else {
      throw new Error("Falha ao salvar");
    }
  };

  const saveField = (field: keyof LeadComercial) => async (val: string) => {
    await patchLead({ [field]: val || null });
  };

  const saveNotes = async () => {
    setSavingNotes(true);
    try {
      await patchLead({ internalNotes: notesDraft || null });
    } finally {
      setSavingNotes(false);
    }
  };

  return (
    <div className="admin-card overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 border-b transition-colors hover:bg-[hsl(var(--admin-bg))]"
        style={{ borderColor: "hsl(var(--admin-border))" }}
      >
        <span
          className="text-xs font-bold uppercase tracking-widest flex items-center gap-2"
          style={{ color: "hsl(var(--admin-text-secondary))" }}
        >
          <Building2 size={12} />
          Ficha Comercial
        </span>
        {expanded ? (
          <ChevronUp size={13} style={{ color: "hsl(var(--admin-text-muted))" }} />
        ) : (
          <ChevronDown size={13} style={{ color: "hsl(var(--admin-text-muted))" }} />
        )}
      </button>

      {expanded && (
        <div className="p-4 space-y-4">

          {/* Identificação */}
          <div className="grid grid-cols-2 gap-3">
            <EditField
              label="Empresa"
              value={lead.companyName}
              placeholder="Nome da empresa"
              onSave={saveField("companyName")}
            />
            <EditField
              label="Cidade / Região"
              value={lead.city}
              placeholder="Ex: São Paulo SP"
              onSave={saveField("city")}
            />
          </div>

          {/* Histórico comercial */}
          <div
            className="rounded-xl p-3 space-y-2.5"
            style={{ background: "hsl(var(--admin-bg))" }}
          >
            <div
              className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 mb-1"
              style={{ color: "hsl(var(--admin-text-muted))" }}
            >
              <ShoppingBag size={10} /> Histórico de compras
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-widest mb-0.5"
                  style={{ color: "hsl(var(--admin-text-muted))" }}>
                  Última compra
                </div>
                <div className="text-sm" style={{ color: "hsl(var(--admin-text-primary))" }}>
                  {formatDate(lead.lastPurchaseAt)}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-widest mb-0.5"
                  style={{ color: "hsl(var(--admin-text-muted))" }}>
                  Valor último pedido
                </div>
                <div className="text-sm font-semibold" style={{ color: "hsl(var(--admin-text-primary))" }}>
                  {formatCurrency(lead.lastPurchaseValue)}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-widest mb-0.5"
                  style={{ color: "hsl(var(--admin-text-muted))" }}>
                  Ticket médio
                </div>
                <div className="text-sm font-semibold" style={{ color: lead.avgTicket ? "#16A34A" : "hsl(var(--admin-text-muted))" }}>
                  {formatCurrency(lead.avgTicket)}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-widest mb-0.5"
                  style={{ color: "hsl(var(--admin-text-muted))" }}>
                  Frequência
                </div>
                <div className="text-sm" style={{ color: "hsl(var(--admin-text-primary))" }}>
                  {lead.purchaseFrequency || "—"}
                </div>
              </div>
            </div>
          </div>

          {/* Campos editáveis comerciais */}
          <div className="space-y-3">
            <EditField
              label="Produtos principais"
              value={lead.mainProducts}
              placeholder="Ex: sacola kraft, bobina picotada"
              onSave={saveField("mainProducts")}
            />
            <EditField
              label="Último preço unitário"
              value={lead.lastUnitPrice}
              placeholder="Ex: R$ 0,85 / un sacola média"
              onSave={saveField("lastUnitPrice")}
            />
            <EditField
              label="Condição comercial"
              value={lead.commercialCondition}
              placeholder="Ex: 30 dias, à vista 5%"
              onSave={saveField("commercialCondition")}
            />
          </div>

          {/* Próxima ação */}
          <div
            className="rounded-xl p-3"
            style={{ background: "hsl(var(--admin-yellow-soft))", border: "1px solid hsl(var(--admin-yellow))" }}
          >
            <div
              className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 mb-2"
              style={{ color: "hsl(42 80% 38%)" }}
            >
              <Target size={10} /> Próxima ação
            </div>
            <EditField
              label=""
              value={lead.nextAction}
              placeholder="Ex: Enviar tabela de sacolas até sexta"
              onSave={saveField("nextAction")}
            />
          </div>

          {/* Follow-up */}
          <EditField
            label="Follow-up agendado"
            value={lead.followUpAt ? lead.followUpAt.slice(0, 10) : null}
            placeholder="Selecione uma data"
            type="date"
            onSave={saveField("followUpAt")}
          />

          {/* Notas internas */}
          <div>
            <div
              className="text-[10px] font-semibold uppercase tracking-widest mb-1.5 flex items-center gap-1.5"
              style={{ color: "hsl(var(--admin-text-muted))" }}
            >
              <FileText size={10} /> Notas internas
            </div>
            <textarea
              value={notesDraft}
              onChange={(e) => setNotesDraft(e.target.value)}
              placeholder="Observações estratégicas, histórico informal…"
              rows={3}
              className="w-full text-sm rounded-lg px-3 py-2 resize-none outline-none border transition-all"
              style={{
                borderColor: "hsl(var(--admin-border))",
                background: "white",
                color: "hsl(var(--admin-text-primary))",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "hsl(var(--admin-yellow))";
                e.currentTarget.style.boxShadow = "0 0 0 2px hsl(var(--admin-yellow-soft))";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "hsl(var(--admin-border))";
                e.currentTarget.style.boxShadow = "none";
              }}
            />
            <button
              onClick={saveNotes}
              disabled={savingNotes || notesDraft === (lead.internalNotes ?? "")}
              className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-semibold px-3 h-7 rounded-lg transition-colors disabled:opacity-40"
              style={{
                background: "hsl(var(--admin-yellow))",
                color: "#1C1C1E",
              }}
            >
              {savingNotes ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
              Salvar notas
            </button>
          </div>

        </div>
      )}
    </div>
  );
}
