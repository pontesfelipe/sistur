import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Destinos from "./pages/Destinos";
import Diagnosticos from "./pages/Diagnosticos";
import DiagnosticoDetalhe from "./pages/DiagnosticoDetalhe";
import Indicadores from "./pages/Indicadores";
import Cursos from "./pages/Cursos";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/destinos" element={<Destinos />} />
          <Route path="/diagnosticos" element={<Diagnosticos />} />
          <Route path="/diagnosticos/:id" element={<DiagnosticoDetalhe />} />
          <Route path="/indicadores" element={<Indicadores />} />
          <Route path="/cursos" element={<Cursos />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
