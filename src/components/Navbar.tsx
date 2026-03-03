import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import vilpackLogo from "@/assets/vilpack-logo.png";

const navLinks = [
  { label: "Início", href: "#inicio" },
  { label: "Produtos", href: "#produtos" },
  { label: "Quem Somos", href: "#diferenciais" },
  { label: "Contato", href: "#contato" },
];

const Navbar = () => {
  const [open, setOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black/30 backdrop-blur-md border-b border-white/10 transition-all duration-300">
      <div className="container mx-auto flex items-center justify-between h-20 px-4">
        <a href="#inicio">
          <img src={vilpackLogo} alt="VILPACK" className="h-16 md:h-20" />
        </a>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-white/90 hover:text-white transition-colors uppercase tracking-wide"
            >
              {l.label}
            </a>
          ))}
          <Button asChild className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold border-none">
            <a href="#contato">Solicitar Orçamento</a>
          </Button>
        </div>

        {/* Mobile toggle */}
        <button className="md:hidden text-white" onClick={() => setOpen(!open)}>
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden bg-black/95 backdrop-blur-xl border-t border-white/10 px-4 py-6 space-y-4 absolute top-20 left-0 right-0 h-screen">
          {navLinks.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="block text-lg font-medium text-white/90 hover:text-primary"
              onClick={() => setOpen(false)}
            >
              {l.label}
            </a>
          ))}
          <Button asChild className="w-full bg-primary text-white hover:bg-primary/90">
            <a href="#contato" onClick={() => setOpen(false)}>
              Solicitar Orçamento
            </a>
          </Button>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
