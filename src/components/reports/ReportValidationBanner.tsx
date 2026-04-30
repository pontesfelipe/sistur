import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, Wrench, Eye } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
      return ((rows?.[0] as unknown) as ReportValidationRow | undefined) ?? null;
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
        <AlertTitle>Conferência de dados</AlertTitle>
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
            <DialogTitle>Conferência de dados — detalhes</DialogTitle>
            <DialogDescription>
              Esta informação é técnica e fica fora do conteúdo do relatório. Ela documenta o que o
              sistema ajustou ou marcou para revisão antes da geração.
              {data.validator_version ? ` (validador ${data.validator_version})` : ''}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-6">
              {/* O QUE FOI VALIDADO — escopo da auditoria */}
              <section className="rounded-md border border-border bg-muted/20 p-3 space-y-2">
                <h4 className="text-sm font-semibold">O que foi validado</h4>
                <p className="text-xs text-muted-foreground">
                  Antes de salvar o relatório, o sistema executou três camadas de checagem cruzando
                  o texto gerado com fontes de verdade independentes:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-xs text-muted-foreground">
                  <li>
                    <span className="font-medium text-foreground">Auto-correção numérica determinística</span> —
                    cada valor citado na narrativa é comparado, indicador a indicador, com a tabela
                    oficial de auditoria do diagnóstico (fontes IBGE, CADASTUR, STN, DATASUS, INEP e
                    derivados).
                  </li>
                  <li>
                    <span className="font-medium text-foreground">Motor de coerência</span> —
                    verifica contradições internas, status (Adequado/Atenção/Crítico) coerentes com
                    os percentuais e citações dentro das faixas permitidas.
                  </li>
                  <li>
                    <span className="font-medium text-foreground">Agente IA validador</span> —
                    cruza o texto com a bibliografia canônica (Beni, IGMA, PNT, ODS) e sinaliza
                    afirmações sem respaldo nas fontes anexadas.
                  </li>
                </ul>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Badge variant="secondary" className="gap-1">
                    <Wrench className="h-3 w-3" />
                    {correctionsCount} corrigido{correctionsCount === 1 ? '' : 's'} automaticamente
                  </Badge>
                  <Badge variant={issuesCount > 0 ? 'destructive' : 'secondary'} className="gap-1">
                    <Eye className="h-3 w-3" />
                    {issuesCount} para revisão manual
                  </Badge>
                </div>
              </section>

              {/* PROBLEMAS + RESOLUÇÃO */}
              {correctionsCount > 0 && (
                <section>
                  <h4 className="text-sm font-semibold mb-1">
                    Divergências corrigidas automaticamente ({correctionsCount})
                  </h4>
                  <p className="text-xs text-muted-foreground mb-2">
                    <span className="font-medium text-foreground">Resolução:</span> o valor já foi
                    substituído pelo número oficial da tabela de auditoria antes do relatório ser
                    salvo. Nenhuma ação adicional é necessária — o documento já está consistente.
                  </p>
                  <ul className="space-y-2 text-sm">
                    {corrections.map((c, idx) => (
                      <li key={idx} className="rounded-md border border-border bg-muted/30 px-3 py-2">
                        <div className="font-medium text-foreground">{c.indicator}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          <span className="font-medium text-foreground">Problema:</span> a IA citou{' '}
                          <span className="line-through">{c.from}</span>, divergente da tabela oficial.
                        </div>
                        <div className="text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">Resolução:</span> valor
                          substituído por <span className="text-foreground font-medium">{c.to}</span>{' '}
                          (fonte oficial) — aplicado no texto final.
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {determIssues.length > 0 && (
                <section>
                  <h4 className="text-sm font-semibold mb-1">
                    Avisos determinísticos ({determIssues.length})
                  </h4>
                  <p className="text-xs text-muted-foreground mb-2">
                    <span className="font-medium text-foreground">Resolução:</span> o motor de
                    coerência identificou estes pontos mas não tinha um valor oficial a substituir.
                    Revisão humana recomendada antes de publicar.
                  </p>
                  <ul className="space-y-1 text-sm">
                    {determIssues.map((w, idx) => (
                      <li key={idx} className="rounded-md border border-border bg-muted/20 px-3 py-2 text-muted-foreground">
                        {w}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {aiIssues.length > 0 && (
                <section>
                  <h4 className="text-sm font-semibold mb-1">
                    Pontos sinalizados pelo agente IA validador ({aiIssues.length})
                  </h4>
                  <p className="text-xs text-muted-foreground mb-2">
                    <span className="font-medium text-foreground">Resolução:</span> o agente
                    identificou afirmações que não encontrou respaldo direto na bibliografia ou na
                    tabela de auditoria. Confirme ou ajuste manualmente antes de publicar — pode
                    ser tanto um falso positivo quanto uma fragilidade real do texto.
                  </p>
                  <ul className="space-y-1 text-sm">
                    {aiIssues.map((w, idx) => (
                      <li key={idx} className="rounded-md border border-border bg-muted/20 px-3 py-2 text-muted-foreground">
                        {w}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <p className="text-xs text-muted-foreground border-t border-border pt-3">
                A tabela de auditoria do diagnóstico é a <span className="font-medium text-foreground">fonte de verdade</span> para
                valores numéricos. As correções automáticas já foram aplicadas no texto;
                apenas os itens listados como "para revisão manual" exigem ação.
              </p>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}