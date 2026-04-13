import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { UserManagement } from '@/components/users/UserManagement';
import { OrgAdminUsersPanel } from '@/components/settings/OrgAdminUsersPanel';
import { OrganizationManagement } from '@/components/settings/OrganizationManagement';
import { OrganizationUsersPanel } from '@/components/settings/OrganizationUsersPanel';
import { LogAnalytics } from '@/components/analytics/LogAnalytics';
import { NormalizationCalculator } from '@/components/tools/NormalizationCalculator';
import { DataExporter } from '@/components/tools/DataExporter';
import { IndicatorSimulator } from '@/components/tools/IndicatorSimulator';
import { DemoModeToggle } from '@/components/settings/DemoModeToggle';
import { PendingApprovalsPanel } from '@/components/settings/PendingApprovalsPanel';
import { ActAsUserPanel } from '@/components/settings/ActAsUserPanel';
import { FeedbackManagementPanel } from '@/components/settings/FeedbackManagementPanel';
import { ForumPrivacySettings } from '@/components/settings/ForumPrivacySettings';
import { ContentModerationPanel } from '@/components/settings/ContentModerationPanel';
import { PerformanceMetricsPanel } from '@/components/settings/PerformanceMetricsPanel';
import { GlobalReferencesPanel } from '@/components/admin/GlobalReferencesPanel';
import { HealthCheckPanel } from '@/components/tools/HealthCheckPanel';
import MapaTurismoPanel from '@/components/official-data/MapaTurismoPanel';
import { EmailDispatchPanel } from '@/components/tools/EmailDispatchPanel';
import { BusinessReviewSearch } from '@/components/enterprise/BusinessReviewSearch';
import { useProfile } from '@/hooks/useProfile';
import { OrgReferralManagePanel, JoinOrgByCodePanel } from '@/components/settings/OrgReferralPanel';
import { APP_VERSION, VERSION_HISTORY } from '@/config/version';
import { 
  BookOpen, 
  Wrench, 
  FileText,
  Download,
  Brain,
  Shield,
  BarChart3,
  Calculator,
  Settings2,
  FlaskConical,
  Info,
  History,
  MessageSquare,
  ExternalLink,
  Clock,
  Search,
  Map,
} from 'lucide-react';
import { toast } from 'sonner';

// Helper component for downloadable documents
function DocumentDownloadItem({ 
  title, 
  description, 
  version,
  downloadUrl 
}: { 
  title: string; 
  description: string; 
  version: string;
  downloadUrl?: string;
}) {
  const handleDownload = () => {
    if (downloadUrl) {
      window.open(downloadUrl, '_blank');
    } else {
      toast.info('Documento em preparação', {
        description: 'Este documento estará disponível para download em breve.',
      });
    }
  };

  return (
    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <p className="font-medium text-sm">{title}</p>
          <Badge variant="outline" className="text-xs">{version}</Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <Button 
        variant="outline" 
        size="sm" 
        onClick={handleDownload}
        className="shrink-0 ml-3"
      >
        <Download className="h-4 w-4 mr-1.5" />
        PDF
      </Button>
    </div>
  );
}

// Helper component for external reference links
function ExternalReferenceItem({ 
  title, 
  description, 
  url 
}: { 
  title: string; 
  description: string; 
  url: string;
}) {
  return (
    <a 
      href={url} 
      target="_blank" 
      rel="noopener noreferrer"
      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors group"
    >
      <div className="flex-1">
        <p className="font-medium text-sm group-hover:text-primary transition-colors">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0 ml-3" />
    </a>
  );
}

export default function Configuracoes() {
  const { isAdmin, isOrgAdmin } = useProfile();

  return (
    <AppLayout title="Configurações" subtitle="Documentação, metodologia de cálculo e ferramentas do SISTUR">
      <div className="space-y-6">

        <Tabs defaultValue="geral" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6 max-w-4xl">
            <TabsTrigger value="geral" className="flex items-center gap-2">
              <Settings2 className="h-4 w-4" />
              <span className="hidden sm:inline">Geral</span>
            </TabsTrigger>
            <TabsTrigger value="usuarios" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Usuários</span>
            </TabsTrigger>
            <TabsTrigger value="feedback" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Feedback</span>
            </TabsTrigger>
            <TabsTrigger value="logs" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Logs</span>
            </TabsTrigger>
            <TabsTrigger value="documentacao" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Docs</span>
            </TabsTrigger>
            <TabsTrigger value="ferramentas" className="flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              <span className="hidden sm:inline">Ferramentas</span>
            </TabsTrigger>
          </TabsList>

          {/* GERAL TAB */}
          <TabsContent value="geral" className="space-y-6">
            {/* Version Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="h-5 w-5 text-primary" />
                  Versão do Sistema
                </CardTitle>
                <CardDescription>
                  Controle de versão semântico (MAJOR.MINOR.PATCH)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="text-4xl font-bold text-primary">
                    v{APP_VERSION.full}
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {VERSION_HISTORY[0]?.date}
                  </Badge>
                </div>
                
                <div className="text-sm text-muted-foreground space-y-1">
                  <p><strong>MAJOR</strong> (X.0.0): Mudanças incompatíveis ou grandes reformulações</p>
                  <p><strong>MINOR</strong> (0.X.0): Novas funcionalidades compatíveis</p>
                  <p><strong>PATCH</strong> (0.0.X): Correções de bugs e micro ajustes</p>
                </div>

                {/* Version History */}
                <div className="mt-4 pt-4 border-t">
                  <div className="flex items-center gap-2 mb-3">
                    <History className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-sm">Histórico de Versões</span>
                  </div>
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {VERSION_HISTORY.map((entry, idx) => (
                      <div key={idx} className="p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge 
                            variant={entry.type === 'major' ? 'default' : entry.type === 'minor' ? 'secondary' : 'outline'}
                            className="text-xs"
                          >
                            {entry.version}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{entry.date}</span>
                          <Badge variant="outline" className="text-xs capitalize">
                            {entry.type}
                          </Badge>
                        </div>
                        <ul className="text-xs text-muted-foreground space-y-1">
                          {entry.changes.map((change, cIdx) => (
                            <li key={cIdx}>• {change}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <DemoModeToggle />
            <ForumPrivacySettings />

            {/* Org referral management for ORG_ADMIN / ADMIN */}
            {(isAdmin || isOrgAdmin) && <OrgReferralManagePanel />}

            {/* Any user can join an org by code */}
            <JoinOrgByCodePanel />

            {isAdmin && <ActAsUserPanel />}
          </TabsContent>

          {/* USUARIOS TAB */}
          <TabsContent value="usuarios" className="space-y-6">
            {isAdmin && <PendingApprovalsPanel />}
            {isAdmin && <OrganizationManagement />}
            {isAdmin && <OrganizationUsersPanel />}
            {isAdmin ? <UserManagement /> : isOrgAdmin ? <OrgAdminUsersPanel /> : (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-muted-foreground">
                    Acesso restrito a administradores da organização.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* FEEDBACK TAB */}
          <TabsContent value="feedback" className="space-y-6">
            {isAdmin ? (
              <FeedbackManagementPanel />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    Feedback
                  </CardTitle>
                  <CardDescription>
                    Você não tem permissão para gerenciar feedbacks. Use o botão no cabeçalho para enviar sugestões.
                  </CardDescription>
                </CardHeader>
              </Card>
            )}
          </TabsContent>

          {/* LOGS TAB */}
          <TabsContent value="logs" className="space-y-6">
            <LogAnalytics />
          </TabsContent>

          <TabsContent value="documentacao" className="space-y-6">
            {/* Principles */}
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <Brain className="h-6 w-6 text-primary shrink-0" />
                  <div>
                    <p className="font-semibold text-foreground">Filosofia de Transformação</p>
                    <blockquote className="mt-2 text-sm italic text-foreground/80 border-l-2 border-primary pl-3">
                      "Indicadores criam obrigação. Aprendizado é execução. Monitoramento fecha o ciclo. 
                      O SISTUR não informa. O SISTUR transforma."
                    </blockquote>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Guias e Manuais
                  </CardTitle>
                  <CardDescription>
                    Documentação técnica e metodológica do SISTUR
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <DocumentDownloadItem
                    title="Manual do Usuário SISTUR"
                    description="Guia completo de navegação e uso do sistema"
                    version="v1.0"
                  />
                  
                  <DocumentDownloadItem
                    title="Metodologia SISTUR"
                    description="Pipeline de 9 etapas, normalização e cálculo dos pilares RA, OE e AO"
                    version="v2.0"
                  />
                  
                  <DocumentDownloadItem
                    title="Glossário de Indicadores"
                    description="41 indicadores com definição, fonte oficial e periodicidade"
                    version="v1.2"
                  />

                  <DocumentDownloadItem
                    title="Guia SISTUR EDU"
                    description="Sistema de prescrição determinística de capacitação"
                    version="v1.0"
                  />

                  <DocumentDownloadItem
                    title="Manual de Diagnósticos"
                    description="Como criar, calcular e interpretar diagnósticos territoriais"
                    version="v1.1"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-primary" />
                    Referências Oficiais
                  </CardTitle>
                  <CardDescription>
                    Fontes de dados e frameworks utilizados
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <ExternalReferenceItem
                    title="IGMA - Índice de Gestão Municipal"
                    description="Backbone de legitimidade e governança municipal"
                    url="https://igma.gov.br"
                  />
                  
                  <ExternalReferenceItem
                    title="Mapa do Turismo Brasileiro"
                    description="Categorização A, B, C, D, E dos municípios turísticos"
                    url="https://mapa.turismo.gov.br"
                  />
                  
                  <ExternalReferenceItem
                    title="IBGE Cidades"
                    description="Dados socioeconômicos, demográficos e territoriais"
                    url="https://cidades.ibge.gov.br"
                  />

                  <ExternalReferenceItem
                    title="CADASTUR"
                    description="Cadastro nacional de prestadores de serviços turísticos"
                    url="https://cadastur.turismo.gov.br"
                  />

                  <ExternalReferenceItem
                    title="DataSUS"
                    description="Indicadores de saúde pública municipal"
                    url="https://datasus.saude.gov.br"
                  />

                  <ExternalReferenceItem
                    title="INEP / IDEB"
                    description="Índice de Desenvolvimento da Educação Básica"
                    url="https://www.gov.br/inep"
                  />
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="h-5 w-5 text-primary" />
                  Sobre o SISTUR
                </CardTitle>
                <CardDescription>
                  Sistema de Inteligência Territorial para Sustentabilidade Turística
                </CardDescription>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none text-muted-foreground space-y-4">
                <p>
                  O SISTUR é uma infraestrutura de gestão baseada em evidências que transforma 
                  indicadores públicos em decisões estratégicas e capacitação aplicada para 
                  destinos turísticos brasileiros.
                </p>
                
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <p className="font-semibold text-foreground mb-2">Princípios Fundamentais</p>
                    <ul className="space-y-1 text-sm">
                      <li>• <strong>Transparência:</strong> Dados, fontes e cálculos rastreáveis</li>
                      <li>• <strong>Sem rankings:</strong> Avaliação individual, não competitiva</li>
                      <li>• <strong>Determinístico:</strong> Prescrições automáticas por regras</li>
                      <li>• <strong>Ciclo fechado:</strong> Diagnóstico → Ação → Monitoramento</li>
                    </ul>
                  </div>

                  <div className="p-4 bg-muted/30 rounded-lg">
                    <p className="font-semibold text-foreground mb-2">Estrutura de Pilares</p>
                    <ul className="space-y-1 text-sm">
                      <li>• <strong className="text-pillar-ra">RA:</strong> Relações Ambientais (sustentabilidade)</li>
                      <li>• <strong className="text-pillar-oe">OE:</strong> Organização Estrutural (infraestrutura)</li>
                      <li>• <strong className="text-pillar-ao">AO:</strong> Ações Operacionais (execução)</li>
                      <li>• 41 indicadores distribuídos entre os 3 pilares</li>
                    </ul>
                  </div>
                </div>

                <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                  <p className="font-semibold text-foreground mb-2">Prescrições vs. Relatórios</p>
                  <div className="grid gap-3 md:grid-cols-2 text-sm">
                    <div>
                      <p className="font-medium text-foreground">SISTUR EDU (Prescrições)</p>
                      <p>100% determinísticas, baseadas em regras. Cada capacitação é prescrita quando Indicador + Pilar + Status atendem critérios específicos. Sem IA.</p>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Relatórios Estratégicos</p>
                      <p>Utilizam IA para síntese e contextualização dos dados diagnósticos. A IA analisa resultados, mas não prescreve capacitações.</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* FERRAMENTAS TAB */}
          <TabsContent value="ferramentas" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wrench className="h-5 w-5 text-primary" />
                  Ferramentas de Análise
                </CardTitle>
                <CardDescription>
                  Utilitários para cálculo, simulação e exportação de dados
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <Card className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Calculator className="h-4 w-4 text-primary" />
                        Calculadora de Normalização
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Simule o cálculo de normalização de indicadores
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <NormalizationCalculator />
                    </CardContent>
                  </Card>

                  <Card className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <FlaskConical className="h-4 w-4 text-primary" />
                        Simulador de Indicadores
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Simule valores e veja o impacto nos pilares
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <IndicatorSimulator />
                    </CardContent>
                  </Card>

                  <Card className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Download className="h-4 w-4 text-primary" />
                        Exportar Dados
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Exporte diagnósticos, indicadores, planos de ação e outros dados do sistema
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <DataExporter />
                    </CardContent>
                  </Card>

                  <Card className="hover:shadow-md transition-shadow md:col-span-2">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Search className="h-4 w-4 text-primary" />
                        Busca de Reviews Online
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Pesquise avaliações do estabelecimento no Google, TripAdvisor e outros
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <BusinessReviewSearch />
                    </CardContent>
                  </Card>

                </div>
              </CardContent>
            </Card>

            {/* Health Check Panel - Admin only */}
            {isAdmin && (
              <Card>
                <CardContent className="pt-6">
                  <HealthCheckPanel />
                </CardContent>
              </Card>
            )}

            {/* Admin tools */}
            {isAdmin && <EmailDispatchPanel />}
            {isAdmin && <ContentModerationPanel />}
            {isAdmin && <PerformanceMetricsPanel />}

            {/* Global References - Admin only */}
            <GlobalReferencesPanel />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
