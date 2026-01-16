import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { UserManagement } from '@/components/users/UserManagement';
import { OrganizationManagement } from '@/components/settings/OrganizationManagement';
import { OrganizationUsersPanel } from '@/components/settings/OrganizationUsersPanel';
import { LogAnalytics } from '@/components/analytics/LogAnalytics';
import { NormalizationCalculator } from '@/components/tools/NormalizationCalculator';
import { CycleMonitor } from '@/components/tools/CycleMonitor';
import { DataExporter } from '@/components/tools/DataExporter';
import { SystemHealthMonitor } from '@/components/tools/SystemHealthMonitor';
import { IBGESearch } from '@/components/tools/IBGESearch';
import { IndicatorSimulator } from '@/components/tools/IndicatorSimulator';
import { DemoModeToggle } from '@/components/settings/DemoModeToggle';
import { PendingApprovalsPanel } from '@/components/settings/PendingApprovalsPanel';
import { ActAsUserPanel } from '@/components/settings/ActAsUserPanel';
import { FeedbackManagementPanel } from '@/components/settings/FeedbackManagementPanel';
import { useProfile } from '@/hooks/useProfile';
import { APP_VERSION, VERSION_HISTORY } from '@/config/version';
import { 
  BookOpen, 
  Wrench, 
  GraduationCap,
  FileText,
  Download,
  Brain,
  Shield,
  BarChart3,
  Calculator,
  RefreshCw,
  Activity,
  Settings2,
  Building2,
  Search,
  FlaskConical,
  Database,
  Users,
  Globe,
  Info,
  History,
  MessageSquare
} from 'lucide-react';

export default function Configuracoes() {
  const { isAdmin } = useProfile();

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
            {isAdmin && <ActAsUserPanel />}
          </TabsContent>

          {/* USUARIOS TAB */}
          <TabsContent value="usuarios" className="space-y-6">
            {isAdmin && <PendingApprovalsPanel />}
            {isAdmin && <OrganizationManagement />}
            {isAdmin && <OrganizationUsersPanel />}
            <UserManagement />
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
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium">Manual do Usuário</p>
                      <p className="text-sm text-muted-foreground">Guia completo de uso do sistema</p>
                    </div>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      PDF
                    </Button>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium">Metodologia SISTUR</p>
                      <p className="text-sm text-muted-foreground">Pipeline de 9 etapas e regras de cálculo</p>
                    </div>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      PDF
                    </Button>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium">Glossário de Indicadores</p>
                      <p className="text-sm text-muted-foreground">Definição e fontes de todos os indicadores</p>
                    </div>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      PDF
                    </Button>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium">Guia SISTUR EDU</p>
                      <p className="text-sm text-muted-foreground">Sistema de prescrição de capacitação</p>
                    </div>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      PDF
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-primary" />
                    Referências Oficiais
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="font-medium">IGMA</p>
                    <p className="text-sm text-muted-foreground">Índice Geral de Gestão Municipal Aplicado — Backbone de legitimidade</p>
                  </div>
                  
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="font-medium">Mapa do Turismo Brasileiro</p>
                    <p className="text-sm text-muted-foreground">Categorização dos Municípios Turísticos</p>
                  </div>
                  
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="font-medium">IBGE Cidades</p>
                    <p className="text-sm text-muted-foreground">Dados socioeconômicos municipais</p>
                  </div>

                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="font-medium">CADASTUR</p>
                    <p className="text-sm text-muted-foreground">Cadastro de Prestadores de Serviços Turísticos</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Sobre o SISTUR</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none text-muted-foreground space-y-4">
                <p>
                  O Sistema de Inteligência Territorial para Sustentabilidade Turística (SISTUR) é uma 
                  infraestrutura que transforma indicadores públicos em decisões estratégicas e capacitação aplicada.
                </p>
                
                <div>
                  <p className="font-semibold text-foreground">Princípios Fundamentais:</p>
                  <ul className="mt-2 space-y-1">
                    <li><strong>Transparência:</strong> Todos os dados, fontes e cálculos são rastreáveis</li>
                    <li><strong>Sem rankings:</strong> Avaliação individual — nunca comparativa ou competitiva</li>
                    <li><strong>Determinístico:</strong> Status e prescrições são calculados automaticamente por regras</li>
                    <li><strong>Ciclo fechado:</strong> Diagnóstico → Ação → Monitoramento → Melhoria</li>
                  </ul>
                </div>

                <div>
                  <p className="font-semibold text-foreground">O que o SISTUR NÃO faz:</p>
                  <ul className="mt-2 space-y-1">
                    <li>Rankings públicos ou benchmarking entre municípios</li>
                    <li>Simulação preditiva ou machine learning</li>
                    <li>Exploração livre de cursos (capacitação é prescrita)</li>
                  </ul>
                </div>

                <div>
                  <p className="font-semibold text-foreground">Prescrições vs. Relatórios:</p>
                  <ul className="mt-2 space-y-1">
                    <li><strong>Prescrições (SISTUR EDU):</strong> São 100% determinísticas e baseadas em regras. Cada curso é prescrito automaticamente quando: Indicador + Pilar + Status + Interpretação Territorial atendem os critérios. Nunca há IA envolvida nas prescrições.</li>
                    <li><strong>Relatórios:</strong> Utilizam IA para síntese e análise dos dados diagnósticos, gerando planos estratégicos descritivos. A IA analisa os resultados, mas não prescreve cursos — apenas descreve e contextualiza.</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* FERRAMENTAS TAB */}
          <TabsContent value="ferramentas" className="space-y-6">
            {/* Quick Actions */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card className="hover:shadow-lg transition-shadow border-primary/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-primary" />
                    SISTUR EDU
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full" size="sm" asChild>
                    <a href="/cursos">Acessar</a>
                  </Button>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow border-primary/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    Relatórios IA
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full" size="sm" asChild>
                    <a href="/relatorios">Gerar</a>
                  </Button>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow border-primary/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Activity className="h-4 w-4 text-primary" />
                    Diagnósticos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full" size="sm" asChild>
                    <a href="/diagnosticos">Ver</a>
                  </Button>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow border-primary/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Globe className="h-4 w-4 text-primary" />
                    Destinos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full" size="sm" asChild>
                    <a href="/destinos">Gerenciar</a>
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Tools Grid */}
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
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <Card className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Calculator className="h-4 w-4 text-blue-500" />
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
                        <FlaskConical className="h-4 w-4 text-purple-500" />
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
                        <Download className="h-4 w-4 text-green-500" />
                        Exportar Dados
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Exporte diagnósticos e indicadores em CSV
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <DataExporter />
                    </CardContent>
                  </Card>

                  <Card className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <RefreshCw className="h-4 w-4 text-orange-500" />
                        Monitor de Ciclos
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Acompanhe evolução entre ciclos
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <CycleMonitor />
                    </CardContent>
                  </Card>

                  <Card className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Search className="h-4 w-4 text-cyan-500" />
                        Busca IBGE
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Pesquise municípios na base do IBGE
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <IBGESearch />
                    </CardContent>
                  </Card>

                  <Card className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Activity className="h-4 w-4 text-red-500" />
                        Monitor do Sistema
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Visão geral do estado do SISTUR
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <SystemHealthMonitor />
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>

            {/* Data Integrations */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-primary" />
                  Integrações de Dados
                </CardTitle>
                <CardDescription>
                  Fontes oficiais conectadas ao sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <span className="font-bold text-primary text-xs">IGMA</span>
                    </div>
                    <div>
                      <p className="font-medium">IGMA</p>
                      <p className="text-sm text-muted-foreground">Backbone de legitimidade</p>
                      <Badge variant="secondary" className="mt-1">Conectado</Badge>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <span className="font-bold text-primary">IBGE</span>
                    </div>
                    <div>
                      <p className="font-medium">IBGE - API de Dados</p>
                      <p className="text-sm text-muted-foreground">Dados demográficos</p>
                      <Badge variant="secondary" className="mt-1">Conectado</Badge>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <span className="font-bold text-primary text-xs">CAD</span>
                    </div>
                    <div>
                      <p className="font-medium">CADASTUR</p>
                      <p className="text-sm text-muted-foreground">Serviços turísticos</p>
                      <Badge variant="outline" className="mt-1">Manual</Badge>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <span className="font-bold text-primary text-xs">SUS</span>
                    </div>
                    <div>
                      <p className="font-medium">DATASUS</p>
                      <p className="text-sm text-muted-foreground">Dados de saúde</p>
                      <Badge variant="outline" className="mt-1">Manual</Badge>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <span className="font-bold text-primary text-xs">INEP</span>
                    </div>
                    <div>
                      <p className="font-medium">INEP</p>
                      <p className="text-sm text-muted-foreground">Dados educacionais</p>
                      <Badge variant="outline" className="mt-1">Manual</Badge>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <span className="font-bold text-primary text-xs">STN</span>
                    </div>
                    <div>
                      <p className="font-medium">Tesouro Nacional</p>
                      <p className="text-sm text-muted-foreground">Dados fiscais</p>
                      <Badge variant="outline" className="mt-1">Manual</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
