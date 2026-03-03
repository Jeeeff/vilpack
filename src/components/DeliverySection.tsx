import { motion } from "framer-motion";
import { MapPin } from "lucide-react";

const DeliverySection = () => (
  <section className="relative py-32 overflow-hidden">
    {/* Dark overlay bg */}
    <div className="absolute inset-0 bg-secondary" />
    {/* Geometric pattern */}
    <div className="absolute inset-0 opacity-5">
      {[...Array(8)].map((_, i) => (
        <div
          key={i}
          className="absolute bg-primary"
          style={{
            width: "80px",
            height: "80px",
            top: `${(i % 4) * 25}%`,
            left: `${(i * 15) % 100}%`,
            clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)",
          }}
        />
      ))}
    </div>

    <div className="container mx-auto px-4 relative z-10 text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        <MapPin className="text-primary mx-auto mb-4" size={40} />
        <h2 className="text-3xl md:text-4xl font-bold text-secondary-foreground mb-4">
          Entrega em Todo o Brasil
        </h2>
        <p className="text-secondary-foreground/70 text-lg max-w-md mx-auto">
          Logística própria e ágil — do Sul ao Norte, sua embalagem chega no prazo.
        </p>
      </motion.div>
    </div>
  </section>
);

export default DeliverySection;
