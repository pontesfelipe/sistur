import { Helmet } from 'react-helmet-async';
import { AppLayout } from '@/components/layout/AppLayout';
import { ajudaNav } from '@/components/layout/eduSubNav';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Leaf, 
  Building2, 
  Cog, 
  AlertTriangle,
  Ban,
  TrendingUp,
  Users,
  Calendar,
  ArrowRight,
  ArrowDown,
  ShieldAlert,
  Megaphone,
  Network,
  BookOpen,
  Info,
  CheckCircle,
  XCircle,
  Zap,
  Gauge,
  Target,
  FileText,
  BarChart3,
  Clock,
  Users2,
  Lightbulb,
  TrendingDown,
  Scale,
  Hotel,
  Sparkles,
  DollarSign,
  Star,
  Leaf as LeafIcon,
  UserCheck,
  BriefcaseBusiness,
  ShieldCheck
} from 'lucide-react';
import { InteractiveWorkflowDiagram } from '@/components/tools/InteractiveWorkflowDiagram';

import { tx } from "@/i18n/t";
const pillars = [
  {
    id: 'RA',
    name: 'Relações Ambientais',
    abbrev: 'RA / IRA',
    description: tx('Base do sistema turístico. Engloba recursos naturais, patrimônio cultural, qualidade ambiental e sustentabilidade.'),
    color: 'bg-emerald-500 dark:bg-emerald-600',
    borderColor: 'border-emerald-500',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
    icon: Leaf,
    priority: 1,
    examples: ['Qualidade da água', 'Áreas de preservação', 'Gestão de resíduos', 'Patrimônio histórico']
  },
  {
    id: 'OE',
    name: 'Organização Estrutural',
    abbrev: 'OE / IOE',
    description: tx('Infraestrutura de apoio ao turismo. Depende da estabilidade ambiental para expansão sustentável.'),
    color: 'bg-blue-500 dark:bg-blue-600',
    borderColor: 'border-blue-500',
    bgColor: 'bg-blue-50 dark:bg-blue-950/30',
    icon: Building2,
    priority: 2,
    examples: ['Rede hoteleira', 'Transporte', 'Sinalização turística', 'Equipamentos']
  },
  {
    id: 'AO',
    name: 'Ações Operacionais',
    abbrev: 'AO / IAO',
    description: tx('Governança central do sistema. Operações, serviços e coordenação entre os agentes do turismo.'),
    color: 'bg-amber-500 dark:bg-amber-600',
    borderColor: 'border-amber-500',
    bgColor: 'bg-amber-50 dark:bg-amber-950/30',
    icon: Cog,
    priority: 3,
    examples: ['Qualificação profissional', 'Marketing turístico', 'Gestão de destino', 'Políticas públicas']
  }
];

const diagnosticTiers = [
  {
    id: 'SMALL',
    name: 'Essencial',
    icon: Zap,
    color: 'bg-teal-500 dark:bg-teal-600',
    borderColor: 'border-teal-500',
    bgColor: 'bg-teal-50 dark:bg-teal-950/30',
    indicatorCount: '9',
    timeToComplete: '30-45 min',
    description: tx('Diagnóstico rápido focado nos indicadores mais críticos para uma visão geral do destino. Ideal para primeiras avaliações e municípios com recursos limitados.'),
    targetAudience: 'Gestores municipais com pouco tempo ou destinos iniciando no SISTUR',
    useCases: [
      'Primeira avaliação de um destino',
      'Avaliações rápidas trimestrais',
      'Municípios com equipe técnica reduzida',
      'Triagem inicial para priorização'
    ],
    outputs: [
      'Score geral por pilar (RA, OE, AO)',
      'Identificação de pilares críticos',
      'Alertas IGMA básicos',
      '3 recomendações prioritárias por pilar'
    ],
    benefits: [
      'Implementação em 1 dia',
      'Baixo custo de coleta de dados',
      'Visão macro estratégica do destino',
      'Perfeito para começar a jornada'
    ],
    limitations: [
      'Análise menos granular por tema',
      'Menos prescrições específicas',
      'Sem análise de tendências históricas',
      'Não elegível para certificações'
    ]
  },
  {
    id: 'MEDIUM',
    name: 'Estratégico',
    icon: Gauge,
    color: 'bg-violet-500 dark:bg-violet-600',
    borderColor: 'border-violet-500',
    bgColor: 'bg-violet-50 dark:bg-violet-950/30',
    indicatorCount: '19',
    timeToComplete: '2-3 horas',
    description: tx('Diagnóstico intermediário com indicadores estratégicos para planejamento de médio prazo. Equilibra profundidade analítica com praticidade operacional.'),
    targetAudience: 'Secretarias de Turismo estruturadas, destinos em fase de desenvolvimento',
    useCases: [
      'Planejamento anual do turismo municipal',
      'Elaboração de planos diretores de turismo',
      'Captação de recursos em editais públicos',
      'Monitoramento de políticas públicas'
    ],
    outputs: [
      'Tudo do Essencial +',
      'Análise de tendências por indicador',
      'Mapeamento detalhado de gargalos',
      'Prescrições de capacitação direcionadas',
      'Relatório técnico para captação de recursos'
    ],
    benefits: [
      'Melhor relação custo-benefício',
      'Profundidade adequada para gestão ativa',
      'Suporte a decisões estratégicas',
      'Compatível com prazos de editais'
    ],
    limitations: [
      'Requer 2-3 horas de coleta',
      'Algumas áreas temáticas simplificadas',
      'Certificação apenas parcial'
    ]
  },
  {
    id: 'COMPLETE',
    name: 'Integral',
    icon: Target,
    color: 'bg-rose-500 dark:bg-rose-600',
    borderColor: 'border-rose-500',
    bgColor: 'bg-rose-50 dark:bg-rose-950/30',
    indicatorCount: '96',
    timeToComplete: '1-2 semanas',
    description: tx('Diagnóstico completo com todos os indicadores IGMA e complementares para análise profunda. Recomendado para projetos de grande porte e certificações.'),
    targetAudience: 'Destinos maduros, projetos de financiamento, estudos acadêmicos, certificações',
    useCases: [
      'Projetos de grande investimento turístico',
      'Masterplans e planos regionais de turismo',
      'Estudos de impacto territorial',
      'Certificações de destino sustentável',
      'Pesquisas acadêmicas e benchmarking'
    ],
    outputs: [
      'Tudo do Estratégico +',
      'Análise intersetorial completa',
      'Cruzamento de todos os 96 indicadores',
      'Simulações de cenários futuros',
      'Relatório técnico detalhado (50+ páginas)',
      'Trilhas de capacitação 100% personalizadas'
    ],
    benefits: [
      'Máxima precisão diagnóstica',
      'Visão 360° do ecossistema turístico',
      'Suporte a projetos complexos',
      'Elegível para todas as certificações',
      'Base científica robusta'
    ],
    limitations: [
      'Investimento de 1-2 semanas',
      'Requer equipe multidisciplinar',
      'Coleta de dados pode exigir múltiplas fontes',
      'Maior custo operacional'
    ]
  }
];

const tierComparison = [
  { feature: 'Indicadores analisados', essencial: '9', estrategico: '19', integral: '96' },
  { feature: 'Tempo de preenchimento', essencial: '30-45 min', estrategico: '2-3 horas', integral: '1-2 semanas' },
  { feature: 'Cobertura temática', essencial: '3 temas/pilar', estrategico: '6 temas/pilar', integral: tx('Todos os temas') },
  { feature: 'Alertas IGMA', essencial: 'Básicos', estrategico: 'Detalhados', integral: tx('Completos + Intersetoriais') },
  { feature: 'Prescrições de capacitação', essencial: '3 prioritárias', estrategico: 'Direcionadas', integral: '100% personalizadas' },
  { feature: 'Análise de tendências', essencial: '—', estrategico: '✓', integral: '✓ + Projeções' },
  { feature: 'Simulação de cenários', essencial: '—', estrategico: '—', integral: '✓' },
  { feature: 'Relatório para captação', essencial: 'Simplificado', estrategico: 'Completo', integral: tx('Técnico (50+ pág)') },
  { feature: 'Comparativo entre destinos', essencial: 'Básico', estrategico: '✓', integral: '✓ + Ranking' },
  { feature: 'Suporte a certificações', essencial: '—', estrategico: 'Parcial', integral: '✓ Completo' },
];

const rules = [
  {
    id: 1,
    name: 'Prioridade RA',
    icon: Leaf,
    flag: 'RA_LIMITATION',
    color: 'bg-emerald-500 dark:bg-emerald-600',
    description: tx('Limitações ambientais bloqueiam expansão estrutural'),
    detail: 'Se o pilar RA (Relações Ambientais) está crítico, o sistema bloqueia capacitações e investimentos em OE (infraestrutura). Não adianta construir hotéis se o ambiente está degradado.',
    trigger: 'RA = CRÍTICO',
    effect: 'EDU_OE bloqueado',
    example: tx('Praia poluída → Não expandir rede hoteleira')
  },
  {
    id: 2,
    name: 'Ciclo Contínuo',
    icon: Calendar,
    flag: 'CONTINUOUS_CYCLE',
    color: 'bg-purple-500 dark:bg-purple-600',
    description: tx('Revisões programadas baseadas na severidade'),
    detail: 'O sistema calcula automaticamente quando o diagnóstico deve ser revisado. Pilares críticos exigem revisão em 6 meses, atenção em 12 meses, e todos adequados em 18 meses.',
    trigger: 'Severidade dos pilares',
    effect: 'next_review_recommended_at',
    example: tx('Crítico → Revisar em 6 meses')
  },
  {
    id: 3,
    name: 'Externalidades Negativas',
    icon: TrendingUp,
    flag: 'EXTERNALITY_WARNING',
    color: 'bg-red-500 dark:bg-red-600',
    description: tx('Alerta quando OE melhora às custas de RA'),
    detail: 'Detecta crescimento estrutural que degrada o ambiente. Se OE evoluiu (melhorou) entre ciclos mas RA regrediu (piorou), o sistema gera alerta de externalidade negativa.',
    trigger: 'OE↑ enquanto RA↓',
    effect: 'Alerta de externalidade',
    example: tx('Mais hotéis, mais poluição → Alerta')
  },
  {
    id: 4,
    name: 'Governança Central',
    icon: ShieldAlert,
    flag: 'GOVERNANCE_BLOCK',
    color: 'bg-amber-500 dark:bg-amber-600',
    description: tx('AO crítico bloqueia todo o sistema'),
    detail: 'Se o pilar AO (governança/operações) está crítico, não há capacidade de gestão para implementar melhorias. O sistema bloqueia expansão de OE até a governança melhorar.',
    trigger: 'AO = CRÍTICO',
    effect: 'EDU_OE bloqueado',
    example: tx('Sem gestão → Não investir em infraestrutura')
  },
  {
    id: 5,
    name: 'Marketing Bloqueado',
    icon: Megaphone,
    flag: 'MARKETING_BLOCKED',
    color: 'bg-rose-500 dark:bg-rose-600',
    description: tx('Promoção bloqueada se RA ou AO críticos'),
    detail: 'Promover um destino com problemas ambientais graves ou falhas operacionais sérias pode gerar danos à reputação e frustrar turistas. Marketing só é liberado quando pilares essenciais estão saudáveis.',
    trigger: 'RA = CRÍTICO ou AO = CRÍTICO',
    effect: 'MARKETING bloqueado',
    example: tx('Ambiente degradado → Não promover destino')
  },
  {
    id: 6,
    name: 'Interdependência Setorial',
    icon: Network,
    flag: 'INTERSECTORAL_DEPENDENCY',
    color: 'bg-indigo-500 dark:bg-indigo-600',
    description: tx('Identifica indicadores que dependem de múltiplos setores'),
    detail: 'Alguns indicadores (saúde, educação, saneamento) dependem de ações coordenadas entre secretarias. O sistema sinaliza quando a melhoria requer articulação intersetorial, não apenas ações isoladas do turismo.',
    trigger: 'Indicador intersetorial presente',
    effect: 'Sinalização de dependência',
    example: tx('IDEB baixo → Requer articulação com Educação')
  }
];

// Empresarial indicator categories
const enterpriseCategories = [
  {
    id: 'financial',
    name: 'Performance Financeira',
    icon: DollarSign,
    color: 'bg-green-500 dark:bg-green-600',
    borderColor: 'border-green-500',
    bgColor: 'bg-green-50 dark:bg-green-950/30',
    pillar: 'AO',
    indicators: ['RevPAR', 'ADR', 'TRevPAR', 'GOP Margin', 'CPOR'],
    description: tx('KPIs financeiros essenciais para gestão de receita e rentabilidade hoteleira.')
  },
  {
    id: 'guest',
    name: 'Experiência do Hóspede',
    icon: Star,
    color: 'bg-amber-500 dark:bg-amber-600',
    borderColor: 'border-amber-500',
    bgColor: 'bg-amber-50 dark:bg-amber-950/30',
    pillar: 'AO',
    indicators: ['NPS', 'CSAT', 'Review Score', 'Repeat Guest Rate'],
    description: tx('Métricas de satisfação e fidelização baseadas em feedback direto dos hóspedes.')
  },
  {
    id: 'operations',
    name: 'Operações',
    icon: Cog,
    color: 'bg-blue-500 dark:bg-blue-600',
    borderColor: 'border-blue-500',
    bgColor: 'bg-blue-50 dark:bg-blue-950/30',
    pillar: 'OE',
    indicators: ['Taxa de Ocupação', 'Tempo de Check-in', 'Manutenção Preventiva', 'Eficiência Operacional'],
    description: tx('Indicadores de eficiência operacional e qualidade dos serviços prestados.')
  },
  {
    id: 'sustainability',
    name: 'Sustentabilidade',
    icon: LeafIcon,
    color: 'bg-emerald-500 dark:bg-emerald-600',
    borderColor: 'border-emerald-500',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
    pillar: 'RA',
    indicators: ['Consumo de Água por Hóspede', 'Consumo de Energia', 'Gestão de Resíduos', 'Pegada de Carbono'],
    description: tx('Métricas ambientais alinhadas ao pilar RA de Relações Ambientais.')
  },
  {
    id: 'hr',
    name: 'Recursos Humanos',
    icon: UserCheck,
    color: 'bg-purple-500 dark:bg-purple-600',
    borderColor: 'border-purple-500',
    bgColor: 'bg-purple-50 dark:bg-purple-950/30',
    pillar: 'OE',
    indicators: ['Turnover Rate', 'Produtividade por Colaborador', 'eNPS', 'Treinamento por Colaborador'],
    description: tx('Indicadores de gestão de pessoas e desenvolvimento de equipe.')
  },
  {
    id: 'marketing',
    name: 'Marketing & Distribuição',
    icon: BriefcaseBusiness,
    color: 'bg-pink-500 dark:bg-pink-600',
    borderColor: 'border-pink-500',
    bgColor: 'bg-pink-50 dark:bg-pink-950/30',
    pillar: 'AO',
    indicators: ['Taxa de Conversão', 'CAC', 'Mix de Canais', 'Revenue por Canal'],
    description: tx('Métricas de aquisição, distribuição e eficiência de marketing.')
  },
  {
    id: 'compliance',
    name: 'Compliance & Segurança',
    icon: ShieldCheck,
    color: 'bg-slate-500 dark:bg-slate-600',
    borderColor: 'border-slate-500',
    bgColor: 'bg-slate-50 dark:bg-slate-950/30',
    pillar: 'OE',
    indicators: ['Índice de Conformidade', 'Acidentes de Trabalho', 'Auditorias Aprovadas'],
    description: tx('Indicadores de conformidade regulatória e segurança operacional.')
  }
];

export default function Metodologia() {
  return (
    <>
    <Helmet>
      <title>{tx("Metodologia Mario Beni — Motor IGMA | SISTUR")}</title>
      <meta name="description" content="Princípios sistêmicos de Mario Beni aplicados ao turismo: pilares RA, OE e AO, regras IGMA e interpretação territorial dos diagnósticos." />
      <link rel="canonical" href="https://sistur.lovable.app/metodologia" />
      <meta property="og:title" content="Metodologia Mario Beni — Motor IGMA | SISTUR" />
      <meta property="og:description" content="Como o SISTUR aplica a teoria sistêmica do turismo de Mario Beni: pilares, regras IGMA e interpretação territorial." />
      <meta property="og:url" content="https://sistur.lovable.app/metodologia" />
    </Helmet>
    <AppLayout subNav={ajudaNav}
      title={tx("Metodologia Mario Beni")}
      subtitle={tx("Princípios sistêmicos do turismo sustentável")}
    >
      <div className="space-y-8">
        {/* Introduction */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              {tx("Fundamentação Teórica")}
            </CardTitle>
            <CardDescription>
              {tx("O SISTUR é baseado na teoria sistêmica do turismo do Prof. Mario Carlos Beni")}
            </CardDescription>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <p>
              O <strong>{tx("Sistema de Inteligência Territorial para o Turismo (SISTUR)")}</strong> {tx("implementa os princípios da")} <strong>{tx("Análise Estrutural do Turismo")}</strong> {tx("desenvolvida pelo Prof. Mario Carlos Beni. A teoria estabelece que o turismo é um sistema aberto, composto por subsistemas interdependentes que devem ser analisados de forma holística.")}
            </p>
            <p>
              O <strong>{tx("Motor IGMA")}</strong> (Intelligence for Governance, Management and Action) é o núcleo 
              do sistema que aplica automaticamente 6 regras derivadas dessa teoria, garantindo que as 
              decisões respeitem a lógica sistêmica do turismo.
            </p>
            <p>
              {tx("A partir da v1.28.0, o SISTUR oferece a")} <strong>{tx("Mandala da Sustentabilidade no Turismo (MST)")}</strong>{' '}
              como expansão opcional. A MST representa visualmente os 3 conjuntos de Beni (RA / OE / AO) e seus
              subsistemas, e adiciona 4 dimensões contemporâneas (Tecnologia, Inclusão, TBC e Sensibilização) com
              9 indicadores complementares automatizáveis (TSE, Anatel, CADASTUR PNQT, NBR 9050).
            </p>
          </CardContent>
        </Card>

        {/* Mandala da Sustentabilidade no Turismo */}
        <Card className="border-accent/40 bg-accent/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-accent-foreground" />
              {tx("🌀 Mandala da Sustentabilidade no Turismo (MST)")}
              <Badge variant="outline" className="ml-2 text-xs">{tx("Opcional")}</Badge>
            </CardTitle>
            <CardDescription>
              Extensão contemporânea baseada em Tasso, Silva &amp; Nascimento (2024) — opt-in por diagnóstico
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 prose prose-sm max-w-none dark:prose-invert">
            <p>
              A MST mantém o núcleo SISTUR (Score Final, classificação e regras IGMA) intacto e adiciona 9
              indicadores complementares mapeados nos 3 pilares de Beni. Os indicadores MST aparecem com badge{' '}
              <strong>{tx("🌀 MST")}</strong> no catálogo e só são exigidos quando o opt-in{' '}
              <em>{tx("Expandir com Mandala")}</em> {tx("é ativado no Step 3 da Nova Rodada.")}
            </p>
            <div className="grid md:grid-cols-3 gap-3 not-prose">
              <div className="rounded-lg border border-emerald-500/40 bg-emerald-50/40 dark:bg-emerald-950/20 p-3">
                <p className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400">{tx("RA — 4 indicadores")}</p>
                <ul className="text-xs mt-1 space-y-0.5 text-muted-foreground">
                  <li>{tx("• MST_ACC_NBR9050 — Acessibilidade")}</li>
                  <li>{tx("• MST_GREEN_AREA — Áreas verdes")}</li>
                  <li>{tx("• MST_WATER_QUALITY — Balneabilidade")}</li>
                  <li>{tx("• MST_HERITAGE — Patrimônio cultural")}</li>
                </ul>
              </div>
              <div className="rounded-lg border border-blue-500/40 bg-blue-50/40 dark:bg-blue-950/20 p-3">
                <p className="text-xs font-mono font-bold text-blue-700 dark:text-blue-400">{tx("OE — 3 indicadores")}</p>
                <ul className="text-xs mt-1 space-y-0.5 text-muted-foreground">
                  <li>{tx("• MST_5G_WIFI — Conectividade (Anatel)")}</li>
                  <li>{tx("• MST_PNQT_QUAL — Qualificação CADASTUR")}</li>
                  <li>{tx("• MST_TSE_TURNOUT — Engajamento eleitoral")}</li>
                </ul>
              </div>
              <div className="rounded-lg border border-amber-500/40 bg-amber-50/40 dark:bg-amber-950/20 p-3">
                <p className="text-xs font-mono font-bold text-amber-700 dark:text-amber-400">{tx("AO — 1 indicador")}</p>
                <ul className="text-xs mt-1 space-y-0.5 text-muted-foreground">
                                    <li>{tx("• MST_TBC — Turismo de Base Comunitária")}</li>
                </ul>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              <strong>{tx("Automação parcial e fallback manual:")}</strong> as edge functions{' '}
              <code>{tx("ingest-tse")}</code>, <code>{tx("ingest-anatel")}</code> e <code>{tx("ingest-cadastur")}</code>{' '}
              consultam primeiro os caches <code>{tx("tse_turnout_cache")}</code> e{' '}
              <code>{tx("anatel_coverage_cache")}</code> (15 capitais âncora pré-populadas com dados oficiais
              verificados: comparecimento eleitoral 2022/2024 e cobertura 5G/4G). Quando o município
              está fora do cache, o sistema tenta scraping sob demanda via Firecrawl em fontes
              agregadoras (G1 Eleições, Teleco) — porém TSE e Anatel oficiais bloqueiam acesso
              programático (SPA com hash routing e painéis Leaflet), então a maioria dos destinos
              cai no <strong>{tx("fallback manual")}</strong>: o indicador aparece no painel de pré-preenchimento como linha MANUAL com valor vazio, badge 🌀 MST e link direto para a fonte oficial. O usuário insere o valor e o sistema persiste como fonte oficial validada. Disparado apenas quando <em>{tx("Expandir com Mandala")}</em> {tx("está ativo no diagnóstico (zero custo extra para rodadas sem opt-in).")}
            </p>
            <p className="text-xs text-muted-foreground">
              <strong>{tx("Cache TTL:")}</strong> TSE reutiliza valores enquanto{' '}
              <code>{tx("election_year ≥ 2024")}</code> (último pleito municipal); Anatel tem TTL de 90 dias
              por município. Cache hit retorna em &lt;100ms sem consumir créditos Firecrawl.
            </p>
            <p className="text-xs text-muted-foreground">
              <strong>{tx("Visualização:")}</strong> {tx("o componente")} <em>{tx("Mandala do Destino")}</em> {tx("no Dashboard Territorial renderiza os 3 conjuntos como setores circulares, com anel externo MST quando o opt-in está ativo.")}
            </p>
          </CardContent>
        </Card>

        {/* Three Pillars */}
        <Card>
          <CardHeader>
            <CardTitle>{tx("Os Três Pilares do Sistema Turístico")}</CardTitle>
            <CardDescription>
              {tx("Hierarquia de prioridades: RA → OE → AO")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-3 gap-4">
              {pillars.map((pillar, idx) => (
                <div 
                  key={pillar.id}
                  className={`relative rounded-xl border-2 ${pillar.borderColor} ${pillar.bgColor} p-5 space-y-3`}
                >
                  <div className="flex items-center justify-between">
                    <div className={`p-2 rounded-lg ${pillar.color} text-white`}>
                      <pillar.icon className="h-5 w-5" />
                    </div>
                    <Badge variant="outline" className="font-mono">
                      {tx("Prioridade {{v0}}", { v0: pillar.priority })}
                    </Badge>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{pillar.name}</h3>
                    <p className="text-sm text-muted-foreground font-mono">{pillar.abbrev}</p>
                  </div>
                  <p className="text-sm text-muted-foreground">{pillar.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {pillar.examples.map(ex => (
                      <Badge key={ex} variant="secondary" className="text-xs">
                        {ex}
                      </Badge>
                    ))}
                  </div>
                  {idx < pillars.length - 1 && (
                    <div className="hidden md:block absolute -right-5 top-1/2 transform -translate-y-1/2 z-10">
                      <ArrowRight className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                </div>
              ))}
            </div>

            <Alert className="border-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-950/20">
              <Leaf className="h-4 w-4 text-emerald-600" />
              <AlertTitle className="text-emerald-700 dark:text-emerald-400">
                {tx("RA é a Base do Sistema")}
              </AlertTitle>
              <AlertDescription className="text-emerald-600 dark:text-emerald-300">
                {tx("Segundo Mario Beni, sem um ambiente saudável e recursos naturais preservados, não há turismo sustentável. Por isso, RA sempre tem prioridade sobre os demais pilares.")}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Diagnostic Tiers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-primary" />
              {tx("Os 3 Níveis de Diagnóstico")}
            </CardTitle>
            <CardDescription>
              {tx("Escolha o nível adequado à sua realidade e objetivos")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* Tier Cards */}
            <div className="grid lg:grid-cols-3 gap-6">
              {diagnosticTiers.map((tier) => (
                <div 
                  key={tier.id}
                  className={`relative rounded-xl border-2 ${tier.borderColor} ${tier.bgColor} p-6 space-y-4`}
                >
                  <div className="flex items-center justify-between">
                    <div className={`p-3 rounded-xl ${tier.color} text-white`}>
                      <tier.icon className="h-6 w-6" />
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className="font-mono">
                        {tx("{{v0}} indicadores", { v0: tier.indicatorCount })}
                      </Badge>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-bold text-xl">{tier.name}</h3>
                    <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      {tier.timeToComplete}
                    </div>
                  </div>
                  
                  <p className="text-sm text-muted-foreground">{tier.description}</p>
                  
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center gap-2 text-sm font-medium mb-2">
                        <Users2 className="h-4 w-4 text-primary" />
                        {tx("Público-alvo")}
                      </div>
                      <p className="text-sm text-muted-foreground">{tier.targetAudience}</p>
                    </div>
                    
                    <div>
                      <div className="flex items-center gap-2 text-sm font-medium mb-2">
                        <Lightbulb className="h-4 w-4 text-primary" />
                        {tx("Casos de uso")}
                      </div>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        {tier.useCases.map((useCase, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-primary">•</span>
                            {useCase}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Detailed Benefits */}
            <div className="space-y-6">
              <h4 className="font-semibold text-lg flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                {tx("O que cada nível entrega")}
              </h4>
              
              <div className="grid lg:grid-cols-3 gap-4">
                {diagnosticTiers.map((tier) => (
                  <div key={tier.id} className={`rounded-xl border ${tier.borderColor} p-5 space-y-4`}>
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-lg ${tier.color} text-white`}>
                        <tier.icon className="h-4 w-4" />
                      </div>
                      <h5 className="font-semibold">{tier.name}</h5>
                    </div>
                    
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                        {tx("Outputs / Relatórios")}
                      </p>
                      <ul className="text-sm space-y-1">
                        {tier.outputs.map((output, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                            {output}
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                        {tx("Benefícios")}
                      </p>
                      <ul className="text-sm space-y-1">
                        {tier.benefits.map((benefit, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <TrendingUp className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                            {benefit}
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                        {tx("Limitações")}
                      </p>
                      <ul className="text-sm space-y-1">
                        {tier.limitations.map((limitation, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-muted-foreground">
                            <TrendingDown className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                            {limitation}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Comparison Table */}
            <div className="space-y-4">
              <h4 className="font-semibold text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                {tx("Tabela Comparativa")}
              </h4>
              
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium">{tx("Funcionalidade")}</th>
                      <th className="text-center py-3 px-4 font-medium">
                        <div className="flex items-center justify-center gap-2">
                          <Zap className="h-4 w-4 text-teal-500" />
                          {tx("Essencial")}
                        </div>
                      </th>
                      <th className="text-center py-3 px-4 font-medium">
                        <div className="flex items-center justify-center gap-2">
                          <Gauge className="h-4 w-4 text-violet-500" />
                          {tx("Estratégico")}
                        </div>
                      </th>
                      <th className="text-center py-3 px-4 font-medium">
                        <div className="flex items-center justify-center gap-2">
                          <Target className="h-4 w-4 text-rose-500" />
                          {tx("Integral")}
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {tierComparison.map((row, idx) => (
                      <tr key={idx} className="border-b last:border-0">
                        <td className="py-3 px-4 font-medium">{row.feature}</td>
                        <td className="py-3 px-4 text-center">
                          {row.essencial === '✓' ? (
                            <CheckCircle className="h-4 w-4 text-green-500 mx-auto" />
                          ) : row.essencial === '—' ? (
                            <span className="text-muted-foreground">—</span>
                          ) : (
                            row.essencial
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {row.estrategico === '✓' ? (
                            <CheckCircle className="h-4 w-4 text-green-500 mx-auto" />
                          ) : row.estrategico === '—' ? (
                            <span className="text-muted-foreground">—</span>
                          ) : (
                            row.estrategico
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {row.integral === '✓' ? (
                            <CheckCircle className="h-4 w-4 text-green-500 mx-auto" />
                          ) : row.integral === '—' ? (
                            <span className="text-muted-foreground">—</span>
                          ) : (
                            row.integral
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recommendation Alert */}
            <Alert className="border-primary/50 bg-primary/5">
              <Info className="h-4 w-4" />
              <AlertTitle>{tx("Qual nível escolher?")}</AlertTitle>
              <AlertDescription className="space-y-2">
                <p>
                  <strong>{tx("Comece pelo Essencial")}</strong> {tx("se é seu primeiro diagnóstico ou se precisa de resultados rápidos. Use o")} <strong>{tx("Estratégico")}</strong> {tx("para planejamento anual ou captação de recursos. Reserve o")} <strong>{tx("Integral")}</strong> {tx("para projetos de grande porte ou certificações de destino.")}
                </p>
                <p className="text-muted-foreground">
                  {tx("Você pode evoluir o nível do diagnóstico a qualquer momento, adicionando mais indicadores conforme a maturidade do destino aumenta.")}
                </p>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Empresarial Module */}
        <Card className="border-amber-500/30 bg-gradient-to-br from-amber-50/50 to-orange-50/30 dark:from-amber-950/20 dark:to-orange-950/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                <Hotel className="h-5 w-5" />
              </div>
              <span>{tx("SISTUR Empresarial")}</span>
              <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white ml-2">
                <Sparkles className="h-3 w-3 mr-1" />
                {tx("Módulo Hoteleiro")}
              </Badge>
            </CardTitle>
            <CardDescription>
              {tx("Adaptação da metodologia Mario Beni para o setor privado de hospitalidade")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <p>
                O <strong>{tx("SISTUR Empresarial")}</strong> {tx("estende a teoria sistêmica de Mario Beni para organizações do setor privado, especialmente hotéis, resorts e redes hoteleiras. O módulo utiliza")} <strong>{tx("22 indicadores especializados")}</strong> {tx("de hospitalidade, sendo que")} 
                <strong>{tx("6 indicadores são compartilhados")}</strong> {tx("entre os diagnósticos territoriais e empresariais (NPS, Reviews Online, Horas de Treinamento, % Funcionários Locais, % Compras Locais e Certificações Ambientais), mantendo a mesma lógica sistêmica e as 6 regras do Motor IGMA.")}
              </p>
            </div>

            {/* Empresarial Categories Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {enterpriseCategories.map((category) => (
                <div 
                  key={category.id}
                  className={`rounded-xl border-2 ${category.borderColor} ${category.bgColor} p-4 space-y-3`}
                >
                  <div className="flex items-center justify-between">
                    <div className={`p-2 rounded-lg ${category.color} text-white`}>
                      <category.icon className="h-4 w-4" />
                    </div>
                    <Badge variant="outline" className="font-mono text-xs">
                      {tx("Pilar {{v0}}", { v0: category.pillar })}
                    </Badge>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">{category.name}</h4>
                    <p className="text-xs text-muted-foreground mt-1">{category.description}</p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {category.indicators.slice(0, 3).map(ind => (
                      <Badge key={ind} variant="secondary" className="text-xs">
                        {ind}
                      </Badge>
                    ))}
                    {category.indicators.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{category.indicators.length - 3}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Empresarial vs Public Comparison */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="rounded-xl border bg-card p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-blue-500" />
                  <h4 className="font-semibold">{tx("Organizações Públicas")}</h4>
                </div>
                <ul className="text-sm space-y-2 text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                    {tx("Secretarias de Turismo e órgãos governamentais")}
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                    {tx("Diagnósticos territoriais de municípios")}
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                    {tx("~96 indicadores IGMA + oficiais")}
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                    {tx("Fontes: IBGE, SIDRA, DATASUS, INEP, STN, CADASTUR, Mapa do Turismo, ANA/Hidroweb")}
                  </li>
                </ul>
              </div>

              <div className="rounded-xl border-2 border-amber-500/50 bg-gradient-to-br from-amber-50/50 to-orange-50/30 dark:from-amber-950/20 dark:to-orange-950/10 p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <Hotel className="h-5 w-5 text-amber-500" />
                  <h4 className="font-semibold">{tx("Organizações Privadas (Empresarial)")}</h4>
                </div>
                <ul className="text-sm space-y-2 text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <Sparkles className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                    {tx("Hotéis, resorts e redes hoteleiras")}
                  </li>
                  <li className="flex items-start gap-2">
                    <Sparkles className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                    {tx("Diagnósticos de performance hoteleira")}
                  </li>
                  <li className="flex items-start gap-2">
                    <Sparkles className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                    {tx("22 indicadores de hospitalidade (6 compartilhados)")}
                  </li>
                  <li className="flex items-start gap-2">
                    <Sparkles className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                    {tx("KPIs: RevPAR, NPS, Ocupação, GOP Margin")}
                  </li>
                </ul>
              </div>
            </div>

            <Alert className="border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20">
              <Hotel className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-amber-700 dark:text-amber-400">
                {tx("Catálogo Unificado com Indicadores Compartilhados")}
              </AlertTitle>
              <AlertDescription className="text-amber-600 dark:text-amber-300">
                {tx("O SISTUR utiliza um catálogo unificado de indicadores. 6 indicadores possuem escopo \"ambos\" e são utilizados tanto em diagnósticos territoriais quanto empresariais:")} <strong>{tx("NPS")}</strong>, <strong>{tx("Nota de Reviews Online")}</strong>, 
                <strong>{tx("Horas de Treinamento")}</strong>, <strong>{tx("% Funcionários Locais")}</strong>, <strong>{tx("% Compras Locais")}</strong> e <strong>{tx("Certificações Ambientais")}</strong>{tx(". As 6 regras IGMA são aplicadas normalmente em ambos os contextos, incluindo bloqueios quando RA está crítico.")}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-primary" />
              {tx("As 6 Regras do Motor IGMA")}
            </CardTitle>
            <CardDescription>
              {tx("Regras determinísticas aplicadas automaticamente a cada diagnóstico")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              {rules.map((rule) => (
                <div 
                  key={rule.id}
                  className="rounded-xl border bg-card p-5 space-y-4"
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-xl ${rule.color} text-white shrink-0`}>
                      <rule.icon className="h-6 w-6" />
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-lg">
                          {tx("Regra {{v0}}: {{v1}}", { v0: rule.id, v1: rule.name })}
                        </h3>
                        <Badge variant="outline" className="font-mono text-xs">
                          {rule.flag}
                        </Badge>
                      </div>
                      <p className="text-sm font-medium">{rule.description}</p>
                      <p className="text-sm text-muted-foreground">{rule.detail}</p>
                    </div>
                  </div>
                  
                  <div className="grid sm:grid-cols-3 gap-3 pt-3 border-t">
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground mb-1">{tx("Gatilho")}</p>
                      <p className="text-sm font-mono font-medium">{rule.trigger}</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground mb-1">{tx("Efeito")}</p>
                      <p className="text-sm font-mono font-medium">{rule.effect}</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground mb-1">{tx("Exemplo")}</p>
                      <p className="text-sm">{rule.example}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Visual Diagram - Interactions */}
        <Card>
          <CardHeader>
            <CardTitle>{tx("Diagrama de Interações")}</CardTitle>
            <CardDescription>
              {tx("Como as regras se conectam e afetam o sistema")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Decision Flow */}
            <div className="bg-muted/30 rounded-xl p-6 space-y-6">
              <h4 className="font-semibold text-center">{tx("Fluxo de Decisão do Motor IGMA")}</h4>
              
              <div className="flex flex-col items-center gap-4">
                {/* Start */}
                <div className="bg-primary text-primary-foreground px-6 py-3 rounded-full font-medium">
                  {tx("Diagnóstico Calculado")}
                </div>
                <ArrowDown className="h-6 w-6 text-muted-foreground" />
                
                {/* Check RA */}
                <div className="bg-emerald-100 dark:bg-emerald-900/30 border-2 border-emerald-500 rounded-xl p-4 w-full max-w-md text-center">
                  <p className="font-medium">{tx("RA está Crítico?")}</p>
                </div>
                
                <div className="flex items-center gap-8 w-full max-w-lg justify-center">
                  <div className="flex flex-col items-center gap-2">
                    <Badge className="bg-red-500">{tx("Sim")}</Badge>
                    <ArrowDown className="h-4 w-4 text-red-500" />
                    <div className="flex items-center gap-2 text-sm bg-red-50 dark:bg-red-950/30 p-3 rounded-lg border border-red-200">
                      <XCircle className="h-4 w-4 text-red-500" />
                      <span>{tx("Bloqueia EDU_OE + Marketing")}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <Badge className="bg-green-500">{tx("Não")}</Badge>
                    <ArrowDown className="h-4 w-4 text-green-500" />
                    <div className="flex items-center gap-2 text-sm bg-green-50 dark:bg-green-950/30 p-3 rounded-lg border border-green-200">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>{tx("Continua verificação")}</span>
                    </div>
                  </div>
                </div>

                <ArrowDown className="h-6 w-6 text-muted-foreground" />

                {/* Check AO */}
                <div className="bg-amber-100 dark:bg-amber-900/30 border-2 border-amber-500 rounded-xl p-4 w-full max-w-md text-center">
                  <p className="font-medium">{tx("AO está Crítico?")}</p>
                </div>
                
                <div className="flex items-center gap-8 w-full max-w-lg justify-center">
                  <div className="flex flex-col items-center gap-2">
                    <Badge className="bg-red-500">{tx("Sim")}</Badge>
                    <ArrowDown className="h-4 w-4 text-red-500" />
                    <div className="flex items-center gap-2 text-sm bg-red-50 dark:bg-red-950/30 p-3 rounded-lg border border-red-200">
                      <XCircle className="h-4 w-4 text-red-500" />
                      <span>{tx("Bloqueia EDU_OE + Marketing")}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <Badge className="bg-green-500">{tx("Não")}</Badge>
                    <ArrowDown className="h-4 w-4 text-green-500" />
                    <div className="flex items-center gap-2 text-sm bg-green-50 dark:bg-green-950/30 p-3 rounded-lg border border-green-200">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>{tx("Libera todas as ações")}</span>
                    </div>
                  </div>
                </div>

                <ArrowDown className="h-6 w-6 text-muted-foreground" />

                {/* Calculate Review */}
                <div className="bg-purple-100 dark:bg-purple-900/30 border-2 border-purple-500 rounded-xl p-4 w-full max-w-md text-center">
                  <p className="font-medium">{tx("Calcula Próxima Revisão")}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Crítico=6m | Atenção=12m | Adequado=18m
                  </p>
                </div>

                <ArrowDown className="h-6 w-6 text-muted-foreground" />

                {/* End */}
                <div className="bg-primary text-primary-foreground px-6 py-3 rounded-full font-medium">
                  {tx("Alertas IGMA Gerados")}
                </div>
              </div>
            </div>

            {/* Allowed vs Blocked */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-green-50 dark:bg-green-950/20 rounded-xl p-5 border border-green-200 dark:border-green-900">
                <h4 className="font-semibold flex items-center gap-2 mb-3 text-green-700 dark:text-green-400">
                  <CheckCircle className="h-5 w-5" />
                  {tx("Ações Permitidas (quando pilares saudáveis)")}
                </h4>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-emerald-100">{tx("EDU_RA")}</Badge>
                    {tx("Capacitações em Relações Ambientais")}
                  </li>
                  <li className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-blue-100">{tx("EDU_OE")}</Badge>
                    {tx("Capacitações em Organização Estrutural")}
                  </li>
                  <li className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-amber-100">{tx("EDU_AO")}</Badge>
                    {tx("Capacitações em Ações Operacionais")}
                  </li>
                  <li className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-rose-100">{tx("MARKETING")}</Badge>
                    {tx("Promoção e marketing do destino")}
                  </li>
                </ul>
              </div>

              <div className="bg-red-50 dark:bg-red-950/20 rounded-xl p-5 border border-red-200 dark:border-red-900">
                <h4 className="font-semibold flex items-center gap-2 mb-3 text-red-700 dark:text-red-400">
                  <XCircle className="h-5 w-5" />
                  {tx("Bloqueios (quando pilares críticos)")}
                </h4>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <Badge variant="destructive" className="shrink-0">{tx("RA Crítico")}</Badge>
                    <span>{tx("Bloqueia EDU_OE e MARKETING")}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Badge variant="destructive" className="shrink-0">{tx("AO Crítico")}</Badge>
                    <span>{tx("Bloqueia EDU_OE e MARKETING")}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Badge className="bg-amber-500 shrink-0">{tx("Externalidade")}</Badge>
                    <span>{tx("Gera alerta, recomenda revisão de OE")}</span>
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Workflow Diagram */}
        <InteractiveWorkflowDiagram />

        {/* Data Sources Transparency */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              {tx("Fontes de Dados e Transparência")}
            </CardTitle>
            <CardDescription>
              {tx("Origem e confiabilidade dos dados utilizados nos diagnósticos")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <p>
                {tx("O SISTUR preza pela")} <strong>{tx("transparência total")}</strong> {tx("na origem dos dados. Cada indicador é classificado por sua fonte e método de coleta, com níveis de confiabilidade claramente exibidos.")}
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="rounded-xl border-2 border-green-500 bg-green-50 dark:bg-green-950/30 p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <Badge className="bg-green-600 text-white">{tx("API")}</Badge>
                  <h4 className="font-semibold">{tx("Dados via API Oficial")}</h4>
                </div>
                <p className="text-sm text-muted-foreground">{tx("Confiabilidade: 5/5 ⭐ — Obtidos automaticamente de APIs públicas.")}</p>
                <ul className="text-sm space-y-1.5">
                  <li className="flex items-start gap-2"><span className="text-green-600">📊</span> <strong>{tx("IBGE Agregados")}</strong>: População, PIB per capita, Densidade demográfica e Área territorial (Censo 2022, tabela 4714)</li>
                  <li className="flex items-start gap-2"><span className="text-green-600">🏘️</span> <strong>{tx("IBGE SIDRA (Censo 2010)")}</strong>: Abastecimento de água (rede geral %) e Coleta de lixo domiciliar (%) — tabela 3217</li>
                  <li className="flex items-start gap-2"><span className="text-green-600">📈</span> <strong>{tx("IBGE Pesquisas")}</strong>: IDH Municipal, Índice de Gini, Incidência de pobreza</li>
                  <li className="flex items-start gap-2"><span className="text-green-600">🏥</span> <strong>{tx("DATASUS")}</strong>: Leitos hospitalares por habitante, Cobertura de saúde (estabelecimentos), Taxa de mortalidade infantil, Mortalidade geral por mil habitantes</li>
                  <li className="flex items-start gap-2"><span className="text-green-600">📚</span> <strong>{tx("INEP")}</strong>: IDEB (Índice de Desenvolvimento da Educação Básica)</li>
                  <li className="flex items-start gap-2"><span className="text-green-600">💰</span> <strong>{tx("STN / Tesouro Nacional")}</strong>: Receita própria per capita, Despesa com turismo (R$ milhões)</li>
                  <li className="flex items-start gap-2"><span className="text-green-600">🏨</span> <strong>{tx("IBGE Pesquisas (CADASTUR)")}</strong>: Meios de hospedagem (estabelecimentos e UH)</li>
                  <li className="flex items-start gap-2"><span className="text-green-600">🏨</span> <strong>{tx("CADASTUR / dados.gov.br")}</strong>: Guias de turismo e Agências de turismo via datasets oficiais abertos (ingestão trimestral)</li>
                  <li className="flex items-start gap-2"><span className="text-green-600">🗺️</span> <strong>{tx("Mapa do Turismo Brasileiro")}</strong>: Região turística, Categoria (A-E), Empregos no turismo, Estabelecimentos turísticos, Visitantes nacionais e internacionais, Arrecadação turística, Conselho municipal de turismo — via API REST do Ministério do Turismo (mapa.turismo.gov.br)</li>
                  <li className="flex items-start gap-2"><span className="text-green-600">💧</span> <strong>{tx("ANA / Hidroweb (Qualiágua)")}</strong>: IQA (Índice de Qualidade da Água) médio das estações de monitoramento do município, número de estações ativas e ano de referência — via API pública da Agência Nacional de Águas (alimenta o pilar RA com base hídrica oficial)</li>
                  <li className="flex items-start gap-2"><span className="text-green-600">💰</span> <strong>{tx("SICONFI / Tesouro Nacional (RREO Anexo 02)")}</strong>: {tx("Despesa municipal empenhada e liquidada nas funções Turismo, Cultura e Saneamento (acumulado do ano) — pilar OE")}</li>
                  <li className="flex items-start gap-2"><span className="text-green-600">👷</span> <strong>{tx("Novo CAGED")}</strong>: {tx("Admissões, desligamentos e saldo de empregos formais nas atividades características do turismo, por mês — pilar AO e Observatório")}</li>
                  <li className="flex items-start gap-2"><span className="text-green-600">🚰</span> <strong>{tx("SNIS / SINISA")}</strong>: {tx("Cobertura de água, coleta e tratamento de esgoto, coleta de resíduos e perdas de água — pilar RA")}</li>
                  <li className="flex items-start gap-2"><span className="text-green-600">🏛️</span> <strong>{tx("IPHAN / SICG")}</strong>: {tx("Bens culturais tombados e registrados no município — pilar RA")}</li>
                  <li className="flex items-start gap-2"><span className="text-green-600">✈️</span> <strong>{tx("Polícia Federal / MTur")}</strong>: {tx("Chegadas de turistas internacionais por UF, mês e via de entrada — demanda internacional")}</li>
                  <li className="flex items-start gap-2"><span className="text-green-600">🌦️</span> <strong>{tx("INMET (Normais 1991-2020)")}</strong>: {tx("Temperatura e chuva médias mensais por estação — sazonalidade")}</li>
                  <li className="text-xs text-muted-foreground">{tx("IPHAN é consultado direto no geoserver oficial. CAGED (microdados mensais do MTE agregados por município e setor turístico, com atualização automática mensal via agendamento externo), SNIS, PF e INMET são importados de arquivos de dados abertos. Sem dado disponível, o indicador fica fora do pré-preenchimento.")}</li>
                  <li className="text-xs text-muted-foreground">{tx("Atualização: cada fonte roda em agendamento automático (PF dia 10, IPHAN dia 12, SICONFI dia 15, saneamento dia 18, CAGED dia 5, INMET anual em março) e pode ser atualizada manualmente por administradores. Toda execução é registrada com status, horários, volume e erro, garantindo rastreabilidade da proveniência dos dados.")}</li>
                </ul>
              </div>

              <div className="rounded-xl border-2 border-amber-500 bg-amber-50 dark:bg-amber-950/30 p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="destructive">{tx("Manual")}</Badge>
                  <h4 className="font-semibold">{tx("Preenchimento Manual")}</h4>
                </div>
                <p className="text-sm text-muted-foreground">{tx("Confiabilidade: 1/5 ⭐ — Sem API pública disponível. Requer inserção pelo operador.")}</p>
                <ul className="text-sm space-y-1">
                  <li className="flex items-center gap-2"><span className="text-amber-600">✏️</span> <strong>{tx("Taxa de Escolarização")}</strong>: Dados disponíveis via Censo Escolar (coleta manual)</li>
                  <li className="flex items-center gap-2"><span className="text-amber-600">✏️</span> <strong>{tx("Indicadores locais")}</strong>: Saneamento, segurança, acessibilidade e demais indicadores que dependem de levantamento de campo</li>
                </ul>
              </div>
            </div>

            <Alert className="border-blue-500/50 bg-blue-50/50 dark:bg-blue-950/20">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertTitle className="text-blue-700 dark:text-blue-400">
                {tx("Sobre o CADASTUR")}
              </AlertTitle>
              <AlertDescription className="text-blue-600 dark:text-blue-300">
                {tx("A API transacional do CADASTUR é")} <strong>{tx("restrita a órgãos públicos federais")}</strong>, mas o SISTUR aproveita os <strong>{tx("datasets oficiais abertos")}</strong> {tx("publicados em dados.gov.br para ingestão periódica de guias e agências. Quando o arquivo do trimestre não está acessível ou não contém o município consultado, o indicador permanece fora do pré-preenchimento automático.")}
              </AlertDescription>
            </Alert>

            <div className="rounded-xl border bg-muted/30 p-5 space-y-3">
              <h4 className="font-semibold">{tx("Resumo: 8 Fontes Oficiais Integradas")}</h4>
              <p className="text-sm text-muted-foreground">
                {tx("O SISTUR consulta automaticamente")} <strong>{tx("8 fontes oficiais")}</strong> {tx("para pré-preencher mais de 25 indicadores: IBGE Agregados, IBGE SIDRA (Censo), IBGE Pesquisas, DATASUS, INEP, STN/Tesouro Nacional, CADASTUR (datasets abertos), Mapa do Turismo Brasileiro (API REST do MTur) e ANA/Hidroweb (Qualiágua) para o IQA municipal. Indicadores que não possuem API pública (como taxa de escolarização e dados de levantamento local) são preenchidos manualmente pelo operador do diagnóstico, sempre com confirmação humana antes do cálculo.")}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Knowledge Base & Global References */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              {tx("Base de Conhecimento e Referências Globais")}
            </CardTitle>
            <CardDescription>
              {tx("Documentos de apoio que enriquecem diagnósticos e relatórios")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <p>
                {tx("O SISTUR permite o upload de")} <strong>{tx("documentos de referência")}</strong> {tx("que são utilizados automaticamente pela IA na geração de relatórios e na contextualização dos diagnósticos. Existem dois níveis de documentos:")}
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="rounded-xl border-2 border-blue-500 bg-blue-50 dark:bg-blue-950/30 p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <Badge className="bg-blue-600 text-white">{tx("Por Destino")}</Badge>
                  <h4 className="font-semibold">{tx("Base de Conhecimento")}</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  {tx("Documentos específicos de cada destino: planos diretores, legislação municipal, pesquisas locais, dados socioeconômicos. Associados a destinos e usados automaticamente nos diagnósticos daquele município.")}
                </p>
                <ul className="text-sm space-y-1">
                  <li className="flex items-center gap-2"><span className="text-blue-600">📄</span> {tx("PDF, DOCX, XLSX, CSV, TXT (até 20MB)")}</li>
                  <li className="flex items-center gap-2"><span className="text-blue-600">🤖</span> {tx("Moderação automática por IA antes do upload")}</li>
                  <li className="flex items-center gap-2"><span className="text-blue-600">🏷️</span> {tx("8 categorias: Plano Diretor, Legislação, Pesquisa, etc.")}</li>
                </ul>
              </div>

              <div className="rounded-xl border-2 border-purple-500 bg-purple-50 dark:bg-purple-950/30 p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <Badge className="bg-purple-600 text-white">{tx("Global")}</Badge>
                  <h4 className="font-semibold">{tx("Referências Globais")}</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  {tx("Documentos de referência nacional (PNT, legislação federal, diretrizes do Ministério do Turismo) usados pelo Professor Beni e pelos relatórios. Cada documento tem um resumo executivo e é fatiado em trechos por página: ao responder ou gerar um relatório, a IA busca apenas os trechos mais relevantes (mínimo de 45% de relevância) e cita documento e página. Gerenciados exclusivamente por administradores no menu Inteligência › Referências.")}
                </p>
                <ul className="text-sm space-y-1">
                  <li className="flex items-center gap-2"><span className="text-purple-600">🏛️</span> {tx("PNT 2024-2027 como referência padrão")}</li>
                  <li className="flex items-center gap-2"><span className="text-purple-600">📋</span> {tx("Contextualiza indicadores com metas nacionais")}</li>
                  <li className="flex items-center gap-2"><span className="text-purple-600">🔎</span> {tx("Busca por trechos com citação de documento e página")}</li>
                  <li className="flex items-center gap-2"><span className="text-purple-600">🔒</span> {tx("Somente admins podem adicionar/remover")}</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Report Customization */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              {tx("Personalização de Relatórios")}
            </CardTitle>
            <CardDescription>
              {tx("Relatórios profissionais com identidade visual da organização")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <p>
                {tx("Os relatórios gerados pelo SISTUR podem ser personalizados com a identidade visual da organização. As configurações incluem:")}
              </p>
              <ul>
                <li><strong>{tx("Logo da organização")}</strong> {tx("— exibido no topo do relatório")}</li>
                <li><strong>{tx("Cabeçalho e rodapé")}</strong> {tx("— textos customizáveis para identificação institucional")}</li>
                <li><strong>{tx("Cor primária")}</strong> {tx("— aplicada em títulos, destaques e bordas")}</li>
                <li><strong>{tx("Tamanho de fonte")}</strong> {tx("— pequeno, médio ou grande para adequar à audiência")}</li>
                <li><strong>{tx("Notas adicionais")}</strong> {tx("— bloco final com observações ou disclaimers")}</li>
              </ul>
              <p>
                {tx("Cada relatório pode ter")} <strong>{tx("visibilidade pessoal")}</strong> (apenas o criador vê) ou 
                <strong> {tx("organizacional")}</strong> (compartilhado com toda a organização). Administradores podem 
                gerar relatórios no ambiente Demo para demonstrações.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Tipos de Relatório */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              {tx("Tipos de Relatório")}
            </CardTitle>
            <CardDescription>
              {tx("Diferenças entre Completo, Executivo e Investidores")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <p>
                {tx("O SISTUR gera três templates distintos a partir do mesmo diagnóstico validado. Todos compartilham a mesma base de dados auditados (")}<code>{tx("assessment_indicator_audit")}</code>), a política <strong>{tx("Zero Alucinação")}</strong> {tx("e o pipeline de validação cruzada, mas diferem em público-alvo, tamanho, estrutura e tom.")}
              </p>

              <h4>{tx("📘 Completo (técnico-acadêmico)")}</h4>
              <ul>
                <li><strong>{tx("Público:")}</strong> {tx("equipe técnica e gestores públicos.")}</li>
                <li><strong>{tx("Tamanho:")}</strong> {tx("mínimo de 2.500 palavras.")}</li>
                <li><strong>{tx("Norma:")}</strong> {tx("integral MEC/ABNT (NBR 14724, 6024, 6023, 6028, 10520).")}</li>
                <li><strong>Estrutura (12 seções):</strong> {tx("Resumo + palavras-chave, Introdução, Contextualização do município, Metodologia, Análise por pilar (RA/OE/AO), Indicadores críticos, Recomendações, Plano de ação, Conclusão e Referências.")}</li>
                <li><strong>{tx("Tom:")}</strong> {tx("técnico, fundamentado, com citações diretas a Beni (1997/2007), IGMA, IBGE, MTur, IGMA-IBT e demais fontes oficiais.")}</li>
              </ul>

              <h4>{tx("📗 Executivo (síntese para tomada de decisão)")}</h4>
              <ul>
                <li><strong>{tx("Público:")}</strong> {tx("alta gestão, secretários, prefeitos, comitês gestores.")}</li>
                <li><strong>{tx("Tamanho:")}</strong> {tx("800–1.200 palavras.")}</li>
                <li><strong>Estrutura (5 blocos):</strong> {tx("Sumário executivo, Diagnóstico consolidado por pilar, Top 5 indicadores críticos, Recomendações priorizadas e Próximos passos.")}</li>
                <li><strong>{tx("Tom:")}</strong> {tx("direto, orientado a decisão, com destaque para riscos e oportunidades. Reduz citações acadêmicas, mantém apenas o essencial para legitimidade.")}</li>
              </ul>

              <h4>{tx("📙 Investidores (atratividade econômica)")}</h4>
              <ul>
                <li><strong>{tx("Público:")}</strong> {tx("investidores, fundos, parceiros privados e captação.")}</li>
                <li><strong>{tx("Tamanho:")}</strong> {tx("1.200–1.800 palavras.")}</li>
                <li><strong>{tx("Estrutura:")}</strong> {tx("Tese de investimento, Contexto de mercado, Indicadores de atratividade, Riscos e mitigadores, Oportunidades de aporte, Indicadores de retorno esperado e Pipeline de projetos correlatos.")}</li>
                <li><strong>{tx("Tom:")}</strong> profissional-financeiro, com valores monetários no padrão
                  BRL canônico (R$), foco em ROI, demanda turística, capacidade instalada e
                  evidências de viabilidade. <strong>{tx("Não inclui")}</strong> {tx("recomendações pedagógicas nem detalhamento metodológico extenso.")}</li>
              </ul>

              <h4>{tx("Variante Empresarial")}</h4>
              <p>
                {tx("Cada um dos três templates possui versão")} <strong>{tx("Empresarial")}</strong> {tx("— acionada quando o diagnóstico é de empreendimento (não destino). Substitui os eixos territoriais (RA/OE/AO) por categorias funcionais (governança, ESG, satisfação do hóspede, ocupação) e troca o foco territorial por KPIs de negócio e ROI.")}
              </p>

              <h4>{tx("Garantias comuns aos três templates")}</h4>
              <ul>
                <li>{tx("Política")} <strong>{tx("Zero Alucinação")}</strong>: sem invenção de números, anos ou fontes.</li>
                <li>{tx("Auto-correção determinística contra")} <code>{tx("assessment_indicator_audit")}</code> (divergência &gt; 5%).</li>
                <li>{tx("Validação por agente IA (gemini-2.5-pro) sobre o texto pós-correção.")}</li>
                <li>{tx("Banner de validação cruzada sempre exibido (limpo, com avisos ou auto-corrigido).")}</li>
                <li>{tx("Persistência do relatório de validação em")} <code>{tx("report_validations")}</code>.</li>
                <li>{tx("Status canônico (CRÍTICO/ATENÇÃO/ADEQUADO/FORTE/EXCELENTE) e padrão BRL.")}</li>
              </ul>

              <h4>{tx("Pipeline de geração — providers, fila e streaming")}</h4>
              <p>
                {tx("A geração não depende de um único modelo. O orquestrador tenta os provedores na ordem")} <strong>{tx("Claude Sonnet 4.5")}</strong> →{' '}
                <strong>{tx("GPT-5")}</strong> → <strong>{tx("Gemini 2.5 Pro")}</strong>{tx(". Se qualquer chamada falhar (timeout, abort, conteúdo vazio mid-stream ou erro de stream parcial), o trail é registrado e o próximo provedor da ordem é acionado automaticamente, mantendo o mesmo prompt e dados auditados — a regra de fallback é")} <strong>{tx("global")}</strong> (nunca mistura textos de
                provedores diferentes em um mesmo relatório).
              </p>
              <p>
                {tx("No template")} <strong>{tx("Completo")}</strong>, o pipeline roda em duas fases:
                <strong> {tx("Fase 1")}</strong> dispara três chamadas paralelas (uma por pilar
                I-RA, I-OE, I-AO), cada uma restrita ao seu escopo; <strong>{tx("Fase 2")}</strong>
                {tx("gera o envelope (introdução, ficha técnica, metodologia, alertas IGMA, análise integrada, gargalos, benchmarks, prognóstico, banco de ações, fontes, considerações finais, referências, glossário, apêndice) recebendo os textos dos pilares como contexto de leitura para garantir")}
                <strong> {tx("coerência narrativa")}</strong>{tx(". Para Claude, o orçamento de")}
                <code>{tx("max_tokens")}</code> {tx("e a janela de contexto são calibrados dinamicamente por tier (essencial / estratégico / integral), template e quantidade real de indicadores, evitando tanto respostas truncadas em diagnósticos integrais quanto reservas excessivas em diagnósticos pequenos. Templates Executivo e Investidor mantêm pipeline monolítico (estrutura curta sem subseções por pilar).")}
              </p>
              <p>
                {tx("Para resistir a timeouts do proxy em gerações longas, o pedido é enfileirado em")} <code>{tx("report_jobs")}</code> {tx("e processado por um worker dedicado (")}<code>{tx("process-report-job")}</code>) acionado por trigger de banco. O cliente recebe o <code>{tx("jobId")}</code> {tx("imediatamente (HTTP 202) e faz polling. Mesmo se o usuário fechar a aba ou navegar para outra página, o")} <code>{tx("useReportJobWatcher")}</code> {tx("global mantém o acompanhamento via")} <code>{tx("localStorage")}</code> {tx("e dispara toast + Notification do navegador quando o relatório fica pronto.")}
              </p>
              <p>
                {tx("Durante a geração, o card \"Plano de Desenvolvimento\" exibe")}
                <strong> {tx("pré-visualização ao vivo")}</strong>: a edge function persiste progressivamente o markdown acumulado em
                <code>{tx("report_jobs.partial_content")}</code> {tx("a cada subseção concluída (RA → OE → AO → envelope), e a tela renderiza esse conteúdo parcial em tempo real, com barra de progresso e badge animado. Quando o job completa, troca-se naturalmente para o conteúdo final persistido em")}
                <code>{tx("generated_reports")}</code> {tx("— sem flicker. PDF e DOCX só são liberados após a persistência final (não exporta versões inacabadas).")}
              </p>

              <h4>{tx("Observabilidade e auditoria")}</h4>
              <ul>
                <li>
                  {tx("Todos os eventos do pipeline são gravados em")}
                  <code> {tx("report_generation_logs")}</code> (RLS apenas ADMIN) com
                  <code> {tx("provider")}</code>, <code>{tx("model")}</code>, <code>{tx("trace_id")}</code>,
                  <code> {tx("job_id")}</code>, <code>{tx("report_id")}</code>,
                  <code> {tx("duration_ms")}</code>, <code>{tx("stage")}</code> e
                  <code> {tx("metadata")}</code>{tx(". Stages explícitos (")}<code>{tx("provider_selected")}</code>, <code>{tx("provider_failed")}</code>,
                  <code> {tx("phase1_pillars_start")}</code>, <code>{tx("claude_budget_pillar")}</code>,
                  <code> {tx("phase2_envelope_done")}</code>,
                  <code> {tx("validation_agent_done")}</code>, <code>{tx("persist_inserted")}</code>,
                  <code> {tx("stream_closed_ok")}</code>) cobrem cada tentativa de Claude / GPT-5 / Gemini, permitindo auditar quando e por que o fallback foi acionado.
                </li>
                <li>
                  {tx("Painel administrativo em")} <code>{tx("/admin/report-logs")}</code> {tx("exibe os logs com filtros por provider, busca livre, dialog de detalhes e auto-refresh a 15s, além do bloco \"Pipeline Claude — Tempo Real\" com as 4 fases mapeadas (Pilares, Envelope, Validação, Persistência) e barra de progresso geral.")}
                </li>
                <li>
                  {tx("Os campos")} <code>{tx("ai_provider")}</code> e <code>{tx("ai_model")}</code> em
                  <code> {tx("generated_reports")}</code> registram em qual modelo cada
                  relatório foi efetivamente gerado; o histórico exibe um badge
                  com essa informação para administradores.
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* References */}
        <Card>
          <CardHeader>
            <CardTitle>{tx("Inteligência de Receita e Cenários")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p><strong>{tx("Precificação dinâmica:")}</strong> a diária sugerida parte da diária média do mês e é ajustada pela distância entre a ocupação real e a meta, pelo número de eventos e pela diária de mercado informada. A variação respeita o limite mensal, o piso e o teto. Elasticidade simplificada: cada +1% no preço reduz 0,3% da ocupação. RevPAR = diária × ocupação. É apenas sugestão; nenhum sistema externo é alterado. A justificativa por IA é opcional e só explica o cálculo.</p>
            <p><strong>{tx("LTV do hóspede:")}</strong> {tx("gasto por estadia × estadias por ano × anos de relacionamento × margem. CAC sugerido pela comissão média ponderada dos canais. LTV/CAC abaixo de 3 indica aquisição cara.")}</p>
            <p><strong>{tx("ROI de projeto:")}</strong> ROI = (retorno anual − investimento) ÷ investimento; payback = investimento ÷ retorno anual. Investimento vem do orçamento do projeto.</p>
            <p><strong>{tx("Gêmeo Digital:")}</strong> projeção de 1 a 5 anos dos pilares RA, OE e AO a partir de alavancas. Regras sistêmicas: com RA abaixo de 34%, ganhos em AO caem pela metade; com OE abaixo de 34%, todos os ganhos caem 30%. Resultados limitados entre 0% e 100%. Cenários são projeções, não previsões.</p>
            <p><strong>{tx("Geomarketing:")}</strong> {tx("mapa do destino com raio de influência, concorrentes (intensidade pelo número de avaliações), unidades da rede, eventos, demanda aérea (ANAC) e origem dos visitantes informada. Não há ranking entre municípios.")}</p>
            <p>{tx("Disponível nos planos Pro e Enterprise e durante o teste.")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5 text-primary" />
              {tx("Referências")}
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <ul>
              <li>
                <strong>{tx("BENI, Mario Carlos.")}</strong> {tx("Análise Estrutural do Turismo. São Paulo: Editora Senac São Paulo, 2001.")}
              </li>
              <li>
                <strong>{tx("BENI, Mario Carlos.")}</strong> {tx("Globalização do Turismo: Megatendências do Setor e a Realidade Brasileira. São Paulo: Aleph, 2003.")}
              </li>
              <li>
                <strong>{tx("BENI, Mario Carlos.")}</strong> {tx("Política e Planejamento de Turismo no Brasil. São Paulo: Aleph, 2006.")}
              </li>
              <li>
                <strong>{tx("IBGE.")}</strong> {tx("API de Agregados — Pesquisas Municipais (Censo 2022, PIB, etc.). Disponível em: servicodados.ibge.gov.br/api/v3/agregados")}
              </li>
              <li>
                <strong>{tx("IBGE.")}</strong> {tx("API SIDRA — Sistema IBGE de Recuperação Automática (Censo 2010, tabela 3217 — saneamento). Disponível em: apisidra.ibge.gov.br")}
              </li>
              <li>
                <strong>{tx("IBGE.")}</strong> {tx("API SIDRA / Agregados — População estimada anual (tabela 6579, variável 9324) e PIB municipal a preços correntes (tabela 5938, variáveis 37 PIB total e 39 PIB per capita). Usadas pelo Observatório para enriquecimento socioeconômico automático por município. Disponível em: servicodados.ibge.gov.br/api/v3/agregados")}
              </li>
              <li>
                <strong>{tx("IBGE.")}</strong> {tx("API de Pesquisas Municipais — IDH, Gini, Hospedagem, Finanças. Disponível em: servicodados.ibge.gov.br/api/v1/pesquisas")}
              </li>
              <li>
                <strong>{tx("DATASUS.")}</strong> {tx("Indicadores de Saúde — Leitos hospitalares, mortalidade infantil, mortalidade geral. Disponível em: datasus.saude.gov.br (via IBGE Pesquisas)")}
              </li>
              <li>
                <strong>{tx("INEP.")}</strong> {tx("IDEB — Índice de Desenvolvimento da Educação Básica. Disponível em: inep.gov.br (via IBGE Pesquisas)")}
              </li>
              <li>
                <strong>{tx("Secretaria do Tesouro Nacional (STN).")}</strong> {tx("Finanças Municipais — Receita própria, Despesa com turismo. Disponível em: tesouro.fazenda.gov.br (via IBGE Pesquisas)")}
              </li>
              <li>
                <strong>{tx("Ministério do Turismo.")}</strong> {tx("CADASTUR — Cadastro de Prestadores de Serviços Turísticos (dados abertos). Disponível em: dados.gov.br")}
              </li>
              <li>
                <strong>{tx("Ministério do Turismo.")}</strong> {tx("Plano Nacional de Turismo 2024-2027. Disponível em: gov.br/turismo")}
              </li>
              <li>
                <strong>{tx("Ministério do Turismo.")}</strong> {tx("Mapa do Turismo Brasileiro — API REST de Regionalização. Disponível em: mapa.turismo.gov.br")}
              </li>
              <li>
                <strong>{tx("Ministério do Trabalho e Emprego (MTE).")}</strong> {tx("Novo CAGED — Estatísticas mensais de admissões e desligamentos formais (CNAEs do turismo). Usado pelo Observatório como base anual via IGMA, com baseline mensal estimado (valor anual ÷ 12) quando não há série mensal carregada. Disponível em: gov.br/trabalho-e-emprego/pt-br/assuntos/estatisticas-trabalho/novo-caged")}
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
    </>
  );
}
