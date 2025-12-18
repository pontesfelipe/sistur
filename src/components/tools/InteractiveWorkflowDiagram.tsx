import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Calculator, 
  Layers, 
  AlertTriangle, 
  GraduationCap, 
  FileText, 
  MapPin, 
  Activity,
  ChevronDown,
  Database,
  Scale,
  Target,
  Users
} from 'lucide-react';

interface WorkflowStep {
  id: number;
  label: string;
  sublabel: string;
  color: string;
  icon: React.ElementType;
  details: {
    title: string;
    description: string;
    items: string[];
    example?: string;
  };
}

const workflowSteps: WorkflowStep[] = [
  {
    id: 1,
    label: "Destino",
    sublabel: "Seleção",
    color: "bg-blue-500",
    icon: MapPin,
    details: {
      title: "Seleção do Destino Turístico",
      description: "Primeiro passo é escolher o município ou destino turístico que será avaliado.",
      items: [
        "Cadastro do destino com código IBGE",
        "Definição de coordenadas geográficas",
        "Vinculação à organização responsável",
        "Identificação da UF"
      ],
      example: "Ex: Porto de Galinhas (PE) - IBGE 2607901"
    }
  },
  {
    id: 2,
    label: "Pré-preencher",
    sublabel: "Dados Oficiais",
    color: "bg-cyan-500",
    icon: Database,
    details: {
      title: "Pré-preenchimento de Dados Oficiais",
      description: "Sistema busca automaticamente dados de fontes públicas nacionais, explicitando fonte, ano e nível de confiança.",
      items: [
        "IBGE: dados demográficos e econômicos",
        "DATASUS: saúde e bem-estar",
        "INEP: educação (IDEB, matrículas)",
        "STN: gestão fiscal municipal",
        "CADASTUR: oferta turística"
      ],
      example: "Ex: PIB per capita = R$ 25.000 (IBGE, 2022, confiança 5/5)"
    }
  },
  {
    id: 3,
    label: "Validação",
    sublabel: "Humana",
    color: "bg-indigo-500",
    icon: Activity,
    details: {
      title: "Validação Humana Obrigatória",
      description: "Usuário revisa, confirma ou ajusta cada valor antes do cálculo. Nenhum dado é 'verdade absoluta'.",
      items: [
        "Visualização de fonte, ano e confiança",
        "Edição de valores quando necessário",
        "Justificativa para ajustes manuais",
        "Congelamento (snapshot) dos dados validados"
      ],
      example: "Ex: Valor 45.2% confirmado pelo analista"
    }
  },
  {
    id: 4,
    label: "Cálculo",
    sublabel: "Normalização",
    color: "bg-purple-500",
    icon: Calculator,
    details: {
      title: "Normalização e Cálculo de Scores",
      description: "Valores validados são convertidos para escala 0-1 usando métodos específicos.",
      items: [
        "MIN_MAX: (valor - min) / (max - min)",
        "BANDS: faixas categóricas predefinidas",
        "BINARY: 0 ou 1 baseado em critério",
        "Aplicação de pesos por indicador"
      ],
      example: "Ex: Valor 45.2% → Score 0.52 (normalizado)"
    }
  },
  {
    id: 5,
    label: "Status",
    sublabel: "Automático",
    color: "bg-orange-500",
    icon: AlertTriangle,
    details: {
      title: "Determinação Automática de Status",
      description: "Status é calculado automaticamente com base no score normalizado. Nunca é editável manualmente.",
      items: [
        "Score ≥ 0.67 → Adequado (verde)",
        "Score 0.34 – 0.66 → Atenção (amarelo)",
        "Score ≤ 0.33 → Crítico (vermelho)",
        "Interpretação territorial atribuída"
      ],
      example: "Ex: Score 0.52 → Status ATENÇÃO"
    }
  },
  {
    id: 6,
    label: "Prescrição",
    sublabel: "Determinística",
    color: "bg-green-500",
    icon: GraduationCap,
    details: {
      title: "Prescrição de Capacitação (SISTUR EDU)",
      description: "Cursos são prescritos automaticamente com base em regras determinísticas, nunca por IA.",
      items: [
        "Indicador + Pilar + Status + Interpretação → Curso",
        "Priorização automática por severidade",
        "Justificativa explícita para cada prescrição",
        "Monitoramento de evolução por ciclo"
      ],
      example: "Ex: Curso 'Gestão de Qualidade' prescrito para indicador crítico"
    }
  }
];

export function InteractiveWorkflowDiagram() {
  const [selectedStep, setSelectedStep] = useState<number | null>(null);

  const handleStepClick = (stepId: number) => {
    setSelectedStep(selectedStep === stepId ? null : stepId);
  };

  const selectedStepData = workflowSteps.find(s => s.id === selectedStep);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-primary" />
          Fluxo do Diagnóstico SISTUR
        </CardTitle>
        <CardDescription>
          Clique em cada etapa para ver detalhes do processo
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Interactive Workflow Steps */}
        <div className="relative">
          <div className="flex flex-col md:flex-row items-stretch gap-2 md:gap-1">
            {workflowSteps.map((step, idx, arr) => (
              <div key={step.id} className="flex items-center flex-1">
                <button
                  onClick={() => handleStepClick(step.id)}
                  className={`${step.color} text-white p-3 rounded-lg flex-1 text-center min-w-[100px] transition-all duration-200 hover:scale-105 hover:shadow-lg cursor-pointer ${
                    selectedStep === step.id ? 'ring-2 ring-offset-2 ring-primary scale-105 shadow-lg' : ''
                  }`}
                >
                  <step.icon className="h-5 w-5 mx-auto mb-1" />
                  <p className="font-semibold text-sm">{step.label}</p>
                  <p className="text-xs opacity-80">{step.sublabel}</p>
                  <ChevronDown className={`h-3 w-3 mx-auto mt-1 transition-transform ${selectedStep === step.id ? 'rotate-180' : ''}`} />
                </button>
                {idx < arr.length - 1 && (
                  <div className="hidden md:block text-muted-foreground px-1">→</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Detail Panel */}
        {selectedStepData && (
          <div className={`animate-fade-in bg-muted/30 rounded-lg p-4 border-l-4 ${
            selectedStepData.color.includes('blue') ? 'border-l-blue-500' :
            selectedStepData.color.includes('cyan') ? 'border-l-cyan-500' :
            selectedStepData.color.includes('indigo') ? 'border-l-indigo-500' :
            selectedStepData.color.includes('purple') ? 'border-l-purple-500' :
            selectedStepData.color.includes('orange') ? 'border-l-orange-500' :
            'border-l-green-500'
          }`}>
            <div className="flex items-center gap-2 mb-3">
              <selectedStepData.icon className="h-5 w-5 text-primary" />
              <h4 className="font-semibold">{selectedStepData.details.title}</h4>
            </div>
            <p className="text-sm text-muted-foreground mb-3">{selectedStepData.details.description}</p>
            <ul className="space-y-1 mb-3">
              {selectedStepData.details.items.map((item, idx) => (
                <li key={idx} className="text-sm flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  {item}
                </li>
              ))}
            </ul>
            {selectedStepData.details.example && (
              <div className="bg-background/50 rounded p-2 text-xs font-mono text-muted-foreground">
                {selectedStepData.details.example}
              </div>
            )}
          </div>
        )}

        <Separator />

        {/* Calculation Detail */}
        <div>
          <p className="font-semibold text-sm mb-3">Fluxo de Cálculo de Scores</p>
          <div className="bg-muted/30 rounded-lg p-4 space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Badge variant="outline">Valor Bruto</Badge>
              <span className="text-muted-foreground">→</span>
              <Badge variant="outline">Normalização (0-1)</Badge>
              <span className="text-muted-foreground">→</span>
              <Badge variant="outline">Score × Peso</Badge>
              <span className="text-muted-foreground">→</span>
              <Badge className="bg-primary">Score do Pilar</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Fórmula: Score_Pilar = Σ(Score_i × Peso_i) / Σ(Peso_i) — média ponderada dos indicadores
            </p>
          </div>
        </div>

        {/* Status Thresholds */}
        <div>
          <p className="font-semibold text-sm mb-3">Limiares de Status (Não Negociáveis)</p>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-center">
              <p className="font-bold text-green-600">≥ 0.67</p>
              <p className="text-xs text-muted-foreground">Adequado</p>
            </div>
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 text-center">
              <p className="font-bold text-yellow-600">0.34 – 0.66</p>
              <p className="text-xs text-muted-foreground">Atenção</p>
            </div>
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-center">
              <p className="font-bold text-red-600">≤ 0.33</p>
              <p className="text-xs text-muted-foreground">Crítico</p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Prescriptions vs Reports */}
        <div>
          <p className="font-semibold text-sm mb-3">Prescrições vs. Relatórios</p>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="border rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-green-500" />
                <p className="font-semibold">Prescrições (SISTUR EDU)</p>
              </div>
              <div className="bg-muted/30 rounded p-2 text-xs font-mono">
                Indicador + Pilar + Status + Interpretação → Curso
              </div>
              <p className="text-xs text-muted-foreground">
                100% determinístico, baseado em regras. Sem IA.
              </p>
            </div>
            <div className="border rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-500" />
                <p className="font-semibold">Relatórios</p>
              </div>
              <div className="bg-muted/30 rounded p-2 text-xs font-mono">
                Dados Diagnósticos → IA → Plano Estratégico
              </div>
              <p className="text-xs text-muted-foreground">
                IA para análise e síntese. Não prescreve cursos.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
