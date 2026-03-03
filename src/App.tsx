import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { SmartChat } from "./components/SmartChat";
import { CartSidebar } from "./components/CartSidebar";
import { useState } from "react";
import { Button } from "./components/ui/button";
import { ShoppingCart } from "lucide-react";

const queryClient = new QueryClient();

const AppContent = () => {
  const [sessionId, setSessionId] = useState<string>(() => localStorage.getItem('vilpack_session_id') || '');

  return (
    <>
      <SmartChat onSessionChange={setSessionId} />
      {/* CartSidebar temporariamente removido conforme solicitação
      {sessionId && (
        <CartSidebar 
          sessionId={sessionId} 
          trigger={
            <Button 
              className="fixed bottom-24 right-6 h-14 w-14 rounded-full shadow-lg z-50 bg-secondary hover:bg-secondary/90 text-secondary-foreground"
              size="icon"
            >
              <ShoppingCart className="h-6 w-6" />
            </Button>
          }
        />
      )} 
      */}
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AppContent />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
