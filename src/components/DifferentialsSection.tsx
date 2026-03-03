import { motion } from "framer-motion";
import { Award, Truck, UserCheck, ShieldCheck, Leaf, Settings } from "lucide-react";

const items = [
  { icon: Award, title: "Profissionalismo", desc: "Equipe qualificada e comprometida com excelência." },
  { icon: Truck, title: "Logística Eficiente", desc: "Entrega rápida com frota própria em todo o Brasil." },
  { icon: UserCheck, title: "Atendimento Individual", desc: "Consultoria personalizada para cada cliente." },
  { icon: ShieldCheck, title: "Qualidade Técnica", desc: "Materiais certificados e testados rigorosamente." },
  { icon: Leaf, title: "Sustentabilidade", desc: "Opções ecológicas e materiais recicláveis." },
  { icon: Settings, title: "Flexibilidade", desc: "Pedidos sob medida, do lote mínimo ao grande volume." },
];

const DifferentialsSection = () => (
  <section id="diferenciais" className="py-20">
    <div className="container mx-auto px-4">
      <motion.div
        className="text-center mb-12"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
          Por que escolher a VILPACK?
        </h2>
        <p className="text-muted-foreground max-w-lg mx-auto">
          Diferenciais que garantem a melhor experiência em embalagens.
        </p>
      </motion.div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
        {items.map((item, i) => (
          <motion.div
            key={item.title}
            className="text-center p-4"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08 }}
          >
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <item.icon className="text-primary" size={24} />
            </div>
            <h3 className="font-semibold text-sm text-foreground mb-1">{item.title}</h3>
            <p className="text-xs text-muted-foreground">{item.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default DifferentialsSection;
