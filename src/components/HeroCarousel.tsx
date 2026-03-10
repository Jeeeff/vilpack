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
    desktopTop: "79%",
    desktopLeft: "83%",
    mobileTop: "88%",
    mobileBg: "#3A3A3A" // Cinza Escuro exato (Sacola)
  },
  {
    id: 2,
    image: "/slide_pao.jpg",
    mobileImage: "/slide_pao_mobile.jpg",
    alt: "Sacos de Pão",
    buttonColor: "dark",
    desktopTop: "78%",
    desktopLeft: "81%",
    mobileTop: "85%",
    mobileBg: "#FDB913" // Amarelo exato (Pão)
  },
  {
    id: 3,
    image: "/slide_sacola.jpg",
    mobileImage: "/slide_sacola_mobile.jpg",
    alt: "Saco Kraft Vilpack (Extra)",
    buttonColor: "primary",
    desktopTop: "79%",
    desktopLeft: "83%",
    mobileTop: "88%",
    mobileBg: "#3A3A3A"
  }
];

const HeroCarousel = () => {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!api) {
      return;
    }

    setCurrent(api.selectedScrollSnap() + 1);

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap() + 1);
    });
  }, [api]);

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
              <div className="md:hidden relative w-full h-[88vh] bg-black overflow-hidden flex flex-col">
                {/* Camada da Imagem/Arte - Ocupa a maior parte da viewport */}
                <div className="relative flex-1 w-full overflow-hidden">
                  <img 
                    src={slide.mobileImage || slide.image} 
                    alt={slide.alt} 
                    className="w-full h-full object-cover object-center block"
                  />
                  {/* Overlay gradiente suave para integrar com o rodapé se necessário */}
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/20" />
                </div>

                {/* Camada Inferior de Apoio Visual (Rodapé do Slide) */}
                <div 
                  className="w-full h-[15vh] shrink-0 relative z-10 -mt-4 rounded-t-[32px] shadow-[0_-10px_40px_rgba(0,0,0,0.3)]"
                  style={{ backgroundColor: slide.mobileBg }}
                >
                  {/* O Botão CTA - Posicionamento Absoluto Controlado dentro do Rodapé */}
                  <div 
                    className="absolute left-1/2 -translate-x-1/2"
                    style={{ top: '40%' }}
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
                      <a href="#produtos">Clique Aqui</a>
                    </Button>
                  </div>
                </div>
              </div>

              {/* --- DESKTOP VIEW (Banner Implementation) --- */}
              {/* Estrutura do Container: relative, width: 100%, overflow: hidden */}
              <div className="hidden md:block relative w-full overflow-hidden">
                {/* A Imagem: width: 100%, height: auto, display: block */}
                <img 
                  src={slide.image} 
                  alt={slide.alt} 
                  className="w-full h-auto block"
                />
                
                {/* O Botão (Absolute): Positioned dynamically */}
                <div 
                  className="absolute z-20"
                  style={{ 
                    top: slide.desktopTop, 
                    left: slide.desktopLeft, 
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
                    <a href="#produtos">
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
