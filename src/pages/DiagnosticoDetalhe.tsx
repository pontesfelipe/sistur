import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { PillarGauge } from '@/components/dashboard/PillarGauge';
import { IssueCard } from '@/components/dashboard/IssueCard';
import { NormalizationView } from '@/components/dashboard/NormalizationView';
import { IndicatorScoresView } from '@/components/dashboard/IndicatorScoresView';
import { IssuesView } from '@/components/dashboard/IssuesView';
import { EduRecommendationsPanel } from '@/components/dashboard/EduRecommendationsPanel';
import { IGMAWarningsPanel } from '@/components/dashboard/IGMAWarningsPanel';
import { CreateProjectFromDiagnosticView } from '@/components/dashboard/CreateProjectFromDiagnosticView';
import { CommentsPanel } from '@/components/discussions/CommentsPanel';
import { EnterpriseCategoriesView } from '@/components/dashboard/EnterpriseCategoriesView';
import { PreCalculationChecklist } from '@/components/diagnostics/PreCalculationChecklist';
import { DataProvenancePanel } from '@/components/diagnostics/DataProvenancePanel';
import { AssessmentAuditTrail } from '@/components/diagnostics/AssessmentAuditTrail';
import { DiagnosticProgressDashboard } from '@/components/diagnostics/DiagnosticProgressDashboard';
import { RoundComparisonView } from '@/components/diagnostics/RoundComparisonView';
import { PrescriptionModeView } from '@/components/diagnostics/PrescriptionModeView';
import { DataValidationPanel } from '@/components/official-data/DataValidationPanel';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  ArrowLeft,
  Download,
  Calculator,
  MapPin,
  Calendar,
  BarChart3,
  AlertTriangle,
  GraduationCap,
  Loader2,
  FileText,
  RotateCcw,
  PlusCircle,
  Edit,
  FolderKanban,
  Database,
  Hotel,
  Layers,
  EyeOff,
  BookOpen,
  RefreshCw,
  Target,
  MessageSquare,
} from 'lucide-react';
import { useCalculateAssessment } from '@/hooks/useCalculateAssessment';
import { useAssessments } from '@/hooks/useAssessments';
import { useIndicators } from '@/hooks/useIndicators';
import {
  useAssessment,
  usePillarScores,
  useIndicatorScores,
  useIssues,
  useRecommendations,
} from '@/hooks/useAssessmentData';
import { useIndicatorValues } from '@/hooks/useIndicators';
import { useFetchOfficialData, useExternalIndicatorValues, useValidateIndicatorValues, useDiagnosisDataSnapshots } from '@/hooks/useOfficialData';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import type { Pillar, Severity, TerritorialInterpretation } from '@/types/sistur';
import { PILLAR_INFO, SEVERITY_INFO } from '@/types/sistur';
import { toast } from 'sonner';
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

import { useQuery } from '@tanstack/react-query';

const normalizeDisplayScore = (
  value: number | null | undefined,
  minRef: number | null | undefined,
  maxRef: number | null | undefined,
  direction: string | null | undefined,
  normalization: string | null | undefined,
) => {
  if (value === null || value === undefined) return 0;

  if (normalization === 'BINARY') {
    return value > 0 ? 1 : 0;
  }

  if (normalization === 'BANDS') {
    if (value <= 0.3) return 0.2;
    if (value <= 0.5) return 0.5;
    if (value <= 0.7) return 0.8;
    return 1;
  }

  const min = minRef ?? 0;
  const max = maxRef ?? 100;

  if (max === min) return 0.5;

  let score = (value - min) / (max - min);
  score = Math.max(0, Math.min(1, score));

  if (direction === 'LOW_IS_BETTER') {
    score = 1 - score;
  }

  return score;
};

const VALID_TABS = ['radiografia', 'categorias', 'normalizacao', 'indicadores', 'gargalos', 'tratamento', 'prescricao', 'projeto'] as const;
type DetalheTab = typeof VALID_TABS[number];

const DiagnosticoDetalhe = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { calculate, loading: calculating } = useCalculateAssessment();
  const { updateAssessment } = useAssessments();
  // Read assessment first to know whether MST extension is enabled
  const { data: assessment, isLoading: loadingAssessment, refetch: refetchAssessment } = useAssessment(id);
  const includeMandala = (assessment as any)?.expand_with_mandala === true;
  const { indicators } = useIndicators({ includeMandala });
  const { indicators: enterpriseIndicators = [] } = useIndicators({ scope: 'enterprise', includeMandala });
  const { user } = useAuth();
  const [isPreFillOpen, setIsPreFillOpen] = useState(false);
  const [orgId, setOrgId] = useState<string | undefined>();

  // Active tab is mirrored in the URL (?tab=...) so browser Back/Forward and
  // deep links from other pages (e.g. "Ver relatório" CTAs) land on the right
  // tab instead of resetting to "Radiografia".
  const tabFromUrl = searchParams.get('tab') as DetalheTab | null;
  const activeTab: DetalheTab = tabFromUrl && VALID_TABS.includes(tabFromUrl) ? tabFromUrl : 'radiografia';
  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value === 'radiografia') params.delete('tab');
    else params.set('tab', value);
    setSearchParams(params, { replace: true });
  };

  // Modo Prescrição: filtra todas as visualizações para mostrar apenas
  // indicadores em Atenção/Crítico (gatilhos de prescrição EDU).
  const prescriptionModeFromUrl = searchParams.get('prescription') === '1';
  const [prescriptionMode, setPrescriptionMode] = useState(prescriptionModeFromUrl);
  const togglePrescriptionMode = (enabled: boolean) => {
    setPrescriptionMode(enabled);
    const params = new URLSearchParams(searchParams);
    if (enabled) params.set('prescription', '1');
    else params.delete('prescription');
    setSearchParams(params, { replace: true });
  };

  // Check if report exists for this assessment (including kb_file_ids)
  const { data: existingReport } = useQuery({
    queryKey: ['report-exists', id],
    queryFn: async () => {
      if (!id) return null;
      const { data } = await supabase.from('generated_reports').select('id, kb_file_ids').eq('assessment_id', id).maybeSingle();
      return data;
    },
    enabled: !!id,
  });

  // Fetch KB file names used in this report
  const reportKbFileIds = (existingReport as any)?.kb_file_ids as string[] | null;
  const { data: kbFilesUsed = [] } = useQuery({
    queryKey: ['kb-files-used', reportKbFileIds],
    queryFn: async () => {
      if (!reportKbFileIds || reportKbFileIds.length === 0) return [];
      const { data } = await supabase.from('knowledge_base_files').select('id, file_name, category').in('id', reportKbFileIds);
      return data || [];
    },
    enabled: !!reportKbFileIds && reportKbFileIds.length > 0,
  });

  // Check if projects exist for this assessment
  const { data: existingProjects } = useQuery({
    queryKey: ['projects-exist', id],
    queryFn: async () => {
      if (!id) return null;
      const { data } = await supabase.from('projects').select('id').eq('assessment_id', id as string).limit(1);
      return data;
    },
    enabled: !!id,
  });

  // Fetch org_id for current user
  useEffect(() => {
    const fetchOrgId = async () => {
      if (!user?.id) return;
      const { data } = await supabase.from('profiles').select('org_id').eq('user_id', user.id).single();
      if (data) setOrgId(data.org_id);
    };
    fetchOrgId();
  }, [user?.id]);

  // Diagnostic type derived from assessment (loaded above)
  const diagnosticType = (assessment as any)?.diagnostic_type || 'territorial';
  const isEnterprise = diagnosticType === 'enterprise';
  
  const { data: pillarScores = [], refetch: refetchPillarScores } = usePillarScores(id);
  const { data: rawIndicatorScores = [], refetch: refetchIndicatorScores } = useIndicatorScores(id, diagnosticType);
  const { data: rawIssues = [], refetch: refetchIssues } = useIssues(id);
  const { data: rawRecommendations = [], refetch: refetchRecommendations } = useRecommendations(id);
  const { data: auditRows = [] } = useQuery({
    queryKey: ['assessment-indicator-audit', id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase
        .from('assessment_indicator_audit')
        .select('indicator_code, source_type, source_detail')
        .eq('assessment_id', id);
      if (error) {
        console.warn('Não foi possível carregar auditoria de procedência:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!id,
  });
  
  // Use appropriate indicator values based on diagnostic type
  const { values: territorialIndicatorValues = [] } = useIndicatorValues(id);
  // Enterprise values are stored in the unified `indicator_values` table as well.
  const indicatorValues = territorialIndicatorValues;

  // --- Ignored indicators filtering ---
  const ignoredIndicatorIds = useMemo(() => {
    const ids = new Set<string>();
    indicatorValues.forEach((v: any) => {
      if (v.is_ignored) ids.add(v.indicator_id);
    });
    return ids;
  }, [indicatorValues]);

  const ignoredIndicators = useMemo(() => {
    return indicatorValues.filter((v: any) => v.is_ignored).map((v: any) => ({
      code: v.indicator?.code || '',
      name: v.indicator?.name || '',
      pillar: v.indicator?.pillar || '',
      reason: v.ignore_reason || '',
    }));
  }, [indicatorValues]);

  // Filter out ignored indicators from results
  const indicatorScores = useMemo(() => {
    if (ignoredIndicatorIds.size === 0) return rawIndicatorScores;
    return rawIndicatorScores.filter((s: any) => !ignoredIndicatorIds.has(s.indicator_id));
  }, [rawIndicatorScores, ignoredIndicatorIds]);

  // Prescription mode filter: only Atenção/Crítico indicators (score ≤ 0.66)
  const displayedIndicatorScores = useMemo(() => {
    if (!prescriptionMode) return indicatorScores;
    return indicatorScores.filter((s: any) => s.score <= 0.66);
  }, [indicatorScores, prescriptionMode]);

  // Build set of ignored indicator codes for filtering issues/recommendations
  const ignoredIndicatorCodes = useMemo(() => {
    return new Set(ignoredIndicators.map(i => i.code));
  }, [ignoredIndicators]);

  // Filter issues: remove issues whose evidence indicators are ALL ignored
  const issues = useMemo(() => {
    if (ignoredIndicatorCodes.size === 0) return rawIssues;
    return rawIssues.filter((issue: any) => {
      const evidence = issue.evidence;
      if (!evidence?.indicators || !Array.isArray(evidence.indicators)) return true;
      // Keep the issue if at least one indicator in its evidence is NOT ignored
      const hasActiveIndicator = evidence.indicators.some(
        (ind: any) => !ignoredIndicatorCodes.has(ind.code)
      );
      return hasActiveIndicator;
    });
  }, [rawIssues, ignoredIndicatorCodes]);

  // Issues displayed honor prescription mode (only Atenção/Crítico already by definition,
  // but we still filter out non-critical/atencao here for safety).
  const displayedIssues = useMemo(() => {
    if (!prescriptionMode) return issues;
    return issues.filter(
      (i: any) => i.severity === 'CRITICO' || i.severity === 'ATENCAO'
    );
  }, [issues, prescriptionMode]);

  // Filter recommendations: remove those linked to filtered-out issues
  const filteredIssueIds = useMemo(() => new Set(issues.map((i: any) => i.id)), [issues]);
  const recommendations = useMemo(() => {
    if (ignoredIndicatorCodes.size === 0) return rawRecommendations;
    return rawRecommendations.filter((rec: any) => {
      // Keep if no linked issue, or if linked issue is still in the filtered set
      if (!rec.issue?.id) return true;
      return filteredIssueIds.has(rec.issue.id);
    });
  }, [rawRecommendations, ignoredIndicatorCodes, filteredIssueIds]);

  // Official data hooks - destination info
  const assessmentDestination = assessment?.destination as { name?: string; uf?: string; ibge_code?: string } | null;
  const ibgeCode = assessmentDestination?.ibge_code;
  
  const { data: externalValues = [], isLoading: loadingExternalValues } = useExternalIndicatorValues(ibgeCode, orgId);
  const { data: diagnosisSnapshots = [] } = useDiagnosisDataSnapshots(id);
  const fetchOfficialData = useFetchOfficialData();
  const validateIndicatorValues = useValidateIndicatorValues();

  // Calculate data completeness based on diagnostic type - exclude ignored
  const activeIndicatorValues = indicatorValues.filter((v: any) => !v.is_ignored);
  const indicatorCatalogByCode = useMemo(() => {
    const catalog = new Map<string, any>();

    indicators.forEach((indicator: any) => {
      if (indicator?.code) catalog.set(indicator.code, indicator);
    });

    enterpriseIndicators.forEach((indicator: any) => {
      if (indicator?.code) catalog.set(indicator.code, indicator);
    });

    indicatorValues.forEach((value: any) => {
      if (value.indicator?.code) catalog.set(value.indicator.code, value.indicator);
    });

    return catalog;
  }, [indicators, enterpriseIndicators, indicatorValues]);

  const normalizationIndicatorValues = useMemo(() => {
    if (diagnosisSnapshots.length === 0) return activeIndicatorValues;

    return diagnosisSnapshots
      .map((snapshot: any) => {
        const matchedIndicator = indicatorCatalogByCode.get(snapshot.indicator_code);

        return matchedIndicator
          ? {
              indicator_id: matchedIndicator.id,
              value_raw: snapshot.value_used,
              source: snapshot.source_code,
              reference_date: snapshot.reference_year ? `${snapshot.reference_year}-01-01` : null,
            }
          : null;
      })
      .filter(Boolean);
  }, [diagnosisSnapshots, activeIndicatorValues, indicatorCatalogByCode]);

  const normalizationIndicatorScores = useMemo(() => {
    if (diagnosisSnapshots.length === 0) return indicatorScores;

    const existingScoresByCode = new Map(
      indicatorScores
        .filter((score: any) => score.indicator?.code)
        .map((score: any) => [score.indicator.code, score])
    );

    return diagnosisSnapshots
      .map((snapshot: any) => {
        const existingScore = existingScoresByCode.get(snapshot.indicator_code);
        if (existingScore) return existingScore;

        const matchedIndicator = indicatorCatalogByCode.get(snapshot.indicator_code);
        if (!matchedIndicator) return null;

        return {
          id: `snapshot-${snapshot.indicator_code}`,
          indicator_id: matchedIndicator.id,
          score: normalizeDisplayScore(
            snapshot.value_used,
            matchedIndicator.min_ref,
            matchedIndicator.max_ref,
            matchedIndicator.direction,
            matchedIndicator.normalization,
          ),
          min_ref_used: matchedIndicator.min_ref ?? null,
          max_ref_used: matchedIndicator.max_ref ?? null,
          weight_used: matchedIndicator.weight ?? null,
          indicator: matchedIndicator,
        };
      })
      .filter(Boolean);
  }, [diagnosisSnapshots, indicatorScores, indicatorCatalogByCode]);
  const totalIndicators = isEnterprise
    ? (enterpriseIndicators.length || indicators.length)
    : indicators.length;
  const filledIndicators = activeIndicatorValues.length;
  const completenessPercentage = totalIndicators > 0 ? (filledIndicators / totalIndicators) * 100 : 0;
  const hasIncompleteData = completenessPercentage < 100 && completenessPercentage > 0;

  // Auto-promote DRAFT to DATA_READY when there's sufficient data
  useEffect(() => {
    if (!assessment || assessment.status !== 'DRAFT' || !id) return;
    if (filledIndicators === 0 || completenessPercentage < 50) return;
    if (updateAssessment.isPending) return;
    updateAssessment.mutate({ id, status: 'DATA_READY' });
  }, [assessment?.status, id, filledIndicators, completenessPercentage]);

  const handleCalculate = async () => {
    if (!id) return;
    const result = await calculate(id);
    if (result) {
      // Refetch all data after calculation
      refetchAssessment();
      refetchPillarScores();
      refetchIndicatorScores();
      refetchIssues();
      refetchRecommendations();
    }
  };

  const handleExportCSV = () => {
    if (!assessment || pillarScores.length === 0) {
      toast.error('Nenhum dado para exportar');
      return;
    }

    const rows: string[] = [];
    rows.push('Tipo,Pilar,Tema,Score,Severidade');

    // Pillar scores
    pillarScores.forEach((ps: any) => {
      rows.push(`Pilar,${ps.pillar},,${ps.score},${ps.severity}`);
    });

    // Indicator scores
    indicatorScores.forEach((is: any) => {
      const ind = is.indicator;
      rows.push(`Indicador,${ind?.pillar || ''},${ind?.name || ''},${is.score},`);
    });

    // Issues
    issues.forEach((issue: any) => {
      rows.push(`Gargalo,${issue.pillar},${issue.theme},,${issue.severity}`);
    });

    const csvContent = '\uFEFF' + rows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `diagnostico-${assessment.title.replace(/\s+/g, '-')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exportado com sucesso!');
  };

  const handleResetToDraft = async () => {
    if (!id) return;
    try {
      await updateAssessment.mutateAsync({ id, status: 'DRAFT' });
      toast.success('Diagnóstico voltou para rascunho. Você pode editar os dados.');
      refetchAssessment();
    } catch (error) {
      toast.error('Erro ao resetar diagnóstico');
    }
  };

  if (loadingAssessment) {
    return (
      <AppLayout title="Carregando...">
        <div className="space-y-6">
          <Skeleton className="h-32 w-full" />
          <div className="grid grid-cols-3 gap-6">
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!assessment) {
    return (
      <AppLayout title="Diagnóstico não encontrado">
        <div className="text-center py-16">
          <p className="text-muted-foreground">
            O diagnóstico solicitado não foi encontrado.
          </p>
          <Button className="mt-4" asChild>
            <Link to="/diagnosticos">Voltar para diagnósticos</Link>
          </Button>
        </div>
      </AppLayout>
    );
  }

  const isCalculated = assessment.status === 'CALCULATED';

  // Find critical pillar
  const criticalPillar = pillarScores.length > 0
    ? pillarScores.reduce((prev, current) =>
        current.score < prev.score ? current : prev
      )
    : null;

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  const statusVariants = {
    DRAFT: 'draft',
    DATA_READY: 'ready',
    CALCULATED: 'calculated',
  } as const;

  const statusLabels = {
    DRAFT: 'Rascunho',
    DATA_READY: 'Dados Prontos',
    CALCULATED: 'Calculado',
  };

  return (
    <AppLayout
      title={assessment.title}
      subtitle={assessmentDestination ? `${assessmentDestination.name}, ${assessmentDestination.uf}` : undefined}
    >
      {/* Back button and actions */}
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" asChild>
          <Link to="/diagnosticos">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Link>
        </Button>
        <div className="flex gap-2">
          {isCalculated && (
            <div className="flex items-center gap-2 mr-2 px-3 py-1.5 rounded-lg border bg-card">
              <Target className={cn("h-4 w-4", prescriptionMode ? "text-primary" : "text-muted-foreground")} />
              <Label htmlFor="prescription-mode" className="text-sm cursor-pointer">
                Modo Prescrição
              </Label>
              <Switch
                id="prescription-mode"
                checked={prescriptionMode}
                onCheckedChange={togglePrescriptionMode}
              />
            </div>
          )}
          {/* Edit / Reset to Draft */}
          {isCalculated && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline">
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Editar Dados
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Voltar para edição?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Isso irá mudar o status do diagnóstico para "Rascunho" e você poderá editar os dados dos indicadores. 
                    Após as alterações, será necessário recalcular os índices.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleResetToDraft}>
                    Sim, voltar para edição
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          
          {!isCalculated && (
            <>
              {/* Pre-fill button with Sheet */}
              <Sheet open={isPreFillOpen} onOpenChange={setIsPreFillOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" disabled={!ibgeCode}>
                    <Database className="mr-2 h-4 w-4" />
                    Pré-preencher
                  </Button>
                </SheetTrigger>
                <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle>Pré-preenchimento de Dados Oficiais</SheetTitle>
                    <SheetDescription>
                      Busque e valide dados de fontes oficiais para preencher automaticamente os indicadores
                    </SheetDescription>
                  </SheetHeader>
                  <div className="mt-6">
                    <DataValidationPanel
                      ibgeCode={ibgeCode || ''}
                      orgId={orgId || ''}
                      destinationName={assessmentDestination?.name || ''}
                      assessmentId={id}
                      includeMandala={includeMandala}
                      onValidationComplete={() => {
                        toast.success('Dados validados com sucesso!');
                        setIsPreFillOpen(false);
                      }}
                    />
                  </div>
                </SheetContent>
              </Sheet>
              
              <Button variant="outline" asChild>
                <Link to={`/diagnosticos?tab=importacao&assessment=${id}`}>
                  <Edit className="mr-2 h-4 w-4" />
                  Preencher Dados
                </Link>
              </Button>
              <div className="relative group">
                <Button onClick={handleCalculate} disabled={calculating || filledIndicators === 0}>
                  {calculating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Calculando...
                    </>
                  ) : (
                    <>
                      <Calculator className="mr-2 h-4 w-4" />
                      Calcular Índices
                    </>
                  )}
                </Button>
                {filledIndicators === 0 && (
                  <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs bg-popover text-popover-foreground border rounded px-2 py-1 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                    Preencha ao menos um indicador para habilitar o cálculo
                  </span>
                )}
              </div>
            </>
          )}
          {isCalculated && (
            <>
              <Button variant="outline" asChild>
                <Link to={`/relatorios?assessment=${id}`}>
                  <FileText className="mr-2 h-4 w-4" />
                  Gerar Relatório
                </Link>
              </Button>
              <Button variant="outline" onClick={handleExportCSV}>
                <Download className="mr-2 h-4 w-4" />
                Exportar CSV
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Incomplete Data Warning */}
      {isCalculated && hasIncompleteData && (
        <Card className="mb-6 border-accent bg-accent/5">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-accent/10">
                  <PlusCircle className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="font-medium text-sm">Dados podem ser enriquecidos</p>
                  <p className="text-xs text-muted-foreground">
                    {filledIndicators} de {totalIndicators} indicadores preenchidos ({Math.round(completenessPercentage)}%). 
                    Adicionar mais dados pode melhorar a precisão do diagnóstico.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Progress value={completenessPercentage} className="w-24 h-2" />
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      Adicionar dados
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Adicionar mais dados?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Para adicionar mais dados, o diagnóstico voltará ao status de rascunho e você poderá preencher os indicadores faltantes.
                        Após as alterações, será necessário recalcular os índices.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={handleResetToDraft}>
                        Sim, adicionar dados
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* KB Files Used Notice */}
      {isCalculated && kbFilesUsed.length > 0 && (
        <Card className="mb-6 border-primary/20 bg-primary/5">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">Documentos da Base de Conhecimento utilizados</p>
                <p className="text-xs text-muted-foreground mt-0.5 mb-2">
                  Os seguintes arquivos foram considerados na geração do relatório deste diagnóstico:
                </p>
                <div className="flex flex-wrap gap-2">
                  {kbFilesUsed.map((f: any) => (
                    <Badge key={f.id} variant="outline" className="text-xs">
                      <FileText className="h-3 w-3 mr-1" />
                      {f.file_name}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Para atualizar com novos documentos, gere o relatório novamente.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Diagnostic Progress Dashboard */}
      <DiagnosticProgressDashboard
        status={assessment.status}
        hasIndicatorValues={indicatorValues.length > 0}
        hasReport={!!existingReport}
        hasProjects={!!existingProjects && existingProjects.length > 0}
      />

      {/* Stale banner: dados oficiais atualizados após o último cálculo */}
      {isCalculated && (assessment as any).needs_recalculation && (
        <div className="my-6 p-4 rounded-xl border border-amber-500/40 bg-amber-50/50 dark:bg-amber-950/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-amber-700 dark:text-amber-300">
                Dados oficiais atualizados após o último cálculo
              </p>
              <p className="text-sm text-muted-foreground mt-0.5">
                Novos valores de fontes oficiais (IBGE, CADASTUR, STN, MTur) chegaram para este município. Recalcule para incorporá-los.
              </p>
            </div>
          </div>
          <Button onClick={handleCalculate} disabled={calculating} className="shrink-0">
            {calculating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Recalcular agora
          </Button>
        </div>
      )}

      {/* Header Card */}
      <div className="bg-card rounded-xl border p-6 mb-6">
        <div className="flex flex-wrap gap-6 items-start justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Badge variant={statusVariants[assessment.status as keyof typeof statusVariants]}>
                {statusLabels[assessment.status as keyof typeof statusLabels]}
              </Badge>
              <span className="text-sm text-muted-foreground">
                Versão do algoritmo: {assessment.algo_version}
              </span>
            </div>

            <div className="flex flex-wrap gap-6">
              {assessmentDestination && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {assessmentDestination.name}, {assessmentDestination.uf}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>
                  {formatDate(assessment.period_start)} —{' '}
                  {formatDate(assessment.period_end)}
                </span>
              </div>
            </div>
          </div>

          {isCalculated && (
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Calculado em</p>
              <p className="font-medium">{formatDate(assessment.calculated_at)}</p>
            </div>
          )}
        </div>
      </div>

      {/* Ignored Indicators Banner */}
      {ignoredIndicators.length > 0 && isCalculated && (
        <Card className="mb-6 border-muted bg-muted/30">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <EyeOff className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">
                  {ignoredIndicators.length} indicador{ignoredIndicators.length !== 1 ? 'es' : ''} ignorado{ignoredIndicators.length !== 1 ? 's' : ''} nesta análise
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Os seguintes indicadores foram marcados como ignorados e não participam do cálculo dos scores, gargalos ou prescrições. 
                  Isso pode impactar a abrangência da análise.
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {ignoredIndicators.map((ind, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs font-normal opacity-70">
                      {ind.code} — {ind.name}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {isCalculated && pillarScores.length > 0 ? (
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className={cn(
            "grid w-full",
            isEnterprise ? "max-w-5xl grid-cols-8" : "max-w-4xl grid-cols-7"
          )}>
            <TabsTrigger value="radiografia" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Radiografia</span>
            </TabsTrigger>
            {isEnterprise && (
              <TabsTrigger value="categorias" className="gap-2">
                <Layers className="h-4 w-4" />
                <span className="hidden sm:inline">Categorias</span>
              </TabsTrigger>
            )}
            <TabsTrigger value="normalizacao" className="gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Normalização</span>
            </TabsTrigger>
            <TabsTrigger value="indicadores" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Indicadores</span>
            </TabsTrigger>
            <TabsTrigger value="gargalos" className="gap-2">
              <AlertTriangle className="h-4 w-4" />
              <span className="hidden sm:inline">Gargalos</span>
            </TabsTrigger>
            <TabsTrigger value="tratamento" className="gap-2">
              <GraduationCap className="h-4 w-4" />
              <span className="hidden sm:inline">Tratamento</span>
            </TabsTrigger>
            <TabsTrigger value="prescricao" className="gap-2">
              <Target className="h-4 w-4" />
              <span className="hidden sm:inline">Prescrição</span>
            </TabsTrigger>
            <TabsTrigger value="projeto" className="gap-2">
              <FolderKanban className="h-4 w-4" />
              <span className="hidden sm:inline">Projeto</span>
            </TabsTrigger>
          </TabsList>

          {/* Radiografia Tab */}
          <TabsContent value="radiografia" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {pillarScores.map((ps) => (
                <PillarGauge
                  key={ps.id}
                  pillar={ps.pillar as Pillar}
                  score={ps.score}
                  severity={ps.severity as Severity}
                  isCritical={criticalPillar && ps.pillar === criticalPillar.pillar}
                />
              ))}
            </div>

            {/* IGMA Warnings Panel */}
            {assessment.igma_interpretation && (
              <IGMAWarningsPanel 
                igmaInterpretation={assessment.igma_interpretation as any}
                nextReviewRecommendedAt={assessment.next_review_recommended_at ?? undefined}
                marketingBlocked={assessment.marketing_blocked ?? undefined}
                externalityWarning={assessment.externality_warning ?? undefined}
                raLimitation={(assessment as any).ra_limitation ?? undefined}
                governanceBlock={(assessment as any).governance_block ?? undefined}
              />
            )}

            {/* Summary */}
            <div className="bg-card rounded-xl border p-6">
              <h3 className="text-lg font-display font-semibold mb-4">
                Resumo do Diagnóstico
              </h3>
              <div className="prose prose-sm max-w-none text-muted-foreground">
                <p>
                  O destino <strong>{assessmentDestination?.name}</strong>{' '}
                  apresenta como <strong>ponto crítico</strong> o pilar{' '}
                  <strong className="text-severity-critical">
                    {criticalPillar?.pillar === 'RA'
                      ? 'Relações Ambientais (IRA)'
                      : criticalPillar?.pillar === 'OE'
                      ? 'Organização Estrutural (IOE)'
                      : 'Ações Operacionais (IAO)'}
                  </strong>{' '}
                  com score de{' '}
                  <strong>{Math.round((criticalPillar?.score || 0) * 100)}%</strong>.
                </p>
                <p>
                  Foram identificados <strong>{issues.length} gargalos</strong>{' '}
                  principais, dos quais{' '}
                  <strong>
                    {issues.filter((i) => i.severity === 'CRITICO').length} são
                    críticos
                  </strong>
                  . O sistema recomenda{' '}
                  <strong>{recommendations.length} cursos de capacitação</strong>{' '}
                  para endereçar os problemas identificados.
                </p>
              </div>
            </div>

            {/* Round Comparison */}
            {assessment.destination_id && (
              <RoundComparisonView
                assessmentId={id!}
                destinationId={assessment.destination_id}
                currentPillarScores={pillarScores}
              />
            )}
          </TabsContent>

          {/* Categorias Enterprise Tab - Only for enterprise diagnostics */}
          {isEnterprise && (
            <TabsContent value="categorias" className="space-y-6">
              <div className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 rounded-xl border border-amber-500/20 p-6 mb-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-amber-500/20">
                    <Hotel className="h-6 w-6 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="font-display font-semibold text-foreground">
                      Categorias Enterprise
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Visão consolidada por categorias: Performance, Sustentabilidade, Governança e mais
                    </p>
                  </div>
                </div>
              </div>
              <EnterpriseCategoriesView indicatorScores={indicatorScores as any} />
            </TabsContent>
          )}

          {/* Normalização Tab - SISTUR Add-on Required */}
          <TabsContent value="normalizacao">
            <NormalizationView 
              indicatorScores={normalizationIndicatorScores as any} 
              indicatorValues={normalizationIndicatorValues as any}
            />
          </TabsContent>

          {/* Indicadores Tab */}
          <TabsContent value="indicadores" className="space-y-6">
            <DataProvenancePanel indicatorValues={indicatorValues as any} auditRows={auditRows as any} />
            {prescriptionMode && (
              <Alert>
                <Target className="h-4 w-4" />
                <AlertTitle>Modo Prescrição ativo</AlertTitle>
                <AlertDescription>
                  Exibindo apenas indicadores em Atenção ou Crítico
                  ({displayedIndicatorScores.length} de {indicatorScores.length}).
                </AlertDescription>
              </Alert>
            )}
            <IndicatorScoresView indicatorScores={displayedIndicatorScores as any} />
            {assessment?.id && assessment?.calculated_at && (
              <AssessmentAuditTrail assessmentId={assessment.id} />
            )}
          </TabsContent>

          {/* Gargalos Tab */}
          <TabsContent value="gargalos" className="space-y-4">
            <IssuesView issues={displayedIssues as any} />
          </TabsContent>

          {/* Tratamento Tab */}
          <TabsContent value="tratamento" className="space-y-6">
            <div className="bg-gradient-to-br from-accent/10 to-accent/5 rounded-xl border border-accent/20 p-6 mb-4">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-accent/20">
                  <GraduationCap className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-foreground">
                    SISTUR EDU — Plano de Capacitação
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Prescrições automáticas baseadas nos indicadores críticos e em atenção
                  </p>
                </div>
              </div>
            </div>

            {/* EDU Recommendations Panel - Now uses prescriptions from DB */}
            <EduRecommendationsPanel indicatorScores={displayedIndicatorScores as any} assessmentId={id} />
          </TabsContent>

          {/* Prescrição Tab — visão consolidada */}
          <TabsContent value="prescricao" className="space-y-6">
            <PrescriptionModeView assessmentId={id!} indicatorScores={indicatorScores as any} />
          </TabsContent>

          {/* Projeto Tab */}
          <TabsContent value="projeto">
            <CreateProjectFromDiagnosticView assessmentId={id!} destinationId={assessment?.destination_id} />
          </TabsContent>
        </Tabs>
      ) : (
        /* Pre-calculation state */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-card rounded-xl border p-8 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Calculator className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-display font-semibold mb-2">
              {assessment.status === 'DRAFT'
                ? 'Preencha os dados para calcular'
                : 'Dados prontos para cálculo'}
            </h3>
            <p className="text-muted-foreground max-w-md mx-auto mb-6">
              {assessment.status === 'DRAFT'
                ? 'Complete o preenchimento dos indicadores via formulário ou importe um arquivo CSV com os dados.'
                : 'Todos os dados foram preenchidos. Clique no botão abaixo para calcular os índices e gerar o diagnóstico.'}
            </p>
          <div className="flex gap-3 justify-center">
            {assessment.status === 'DRAFT' && (
              <>
                <Button variant="default" asChild>
                  <Link to={`/nova-rodada?resume=${id}`}>
                    Continuar Fluxo Guiado
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link to={`/diagnosticos?tab=importacao&assessment=${id}`}>
                    Ir direto para Preenchimento
                  </Link>
                </Button>
              </>
            )}
            <Button onClick={handleCalculate} disabled={calculating || filledIndicators === 0}>
              {calculating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Calculando...
                </>
              ) : (
                <>
                  <Calculator className="mr-2 h-4 w-4" />
                  Calcular Índices
                </>
              )}
            </Button>
          </div>
          </div>
          
          {/* Pre-calculation checklist sidebar */}
          <div className="lg:col-span-1">
            <PreCalculationChecklist
              indicators={isEnterprise ? enterpriseIndicators : indicators}
              indicatorValues={indicatorValues}
              tier={(assessment as any).tier}
              isEnterprise={isEnterprise}
            />
          </div>
        </div>
      )}
    </AppLayout>
  );
};

export default DiagnosticoDetalhe;
