import { motion } from "framer-motion";
import { Leaf, Recycle, TreePine, Droplets } from "lucide-react";

const stats = [
  { icon: Recycle, label: "Materiais Recicláveis", value: "70%+" },
  { icon: Leaf, label: "Opções Biodegradáveis", value: "15+" },
  { icon: TreePine, label: "Menos Plástico Virgem", value: "40%" },
  { icon: Droplets, label: "Tintas à Base d'Água", value: "100%" },
];

const SustainabilitySection = () => (
  <section className="py-20">
    <div className="container mx-auto px-4">
      <motion.div
        className="text-center mb-12"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-vilpack-green/10 text-vilpack-green mb-4">
          Selo Verde
        </span>
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
          Compromisso com a Sustentabilidade
        </h2>
        <p className="text-muted-foreground max-w-lg mx-auto">
          Soluções ecológicas sem comprometer a performance das embalagens.
        </p>
      </motion.div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            className="text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
          >
            <div className="w-12 h-12 rounded-full bg-vilpack-green/10 flex items-center justify-center mx-auto mb-2">
              <s.icon className="text-vilpack-green" size={22} />
            </div>
            <p className="text-2xl font-bold text-foreground">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default SustainabilitySection;
