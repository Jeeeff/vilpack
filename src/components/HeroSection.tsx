import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const HeroSection = () => {
  return (
    <section
      id="inicio"
      className="relative w-full py-16 md:py-24 flex items-center overflow-hidden bg-black text-white"
    >
      {/* Geometric watermark */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-20 -right-20 w-[500px] h-[500px] opacity-[0.04] rotate-12">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute bg-white"
              style={{
                width: `${60 + i * 40}px`,
                height: `${60 + i * 40}px`,
                top: `${i * 50}px`,
                left: `${i * 50}px`,
                clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)",
              }}
            />
          ))}
        </div>
      </div>

      <div className="container mx-auto px-4 grid lg:grid-cols-2 gap-12 items-center">
        {/* Left content */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary mb-6">
            Atacado de Embalagens
          </span>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight text-white mb-6">
            Soluções Completas em{" "}
            <span className="text-primary">Atacado de Embalagens</span>
          </h1>
          <p className="text-lg text-gray-400 mb-8 max-w-lg">
            Qualidade técnica, logística ágil e atendimento personalizado para
            impulsionar o seu negócio com as melhores embalagens do mercado.
          </p>
          <div className="flex flex-wrap gap-4">
            <Button size="lg" asChild className="bg-primary text-primary-foreground hover:bg-primary/90">
              <a href="#produtos">
                Ver Catálogo <ArrowRight className="ml-2" size={18} />
              </a>
            </Button>
            <Button size="lg" variant="outline" asChild className="border-white/20 text-white hover:bg-white hover:text-black">
              <a href="#contato">Solicitar Orçamento</a>
            </Button>
          </div>
        </motion.div>

        {/* Right geometric elements */}
        <motion.div
          className="hidden lg:flex items-center justify-center relative"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          <div className="relative w-[220px] h-[220px] md:w-[300px] md:h-[300px]">
            {/* Large V shape */}
            <div
              className="absolute inset-0 bg-primary"
              style={{ clipPath: "polygon(30% 0%, 50% 100%, 70% 0%, 60% 0%, 50% 75%, 40% 0%)" }}
            />
            {/* Background triangles */}
            <div
              className="absolute top-0 -left-12 w-32 h-32 bg-gray-800"
              style={{ clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)" }}
            />
            <div
              className="absolute bottom-10 -right-10 w-24 h-24 bg-amber-900/40"
              style={{ clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)" }}
            />
            <div
              className="absolute top-1/2 -right-16 w-20 h-20 bg-gray-700"
              style={{ clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)" }}
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
