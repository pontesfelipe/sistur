import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';

interface AutoCorrection {
  indicator: string;
  from: string;
  to: string;
}

interface ReportValidationRow {
  status: string | null;
  total_issues: number | null;
  auto_corrections: AutoCorrection[] | null;
  deterministic_issues: string[] | null;
  ai_issues: string[] | null;
  validator_version: string | null;
}

interface Props {
  reportId?: string | null;
  assessmentId?: string | null;
}

/**
 * v1.38.27 — Banner de "Validação cruzada" exibido FORA do conteúdo do relatório.
 * Lê de `report_validations` e mostra apenas se houver algo relevante a comunicar.
 * Nunca é incluído no markdown exportado (DOCX/PDF/cópia).
 */
export function ReportValidationBanner({ reportId, assessmentId }: Props) {
  const [open, setOpen] = useState(false);

  const { data } = useQuery<ReportValidationRow | null>({
    queryKey: ['report-validation', reportId ?? null, assessmentId ?? null],
    enabled: Boolean(reportId || assessmentId),
    queryFn: async () => {
      let query = supabase
        .from('report_validations')
        .select('status, total_issues, auto_corrections, deterministic_issues, ai_issues, validator_version')
        .order('created_at', { ascending: false })
        .limit(1);

      if (reportId) {
        query = query.eq('report_id', reportId);
      } else if (assessmentId) {
        query = query.eq('assessment_id', assessmentId);
      }

      const { data: rows, error } = await query;
      if (error) {
        console.warn('[ReportValidationBanner] read error', error);
        return null;
      }
      return (rows?.[0] as ReportValidationRow | undefined) ?? null;
    },
    staleTime: 30_000,
  });

  if (!data) return null;

  const corrections = Array.isArray(data.auto_corrections) ? data.auto_corrections : [];
  const determIssues = Array.isArray(data.deterministic_issues) ? data.deterministic_issues : [];
  const aiIssues = Array.isArray(data.ai_issues) ? data.ai_issues : [];
  const issuesCount = determIssues.length + aiIssues.length;
  const correctionsCount = corrections.length;

  // Silencioso quando tudo bate
  if (issuesCount === 0 && correctionsCount === 0) return null;

  const variant: 'default' | 'destructive' = issuesCount > 0 ? 'destructive' : 'default';
  const Icon = issuesCount > 0 ? AlertTriangle : correctionsCount > 0 ? Info : CheckCircle2;

  const summaryParts: string[] = [];
  if (correctionsCount > 0) {
    summaryParts.push(
      `${correctionsCount} ${correctionsCount === 1 ? 'correção automática aplicada' : 'correções automáticas aplicadas'}`,
    );
  }
  if (issuesCount > 0) {
    summaryParts.push(
      `${issuesCount} ${issuesCount === 1 ? 'ponto requer revisão manual' : 'pontos requerem revisão manual'}`,
    );
  }

  return (
    <>
      <Alert variant={variant} className="mb-4">
        <Icon className="h-4 w-4" />
        <AlertTitle>Validação cruzada de fontes</AlertTitle>
        <AlertDescription className="space-y-2">
          <p className="text-sm">
            Antes de gerar este relatório, o sistema conferiu os valores citados contra a tabela
            de auditoria e a bibliografia canônica. {summaryParts.join(' e ')}.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setOpen(true)}
          >
            Ver detalhes
          </Button>
        </AlertDescription>
      </Alert>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Validação cruzada — detalhes</DialogTitle>
            <DialogDescription>
              Esta informação é técnica e fica fora do conteúdo do relatório. Ela documenta o que o
              sistema ajustou ou marcou para revisão antes da geração.
              {data.validator_version ? ` (validador ${data.validator_version})` : ''}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-6">
              {correctionsCount > 0 && (
                <section>
                  <h4 className="text-sm font-semibold mb-2">
                    Correções automáticas aplicadas ({correctionsCount})
                  </h4>
                  <ul className="space-y-2 text-sm">
                    {corrections.map((c, idx) => (
                      <li key={idx} className="rounded-md border border-border bg-muted/30 px-3 py-2">
                        <div className="font-medium text-foreground">{c.indicator}</div>
                        <div className="text-muted-foreground">
                          <span className="line-through">{c.from}</span>
                          <span className="mx-2">→</span>
                          <span className="text-foreground">{c.to}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {determIssues.length > 0 && (
                <section>
                  <h4 className="text-sm font-semibold mb-2">
                    Avisos determinísticos ({determIssues.length})
                  </h4>
                  <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                    {determIssues.map((w, idx) => (
                      <li key={idx}>{w}</li>
                    ))}
                  </ul>
                </section>
              )}

              {aiIssues.length > 0 && (
                <section>
                  <h4 className="text-sm font-semibold mb-2">
                    Avisos do agente IA validador ({aiIssues.length})
                  </h4>
                  <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                    {aiIssues.map((w, idx) => (
                      <li key={idx}>{w}</li>
                    ))}
                  </ul>
                </section>
              )}

              {issuesCount > 0 && (
                <p className="text-xs text-muted-foreground">
                  Os valores numéricos da tabela de auditoria são a fonte de verdade. Itens
                  remanescentes devem ser revisados manualmente antes de publicar o relatório.
                </p>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}