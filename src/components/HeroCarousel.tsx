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
import { useEffect, useState } from "react";

const heroSlides = [
  {
    id: 1,
    image: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?q=80&w=2070&auto=format&fit=crop",
    title: "Soluções Completas em Atacado de Embalagens",
    subtitle: "Qualidade técnica e logística ágil para impulsionar o seu negócio.",
    alt: "Depósito de caixas de papelão"
  },
  {
    id: 2,
    image: "https://images.unsplash.com/photo-1580674684081-7617fbf3d745?q=80&w=2070&auto=format&fit=crop",
    title: "Proteção e Segurança para seus Produtos",
    subtitle: "Filmes stretch e materiais de proteção de alta resistência.",
    alt: "Logística e Armazenamento"
  },
  {
    id: 3,
    image: "https://images.unsplash.com/photo-1553413077-190dd305871c?q=80&w=2070&auto=format&fit=crop",
    title: "Embalagens Personalizadas para sua Marca",
    subtitle: "Destaque-se no mercado com embalagens que vendem.",
    alt: "Estoque e Distribuição"
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

    // Autoplay customizado para direção "Top to Bottom" (scrollPrev)
    const intervalId = setInterval(() => {
      api.scrollPrev();
    }, 5000);

    return () => clearInterval(intervalId);
  }, [api]);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black">
      <Carousel
        setApi={setApi}
        opts={{
          align: "start",
          loop: true,
          axis: "y",
          duration: 40,
          watchDrag: false, // Desabilita interação manual (swipe/drag)
        }}
        orientation="vertical"
        className="w-full h-screen"
      >
        <CarouselContent className="h-screen flex flex-col mt-0">
          {heroSlides.map((slide) => (
            <CarouselItem key={slide.id} className="h-screen w-full flex-shrink-0 relative p-0 border-0">
              {/* Background Image */}
              <img 
                src={slide.image} 
                alt={slide.alt} 
                className="absolute inset-0 w-full h-full object-cover z-0" 
              />
              {/* Overlay */}
              <div className="absolute inset-0 bg-black/60 z-0" />

              {/* Overlay de Transição Suave (Fade para Preto) */}
              <div 
                className="absolute bottom-0 left-0 w-full h-64 pointer-events-none z-10" 
                style={{ 
                  background: 'linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.4) 40%, rgba(0,0,0,0.8) 75%, rgba(0,0,0,1) 100%)', 
                  maskImage: 'linear-gradient(to bottom, transparent, black 50%)', 
                  WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 50%)' 
                }} 
              />

              {/* Content - Centered */}
              <div className="relative z-10 h-full container mx-auto px-4 md:px-10 flex flex-col justify-center items-center text-center text-white pt-24">
                <span className="inline-block px-4 py-1.5 rounded-full text-sm font-semibold bg-white/10 backdrop-blur-sm border border-white/20 text-white mb-6 animate-fade-in uppercase tracking-wider">
                  Atacado de Embalagens
                </span>
                <h2 className="text-4xl md:text-6xl lg:text-7xl font-bold leading-tight mb-6 max-w-4xl drop-shadow-xl tracking-tight">
                  {slide.title}
                </h2>
                <p className="text-lg md:text-2xl text-gray-100 mb-10 max-w-2xl drop-shadow-md font-light leading-relaxed">
                  {slide.subtitle}
                </p>
                <div className="flex flex-wrap justify-center gap-6">
                  <Button size="lg" asChild className="text-lg px-8 py-6 rounded-full bg-primary hover:bg-primary/90 text-white shadow-lg hover:shadow-xl transition-all duration-300">
                    <a href="#produtos">
                      Ver Catálogo <ArrowRight className="ml-2" size={20} />
                    </a>
                  </Button>
                  <Button size="lg" variant="outline" asChild className="text-lg px-8 py-6 rounded-full bg-transparent border-2 border-white text-white hover:bg-white hover:text-black transition-all duration-300">
                    <a href="#contato">Fale Conosco</a>
                  </Button>
                </div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        {/* Hidden controls for cleaner look or custom positioned */}
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
