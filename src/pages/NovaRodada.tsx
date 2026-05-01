import { useState, useEffect, useRef } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Badge } from '@/components/ui/badge';
import {
  MapPin,
  ClipboardList,
  Database as DatabaseIcon,
  FileText,
  CheckCircle2,
  Loader2,
  Shield,
  Calculator,
  Users,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDestinations } from '@/hooks/useDestinations';
import { useAssessments } from '@/hooks/useAssessments';
import { toast } from '@/hooks/use-toast';
import { DestinationFormDialog } from '@/components/destinations/DestinationFormDialog';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { ExternalIndicatorValue, useCreateDataSnapshot, useExternalIndicatorValues } from '@/hooks/useOfficialData';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { NovaRodadaForm } from './NovaRodadaForm';
import { NovaRodadaDialogs } from './NovaRodadaDialogs';

type VisibilityType = 'organization' | 'personal' | 'demo';
type DiagnosisTier = 'COMPLETE' | 'MEDIUM' | 'SMALL';
type DiagnosticType = 'territorial' | 'enterprise';

const OFFICIAL_COLLECTION_METHODS: ExternalIndicatorValue['collection_method'][] = ['AUTOMATIC', 'BATCH'];

interface WorkflowStep {
  id: number;
  title: string;
  description: string;
  icon: React.ElementType;
}

const WORKFLOW_STEPS: WorkflowStep[] = [
  { id: 1, title: 'Escopo', description: 'Definir visibilidade', icon: Users },
  { id: 2, title: 'Destino', description: 'Selecione ou crie um destino', icon: MapPin },
  { id: 3, title: 'Diagnóstico', description: 'Configure a rodada de avaliação', icon: ClipboardList },
  { id: 4, title: 'Pré-preenchimento', description: 'Validar dados oficiais', icon: Shield },
  { id: 5, title: 'Preenchimento', description: 'Complementar dados manualmente', icon: DatabaseIcon },
  { id: 6, title: 'Cálculo', description: 'Processar diagnóstico', icon: Calculator },
  { id: 7, title: 'Relatório', description: 'Gerar plano de desenvolvimento', icon: FileText },
];

export default function NovaRodada() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const resumeAssessmentId = searchParams.get('resume');
  const typeParam = searchParams.get('type');
  
  const { user } = useAuth();
  const { isViewingDemoData, profile: userProfile } = useProfile();
  const [currentStep, setCurrentStepRaw] = useState(1);
  const [maxStepReached, setMaxStepReached] = useState(1);
  
  const setCurrentStep = (step: number) => {
    setCurrentStepRaw(step);
    setMaxStepReached(prev => Math.max(prev, step));
  };
  const [diagnosticType, setDiagnosticType] = useState<DiagnosticType>(typeParam === 'enterprise' ? 'enterprise' : 'territorial');
  const [visibility, setVisibility] = useState<VisibilityType>('organization');
  const [destinationMode, setDestinationMode] = useState<'select' | 'create'>('select');
  const [selectedDestination, setSelectedDestination] = useState<string>('');
  const [isDestinationFormOpen, setIsDestinationFormOpen] = useState(false);
  const [assessmentTitle, setAssessmentTitle] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [selectedTier, setSelectedTier] = useState<DiagnosisTier>('COMPLETE');
  const [expandWithMandala, setExpandWithMandala] = useState<boolean>(false);
  const [createdAssessmentId, setCreatedAssessmentId] = useState<string | null>(null);
  const [validatedDataCount, setValidatedDataCount] = useState(0);
  const [isResuming, setIsResuming] = useState(!!resumeAssessmentId);
  const [resumeDataLoaded, setResumeDataLoaded] = useState(false);
  // Ensure the "Diagnóstico carregado" toast only fires once per resume mount,
  // even if the effect re-runs while the destinations/indicator-count queries
  // settle.
  const resumeToastShownRef = useRef(false);
  
  const { data: orgData } = useQuery({
    queryKey: ['org-enterprise-access', userProfile?.org_id],
    queryFn: async () => {
      if (!userProfile?.org_id) return null;
      const { data, error } = await supabase.from('orgs').select('org_type, has_enterprise_access').eq('id', userProfile.org_id).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!userProfile?.org_id,
  });
  
  const hasEnterpriseAccess = orgData?.has_enterprise_access === true;

  // Warn the user (once) if they arrive at the wizard with ?type=enterprise
  // but their org doesn't actually have enterprise access. Previously the
  // wizard silently coerced the type to 'territorial' with no feedback.
  useEffect(() => {
    if (typeParam === 'enterprise' && orgData !== undefined && !hasEnterpriseAccess) {
      toast({
        title: 'Diagnóstico enterprise indisponível',
        description: 'Sua organização ainda não tem acesso ao diagnóstico enterprise. Fluxo territorial selecionado.',
        variant: 'destructive',
      });
    }
    // We only want this to fire when the org-data query first resolves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeParam, orgData]);

  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: resumeAssessment, isLoading: resumeLoading } = useQuery({
    queryKey: ['resume-assessment', resumeAssessmentId],
    queryFn: async () => {
      if (!resumeAssessmentId) return null;
      const { data, error } = await supabase.from('assessments').select('*, destinations(*)').eq('id', resumeAssessmentId).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!resumeAssessmentId,
  });

  // Count indicator values already saved for the assessment we're resuming.
  // Previously the resume logic only considered *external validated* values,
  // so a user who had already filled in manual indicators was kicked back to
  // the Validation step (step 4). Reading the saved count lets us jump them
  // straight to the Fill step (5) or further.
  const { data: resumeIndicatorCount } = useQuery({
    queryKey: ['resume-assessment-indicator-count', resumeAssessmentId],
    queryFn: async () => {
      if (!resumeAssessmentId) return 0;
      const { count, error } = await supabase
        .from('indicator_values')
        .select('id', { count: 'exact', head: true })
        .eq('assessment_id', resumeAssessmentId);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!resumeAssessmentId,
  });

  const { destinations = [], isLoading: destinationsLoading, createDestination } = useDestinations();
  const { createAssessment } = useAssessments();
  const createDataSnapshot = useCreateDataSnapshot();

  const selectedDestinationData = destinations.find(d => d.id === selectedDestination);
  const effectiveOrgId = profile?.viewing_demo_org_id || profile?.org_id;
  
  const { data: existingValidatedValues } = useExternalIndicatorValues(
    selectedDestinationData?.ibge_code || undefined,
    effectiveOrgId || undefined
  );
  
  const validatedValuesCount = existingValidatedValues?.filter(
    v => v.validated && OFFICIAL_COLLECTION_METHODS.includes(v.collection_method)
  )?.length || 0;

  useEffect(() => {
    setValidatedDataCount(validatedValuesCount);
  }, [validatedValuesCount]);

  // Load resume data
  useEffect(() => {
    // Wait for the indicator count query to resolve so we don't mis-place the
    // user on the stepper (e.g. kicking them back to Validation when they've
    // already saved manual indicator values).
    if (resumeAssessmentId && resumeIndicatorCount === undefined) return;
    if (resumeAssessment && !resumeDataLoaded && destinations.length > 0) {
      setCreatedAssessmentId(resumeAssessment.id);
      setSelectedDestination(resumeAssessment.destination_id);
      setAssessmentTitle(resumeAssessment.title);
      setVisibility(resumeAssessment.visibility as VisibilityType);
      setSelectedTier((resumeAssessment.tier as DiagnosisTier) || 'COMPLETE');
      setExpandWithMandala(Boolean((resumeAssessment as any).expand_with_mandala));
      setPeriodStart(resumeAssessment.period_start || '');
      setPeriodEnd(resumeAssessment.period_end || '');

      // Determine the furthest step the user has reached, using both the
      // assessment lifecycle status and any indicator values that are already
      // persisted. This avoids sending someone back to re-validate official
      // data that's already been saved, and also lets CALCULATED diagnostics
      // jump directly to the report step.
      const savedIndicatorCount = resumeIndicatorCount ?? 0;
      const status = resumeAssessment.status as string | null;
      let resumeStep = 4;
      if (status === 'CALCULATED') {
        resumeStep = 7;
      } else if (status === 'DATA_READY') {
        resumeStep = 6;
      } else if (savedIndicatorCount > 0 || validatedValuesCount > 0) {
        resumeStep = 5;
      }

      setCurrentStep(resumeStep);
      if (validatedValuesCount > 0) {
        setValidatedDataCount(validatedValuesCount);
      }
      setResumeDataLoaded(true);
      setIsResuming(false);
      if (!resumeToastShownRef.current) {
        resumeToastShownRef.current = true;
        toast({ title: 'Diagnóstico carregado', description: `Retomando "${resumeAssessment.title}" de onde você parou.` });
      }
    }
  }, [resumeAssessment, resumeDataLoaded, destinations, validatedValuesCount, resumeIndicatorCount]);

  // Auto-generate title
  useEffect(() => {
    if (selectedDestination && !resumeAssessmentId) {
      const dest = destinations.find(d => d.id === selectedDestination);
      if (dest && !assessmentTitle) {
        setAssessmentTitle(`Diagnóstico ${dest.name} ${new Date().getFullYear()}`);
      }
    }
  }, [selectedDestination, destinations, resumeAssessmentId, assessmentTitle]);

  const handleValidationComplete = async (validatedValues: ExternalIndicatorValue[]) => {
    setValidatedDataCount(validatedValues.length);
    const effectiveOrgId = profile?.viewing_demo_org_id || profile?.org_id;
    if (!createdAssessmentId || !effectiveOrgId) {
      toast({ title: 'Dados validados', description: `${validatedValues.length} indicadores validados e pré-preenchidos no formulário.` });
      return;
    }

    await createDataSnapshot.mutateAsync({ assessmentId: createdAssessmentId, values: validatedValues, orgId: effectiveOrgId });

    try {
      const codes = validatedValues.map(v => v.indicator_code);
      const { data: indicatorRows, error: indErr } = await supabase.from('indicators').select('id, code').in('code', codes);
      if (indErr) throw indErr;
      if (indicatorRows && indicatorRows.length > 0) {
        const codeToId = new Map(indicatorRows.map(r => [r.code, r.id]));
        const { data: assessmentRow } = await supabase
          .from('assessments')
          .select('org_id')
          .eq('id', createdAssessmentId)
          .maybeSingle();
        const valueOrgId = assessmentRow?.org_id || effectiveOrgId;
        const valuesToInsert = validatedValues
          .filter(v => v.raw_value !== null && codeToId.has(v.indicator_code))
          .map(v => ({
            assessment_id: createdAssessmentId,
            indicator_id: codeToId.get(v.indicator_code)!,
            value_raw: Number(v.raw_value),
            source: `Pré-preenchido (${v.source_code})`,
            org_id: valueOrgId,
            reference_date: v.reference_year ? `${v.reference_year}-01-01` : null,
          }));
        if (valuesToInsert.length > 0) {
          const { error } = await supabase
            .from('indicator_values')
            .upsert(valuesToInsert, { onConflict: 'assessment_id,indicator_id' });
          if (error) throw error;
        }
      }
      toast({ title: 'Dados validados', description: `${validatedValues.length} indicadores validados e pré-preenchidos no formulário.` });
    } catch (err) {
      console.error('Error injecting validated values into indicator_values:', err);
      toast({
        title: 'Validação salva com falha parcial',
        description: err instanceof Error ? err.message : 'Alguns indicadores não puderam ser pré-preenchidos.',
        variant: 'destructive',
      });
    }
  };

  const handleNextStep = async () => {
    if (currentStep === 1) { setCurrentStep(2); }
    else if (currentStep === 2) {
      if (!selectedDestination) { toast({ title: 'Selecione um destino', variant: 'destructive' }); return; }
      setCurrentStep(3);
    } else if (currentStep === 3) {
      if (!assessmentTitle.trim()) { toast({ title: 'Informe o título do diagnóstico', variant: 'destructive' }); return; }
      if (periodStart && periodEnd && new Date(periodStart) > new Date(periodEnd)) {
        toast({ title: 'Período inválido', description: 'A data de início deve ser anterior ou igual à data de fim.', variant: 'destructive' });
        return;
      }
      if (createAssessment.isPending) return; // Guard against double-click creating duplicate assessments.
      try {
        const result = await createAssessment.mutateAsync({
          title: assessmentTitle.trim(), destination_id: selectedDestination, period_start: periodStart || null,
          period_end: periodEnd || null, visibility, tier: selectedTier, diagnostic_type: diagnosticType,
          expand_with_mandala: expandWithMandala,
        });
        setCreatedAssessmentId(result.id);
        // Write the assessment id to the URL so a refresh at any later step
        // resumes via the existing `?resume=` flow instead of restarting the
        // wizard from step 1.
        const params = new URLSearchParams(searchParams);
        params.set('resume', result.id);
        setSearchParams(params, { replace: true });
        toast({ title: 'Diagnóstico criado com sucesso!' });
        setCurrentStep(4);
      } catch (error) {
        toast({ title: 'Erro ao criar diagnóstico', variant: 'destructive' });
        return;
      }
    } else if (currentStep === 4) { setCurrentStep(5); }
    else if (currentStep === 5) { setCurrentStep(6); }
    else if (currentStep === 6) { navigate(`/diagnosticos/${createdAssessmentId}`); }
    else if (currentStep === 7) { navigate(`/relatorios?assessment=${createdAssessmentId}`); }
  };

  const handlePreviousStep = () => { if (currentStep > 1) setCurrentStep(currentStep - 1); };

  const handleCreateDestination = async (data: { name: string; uf: string; ibge_code?: string | null; latitude?: number | null; longitude?: number | null }) => {
    const result = await createDestination.mutateAsync({ ...data, visibility });
    setSelectedDestination(result.id);
    setDestinationMode('select');
    toast({ title: 'Destino criado com sucesso!' });
  };

  const canProceed = () => {
    if (currentStep === 1) return true;
    if (currentStep === 2) return !!selectedDestination;
    if (currentStep === 3) return !!assessmentTitle && !!selectedDestination;
    return true;
  };

  if (resumeLoading || (isResuming && !resumeDataLoaded && resumeIndicatorCount === undefined)) {
    return (
      <AppLayout title="Carregando Diagnóstico" subtitle="Preparando para retomar de onde você parou...">
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
      {resumeAssessmentId && resumeAssessment && (() => {
        const status = (resumeAssessment.status as string | null) ?? 'DRAFT';
        const statusLabel = status === 'CALCULATED'
          ? 'Calculado'
          : status === 'DATA_READY'
            ? 'Dados Prontos'
            : 'Rascunho';
        const statusVariant: 'calculated' | 'ready' | 'draft' = status === 'CALCULATED'
          ? 'calculated'
          : status === 'DATA_READY'
            ? 'ready'
            : 'draft';
        const heading = status === 'CALCULATED'
          ? 'Revisitando diagnóstico concluído'
          : status === 'DATA_READY'
            ? 'Retomando diagnóstico com dados prontos'
            : 'Retomando diagnóstico em rascunho';
        return (
          <div className="mb-6 p-4 rounded-lg border bg-primary/5 border-primary/20">
            <div className="flex items-center gap-3">
              <RefreshCw className="h-5 w-5 text-primary" />
              <div className="flex-1">
                <p className="font-medium text-primary">{heading}</p>
                <p className="text-sm text-muted-foreground">
                  {resumeAssessment.title} • {(resumeAssessment.destinations as any)?.name}
                </p>
              </div>
              <Badge variant={statusVariant}>{statusLabel}</Badge>
            </div>
          </div>
        );
      })()}

      {/* Visual Stepper — horizontal on desktop, vertical on mobile */}
      {/* Desktop horizontal stepper */}
      <div className="mb-8 overflow-x-auto pb-4 hidden md:block">
        <div className="flex items-center justify-between relative min-w-[700px]">
          <div className="absolute top-6 left-0 right-0 h-1 bg-muted" />
          <div 
            className="absolute top-6 left-0 h-1 bg-primary transition-all duration-500"
            style={{ width: `${((currentStep - 1) / (WORKFLOW_STEPS.length - 1)) * 100}%` }}
          />
          {WORKFLOW_STEPS.map((step) => {
            const Icon = step.icon;
            const isCompleted = step.id < currentStep;
            const isCurrent = step.id === currentStep;
            const isUpcoming = step.id > currentStep;
            const isClickable = step.id <= maxStepReached && step.id !== currentStep;
            return (
              <button
                key={step.id}
                type="button"
                disabled={!isClickable}
                onClick={() => isClickable && setCurrentStep(step.id)}
                aria-label={`Etapa ${step.id}: ${step.title} — ${step.description}`}
                aria-current={isCurrent ? 'step' : undefined}
                className={cn(
                  "relative flex flex-col items-center z-10 bg-transparent border-none p-0",
                  isClickable && "cursor-pointer group"
                )}
              >
                <div className={cn(
                  'w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300',
                  isCompleted && 'bg-primary text-primary-foreground',
                  isCurrent && 'bg-primary text-primary-foreground ring-4 ring-primary/30',
                  isUpcoming && !isClickable && 'bg-muted text-muted-foreground',
                  isUpcoming && isClickable && 'bg-muted text-muted-foreground',
                  isClickable && 'group-hover:ring-2 group-hover:ring-primary/40'
                )}>
                  {isCompleted ? <CheckCircle2 className="h-6 w-6" /> : <Icon className="h-5 w-5" />}
                </div>
                <div className="mt-2 text-center">
                  <p className={cn(
                    'text-sm font-medium',
                    isCurrent && 'text-primary',
                    isUpcoming && !isClickable && 'text-muted-foreground',
                    isClickable && 'group-hover:text-primary transition-colors'
                  )}>{step.title}</p>
                  <p className="text-xs text-muted-foreground">{step.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Mobile vertical stepper */}
      <div className="mb-6 md:hidden">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-medium text-muted-foreground">Etapa {currentStep} de {WORKFLOW_STEPS.length}</span>
          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${(currentStep / WORKFLOW_STEPS.length) * 100}%` }}
            />
          </div>
        </div>
        <div className="space-y-1">
          {WORKFLOW_STEPS.map((step) => {
            const Icon = step.icon;
            const isCompleted = step.id < currentStep;
            const isCurrent = step.id === currentStep;
            const isUpcoming = step.id > currentStep;
            const isClickable = step.id <= maxStepReached && step.id !== currentStep;
            // On mobile, only show current step, adjacent steps, and completed steps compactly
            if (isUpcoming && step.id > currentStep + 1 && step.id !== WORKFLOW_STEPS.length) return null;
            return (
              <button
                key={step.id}
                type="button"
                disabled={!isClickable}
                onClick={() => isClickable && setCurrentStep(step.id)}
                aria-label={`Etapa ${step.id}: ${step.title}`}
                aria-current={isCurrent ? 'step' : undefined}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all',
                  isCurrent && 'bg-primary/10 border border-primary/30',
                  isCompleted && 'opacity-70',
                  isUpcoming && !isClickable && 'opacity-40',
                  isClickable && 'active:bg-muted',
                )}
              >
                <div className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all',
                  isCompleted && 'bg-primary text-primary-foreground',
                  isCurrent && 'bg-primary text-primary-foreground',
                  isUpcoming && 'bg-muted text-muted-foreground',
                )}>
                  {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    'text-sm font-medium truncate',
                    isCurrent && 'text-primary',
                    isUpcoming && 'text-muted-foreground',
                  )}>{step.title}</p>
                  {isCurrent && <p className="text-xs text-muted-foreground">{step.description}</p>}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      {currentStep === 4 || currentStep === 5 ? (
        <NovaRodadaDialogs
          currentStep={currentStep}
          diagnosticType={diagnosticType}
          selectedDestinationData={selectedDestinationData}
          selectedTier={selectedTier}
          createdAssessmentId={createdAssessmentId}
          validatedDataCount={validatedDataCount}
          orgId={effectiveOrgId || null}
          expandWithMandala={expandWithMandala}
          onSetCurrentStep={setCurrentStep}
          onPreviousStep={handlePreviousStep}
          onNextStep={handleNextStep}
          onValidationComplete={handleValidationComplete}
          resumeAssessmentId={resumeAssessmentId}
          resumeAssessment={resumeAssessment}
        />
      ) : (
        <NovaRodadaForm
          currentStep={currentStep}
          diagnosticType={diagnosticType}
          onDiagnosticTypeChange={setDiagnosticType}
          visibility={visibility}
          onVisibilityChange={setVisibility}
          destinationMode={destinationMode}
          onDestinationModeChange={setDestinationMode}
          selectedDestination={selectedDestination}
          onSelectedDestinationChange={setSelectedDestination}
          destinations={destinations}
          selectedDestinationData={selectedDestinationData}
          assessmentTitle={assessmentTitle}
          onAssessmentTitleChange={setAssessmentTitle}
          periodStart={periodStart}
          onPeriodStartChange={setPeriodStart}
          periodEnd={periodEnd}
          onPeriodEndChange={setPeriodEnd}
          selectedTier={selectedTier}
          onSelectedTierChange={setSelectedTier}
          expandWithMandala={expandWithMandala}
          onExpandWithMandalaChange={setExpandWithMandala}
          validatedDataCount={validatedDataCount}
          isViewingDemoData={isViewingDemoData}
          hasEnterpriseAccess={hasEnterpriseAccess}
          workflowSteps={WORKFLOW_STEPS}
          onOpenDestinationForm={() => setIsDestinationFormOpen(true)}
          onNextStep={handleNextStep}
          onPreviousStep={handlePreviousStep}
          canProceed={canProceed()}
          isPending={createDestination.isPending || createAssessment.isPending}
          createdAssessmentId={createdAssessmentId}
          onNavigateToCalculation={() => navigate(`/diagnosticos/${createdAssessmentId}`)}
          onNavigateToReport={() => navigate(`/relatorios?assessment=${createdAssessmentId}`)}
        />
      )}

      <DestinationFormDialog
        open={isDestinationFormOpen}
        onOpenChange={setIsDestinationFormOpen}
        onSubmit={handleCreateDestination}
      />
    </AppLayout>
  );
}
