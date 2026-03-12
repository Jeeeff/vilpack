import {
  Carousel,
  CarouselApi,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import { useEffect, useState } from "react";

const heroSlides = [
  {
    id: 1,
    image: "/slide_sacola.jpg",
    mobileImage: "/slide_sacola_mobile.jpg",
    alt: "Saco Kraft Vilpack",
    mobileImagePosition: "center",
    mobileBg: "#3A3A3A",
  },
  {
    id: 2,
    image: "/slide_pao.jpg",
    mobileImage: "/slide_pao_mobile.jpg",
    alt: "Sacos de Pão",
    mobileImagePosition: "center",
    mobileBg: "#FDB913",
  },
  {
    id: 3,
    image: "/slide_sacola.jpg",
    mobileImage: "/slide_sacola_mobile.jpg",
    alt: "Saco Kraft Vilpack (Extra)",
    mobileImagePosition: "center",
    mobileBg: "#3A3A3A",
  },
];

const WHATSAPP_URL =
  "https://wa.me/5511996113977?text=Olá!%20Gostaria%20de%20solicitar%20um%20orçamento%20com%20a%20Vilpack.";

const HeroCarousel = () => {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1920
  );
  const [viewportHeight, setViewportHeight] = useState(
    typeof window !== "undefined" ? window.innerHeight : 900
  );

  // Altura do carrossel desktop por faixa de viewport
  const getDesktopHeroHeight = () => {
    if (viewportWidth < 1440) return "86vh";
    if (viewportWidth < 1920) return "88vh";
    if (viewportWidth < 2560) return "90vh";
    return "92vh";
  };

  // Altura do carrossel mobile responsiva por faixa de altura do viewport.
  // Usa 100svh (small viewport height — desconta barra do browser em iOS/Android)
  // e desconta o spacer da navbar (h-20 = 80px) para preencher exatamente a tela.
  const getMobileHeroHeight = () => {
    if (viewportHeight < 600) return "calc(100svh - 80px)";  // landscape / telas muito pequenas
    if (viewportHeight < 750) return "calc(100svh - 80px)";  // iPhone SE, 12 mini portrait
    if (viewportHeight < 900) return "calc(100svh - 80px)";  // iPhone padrão / Pro portrait
    return "calc(100svh - 80px)";                            // iPad, tablet portrait
  };

  useEffect(() => {
    if (!api) return;
    setCurrent(api.selectedScrollSnap() + 1);
    api.on("select", () => {
      setCurrent(api.selectedScrollSnap() + 1);
    });
  }, [api]);

  useEffect(() => {
    const handleResize = () => {
      setViewportWidth(window.innerWidth);
      setViewportHeight(window.innerHeight);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="relative w-full h-auto overflow-hidden bg-black">
      <Carousel
        setApi={setApi}
        opts={{
          align: "start",
          loop: true,
          duration: 40,
          watchDrag: false,
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
            <CarouselItem
              key={slide.id}
              className="h-auto w-full flex-shrink-0 relative p-0 border-0 pl-0 pt-0 bg-black"
            >
              {/* --- MOBILE VIEW --- */}
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="md:hidden block relative w-full bg-black overflow-hidden cursor-pointer"
                style={{ height: getMobileHeroHeight() }}
              >
                <img
                  src={slide.mobileImage || slide.image}
                  alt={slide.alt}
                  className="w-full h-full object-cover block"
                  style={{ objectPosition: slide.mobileImagePosition || "center" }}
                />
              </a>

              {/* --- DESKTOP VIEW --- */}
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden md:block relative w-full overflow-hidden bg-black cursor-pointer"
                style={{ height: getDesktopHeroHeight(), maxHeight: "100vh" }}
              >
                <img
                  src={slide.image}
                  alt={slide.alt}
                  className="w-full h-full object-cover block"
                />
              </a>
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
            animationDuration: "5000ms",
            animationTimingFunction: "linear",
            animationFillMode: "forwards",
          }}
        />
      </div>
    </div>
  );
};

export default HeroCarousel;
