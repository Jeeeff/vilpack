import vilpackLogo from "@/assets/Logo_fundo_preto.png";
import { Phone, Mail, MapPin } from "lucide-react";

const Footer = () => (
  <footer id="contato" className="bg-secondary text-secondary-foreground py-16">
    <div className="container mx-auto px-4">
      <div className="grid md:grid-cols-3 gap-10">
        {/* Logo & about */}
        <div>
          <img src={vilpackLogo} alt="VILPACK" className="h-10 mb-4 brightness-0 invert" />
          <p className="text-secondary-foreground/70 text-sm">
            VILPACK — Atacado de embalagens com qualidade, agilidade e compromisso com o seu negócio.
          </p>
        </div>

        {/* Quick links */}
        <div>
          <h4 className="font-semibold mb-4">Links Rápidos</h4>
          <ul className="space-y-2 text-sm text-secondary-foreground/70">
            <li><a href="#inicio" className="hover:text-primary transition-colors">Início</a></li>
            <li><a href="#produtos" className="hover:text-primary transition-colors">Produtos</a></li>
            <li><a href="#diferenciais" className="hover:text-primary transition-colors">Quem Somos</a></li>
            <li><a href="#contato" className="hover:text-primary transition-colors">Contato</a></li>
          </ul>
        </div>

        {/* Contact */}
        <div>
          <h4 className="font-semibold mb-4">Contato</h4>
          <ul className="space-y-3 text-sm text-secondary-foreground/70">
            <li className="flex items-center gap-2">
              <Phone size={14} className="text-primary" /> (00) 0000-0000
            </li>
            <li className="flex items-center gap-2">
              <Mail size={14} className="text-primary" /> contato@vilpack.com.br
            </li>
            <li className="flex items-center gap-2">
              <MapPin size={14} className="text-primary" /> São Paulo, SP — Brasil
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-secondary-foreground/10 mt-10 pt-6 text-center text-xs text-secondary-foreground/50">
        © {new Date().getFullYear()} VILPACK. Todos os direitos reservados.
      </div>
    </div>
  </footer>
);

export default Footer;
