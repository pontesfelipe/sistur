import { useState, lazy, Suspense } from "react";
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

// Lazy load all page components for code splitting
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const PendingApproval = lazy(() => import("./pages/PendingApproval"));
const Destinos = lazy(() => import("./pages/Destinos"));
const Diagnosticos = lazy(() => import("./pages/Diagnosticos"));
const DiagnosticoDetalhe = lazy(() => import("./pages/DiagnosticoDetalhe"));
const Indicadores = lazy(() => import("./pages/Indicadores"));
const Importacoes = lazy(() => import("./pages/Importacoes"));
const Cursos = lazy(() => import("./pages/Cursos"));
const AdminCursos = lazy(() => import("./pages/AdminCursos"));
const AdminEdu = lazy(() => import("./pages/AdminEdu"));
const EduCatalogo = lazy(() => import("./pages/EduCatalogo"));
const EduPerfil = lazy(() => import("./pages/EduPerfil"));
const EduTrilhas = lazy(() => import("./pages/EduTrilhas"));
const EduTrilhaDetalhe = lazy(() => import("./pages/EduTrilhas").then(m => ({ default: m.EduTrilhaDetalhe })));
const EduTrainingDetalhe = lazy(() => import("./pages/EduTrainingDetalhe"));
const Learning = lazy(() => import("./pages/Learning"));
const Configuracoes = lazy(() => import("./pages/Configuracoes"));
const Relatorios = lazy(() => import("./pages/Relatorios"));
const NovaRodada = lazy(() => import("./pages/NovaRodada"));
const FAQ = lazy(() => import("./pages/FAQ"));
const Metodologia = lazy(() => import("./pages/Metodologia"));
const BeniChat = lazy(() => import("./pages/BeniChat"));
const Ajuda = lazy(() => import("./pages/Ajuda"));
const ERPDashboard = lazy(() => import("./pages/ERPDashboard"));
const ERPIntegration = lazy(() => import("./pages/ERPIntegration"));
const PublicDestinations = lazy(() => import("./pages/PublicDestinations"));
const QuizManagement = lazy(() => import("./pages/QuizManagement"));
const ExamTaking = lazy(() => import("./pages/ExamTaking"));
const Certificates = lazy(() => import("./pages/Certificates"));
const VerifyCertificate = lazy(() => import("./pages/VerifyCertificate"));
const OnDemandRequests = lazy(() => import("./pages/OnDemandRequests"));
const AuditLogs = lazy(() => import("./pages/AuditLogs"));
const Projetos = lazy(() => import("./pages/Projetos"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

// Minimal loading fallback that matches the initial loader
const PageLoader = () => (
  <div style={{display:'flex',justifyContent:'center',alignItems:'center',minHeight:'100vh',background:'#0a0e17',flexDirection:'column',gap:'16px'}}>
    <div style={{width:'40px',height:'40px',border:'3px solid #1e293b',borderTopColor:'#3b82f6',borderRadius:'50%',animation:'spin 1s linear infinite'}}></div>
    <p style={{color:'#94a3b8',fontFamily:'system-ui,sans-serif',fontSize:'14px',margin:'0'}}>Carregando...</p>
  </div>
);

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
              <Suspense fallback={<PageLoader />}>
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
              </Suspense>
              </ProfileProvider>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </>
  );
};

export default App;
