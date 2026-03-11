import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import {
  Carousel,
  CarouselApi,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import { useEffect, useState } from "react";

const heroSlides = [
  {
    id: 1,
    image: "/slide_sacola.jpg",
    mobileImage: "/slide_sacola_mobile.jpg",
    alt: "Saco Kraft Vilpack",
    buttonColor: "primary",
    // CTA Desktop - Ancoragem pelo CENTRO do botão
    // Referência visual: "SOLICITE UM ORÇAMENTO"
    desktopCta: {
      small: { top: '85.0%', left: '82.8%' },    // 1280-1599px
      medium: { top: '85.5%', left: '83.2%' },   // 1600-1919px
      large: { top: '85.9%', left: '83.5%' },    // 1920-2559px
      ultra: { top: '86.3%', left: '83.8%' }     // 2560px+
    },
    mobileButtonBottom: "8%",
    mobileButtonScale: 0.85,
    mobileImagePosition: "center",
    mobileBg: "#3A3A3A" // Cinza Escuro exato (Sacola)
  },
   {
     id: 2,
     image: "/slide_pao.jpg",
     mobileImage: "/slide_pao_mobile.jpg",
     alt: "Sacos de Pão",
     buttonColor: "dark",
     // CTA Desktop - Ancoragem pelo CENTRO do botão
     // Referência visual: "ATRAVÉS DO NOSSO WHATSAPP" (NÃO "FAÇA UM ORÇAMENTO")
     desktopCta: {
       small: { top: '79.8%', left: '79.2%' },    // 1280-1599px
       medium: { top: '80.3%', left: '79.7%' },   // 1600-1919px
       large: { top: '80.7%', left: '80.1%' },    // 1920-2559px
       ultra: { top: '81.1%', left: '80.4%' }     // 2560px+
     },
     mobileButtonBottom: "8%",
     mobileButtonScale: 0.80,
     mobileImagePosition: "center",
     mobileBg: "#FDB913" // Amarelo exato (Pão)
   },
  {
    id: 3,
    image: "/slide_sacola.jpg",
    mobileImage: "/slide_sacola_mobile.jpg",
    alt: "Saco Kraft Vilpack (Extra)",
    buttonColor: "primary",
    // CTA Desktop - Ancoragem pelo CENTRO do botão
    // Referência visual: "SOLICITE UM ORÇAMENTO"
    desktopCta: {
      small: { top: '85.0%', left: '82.8%' },    // 1280-1599px
      medium: { top: '85.5%', left: '83.2%' },   // 1600-1919px
      large: { top: '85.9%', left: '83.5%' },    // 1920-2559px
      ultra: { top: '86.3%', left: '83.8%' }     // 2560px+
    },
    mobileButtonBottom: "8%",
    mobileButtonScale: 0.85,
    mobileImagePosition: "center",
    mobileBg: "#3A3A3A"
  }
];

const HeroCarousel = () => {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1920);

  // Detectar faixa de viewport e retornar altura apropriada
  const getDesktopHeroHeight = () => {
    if (viewportWidth < 1440) {
      // Desktop pequeno/médio: 86vh (menos altura, menos espaço vertical)
      return '86vh';
    } else if (viewportWidth < 1920) {
      // Laptop/Full HD: 88vh (altura padrão)
      return '88vh';
    } else if (viewportWidth < 2560) {
      // Monitor grande: 90vh (mais presença)
      return '90vh';
    } else {
      // Ultrawide: 92vh (máxima presença)
      return '92vh';
    }
  };

  // Detectar faixa de viewport e retornar coordenadas apropriadas do CENTER do CTA
  const getDesktopCoordinates = (slide: typeof heroSlides[0]) => {
    if (viewportWidth < 1600) {
      // Desktop pequeno (1280-1599px)
      return slide.desktopCta.small;
    } else if (viewportWidth < 1920) {
      // Laptop/Full HD (1600-1919px)
      return slide.desktopCta.medium;
    } else if (viewportWidth < 2560) {
      // Monitor grande (1920-2559px)
      return slide.desktopCta.large;
    } else {
      // Ultrawide (2560px+)
      return slide.desktopCta.ultra;
    }
  };

  useEffect(() => {
    if (!api) {
      return;
    }

    setCurrent(api.selectedScrollSnap() + 1);

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap() + 1);
    });
  }, [api]);

  // Atualizar viewport width em resize
  useEffect(() => {
    const handleResize = () => {
      setViewportWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="relative w-full h-auto overflow-hidden bg-black">
      <Carousel
        setApi={setApi}
        opts={{
          align: "start",
          loop: true,
          duration: 40,
          watchDrag: false, // Mantém desabilitado para evitar conflitos de scroll no mobile
        }}
        plugins={[
          Autoplay({
            delay: 5000,
            stopOnInteraction: false,
          }),
        ]}
        className="w-full h-auto"
      >
        <CarouselContent className="h-auto mt-0 ml-0">
          {heroSlides.map((slide) => (
            <CarouselItem key={slide.id} className="h-auto w-full flex-shrink-0 relative p-0 border-0 pl-0 pt-0 bg-black">
              
                {/* --- MOBILE VIEW --- */}
                <div className="md:hidden relative w-full h-screen bg-black overflow-hidden">
                  {/* Imagem Principal - Ocupa todo o container */}
                  <img 
                    src={slide.mobileImage || slide.image} 
                    alt={slide.alt} 
                    className="w-full h-full object-cover block"
                    style={{ objectPosition: slide.mobileImagePosition || 'center' }}
                  />
                
                {/* Overlay Gradiente na base para dar leitura ao botão se necessário */}
                <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />

                {/* Botão CTA - Posicionamento Absoluto dentro da Imagem */}
                <div 
                  className="absolute left-0 right-0 z-20 flex justify-center pointer-events-none"
                  style={{ bottom: slide.mobileButtonBottom || '10%' }}
                >
                  <div 
                    className="pointer-events-auto"
                    style={{ 
                      transform: `scale(${slide.mobileButtonScale || 1})`
                    }}
                  >
                    <Button 
                      size="lg" 
                      asChild 
                      className={`text-lg font-bold uppercase tracking-wider px-10 py-7 rounded-full shadow-[0_10px_25px_-5px_rgba(0,0,0,0.4)] hover:shadow-[0_15px_30px_-5px_rgba(0,0,0,0.5)] active:scale-95 transition-all duration-300 border-2 border-white/20 backdrop-blur-sm
                        ${slide.buttonColor === 'dark' 
                          ? 'bg-zinc-800 hover:bg-zinc-900 text-white' 
                          : 'bg-primary hover:bg-primary/90 text-zinc-900'
                        }`}
                    >
                      <a href="https://wa.me/5511996113977?text=Olá!%20Gostaria%20de%20solicitar%20um%20orçamento%20com%20a%20Vilpack.">
                        Clique Aqui
                      </a>
                    </Button>
                  </div>
                </div>
              </div>

                {/* --- DESKTOP VIEW (Banner Implementation) --- */}
                {/* Container expandido com altura responsiva por faixa de viewport */}
                <div className="hidden md:block relative w-full overflow-hidden bg-black" style={{ height: getDesktopHeroHeight(), maxHeight: '100vh' }}>
                  {/* Imagem com full coverage */}
                  <img 
                    src={slide.image} 
                    alt={slide.alt} 
                    className="w-full h-full object-cover block"
                  />
                
                 {/* O Botão (Absolute): Positioned dynamically por faixa de viewport */}
                 <div 
                   className="absolute z-20"
                   style={{ 
                     top: getDesktopCoordinates(slide).top, 
                     left: getDesktopCoordinates(slide).left, 
                     transform: 'translate(-50%, -50%)' 
                   }}
                 >
                  <Button 
                    size="lg" 
                    asChild 
                    className={`text-lg font-bold uppercase tracking-wider px-10 py-7 rounded-full shadow-[0_4px_14px_0_rgba(0,0,0,0.39)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.23)] hover:-translate-y-1 transition-all duration-300 border-2 border-white/20 backdrop-blur-sm
                      ${slide.buttonColor === 'dark' 
                        ? 'bg-zinc-800 hover:bg-zinc-900 text-white' 
                        : 'bg-primary hover:bg-primary/90 text-zinc-900'
                      }`}
                  >
                    <a href="https://wa.me/5511996113977?text=Olá!%20Gostaria%20de%20solicitar%20um%20orçamento%20com%20a%20Vilpack.">
                      Clique Aqui
                    </a>
                  </Button>
                </div>
              </div>

            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
      
      {/* Ghost Progress Bar Indicator */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-32 h-1 bg-white/10 rounded-full z-20 overflow-hidden backdrop-blur-sm">
        <div 
          key={current} 
          className="h-full bg-white/50 animate-progress-bar origin-left rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)]"
          style={{ 
            animationDuration: '5000ms',
            animationTimingFunction: 'linear',
            animationFillMode: 'forwards'
          }} 
        />
      </div>
    </div>
  );
};

export default HeroCarousel;
