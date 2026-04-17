import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  MapPin,
  ClipboardList,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Plus,
  Loader2,
  Shield,
  Calculator,
  Users,
  User,
  Eye,
  Zap,
  Gauge,
  Target,
  Landmark,
  Hotel,
  Sparkles,
  FileText,
  Flower2,
} from 'lucide-react';

type VisibilityType = 'organization' | 'personal' | 'demo';
type DiagnosisTier = 'COMPLETE' | 'MEDIUM' | 'SMALL';
type DiagnosticType = 'territorial' | 'enterprise';

interface WorkflowStep {
  id: number;
  title: string;
  description: string;
  icon: React.ElementType;
}

const TIER_OPTIONS = [
  {
    value: 'COMPLETE' as DiagnosisTier,
    label: 'Integral',
    description: 'Todos os indicadores. Ideal para capitais, polos turísticos ou planejamento estratégico de longo prazo.',
    icon: Target,
    color: 'text-primary',
    bgColor: 'bg-primary/5 border-primary',
    features: ['Todos os indicadores ativos', 'Coleta completa (integrada + manual)', 'Análise 360° do destino'],
  },
  {
    value: 'MEDIUM' as DiagnosisTier,
    label: 'Estratégico',
    description: 'Indicadores core + críticos. Para cidades médias ou acompanhamento tático.',
    icon: Gauge,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50 dark:bg-amber-950/30 border-amber-500',
    features: ['Conjunto otimizado de indicadores', 'Prioriza dados integráveis', 'Mantém comparabilidade'],
  },
  {
    value: 'SMALL' as DiagnosisTier,
    label: 'Essencial',
    description: 'Mínimo viável. Para municípios menores ou primeira avaliação rápida.',
    icon: Zap,
    color: 'text-green-600',
    bgColor: 'bg-green-50 dark:bg-green-950/30 border-green-500',
    features: ['Apenas indicadores essenciais', 'Foco em dados integráveis', 'Ciclo ágil'],
  },
];

interface NovaRodadaFormProps {
  currentStep: number;
  diagnosticType: DiagnosticType;
  onDiagnosticTypeChange: (type: DiagnosticType) => void;
  visibility: VisibilityType;
  onVisibilityChange: (v: VisibilityType) => void;
  destinationMode: 'select' | 'create';
  onDestinationModeChange: (mode: 'select' | 'create') => void;
  selectedDestination: string;
  onSelectedDestinationChange: (id: string) => void;
  destinations: any[];
  selectedDestinationData: any;
  assessmentTitle: string;
  onAssessmentTitleChange: (title: string) => void;
  periodStart: string;
  onPeriodStartChange: (v: string) => void;
  periodEnd: string;
  onPeriodEndChange: (v: string) => void;
  selectedTier: DiagnosisTier;
  onSelectedTierChange: (tier: DiagnosisTier) => void;
  expandWithMandala: boolean;
  onExpandWithMandalaChange: (v: boolean) => void;
  validatedDataCount: number;
  isViewingDemoData: boolean;
  hasEnterpriseAccess: boolean;
  workflowSteps: WorkflowStep[];
  onOpenDestinationForm: () => void;
  onNextStep: () => void;
  onPreviousStep: () => void;
  canProceed: boolean;
  isPending: boolean;
  createdAssessmentId: string | null;
  onNavigateToCalculation: () => void;
  onNavigateToReport: () => void;
}

export function NovaRodadaForm({
  currentStep,
  diagnosticType,
  onDiagnosticTypeChange,
  visibility,
  onVisibilityChange,
  destinationMode,
  onDestinationModeChange,
  selectedDestination,
  onSelectedDestinationChange,
  destinations,
  selectedDestinationData,
  assessmentTitle,
  onAssessmentTitleChange,
  periodStart,
  onPeriodStartChange,
  periodEnd,
  onPeriodEndChange,
  selectedTier,
  onSelectedTierChange,
  expandWithMandala,
  onExpandWithMandalaChange,
  validatedDataCount,
  isViewingDemoData,
  hasEnterpriseAccess,
  workflowSteps,
  onOpenDestinationForm,
  onNextStep,
  onPreviousStep,
  canProceed,
  isPending,
  createdAssessmentId,
  onNavigateToCalculation,
  onNavigateToReport,
}: NovaRodadaFormProps) {
  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {(() => {
            const step = workflowSteps.find(s => s.id === currentStep);
            const Icon = step?.icon || MapPin;
            return (
              <>
                <Icon className="h-5 w-5 text-primary" />
                Passo {currentStep}: {step?.title}
              </>
            );
          })()}
        </CardTitle>
        <CardDescription>
          {workflowSteps.find(s => s.id === currentStep)?.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Step 1: Scope & Type */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                Selecione o tipo de diagnóstico que deseja realizar.
              </p>
            </div>
            
            <div>
              <Label className="text-sm font-medium mb-3 block">Tipo de Diagnóstico</Label>
              <RadioGroup
                value={diagnosticType}
                onValueChange={(value) => onDiagnosticTypeChange(value as DiagnosticType)}
                className="grid grid-cols-2 gap-4"
              >
                <div className={cn(
                  "flex flex-col items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all text-center",
                  diagnosticType === 'territorial' 
                    ? "border-primary bg-primary/5" 
                    : "border-muted hover:border-muted-foreground/50"
                )}>
                  <RadioGroupItem value="territorial" id="territorial" className="sr-only" />
                  <Label htmlFor="territorial" className="cursor-pointer space-y-3">
                    <div className="mx-auto w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <Landmark className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium">Territorial</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Municípios e destinos turísticos. Dados de IBGE, DATASUS, INEP.
                      </p>
                    </div>
                  </Label>
                </div>
                
                <div className={cn(
                  "flex flex-col items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all text-center relative",
                  !hasEnterpriseAccess && "opacity-50 cursor-not-allowed",
                  diagnosticType === 'enterprise' 
                    ? "border-amber-500 bg-amber-50 dark:bg-amber-950/30" 
                    : "border-muted hover:border-muted-foreground/50"
                )}>
                  <RadioGroupItem 
                    value="enterprise" 
                    id="enterprise" 
                    className="sr-only" 
                    disabled={!hasEnterpriseAccess}
                  />
                  <Label 
                    htmlFor="enterprise" 
                    className={cn(
                      "cursor-pointer space-y-3",
                      !hasEnterpriseAccess && "cursor-not-allowed"
                    )}
                  >
                    <div className="mx-auto w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                      <Hotel className="h-6 w-6 text-amber-600" />
                    </div>
                    <div className="flex items-center gap-2 justify-center">
                      <p className="font-medium">Enterprise</p>
                      <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs">
                        <Sparkles className="h-2.5 w-2.5 mr-0.5" />
                        PRO
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Hotéis e resorts. RevPAR, NPS, Ocupação, KPIs hoteleiros.
                    </p>
                    {!hasEnterpriseAccess && (
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                        Requer acesso Enterprise habilitado
                      </p>
                    )}
                  </Label>
                </div>
              </RadioGroup>
            </div>
            
            {/* Visibility Selector */}
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                {hasEnterpriseAccess 
                  ? 'Defina quem poderá visualizar este diagnóstico.'
                  : 'Defina quem poderá visualizar e editar este destino e diagnóstico. Isso afetará a visibilidade para outros membros da sua organização.'
                }
              </p>
            </div>
            
            {isViewingDemoData && (
              <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                <p className="text-sm text-amber-800 dark:text-amber-200 flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  <strong>Modo Demo ativo:</strong> Você pode criar dados no ambiente de demonstração.
                </p>
              </div>
            )}
            
            <RadioGroup
              value={visibility}
              onValueChange={(value) => onVisibilityChange(value as VisibilityType)}
              className="space-y-4"
            >
              <div className={cn(
                "flex items-start gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all",
                visibility === 'organization' 
                  ? "border-primary bg-primary/5" 
                  : "border-muted hover:border-muted-foreground/50"
              )}>
                <RadioGroupItem value="organization" id="organization" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="organization" className="flex items-center gap-2 cursor-pointer font-medium">
                    <Users className="h-5 w-5 text-primary" />
                    Compartilhado com a Organização
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Todos os membros da sua organização poderão visualizar e colaborar 
                    com este diagnóstico.
                  </p>
                </div>
              </div>
              
              <div className={cn(
                "flex items-start gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all",
                visibility === 'personal' 
                  ? "border-primary bg-primary/5" 
                  : "border-muted hover:border-muted-foreground/50"
              )}>
                <RadioGroupItem value="personal" id="personal" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="personal" className="flex items-center gap-2 cursor-pointer font-medium">
                    <User className="h-5 w-5 text-primary" />
                    Apenas para mim (Pessoal)
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Somente você terá acesso a este diagnóstico.
                  </p>
                </div>
              </div>

              {isViewingDemoData && (
                <div className={cn(
                  "flex items-start gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all",
                  visibility === 'demo' 
                    ? "border-amber-500 bg-amber-50 dark:bg-amber-950/30" 
                    : "border-amber-200 dark:border-amber-800 hover:border-amber-400"
                )}>
                  <RadioGroupItem value="demo" id="demo" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="demo" className="flex items-center gap-2 cursor-pointer font-medium">
                      <Eye className="h-5 w-5 text-amber-600" />
                      Ambiente de Demonstração
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Os dados serão criados no ambiente de demonstração.
                    </p>
                  </div>
                </div>
              )}
            </RadioGroup>
          </div>
        )}

        {/* Step 2: Destination */}
        {currentStep === 2 && (
          <>
            <div className="flex gap-4 mb-4">
              <Button
                variant={destinationMode === 'select' ? 'default' : 'outline'}
                onClick={() => onDestinationModeChange('select')}
                className="flex-1"
              >
                Selecionar existente
              </Button>
              <Button
                variant={destinationMode === 'create' ? 'default' : 'outline'}
                onClick={() => {
                  onDestinationModeChange('create');
                  onOpenDestinationForm();
                }}
                className="flex-1"
              >
                <Plus className="h-4 w-4 mr-2" />
                Criar novo
              </Button>
            </div>

            {destinationMode === 'select' ? (
              <div className="space-y-2">
                <Label>Destino turístico</Label>
                <Select value={selectedDestination} onValueChange={onSelectedDestinationChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um destino" />
                  </SelectTrigger>
                  <SelectContent>
                    {destinations.map((dest) => (
                      <SelectItem key={dest.id} value={dest.id}>
                        {dest.name} {dest.uf ? `- ${dest.uf}` : ''} 
                        {dest.ibge_code ? ` (IBGE: ${dest.ibge_code})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedDestinationData && !selectedDestinationData.ibge_code && (
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    ⚠️ Este destino não possui código IBGE. O pré-preenchimento automático não estará disponível.
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {selectedDestination ? (
                  <div className="p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                    <p className="text-sm text-green-700 dark:text-green-300 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      <strong>Destino criado:</strong>{' '}
                      {destinations.find(d => d.id === selectedDestination)?.name}
                    </p>
                    <Button 
                      variant="link" 
                      className="p-0 h-auto text-green-700 dark:text-green-300"
                      onClick={onOpenDestinationForm}
                    >
                      Criar outro destino
                    </Button>
                  </div>
                ) : (
                  <div className="p-4 bg-muted/50 rounded-lg text-center">
                    <p className="text-sm text-muted-foreground mb-3">
                      Clique no botão abaixo para criar um novo destino com busca automática no IBGE.
                    </p>
                    <Button onClick={onOpenDestinationForm}>
                      <Plus className="h-4 w-4 mr-2" />
                      Criar Destino
                    </Button>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Step 3: Assessment */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Título do diagnóstico *</Label>
              <Input
                placeholder="Ex: Diagnóstico Bonito 2024"
                value={assessmentTitle}
                onChange={(e) => onAssessmentTitleChange(e.target.value)}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Período início (opcional)</Label>
                <Input
                  type="date"
                  value={periodStart}
                  onChange={(e) => onPeriodStartChange(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Período fim (opcional)</Label>
                <Input
                  type="date"
                  value={periodEnd}
                  onChange={(e) => onPeriodEndChange(e.target.value)}
                />
              </div>
            </div>

            {/* Tier Selection */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Gauge className="h-4 w-4 text-primary" />
                Nível de Diagnóstico
              </Label>
              <RadioGroup
                value={selectedTier}
                onValueChange={(value) => onSelectedTierChange(value as DiagnosisTier)}
                className="space-y-3"
              >
                {TIER_OPTIONS.map((tier) => {
                  const TierIcon = tier.icon;
                  const isSelected = selectedTier === tier.value;
                  return (
                    <div 
                      key={tier.value}
                      className={cn(
                        "flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all",
                        isSelected 
                          ? tier.bgColor
                          : "border-muted hover:border-muted-foreground/50"
                      )}
                    >
                      <RadioGroupItem value={tier.value} id={tier.value} className="mt-1" />
                      <div className="flex-1">
                        <Label 
                          htmlFor={tier.value} 
                          className={cn(
                            "flex items-center gap-2 cursor-pointer font-medium",
                            isSelected && tier.color
                          )}
                        >
                          <TierIcon className={cn("h-5 w-5", tier.color)} />
                          {tier.label}
                        </Label>
                        <p className="text-sm text-muted-foreground mt-1">
                          {tier.description}
                        </p>
                        <ul className="mt-2 space-y-1">
                          {tier.features.map((feature, idx) => (
                            <li key={idx} className="text-xs text-muted-foreground flex items-center gap-1.5">
                              <CheckCircle2 className="h-3 w-3 text-muted-foreground/60" />
                              {feature}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  );
                })}
              </RadioGroup>
            </div>

            {/* Mandala da Sustentabilidade — Opt-in */}
            <div
              className={cn(
                "rounded-lg border-2 p-4 transition-all",
                expandWithMandala
                  ? "border-primary bg-primary/5"
                  : "border-muted hover:border-muted-foreground/40"
              )}
            >
              <div className="flex items-start gap-4">
                <div className={cn(
                  "mt-0.5 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                  expandWithMandala ? "bg-primary/15" : "bg-muted"
                )}>
                  <Flower2 className={cn("h-5 w-5", expandWithMandala ? "text-primary" : "text-muted-foreground")} />
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Label htmlFor="mandala-toggle" className="font-medium cursor-pointer flex items-center gap-2">
                        Expandir com Mandala da Sustentabilidade
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-primary/40 text-primary">
                          MST
                        </Badge>
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Adiciona 9 indicadores complementares baseados em Tasso, Silva & Nascimento (2024):
                        acessibilidade NBR 9050, comparecimento eleitoral, qualificação PNQT, conectividade 5G/Wi-Fi,
                        promoção digital, Big Data turístico, TBC, inclusão na gestão e sensibilização.
                      </p>
                    </div>
                    <Switch
                      id="mandala-toggle"
                      checked={expandWithMandala}
                      onCheckedChange={onExpandWithMandalaChange}
                    />
                  </div>
                  {expandWithMandala && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-primary/15">
                      <div className="text-xs">
                        <span className="font-medium text-severity-good">✓ 3 automáticos</span>
                        <p className="text-muted-foreground">TSE, Anatel, CADASTUR</p>
                      </div>
                      <div className="text-xs">
                        <span className="font-medium text-amber-600">⚠ 6 manuais</span>
                        <p className="text-muted-foreground">Coleta pelo gestor</p>
                      </div>
                      <div className="text-xs">
                        <span className="font-medium text-primary">+ Não altera score</span>
                        <p className="text-muted-foreground">Indicadores opcionais</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>Destino selecionado:</strong>{' '}
                {selectedDestinationData?.name || 'Novo destino'}
                {selectedDestinationData?.ibge_code && (
                  <span className="text-severity-good ml-2">
                    ✓ Código IBGE disponível
                  </span>
                )}
              </p>
            </div>
          </div>
        )}

        {/* Step 5: Data Entry Info */}
        {currentStep === 5 && (
          <div className="space-y-4">
            <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
              <h4 className="font-medium mb-2">Próximo passo: Complementar dados</h4>
              <p className="text-sm text-muted-foreground mb-4">
                Você será direcionado para a página de importação onde poderá:
              </p>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-severity-good" />
                  Alterar valores pré-preenchidos automaticamente (clique no campo para editar)
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-severity-good" />
                  Importar dados adicionais via arquivo CSV
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-severity-good" />
                  Preencher dados manualmente por formulário
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-severity-good" />
                  Complementar indicadores não cobertos pelas fontes oficiais
                </li>
              </ul>
            </div>
            {validatedDataCount > 0 && (
              <div className="p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                <p className="text-sm text-green-700 dark:text-green-300 flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  <strong>{validatedDataCount} indicadores</strong> já foram pré-preenchidos e validados com dados oficiais.
                </p>
              </div>
            )}
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm">
                <strong>Diagnóstico criado:</strong> {assessmentTitle}
              </p>
            </div>
          </div>
        )}

        {/* Step 6: Calculate Info */}
        {currentStep === 6 && (
          <div className="space-y-4">
            <div className="p-4 bg-accent/10 rounded-lg border border-accent/20">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-severity-good" />
                Dados preenchidos com sucesso!
              </h4>
              <p className="text-sm text-muted-foreground">
                Agora você pode calcular o diagnóstico. O sistema irá:
              </p>
              <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                <li>• Normalizar os indicadores</li>
                <li>• Calcular scores dos pilares (RA, OE, AO)</li>
                <li>• Identificar gargalos</li>
                <li>• Gerar prescrições de capacitação</li>
              </ul>
            </div>
            
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm">
                <strong>Diagnóstico:</strong> {assessmentTitle}
              </p>
            </div>
            
            <Button 
              className="w-full" 
              size="lg"
              onClick={onNavigateToCalculation}
            >
              <Calculator className="h-4 w-4 mr-2" />
              Ir para Cálculo do Diagnóstico
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}

        {/* Step 7: Report Info */}
        {currentStep === 7 && (
          <div className="space-y-4">
            <div className="p-4 bg-severity-good/10 rounded-lg border border-severity-good/20">
              <h4 className="font-medium mb-2">Gerar relatório</h4>
              <p className="text-sm text-muted-foreground">
                Com o diagnóstico calculado, você poderá gerar um plano de desenvolvimento 
                turístico personalizado usando a Mente Sistur.
              </p>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={onPreviousStep}
            disabled={currentStep === 1}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <Button
            onClick={onNextStep}
            disabled={!canProceed || isPending}
          >
            {isPending && (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            )}
            {currentStep < 5 ? 'Continuar' : 'Ir para ' + (workflowSteps[currentStep - 1]?.title || '')}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
