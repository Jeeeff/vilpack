import Navbar from "@/components/Navbar";
import HeroCarousel from "@/components/HeroCarousel";
import HeroSection from "@/components/HeroSection";
import OperationsSection from "@/components/OperationsSection";
import DifferentialsSection from "@/components/DifferentialsSection";
import ProcessSection from "@/components/ProcessSection";
import ProductsSection from "@/components/ProductsSection";
import CalculatorSection from "@/components/CalculatorSection";
import SustainabilitySection from "@/components/SustainabilitySection";
import DeliverySection from "@/components/DeliverySection";
import PortalSection from "@/components/PortalSection";
import Footer from "@/components/Footer";
import { SmartChat } from "@/components/SmartChat";

const Index = () => {
  return (
    <div className="min-h-screen bg-background relative">
      <Navbar />
      <HeroCarousel />
      <HeroSection />
      <OperationsSection />
      <DifferentialsSection />
      <ProcessSection />
      <ProductsSection />
      <CalculatorSection />
      <SustainabilitySection />
      <DeliverySection />
      <PortalSection />
      <Footer />
    </div>
  );
};

export default Index;
