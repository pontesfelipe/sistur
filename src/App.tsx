import { useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProfileProvider } from "@/contexts/ProfileContext";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { AdminRoute } from "@/components/layout/AdminRoute";
import { ERPRoute } from "@/components/layout/ERPRoute";
import { EduRoute } from "@/components/layout/EduRoute";
import { SplashScreen } from "@/components/SplashScreen";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import PendingApproval from "./pages/PendingApproval";
import Destinos from "./pages/Destinos";
import Diagnosticos from "./pages/Diagnosticos";
import DiagnosticoDetalhe from "./pages/DiagnosticoDetalhe";
import Indicadores from "./pages/Indicadores";
import Importacoes from "./pages/Importacoes";
import Cursos from "./pages/Cursos";
import AdminCursos from "./pages/AdminCursos";
import AdminEdu from "./pages/AdminEdu";
import EduCatalogo from "./pages/EduCatalogo";
import EduPerfil from "./pages/EduPerfil";
import EduTrilhas, { EduTrilhaDetalhe } from "./pages/EduTrilhas";
import EduTrainingDetalhe from "./pages/EduTrainingDetalhe";
import Learning from "./pages/Learning";
import Configuracoes from "./pages/Configuracoes";
import Relatorios from "./pages/Relatorios";
import NovaRodada from "./pages/NovaRodada";
import FAQ from "./pages/FAQ";
import Metodologia from "./pages/Metodologia";
import BeniChat from "./pages/BeniChat";
import Ajuda from "./pages/Ajuda";
import ERPDashboard from "./pages/ERPDashboard";
import ERPIntegration from "./pages/ERPIntegration";
import PublicDestinations from "./pages/PublicDestinations";
import QuizManagement from "./pages/QuizManagement";
import ExamTaking from "./pages/ExamTaking";
import Certificates from "./pages/Certificates";
import VerifyCertificate from "./pages/VerifyCertificate";
import OnDemandRequests from "./pages/OnDemandRequests";
import AuditLogs from "./pages/AuditLogs";
import Projetos from "./pages/Projetos";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <>
      {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AuthProvider>
              <ProfileProvider>
              <Routes>
                <Route path="/auth" element={<Auth />} />
                <Route path="/onboarding" element={<Onboarding />} />
                <Route path="/pending-approval" element={<PendingApproval />} />
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
                    <ERPRoute>
                      <Destinos />
                    </ERPRoute>
                  }
                />
                <Route
                  path="/diagnosticos"
                  element={
                    <ERPRoute>
                      <Diagnosticos />
                    </ERPRoute>
                  }
                />
                <Route
                  path="/diagnosticos/:id"
                  element={
                    <ERPRoute>
                      <DiagnosticoDetalhe />
                    </ERPRoute>
                  }
                />
                <Route
                  path="/indicadores"
                  element={
                    <ERPRoute>
                      <Indicadores />
                    </ERPRoute>
                  }
                />
                <Route
                  path="/importacoes"
                  element={
                    <ERPRoute>
                      <Importacoes />
                    </ERPRoute>
                  }
                />
                <Route
                  path="/cursos"
                  element={
                    <ERPRoute>
                      <Cursos />
                    </ERPRoute>
                  }
                />
                <Route
                  path="/admin/cursos"
                  element={
                    <EduRoute requireProfessor>
                      <AdminCursos />
                    </EduRoute>
                  }
                />
                <Route
                  path="/admin/edu"
                  element={
                    <AdminRoute>
                      <AdminEdu />
                    </AdminRoute>
                  }
                />
                <Route
                  path="/edu"
                  element={
                    <EduRoute>
                      <EduCatalogo />
                    </EduRoute>
                  }
                />
                <Route
                  path="/edu/perfil"
                  element={
                    <EduRoute>
                      <EduPerfil />
                    </EduRoute>
                  }
                />
                <Route
                  path="/edu/trilhas"
                  element={
                    <EduRoute>
                      <EduTrilhas />
                    </EduRoute>
                  }
                />
                <Route
                  path="/edu/trilha/:id"
                  element={
                    <EduRoute>
                      <EduTrilhaDetalhe />
                    </EduRoute>
                  }
                />
                <Route
                  path="/edu/training/:id"
                  element={
                    <EduRoute>
                      <EduTrainingDetalhe />
                    </EduRoute>
                  }
                />
                <Route
                  path="/learning"
                  element={
                    <ProtectedRoute>
                      <Learning />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/configuracoes"
                  element={
                    <AdminRoute>
                      <Configuracoes />
                    </AdminRoute>
                  }
                />
                <Route
                  path="/relatorios"
                  element={
                    <ERPRoute>
                      <Relatorios />
                    </ERPRoute>
                  }
                />
                <Route
                  path="/nova-rodada"
                  element={
                    <ERPRoute>
                      <NovaRodada />
                    </ERPRoute>
                  }
                />
                <Route
                  path="/erp"
                  element={
                    <ERPRoute>
                      <ERPDashboard />
                    </ERPRoute>
                  }
                />
                <Route
                  path="/faq"
                  element={
                    <ProtectedRoute redirectStudentsToEdu={false}>
                      <FAQ />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/ajuda"
                  element={
                    <ProtectedRoute redirectStudentsToEdu={false}>
                      <Ajuda />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/metodologia"
                  element={
                    <ProtectedRoute redirectStudentsToEdu={false}>
                      <Metodologia />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/professor-beni"
                  element={
                    <ProtectedRoute redirectStudentsToEdu={false}>
                      <BeniChat />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/destinos-publicos"
                  element={
                    <ProtectedRoute>
                      <PublicDestinations />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/erp/integracao"
                  element={
                    <ERPRoute>
                      <ERPIntegration />
                    </ERPRoute>
                  }
                />
                <Route
                  path="/admin/quizzes"
                  element={
                    <AdminRoute>
                      <QuizManagement />
                    </AdminRoute>
                  }
                />
                <Route
                  path="/edu/exam/:examId"
                  element={
                    <EduRoute>
                      <ExamTaking />
                    </EduRoute>
                  }
                />
                <Route
                  path="/certificados"
                  element={
                    <EduRoute>
                      <Certificates />
                    </EduRoute>
                  }
                />
                <Route path="/verificar-certificado" element={<VerifyCertificate />} />
                <Route path="/verificar-certificado/:certificateId" element={<VerifyCertificate />} />
                <Route
                  path="/edu/solicitacoes"
                  element={
                    <EduRoute>
                      <OnDemandRequests />
                    </EduRoute>
                  }
                />
                <Route
                  path="/admin/audit"
                  element={
                    <AdminRoute>
                      <AuditLogs />
                    </AdminRoute>
                  }
                />
                <Route
                  path="/projetos"
                  element={
                    <ERPRoute>
                      <Projetos />
                    </ERPRoute>
                  }
                />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
              </ProfileProvider>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </>
  );
};

export default App;
