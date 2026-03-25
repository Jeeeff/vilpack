import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { API_URL } from "@/config/api";

// ── types ──────────────────────────────────────────────────────────────────────

interface VitrineProduct {
  id: string;
  name: string;
  description: string | null;
  price: string;           // "0.00" etc.
  imageUrl: string | null;
  segment: string;         // já normalizado pelo backend
  tags: string[];          // já parseado pelo backend
}

// ── constants ──────────────────────────────────────────────────────────────────

const PAGE_SIZE = 8;

const SEGMENT_ORDER = [
  "Mercado", "Padaria", "Limpeza", "Indústria",
  "Sacolas", "Bobinas", "Isopor", "Descartáveis",
];

// ── helpers ────────────────────────────────────────────────────────────────────

function getImageSrc(imageUrl: string | null): string | null {
  if (!imageUrl) return null;
  if (imageUrl.startsWith("http")) return imageUrl;
  const base = API_URL.replace("/api", "");
  return `${base}${imageUrl}`;
}

function formatPrice(price: string): string | null {
  const n = parseFloat(price);
  if (!n || n === 0) return null;
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// ── demo fallback (usado apenas quando a API retorna 0 produtos) ───────────────

const DEMO_PRODUCTS: VitrineProduct[] = [
  { id: "demo-1",  name: "Sacola Plástica Colorida",       description: null, price: "0.00", imageUrl: null, segment: "Sacolas",      tags: ["plástico", "colorida"] },
  { id: "demo-2",  name: "Sacola Kraft Personalizada",     description: null, price: "0.00", imageUrl: null, segment: "Sacolas",      tags: ["kraft", "personalizado"] },
  { id: "demo-3",  name: "Embalagem Pão de Forma",         description: null, price: "0.00", imageUrl: null, segment: "Padaria",      tags: ["plástico", "lacre"] },
  { id: "demo-4",  name: "Caixa Bolo Aniversário",         description: null, price: "0.00", imageUrl: null, segment: "Padaria",      tags: ["cartonada", "janela"] },
  { id: "demo-5",  name: "Bandeja Marmitex Alumínio",      description: null, price: "0.00", imageUrl: null, segment: "Mercado",      tags: ["alumínio", "descartável"] },
  { id: "demo-6",  name: "Embalagem Hortifrúti PET",       description: null, price: "0.00", imageUrl: null, segment: "Mercado",      tags: ["PET", "transparente"] },
  { id: "demo-7",  name: "Detergente Refil Embalagem",     description: null, price: "0.00", imageUrl: null, segment: "Limpeza",      tags: ["PEAD", "refil"] },
  { id: "demo-8",  name: "Galão Produto Limpeza 5L",       description: null, price: "0.00", imageUrl: null, segment: "Limpeza",      tags: ["galão", "resistente"] },
  { id: "demo-9",  name: "Strech Film Paletização 500m",   description: null, price: "0.00", imageUrl: null, segment: "Indústria",    tags: ["filme", "paletização"] },
  { id: "demo-10", name: "Fita Adesiva Industrial Larga",  description: null, price: "0.00", imageUrl: null, segment: "Indústria",    tags: ["larga", "alta resistência"] },
  { id: "demo-11", name: "Bobina Plástica Transparente",   description: null, price: "0.00", imageUrl: null, segment: "Bobinas",      tags: ["transparente", "rolo"] },
  { id: "demo-12", name: "Bobina Impressa Personalizada",  description: null, price: "0.00", imageUrl: null, segment: "Bobinas",      tags: ["impressa", "personalizado"] },
  { id: "demo-13", name: "Copo Descartável 200ml",         description: null, price: "0.00", imageUrl: null, segment: "Descartáveis", tags: ["PS", "200ml"] },
  { id: "demo-14", name: "Prato Descartável Reforçado",    description: null, price: "0.00", imageUrl: null, segment: "Descartáveis", tags: ["PP", "reforçado"] },
  { id: "demo-15", name: "Caixa Isopor 10L",               description: null, price: "0.00", imageUrl: null, segment: "Isopor",       tags: ["EPS", "10 litros"] },
  { id: "demo-16", name: "Isopor Placa Isolamento",        description: null, price: "0.00", imageUrl: null, segment: "Isopor",       tags: ["placa", "isolamento"] },
];

// ── component ──────────────────────────────────────────────────────────────────

const ProductsSection = () => {
  const [products,  setProducts]  = useState<VitrineProduct[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [active,    setActive]    = useState("Todos os Produtos");
  const [page,      setPage]      = useState(1);
  const [usingDemo, setUsingDemo] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/vitrine`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data: VitrineProduct[]) => {
        if (data.length > 0) {
          setProducts(data);
        } else {
          setProducts(DEMO_PRODUCTS);
          setUsingDemo(true);
        }
      })
      .catch(() => {
        setProducts(DEMO_PRODUCTS);
        setUsingDemo(true);
      })
      .finally(() => setLoading(false));
  }, []);

  // Deriva tabs: "Todos os Produtos" + segmentos na ordem canônica
  const presentSegments = Array.from(new Set(products.map((p) => p.segment)));
  const orderedSegments = SEGMENT_ORDER.filter((s) => presentSegments.includes(s));
  const extraSegments   = presentSegments.filter((s) => !SEGMENT_ORDER.includes(s)).sort();
  const segments        = ["Todos os Produtos", ...orderedSegments, ...extraSegments];

  const filtered = active === "Todos os Produtos"
    ? products
    : products.filter((p) => p.segment === active);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Ao mudar de segmento volta para p.1
  const handleSegment = (s: string) => {
    setActive(s);
    setPage(1);
  };

  const whatsappLink = () => {
    const phone = import.meta.env.VITE_WHATSAPP_NUMBER ?? "5500000000000";
    return `https://wa.me/${phone}?text=${encodeURIComponent(
      "Olá, gostaria de solicitar um orçamento para embalagens.",
    )}`;
  };

  if (!loading && products.length === 0) return null;

  return (
    <section id="produtos" className="py-20">
      <div className="container mx-auto px-4">

        {/* Header */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
            Nossos Produtos
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Filtre por segmento e encontre a embalagem ideal.
          </p>
          {usingDemo && (
            <p className="mt-2 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-full inline-block px-3 py-1">
              Demonstração — cadastre produtos reais no painel admin
            </p>
          )}
        </motion.div>

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-16">
            <Loader2 size={28} className="animate-spin text-muted-foreground" />
          </div>
        )}

        {!loading && (
          <>
            {/* WhatsApp CTA */}
            <div className="flex justify-center mb-8">
              <a
                href={whatsappLink()}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-white font-semibold text-sm shadow-md transition-opacity hover:opacity-90"
                style={{ backgroundColor: "#25D366" }}
              >
                <MessageCircle size={18} />
                Solicite Orçamento via WhatsApp
              </a>
            </div>

            {/* Segment filters */}
            <div className="flex flex-wrap justify-center gap-2 mb-10">
              {segments.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSegment(s)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    active === s
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            {/* Product grid — 2 cols, 4 rows = 8 per page */}
            <div className="grid grid-cols-2 gap-4 md:gap-6">
              <AnimatePresence mode="popLayout">
                {paginated.map((p) => {
                  const imgSrc = getImageSrc(p.imageUrl);
                  const price  = formatPrice(p.price);

                  return (
                    <motion.div
                      key={p.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.25 }}
                      className="bg-card border border-border rounded-lg overflow-hidden hover:shadow-lg transition-shadow group"
                    >
                      {/* Image — price badge overlays bottom-right */}
                      <div className="relative aspect-[4/3] bg-muted flex items-center justify-center overflow-hidden">
                        {imgSrc ? (
                          <img
                            src={imgSrc}
                            alt={p.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <img
                            src="/placeholder.svg"
                            alt={p.name}
                            className="w-16 h-16 opacity-30"
                          />
                        )}

                        {/* Price badge — circle overlapping bottom-right of image */}
                        {price && (
                          <div className="absolute bottom-2 right-2 flex items-center justify-center w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg ring-2 ring-white/60">
                            <span className="text-[10px] font-bold leading-tight text-center px-1">
                              {price}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="p-3 md:p-4">
                        <h3 className="font-semibold text-foreground text-sm md:text-base mb-2 leading-snug">
                          {p.name}
                        </h3>

                        {/* Tags */}
                        {p.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {p.tags.map((t) => (
                              <Badge key={t} variant="secondary" className="text-xs">
                                {t}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-10">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="flex items-center justify-center w-9 h-9 rounded-full border border-border bg-card text-muted-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  aria-label="Página anterior"
                >
                  <ChevronLeft size={18} />
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    onClick={() => setPage(n)}
                    className={`w-9 h-9 rounded-full text-sm font-medium transition-colors ${
                      n === page
                        ? "bg-primary text-primary-foreground"
                        : "border border-border bg-card text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {n}
                  </button>
                ))}

                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="flex items-center justify-center w-9 h-9 rounded-full border border-border bg-card text-muted-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  aria-label="Próxima página"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
};

export default ProductsSection;
