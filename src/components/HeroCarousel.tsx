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
    alt: "Saco Kraft Vilpack"
  },
  {
    id: 2,
    image: "/slide_pao.jpg",
    alt: "Sacos de Pão"
  },
  {
    id: 3,
    image: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?q=80&w=2070&auto=format&fit=crop",
    alt: "Depósito de caixas de papelão"
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
            <CarouselItem key={slide.id} className="h-screen w-full flex-shrink-0 relative p-0 border-0 pl-0 pt-0">
              {/* Background Image */}
              <img 
                src={slide.image} 
                alt={slide.alt} 
                className="absolute inset-0 w-full h-full object-cover z-0" 
              />
              {/* Overlay suave para legibilidade do menu (opcional, já que removemos textos) */}
              <div className="absolute inset-0 bg-black/20 z-0" />

              {/* Overlay de Transição Suave (Fade para Preto na base) */}
              <div 
                className="absolute bottom-0 left-0 w-full h-64 pointer-events-none z-10" 
                style={{ 
                  background: 'linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.4) 40%, rgba(0,0,0,0.8) 75%, rgba(0,0,0,1) 100%)', 
                  maskImage: 'linear-gradient(to bottom, transparent, black 50%)', 
                  WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 50%)' 
                }} 
              />
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
