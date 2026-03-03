import { motion } from "framer-motion";
import { Package, Box, Film, ShoppingBag } from "lucide-react";

const areas = [
  { icon: Package, title: "Embalagens Flexíveis", desc: "Filmes, sacos e pouches para diversos segmentos." },
  { icon: Box, title: "Caixas de Papelão", desc: "Caixas sob medida para transporte e armazenamento." },
  { icon: Film, title: "Filmes Industriais", desc: "Stretch, shrink e filmes técnicos de alta performance." },
  { icon: ShoppingBag, title: "Sacolas Personalizadas", desc: "Sacolas com impressão personalizada para varejo." },
];

const OperationsSection = () => (
  <section className="py-20 bg-muted/50">
    <div className="container mx-auto px-4">
      <motion.div
        className="text-center mb-12"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
          Áreas de Operação
        </h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          Cobertura completa em embalagens para qualquer necessidade industrial.
        </p>
      </motion.div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {areas.map((a, i) => (
          <motion.div
            key={a.title}
            className="bg-card rounded-lg p-6 border border-border hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
          >
            <a.icon className="text-primary mb-4" size={36} />
            <h3 className="text-lg font-semibold text-foreground mb-2">{a.title}</h3>
            <p className="text-sm text-muted-foreground">{a.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default OperationsSection;
