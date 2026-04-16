import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
import { useTrackExams, useGenerateTrackExams } from '@/hooks/useTrackExams';
import { ClipboardList, Sparkles, Clock, CheckCircle2, RefreshCcw } from 'lucide-react';

const PILLAR_LABELS: Record<string, string> = {
  RA: 'Relações Ambientais',
  OE: 'Organização Estrutural',
  AO: 'Ações Operacionais',
};

interface TrackExamsPanelProps {
  trackId: string;
  /** Show "Gerar provas" / "Regenerar" buttons. Pass true for owners/admins. */
  canManage: boolean;
}

export function TrackExamsPanel({ trackId, canManage }: TrackExamsPanelProps) {
  const { data: exams, isLoading } = useTrackExams(trackId);
  const generate = useGenerateTrackExams();

  const handleGenerate = (overwrite: boolean) => {
    generate.mutate({ trackId, overwrite });
  };

  return (
    <Card className="mb-8">
      <CardHeader>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" />
              Provas Finais da Trilha
            </CardTitle>
            <CardDescription>
              Uma prova por pilar coberto pelos treinamentos. Aprovação garante o certificado.
            </CardDescription>
          </div>

          {canManage && (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={exams && exams.length > 0 ? 'outline' : 'default'}
                onClick={() => handleGenerate(false)}
                disabled={generate.isPending}
              >
                <Sparkles className="mr-2 h-4 w-4" />
                {exams && exams.length > 0 ? 'Gerar faltantes' : 'Gerar provas'}
              </Button>

              {exams && exams.length > 0 && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="outline" disabled={generate.isPending}>
                      <RefreshCcw className="mr-2 h-4 w-4" />
                      Regenerar
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Regenerar provas da trilha?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Os rulesets atuais serão substituídos pela configuração padrão (20 questões,
                        70% nota mínima, 60 min, 2 tentativas). Tentativas já realizadas pelos alunos
                        permanecem registradas.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleGenerate(true)}>
                        Regenerar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        ) : exams && exams.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {exams.map((te) => (
              <div
                key={te.id}
                className="rounded-md border p-4 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-center justify-between mb-2">
                  <Badge variant={te.pillar.toLowerCase() as 'ra' | 'oe' | 'ao'}>
                    {te.pillar}
                  </Badge>
                  <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium mb-3">{PILLAR_LABELS[te.pillar]}</p>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <ClipboardList className="h-3 w-3" />
                    <span>{te.ruleset?.question_count ?? 20} questões</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>Nota mínima {te.ruleset?.min_score_pct ?? 70}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-3 w-3" />
                    <span>
                      {te.ruleset?.time_limit_minutes ?? 60} min · {te.ruleset?.max_attempts ?? 2} tentativas
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-sm text-muted-foreground">
            <ClipboardList className="mx-auto h-10 w-10 text-muted-foreground/50 mb-2" />
            <p>Nenhuma prova final configurada para esta trilha.</p>
            {canManage && (
              <p className="mt-1 text-xs">
                Clique em "Gerar provas" para criar uma prova por pilar coberto.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
