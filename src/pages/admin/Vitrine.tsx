/**
 * Vitrine.tsx — Admin: Gestão da seção "Nossos Produtos" do site público.
 *
 * Permite ao admin:
 * - Ver todos os produtos do catálogo
 * - Publicar / ocultar produtos na vitrine do site com um toggle
 * - Editar nome, preço, segmento, tags e foto de cada produto inline
 * - Reorganizar a ordem de exibição
 *
 * Visual: segue o design system do admin (graphite sidebar, yellow accent, off-white bg, white cards).
 */

import { useEffect, useRef, useState } from "react";
import {
  Eye, EyeOff, ImagePlus, Loader2, RefreshCw, Search, Tag,
  DollarSign, LayoutGrid, List, Globe, X, Check, Pencil, Trash2,
  Package, ChevronDown,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import { API_URL } from "@/config/api";

// ── types ──────────────────────────────────────────────────────────────────────

interface VitrineProduct {
  id: string;
  name: string;
  description: string | null;
  price: string;
  imageUrl: string | null;
  active: boolean;
  showInVitrine: boolean;
  vitrineSegment: string | null;
  vitrineTags: string | null;
  vitrineOrder: number;
  category: { id: string; name: string } | null;
}

// ── constants ──────────────────────────────────────────────────────────────────

const SEGMENTS = ["Mercado", "Padaria", "Limpeza", "Indústria", "Sacolas", "Bobinas", "Isopor", "Descartáveis"];

// ── helpers ────────────────────────────────────────────────────────────────────

/** Resolve a full image URL from the stored path */
function getImageSrc(imageUrl: string | null): string | null {
  if (!imageUrl) return null;
  // imageUrl já é caminho relativo ("/uploads/products/...") — retorna direto.
  // Nunca prefixar com VITE_API_URL; em produção o nginx serve /uploads estaticamente.
  if (imageUrl.startsWith("http")) return imageUrl;
  return imageUrl;
}

function getAuthHeader() {
  const token = localStorage.getItem("admin_token");
  return { Authorization: `Bearer ${token}` };
}

// ── inline edit field ──────────────────────────────────────────────────────────

function InlineField({
  value,
  onSave,
  placeholder,
  type = "text",
  className,
}: {
  value: string;
  onSave: (v: string) => Promise<void>;
  placeholder?: string;
  type?: "text" | "number";
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (draft === value) { setEditing(false); return; }
    setSaving(true);
    try { await onSave(draft); setEditing(false); }
    finally { setSaving(false); }
  };

  const cancel = () => { setDraft(value); setEditing(false); };

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <input
          autoFocus
          type={type}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={placeholder}
          onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") cancel(); }}
          className={cn(
            "flex-1 min-w-0 px-2 py-0.5 text-sm rounded border outline-none",
            "border-[hsl(var(--admin-yellow))] shadow-[0_0_0_2px_hsl(var(--admin-yellow-soft))]",
            className,
          )}
          style={{ background: "white", color: "hsl(var(--admin-text-primary))" }}
        />
        <button
          onClick={save}
          disabled={saving}
          className="w-5 h-5 rounded flex items-center justify-center shrink-0"
          style={{ background: "hsl(var(--admin-yellow))", color: "#1C1C1E" }}
        >
          {saving ? <Loader2 size={10} className="animate-spin" /> : <Check size={10} />}
        </button>
        <button onClick={cancel} className="w-5 h-5 rounded flex items-center justify-center shrink-0 hover:bg-gray-100" style={{ color: "hsl(var(--admin-text-muted))" }}>
          <X size={10} />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => { setDraft(value); setEditing(true); }}
      className="group flex items-center gap-1 w-full text-left rounded px-1 -mx-1 transition-colors hover:bg-[hsl(var(--admin-bg))]"
      title="Clique para editar"
    >
      <span className={cn("text-sm flex-1 truncate", !value && "italic text-[hsl(var(--admin-text-muted))]", className)}>
        {value || placeholder || "—"}
      </span>
      <Pencil size={9} className="shrink-0 opacity-0 group-hover:opacity-50 transition-opacity" style={{ color: "hsl(var(--admin-text-muted))" }} />
    </button>
  );
}

// ── product card ───────────────────────────────────────────────────────────────

function ProductCard({
  product,
  onUpdate,
  onImageChange,
  onRemoveImage,
}: {
  product: VitrineProduct;
  onUpdate: (id: string, data: Partial<VitrineProduct>) => Promise<void>;
  onImageChange: (id: string, file: File) => Promise<void>;
  onRemoveImage: (id: string) => Promise<void>;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [togglingPublish, setTogglingPublish] = useState(false);
  const [segmentOpen, setSegmentOpen] = useState(false);
  const segmentRef = useRef<HTMLDivElement>(null);
  const imgSrc = getImageSrc(product.imageUrl);

  // Segmentos ativos: lê vitrineSegment como CSV
  const activeSegments: string[] = product.vitrineSegment
    ? product.vitrineSegment.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  const toggleSegment = async (seg: string) => {
    const next = activeSegments.includes(seg)
      ? activeSegments.filter((s) => s !== seg)
      : [...activeSegments, seg];
    await onUpdate(product.id, { vitrineSegment: next.length > 0 ? next.join(",") : null } as Partial<VitrineProduct>);
  };

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (segmentRef.current && !segmentRef.current.contains(e.target as Node)) {
        setSegmentOpen(false);
      }
    };
    if (segmentOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [segmentOpen]);

  const patch = (field: keyof VitrineProduct, value: unknown) =>
    onUpdate(product.id, { [field]: value } as Partial<VitrineProduct>);

  const handleImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try { await onImageChange(product.id, file); }
    finally { setUploadingImage(false); e.target.value = ""; }
  };

  const handleTogglePublish = async () => {
    setTogglingPublish(true);
    try { await patch("showInVitrine", !product.showInVitrine); }
    finally { setTogglingPublish(false); }
  };

  return (
    <div
      className={cn(
        "admin-card overflow-hidden flex flex-col transition-all duration-200",
        product.showInVitrine
          ? "ring-2 ring-[hsl(var(--admin-yellow))] ring-offset-1"
          : "opacity-80",
      )}
    >
      {/* Image area */}
      <div
        className="relative aspect-[4/3] bg-[hsl(var(--admin-bg))] flex items-center justify-center group cursor-pointer overflow-hidden"
        onClick={() => fileRef.current?.click()}
        title="Clique para trocar a foto"
      >
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={product.name}
            className="w-full h-full object-cover group-hover:opacity-80 transition-opacity"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-center px-4">
            <Package size={28} style={{ color: "hsl(var(--admin-text-muted))" }} />
            <span className="text-xs" style={{ color: "hsl(var(--admin-text-muted))" }}>
              Sem foto
            </span>
          </div>
        )}

        {/* Upload overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
          {uploadingImage
            ? <Loader2 size={22} className="animate-spin text-white" />
            : <ImagePlus size={22} className="text-white" />
          }
        </div>

        {/* Remove image button */}
        {imgSrc && (
          <button
            onClick={(e) => { e.stopPropagation(); onRemoveImage(product.id); }}
            className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center bg-black/60 hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
            title="Remover foto"
          >
            <Trash2 size={11} className="text-white" />
          </button>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageFile}
        />
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col gap-3 flex-1">
        {/* Name */}
        <InlineField
          value={product.name}
          onSave={(v) => patch("name", v)}
          placeholder="Nome do produto"
          className="font-semibold"
        />

        {/* Price */}
        <div className="flex items-center gap-1.5">
          <DollarSign size={11} style={{ color: "hsl(var(--admin-text-muted))" }} />
          <InlineField
            value={product.price === "0" ? "" : product.price}
            onSave={(v) => patch("price", v || "0")}
            placeholder="0,00"
            type="number"
            className="text-green-700 font-semibold"
          />
        </div>

        {/* Segment — multi-select dropdown */}
        <div className="flex items-center gap-1.5 relative" ref={segmentRef}>
          <LayoutGrid size={11} style={{ color: "hsl(var(--admin-text-muted))" }} className="shrink-0" />
          <button
            onClick={() => setSegmentOpen((v) => !v)}
            className="flex-1 flex items-center justify-between text-xs rounded border px-2 py-1 bg-white outline-none hover:border-[hsl(var(--admin-yellow))] transition-colors"
            style={{ borderColor: "hsl(var(--admin-border))", color: activeSegments.length > 0 ? "hsl(var(--admin-text-primary))" : "hsl(var(--admin-text-muted))" }}
          >
            <span className="truncate">
              {activeSegments.length > 0 ? activeSegments.join(", ") : "Segmento…"}
            </span>
            <ChevronDown size={10} className="shrink-0 ml-1 opacity-50" />
          </button>
          {segmentOpen && (
            <div
              className="absolute top-full left-0 right-0 mt-1 z-30 bg-white rounded-lg border shadow-lg py-1 max-h-48 overflow-y-auto"
              style={{ borderColor: "hsl(var(--admin-border))" }}
            >
              {SEGMENTS.map((seg) => {
                const checked = activeSegments.includes(seg);
                return (
                  <label
                    key={seg}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs cursor-pointer hover:bg-[hsl(var(--admin-bg))] select-none"
                    style={{ color: checked ? "hsl(var(--admin-yellow))" : "hsl(var(--admin-text-primary))", fontWeight: checked ? 600 : 400 }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleSegment(seg)}
                      className="accent-[hsl(var(--admin-yellow))]"
                    />
                    {seg}
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* Tags */}
        <div className="flex items-start gap-1.5">
          <Tag size={11} className="mt-1 shrink-0" style={{ color: "hsl(var(--admin-text-muted))" }} />
          <InlineField
            value={product.vitrineTags ?? ""}
            onSave={(v) => patch("vitrineTags", v || null)}
            placeholder="Tag1, Tag2, Tag3"
          />
        </div>

        {/* Category badge */}
        {product.category && (
          <div>
            <span
              className="inline-flex items-center text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide"
              style={{ background: "hsl(var(--admin-bg))", color: "hsl(var(--admin-text-muted))" }}
            >
              {product.category.name}
            </span>
          </div>
        )}

        {/* Publish toggle */}
        <button
          onClick={handleTogglePublish}
          disabled={togglingPublish}
          className={cn(
            "mt-auto w-full h-9 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all",
            product.showInVitrine
              ? "bg-[hsl(var(--admin-yellow))] text-[#1C1C1E]"
              : "bg-white border text-[hsl(var(--admin-text-secondary))]",
          )}
          style={!product.showInVitrine ? { borderColor: "hsl(var(--admin-border))" } : undefined}
        >
          {togglingPublish
            ? <Loader2 size={13} className="animate-spin" />
            : product.showInVitrine
              ? <><Eye size={13} /> Publicado no site</>
              : <><EyeOff size={13} /> Publicar no site</>
          }
        </button>
      </div>
    </div>
  );
}

// ── metric card ────────────────────────────────────────────────────────────────

function MetricCard({ label, value, Icon, accent }: { label: string; value: number; Icon: React.ElementType; accent?: string }) {
  return (
    <div className="admin-card flex items-center gap-4 p-4" style={{ flex: "1 1 0" }}>
      <div
        className="admin-metric-icon shrink-0"
        style={{ background: accent ?? "hsl(var(--admin-yellow-soft))" }}
      >
        <Icon size={16} style={{ color: accent ? "#fff" : "hsl(var(--admin-yellow))" }} />
      </div>
      <div>
        <div className="admin-label">{label}</div>
        <div className="admin-metric-value">{value}</div>
      </div>
    </div>
  );
}

// ── page ───────────────────────────────────────────────────────────────────────

const AdminVitrine = () => {
  const [products, setProducts] = useState<VitrineProduct[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "published" | "unpublished">("all");
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => { fetchProducts(); }, []);

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/admin/vitrine`, {
        headers: getAuthHeader(),
      });
      if (res.ok) setProducts(await res.json());
      else toast({ title: "Erro ao carregar produtos", variant: "destructive" });
    } catch {
      toast({ title: "Falha de conexão", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  /** Optimistic update: apply locally immediately, then persist */
  const handleUpdate = async (id: string, data: Partial<VitrineProduct>) => {
    // Optimistic
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...data } : p)),
    );
    try {
      const res = await fetch(`${API_URL}/admin/vitrine/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setProducts((prev) => prev.map((p) => (p.id === id ? updated : p)));
    } catch {
      toast({ title: "Erro ao salvar", variant: "destructive" });
      fetchProducts(); // rollback
    }
  };

  const handleImageChange = async (id: string, file: File) => {
    const form = new FormData();
    form.append("image", file);
    const res = await fetch(`${API_URL}/admin/vitrine/${id}/image`, {
      method: "POST",
      headers: getAuthHeader(),
      body: form,
    });
    if (res.ok) {
      const updated = await res.json();
      setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...updated } : p)));
      toast({ title: "Foto atualizada." });
    } else {
      toast({ title: "Erro no upload", variant: "destructive" });
    }
  };

  const handleRemoveImage = async (id: string) => {
    const res = await fetch(`${API_URL}/admin/vitrine/${id}/image`, {
      method: "DELETE",
      headers: getAuthHeader(),
    });
    if (res.ok) {
      setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, imageUrl: null } : p)));
      toast({ title: "Foto removida." });
    } else {
      toast({ title: "Erro ao remover foto", variant: "destructive" });
    }
  };

  // ── derived ────────────────────────────────────────────────────────────────

  const published   = products.filter((p) => p.showInVitrine);
  const unpublished = products.filter((p) => !p.showInVitrine);

  const filtered = products
    .filter((p) => {
      if (filter === "published")   return p.showInVitrine;
      if (filter === "unpublished") return !p.showInVitrine;
      return true;
    })
    .filter((p) => {
      if (!search) return true;
      const s = search.toLowerCase();
      return (
        p.name.toLowerCase().includes(s) ||
        p.category?.name.toLowerCase().includes(s) ||
        p.vitrineSegment?.toLowerCase().includes(s) ||
        p.vitrineTags?.toLowerCase().includes(s)
      );
    });

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div className="admin-page">

      {/* Header */}
      <div className="mb-5 flex items-start justify-between gap-4 flex-wrap">
        <div className="admin-page-header mb-0">
          <div className="admin-page-header-icon">
            <Globe size={18} style={{ color: "hsl(42 80% 38%)" }} />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span
                className="inline-block w-1.5 h-1.5 rounded-full"
                style={{ background: published.length > 0 ? "#16A34A" : "hsl(var(--admin-text-muted))" }}
              />
              <span className="admin-label">Vitrine Pública</span>
            </div>
            <h2 className="admin-page-header-title">Nossos Produtos</h2>
            <p className="admin-page-header-sub">Gerencie o que aparece na seção "Nossos Produtos" do site</p>
          </div>
        </div>

        <button
          onClick={fetchProducts}
          disabled={isLoading}
          className="admin-btn-secondary"
        >
          <RefreshCw size={13} className={cn(isLoading && "animate-spin")} />
          {isLoading ? "Carregando…" : "Atualizar"}
        </button>
      </div>

      {/* Metrics */}
      <div className="flex gap-4 mb-5 flex-wrap">
        <MetricCard label="Total no catálogo"   value={products.length}   Icon={List}    />
        <MetricCard label="Publicados no site"  value={published.length}  Icon={Eye}     accent="#16A34A" />
        <MetricCard label="Ocultos"             value={unpublished.length} Icon={EyeOff} accent="#9CA3AF" />
      </div>

      {/* Filter + Search */}
      <div className="admin-filter-row mb-5">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: "hsl(var(--admin-text-muted))" }}
          />
          <Input
            placeholder="Nome, segmento, tags…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 bg-white text-sm"
            style={{ borderColor: "hsl(var(--admin-border))" }}
          />
        </div>

        {(["all", "published", "unpublished"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "h-9 px-4 rounded-lg text-sm font-semibold transition-colors border",
              filter === f
                ? "bg-[hsl(var(--admin-sidebar-bg))] text-white border-transparent"
                : "bg-white border-[hsl(var(--admin-border))] text-[hsl(var(--admin-text-secondary))] hover:bg-[hsl(var(--admin-bg))]",
            )}
          >
            {{ all: "Todos", published: "Publicados", unpublished: "Ocultos" }[f]}
          </button>
        ))}

        <span className="text-xs ml-auto" style={{ color: "hsl(var(--admin-text-muted))" }}>
          {filtered.length} produto{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Help tip */}
      <div
        className="mb-5 px-4 py-3 rounded-xl text-sm flex items-start gap-2.5"
        style={{
          background: "hsl(var(--admin-yellow-soft))",
          border: "1px solid hsl(var(--admin-yellow))",
          color: "hsl(42 60% 35%)",
        }}
      >
        <Globe size={14} className="mt-0.5 shrink-0" />
        <span>
          Clique em <strong>"Publicar no site"</strong> para exibir o produto na seção{" "}
          <strong>Nossos Produtos</strong> do site. Edite nome, preço, segmento e tags
          clicando diretamente sobre o texto. Clique na foto para fazer upload.
        </span>
      </div>

      {/* Grid */}
      {isLoading && products.length === 0 ? (
        <div className="admin-card">
          <div className="admin-empty-state">
            <Loader2 size={24} className="animate-spin" style={{ color: "hsl(var(--admin-yellow))" }} />
            <p className="admin-empty-state-title">Carregando produtos…</p>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="admin-card">
          <div className="admin-empty-state">
            <Package size={24} style={{ color: "hsl(var(--admin-text-muted))" }} />
            <p className="admin-empty-state-title">Nenhum produto encontrado</p>
            <p className="admin-empty-state-sub">
              {products.length === 0
                ? "Importe produtos no Catálogo (CSV) para começar"
                : "Ajuste a busca ou os filtros"}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
          {filtered.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onUpdate={handleUpdate}
              onImageChange={handleImageChange}
              onRemoveImage={handleRemoveImage}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminVitrine;
