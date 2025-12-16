import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Destinos from "./pages/Destinos";
import Diagnosticos from "./pages/Diagnosticos";
import DiagnosticoDetalhe from "./pages/DiagnosticoDetalhe";
import Indicadores from "./pages/Indicadores";
import Importacoes from "./pages/Importacoes";
import Cursos from "./pages/Cursos";
import AdminCursos from "./pages/AdminCursos";
import Configuracoes from "./pages/Configuracoes";
import Relatorios from "./pages/Relatorios";
import NovaRodada from "./pages/NovaRodada";
import FAQ from "./pages/FAQ";
import Ajuda from "./pages/Ajuda";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Index />
                </ProtectedRoute>
              }
            />
            <Route
              path="/destinos"
              element={
                <ProtectedRoute>
                  <Destinos />
                </ProtectedRoute>
              }
            />
            <Route
              path="/diagnosticos"
              element={
                <ProtectedRoute>
                  <Diagnosticos />
                </ProtectedRoute>
              }
            />
            <Route
              path="/diagnosticos/:id"
              element={
                <ProtectedRoute>
                  <DiagnosticoDetalhe />
                </ProtectedRoute>
              }
            />
            <Route
              path="/indicadores"
              element={
                <ProtectedRoute>
                  <Indicadores />
                </ProtectedRoute>
              }
            />
            <Route
              path="/importacoes"
              element={
                <ProtectedRoute>
                  <Importacoes />
                </ProtectedRoute>
              }
            />
            <Route
              path="/cursos"
              element={
                <ProtectedRoute>
                  <Cursos />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/cursos"
              element={
                <ProtectedRoute>
                  <AdminCursos />
                </ProtectedRoute>
              }
            />
            <Route
              path="/configuracoes"
              element={
                <ProtectedRoute>
                  <Configuracoes />
                </ProtectedRoute>
              }
            />
            <Route
              path="/relatorios"
              element={
                <ProtectedRoute>
                  <Relatorios />
                </ProtectedRoute>
              }
            />
            <Route
              path="/nova-rodada"
              element={
                <ProtectedRoute>
                  <NovaRodada />
                </ProtectedRoute>
              }
            />
            <Route
              path="/faq"
              element={
                <ProtectedRoute>
                  <FAQ />
                </ProtectedRoute>
              }
            />
            <Route
              path="/ajuda"
              element={
                <ProtectedRoute>
                  <Ajuda />
                </ProtectedRoute>
              }
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
