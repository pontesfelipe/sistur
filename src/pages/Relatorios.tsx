import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAssessments } from '@/hooks/useAssessments';
import { useDestinations } from '@/hooks/useDestinations';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  FileText, 
  Sparkles, 
  Download, 
  Loader2,
  MapPin,
  AlertTriangle,
  RefreshCw
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

export default function Relatorios() {
  const [searchParams] = useSearchParams();
  const assessmentFromUrl = searchParams.get('assessment');
  
  const { assessments, isLoading: assessmentsLoading } = useAssessments();
  const { destinations } = useDestinations();
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>('');
  const [report, setReport] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
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

  const generateReport = async () => {
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
        }),
      });

      if (!resp.ok) {
        const errorData = await resp.json();
        throw new Error(errorData.error || 'Erro ao gerar relatório');
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

      toast.success('Relatório gerado com sucesso!');
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao gerar relatório');
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadReport = () => {
    if (!report || !selectedDestination) return;
    
    const blob = new Blob([report], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-${selectedDestination.name.toLowerCase().replace(/\s+/g, '-')}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Relatório baixado!');
  };

  // Simple markdown renderer
  const renderMarkdown = (text: string) => {
    return text
      .split('\n')
      .map((line, i) => {
        // Headers
        if (line.startsWith('# ')) {
          return <h1 key={i} className="text-2xl font-bold mt-6 mb-3 text-foreground">{line.slice(2)}</h1>;
        }
        if (line.startsWith('## ')) {
          return <h2 key={i} className="text-xl font-semibold mt-5 mb-2 text-foreground">{line.slice(3)}</h2>;
        }
        if (line.startsWith('### ')) {
          return <h3 key={i} className="text-lg font-medium mt-4 mb-2 text-foreground">{line.slice(4)}</h3>;
        }
        // Bold text within lines
        let processedLine = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        // List items
        if (line.startsWith('- ')) {
          return (
            <li key={i} className="ml-4 text-muted-foreground" dangerouslySetInnerHTML={{ __html: processedLine.slice(2) }} />
          );
        }
        // Numbered lists
        const numberedMatch = line.match(/^(\d+)\.\s/);
        if (numberedMatch) {
          return (
            <li key={i} className="ml-4 text-muted-foreground list-decimal" dangerouslySetInnerHTML={{ __html: processedLine.slice(numberedMatch[0].length) }} />
          );
        }
        // Empty lines
        if (line.trim() === '') {
          return <br key={i} />;
        }
        // Regular paragraphs
        return <p key={i} className="text-muted-foreground mb-2" dangerouslySetInnerHTML={{ __html: processedLine }} />;
      });
  };

  return (
    <AppLayout title="Relatórios" subtitle="Geração de planos de desenvolvimento com IA">
      <div className="space-y-6">
        {/* Selection Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Gerador de Relatórios com IA
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
                        return (
                          <SelectItem key={assessment.id} value={assessment.id}>
                            {assessment.title} - {dest?.name || 'Destino não encontrado'}
                          </SelectItem>
                        );
                      })
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end gap-2">
                <Button 
                  onClick={generateReport} 
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
                  <Button variant="outline" onClick={downloadReport} className="gap-2">
                    <Download className="h-4 w-4" />
                    Baixar MD
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
                  Relatório gerado por IA com base no diagnóstico
                </CardDescription>
              </div>
              {report && !isGenerating && (
                <Button variant="ghost" size="sm" onClick={generateReport} className="gap-2">
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
                Selecione um diagnóstico calculado acima e clique em &quot;Gerar Relatório&quot; para criar um plano de desenvolvimento turístico personalizado com inteligência artificial.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
