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
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black transition-all duration-300 pb-4">
        <div className="container mx-auto flex items-center justify-between h-24 px-4 pt-2">
          <a href="#inicio" className="flex items-center">
            <img src={vilpackLogo} alt="VILPACK" className="h-20 w-auto object-contain" />
          </a>

          {/* Desktop */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="text-sm font-medium text-white/90 hover:text-primary transition-colors uppercase tracking-wide"
              >
                {l.label}
              </a>
            ))}
            <Button asChild className="bg-primary hover:bg-primary/90 text-zinc-900 font-bold border-none px-6 py-2 rounded-full">
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
          <div className="md:hidden bg-black border-t border-zinc-800 px-4 py-6 space-y-4 absolute top-full left-0 right-0 h-screen z-50">
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
            <Button asChild className="w-full bg-primary text-zinc-900 font-bold hover:bg-primary/90 rounded-full">
              <a href="#contato" onClick={() => setOpen(false)}>
                Solicitar Orçamento
              </a>
            </Button>
          </div>
        )}
      </nav>
      {/* Spacer to push content down - Height of Navbar (h-24 + pb-4 = approx 7rem/112px) */}
      <div className="w-full h-32 bg-black"></div>
      {/* Black Strip/Breathing Room */}
      <div className="w-full h-1 bg-black"></div>
    </>
  );
};

export default Navbar;
