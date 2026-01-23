import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  MapPin, 
  ClipboardList, 
  Database as DatabaseIcon, 
  FileText, 
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
  RefreshCw,
  Landmark,
  Hotel,
  Sparkles,
} from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDestinations } from '@/hooks/useDestinations';
import { useAssessments } from '@/hooks/useAssessments';
import { toast } from '@/hooks/use-toast';
import { DestinationFormDialog } from '@/components/destinations/DestinationFormDialog';
import { DataValidationPanel } from '@/components/official-data/DataValidationPanel';
import { EnterpriseDataEntryPanel } from '@/components/enterprise/EnterpriseDataEntryPanel';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { ExternalIndicatorValue, useCreateDataSnapshot, useExternalIndicatorValues } from '@/hooks/useOfficialData';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';

type VisibilityType = 'organization' | 'personal' | 'demo';
type DiagnosisTier = 'COMPLETE' | 'MEDIUM' | 'SMALL';
type DiagnosticType = 'territorial' | 'enterprise';

interface WorkflowStep {
  id: number;
  title: string;
  description: string;
  icon: React.ElementType;
}

const WORKFLOW_STEPS: WorkflowStep[] = [
  {
    id: 1,
    title: 'Escopo',
    description: 'Definir visibilidade',
    icon: Users,
  },
  {
    id: 2,
    title: 'Destino',
    description: 'Selecione ou crie um destino',
    icon: MapPin,
  },
  {
    id: 3,
    title: 'Diagnóstico',
    description: 'Configure a rodada de avaliação',
    icon: ClipboardList,
  },
  {
    id: 4,
    title: 'Pré-preenchimento',
    description: 'Validar dados oficiais',
    icon: Shield,
  },
  {
    id: 5,
    title: 'Preenchimento',
    description: 'Complementar dados manualmente',
    icon: DatabaseIcon,
  },
  {
    id: 6,
    title: 'Cálculo',
    description: 'Processar diagnóstico',
    icon: Calculator,
  },
  {
    id: 7,
    title: 'Relatório',
    description: 'Gerar plano de desenvolvimento',
    icon: FileText,
  },
];

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

export default function NovaRodada() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const resumeAssessmentId = searchParams.get('resume');
  
  const { user } = useAuth();
  const { isViewingDemoData, profile: userProfile } = useProfile();
  const [currentStep, setCurrentStep] = useState(1);
  const [diagnosticType, setDiagnosticType] = useState<DiagnosticType>('territorial');
  const [visibility, setVisibility] = useState<VisibilityType>('organization');
  const [destinationMode, setDestinationMode] = useState<'select' | 'create'>('select');
  const [selectedDestination, setSelectedDestination] = useState<string>('');
  const [isDestinationFormOpen, setIsDestinationFormOpen] = useState(false);
  const [assessmentTitle, setAssessmentTitle] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [selectedTier, setSelectedTier] = useState<DiagnosisTier>('COMPLETE');
  const [createdAssessmentId, setCreatedAssessmentId] = useState<string | null>(null);
  const [validatedDataCount, setValidatedDataCount] = useState(0);
  const [isResuming, setIsResuming] = useState(!!resumeAssessmentId);
  const [resumeDataLoaded, setResumeDataLoaded] = useState(false);
  
  // Check if user's org has enterprise access
  const { data: orgData } = useQuery({
    queryKey: ['org-enterprise-access', userProfile?.org_id],
    queryFn: async () => {
      if (!userProfile?.org_id) return null;
      const { data, error } = await supabase
        .from('orgs')
        .select('org_type, has_enterprise_access')
        .eq('id', userProfile.org_id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!userProfile?.org_id,
  });
  
  const hasEnterpriseAccess = orgData?.has_enterprise_access === true;

  // Fetch user profile to get org_id
  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch assessment to resume if resumeAssessmentId is provided
  const { data: resumeAssessment, isLoading: resumeLoading } = useQuery({
    queryKey: ['resume-assessment', resumeAssessmentId],
    queryFn: async () => {
      if (!resumeAssessmentId) return null;
      const { data, error } = await supabase
        .from('assessments')
        .select('*, destinations(*)')
        .eq('id', resumeAssessmentId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!resumeAssessmentId,
  });

  const { destinations = [], isLoading: destinationsLoading, createDestination } = useDestinations();
  const { createAssessment } = useAssessments();
  const createDataSnapshot = useCreateDataSnapshot();

  // Get selected destination details
  const selectedDestinationData = destinations.find(d => d.id === selectedDestination);
  
  // Get effective org_id for demo mode
  const effectiveOrgId = profile?.viewing_demo_org_id || profile?.org_id;
  
  // Check if there are validated indicator values for this assessment's destination
  const { data: existingValidatedValues } = useExternalIndicatorValues(
    selectedDestinationData?.ibge_code || undefined,
    effectiveOrgId || undefined
  );
  
  // Count validated values
  const validatedValuesCount = existingValidatedValues?.filter(v => v.validated)?.length || 0;

  // Load resume data when assessment is fetched
  useEffect(() => {
    if (resumeAssessment && !resumeDataLoaded && destinations.length > 0) {
      // Populate state from the existing assessment
      setCreatedAssessmentId(resumeAssessment.id);
      setSelectedDestination(resumeAssessment.destination_id);
      setAssessmentTitle(resumeAssessment.title);
      setVisibility(resumeAssessment.visibility as VisibilityType);
      setSelectedTier((resumeAssessment.tier as DiagnosisTier) || 'COMPLETE');
      setPeriodStart(resumeAssessment.period_start || '');
      setPeriodEnd(resumeAssessment.period_end || '');
      
      // Determine which step to resume from based on assessment status
      // DRAFT can be at step 4 (pre-filling), 5 (manual entry), or 6 (calculation)
      // Since assessment exists, at minimum we're past step 3
      // Check if there are validated values - if yes, go to step 5, otherwise step 4
      if (validatedValuesCount > 0) {
        setCurrentStep(5);
        setValidatedDataCount(validatedValuesCount);
      } else {
        setCurrentStep(4);
      }
      
      setResumeDataLoaded(true);
      setIsResuming(false);
      
      toast({
        title: 'Diagnóstico carregado',
        description: `Retomando "${resumeAssessment.title}" de onde você parou.`,
      });
    }
  }, [resumeAssessment, resumeDataLoaded, destinations, validatedValuesCount]);

  // Auto-generate assessment title when destination is selected (only for new assessments)
  useEffect(() => {
    if (selectedDestination && !resumeAssessmentId) {
      const dest = destinations.find(d => d.id === selectedDestination);
      if (dest && !assessmentTitle) {
        const year = new Date().getFullYear();
        setAssessmentTitle(`Diagnóstico ${dest.name} ${year}`);
      }
    }
  }, [selectedDestination, destinations, resumeAssessmentId, assessmentTitle]);

  const handleValidationComplete = async (validatedValues: ExternalIndicatorValue[]) => {
    setValidatedDataCount(validatedValues.length);
    
    // Create snapshot if assessment exists (use effective org_id for demo mode)
    const effectiveOrgId = profile?.viewing_demo_org_id || profile?.org_id;
    if (createdAssessmentId && effectiveOrgId) {
      await createDataSnapshot.mutateAsync({
        assessmentId: createdAssessmentId,
        values: validatedValues,
        orgId: effectiveOrgId,
      });
    }
    
    toast({
      title: 'Dados validados',
      description: `${validatedValues.length} indicadores validados com sucesso.`,
    });
  };

  const handleNextStep = async () => {
    if (currentStep === 1) {
      // Scope selected, proceed to destination
      setCurrentStep(2);
    } else if (currentStep === 2) {
      // Validate destination
      if (!selectedDestination) {
        toast({ title: 'Selecione um destino', variant: 'destructive' });
        return;
      }
      setCurrentStep(3);
    } else if (currentStep === 3) {
      // Create assessment
      if (!assessmentTitle) {
        toast({ title: 'Informe o título do diagnóstico', variant: 'destructive' });
        return;
      }
      try {
        const result = await createAssessment.mutateAsync({
          title: assessmentTitle,
          destination_id: selectedDestination,
          period_start: periodStart || null,
          period_end: periodEnd || null,
          visibility,
          tier: selectedTier,
          diagnostic_type: diagnosticType,
        });
        setCreatedAssessmentId(result.id);
        toast({ title: 'Diagnóstico criado com sucesso!' });
        setCurrentStep(4);
      } catch (error) {
        toast({ title: 'Erro ao criar diagnóstico', variant: 'destructive' });
        return;
      }
    } else if (currentStep === 4) {
      // Pre-filling validation complete - proceed to manual data entry
      setCurrentStep(5);
    } else if (currentStep === 5) {
      // Go to data entry page
      navigate(`/importacoes?assessment=${createdAssessmentId}`);
    } else if (currentStep === 6) {
      // Go to assessment detail to calculate
      navigate(`/diagnosticos/${createdAssessmentId}`);
    } else if (currentStep === 7) {
      // Go to reports
      navigate(`/relatorios?assessment=${createdAssessmentId}`);
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleCreateDestination = async (data: { name: string; uf: string; ibge_code?: string | null; latitude?: number | null; longitude?: number | null }) => {
    const result = await createDestination.mutateAsync({ ...data, visibility });
    setSelectedDestination(result.id);
    setDestinationMode('select');
    toast({ title: 'Destino criado com sucesso!' });
  };

  const canProceed = () => {
    if (currentStep === 1) {
      // Scope is always selected (default organization)
      return true;
    }
    if (currentStep === 2) {
      return !!selectedDestination;
    }
    if (currentStep === 3) return !!assessmentTitle && !!selectedDestination;
    if (currentStep === 4) {
      // Can always proceed from validation step (data is optional but encouraged)
      return true;
    }
    return true;
  };

  // Show loading state when resuming
  if (resumeLoading || (isResuming && !resumeDataLoaded)) {
    return (
      <AppLayout 
        title="Carregando Diagnóstico" 
        subtitle="Preparando para retomar de onde você parou..."
      >
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Carregando dados do diagnóstico...</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout 
      title={resumeAssessmentId ? "Retomar Diagnóstico" : "Nova Rodada de Diagnóstico"} 
      subtitle={resumeAssessmentId ? "Continue de onde você parou" : "Siga o fluxo para criar uma nova avaliação"}
    >
      {/* Resume Banner */}
      {resumeAssessmentId && resumeAssessment && (
        <div className="mb-6 p-4 rounded-lg border bg-primary/5 border-primary/20">
          <div className="flex items-center gap-3">
            <RefreshCw className="h-5 w-5 text-primary" />
            <div className="flex-1">
              <p className="font-medium text-primary">Retomando diagnóstico em rascunho</p>
              <p className="text-sm text-muted-foreground">
                {resumeAssessment.title} • {(resumeAssessment.destinations as any)?.name}
              </p>
            </div>
            <Badge variant="draft">Rascunho</Badge>
          </div>
        </div>
      )}

      {/* Visual Stepper */}
      <div className="mb-8 overflow-x-auto pb-4">
        <div className="flex items-center justify-between relative min-w-[700px]">
          {/* Progress Line Background */}
          <div className="absolute top-6 left-0 right-0 h-1 bg-muted" />
          {/* Progress Line Filled */}
          <div 
            className="absolute top-6 left-0 h-1 bg-primary transition-all duration-500"
            style={{ width: `${((currentStep - 1) / (WORKFLOW_STEPS.length - 1)) * 100}%` }}
          />
          
          {WORKFLOW_STEPS.map((step) => {
            const Icon = step.icon;
            const isCompleted = step.id < currentStep;
            const isCurrent = step.id === currentStep;
            const isUpcoming = step.id > currentStep;
            
            return (
              <div 
                key={step.id} 
                className="relative flex flex-col items-center z-10"
              >
                <div 
                  className={cn(
                    'w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300',
                    isCompleted && 'bg-primary text-primary-foreground',
                    isCurrent && 'bg-primary text-primary-foreground ring-4 ring-primary/30',
                    isUpcoming && 'bg-muted text-muted-foreground'
                  )}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="h-6 w-6" />
                  ) : (
                    <Icon className="h-5 w-5" />
                  )}
                </div>
                <div className="mt-2 text-center">
                  <p className={cn(
                    'text-sm font-medium',
                    isCurrent && 'text-primary',
                    isUpcoming && 'text-muted-foreground'
                  )}>
                    {step.title}
                  </p>
                  <p className="text-xs text-muted-foreground hidden md:block">
                    {step.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      {currentStep === 4 ? (
        // Full-width validation panel
        <div className="space-y-6">
          {selectedDestinationData?.ibge_code && profile?.org_id ? (
            <DataValidationPanel
              ibgeCode={selectedDestinationData.ibge_code}
              orgId={profile.org_id}
              destinationName={selectedDestinationData.name}
              onValidationComplete={handleValidationComplete}
            />
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h4 className="font-medium mb-2">Código IBGE não disponível</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  O destino selecionado não possui código IBGE cadastrado. 
                  O pré-preenchimento automático requer o código IBGE para buscar dados oficiais.
                </p>
                <p className="text-sm text-muted-foreground">
                  Você pode prosseguir para preenchimento manual ou editar o destino para adicionar o código IBGE.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Navigation for step 4 */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={handlePreviousStep}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar
                </Button>
                <Button onClick={handleNextStep}>
                  {validatedDataCount > 0 
                    ? `Continuar (${validatedDataCount} validados)` 
                    : 'Pular para Preenchimento Manual'}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {(() => {
                const step = WORKFLOW_STEPS.find(s => s.id === currentStep);
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
              {WORKFLOW_STEPS.find(s => s.id === currentStep)?.description}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Step 1: Scope & Type */}
            {currentStep === 1 && (
              <div className="space-y-6">
                {/* Diagnostic Type Selector - Only show if org has enterprise access */}
                {hasEnterpriseAccess && (
                  <>
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        Selecione o tipo de diagnóstico que deseja realizar.
                      </p>
                    </div>
                    
                    <div>
                      <Label className="text-sm font-medium mb-3 block">Tipo de Diagnóstico</Label>
                      <RadioGroup
                        value={diagnosticType}
                        onValueChange={(value) => setDiagnosticType(value as DiagnosticType)}
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
                          "flex flex-col items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all text-center",
                          diagnosticType === 'enterprise' 
                            ? "border-amber-500 bg-amber-50 dark:bg-amber-950/30" 
                            : "border-muted hover:border-muted-foreground/50"
                        )}>
                          <RadioGroupItem value="enterprise" id="enterprise" className="sr-only" />
                          <Label htmlFor="enterprise" className="cursor-pointer space-y-3">
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
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>
                  </>
                )}
                
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
                  onValueChange={(value) => setVisibility(value as VisibilityType)}
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

                  {/* Demo option - only shown when in demo mode */}
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
                    onClick={() => setDestinationMode('select')}
                    className="flex-1"
                  >
                    Selecionar existente
                  </Button>
                  <Button
                    variant={destinationMode === 'create' ? 'default' : 'outline'}
                    onClick={() => {
                      setDestinationMode('create');
                      setIsDestinationFormOpen(true);
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
                    <Select value={selectedDestination} onValueChange={setSelectedDestination}>
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
                          onClick={() => setIsDestinationFormOpen(true)}
                        >
                          Criar outro destino
                        </Button>
                      </div>
                    ) : (
                      <div className="p-4 bg-muted/50 rounded-lg text-center">
                        <p className="text-sm text-muted-foreground mb-3">
                          Clique no botão abaixo para criar um novo destino com busca automática no IBGE.
                        </p>
                        <Button onClick={() => setIsDestinationFormOpen(true)}>
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
                    onChange={(e) => setAssessmentTitle(e.target.value)}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Período início (opcional)</Label>
                    <Input
                      type="date"
                      value={periodStart}
                      onChange={(e) => setPeriodStart(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Período fim (opcional)</Label>
                    <Input
                      type="date"
                      value={periodEnd}
                      onChange={(e) => setPeriodEnd(e.target.value)}
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
                    onValueChange={(value) => setSelectedTier(value as DiagnosisTier)}
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
                  <h4 className="font-medium mb-2">Calcular diagnóstico</h4>
                  <p className="text-sm text-muted-foreground">
                    Após preencher os dados, você poderá calcular o diagnóstico na página de detalhes.
                    O sistema irá:
                  </p>
                  <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                    <li>• Normalizar os indicadores</li>
                    <li>• Calcular scores dos pilares (RA, OE, AO)</li>
                    <li>• Identificar gargalos</li>
                    <li>• Gerar prescrições de capacitação</li>
                  </ul>
                </div>
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
                onClick={handlePreviousStep}
                disabled={currentStep === 1}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
              <Button
                onClick={handleNextStep}
                disabled={!canProceed() || createDestination.isPending || createAssessment.isPending}
              >
                {(createDestination.isPending || createAssessment.isPending) && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                {currentStep < 5 ? 'Continuar' : 'Ir para ' + WORKFLOW_STEPS[currentStep - 1].title}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Destination Form Dialog */}
      <DestinationFormDialog
        open={isDestinationFormOpen}
        onOpenChange={setIsDestinationFormOpen}
        onSubmit={handleCreateDestination}
      />
    </AppLayout>
  );
}
