import { useState, lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProfileProvider } from "@/contexts/ProfileContext";
import { LicenseProvider } from "@/contexts/LicenseContext";
import { OrgModulesProvider } from "@/contexts/OrgModulesContext";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { AdminRoute } from "@/components/layout/AdminRoute";
import { ERPRoute } from "@/components/layout/ERPRoute";
import { EduRoute } from "@/components/layout/EduRoute";
import { LicenseRoute } from "@/components/layout/LicenseRoute";
import { ModuleRoute } from "@/components/layout/ModuleRoute";
import { SplashScreen } from "@/components/SplashScreen";
import { ClientErrorMonitor } from "@/components/ClientErrorMonitor";
import { ReportJobWatcherMount } from "@/components/ReportJobWatcherMount";

// Wrap React.lazy to auto-recover from stale chunk errors after a redeploy.
// When the browser has a cached index.html referencing an old hashed chunk
// that no longer exists, the dynamic import fails. We force a one-time
// hard reload so the user fetches the latest index.html + chunks instead
// of seeing a blank screen.
const RELOAD_KEY = "sistur:chunk-reload";
if (typeof window !== "undefined") {
  window.addEventListener("load", () => {
    // Successful boot — allow future stale-chunk recovery to reload again.
    setTimeout(() => sessionStorage.removeItem(RELOAD_KEY), 5000);
  });
}
function lazyWithReload<T extends { default: React.ComponentType<any> }>(
  factory: () => Promise<T>
) {
  return lazy(() =>
    factory().catch((err) => {
      const msg = String(err?.message || err);
      const isChunkError =
        msg.includes("Failed to fetch dynamically imported module") ||
        msg.includes("Importing a module script failed") ||
        msg.includes("error loading dynamically imported module");
      if (isChunkError && !sessionStorage.getItem(RELOAD_KEY)) {
        sessionStorage.setItem(RELOAD_KEY, "1");
        window.location.reload();
        // Return a never-resolving promise so Suspense holds until reload.
        return new Promise<T>(() => {});
      }
      throw err;
    })
  );
}

// Lazy load all page components for code splitting
const Index = lazyWithReload(() => import("./pages/Index"));
const Auth = lazyWithReload(() => import("./pages/Auth"));
const Onboarding = lazyWithReload(() => import("./pages/Onboarding"));
const PendingApproval = lazyWithReload(() => import("./pages/PendingApproval"));
const Destinos = lazyWithReload(() => import("./pages/Destinos"));
const Diagnosticos = lazyWithReload(() => import("./pages/Diagnosticos"));
const DiagnosticoDetalhe = lazyWithReload(() => import("./pages/DiagnosticoDetalhe"));


const AdminEdu = lazyWithReload(() => import("./pages/AdminEdu"));
const EduDashboard = lazyWithReload(() => import("./pages/EduDashboard"));
const EduCatalogo = lazyWithReload(() => import("./pages/EduCatalogo"));
const EduPerfil = lazyWithReload(() => import("./pages/EduPerfil"));
const EduTrilhas = lazyWithReload(() => import("./pages/EduTrilhas"));
const EduTrilhaDetalhe = lazyWithReload(() => import("./pages/EduTrilhas").then(m => ({ default: m.EduTrilhaDetalhe })));
const EduTrainingDetalhe = lazyWithReload(() => import("./pages/EduTrainingDetalhe"));
const EduMensagens = lazyWithReload(() => import("./pages/EduMensagens"));
const EduMinhasTurmas = lazyWithReload(() => import("./pages/EduMinhasTurmas"));
const EduTrilhasAdaptativas = lazyWithReload(() => import("./pages/EduTrilhasAdaptativas"));
const EduTrilhaAdaptativaDetalhe = lazyWithReload(() => import("./pages/EduTrilhasAdaptativas").then(m => ({ default: m.EduTrilhaAdaptativaDetalhe })));
const EduConquistas = lazyWithReload(() => import("./pages/EduConquistas"));
const EduCalendario = lazyWithReload(() => import("./pages/EduCalendario"));
const EduRecompensas = lazyWithReload(() => import("./pages/EduRecompensas"));

const Configuracoes = lazyWithReload(() => import("./pages/Configuracoes"));
const Relatorios = lazyWithReload(() => import("./pages/Relatorios"));
const NovaRodada = lazyWithReload(() => import("./pages/NovaRodada"));
const FAQ = lazyWithReload(() => import("./pages/FAQ"));
const Metodologia = lazyWithReload(() => import("./pages/Metodologia"));
const BeniChat = lazyWithReload(() => import("./pages/BeniChat"));
const Ajuda = lazyWithReload(() => import("./pages/Ajuda"));

const ERPIntegration = lazyWithReload(() => import("./pages/ERPIntegration"));
const PublicDestinations = lazyWithReload(() => import("./pages/PublicDestinations"));
const ExamTaking = lazyWithReload(() => import("./pages/ExamTaking"));
const ExamHistory = lazyWithReload(() => import("./pages/ExamHistory"));
const ExamReview = lazyWithReload(() => import("./pages/ExamReview"));
const Certificates = lazyWithReload(() => import("./pages/Certificates"));
const VerifyCertificate = lazyWithReload(() => import("./pages/VerifyCertificate"));
const OnDemandRequests = lazyWithReload(() => import("./pages/OnDemandRequests"));
const AuditLogs = lazyWithReload(() => import("./pages/AuditLogs"));
const AdminReportLogs = lazyWithReload(() => import("./pages/AdminReportLogs"));
const Projetos = lazyWithReload(() => import("./pages/Projetos"));
const Forum = lazyWithReload(() => import("./pages/Forum"));
const GamesHub = lazyWithReload(() => import("./pages/GamesHub"));
const Game = lazyWithReload(() => import("./pages/Game"));
const RPGGame = lazyWithReload(() => import("./pages/RPGGame"));
const TreasureGame = lazyWithReload(() => import("./pages/TreasureGame"));
const MemoryGame = lazyWithReload(() => import("./pages/MemoryGame"));
const Subscription = lazyWithReload(() => import("./pages/Subscription"));
const AdminLicenses = lazyWithReload(() => import("./pages/AdminLicenses"));
const AdminIngestionHealth = lazyWithReload(() => import("./pages/AdminIngestionHealth"));
const TermsAcceptance = lazyWithReload(() => import("./pages/TermsAcceptance"));
const NotFound = lazyWithReload(() => import("./pages/NotFound"));
const Unsubscribe = lazyWithReload(() => import("./pages/Unsubscribe"));
const ProfessorDashboard = lazyWithReload(() => import("./pages/ProfessorDashboard"));
const Tutorial = lazyWithReload(() => import("./pages/Tutorial"));
const TutorialDetail = lazyWithReload(() => import("./pages/TutorialDetail"));
const KnowledgeBase = lazyWithReload(() => import("./pages/KnowledgeBase"));
const MinhasAtividades = lazyWithReload(() => import("./pages/MinhasAtividades"));
const EduHistoricoEscolar = lazyWithReload(() => import("./pages/EduHistoricoEscolar"));
const Consorcios = lazyWithReload(() => import("./pages/Consorcios"));
const ConsorcioDetalhe = lazyWithReload(() => import("./pages/ConsorcioDetalhe"));
const AdminCertificacoes = lazyWithReload(() => import("./pages/AdminCertificacoes"));
const VerificarCertificado = lazyWithReload(() => import("./pages/VerificarCertificado"));
const AdminEmpacotamento = lazyWithReload(() => import("./pages/AdminEmpacotamento"));
const Observatorio = lazyWithReload(() => import("./pages/Observatorio"));

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
              <ClientErrorMonitor />
              <ProfileProvider>
              <LicenseProvider>
              <OrgModulesProvider>
              <ReportJobWatcherMount />
              <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/auth" element={<Auth />} />
                <Route path="/onboarding" element={<Onboarding />} />
                <Route path="/pending-approval" element={<PendingApproval />} />
                <Route path="/termos" element={<TermsAcceptance />} />
                <Route path="/verificar-certificado" element={<VerificarCertificado />} />
                <Route path="/verificar-certificado/:code" element={<VerificarCertificado />} />
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
                      <ModuleRoute module="diagnostico">
                        <Diagnosticos />
                      </ModuleRoute>
                    </ERPRoute>
                  }
                />
                <Route
                  path="/diagnosticos/:id"
                  element={
                    <ERPRoute>
                      <ModuleRoute module="diagnostico">
                        <DiagnosticoDetalhe />
                      </ModuleRoute>
                    </ERPRoute>
                  }
                />
                <Route path="/cursos" element={<Navigate to="/edu" replace />} />
                <Route path="/admin/cursos" element={<Navigate to="/professor" replace />} />
                <Route path="/learning" element={<Navigate to="/edu" replace />} />
                <Route
                  path="/admin/edu"
                  element={
                    <AdminRoute>
                      <AdminEdu />
                    </AdminRoute>
                  }
                />
                <Route
                  path="/admin/certificacoes"
                  element={
                    <AdminRoute>
                      <AdminCertificacoes />
                    </AdminRoute>
                  }
                />
                <Route
                  path="/admin/empacotamento"
                  element={
                    <AdminRoute>
                      <AdminEmpacotamento />
                    </AdminRoute>
                  }
                />
                <Route
                  path="/edu"
                  element={
                    <EduRoute>
                      <EduDashboard />
                    </EduRoute>
                  }
                />
                <Route
                  path="/edu/catalogo"
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
                  path="/edu/minhas-atividades"
                  element={
                    <EduRoute>
                      <MinhasAtividades />
                    </EduRoute>
                  }
                />
                <Route
                  path="/edu/boletim"
                  element={
                    <EduRoute>
                      <EduHistoricoEscolar />
                    </EduRoute>
                  }
                />
                <Route
                  path="/edu/historico"
                  element={
                    <EduRoute>
                      <EduHistoricoEscolar />
                    </EduRoute>
                  }
                />
                <Route
                  path="/edu/mensagens"
                  element={
                    <EduRoute>
                      <EduMensagens />
                    </EduRoute>
                  }
                />
                <Route
                  path="/edu/turmas"
                  element={
                    <EduRoute>
                      <EduMinhasTurmas />
                    </EduRoute>
                  }
                />
                <Route
                  path="/edu/trilhas-adaptativas"
                  element={
                    <EduRoute>
                      <EduTrilhasAdaptativas />
                    </EduRoute>
                  }
                />
                <Route
                  path="/edu/trilhas-adaptativas/:id"
                  element={
                    <EduRoute>
                      <EduTrilhaAdaptativaDetalhe />
                    </EduRoute>
                  }
                />
                <Route
                  path="/edu/conquistas"
                  element={
                    <EduRoute>
                      <EduConquistas />
                    </EduRoute>
                  }
                />
                <Route
                  path="/edu/calendario"
                  element={
                    <EduRoute>
                      <EduCalendario />
                    </EduRoute>
                  }
                />
                <Route
                  path="/edu/recompensas"
                  element={
                    <EduRoute>
                      <EduRecompensas />
                    </EduRoute>
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
                        <ModuleRoute module="relatorios">
                          <Relatorios />
                        </ModuleRoute>
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
                <Route path="/admin/quizzes" element={<Navigate to="/admin/edu" replace />} />
                <Route
                  path="/edu/exam/:examId"
                  element={
                    <EduRoute>
                      <ExamTaking />
                    </EduRoute>
                  }
                />
                <Route
                  path="/edu/minhas-provas"
                  element={
                    <EduRoute>
                      <ExamHistory />
                    </EduRoute>
                  }
                />
                <Route
                  path="/edu/exam-review/:attemptId"
                  element={
                    <EduRoute>
                      <ExamReview />
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
                <Route path="/verificar-certificado/:code" element={<VerifyCertificate />} />
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
                  path="/admin/report-logs"
                  element={
                    <AdminRoute>
                      <AdminReportLogs />
                    </AdminRoute>
                  }
                />
                <Route
                  path="/projetos"
                  element={
                    <ERPRoute>
                      <ModuleRoute module="projetos">
                        <Projetos />
                      </ModuleRoute>
                    </ERPRoute>
                  }
                />
                <Route
                  path="/consorcios"
                  element={
                    <ERPRoute>
                      <ModuleRoute module="consorcios">
                        <Consorcios />
                      </ModuleRoute>
                    </ERPRoute>
                  }
                />
                <Route
                  path="/consorcios/:id"
                  element={
                    <ERPRoute>
                      <ModuleRoute module="consorcios">
                        <ConsorcioDetalhe />
                      </ModuleRoute>
                    </ERPRoute>
                  }
                />
                <Route
                  path="/observatorio"
                  element={
                    <ERPRoute>
                      <ModuleRoute module="observatorio">
                        <Observatorio />
                      </ModuleRoute>
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
                  path="/admin/ingestoes"
                  element={
                    <AdminRoute>
                      <AdminIngestionHealth />
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
              </OrgModulesProvider>
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
