import { motion } from "framer-motion";

const steps = [
  { num: "01", title: "Contato Inicial", desc: "Entre em contato e informe suas necessidades de embalagem." },
  { num: "02", title: "Consultoria Técnica", desc: "Nossa equipe analisa seu produto e sugere a melhor solução." },
  { num: "03", title: "Proposta & Aprovação", desc: "Receba uma proposta detalhada com preços e prazos competitivos." },
  { num: "04", title: "Produção & Entrega", desc: "Fabricação com controle de qualidade e entrega ágil." },
];

const ProcessSection = () => (
  <section className="py-20 bg-muted/50">
    <div className="container mx-auto px-4">
      <motion.div
        className="text-center mb-12"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
          Como Funciona
        </h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          Processo simples e transparente do primeiro contato à entrega.
        </p>
      </motion.div>

      <div className="relative max-w-3xl mx-auto">
        {/* Connector line */}
        <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-border hidden md:block" />

        <div className="space-y-8">
          {steps.map((s, i) => (
            <motion.div
              key={s.num}
              className="flex items-start gap-6 relative"
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
            >
              <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg shrink-0 relative z-10">
                {s.num}
              </div>
              <div className="pt-3">
                <h3 className="font-semibold text-lg text-foreground mb-1">{s.title}</h3>
                <p className="text-muted-foreground text-sm">{s.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  </section>
);

export default ProcessSection;
