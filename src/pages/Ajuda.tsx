import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  HelpCircle, 
  BookOpen, 
  BarChart3, 
  Upload, 
  FileText, 
  GraduationCap,
  MapPin,
  ClipboardList,
  Mail,
  BookMarked,
  Award,
  PlayCircle,
  Target,
  Hotel,
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useProfile } from '@/hooks/useProfile';
import { Badge } from '@/components/ui/badge';

interface HelpSection {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  system: 'edu' | 'erp' | 'enterprise' | 'both';
}

const helpSections: HelpSection[] = [
  // ERP-only sections
  {
    title: 'Destinos',
    description: 'Cadastre e gerencie os destinos turísticos que serão avaliados pelo sistema.',
    icon: MapPin,
    href: '/destinos',
    system: 'erp',
  },
  {
    title: 'Diagnósticos',
    description: 'Crie e acompanhe rodadas de diagnóstico para avaliar o desempenho dos destinos.',
    icon: ClipboardList,
    href: '/diagnosticos',
    system: 'erp',
  },
  {
    title: 'Indicadores',
    description: 'Visualize o catálogo de indicadores disponíveis organizados por pilar e tema.',
    icon: BarChart3,
    href: '/indicadores',
    system: 'erp',
  },
  {
    title: 'Importações',
    description: 'Importe dados de indicadores via CSV ou preencha manualmente os valores.',
    icon: Upload,
    href: '/importacoes',
    system: 'erp',
  },
  {
    title: 'Relatórios',
    description: 'Gere relatórios detalhados com análises e recomendações para os destinos.',
    icon: FileText,
    href: '/relatorios',
    system: 'erp',
  },

  // EDU-only sections
  {
    title: 'Catálogo de Treinamentos',
    description: 'Explore todos os treinamentos disponíveis organizados por pilar e tema.',
    icon: PlayCircle,
    href: '/edu',
    system: 'edu',
  },
  {
    title: 'Trilhas de Aprendizagem',
    description: 'Siga trilhas estruturadas com sequência de treinamentos e certificação.',
    icon: Target,
    href: '/edu/trilhas',
    system: 'edu',
  },
  {
    title: 'Meus Certificados',
    description: 'Visualize e baixe os certificados das trilhas que você concluiu.',
    icon: Award,
    href: '/certificados',
    system: 'edu',
  },

  // Enterprise-only sections
  {
    title: 'Indicadores de Hospitalidade',
    description: 'RevPAR, NPS, Taxa de Ocupação e outros KPIs específicos para hotéis e resorts.',
    icon: Hotel,
    href: '/indicadores',
    system: 'enterprise',
  },
  {
    title: 'Performance Hoteleira',
    description: 'Acompanhe indicadores financeiros, operacionais e de experiência do hóspede.',
    icon: TrendingUp,
    href: '/diagnosticos',
    system: 'enterprise',
  },
  {
    title: 'Gestão de Equipe',
    description: 'Indicadores de RH: turnover, produtividade e satisfação de colaboradores.',
    icon: Users,
    href: '/indicadores',
    system: 'enterprise',
  },

  // Shared sections
  {
    title: 'Metodologia SISTUR',
    description: 'Entenda a metodologia sistêmica de Mario Beni aplicada ao turismo.',
    icon: BookMarked,
    href: '/metodologia',
    system: 'both',
  },
];

export default function Ajuda() {
  const { hasERPAccess, hasEDUAccess, isAdmin } = useProfile();

  const showERPTab = hasERPAccess || isAdmin;
  const showEDUTab = hasEDUAccess || isAdmin;
  const showEnterpriseTab = isAdmin;
  const defaultTab = showERPTab ? 'erp' : 'edu';

  const filterSections = (system: 'edu' | 'erp' | 'enterprise' | 'both') => {
    return helpSections.filter(section => {
      if (section.system === 'both') return true;
      if (section.system === system) return true;
      return false;
    });
  };

  const eduSections = filterSections('edu');
  const erpSections = filterSections('erp');
  const enterpriseSections = filterSections('enterprise');

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

  const tabCount = [showEDUTab, showERPTab, showEnterpriseTab].filter(Boolean).length;

  return (
    <AppLayout
      title="Central de Ajuda"
      subtitle="Aprenda a utilizar todas as funcionalidades do SISTUR"
    >
      <div className="space-y-8">
        {/* Quick Start based on user type */}
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              Guia Rápido
            </CardTitle>
            <CardDescription>
              {showERPTab && !showEDUTab 
                ? 'Siga estes passos para realizar seu primeiro diagnóstico'
                : showEDUTab && !showERPTab
                  ? 'Siga estes passos para iniciar sua jornada de aprendizado'
                  : 'Siga estes passos para começar'
              }
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
                    <li>
                      <strong className="text-foreground">Explore o Catálogo</strong> - Acesse o SISTUR EDU para ver todos os treinamentos disponíveis organizados por pilar.
                    </li>
                    <li>
                      <strong className="text-foreground">Escolha uma Trilha</strong> - As trilhas são sequências estruturadas de treinamentos sobre um tema específico.
                    </li>
                    <li>
                      <strong className="text-foreground">Matricule-se</strong> - Clique em "Iniciar Trilha" para se matricular e começar a aprender.
                    </li>
                    <li>
                      <strong className="text-foreground">Assista aos Treinamentos</strong> - Complete cada módulo no seu ritmo. Seu progresso é salvo automaticamente.
                    </li>
                    <li>
                      <strong className="text-foreground">Realize as Avaliações</strong> - Ao final de cada trilha, complete a avaliação para testar seu conhecimento.
                    </li>
                    <li>
                      <strong className="text-foreground">Obtenha seu Certificado</strong> - Ao concluir todos os requisitos, emita seu certificado com QR Code verificável.
                    </li>
                  </ol>
                </TabsContent>
              )}

              {showERPTab && (
                <TabsContent value="erp">
                  <ol className="list-decimal list-inside space-y-3 text-sm text-muted-foreground">
                    <li>
                      <strong className="text-foreground">Cadastre um destino</strong> - Acesse a página de Destinos ou use a Nova Rodada. O código IBGE é essencial para o pré-preenchimento automático.
                    </li>
                    <li>
                      <strong className="text-foreground">Crie um diagnóstico</strong> - Na Nova Rodada, configure título e período da avaliação.
                    </li>
                    <li>
                      <strong className="text-foreground">Pré-preencha com dados oficiais</strong> - O sistema busca automaticamente dados de IBGE, DATASUS, INEP, STN e CADASTUR.
                    </li>
                    <li>
                      <strong className="text-foreground">Valide os dados</strong> - Revise fonte, ano e confiança de cada indicador. Confirme ou ajuste valores.
                    </li>
                    <li>
                      <strong className="text-foreground">Complete manualmente</strong> - Preencha indicadores não cobertos pelas fontes oficiais.
                    </li>
                    <li>
                      <strong className="text-foreground">Calcule os resultados</strong> - O sistema processará os dados validados e gerará os scores por pilar.
                    </li>
                    <li>
                      <strong className="text-foreground">Gere relatórios</strong> - Acesse a página de Relatórios para obter análises detalhadas e recomendações.
                    </li>
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
                      <li>
                        <strong className="text-foreground">Configure a Organização</strong> - Em Configurações, classifique a organização como "Privada" e ative o acesso Enterprise.
                      </li>
                      <li>
                        <strong className="text-foreground">Acesse os Indicadores Enterprise</strong> - Os 26 indicadores de hospitalidade ficam disponíveis: RevPAR, NPS, Taxa de Ocupação, etc.
                      </li>
                      <li>
                        <strong className="text-foreground">Crie um Diagnóstico Hoteleiro</strong> - Use a Nova Rodada selecionando indicadores específicos de hospitalidade.
                      </li>
                      <li>
                        <strong className="text-foreground">Preencha KPIs Operacionais</strong> - Informe dados de performance financeira, experiência do hóspede e sustentabilidade.
                      </li>
                      <li>
                        <strong className="text-foreground">Analise Resultados</strong> - O Motor IGMA aplica as mesmas 6 regras sistêmicas adaptadas ao contexto hoteleiro.
                      </li>
                      <li>
                        <strong className="text-foreground">Implemente Melhorias</strong> - Receba prescrições de capacitação específicas para o trade turístico.
                      </li>
                    </ol>
                  </div>
                </TabsContent>
              )}
            </Tabs>
          </CardContent>
        </Card>

        {/* Sections with tabs */}
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
                {renderSectionGrid(eduSections)}
              </TabsContent>
            )}

            {showERPTab && (
              <TabsContent value="erp">
                {renderSectionGrid(erpSections)}
              </TabsContent>
            )}

            {showEnterpriseTab && (
              <TabsContent value="enterprise">
                {renderSectionGrid(enterpriseSections)}
              </TabsContent>
            )}
          </Tabs>
        </div>

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
