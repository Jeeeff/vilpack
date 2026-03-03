import { motion } from "framer-motion";
import { Lock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const PortalSection = () => (
  <section className="py-20 bg-muted/50">
    <div className="container mx-auto px-4">
      <motion.div
        className="max-w-lg mx-auto text-center"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
          <Lock className="text-secondary-foreground" size={24} />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Portal do Representante
        </h2>
        <p className="text-muted-foreground mb-6">
          Acesso exclusivo a preços de atacado, catálogos técnicos e acompanhamento de pedidos.
        </p>
        <Button variant="outline" size="lg">
          Acessar Portal <ArrowRight className="ml-2" size={16} />
        </Button>
      </motion.div>
    </div>
  </section>
);

export default PortalSection;
