import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const segments = ["Todos", "Alimentício", "E-commerce", "Industrial", "Varejo"];

const products = [
  { name: "Saco Stand-Up Pouch", segment: "Alimentício", tags: ["Biodegradável", "Vedação Hermética"], img: "/placeholder.svg" },
  { name: "Caixa Kraft Reforçada", segment: "E-commerce", tags: ["Alta Resistência", "Reciclável"], img: "/placeholder.svg" },
  { name: "Filme Stretch Industrial", segment: "Industrial", tags: ["Alta Performance", "20µm"], img: "/placeholder.svg" },
  { name: "Sacola Personalizada PP", segment: "Varejo", tags: ["Impressão HD", "Reutilizável"], img: "/placeholder.svg" },
  { name: "Embalagem Vacuum Bag", segment: "Alimentício", tags: ["Alta Barreira", "BPA Free"], img: "/placeholder.svg" },
  { name: "Caixa E-commerce Duplex", segment: "E-commerce", tags: ["Montagem Rápida", "Impressa"], img: "/placeholder.svg" },
  { name: "Filme Shrink POF", segment: "Industrial", tags: ["Termocontrátil", "Transparente"], img: "/placeholder.svg" },
  { name: "Sacola TNT Ecológica", segment: "Varejo", tags: ["Ecológica", "Personalizada"], img: "/placeholder.svg" },
];

const ProductsSection = () => {
  const [active, setActive] = useState("Todos");
  const filtered = active === "Todos" ? products : products.filter((p) => p.segment === active);

  const whatsappLink = (name: string) =>
    `https://wa.me/5500000000000?text=${encodeURIComponent(`Olá, gostaria de um orçamento para ${name} que vi no site.`)}`;

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
        </motion.div>

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
            {filtered.map((p) => (
              <motion.div
                key={p.name}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3 }}
                className="bg-card border border-border rounded-lg overflow-hidden hover:shadow-lg transition-shadow group"
              >
                <div className="aspect-[4/3] bg-muted flex items-center justify-center">
                  <img src={p.img} alt={p.name} className="w-16 h-16 opacity-30" />
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-foreground mb-2">{p.name}</h3>
                  <div className="flex flex-wrap gap-1 mb-4">
                    {p.tags.map((t) => (
                      <Badge key={t} variant="secondary" className="text-xs">
                        {t}
                      </Badge>
                    ))}
                  </div>
                  <Button size="sm" className="w-full" asChild>
                    <a href={whatsappLink(p.name)} target="_blank" rel="noopener noreferrer">
                      <MessageCircle size={16} className="mr-1" /> Orçamento via WhatsApp
                    </a>
                  </Button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
};

export default ProductsSection;
