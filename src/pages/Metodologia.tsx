import { AppLayout } from '@/components/layout/AppLayout';
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
  Scale
} from 'lucide-react';
import { InteractiveWorkflowDiagram } from '@/components/tools/InteractiveWorkflowDiagram';

const pillars = [
  {
    id: 'RA',
    name: 'Relações Ambientais',
    abbrev: 'RA / IRA',
    description: 'Base do sistema turístico. Engloba recursos naturais, patrimônio cultural, qualidade ambiental e sustentabilidade.',
    color: 'bg-emerald-500',
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
    description: 'Infraestrutura de apoio ao turismo. Depende da estabilidade ambiental para expansão sustentável.',
    color: 'bg-blue-500',
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
    description: 'Governança central do sistema. Operações, serviços e coordenação entre os agentes do turismo.',
    color: 'bg-amber-500',
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
    color: 'bg-teal-500',
    borderColor: 'border-teal-500',
    bgColor: 'bg-teal-50 dark:bg-teal-950/30',
    indicatorCount: '~9',
    timeToComplete: '30-45 min',
    description: 'Diagnóstico rápido focado nos indicadores mais críticos para uma visão geral do destino.',
    targetAudience: 'Gestores municipais com pouco tempo ou destinos iniciando no SISTUR',
    useCases: [
      'Primeira avaliação de um destino',
      'Avaliações rápidas trimestrais',
      'Municípios com equipe técnica reduzida',
      'Comparação inicial entre destinos'
    ],
    outputs: [
      'Score geral por pilar (RA, OE, AO)',
      'Identificação de pilares críticos',
      'Alertas IGMA básicos',
      'Recomendações prioritárias'
    ],
    benefits: [
      'Implementação rápida',
      'Baixo custo de coleta',
      'Visão macro do destino',
      'Ideal para começar'
    ],
    limitations: [
      'Análise menos granular',
      'Menos prescrições específicas',
      'Sem detalhamento de subindicadores'
    ]
  },
  {
    id: 'MEDIUM',
    name: 'Estratégico',
    icon: Gauge,
    color: 'bg-violet-500',
    borderColor: 'border-violet-500',
    bgColor: 'bg-violet-50 dark:bg-violet-950/30',
    indicatorCount: '~19',
    timeToComplete: '2-3 horas',
    description: 'Diagnóstico intermediário com indicadores estratégicos para planejamento de médio prazo.',
    targetAudience: 'Secretarias de Turismo estruturadas, destinos em desenvolvimento',
    useCases: [
      'Planejamento anual do turismo',
      'Elaboração de planos diretores',
      'Captação de recursos e editais',
      'Monitoramento de políticas públicas'
    ],
    outputs: [
      'Tudo do Essencial +',
      'Análise de tendências por indicador',
      'Mapeamento de gargalos específicos',
      'Prescrições de capacitação direcionadas',
      'Relatório para captação de recursos'
    ],
    benefits: [
      'Equilíbrio custo-benefício',
      'Profundidade adequada para gestão',
      'Suporte a decisões estratégicas',
      'Compatível com prazos de editais'
    ],
    limitations: [
      'Requer mais tempo de coleta',
      'Algumas áreas sem cobertura total'
    ]
  },
  {
    id: 'COMPLETE',
    name: 'Integral',
    icon: Target,
    color: 'bg-rose-500',
    borderColor: 'border-rose-500',
    bgColor: 'bg-rose-50 dark:bg-rose-950/30',
    indicatorCount: '100+',
    timeToComplete: '1-2 semanas',
    description: 'Diagnóstico completo com todos os indicadores para análise profunda e projetos de grande porte.',
    targetAudience: 'Destinos maduros, projetos de financiamento, estudos acadêmicos',
    useCases: [
      'Projetos de grande investimento',
      'Masterplans de turismo',
      'Estudos de impacto territorial',
      'Certificações de destino',
      'Pesquisas acadêmicas'
    ],
    outputs: [
      'Tudo do Estratégico +',
      'Análise intersetorial completa',
      'Cruzamento de todos os indicadores',
      'Simulações de cenários',
      'Relatório técnico detalhado',
      'Trilhas de capacitação personalizadas'
    ],
    benefits: [
      'Máxima precisão diagnóstica',
      'Visão 360° do destino',
      'Suporte a projetos complexos',
      'Base para certificações'
    ],
    limitations: [
      'Alto investimento de tempo',
      'Requer equipe multidisciplinar',
      'Coleta de dados pode ser complexa'
    ]
  }
];

const tierComparison = [
  { feature: 'Indicadores analisados', essencial: '~9', estrategico: '~19', integral: '100+' },
  { feature: 'Tempo de preenchimento', essencial: '30-45 min', estrategico: '2-3 horas', integral: '1-2 semanas' },
  { feature: 'Alertas IGMA', essencial: 'Básicos', estrategico: 'Detalhados', integral: 'Completos' },
  { feature: 'Prescrições de capacitação', essencial: 'Prioritárias', estrategico: 'Direcionadas', integral: 'Personalizadas' },
  { feature: 'Análise de tendências', essencial: '—', estrategico: '✓', integral: '✓' },
  { feature: 'Simulação de cenários', essencial: '—', estrategico: '—', integral: '✓' },
  { feature: 'Relatório para captação', essencial: 'Simplificado', estrategico: 'Completo', integral: 'Técnico' },
  { feature: 'Suporte a certificações', essencial: '—', estrategico: 'Parcial', integral: '✓' },
];

const rules = [
  {
    id: 1,
    name: 'Prioridade RA',
    icon: Leaf,
    flag: 'RA_LIMITATION',
    color: 'bg-emerald-500',
    description: 'Limitações ambientais bloqueiam expansão estrutural',
    detail: 'Se o pilar RA (Relações Ambientais) está crítico, o sistema bloqueia capacitações e investimentos em OE (infraestrutura). Não adianta construir hotéis se o ambiente está degradado.',
    trigger: 'RA = CRÍTICO',
    effect: 'EDU_OE bloqueado',
    example: 'Praia poluída → Não expandir rede hoteleira'
  },
  {
    id: 2,
    name: 'Ciclo Contínuo',
    icon: Calendar,
    flag: 'CONTINUOUS_CYCLE',
    color: 'bg-purple-500',
    description: 'Revisões programadas baseadas na severidade',
    detail: 'O sistema calcula automaticamente quando o diagnóstico deve ser revisado. Pilares críticos exigem revisão em 6 meses, atenção em 12 meses, e todos adequados em 18 meses.',
    trigger: 'Severidade dos pilares',
    effect: 'next_review_recommended_at',
    example: 'Crítico → Revisar em 6 meses'
  },
  {
    id: 3,
    name: 'Externalidades Negativas',
    icon: TrendingUp,
    flag: 'EXTERNALITY_WARNING',
    color: 'bg-red-500',
    description: 'Alerta quando OE melhora às custas de RA',
    detail: 'Detecta crescimento estrutural que degrada o ambiente. Se OE evoluiu (melhorou) entre ciclos mas RA regrediu (piorou), o sistema gera alerta de externalidade negativa.',
    trigger: 'OE↑ enquanto RA↓',
    effect: 'Alerta de externalidade',
    example: 'Mais hotéis, mais poluição → Alerta'
  },
  {
    id: 4,
    name: 'Governança Central',
    icon: ShieldAlert,
    flag: 'GOVERNANCE_BLOCK',
    color: 'bg-amber-500',
    description: 'AO crítico bloqueia todo o sistema',
    detail: 'Se o pilar AO (governança/operações) está crítico, não há capacidade de gestão para implementar melhorias. O sistema bloqueia expansão de OE até a governança melhorar.',
    trigger: 'AO = CRÍTICO',
    effect: 'EDU_OE bloqueado',
    example: 'Sem gestão → Não investir em infraestrutura'
  },
  {
    id: 5,
    name: 'Marketing Bloqueado',
    icon: Megaphone,
    flag: 'MARKETING_BLOCKED',
    color: 'bg-rose-500',
    description: 'Promoção bloqueada se RA ou AO críticos',
    detail: 'Promover um destino com problemas ambientais graves ou falhas operacionais sérias pode gerar danos à reputação e frustrar turistas. Marketing só é liberado quando pilares essenciais estão saudáveis.',
    trigger: 'RA = CRÍTICO ou AO = CRÍTICO',
    effect: 'MARKETING bloqueado',
    example: 'Ambiente degradado → Não promover destino'
  },
  {
    id: 6,
    name: 'Interdependência Setorial',
    icon: Network,
    flag: 'INTERSECTORAL_DEPENDENCY',
    color: 'bg-indigo-500',
    description: 'Identifica indicadores que dependem de múltiplos setores',
    detail: 'Alguns indicadores (saúde, educação, saneamento) dependem de ações coordenadas entre secretarias. O sistema sinaliza quando a melhoria requer articulação intersetorial, não apenas ações isoladas do turismo.',
    trigger: 'Indicador intersetorial presente',
    effect: 'Sinalização de dependência',
    example: 'IDEB baixo → Requer articulação com Educação'
  }
];

export default function Metodologia() {
  return (
    <AppLayout
      title="Metodologia Mario Beni"
      subtitle="Princípios sistêmicos do turismo sustentável"
    >
      <div className="space-y-8">
        {/* Introduction */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              Fundamentação Teórica
            </CardTitle>
            <CardDescription>
              O SISTUR é baseado na teoria sistêmica do turismo do Prof. Mario Carlos Beni
            </CardDescription>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <p>
              O <strong>Sistema de Inteligência Territorial para o Turismo (SISTUR)</strong> implementa 
              os princípios da <strong>Análise Estrutural do Turismo</strong> desenvolvida pelo Prof. Mario Carlos Beni. 
              A teoria estabelece que o turismo é um sistema aberto, composto por subsistemas interdependentes 
              que devem ser analisados de forma holística.
            </p>
            <p>
              O <strong>Motor IGMA</strong> (Intelligence for Governance, Management and Action) é o núcleo 
              do sistema que aplica automaticamente 6 regras derivadas dessa teoria, garantindo que as 
              decisões respeitem a lógica sistêmica do turismo.
            </p>
          </CardContent>
        </Card>

        {/* Three Pillars */}
        <Card>
          <CardHeader>
            <CardTitle>Os Três Pilares do Sistema Turístico</CardTitle>
            <CardDescription>
              Hierarquia de prioridades: RA → OE → AO
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
                      Prioridade {pillar.priority}
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
                RA é a Base do Sistema
              </AlertTitle>
              <AlertDescription className="text-emerald-600 dark:text-emerald-300">
                Segundo Mario Beni, sem um ambiente saudável e recursos naturais preservados, 
                não há turismo sustentável. Por isso, RA sempre tem prioridade sobre os demais pilares.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Diagnostic Tiers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-primary" />
              Os 3 Níveis de Diagnóstico
            </CardTitle>
            <CardDescription>
              Escolha o nível adequado à sua realidade e objetivos
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
                        {tier.indicatorCount} indicadores
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
                        Público-alvo
                      </div>
                      <p className="text-sm text-muted-foreground">{tier.targetAudience}</p>
                    </div>
                    
                    <div>
                      <div className="flex items-center gap-2 text-sm font-medium mb-2">
                        <Lightbulb className="h-4 w-4 text-primary" />
                        Casos de uso
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
                O que cada nível entrega
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
                        Outputs / Relatórios
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
                        Benefícios
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
                        Limitações
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
                Tabela Comparativa
              </h4>
              
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium">Funcionalidade</th>
                      <th className="text-center py-3 px-4 font-medium">
                        <div className="flex items-center justify-center gap-2">
                          <Zap className="h-4 w-4 text-teal-500" />
                          Essencial
                        </div>
                      </th>
                      <th className="text-center py-3 px-4 font-medium">
                        <div className="flex items-center justify-center gap-2">
                          <Gauge className="h-4 w-4 text-violet-500" />
                          Estratégico
                        </div>
                      </th>
                      <th className="text-center py-3 px-4 font-medium">
                        <div className="flex items-center justify-center gap-2">
                          <Target className="h-4 w-4 text-rose-500" />
                          Integral
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
              <AlertTitle>Qual nível escolher?</AlertTitle>
              <AlertDescription className="space-y-2">
                <p>
                  <strong>Comece pelo Essencial</strong> se é seu primeiro diagnóstico ou se precisa de resultados rápidos. 
                  Use o <strong>Estratégico</strong> para planejamento anual ou captação de recursos. 
                  Reserve o <strong>Integral</strong> para projetos de grande porte ou certificações de destino.
                </p>
                <p className="text-muted-foreground">
                  Você pode evoluir o nível do diagnóstico a qualquer momento, adicionando mais indicadores conforme a maturidade do destino aumenta.
                </p>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Six Rules */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-primary" />
              As 6 Regras do Motor IGMA
            </CardTitle>
            <CardDescription>
              Regras determinísticas aplicadas automaticamente a cada diagnóstico
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
                          Regra {rule.id}: {rule.name}
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
                      <p className="text-xs text-muted-foreground mb-1">Gatilho</p>
                      <p className="text-sm font-mono font-medium">{rule.trigger}</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground mb-1">Efeito</p>
                      <p className="text-sm font-mono font-medium">{rule.effect}</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground mb-1">Exemplo</p>
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
            <CardTitle>Diagrama de Interações</CardTitle>
            <CardDescription>
              Como as regras se conectam e afetam o sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Decision Flow */}
            <div className="bg-muted/30 rounded-xl p-6 space-y-6">
              <h4 className="font-semibold text-center">Fluxo de Decisão do Motor IGMA</h4>
              
              <div className="flex flex-col items-center gap-4">
                {/* Start */}
                <div className="bg-primary text-primary-foreground px-6 py-3 rounded-full font-medium">
                  Diagnóstico Calculado
                </div>
                <ArrowDown className="h-6 w-6 text-muted-foreground" />
                
                {/* Check RA */}
                <div className="bg-emerald-100 dark:bg-emerald-900/30 border-2 border-emerald-500 rounded-xl p-4 w-full max-w-md text-center">
                  <p className="font-medium">RA está Crítico?</p>
                </div>
                
                <div className="flex items-center gap-8 w-full max-w-lg justify-center">
                  <div className="flex flex-col items-center gap-2">
                    <Badge className="bg-red-500">Sim</Badge>
                    <ArrowDown className="h-4 w-4 text-red-500" />
                    <div className="flex items-center gap-2 text-sm bg-red-50 dark:bg-red-950/30 p-3 rounded-lg border border-red-200">
                      <XCircle className="h-4 w-4 text-red-500" />
                      <span>Bloqueia EDU_OE + Marketing</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <Badge className="bg-green-500">Não</Badge>
                    <ArrowDown className="h-4 w-4 text-green-500" />
                    <div className="flex items-center gap-2 text-sm bg-green-50 dark:bg-green-950/30 p-3 rounded-lg border border-green-200">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Continua verificação</span>
                    </div>
                  </div>
                </div>

                <ArrowDown className="h-6 w-6 text-muted-foreground" />

                {/* Check AO */}
                <div className="bg-amber-100 dark:bg-amber-900/30 border-2 border-amber-500 rounded-xl p-4 w-full max-w-md text-center">
                  <p className="font-medium">AO está Crítico?</p>
                </div>
                
                <div className="flex items-center gap-8 w-full max-w-lg justify-center">
                  <div className="flex flex-col items-center gap-2">
                    <Badge className="bg-red-500">Sim</Badge>
                    <ArrowDown className="h-4 w-4 text-red-500" />
                    <div className="flex items-center gap-2 text-sm bg-red-50 dark:bg-red-950/30 p-3 rounded-lg border border-red-200">
                      <XCircle className="h-4 w-4 text-red-500" />
                      <span>Bloqueia EDU_OE + Marketing</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <Badge className="bg-green-500">Não</Badge>
                    <ArrowDown className="h-4 w-4 text-green-500" />
                    <div className="flex items-center gap-2 text-sm bg-green-50 dark:bg-green-950/30 p-3 rounded-lg border border-green-200">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Libera todas as ações</span>
                    </div>
                  </div>
                </div>

                <ArrowDown className="h-6 w-6 text-muted-foreground" />

                {/* Calculate Review */}
                <div className="bg-purple-100 dark:bg-purple-900/30 border-2 border-purple-500 rounded-xl p-4 w-full max-w-md text-center">
                  <p className="font-medium">Calcula Próxima Revisão</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Crítico=6m | Atenção=12m | Adequado=18m
                  </p>
                </div>

                <ArrowDown className="h-6 w-6 text-muted-foreground" />

                {/* End */}
                <div className="bg-primary text-primary-foreground px-6 py-3 rounded-full font-medium">
                  Alertas IGMA Gerados
                </div>
              </div>
            </div>

            {/* Allowed vs Blocked */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-green-50 dark:bg-green-950/20 rounded-xl p-5 border border-green-200 dark:border-green-900">
                <h4 className="font-semibold flex items-center gap-2 mb-3 text-green-700 dark:text-green-400">
                  <CheckCircle className="h-5 w-5" />
                  Ações Permitidas (quando pilares saudáveis)
                </h4>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-emerald-100">EDU_RA</Badge>
                    Capacitações em Relações Ambientais
                  </li>
                  <li className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-blue-100">EDU_OE</Badge>
                    Capacitações em Organização Estrutural
                  </li>
                  <li className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-amber-100">EDU_AO</Badge>
                    Capacitações em Ações Operacionais
                  </li>
                  <li className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-rose-100">MARKETING</Badge>
                    Promoção e marketing do destino
                  </li>
                </ul>
              </div>

              <div className="bg-red-50 dark:bg-red-950/20 rounded-xl p-5 border border-red-200 dark:border-red-900">
                <h4 className="font-semibold flex items-center gap-2 mb-3 text-red-700 dark:text-red-400">
                  <XCircle className="h-5 w-5" />
                  Bloqueios (quando pilares críticos)
                </h4>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <Badge variant="destructive" className="shrink-0">RA Crítico</Badge>
                    <span>Bloqueia EDU_OE e MARKETING</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Badge variant="destructive" className="shrink-0">AO Crítico</Badge>
                    <span>Bloqueia EDU_OE e MARKETING</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Badge className="bg-amber-500 shrink-0">Externalidade</Badge>
                    <span>Gera alerta, recomenda revisão de OE</span>
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Workflow Diagram */}
        <InteractiveWorkflowDiagram />

        {/* References */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5 text-primary" />
              Referências
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <ul>
              <li>
                <strong>BENI, Mario Carlos.</strong> Análise Estrutural do Turismo. 
                São Paulo: Editora Senac São Paulo, 2001.
              </li>
              <li>
                <strong>BENI, Mario Carlos.</strong> Globalização do Turismo: 
                Megatendências do Setor e a Realidade Brasileira. São Paulo: Aleph, 2003.
              </li>
              <li>
                <strong>BENI, Mario Carlos.</strong> Política e Planejamento de Turismo no Brasil. 
                São Paulo: Aleph, 2006.
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
