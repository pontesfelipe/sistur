import { useState, lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProfileProvider } from "@/contexts/ProfileContext";
import { LicenseProvider } from "@/contexts/LicenseContext";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { AdminRoute } from "@/components/layout/AdminRoute";
import { ERPRoute } from "@/components/layout/ERPRoute";
import { EduRoute } from "@/components/layout/EduRoute";
import { LicenseRoute } from "@/components/layout/LicenseRoute";
import { SplashScreen } from "@/components/SplashScreen";

// Lazy load all page components for code splitting
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const PendingApproval = lazy(() => import("./pages/PendingApproval"));
const Destinos = lazy(() => import("./pages/Destinos"));
const Diagnosticos = lazy(() => import("./pages/Diagnosticos"));
const DiagnosticoDetalhe = lazy(() => import("./pages/DiagnosticoDetalhe"));

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

const ERPIntegration = lazy(() => import("./pages/ERPIntegration"));
const PublicDestinations = lazy(() => import("./pages/PublicDestinations"));
const QuizManagement = lazy(() => import("./pages/QuizManagement"));
const ExamTaking = lazy(() => import("./pages/ExamTaking"));
const Certificates = lazy(() => import("./pages/Certificates"));
const VerifyCertificate = lazy(() => import("./pages/VerifyCertificate"));
const OnDemandRequests = lazy(() => import("./pages/OnDemandRequests"));
const AuditLogs = lazy(() => import("./pages/AuditLogs"));
const Projetos = lazy(() => import("./pages/Projetos"));
const Forum = lazy(() => import("./pages/Forum"));
const GamesHub = lazy(() => import("./pages/GamesHub"));
const Game = lazy(() => import("./pages/Game"));
const RPGGame = lazy(() => import("./pages/RPGGame"));
const TreasureGame = lazy(() => import("./pages/TreasureGame"));
const MemoryGame = lazy(() => import("./pages/MemoryGame"));
const Subscription = lazy(() => import("./pages/Subscription"));
const AdminLicenses = lazy(() => import("./pages/AdminLicenses"));
const TermsAcceptance = lazy(() => import("./pages/TermsAcceptance"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Unsubscribe = lazy(() => import("./pages/Unsubscribe"));
const ProfessorDashboard = lazy(() => import("./pages/ProfessorDashboard"));
const Tutorial = lazy(() => import("./pages/Tutorial"));
const TutorialDetail = lazy(() => import("./pages/TutorialDetail"));
const KnowledgeBase = lazy(() => import("./pages/KnowledgeBase"));

// Preload frequently visited pages after initial render
const preloadPages = () => {
  const preload = () => {
    import("./pages/Index");
    import("./pages/EduCatalogo");
    import("./pages/Configuracoes");
    import("./pages/Subscription");
  };

  if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(preload);
    return;
  }

  window.setTimeout(preload, 3000);
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 10, // 10 minutes — most data is stable
      gcTime: 1000 * 60 * 30, // 30 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

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
      {showSplash && <SplashScreen onComplete={() => { setShowSplash(false); preloadPages(); }} />}
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AuthProvider>
              <ProfileProvider>
              <LicenseProvider>
              <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/auth" element={<Auth />} />
                <Route path="/onboarding" element={<Onboarding />} />
                <Route path="/pending-approval" element={<PendingApproval />} />
                <Route path="/termos" element={<TermsAcceptance />} />
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
                      <LicenseRoute requiredFeature="reports">
                        <Relatorios />
                      </LicenseRoute>
                    </ERPRoute>
                  }
                />
                <Route
                  path="/base-conhecimento"
                  element={
                    <ERPRoute>
                      <KnowledgeBase />
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
                    <AdminRoute>
                      <Metodologia />
                    </AdminRoute>
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
                      <LicenseRoute requiredFeature="integrations">
                        <ERPIntegration />
                      </LicenseRoute>
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
                <Route
                  path="/forum"
                  element={
                    <ProtectedRoute redirectStudentsToEdu={false}>
                      <Forum />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/game"
                  element={
                    <ProtectedRoute redirectStudentsToEdu={false}>
                      <GamesHub />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/game/tcg"
                  element={
                    <ProtectedRoute redirectStudentsToEdu={false}>
                      <Game />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/game/rpg"
                  element={
                    <ProtectedRoute redirectStudentsToEdu={false}>
                      <RPGGame />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/game/treasure"
                  element={
                    <ProtectedRoute redirectStudentsToEdu={false}>
                      <TreasureGame />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/game/memory"
                  element={
                    <ProtectedRoute redirectStudentsToEdu={false}>
                      <MemoryGame />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/assinatura"
                  element={
                    <ProtectedRoute redirectStudentsToEdu={false} skipLicenseCheck>
                      <Subscription />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/licencas"
                  element={
                    <AdminRoute>
                      <AdminLicenses />
                    </AdminRoute>
                  }
                />
                <Route
                  path="/professor"
                  element={
                    <EduRoute requireProfessor>
                      <ProfessorDashboard />
                    </EduRoute>
                  }
                />
                <Route
                  path="/tutorial"
                  element={<Navigate to="/ajuda" replace />}
                />

                <Route
                  path="/tutorial/:topicId"
                  element={
                    <ProtectedRoute redirectStudentsToEdu={false}>
                      <TutorialDetail />
                    </ProtectedRoute>
                  }
                />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="/unsubscribe" element={<Unsubscribe />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
              </Suspense>
              </LicenseProvider>
              </ProfileProvider>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </>
  );
};

export default App;
