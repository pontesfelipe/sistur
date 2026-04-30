import { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { exportReportAsDocx } from '@/lib/exportReportDocx';
import { getStatusStyle, mapIndicatorTableColumns } from '@/lib/reportStatusStyle';
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
  Eye,
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
  assessment_id: string;
  destination_name: string;
  report_content: string;
  created_at: string;
  visibility: string;
  environment: string;
  created_by: string;
  diagnostic_type: string;
  tier: string | null;
}

function useGeneratedReports() {
  return useQuery({
    queryKey: ['generated-reports'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('generated_reports')
        .select('*, assessments!inner(diagnostic_type, tier)')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data ?? []).map((r: any) => ({
        ...r,
        diagnostic_type: r.assessments?.diagnostic_type ?? 'territorial',
        tier: r.assessments?.tier ?? null,
      })) as GeneratedReport[];
    },
  });
}

export default function Relatorios() {
  const [searchParams] = useSearchParams();
  const assessmentFromUrl = searchParams.get('assessment');
  const queryClient = useQueryClient();
  
  const { assessments, isLoading: assessmentsLoading } = useAssessments();
  const { destinations } = useDestinations();
  const { data: savedReports, isLoading: reportsLoading } = useGeneratedReports();
  const { isAdmin, isViewingDemoData, profile } = useProfile();
  
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
  const reportRef = useRef<HTMLDivElement>(null);
  const [customizationOpen, setCustomizationOpen] = useState(false);
  const [reportCustomization, setReportCustomization] = useState<ReportCustomization>(loadCustomization);
  const [historyTypeFilter, setHistoryTypeFilter] = useState<string>('all');
  const [historyOwnerFilter, setHistoryOwnerFilter] = useState<string>('all');
  const [historyTierFilter, setHistoryTierFilter] = useState<string>('all');
  const [genTypeFilter, setGenTypeFilter] = useState<string>('all');
  const [genTierFilter, setGenTierFilter] = useState<string>('all');
  const [genDestFilter, setGenDestFilter] = useState<string>('all');
  // Watchdog para evitar UI travada quando o stream SSE para de responder.
  const generationAbortRef = useRef<AbortController | null>(null);
  const [generationStage, setGenerationStage] = useState<string>('');
  const [generationElapsed, setGenerationElapsed] = useState<number>(0);

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
    if (generationAbortRef.current) {
      generationAbortRef.current.abort();
      generationAbortRef.current = null;
    }
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
  const selectedDestination = destinations?.find(d => d.id === selectedAssessment?.destination_id)
    ?? (selectedAssessment ? {
      id: selectedAssessment.destination_id,
      name: (selectedAssessment as any).destinations?.name || 'Destino',
      uf: null as string | null,
    } : undefined);
  
  const { data: assessmentDetails } = useAssessmentDetails(selectedAssessmentId || undefined);
  const pillarScores = assessmentDetails?.pillarScores;
  const issues = assessmentDetails?.issues;
  const prescriptions = assessmentDetails?.prescriptions;

  const calculatedAssessments = assessments?.filter(a => a.status === 'CALCULATED') || [];

  const filteredCalculatedAssessments = calculatedAssessments.filter(a => {
    if (genTypeFilter !== 'all') {
      const type = (a as any).diagnostic_type || 'territorial';
      if (genTypeFilter !== type) return false;
    }
    if (genTierFilter !== 'all') {
      const tier = (a as any).tier || 'SMALL';
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
    setGenerationStage('Conectando ao servidor…');

    // ── Watchdog anti-travamento ───────────────────────────────────
    // 1) timeout duro absoluto: 240s (relatório longo + LLM)
    // 2) watchdog de inatividade: aborta se não chegar chunk em 90s
    const controller = new AbortController();
    generationAbortRef.current = controller;
    const HARD_TIMEOUT_MS = 240_000;
    const IDLE_TIMEOUT_MS = 90_000;
    const hardTimer = window.setTimeout(() => {
      controller.abort(new DOMException('hard-timeout', 'AbortError'));
    }, HARD_TIMEOUT_MS);
    let idleTimer = window.setTimeout(() => {
      controller.abort(new DOMException('idle-timeout', 'AbortError'));
    }, IDLE_TIMEOUT_MS);
    const resetIdle = () => {
      window.clearTimeout(idleTimer);
      idleTimer = window.setTimeout(() => {
        controller.abort(new DOMException('idle-timeout', 'AbortError'));
      }, IDLE_TIMEOUT_MS);
    };

    const pillarScoresMap: Record<string, { score: number; severity: string }> = {};
    pillarScores?.forEach(ps => {
      pillarScoresMap[ps.pillar] = { score: ps.score, severity: ps.severity };
    });

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
        }),
        signal: controller.signal,
      });
      resetIdle();
      setGenerationStage('Recebendo conteúdo do modelo…');

      if (!resp.ok) {
        const errorData = await resp.json();
        throw new Error(errorData.error || 'Erro ao gerar relatório');
      }

      // Check if the response is JSON (skipped) or SSE stream
      const contentType = resp.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await resp.json();
        if (data.skipped) {
          toast.info(data.message || 'Não há dados novos. Use "Regenerar" para forçar.', { duration: 5000 });
          // Load existing report
          const { data: existing } = await supabase
            .from('generated_reports')
            .select('report_content')
            .eq('assessment_id', selectedAssessmentId)
            .maybeSingle();
          if (existing?.report_content) {
            setReport(existing.report_content);
          }
          return;
        }
      }

      if (!resp.body) throw new Error('Resposta sem corpo');

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';
      let reportContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        resetIdle();
        
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              reportContent += content;
              setReport(reportContent);
            }
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      // Final flush
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split('\n')) {
          if (!raw) continue;
          if (raw.endsWith('\r')) raw = raw.slice(0, -1);
          if (raw.startsWith(':') || raw.trim() === '') continue;
          if (!raw.startsWith('data: ')) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              reportContent += content;
              setReport(reportContent);
            }
          } catch { /* ignore */ }
        }
      }

      toast.success('Relatório gerado e salvo com sucesso!');
      // Refresh reports list and destinations with report data
      queryClient.invalidateQueries({ queryKey: ['generated-reports'] });
      queryClient.invalidateQueries({ queryKey: ['destinations-with-report-data'] });
    } catch (error) {
      const isAbort = (error as any)?.name === 'AbortError';
      const reason = (error as any)?.message || '';
      console.error('Error generating report:', error);
      // v1.38.30 — Recuperação automática quando o stream SSE cai mas a edge
      // function continua finalizando em background via EdgeRuntime.waitUntil.
      // Em vez de só avisar o usuário, fazemos polling em generated_reports
      // pelo assessment_id por até ~3 min para "pegar" o relatório que terminou
      // de salvar mesmo após a conexão ser encerrada.
      const userCanceled = isAbort && reason !== 'idle-timeout' && reason !== 'hard-timeout';
      if (userCanceled) {
        toast.info('Geração cancelada.');
      } else if (isAbort || !(error instanceof Error && /4\d\d|5\d\d/.test(error.message))) {
        // idle-timeout, hard-timeout ou erro de rede — tentar recuperar
        const recoveryToastId = toast.loading(
          'A conexão caiu, mas o relatório pode estar sendo finalizado no servidor. Recuperando…',
          { duration: 180_000 },
        );
        setGenerationStage('Recuperando relatório do servidor…');
        const startedAt = Date.now();
        const recovered = await pollForBackgroundReport(selectedAssessmentId, startedAt);
        toast.dismiss(recoveryToastId);
        if (recovered) {
          setReport(recovered);
          toast.success('Relatório recuperado com sucesso! Foi finalizado em segundo plano.');
          queryClient.invalidateQueries({ queryKey: ['generated-reports'] });
          queryClient.invalidateQueries({ queryKey: ['destinations-with-report-data'] });
        } else {
          if (isAbort && reason === 'hard-timeout') {
            toast.error(
              'A geração ultrapassou 4 minutos e não retornou. Verifique o histórico em alguns minutos antes de tentar de novo.',
              { duration: 8000 },
            );
          } else {
            toast.error(
              'Não foi possível recuperar o relatório automaticamente. Verifique o histórico em alguns minutos antes de gerar de novo.',
              { duration: 8000 },
            );
          }
          queryClient.invalidateQueries({ queryKey: ['generated-reports'] });
        }
      } else {
        toast.error(error instanceof Error ? error.message : 'Erro ao gerar relatório');
      }
    } finally {
      window.clearTimeout(hardTimer);
      window.clearTimeout(idleTimer);
      generationAbortRef.current = null;
      setGenerationStage('');
      setIsGenerating(false);
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

  const downloadPDF = () => {
    if (!reportRef.current) return;
    
    const content = reportRef.current.innerHTML;
    
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
          const dataRows = tableLines.slice(startRow).map(parseRow);
          const colMap = mapIndicatorTableColumns(headers);

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
                            const dest = destinations?.find(d => d.id === assessment.destination_id)
                              ?? { name: (assessment as any).destinations?.name || 'Destino' };
                            const calcDate = assessment.calculated_at 
                              ? format(new Date(assessment.calculated_at), "dd/MM/yy", { locale: ptBR })
                              : format(new Date(assessment.created_at), "dd/MM/yy", { locale: ptBR });
                            const creatorName = (assessment as any).creator?.full_name;
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
                      onClick={() => generateReport()} 
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
                          Gerar Relatório
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
                        <Button variant="outline" onClick={downloadPDF} className="gap-2">
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
                          A geração está demorando mais que o usual. Aguarde até 4 minutos antes de cancelar — não tente clicar em &quot;Gerar&quot; novamente.
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
                    {savedReports?.length || 0} relatório(s) no histórico
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
                  </div>

                  {reportsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : savedReports && savedReports.length > 0 ? (
                    <ScrollArea className="h-[450px]">
                      <div className="space-y-2 pr-4">
                        {savedReports
                          .filter(r => {
                            if (r.visibility === 'personal' && r.created_by !== profile?.user_id) return false;
                            if (historyTypeFilter !== 'all' && r.diagnostic_type !== historyTypeFilter) return false;
                            if (historyTierFilter !== 'all' && r.tier !== historyTierFilter) return false;
                            if (historyOwnerFilter === 'mine' && r.created_by !== profile?.user_id) return false;
                            return true;
                          })
                          .map((r) => (
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
                                  {r.tier && (
                                    <Badge variant="secondary" className="text-[10px] shrink-0">
                                      {r.tier === 'essencial' ? '⚡' : r.tier === 'estrategico' ? '📊' : '🎯'} {r.tier.charAt(0).toUpperCase() + r.tier.slice(1)}
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
                        ))}
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
                        onClick={downloadPDF}
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
                        <div className="prose prose-sm max-w-none">
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
