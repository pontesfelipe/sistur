import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { BookOpen, GraduationCap, Library, ListChecks, Target, ClipboardCheck, Lightbulb } from 'lucide-react';
import type { EduTraining } from '@/hooks/useEduTrainings';

interface BibRef { autor?: string; titulo?: string; ano?: string | number; link?: string }

interface Props {
  training: EduTraining & {
    ementa?: string | null;
    competencias?: unknown;
    habilidades?: unknown;
    carga_horaria_teorica?: number | null;
    carga_horaria_pratica?: number | null;
    bibliografia_basica?: unknown;
    bibliografia_complementar?: unknown;
    metodologia?: string | null;
    criterios_avaliacao?: string | null;
    prerequisitos?: unknown;
  };
}

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === 'string');
}

function asBibArray(v: unknown): BibRef[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is BibRef => !!x && typeof x === 'object');
}

export function SyllabusPanel({ training }: Props) {
  const competencias = asStringArray(training.competencias);
  const habilidades = asStringArray(training.habilidades);
  const bibBasica = asBibArray(training.bibliografia_basica);
  const bibComp = asBibArray(training.bibliografia_complementar);
  const prereqs = asStringArray(training.prerequisitos);
  const cargaT = training.carga_horaria_teorica ?? 0;
  const cargaP = training.carga_horaria_pratica ?? 0;
  const cargaTotal = cargaT + cargaP;

  const hasAnything =
    !!training.ementa || competencias.length || habilidades.length ||
    cargaTotal > 0 || bibBasica.length || bibComp.length ||
    !!training.metodologia || !!training.criterios_avaliacao || prereqs.length;

  if (!hasAnything) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5" />
          Plano de Ensino
        </CardTitle>
        <CardDescription>
          Documento pedagógico formal — ementa, competências, carga horária e critérios de avaliação
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {training.ementa && (
          <section>
            <h4 className="text-sm font-semibold flex items-center gap-2 mb-2">
              <BookOpen className="h-4 w-4" /> Ementa
            </h4>
            <p className="text-sm text-muted-foreground whitespace-pre-line">{training.ementa}</p>
          </section>
        )}

        {(cargaT > 0 || cargaP > 0) && (
          <section className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border p-3 text-center">
              <p className="text-xs text-muted-foreground">Teórica</p>
              <p className="text-lg font-semibold">{cargaT}h</p>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <p className="text-xs text-muted-foreground">Prática</p>
              <p className="text-lg font-semibold">{cargaP}h</p>
            </div>
            <div className="rounded-lg border p-3 text-center bg-primary/5">
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-lg font-semibold text-primary">{cargaTotal}h</p>
            </div>
          </section>
        )}

        {competencias.length > 0 && (
          <section>
            <h4 className="text-sm font-semibold flex items-center gap-2 mb-2">
              <Target className="h-4 w-4" /> Competências
            </h4>
            <div className="flex flex-wrap gap-2">
              {competencias.map((c, i) => (
                <Badge key={i} variant="secondary" className="text-xs">{c}</Badge>
              ))}
            </div>
          </section>
        )}

        {habilidades.length > 0 && (
          <section>
            <h4 className="text-sm font-semibold flex items-center gap-2 mb-2">
              <ListChecks className="h-4 w-4" /> Habilidades (objetivos de aprendizagem)
            </h4>
            <ul className="space-y-1.5 text-sm text-muted-foreground list-disc pl-5">
              {habilidades.map((h, i) => <li key={i}>{h}</li>)}
            </ul>
          </section>
        )}

        {prereqs.length > 0 && (
          <section>
            <h4 className="text-sm font-semibold mb-2">Pré-requisitos</h4>
            <div className="flex flex-wrap gap-2">
              {prereqs.map((p, i) => (
                <Badge key={i} variant="outline" className="text-xs">{p}</Badge>
              ))}
            </div>
          </section>
        )}

        {training.metodologia && (
          <section>
            <h4 className="text-sm font-semibold flex items-center gap-2 mb-2">
              <Lightbulb className="h-4 w-4" /> Metodologia
            </h4>
            <p className="text-sm text-muted-foreground whitespace-pre-line">{training.metodologia}</p>
          </section>
        )}

        {training.criterios_avaliacao && (
          <section>
            <h4 className="text-sm font-semibold flex items-center gap-2 mb-2">
              <ClipboardCheck className="h-4 w-4" /> Critérios de Avaliação
            </h4>
            <p className="text-sm text-muted-foreground whitespace-pre-line">{training.criterios_avaliacao}</p>
          </section>
        )}

        {(bibBasica.length > 0 || bibComp.length > 0) && (
          <section>
            <h4 className="text-sm font-semibold flex items-center gap-2 mb-2">
              <Library className="h-4 w-4" /> Bibliografia
            </h4>
            {bibBasica.length > 0 && (
              <div className="mb-3">
                <p className="text-xs font-medium uppercase text-muted-foreground mb-1">Básica</p>
                <ul className="space-y-1 text-sm">
                  {bibBasica.map((b, i) => (
                    <li key={i}>
                      {b.autor && <span className="font-medium">{b.autor}. </span>}
                      {b.link ? (
                        <a href={b.link} target="_blank" rel="noreferrer" className="text-primary hover:underline">{b.titulo}</a>
                      ) : <span>{b.titulo}</span>}
                      {b.ano && <span className="text-muted-foreground"> ({b.ano})</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {bibComp.length > 0 && (
              <div>
                <p className="text-xs font-medium uppercase text-muted-foreground mb-1">Complementar</p>
                <ul className="space-y-1 text-sm">
                  {bibComp.map((b, i) => (
                    <li key={i}>
                      {b.autor && <span className="font-medium">{b.autor}. </span>}
                      {b.link ? (
                        <a href={b.link} target="_blank" rel="noreferrer" className="text-primary hover:underline">{b.titulo}</a>
                      ) : <span>{b.titulo}</span>}
                      {b.ano && <span className="text-muted-foreground"> ({b.ano})</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        <Separator />
        <p className="text-xs text-muted-foreground">
          Plano de ensino formal — base para certificação de carga horária e reconhecimento institucional.
        </p>
      </CardContent>
    </Card>
  );
}