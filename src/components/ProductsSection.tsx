import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Loader2 } from "lucide-react";
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
  { id: "demo-1", name: "Sacola Kraft Personalizada", description: null, price: "0.00", imageUrl: null, segment: "Varejo",      tags: ["kraft", "personalizado"] },
  { id: "demo-2", name: "Caixa E-commerce Reforçada",  description: null, price: "0.00", imageUrl: null, segment: "E-commerce", tags: ["resistente", "selo"] },
  { id: "demo-3", name: "Embalagem Alimentícia PET",   description: null, price: "0.00", imageUrl: null, segment: "Alimentício", tags: ["PET", "transparente"] },
  { id: "demo-4", name: "Fita Adesiva Industrial",     description: null, price: "0.00", imageUrl: null, segment: "Industrial",  tags: ["larga", "alta resistência"] },
  { id: "demo-5", name: "Caixinha Presente Luxo",      description: null, price: "0.00", imageUrl: null, segment: "Varejo",      tags: ["luxo", "tampa"] },
  { id: "demo-6", name: "Envelope Segurança Correios", description: null, price: "0.00", imageUrl: null, segment: "E-commerce", tags: ["lacre", "resistente"] },
  { id: "demo-7", name: "Bandeja Marmitex Aluminío",   description: null, price: "0.00", imageUrl: null, segment: "Alimentício", tags: ["alumínio", "descartável"] },
  { id: "demo-8", name: "Strech Film 500m",            description: null, price: "0.00", imageUrl: null, segment: "Industrial",  tags: ["paletização", "filme"] },
];

const ProductsSection = () => {
  const [products,  setProducts]  = useState<VitrineProduct[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [active,    setActive]    = useState("Todos");
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
        // Se a API falhar, exibe demos para não esconder a seção
        setProducts(DEMO_PRODUCTS);
        setUsingDemo(true);
      })
      .finally(() => setLoading(false));
  }, []);

  // Derive segment tabs dynamically from loaded products
  const segments = [
    "Todos",
    ...Array.from(new Set(products.map((p) => p.segment))).sort(),
  ];

  const filtered =
    active === "Todos" ? products : products.filter((p) => p.segment === active);

  const whatsappLink = () => {
    const phone = import.meta.env.VITE_WHATSAPP_NUMBER ?? "5500000000000";
    return `https://wa.me/${phone}?text=${encodeURIComponent(
      "Olá, gostaria de solicitar um orçamento para embalagens.",
    )}`;
  };
  // Don't render the section at all if there are no products and we've finished loading
  if (!loading && products.length === 0) return null;

  return (
    <section id="produtos" className="py-20">
      <div className="container mx-auto px-4">
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

        {/* Loading state */}
        {loading && (
          <div className="flex justify-center py-16">
            <Loader2 size={28} className="animate-spin text-muted-foreground" />
          </div>
        )}

        {!loading && (
          <>
            {/* WhatsApp CTA — single button, WhatsApp green */}
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

            {/* Filters */}
            <div className="flex flex-wrap justify-center gap-2 mb-10">
              {segments.map((s) => (
                <button
                  key={s}
                  onClick={() => setActive(s)}
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

            {/* Product grid */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <AnimatePresence mode="popLayout">
                {filtered.map((p) => {
                  const imgSrc = getImageSrc(p.imageUrl);
                  const price  = formatPrice(p.price);

                  return (
                    <motion.div
                      key={p.id}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.3 }}
                      className="bg-card border border-border rounded-lg overflow-hidden hover:shadow-lg transition-shadow group"
                    >
                      {/* Image */}
                      <div className="aspect-[4/3] bg-muted flex items-center justify-center overflow-hidden">
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
                      </div>

                      {/* Content */}
                      <div className="p-4">
                        <h3 className="font-semibold text-foreground mb-1">{p.name}</h3>

                        {/* Price (only when > 0) */}
                        {price && (
                          <p className="text-sm font-bold text-primary mb-2">{price}</p>
                        )}

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
          </>
        )}
      </div>
    </section>
  );
};

export default ProductsSection;
