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
    desktopTop: "82%",
    desktopLeft: "83%",
    mobileBg: "#27272a" // Zinc-800 equivalent for dark gray
  },
  {
    id: 2,
    image: "/slide_pao.jpg",
    mobileImage: "/slide_pao_mobile.jpg", // Fallback enquanto não temos a imagem mobile específica
    alt: "Sacos de Pão",
    buttonColor: "dark",
    desktopTop: "75%",
    desktopLeft: "81%",
    mobileBg: "hsl(42 97% 53%)" // Primary Yellow
  },
  {
    id: 3,
    image: "/slide_sacola.jpg",
    mobileImage: "/slide_sacola_mobile.jpg",
    alt: "Saco Kraft Vilpack (Extra)",
    buttonColor: "primary",
    desktopTop: "82%",
    desktopLeft: "83%",
    mobileBg: "#27272a"
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
    <div className="relative w-full h-screen overflow-hidden bg-black">
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
        className="w-full h-screen"
      >
        <CarouselContent className="h-screen mt-0 ml-0">
          {heroSlides.map((slide) => (
            <CarouselItem key={slide.id} className="h-screen w-full flex-shrink-0 relative p-0 border-0 pl-0 pt-0 bg-black">
              
              {/* --- MOBILE VIEW --- */}
              <div className="md:hidden flex flex-col w-full h-full bg-black">
                {/* Main Mobile Image - Contain & Full Width */}
                <div className="flex-1 w-full relative bg-black overflow-hidden">
                  <img 
                    src={slide.mobileImage || slide.image} 
                    alt={slide.alt} 
                    className="w-full h-full object-contain object-bottom"
                  />
                </div>

                {/* Footer Button Container - Matches Slide Footer Color */}
                <div 
                  className="w-full py-8 flex justify-center items-center shrink-0 z-20"
                  style={{ backgroundColor: slide.mobileBg }}
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
                    <a href="#produtos">Clique Aqui</a>
                  </Button>
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
