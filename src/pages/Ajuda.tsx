import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { 
  HelpCircle, BookOpen, BarChart3, Upload, FileText, GraduationCap,
  MapPin, ClipboardList, Mail, BookMarked, Award, PlayCircle, Target,
  Hotel, Sparkles, TrendingUp, Users, Bot, MessageSquare, Gamepad2,
  FolderKanban, Activity, CheckCircle2, ChevronRight, Clock, ExternalLink,
  CreditCard, Shield, UserPlus, Tag, School, Settings,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useProfileContext } from '@/contexts/ProfileContext';
import { tutorialCategories, getTutorialForRole, getUserTutorialRole, type TutorialRole } from '@/data/tutorialData';
import { getDetailedTopicIds, getTopicDetail } from '@/data/tutorialSteps';

interface HelpSection {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  system: 'edu' | 'erp' | 'enterprise' | 'both';
}

const helpSections: HelpSection[] = [
  // ERP sections
  { title: 'Destinos', description: 'Cadastre e gerencie os destinos turísticos que serão avaliados pelo sistema.', icon: MapPin, href: '/destinos', system: 'erp' },
  { title: 'Diagnósticos', description: 'Crie e acompanhe rodadas de diagnóstico para avaliar o desempenho dos destinos.', icon: ClipboardList, href: '/diagnosticos', system: 'erp' },
  { title: 'Indicadores', description: 'Visualize o catálogo de indicadores disponíveis organizados por pilar e tema.', icon: BarChart3, href: '/indicadores', system: 'erp' },
  { title: 'Importações', description: 'Importe dados de indicadores via CSV ou preencha manualmente os valores.', icon: Upload, href: '/importacoes', system: 'erp' },
  { title: 'Relatórios', description: 'Gere relatórios detalhados com análises e recomendações para os destinos.', icon: FileText, href: '/relatorios', system: 'erp' },
  { title: 'Projetos', description: 'Crie e gerencie projetos vinculados a planos de ação com fases, milestones e tarefas.', icon: FolderKanban, href: '/projetos', system: 'erp' },
  { title: 'Monitoramento ERP', description: 'Acompanhe evolução dos ciclos, progresso por pilar e KPIs em tempo real.', icon: Activity, href: '/erp', system: 'erp' },
  // EDU sections
  { title: 'Catálogo de Treinamentos', description: 'Explore todos os treinamentos disponíveis organizados por pilar e tema.', icon: PlayCircle, href: '/edu', system: 'edu' },
  { title: 'Trilhas de Aprendizagem', description: 'Siga trilhas estruturadas com sequência de treinamentos e certificação.', icon: Target, href: '/edu/trilhas', system: 'edu' },
  { title: 'Meus Certificados', description: 'Visualize e baixe os certificados das trilhas que você concluiu.', icon: Award, href: '/certificados', system: 'edu' },
  { title: 'Jogos Educacionais', description: 'Aprenda jogando com 4 jogos: TCG (cartas), RPG (narrativa), Memória e Caça ao Tesouro.', icon: Gamepad2, href: '/game', system: 'edu' },
  // Enterprise sections
  { title: 'Indicadores de Hospitalidade', description: 'RevPAR, NPS, Taxa de Ocupação e outros KPIs específicos para hotéis e resorts.', icon: Hotel, href: '/indicadores', system: 'enterprise' },
  { title: 'Performance Hoteleira', description: 'Acompanhe indicadores financeiros, operacionais e de experiência do hóspede.', icon: TrendingUp, href: '/diagnosticos', system: 'enterprise' },
  { title: 'Gestão de Equipe', description: 'Indicadores de RH: turnover, produtividade e satisfação de colaboradores.', icon: Users, href: '/indicadores', system: 'enterprise' },
  // Shared sections
  { title: 'Professor Beni (IA)', description: 'Assistente inteligente para perguntas sobre turismo, metodologia SISTUR e interpretação de diagnósticos.', icon: Bot, href: '/professor-beni', system: 'both' },
  { title: 'Social Turismo', description: 'Fórum da comunidade para trocar experiências e boas práticas com profissionais do turismo.', icon: MessageSquare, href: '/forum', system: 'both' },
  { title: 'Metodologia SISTUR', description: 'Entenda a metodologia sistêmica de Mario Beni aplicada ao turismo.', icon: BookMarked, href: '/metodologia', system: 'both' },
];

const ROLE_LABELS: Record<TutorialRole, string> = {
  ADMIN: 'Administrador',
  PROFESSOR: 'Professor',
  ESTUDANTE: 'Estudante',
  ERP: 'Gestor ERP',
};

export default function Ajuda() {
  const navigate = useNavigate();
  const { isAdmin, isProfessor, isEstudante, hasERPAccess, hasEDUAccess } = useProfileContext();

  const showERPTab = hasERPAccess || isAdmin;
  const showEDUTab = hasEDUAccess || isAdmin;
  const showEnterpriseTab = isAdmin;

  // Tutorial state
  const userRole = getUserTutorialRole(isAdmin, isProfessor, isEstudante, hasERPAccess);
  const [viewRole, setViewRole] = useState<TutorialRole>(userRole);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('sistur_tutorial_completed');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  const categories = useMemo(() => getTutorialForRole(viewRole), [viewRole]);
  const detailedIds = useMemo(() => new Set(getDetailedTopicIds()), []);

  const toggleStep = (stepId: string) => {
    setCompletedSteps(prev => {
      const next = new Set(prev);
      if (next.has(stepId)) next.delete(stepId);
      else next.add(stepId);
      localStorage.setItem('sistur_tutorial_completed', JSON.stringify([...next]));
      return next;
    });
  };

  const totalSteps = categories.reduce((sum, cat) => sum + cat.steps.length, 0);
  const doneSteps = categories.reduce(
    (sum, cat) => sum + cat.steps.filter(s => completedSteps.has(s.id)).length, 0
  );
  const progressPct = totalSteps > 0 ? Math.round((doneSteps / totalSteps) * 100) : 0;

  const availableRoles: TutorialRole[] = isAdmin
    ? ['ADMIN', 'ERP', 'PROFESSOR', 'ESTUDANTE']
    : [userRole];

  const defaultTab = showERPTab ? 'erp' : 'edu';
  const tabCount = [showEDUTab, showERPTab, showEnterpriseTab].filter(Boolean).length;

  const filterSections = (system: 'edu' | 'erp' | 'enterprise' | 'both') => {
    return helpSections.filter(s => s.system === 'both' || s.system === system);
  };

  const renderSectionGrid = (sections: HelpSection[]) => (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {sections.map((section) => (
        <Link key={section.title} to={section.href}>
          <Card className="h-full hover:border-primary/50 transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <section.icon className="h-5 w-5 text-primary" />
                {section.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{section.description}</p>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );

  return (
    <AppLayout
      title="Central de Ajuda"
      subtitle="Tutoriais, guias e funcionalidades do SISTUR"
    >
      <div className="space-y-6">
        {/* Main tabs: Tutoriais / Guia Rápido / Funcionalidades */}
        <Tabs defaultValue="tutoriais" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="tutoriais" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Tutoriais</span>
              <span className="sm:hidden">Tutorial</span>
            </TabsTrigger>
            <TabsTrigger value="guia" className="flex items-center gap-2">
              <HelpCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Guia Rápido</span>
              <span className="sm:hidden">Guia</span>
            </TabsTrigger>
            <TabsTrigger value="funcionalidades" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Funcionalidades</span>
              <span className="sm:hidden">Funções</span>
            </TabsTrigger>
          </TabsList>

          {/* ============ TUTORIAIS TAB ============ */}
          <TabsContent value="tutoriais" className="space-y-6">
            {/* Header & progress */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-xl font-display font-bold text-foreground flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  Tutorial Passo a Passo
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Aprenda a usar cada funcionalidade da plataforma
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="text-sm px-3 py-1">
                  {doneSteps}/{totalSteps} ({progressPct}%)
                </Badge>
                <Badge className="bg-primary/10 text-primary border-primary/20">
                  {ROLE_LABELS[viewRole]}
                </Badge>
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-muted rounded-full h-2.5">
              <div
                className="bg-primary h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>

            {/* Role tabs */}
            {availableRoles.length > 1 && (
              <Tabs value={viewRole} onValueChange={(v) => setViewRole(v as TutorialRole)}>
                <TabsList>
                  {availableRoles.map(role => (
                    <TabsTrigger key={role} value={role}>{ROLE_LABELS[role]}</TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            )}

            {/* Tutorial categories */}
            <div className="space-y-8">
              {categories.map((cat) => (
                <section key={cat.id}>
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-foreground">{cat.title}</h3>
                    <p className="text-sm text-muted-foreground">{cat.description}</p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {cat.steps.map((step) => {
                      const done = completedSteps.has(step.id);
                      const hasDetail = detailedIds.has(step.id);
                      const detail = hasDetail ? getTopicDetail(step.id) : null;
                      return (
                        <Card
                          key={step.id}
                          className={cn(
                            'transition-all duration-200 hover:shadow-md',
                            done && 'border-primary/30 bg-primary/5'
                          )}
                        >
                          <CardHeader className="pb-2">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-2">
                                <div className={cn(
                                  'h-9 w-9 rounded-lg flex items-center justify-center',
                                  done ? 'bg-primary/20' : 'bg-muted'
                                )}>
                                  <step.icon className={cn('h-5 w-5', done ? 'text-primary' : 'text-muted-foreground')} />
                                </div>
                                <CardTitle className="text-sm">{step.title}</CardTitle>
                              </div>
                              <div className="flex items-center gap-1">
                                {detail && (
                                  <Badge variant="outline" className="text-[10px] flex items-center gap-0.5">
                                    <Clock className="h-2.5 w-2.5" />
                                    {detail.estimatedMinutes}min
                                  </Badge>
                                )}
                                {done && <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />}
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <CardDescription className="text-xs leading-relaxed">
                              {step.description}
                            </CardDescription>
                            {detail && (
                              <p className="text-[10px] text-muted-foreground mt-1">
                                {detail.subSteps.length} passos detalhados
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-3">
                              {hasDetail && (
                                <Button
                                  variant="default"
                                  size="sm"
                                  className="flex-1 text-xs h-8"
                                  onClick={() => navigate(`/tutorial/${step.id}`)}
                                >
                                  Ver tutorial completo
                                  <ChevronRight className="h-3 w-3 ml-1" />
                                </Button>
                              )}
                              {step.route && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-xs h-8"
                                  onClick={() => navigate(step.route!)}
                                >
                                  <ExternalLink className="h-3 w-3 mr-1" />
                                  Acessar
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 shrink-0"
                                onClick={() => toggleStep(step.id)}
                              >
                                <CheckCircle2 className={cn('h-4 w-4', done ? 'text-primary' : 'text-muted-foreground/40')} />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          </TabsContent>

          {/* ============ GUIA RÁPIDO TAB ============ */}
          <TabsContent value="guia" className="space-y-6">
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  Guia Rápido
                </CardTitle>
                <CardDescription>
                  Siga estes passos para começar a usar o sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue={defaultTab} className="w-full">
                  <TabsList className={`grid w-full mb-4 ${tabCount === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                    {showEDUTab && (
                      <TabsTrigger value="edu" className="flex items-center gap-2">
                        <GraduationCap className="h-4 w-4" />
                        <span className="hidden sm:inline">SISTUR</span> EDU
                      </TabsTrigger>
                    )}
                    {showERPTab && (
                      <TabsTrigger value="erp" className="flex items-center gap-2">
                        <BarChart3 className="h-4 w-4" />
                        <span className="hidden sm:inline">SISTUR</span> ERP
                      </TabsTrigger>
                    )}
                    {showEnterpriseTab && (
                      <TabsTrigger value="enterprise" className="flex items-center gap-2">
                        <Hotel className="h-4 w-4" />
                        Enterprise
                      </TabsTrigger>
                    )}
                  </TabsList>

                  {showEDUTab && (
                    <TabsContent value="edu">
                      <ol className="list-decimal list-inside space-y-3 text-sm text-muted-foreground">
                        <li><strong className="text-foreground">Explore o Catálogo</strong> - Acesse o SISTUR EDU para ver todos os treinamentos disponíveis organizados por pilar.</li>
                        <li><strong className="text-foreground">Escolha uma Trilha</strong> - As trilhas são sequências estruturadas de treinamentos sobre um tema específico.</li>
                        <li><strong className="text-foreground">Matricule-se</strong> - Clique em "Iniciar Trilha" para se matricular e começar a aprender.</li>
                        <li><strong className="text-foreground">Assista aos Treinamentos</strong> - Complete cada módulo no seu ritmo. Seu progresso é salvo automaticamente.</li>
                        <li><strong className="text-foreground">Realize as Avaliações</strong> - Ao final de cada trilha, complete a avaliação para testar seu conhecimento.</li>
                        <li><strong className="text-foreground">Obtenha seu Certificado</strong> - Ao concluir todos os requisitos, emita seu certificado com QR Code verificável.</li>
                      </ol>
                    </TabsContent>
                  )}

                  {showERPTab && (
                    <TabsContent value="erp">
                      <ol className="list-decimal list-inside space-y-3 text-sm text-muted-foreground">
                        <li><strong className="text-foreground">Cadastre um destino</strong> - Acesse a página de Destinos ou use a Nova Rodada. O código IBGE é essencial para o pré-preenchimento automático.</li>
                        <li><strong className="text-foreground">Crie um diagnóstico</strong> - Na Nova Rodada, configure título e período da avaliação.</li>
                        <li><strong className="text-foreground">Pré-preencha com dados oficiais</strong> - O sistema busca automaticamente dados de IBGE, DATASUS, INEP, STN e CADASTUR.</li>
                        <li><strong className="text-foreground">Valide os dados</strong> - Revise fonte, ano e confiança de cada indicador. Confirme ou ajuste valores.</li>
                        <li><strong className="text-foreground">Complete manualmente</strong> - Preencha indicadores não cobertos pelas fontes oficiais.</li>
                        <li><strong className="text-foreground">Calcule os resultados</strong> - O sistema processará os dados validados e gerará os scores por pilar.</li>
                        <li><strong className="text-foreground">Gere relatórios</strong> - Acesse a página de Relatórios para obter análises detalhadas e recomendações.</li>
                      </ol>
                    </TabsContent>
                  )}

                  {showEnterpriseTab && (
                    <TabsContent value="enterprise">
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-4">
                          <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                            <Sparkles className="h-3 w-3 mr-1" />
                            Módulo Enterprise
                          </Badge>
                          <span className="text-sm text-muted-foreground">Para hotéis, resorts e redes hoteleiras</span>
                        </div>
                        <ol className="list-decimal list-inside space-y-3 text-sm text-muted-foreground">
                          <li><strong className="text-foreground">Configure a Organização</strong> - Em Configurações, classifique a organização como "Privada" e ative o acesso Enterprise.</li>
                          <li><strong className="text-foreground">Acesse os Indicadores Enterprise</strong> - 22 indicadores de hospitalidade ficam disponíveis: RevPAR, NPS, Taxa de Ocupação, etc.</li>
                          <li><strong className="text-foreground">Crie um Diagnóstico Hoteleiro</strong> - Use a Nova Rodada selecionando indicadores específicos de hospitalidade.</li>
                          <li><strong className="text-foreground">Preencha KPIs Operacionais</strong> - Informe dados de performance financeira, experiência do hóspede e sustentabilidade.</li>
                          <li><strong className="text-foreground">Analise Resultados</strong> - O Motor IGMA aplica as mesmas 6 regras sistêmicas adaptadas ao contexto hoteleiro.</li>
                          <li><strong className="text-foreground">Implemente Melhorias</strong> - Receba prescrições de capacitação específicas para o trade turístico.</li>
                        </ol>
                      </div>
                    </TabsContent>
                  )}
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ============ FUNCIONALIDADES TAB ============ */}
          <TabsContent value="funcionalidades" className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-4">Funcionalidades do Sistema</h2>
              <Tabs defaultValue={defaultTab} className="w-full">
                <TabsList className={`grid w-full mb-4 ${tabCount === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                  {showEDUTab && (
                    <TabsTrigger value="edu" className="flex items-center gap-2">
                      <GraduationCap className="h-4 w-4" />
                      <span className="hidden sm:inline">SISTUR</span> EDU
                    </TabsTrigger>
                  )}
                  {showERPTab && (
                    <TabsTrigger value="erp" className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      <span className="hidden sm:inline">SISTUR</span> ERP
                    </TabsTrigger>
                  )}
                  {showEnterpriseTab && (
                    <TabsTrigger value="enterprise" className="flex items-center gap-2">
                      <Hotel className="h-4 w-4" />
                      Enterprise
                    </TabsTrigger>
                  )}
                </TabsList>

                {showEDUTab && (
                  <TabsContent value="edu">
                    {renderSectionGrid(filterSections('edu'))}
                  </TabsContent>
                )}
                {showERPTab && (
                  <TabsContent value="erp">
                    {renderSectionGrid(filterSections('erp'))}
                  </TabsContent>
                )}
                {showEnterpriseTab && (
                  <TabsContent value="enterprise">
                    {renderSectionGrid(filterSections('enterprise'))}
                  </TabsContent>
                )}
              </Tabs>
            </div>
          </TabsContent>
        </Tabs>

        {/* Contact */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              Precisa de mais ajuda?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Se você não encontrou a resposta que procurava, entre em contato com nossa equipe de suporte através do email{' '}
              <a href="mailto:suporte@sistur.com.br" className="text-primary hover:underline">
                suporte@sistur.com.br
              </a>
            </p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
