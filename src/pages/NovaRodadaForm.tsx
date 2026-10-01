import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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
  Check,
  ChevronsUpDown,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { BrandSelector } from '@/components/enterprise/BrandSelector';
import { AssessmentUnitsManager, type DraftUnit } from '@/components/enterprise/AssessmentUnitsManager';

import { tx } from "@/i18n/t";
function DestinationCombobox({
  destinations,
  value,
  onChange,
}: {
  destinations: any[];
  value: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = useMemo(
    () => destinations.find((d) => d.id === value),
    [destinations, value],
  );
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          <span className="truncate text-left">
            {selected
              ? `${selected.name}${selected.uf ? ` - ${selected.uf}` : ''}${
                  selected.ibge_code ? ` (IBGE: ${selected.ibge_code})` : ''
                }`
              : tx('Selecione ou pesquise um destino')}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0"
        align="start"
      >
        <Command
          filter={(itemValue, search) =>
            itemValue.toLowerCase().includes(search.toLowerCase()) ? 1 : 0
          }
        >
          <CommandInput placeholder={tx("Pesquisar por nome, UF ou IBGE...")} />
          <CommandList>
            <CommandEmpty>{tx("Nenhum destino encontrado.")}</CommandEmpty>
            <CommandGroup>
              {destinations.map((dest) => {
                const label = `${dest.name} ${dest.uf ?? ''} ${dest.ibge_code ?? ''}`.trim();
                return (
                  <CommandItem
                    key={dest.id}
                    value={`${label} ${dest.id}`}
                    onSelect={() => {
                      onChange(dest.id);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        value === dest.id ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                    <span className="truncate">
                      {dest.name}
                      {dest.uf ? ` - ${dest.uf}` : ''}
                      {dest.ibge_code ? ` (IBGE: ${dest.ibge_code})` : ''}
                    </span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

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
    label: tx('Integral'),
    description: tx('Todos os indicadores. Ideal para capitais, polos turísticos ou planejamento estratégico de longo prazo.'),
    icon: Target,
    color: 'text-primary',
    bgColor: 'bg-primary/5 border-primary',
    features: ['Todos os indicadores ativos', 'Coleta completa (integrada + manual)', 'Análise 360° do destino'],
  },
  {
    value: 'MEDIUM' as DiagnosisTier,
    label: tx('Estratégico'),
    description: tx('Indicadores core + críticos. Para cidades médias ou acompanhamento tático.'),
    icon: Gauge,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50 dark:bg-amber-950/30 border-amber-500',
    features: ['Conjunto otimizado de indicadores', 'Prioriza dados integráveis', 'Mantém comparabilidade'],
  },
  {
    value: 'SMALL' as DiagnosisTier,
    label: tx('Essencial'),
    description: tx('Mínimo viável. Para municípios menores ou primeira avaliação rápida.'),
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
  brandId: string | null;
  brandName: string | null;
  onBrandChange: (id: string | null, name: string | null) => void;
  units: DraftUnit[];
  onUnitsChange: (units: DraftUnit[]) => void;
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
  brandId,
  brandName,
  onBrandChange,
  units,
  onUnitsChange,
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
                {tx("Passo {{v0}}: {{v1}}", { v0: currentStep, v1: step?.title })}
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
                {tx("Selecione o tipo de diagnóstico que deseja realizar.")}
              </p>
            </div>
            
            <div>
              <Label className="text-sm font-medium mb-3 block">{tx("Tipo de Diagnóstico")}</Label>
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
                      <p className="font-medium">{tx("Territorial")}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {tx("Municípios e destinos turísticos. Dados de IBGE, DATASUS, INEP.")}
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
                      <p className="font-medium">{tx("Empresarial")}</p>
                      <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs">
                        <Sparkles className="h-2.5 w-2.5 mr-0.5" />
                        {tx("PRO")}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {tx("Hotéis e resorts. RevPAR, NPS, Ocupação, KPIs hoteleiros.")}
                    </p>
                    {!hasEnterpriseAccess && (
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                        {tx("Requer acesso Empresarial habilitado")}
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
                  ? tx('Defina quem poderá visualizar este diagnóstico.')
                  : tx('Defina quem poderá visualizar e editar este destino e diagnóstico. Isso afetará a visibilidade para outros membros da sua organização.')
                }
              </p>
            </div>
            
            {isViewingDemoData && (
              <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                <p className="text-sm text-amber-800 dark:text-amber-200 flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  <strong>{tx("Modo Demo ativo:")}</strong> {tx("Você pode criar dados no ambiente de demonstração.")}
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
                    {tx("Compartilhado com a Organização")}
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {tx("Todos os membros da sua organização poderão visualizar e colaborar com este diagnóstico.")}
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
                    {tx("Apenas para mim (Pessoal)")}
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {tx("Somente você terá acesso a este diagnóstico.")}
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
                      {tx("Ambiente de Demonstração")}
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {tx("Os dados serão criados no ambiente de demonstração.")}
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
            {diagnosticType === 'enterprise' && (
              <div className="space-y-4 mb-4">
                <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <p className="text-sm text-amber-900 dark:text-amber-200">
                    <strong>{tx("Diagnóstico empresarial:")}</strong> {tx("uma marca pode ter várias unidades em municípios diferentes. Selecione a marca e adicione abaixo os municípios onde o empreendimento opera — o diagnóstico será único, mas a coleta de dados será por unidade.")}
                  </p>
                </div>
                <BrandSelector
                  value={brandId}
                  onChange={(id, name) => onBrandChange(id, name)}
                />
                <AssessmentUnitsManager
                  destinations={destinations}
                  value={units}
                  onChange={onUnitsChange}
                  unitNamePrefix={brandName}
                />
                {units.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    {tx("Adicione pelo menos uma unidade para prosseguir.")}
                  </p>
                )}
              </div>
            )}
            {diagnosticType !== 'enterprise' && (
            <>
            <div className="flex gap-4 mb-4">
              <Button
                variant={destinationMode === 'select' ? 'default' : 'outline'}
                onClick={() => onDestinationModeChange('select')}
                className="flex-1"
              >
                {tx("Selecionar existente")}
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
                {tx("Criar novo")}
              </Button>
            </div>

            {destinationMode === 'select' ? (
              <div className="space-y-2">
                <Label>{tx("Destino turístico")}</Label>
                <DestinationCombobox
                  destinations={destinations}
                  value={selectedDestination}
                  onChange={onSelectedDestinationChange}
                />
                {selectedDestinationData && !selectedDestinationData.ibge_code && (
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    {tx("⚠️ Este destino não possui código IBGE. O pré-preenchimento automático não estará disponível.")}
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {selectedDestination ? (
                  <div className="p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                    <p className="text-sm text-green-700 dark:text-green-300 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      <strong>{tx("Destino criado:")}</strong>{' '}
                      {destinations.find(d => d.id === selectedDestination)?.name}
                    </p>
                    <Button 
                      variant="link" 
                      className="p-0 h-auto text-green-700 dark:text-green-300"
                      onClick={onOpenDestinationForm}
                    >
                      {tx("Criar outro destino")}
                    </Button>
                  </div>
                ) : (
                  <div className="p-4 bg-muted/50 rounded-lg text-center">
                    <p className="text-sm text-muted-foreground mb-3">
                      {tx("Clique no botão abaixo para criar um novo destino com busca automática no IBGE.")}
                    </p>
                    <Button onClick={onOpenDestinationForm}>
                      <Plus className="h-4 w-4 mr-2" />
                      {tx("Criar Destino")}
                    </Button>
                  </div>
                )}
              </div>
            )}
            </>
            )}
          </>
        )}

        {/* Step 3: Assessment */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>{tx("Título do diagnóstico *")}</Label>
              <Input
                placeholder={tx("Ex: Diagnóstico Bonito 2024")}
                value={assessmentTitle}
                onChange={(e) => onAssessmentTitleChange(e.target.value)}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{tx("Período início (opcional)")}</Label>
                <Input
                  type="date"
                  value={periodStart}
                  onChange={(e) => onPeriodStartChange(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>{tx("Período fim (opcional)")}</Label>
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
                {tx("Nível de Diagnóstico")}
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
                          {tx(String(tier.label ?? ""))}
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
                        {tx("Expandir com Mandala da Sustentabilidade")}
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-primary/40 text-primary">
                          {tx("MST")}
                        </Badge>
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Adiciona 9 indicadores complementares baseados em Tasso, Silva & Nascimento (2024): acessibilidade NBR 9050, comparecimento eleitoral, qualificação PNQT, conectividade 5G/Wi-Fi, promoção digital, Big Data turístico, TBC, inclusão na gestão e sensibilização.
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
                        <span className="font-medium text-severity-good">{tx("✓ 3 automáticos")}</span>
                        <p className="text-muted-foreground">{tx("TSE, Anatel, CADASTUR")}</p>
                      </div>
                      <div className="text-xs">
                        <span className="font-medium text-amber-600">{tx("⚠ 6 manuais")}</span>
                        <p className="text-muted-foreground">{tx("Coleta pelo gestor")}</p>
                      </div>
                      <div className="text-xs">
                        <span className="font-medium text-primary">{tx("+ Não altera score")}</span>
                        <p className="text-muted-foreground">{tx("Indicadores opcionais")}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>{tx("Destino selecionado:")}</strong>{' '}
                {selectedDestinationData?.name || 'Novo destino'}
                {selectedDestinationData?.ibge_code && (
                  <span className="text-severity-good ml-2">
                    {tx("✓ Código IBGE disponível")}
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
              <h4 className="font-medium mb-2">{tx("Próximo passo: Complementar dados")}</h4>
              <p className="text-sm text-muted-foreground mb-4">
                {tx("Você será direcionado para a página de importação onde poderá:")}
              </p>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-severity-good" />
                  {tx("Alterar valores pré-preenchidos automaticamente (clique no campo para editar)")}
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-severity-good" />
                  {tx("Importar dados adicionais via arquivo CSV")}
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-severity-good" />
                  {tx("Preencher dados manualmente por formulário")}
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-severity-good" />
                  {tx("Complementar indicadores não cobertos pelas fontes oficiais")}
                </li>
              </ul>
            </div>
            {validatedDataCount > 0 && (
              <div className="p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                <p className="text-sm text-green-700 dark:text-green-300 flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  <strong>{tx("{{v0}} indicadores", { v0: validatedDataCount })}</strong> {tx("já foram pré-preenchidos e validados com dados oficiais.")}
                </p>
              </div>
            )}
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm">
                <strong>{tx("Diagnóstico criado:")}</strong> {assessmentTitle}
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
                {tx("Dados preenchidos com sucesso!")}
              </h4>
              <p className="text-sm text-muted-foreground">
                {tx("Agora você pode calcular o diagnóstico. O sistema irá:")}
              </p>
              <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                <li>{tx("• Normalizar os indicadores")}</li>
                <li>{tx("• Calcular scores dos pilares (RA, OE, AO)")}</li>
                <li>{tx("• Identificar gargalos")}</li>
                <li>{tx("• Gerar prescrições de capacitação")}</li>
              </ul>
            </div>
            
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm">
                <strong>{tx("Diagnóstico:")}</strong> {assessmentTitle}
              </p>
            </div>
            
            <Button 
              className="w-full" 
              size="lg"
              onClick={onNavigateToCalculation}
            >
              <Calculator className="h-4 w-4 mr-2" />
              {tx("Ir para Cálculo do Diagnóstico")}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}

        {/* Step 7: Report Info */}
        {currentStep === 7 && (
          <div className="space-y-4">
            <div className="p-4 bg-severity-good/10 rounded-lg border border-severity-good/20">
              <h4 className="font-medium mb-2">{tx("Gerar relatório")}</h4>
              <p className="text-sm text-muted-foreground">
                {tx("Com o diagnóstico calculado, você poderá gerar um plano de desenvolvimento turístico personalizado usando a Mente Sistur.")}
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
            {tx("Voltar")}
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
