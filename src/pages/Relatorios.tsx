import { useState, useRef, useEffect, type RefObject } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { exportReportAsDocx } from '@/lib/exportReportDocx';
import { getStatusStyle, mapIndicatorTableColumns, normalizeStatusCellText, realignIndicatorRow } from '@/lib/reportStatusStyle';
import { useSearchParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAssessments } from '@/hooks/useAssessments';
import { useDestinations } from '@/hooks/useDestinations';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { APP_VERSION } from '@/config/version';
import { 
  FileText, 
  Sparkles, 
  Download, 
  Loader2,
  MapPin,
  AlertTriangle,
  RefreshCw,
  History,
  Trash2,
  Calendar,
  Settings2,
  Lock,
  Users,
  FlaskConical,
  Filter,
  Building2,
  Globe,
  X
} from 'lucide-react';
import { ReportCustomizationDialog, loadCustomization, type ReportCustomization } from '@/components/reports/ReportCustomizationDialog';
import { ReportValidationBanner } from '@/components/reports/ReportValidationBanner';
import { useReportJobWatcher, ensureNotificationPermission } from '@/hooks/useReportJobWatcher';

const REPORT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-report`;

function useAssessmentDetails(assessmentId: string | undefined) {
  return useQuery({
    queryKey: ['assessment-details', assessmentId],
    queryFn: async () => {
      if (!assessmentId) return null;
      
      const [pillarScoresRes, issuesRes, prescriptionsRes] = await Promise.all([
        supabase.from('pillar_scores').select('*').eq('assessment_id', assessmentId),
        supabase.from('issues').select('*').eq('assessment_id', assessmentId),
        supabase.from('prescriptions').select('*').eq('assessment_id', assessmentId),
      ]);
      
      return {
        pillarScores: pillarScoresRes.data ?? [],
        issues: issuesRes.data ?? [],
        prescriptions: prescriptionsRes.data ?? [],
      };
    },
    enabled: !!assessmentId,
  });
}

interface GeneratedReport {
  id: string;
  org_id: string;
  assessment_id: string;
  destination_name: string;
  report_content: string;
  created_at: string;
  visibility: string;
  environment: string;
  created_by: string;
  diagnostic_type: string;
  tier: string | null;
  ai_provider?: string | null;
  ai_model?: string | null;
}

type GeneratedReportBase = Omit<GeneratedReport, 'diagnostic_type' | 'tier'>;
type AssessmentMeta = { id: string; diagnostic_type: string | null; tier: string | null };
type AssessmentDisplayMeta = {
  diagnostic_type?: string | null;
  tier?: string | null;
  destinations?: { name?: string | null } | null;
  creator?: { full_name?: string | null } | null;
};

const normalizeReportTier = (tier?: string | null) => {
  const value = (tier || '').toLowerCase();
  if (value === 'small' || value === 'essencial') return 'essencial';
  if (value === 'medium' || value === 'estrategico' || value === 'estratégico') return 'estrategico';
  if (value === 'complete' || value === 'integral') return 'integral';
  return null;
};

const getReportTierLabel = (tier?: string | null) => {
  const normalized = normalizeReportTier(tier);
  if (normalized === 'essencial') return '⚡ Essencial';
  if (normalized === 'estrategico') return '📊 Estratégico';
  if (normalized === 'integral') return '🎯 Integral';
  return null;
};

const getProviderLabel = (provider?: string | null, model?: string | null) => {
  if (!provider && !model) return null;
  const p = (provider || '').toLowerCase();
  if (p === 'claude') return 'Claude';
  if (p === 'gpt5' || p === 'gpt-5') return 'GPT-5';
  if (p === 'gemini') return 'Gemini';
  if (model) return model.split('/').pop() || model;
  return provider || null;
};

function useGeneratedReports(userId?: string, orgId?: string, effectiveOrgId?: string) {
  return useQuery({
    queryKey: ['generated-reports', userId, orgId, effectiveOrgId],
    queryFn: async () => {
      const reportOrgIds = Array.from(new Set([orgId, effectiveOrgId].filter(Boolean))) as string[];
      let query = supabase
        .from('generated_reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (reportOrgIds.length > 0) {
        query = query.in('org_id', reportOrgIds);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      const reports = (data ?? []) as GeneratedReportBase[];
      const assessmentIds = Array.from(new Set(reports.map((r) => r.assessment_id).filter(Boolean))) as string[];
      const assessmentMetaById = new Map<string, { diagnostic_type?: string | null; tier?: string | null }>();

      if (assessmentIds.length > 0) {
        const { data: assessmentRows, error: assessmentError } = await supabase
          .from('assessments')
          .select('id, diagnostic_type, tier')
          .in('id', assessmentIds);

        if (assessmentError) {
          console.warn('Não foi possível carregar metadados dos diagnósticos para o histórico:', assessmentError);
        } else {
          ((assessmentRows ?? []) as AssessmentMeta[]).forEach((a) => {
            assessmentMetaById.set(a.id, { diagnostic_type: a.diagnostic_type, tier: a.tier });
          });
        }
      }

      return reports.map((r) => ({
        ...r,
        diagnostic_type: assessmentMetaById.get(r.assessment_id)?.diagnostic_type ?? 'territorial',
        tier: assessmentMetaById.get(r.assessment_id)?.tier ?? null,
      })) as GeneratedReport[];
    },
    enabled: Boolean(userId && (orgId || effectiveOrgId)),
  });
}

export default function Relatorios() {
  const [searchParams] = useSearchParams();
  const assessmentFromUrl = searchParams.get('assessment');
  const queryClient = useQueryClient();
  const { track: trackReportJob } = useReportJobWatcher();
  
  const { assessments, isLoading: assessmentsLoading } = useAssessments();
  const { destinations } = useDestinations();
  const { isAdmin, isViewingDemoData, profile, effectiveOrgId, loading: profileLoading } = useProfile();
  const { data: savedReports, isLoading: reportsLoading, error: reportsError, refetch: refetchReports } = useGeneratedReports(profile?.user_id, profile?.org_id, effectiveOrgId);
  
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>('');
  const [report, setReport] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('generate');
  const [selectedHistoryReport, setSelectedHistoryReport] = useState<GeneratedReport | null>(null);
  const [reportTemplate, setReportTemplate] = useState<string>('completo');
  const [reportVisibility, setReportVisibility] = useState<string>('personal');
  const [runInDemo, setRunInDemo] = useState(false);
  // GAP-FIX (v1.38.18): Comparação temporal agora é OPT-IN.
  const [enableComparison, setEnableComparison] = useState(false);
  // v1.38.35 — Seletor de provedor de IA (apenas ADMIN). 'auto' = cadeia padrão Claude→GPT-5→Gemini.
  const [aiProvider, setAiProvider] = useState<'auto' | 'claude' | 'gpt5' | 'gemini'>('auto');
  const reportRef = useRef<HTMLDivElement>(null);
  const historyReportRef = useRef<HTMLDivElement>(null);
  const [customizationOpen, setCustomizationOpen] = useState(false);
  const [reportCustomization, setReportCustomization] = useState<ReportCustomization>(loadCustomization);
  const [historyTypeFilter, setHistoryTypeFilter] = useState<string>('all');
  const [historyOwnerFilter, setHistoryOwnerFilter] = useState<string>('all');
  const [historyTierFilter, setHistoryTierFilter] = useState<string>('all');
  const [genTypeFilter, setGenTypeFilter] = useState<string>('all');
  const [genTierFilter, setGenTierFilter] = useState<string>('all');
  const [genDestFilter, setGenDestFilter] = useState<string>('all');
  // Watchdog para evitar UI travada quando o stream SSE para de responder.
  // No modo background (v1.38.31) usamos uma flag para parar o polling local —
  // o servidor continua finalizando a geração mesmo se o usuário "cancelar".
  const cancelGenerationRef = useRef<boolean>(false);
  const [generationStage, setGenerationStage] = useState<string>('');
  const [generationElapsed, setGenerationElapsed] = useState<number>(0);
  // v1.38.65 — Buffer do markdown parcial publicado pela edge function
  // (`report_jobs.partial_content`) durante o pipeline paralelo do Claude.
  // Permite renderizar o relatório aparecendo seção a seção (RA → OE → AO →
  // envelope) em vez de só no final. É descartado quando o relatório final
  // é carregado de `generated_reports`.
  const [livePartial, setLivePartial] = useState<string>('');
  const [generationProgressPct, setGenerationProgressPct] = useState<number>(0);

  // Timer visual durante a geração (se segura ≥30s sem chunk, mostra aviso).
  useEffect(() => {
    if (!isGenerating) {
      setGenerationElapsed(0);
      return;
    }
    const start = Date.now();
    const id = window.setInterval(() => {
      setGenerationElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => window.clearInterval(id);
  }, [isGenerating]);

  const cancelGeneration = () => {
    cancelGenerationRef.current = true;
  };

  // Pre-select assessment from URL parameter
  useEffect(() => {
    if (assessmentFromUrl && assessments?.length) {
      const exists = assessments.some(a => a.id === assessmentFromUrl && a.status === 'CALCULATED');
      if (exists) {
        setSelectedAssessmentId(assessmentFromUrl);
      }
    }
  }, [assessmentFromUrl, assessments]);

  const selectedAssessment = assessments?.find(a => a.id === selectedAssessmentId);
  // Use destination from useDestinations first; fall back to the joined destination data
  // from the assessment itself (handles cross-org destinations not visible via RLS)
  const selectedAssessmentMeta = selectedAssessment as typeof selectedAssessment & AssessmentDisplayMeta;
  const selectedDestination = destinations?.find(d => d.id === selectedAssessment?.destination_id)
    ?? (selectedAssessment ? {
      id: selectedAssessment.destination_id,
      name: selectedAssessmentMeta?.destinations?.name || 'Destino',
      uf: null as string | null,
    } : undefined);
  
  const { data: assessmentDetails } = useAssessmentDetails(selectedAssessmentId || undefined);
  const pillarScores = assessmentDetails?.pillarScores;
  const issues = assessmentDetails?.issues;
  const prescriptions = assessmentDetails?.prescriptions;

  const calculatedAssessments = assessments?.filter(a => a.status === 'CALCULATED') || [];
  const visibleSavedReports = (savedReports ?? []).filter((r) => {
    if (r.visibility === 'personal' && r.created_by !== profile?.user_id) return false;
    return true;
  });
  const filteredSavedReports = visibleSavedReports.filter((r) => {
    if (historyTypeFilter !== 'all' && r.diagnostic_type !== historyTypeFilter) return false;
    if (historyTierFilter !== 'all' && normalizeReportTier(r.tier) !== historyTierFilter) return false;
    if (historyOwnerFilter === 'mine' && r.created_by !== profile?.user_id) return false;
    return true;
  });
  const hasActiveHistoryFilters = historyTypeFilter !== 'all' || historyTierFilter !== 'all' || historyOwnerFilter !== 'all';
  const isHistoryLoading = profileLoading || reportsLoading;
  const hasSavedReportForSelected = Boolean(
    selectedAssessmentId && visibleSavedReports.some((r) => r.assessment_id === selectedAssessmentId),
  );

  const filteredCalculatedAssessments = calculatedAssessments.filter(a => {
    const meta = a as typeof a & AssessmentDisplayMeta;
    if (genTypeFilter !== 'all') {
      const type = meta.diagnostic_type || 'territorial';
      if (genTypeFilter !== type) return false;
    }
    if (genTierFilter !== 'all') {
      const tier = meta.tier || 'SMALL';
      const tierMap: Record<string, string> = { essencial: 'SMALL', estrategico: 'MEDIUM', integral: 'COMPLETE' };
      if (tier !== tierMap[genTierFilter]) return false;
    }
    if (genDestFilter !== 'all') {
      if (a.destination_id !== genDestFilter) return false;
    }
    return true;
  });

  const generateReport = async (forceRegenerate = false) => {
    if (!selectedAssessmentId || !selectedDestination) {
      toast.error('Selecione um diagnóstico calculado');
      return;
    }

    // Get current session for authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      toast.error('Você precisa estar autenticado para gerar relatórios');
      return;
    }

    setIsGenerating(true);
    setReport('');
    setGenerationStage('Enfileirando geração…');
    setLivePartial('');
    setGenerationProgressPct(0);
    cancelGenerationRef.current = false;

    // v1.38.55 — Pede permissão de Notification de forma silenciosa.
    // Se o usuário aceitar, receberá um aviso do navegador quando o job
    // terminar mesmo se a aba estiver em background ou minimizada.
    void ensureNotificationPermission();

    const pillarScoresMap: Record<string, { score: number; severity: string }> = {};
    pillarScores?.forEach(ps => {
      pillarScoresMap[ps.pillar] = { score: ps.score, severity: ps.severity };
    });

    // v1.38.31 — Modo BACKGROUND: a edge function cria um job em report_jobs,
    // responde 202 com { jobId } imediatamente e processa via
    // EdgeRuntime.waitUntil. O front faz polling em report_jobs até
    // status 'completed' ou 'failed' — sem manter conexão SSE longa,
    // imune a timeouts de proxy/aba/rede.
    const POLL_INTERVAL_MS = 4_000;
    // v1.38.59 — Mantém acompanhamento até o teto técnico do worker. Se passar
    // disso, mostramos falha explícita em vez de uma mensagem neutra que deixava
    // a impressão de processamento infinito.
    // v1.38.55 — Aumentado de 10min → 15min porque relatórios completos
    // (template "completo" com 100+ indicadores) podem levar até ~7min só
    // na chamada de IA (Claude). O watcher global em background continua
    // observando o job mesmo se este loop terminar antes — então o teto
    // aqui não é fatal, é só o limite do feedback inline na tela.
    const POLL_DEADLINE_MS = 16 * 60 * 1000;

    try {
      const resp = await fetch(REPORT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          assessmentId: selectedAssessmentId,
          destinationName: selectedDestination.name,
          pillarScores: pillarScoresMap,
          issues: issues || [],
          prescriptions: prescriptions || [],
          forceRegenerate,
          reportTemplate,
          visibility: reportVisibility,
          environment: runInDemo ? 'demo' : 'production',
          enableComparison,
          mode: 'background',
          // v1.38.45 — sempre envia a versão atual do app para que o
          // validador (`report_validations.validator_version`) reflita
          // a versão vigente do sistema, evitando confusão com validações
          // antigas vinculadas ao mesmo diagnóstico.
          appVersion: `v${APP_VERSION.full}`,
          ...(isAdmin && aiProvider !== 'auto' ? { aiProvider } : {}),
        }),
      });

      if (!resp.ok) {
        const errorData = await resp.json();
        throw new Error(errorData.error || 'Erro ao gerar relatório');
      }

      const enqueued = await resp.json();
      // Caso o backend tenha pulado (não há dados novos) — mantém atalho.
      if (enqueued?.skipped) {
        toast.info(enqueued.message || 'Não há dados novos. Use "Regenerar" para forçar.', { duration: 5000 });
        const { data: existing } = await supabase
          .from('generated_reports')
          .select('report_content')
          .eq('assessment_id', selectedAssessmentId)
          .maybeSingle();
        if (existing?.report_content) setReport(existing.report_content);
        return;
      }
      const jobId = enqueued?.jobId as string | undefined;
      if (!jobId) throw new Error('Servidor não retornou um identificador de job.');

      // v1.38.55 — Registra o job no watcher global. Mesmo que o usuário
      // feche a página de Relatórios, mude de aba ou recarregue a app,
      // o watcher continuará observando o job em background e mostrará
      // toast + Notification quando concluir/falhar.
      trackReportJob(jobId, selectedAssessmentId, selectedDestination.name);

      setGenerationStage('Geração em andamento no servidor…');

      // Polling do job. O job é atualizado pelo background task da edge function.
      const pollDeadline = Date.now() + POLL_DEADLINE_MS;
      let finalReportId: string | null = null;
      let lastStage = '';
      let lastPartialLen = 0;
      while (Date.now() < pollDeadline) {
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
        if (cancelGenerationRef.current) {
          toast.info('Acompanhamento cancelado. A geração continua no servidor — confira o histórico em alguns minutos.');
          return;
        }
        const { data: job } = await supabase
          .from('report_jobs')
          .select('status, stage, progress_pct, report_id, error_message, partial_content')
          .eq('id', jobId)
          .maybeSingle();
        if (!job) continue;
        if (job.stage && job.stage !== lastStage) {
          lastStage = job.stage;
          setGenerationStage(`${job.stage}${job.progress_pct ? ` (${job.progress_pct}%)` : ''}`);
        }
        if (typeof job.progress_pct === 'number') {
          setGenerationProgressPct(job.progress_pct);
        }
        // v1.38.65 — Live preview do markdown parcial. Só atualiza quando
        // o conteúdo cresceu (a edge function publica markdown acumulado
        // por seção; nunca encolhe). Mantemos `report` vazio até o final
        // para preservar o fluxo "salvo de generated_reports".
        const partial = (job as any).partial_content as string | null | undefined;
        if (partial && partial.length > lastPartialLen) {
          lastPartialLen = partial.length;
          setLivePartial(partial);
        }
        if (job.status === 'completed') {
          finalReportId = job.report_id ?? null;
          break;
        }
        if (job.status === 'failed') {
          throw new Error(job.error_message || 'Falha na geração em segundo plano.');
        }
      }
      if (!finalReportId) {
        const { data: stuckJob } = await supabase
          .from('report_jobs')
          .select('status, stage, progress_pct, error_message')
          .eq('id', jobId)
          .maybeSingle();
        if (stuckJob?.status === 'failed') {
          throw new Error(stuckJob.error_message || 'Falha na geração em segundo plano.');
        }
        const stageText = stuckJob?.stage ? ` Última etapa: ${stuckJob.stage}` : '';
        throw new Error(`A geração excedeu o tempo limite sem concluir.${stageText}`);
      }

      // Carrega conteúdo final
      const { data: finalReport } = await supabase
        .from('generated_reports')
        .select('report_content')
        .eq('id', finalReportId)
        .maybeSingle();
      if (finalReport?.report_content) setReport(finalReport.report_content);
      setLivePartial('');
      setGenerationProgressPct(100);

      toast.success('Relatório gerado e salvo com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['generated-reports'] });
      queryClient.invalidateQueries({ queryKey: ['destinations-with-report-data'] });
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao gerar relatório');
      queryClient.invalidateQueries({ queryKey: ['generated-reports'] });
    } finally {
      setGenerationStage('');
      setIsGenerating(false);
      // mantém livePartial limpo; se houve erro antes do final, usuário vê
      // a mensagem de erro normalmente (toast) e o card volta ao empty state.
      setLivePartial('');
      setGenerationProgressPct(0);
    }
  };

  const deleteReport = async (reportId: string) => {
    const { error } = await supabase
      .from('generated_reports')
      .delete()
      .eq('id', reportId);

    if (error) {
      toast.error('Erro ao excluir relatório');
      return;
    }

    toast.success('Relatório excluído');
    queryClient.invalidateQueries({ queryKey: ['generated-reports'] });
    if (selectedHistoryReport?.id === reportId) {
      setSelectedHistoryReport(null);
    }
  };

  // MD download removed

  const downloadPDF = (targetRef: RefObject<HTMLDivElement> = reportRef) => {
    if (!targetRef.current) return;
    
    const content = targetRef.current.innerHTML;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      // Fallback: try iframe approach if popup blocked
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.left = '-9999px';
      iframe.style.width = '800px';
      iframe.style.height = '600px';
      iframe.style.border = 'none';
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentWindow?.document;
      if (!iframeDoc) {
        toast.error('Não foi possível preparar o PDF. Desative o bloqueador de pop-ups.');
        document.body.removeChild(iframe);
        return;
      }

      iframeDoc.open();
      iframeDoc.write(buildPrintHTML(content));
      iframeDoc.close();

      iframe.onload = () => {
        setTimeout(() => {
          try { iframe.contentWindow?.print(); } catch (e) { /* ignore */ }
          setTimeout(() => { document.body.removeChild(iframe); }, 2000);
        }, 300);
      };

      toast.success('Use "Salvar como PDF" na janela de impressão.');
      return;
    }

    printWindow.document.write(buildPrintHTML(content));
    printWindow.document.close();
    printWindow.focus();

    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 300);
    };

    toast.success('Use "Salvar como PDF" na janela de impressão.');
  };

  // PDF/print export: hardcoded hex colors are intentional here because PDFs
  // are rendered in a separate window/iframe and don't support CSS custom
  // properties or dark mode. The generated HTML must be self-contained with
  // fixed colors for consistent print output regardless of the user's theme.
  const buildPrintHTML = (bodyContent: string) => {
    const c = reportCustomization;
    const fontSizeMap = { small: '13px', medium: '15px', large: '17px' };
    const bodyFontSize = fontSizeMap[c.fontSize] || '15px';
    const color = c.primaryColor || '#1E40AF';
    const logoHtml = c.logoUrl ? `<div style="text-align:center;margin-bottom:16px;"><img src="${c.logoUrl}" style="max-height:60px;max-width:200px;" /></div>` : '';
    const orgHtml = c.organizationName ? `<div style="text-align:center;font-size:14px;color:#64748B;margin-bottom:4px;">${c.organizationName}</div>` : '';
    const headerHtml = c.headerText ? `<div style="text-align:center;font-size:12px;color:#94a3b8;border-bottom:1px solid #e2e8f0;padding-bottom:8px;margin-bottom:24px;">${c.headerText}</div>` : '';
    const footerHtml = c.footerText ? `<div style="text-align:center;font-size:11px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:8px;margin-top:24px;">${c.footerText}</div>` : '';
    const notesHtml = c.additionalNotes ? `<div style="margin-top:32px;padding:12px;background:#f8fafc;border-left:3px solid ${color};font-size:12px;color:#64748B;">${c.additionalNotes}</div>` : '';
    return `<!DOCTYPE html>
<html><head><title>Relatório SISTUR</title>
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #1a1a1a; line-height: 1.6; max-width: 800px; margin: 0 auto; font-size: ${bodyFontSize}; }
  h1 { font-size: 24px; color: ${color}; border-bottom: 2px solid ${color}; padding-bottom: 8px; margin-top: 32px; }
  h2 { font-size: 20px; color: ${color}; margin-top: 24px; }
  h3 { font-size: 16px; color: #374151; margin-top: 16px; }
  table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px; }
  th { background: ${color}; color: #ffffff; border: 1px solid ${color}; padding: 8px; text-align: left; font-weight: 600; }
  td { border: 1px solid #cbd5e1; padding: 8px; }
  tr:nth-child(even) { background: #f8fafc; }
  td.status-excelente { background: #D1FADF; color: #054F31; font-weight: 600; text-align: center; }
  td.status-forte     { background: #DBEAFE; color: #1E3A8A; font-weight: 600; text-align: center; }
  td.status-adequado  { background: #FEF3C7; color: #78350F; font-weight: 600; text-align: center; }
  td.status-atencao   { background: #FFEDD5; color: #7C2D12; font-weight: 600; text-align: center; }
  td.status-critico   { background: #FEE2E2; color: #7F1D1D; font-weight: 600; text-align: center; }
  td.status-info      { background: #F1F5F9; color: #334155; font-weight: 600; text-align: center; }
  strong { color: ${color}; }
  hr { border: none; border-top: 1px solid #e2e8f0; margin: 24px 0; }
  ul, ol { padding-left: 24px; }
  li { margin-bottom: 4px; }
  @media print { body { padding: 20px; } @page { margin: 1.5cm; } }
</style>
</head><body>${logoHtml}${orgHtml}${headerHtml}${bodyContent}${notesHtml}${footerHtml}</body></html>`;
  };

  const downloadDocx = async (content: string, destName: string) => {
    if (!content) return;
    try {
      await exportReportAsDocx(content, destName, reportCustomization);
      toast.success('Relatório Word baixado!');
    } catch (err) {
      console.error('Error exporting DOCX:', err);
      toast.error('Erro ao gerar arquivo Word.');
    }
  };

  // Improved markdown renderer with table support
  const renderMarkdown = (text: string) => {
    const primaryColor = reportCustomization.primaryColor || '#1E40AF';
    const statusClassMap: Record<string, string> = {
      EXCELENTE: 'status-excelente',
      FORTE: 'status-forte',
      ADEQUADO: 'status-adequado',
      ATENCAO: 'status-atencao',
      CRITICO: 'status-critico',
      INFORMATIVO: 'status-info',
    };
    // Inline style fallback (used in <td>) so the preview matches the print sheet.
    const statusInlineMap: Record<string, React.CSSProperties> = {
      EXCELENTE: { background: '#D1FADF', color: '#054F31', fontWeight: 600, textAlign: 'center' },
      FORTE:     { background: '#DBEAFE', color: '#1E3A8A', fontWeight: 600, textAlign: 'center' },
      ADEQUADO:  { background: '#FEF3C7', color: '#78350F', fontWeight: 600, textAlign: 'center' },
      ATENCAO:   { background: '#FFEDD5', color: '#7C2D12', fontWeight: 600, textAlign: 'center' },
      CRITICO:   { background: '#FEE2E2', color: '#7F1D1D', fontWeight: 600, textAlign: 'center' },
      INFORMATIVO:{ background: '#F1F5F9', color: '#334155', fontWeight: 600, textAlign: 'center' },
    };
    const lines = text.split('\n');
    const elements: JSX.Element[] = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      // Detect markdown table (line with |)
      if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
        const tableLines: string[] = [];
        while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
          tableLines.push(lines[i]);
          i++;
        }
        if (tableLines.length >= 2) {
          // Parse header
          const parseRow = (row: string) => row.split('|').slice(1, -1).map(c => c.trim());
          const headers = parseRow(tableLines[0]);
          // Skip separator row (row with ---)
          const startRow = tableLines[1].includes('---') ? 2 : 1;
          const colMap = mapIndicatorTableColumns(headers);
          const dataRows = tableLines
            .slice(startRow)
            .map(parseRow)
            .map(r => {
              const aligned = realignIndicatorRow(r, headers, colMap);
              if (colMap.statusIdx >= 0 && aligned[colMap.statusIdx]) {
                aligned[colMap.statusIdx] = normalizeStatusCellText(aligned[colMap.statusIdx]);
              }
              return aligned;
            });

          elements.push(
            <div key={`table-${i}`} className="overflow-x-auto my-4">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr style={{ background: primaryColor }}>
                    {headers.map((h, hi) => (
                      <th
                        key={hi}
                        className="border px-3 py-2 text-left font-semibold"
                        style={{ color: '#ffffff', borderColor: primaryColor }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dataRows.map((row, ri) => (
                    <tr key={ri} className={ri % 2 === 0 ? '' : 'bg-muted/20'}>
                      {row.map((cell, ci) => {
                        const isStatus = ci === colMap.statusIdx && colMap.statusIdx >= 0;
                        const style = isStatus ? getStatusStyle(cell) : null;
                        const key = style ? statusClassMap[
                          (Object.keys(statusClassMap) as Array<keyof typeof statusClassMap>)
                            .find(k => style.label.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').includes(k)) || 'INFORMATIVO'
                        ] : '';
                        const inline = isStatus && style
                          ? statusInlineMap[
                              (Object.keys(statusInlineMap) as Array<keyof typeof statusInlineMap>)
                                .find(k => style.label.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').includes(k)) || 'INFORMATIVO'
                            ]
                          : undefined;
                        return (
                          <td
                            key={ci}
                            className={`border border-border px-3 py-2 ${isStatus ? '' : 'text-muted-foreground'} ${key}`}
                            style={inline}
                            dangerouslySetInnerHTML={{ __html: cell.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}
                          />
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
          continue;
        }
      }

      // Horizontal rule
      if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
        elements.push(<hr key={i} className="my-4 border-border" />);
        i++;
        continue;
      }

      // Headers
      if (line.startsWith('# ')) {
        elements.push(
          <h1
            key={i}
            className="text-2xl font-bold mt-6 mb-3 pb-2 border-b-2"
            style={{ color: primaryColor, borderColor: primaryColor }}
          >
            {line.slice(2)}
          </h1>
        );
        i++; continue;
      }
      if (line.startsWith('## ')) {
        elements.push(
          <h2 key={i} className="text-xl font-semibold mt-5 mb-2" style={{ color: primaryColor }}>
            {line.slice(3)}
          </h2>
        );
        i++; continue;
      }
      if (line.startsWith('### ')) {
        elements.push(<h3 key={i} className="text-lg font-medium mt-4 mb-2 text-foreground">{line.slice(4)}</h3>);
        i++; continue;
      }
      if (line.startsWith('#### ')) {
        elements.push(<h4 key={i} className="text-base font-medium mt-3 mb-1 text-foreground">{line.slice(5)}</h4>);
        i++; continue;
      }

      // Bold text processing
      const processedLine = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

      // List items
      if (line.startsWith('- ')) {
        elements.push(
          <li key={i} className="ml-4 text-muted-foreground list-disc" dangerouslySetInnerHTML={{ __html: processedLine.slice(2) }} />
        );
        i++; continue;
      }

      // Numbered lists
      const numberedMatch = line.match(/^(\d+)\.\s/);
      if (numberedMatch) {
        elements.push(
          <li key={i} className="ml-4 text-muted-foreground list-decimal" dangerouslySetInnerHTML={{ __html: processedLine.slice(numberedMatch[0].length) }} />
        );
        i++; continue;
      }

      // Empty lines
      if (line.trim() === '') {
        elements.push(<br key={i} />);
        i++; continue;
      }

      // Regular paragraphs
      elements.push(<p key={i} className="text-muted-foreground mb-2" dangerouslySetInnerHTML={{ __html: processedLine }} />);
      i++;
    }

    return elements;
  };

  return (
    <AppLayout title="Relatórios" subtitle="Geração de planos de desenvolvimento com IA">
      <div className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="generate" className="gap-2">
              <Sparkles className="h-4 w-4" />
              Gerar Novo
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="h-4 w-4" />
              Histórico
              {savedReports && savedReports.length > 0 && (
                <Badge variant="secondary" className="ml-1">{savedReports.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="generate" className="space-y-6 mt-6">
            {/* Selection Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Gerador de Relatórios com Mente Sistur
                </CardTitle>
                <CardDescription>
                  Selecione um diagnóstico calculado para gerar um plano de desenvolvimento turístico personalizado
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Filters row */}
                <div className="flex flex-wrap gap-3 items-end">
                  <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                    <Filter className="h-4 w-4" />
                    Filtros:
                  </div>
                  <Select value={genTypeFilter} onValueChange={setGenTypeFilter}>
                    <SelectTrigger className="w-40 h-8 text-xs">
                      <SelectValue placeholder="Tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os tipos</SelectItem>
                      <SelectItem value="territorial">
                        <span className="flex items-center gap-1.5"><Globe className="h-3 w-3" />Territorial</span>
                      </SelectItem>
                      <SelectItem value="enterprise">
                        <span className="flex items-center gap-1.5"><Building2 className="h-3 w-3" />Enterprise</span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={genTierFilter} onValueChange={setGenTierFilter}>
                    <SelectTrigger className="w-40 h-8 text-xs">
                      <SelectValue placeholder="Nível" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os níveis</SelectItem>
                      <SelectItem value="essencial">⚡ Essencial</SelectItem>
                      <SelectItem value="estrategico">📊 Estratégico</SelectItem>
                      <SelectItem value="integral">🎯 Integral</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={genDestFilter} onValueChange={setGenDestFilter}>
                    <SelectTrigger className="w-48 h-8 text-xs">
                      <SelectValue placeholder="Destino" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os destinos</SelectItem>
                      {destinations?.map(d => (
                        <SelectItem key={d.id} value={d.id}>
                          <span className="flex items-center gap-1.5">
                            <MapPin className="h-3 w-3" />
                            {d.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {(genTypeFilter !== 'all' || genTierFilter !== 'all' || genDestFilter !== 'all') && (
                    <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => { setGenTypeFilter('all'); setGenTierFilter('all'); setGenDestFilter('all'); }}>
                      Limpar filtros
                    </Button>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <label className="text-sm font-medium text-muted-foreground mb-2 block">
                      Diagnóstico
                    </label>
                    <Select 
                      value={selectedAssessmentId} 
                      onValueChange={setSelectedAssessmentId}
                      disabled={assessmentsLoading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um diagnóstico calculado" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredCalculatedAssessments.length === 0 ? (
                          <SelectItem value="none" disabled>
                            Nenhum diagnóstico calculado disponível
                          </SelectItem>
                        ) : (
                          filteredCalculatedAssessments.map((assessment) => {
                            const meta = assessment as typeof assessment & AssessmentDisplayMeta;
                            const dest = destinations?.find(d => d.id === assessment.destination_id)
                              ?? { name: meta.destinations?.name || 'Destino' };
                            const calcDate = assessment.calculated_at 
                              ? format(new Date(assessment.calculated_at), "dd/MM/yy", { locale: ptBR })
                              : format(new Date(assessment.created_at), "dd/MM/yy", { locale: ptBR });
                            const creatorName = meta.creator?.full_name;
                            return (
                              <SelectItem key={assessment.id} value={assessment.id}>
                                <span className="flex items-center gap-2">
                                  <span>{assessment.title} — {dest?.name || 'Destino'}</span>
                                  <span className="text-muted-foreground text-xs">
                                    {calcDate}{creatorName ? ` · ${creatorName}` : ''}
                                  </span>
                                </span>
                              </SelectItem>
                            );
                          })
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="w-48">
                    <label className="text-sm font-medium text-muted-foreground mb-2 block">
                      Modelo
                    </label>
                    <Select value={reportTemplate} onValueChange={setReportTemplate}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="completo">📋 Completo</SelectItem>
                        <SelectItem value="executivo">📊 Executivo</SelectItem>
                        <SelectItem value="investidor">💰 Investidores</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="w-44">
                    <label className="text-sm font-medium text-muted-foreground mb-2 block">
                      Visibilidade
                    </label>
                    <Select value={reportVisibility} onValueChange={setReportVisibility}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="personal">
                          <span className="flex items-center gap-1.5">
                            <Lock className="h-3 w-3" />
                            Pessoal
                          </span>
                        </SelectItem>
                        <SelectItem value="org">
                          <span className="flex items-center gap-1.5">
                            <Users className="h-3 w-3" />
                            Organização
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {isAdmin && (
                    <div className="w-36">
                      <label className="text-sm font-medium text-muted-foreground mb-2 block">
                        Ambiente
                      </label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant={runInDemo ? 'secondary' : 'outline'}
                              className="w-full gap-2"
                              onClick={() => setRunInDemo(!runInDemo)}
                            >
                              <FlaskConical className="h-4 w-4" />
                              {runInDemo ? 'Demo' : 'Produção'}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {runInDemo ? 'Relatório será gerado no ambiente de demonstração' : 'Relatório será gerado no ambiente de produção'}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  )}

                  {isAdmin && (
                    <div className="w-52">
                      <label className="text-sm font-medium text-muted-foreground mb-2 block">
                        Modelo de IA <span className="text-[10px] uppercase tracking-wide text-amber-600">(admin)</span>
                      </label>
                      <Select value={aiProvider} onValueChange={(v) => setAiProvider(v as typeof aiProvider)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="auto">⚙️ Auto (Claude→GPT-5→Gemini)</SelectItem>
                          <SelectItem value="claude">🟣 Claude Sonnet 4.5</SelectItem>
                          <SelectItem value="gpt5">🟢 GPT-5</SelectItem>
                          <SelectItem value="gemini">🔵 Gemini 2.5 Pro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="w-44">
                    <label className="text-sm font-medium text-muted-foreground mb-2 block">
                      Comparativo
                    </label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant={enableComparison ? 'secondary' : 'outline'}
                            className="w-full gap-2"
                            onClick={() => setEnableComparison(!enableComparison)}
                          >
                            <FileText className="h-4 w-4" />
                            {enableComparison ? 'Comparar rodadas' : 'Sem comparação'}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {enableComparison
                            ? 'O relatório incluirá um bloco comparando esta rodada com a anterior do mesmo destino.'
                            : 'Ative para incluir comparação com a rodada anterior do mesmo destino.'}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>

                  <div className="flex items-end gap-2">
                    <Button 
                      onClick={() => generateReport(hasSavedReportForSelected)} 
                      disabled={!selectedAssessmentId || isGenerating}
                      className="gap-2"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Gerando… {generationElapsed > 0 ? `(${generationElapsed}s)` : ''}
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4" />
                          {hasSavedReportForSelected ? 'Gerar nova versão' : 'Gerar Relatório'}
                        </>
                      )}
                    </Button>
                    {isGenerating && (
                      <Button
                        variant="outline"
                        onClick={cancelGeneration}
                        className="gap-2"
                        title="Cancelar a geração em andamento"
                      >
                        <X className="h-4 w-4" />
                        Cancelar
                      </Button>
                    )}

                    {report && (
                      <>
                        <Button variant="outline" onClick={() => downloadDocx(report, selectedDestination?.name || 'destino')} className="gap-2">
                          <Download className="h-4 w-4" />
                          Word
                        </Button>
                        <Button variant="outline" onClick={() => downloadPDF()} className="gap-2">
                          <FileText className="h-4 w-4" />
                          PDF
                        </Button>
                        <Button variant="outline" onClick={() => setCustomizationOpen(true)} className="gap-2">
                          <Settings2 className="h-4 w-4" />
                          Personalizar
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {/* Selected Assessment Info */}
                {selectedAssessment && selectedDestination && (
                  <div className="flex flex-wrap gap-3 pt-2 border-t">
                    <Badge variant="outline" className="gap-1">
                      <MapPin className="h-3 w-3" />
                      {selectedDestination.name}
                      {selectedDestination.uf && ` - ${selectedDestination.uf}`}
                    </Badge>
                    {pillarScores && pillarScores.length > 0 && (
                      <>
                        {pillarScores.map(ps => (
                          <Badge 
                            key={ps.pillar}
                            variant={ps.severity === 'CRITICO' ? 'destructive' : ps.severity === 'MODERADO' ? 'secondary' : 'default'}
                            className="gap-1"
                          >
                            {ps.pillar}: {(ps.score * 100).toFixed(0)}%
                          </Badge>
                        ))}
                      </>
                    )}
                    {issues && issues.length > 0 && (
                      <Badge variant="outline" className="gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        {issues.length} problema(s)
                      </Badge>
                    )}
                    {prescriptions && prescriptions.length > 0 && (
                      <Badge variant="outline" className="gap-1">
                        <Sparkles className="h-3 w-3" />
                        {prescriptions.length} prescrição(ões)
                      </Badge>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Report Display */}
            {(report || isGenerating) && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      Plano de Desenvolvimento
                      {selectedDestination && ` - ${selectedDestination.name}`}
                    </CardTitle>
                    <CardDescription>
                      Relatório gerado pela Mente Sistur com base no diagnóstico
                    </CardDescription>
                  </div>
                  {report && !isGenerating && (
                    <Button variant="ghost" size="sm" onClick={() => generateReport(true)} className="gap-2">
                      <RefreshCw className="h-4 w-4" />
                      Regenerar
                    </Button>
                  )}
                </CardHeader>
                <CardContent>
                  {report && !isGenerating && selectedAssessmentId && (
                    <ReportValidationBanner assessmentId={selectedAssessmentId} />
                  )}
                  <ScrollArea className="h-[600px] pr-4">
                    <div ref={reportRef} className="prose prose-sm max-w-none">
                      {isGenerating && !report && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          {generationStage || 'Gerando relatório…'} ({generationElapsed}s)
                        </div>
                      )}
                      {isGenerating && generationElapsed >= 60 && !report && (
                        <div className="mt-3 text-xs text-amber-600 dark:text-amber-400">
                          A geração continua no servidor. Se ficar mais de 8 minutos sem avançar, o sistema marcará falha automaticamente para você tentar novamente sem duplicar jobs.
                        </div>
                      )}
                      {report && renderMarkdown(report)}
                      {isGenerating && report && (
                        <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-1" />
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}

            {/* Empty State */}
            {!report && !isGenerating && (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <FileText className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    Nenhum relatório gerado
                  </h3>
                  <p className="text-muted-foreground max-w-md">
                    Selecione um diagnóstico calculado acima e clique em &quot;Gerar Relatório&quot; para criar um plano de desenvolvimento turístico personalizado com a Mente Sistur.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Reports List */}
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <History className="h-5 w-5" />
                    Relatórios Salvos
                  </CardTitle>
                  <CardDescription>
                    {reportsError
                      ? 'Não foi possível carregar o histórico'
                      : hasActiveHistoryFilters
                        ? `${filteredSavedReports.length} de ${visibleSavedReports.length} relatório(s) exibido(s)`
                        : `${visibleSavedReports.length} relatório(s) no histórico`}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Filters */}
                  <div className="flex flex-col gap-2">
                    <Select value={historyTypeFilter} onValueChange={setHistoryTypeFilter}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os tipos</SelectItem>
                        <SelectItem value="territorial">
                          <span className="flex items-center gap-1.5"><Globe className="h-3 w-3" />Territorial</span>
                        </SelectItem>
                        <SelectItem value="enterprise">
                          <span className="flex items-center gap-1.5"><Building2 className="h-3 w-3" />Enterprise</span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={historyTierFilter} onValueChange={setHistoryTierFilter}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Nível" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os níveis</SelectItem>
                        <SelectItem value="essencial">⚡ Essencial</SelectItem>
                        <SelectItem value="estrategico">📊 Estratégico</SelectItem>
                        <SelectItem value="integral">🎯 Integral</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={historyOwnerFilter} onValueChange={setHistoryOwnerFilter}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Autor" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos da organização</SelectItem>
                        <SelectItem value="mine">
                          <span className="flex items-center gap-1.5"><Lock className="h-3 w-3" />Somente meus</span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    {hasActiveHistoryFilters && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 justify-start px-2 text-xs"
                        onClick={() => { setHistoryTypeFilter('all'); setHistoryTierFilter('all'); setHistoryOwnerFilter('all'); }}
                      >
                        Limpar filtros
                      </Button>
                    )}
                  </div>

                  {reportsError ? (
                    <div className="text-center py-8 text-muted-foreground space-y-3">
                      <AlertTriangle className="h-8 w-8 mx-auto text-destructive" />
                      <p>Falha ao carregar relatórios salvos.</p>
                      <Button variant="outline" size="sm" onClick={() => refetchReports()}>
                        Tentar novamente
                      </Button>
                    </div>
                  ) : isHistoryLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : visibleSavedReports.length > 0 ? (
                    <ScrollArea className="h-[450px]">
                      <div className="space-y-2 pr-4">
                        {filteredSavedReports.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            <Filter className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p>Nenhum relatório combina com os filtros</p>
                          </div>
                        ) : filteredSavedReports.map((r) => {
                          const tierLabel = getReportTierLabel(r.tier);
                          return (
                          <div
                            key={r.id}
                            className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                              selectedHistoryReport?.id === r.id
                                ? 'bg-primary/10 border-primary'
                                : 'hover:bg-muted/50'
                            }`}
                            onClick={() => setSelectedHistoryReport(r)}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="font-medium truncate">{r.destination_name}</p>
                                  <Badge variant="outline" className="text-[10px] gap-0.5 shrink-0">
                                    {r.diagnostic_type === 'enterprise' ? <Building2 className="h-2.5 w-2.5" /> : <Globe className="h-2.5 w-2.5" />}
                                    {r.diagnostic_type === 'enterprise' ? 'Enterprise' : 'Territorial'}
                                  </Badge>
                                  {tierLabel && (
                                    <Badge variant="secondary" className="text-[10px] shrink-0">
                                      {tierLabel}
                                    </Badge>
                                  )}
                                  {r.visibility === 'org' ? (
                                    <Badge variant="outline" className="text-[10px] gap-0.5 shrink-0"><Users className="h-2.5 w-2.5" />Org</Badge>
                                  ) : (
                                    <Badge variant="secondary" className="text-[10px] gap-0.5 shrink-0"><Lock className="h-2.5 w-2.5" />Pessoal</Badge>
                                  )}
                                  {r.environment === 'demo' && (
                                    <Badge variant="outline" className="text-[10px] gap-0.5 shrink-0 border-amber-500 text-amber-600"><FlaskConical className="h-2.5 w-2.5" />Demo</Badge>
                                  )}
                                  {isAdmin && getProviderLabel(r.ai_provider, r.ai_model) && (
                                    <Badge
                                      variant="outline"
                                      className="text-[10px] gap-0.5 shrink-0 border-primary/40 text-primary"
                                      title={r.ai_model || r.ai_provider || ''}
                                    >
                                      <Sparkles className="h-2.5 w-2.5" />
                                      {getProviderLabel(r.ai_provider, r.ai_model)}
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                  <Calendar className="h-3 w-3" />
                                  {format(new Date(r.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteReport(r.id);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        );
                        })}
                      </div>
                    </ScrollArea>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>Nenhum relatório salvo</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Report Viewer */}
              <Card className="lg:col-span-2">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      {selectedHistoryReport ? selectedHistoryReport.destination_name : 'Visualizador'}
                    </CardTitle>
                    {selectedHistoryReport && (
                      <CardDescription>
                        Gerado em {format(new Date(selectedHistoryReport.created_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                      </CardDescription>
                    )}
                  </div>
                  {selectedHistoryReport && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadDocx(selectedHistoryReport.report_content, selectedHistoryReport.destination_name)}
                        className="gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Word
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadPDF(historyReportRef)}
                        className="gap-2"
                      >
                        <FileText className="h-4 w-4" />
                        PDF
                      </Button>
                    </div>
                  )}
                </CardHeader>
                <CardContent>
                  {selectedHistoryReport ? (
                    <>
                      <ReportValidationBanner reportId={selectedHistoryReport.id} />
                      <ScrollArea className="h-[500px] pr-4">
                        <div ref={historyReportRef} className="prose prose-sm max-w-none">
                          {renderMarkdown(selectedHistoryReport.report_content)}
                        </div>
                      </ScrollArea>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
                      <FileText className="h-12 w-12 mb-4 opacity-50" />
                      <p>Selecione um relatório da lista para visualizar</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        <ReportCustomizationDialog
          open={customizationOpen}
          onOpenChange={setCustomizationOpen}
          onApply={setReportCustomization}
        />
      </div>
    </AppLayout>
  );
}
