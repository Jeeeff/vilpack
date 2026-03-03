import { useState } from "react";
import { motion } from "framer-motion";
import { Calculator, Box } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const sizes = [
  { name: "Caixa P", maxVol: 5000 },
  { name: "Caixa M", maxVol: 20000 },
  { name: "Caixa G", maxVol: 60000 },
  { name: "Caixa GG", maxVol: 150000 },
  { name: "Caixa Industrial", maxVol: Infinity },
];

const CalculatorSection = () => {
  const [dims, setDims] = useState({ w: "", h: "", d: "" });
  const [result, setResult] = useState<string | null>(null);

  const calc = () => {
    const w = parseFloat(dims.w);
    const h = parseFloat(dims.h);
    const d = parseFloat(dims.d);
    if (isNaN(w) || isNaN(h) || isNaN(d) || w <= 0 || h <= 0 || d <= 0) {
      setResult("Insira dimensões válidas.");
      return;
    }
    const vol = w * h * d;
    const suggestion = sizes.find((s) => vol <= s.maxVol) || sizes[sizes.length - 1];
    setResult(`Volume: ${vol.toLocaleString("pt-BR")} cm³ — Sugestão: ${suggestion.name}`);
  };

  return (
    <section className="py-20 bg-muted/50">
      <div className="container mx-auto px-4">
        <motion.div
          className="max-w-xl mx-auto text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Calculator className="text-primary" size={28} />
          </div>
          <h2 className="text-3xl font-bold text-foreground mb-2">Calculadora de Cubagem</h2>
          <p className="text-muted-foreground mb-8">
            Insira as dimensões do seu produto e descubra a embalagem ideal.
          </p>

          <div className="grid grid-cols-3 gap-3 mb-4">
            <div>
              <label className="text-xs text-muted-foreground">Largura (cm)</label>
              <Input
                type="number"
                placeholder="0"
                value={dims.w}
                onChange={(e) => setDims({ ...dims, w: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Altura (cm)</label>
              <Input
                type="number"
                placeholder="0"
                value={dims.h}
                onChange={(e) => setDims({ ...dims, h: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Profundidade (cm)</label>
              <Input
                type="number"
                placeholder="0"
                value={dims.d}
                onChange={(e) => setDims({ ...dims, d: e.target.value })}
              />
            </div>
          </div>

          <Button onClick={calc} className="w-full mb-4">
            <Box size={16} className="mr-2" /> Calcular
          </Button>

          {result && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-card border border-border rounded-lg p-4 text-foreground font-medium"
            >
              {result}
            </motion.div>
          )}
        </motion.div>
      </div>
    </section>
  );
};

export default CalculatorSection;
