import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { SmartChat } from "./components/SmartChat";
import { useState } from "react";
import AdminLogin from "./pages/admin/Login";
import AdminLayout from "./pages/admin/Layout";
import AdminLeads from "./pages/admin/Leads";
import AdminCatalog from "./pages/admin/Catalog";
import AdminVitrine from "./pages/admin/Vitrine";
import AtendimentoInbox from "./pages/admin/atendimento/index";
import AtendimentoConfiguracao from "./pages/admin/atendimento/Configuracao";
import AtendimentoAutomacao from "./pages/admin/atendimento/Automacao";
import AdminConfiguracoes from "./pages/admin/Configuracoes";

const queryClient = new QueryClient();

const AppRoutes = () => {
  const [sessionId, setSessionId] = useState<string>(() => localStorage.getItem('vilpack_session_id') || '');
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');

  return (
    <>
      {!isAdminRoute && <SmartChat onSessionChange={setSessionId} />}
      <Routes>
        <Route path="/" element={<Index />} />
        
        {/* Admin Routes */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<AdminLayout />}>
          {/* Default redirect to leads */}
          <Route index element={<Navigate to="leads" replace />} />
          <Route path="leads" element={<AdminLeads />} />
          <Route path="catalog" element={<AdminCatalog />} />
          <Route path="vitrine" element={<AdminVitrine />} />
          <Route path="atendimento" element={<AtendimentoInbox />} />
          <Route path="conexao" element={<AtendimentoConfiguracao />} />
          <Route path="automacao" element={<AtendimentoAutomacao />} />
          <Route path="configuracoes" element={<AdminConfiguracoes />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
