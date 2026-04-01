import { useState, useRef, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAssessments } from '@/hooks/useAssessments';
import { useDestinations } from '@/hooks/useDestinations';
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
  Calendar
} from 'lucide-react';

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
}

function useGeneratedReports() {
  return useQuery({
    queryKey: ['generated-reports'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('generated_reports')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as GeneratedReport[];
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
  
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>('');
  const [report, setReport] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('generate');
  const [selectedHistoryReport, setSelectedHistoryReport] = useState<GeneratedReport | null>(null);
  const [reportTemplate, setReportTemplate] = useState<string>('completo');
  const reportRef = useRef<HTMLDivElement>(null);

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
  const selectedDestination = destinations?.find(d => d.id === selectedAssessment?.destination_id);
  
  const { data: assessmentDetails } = useAssessmentDetails(selectedAssessmentId || undefined);
  const pillarScores = assessmentDetails?.pillarScores;
  const issues = assessmentDetails?.issues;
  const prescriptions = assessmentDetails?.prescriptions;

  const calculatedAssessments = assessments?.filter(a => a.status === 'CALCULATED') || [];

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
        }),
      });

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
      console.error('Error generating report:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao gerar relatório');
    } finally {
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

  const downloadReport = (content: string, destinationName: string) => {
    if (!content) return;
    
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-${destinationName.toLowerCase().replace(/\s+/g, '-')}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Relatório baixado!');
  };

  // Improved markdown renderer with table support
  const renderMarkdown = (text: string) => {
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

          elements.push(
            <div key={`table-${i}`} className="overflow-x-auto my-4">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-muted/50">
                    {headers.map((h, hi) => (
                      <th key={hi} className="border border-border px-3 py-2 text-left font-semibold text-foreground">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dataRows.map((row, ri) => (
                    <tr key={ri} className={ri % 2 === 0 ? '' : 'bg-muted/20'}>
                      {row.map((cell, ci) => (
                        <td key={ci} className="border border-border px-3 py-2 text-muted-foreground"
                          dangerouslySetInnerHTML={{ __html: cell.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}
                        />
                      ))}
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
        elements.push(<h1 key={i} className="text-2xl font-bold mt-6 mb-3 text-foreground">{line.slice(2)}</h1>);
        i++; continue;
      }
      if (line.startsWith('## ')) {
        elements.push(<h2 key={i} className="text-xl font-semibold mt-5 mb-2 text-foreground">{line.slice(3)}</h2>);
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
                        {calculatedAssessments.length === 0 ? (
                          <SelectItem value="none" disabled>
                            Nenhum diagnóstico calculado disponível
                          </SelectItem>
                        ) : (
                          calculatedAssessments.map((assessment) => {
                            const dest = destinations?.find(d => d.id === assessment.destination_id);
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

                  <div className="flex items-end gap-2">
                    <Button 
                      onClick={() => generateReport()} 
                      disabled={!selectedAssessmentId || isGenerating}
                      className="gap-2"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Gerando...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4" />
                          Gerar Relatório
                        </>
                      )}
                    </Button>

                    {report && (
                      <Button variant="outline" onClick={() => downloadReport(report, selectedDestination?.name || 'destino')} className="gap-2">
                        <Download className="h-4 w-4" />
                        Baixar Markdown
                      </Button>
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
                  <ScrollArea className="h-[600px] pr-4">
                    <div ref={reportRef} className="prose prose-sm max-w-none">
                      {isGenerating && !report && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Gerando relatório...
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
                <CardContent>
                  {reportsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : savedReports && savedReports.length > 0 ? (
                    <ScrollArea className="h-[500px]">
                      <div className="space-y-2 pr-4">
                        {savedReports.map((r) => (
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
                                <p className="font-medium truncate">{r.destination_name}</p>
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
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadReport(selectedHistoryReport.report_content, selectedHistoryReport.destination_name)}
                      className="gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Baixar Markdown
                    </Button>
                  )}
                </CardHeader>
                <CardContent>
                  {selectedHistoryReport ? (
                    <ScrollArea className="h-[500px] pr-4">
                      <div className="prose prose-sm max-w-none">
                        {renderMarkdown(selectedHistoryReport.report_content)}
                      </div>
                    </ScrollArea>
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
      </div>
    </AppLayout>
  );
}
