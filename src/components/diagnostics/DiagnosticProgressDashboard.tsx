import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, Circle, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  status: string;
  hasIndicatorValues: boolean;
  hasReport: boolean;
  hasProjects: boolean;
}

const STEPS = [
  { key: 'created', label: 'Rodada Criada', description: 'Diagnóstico configurado' },
  { key: 'data', label: 'Dados Coletados', description: 'Indicadores preenchidos' },
  { key: 'calculated', label: 'Índices Calculados', description: 'Scores e gargalos gerados' },
  { key: 'report', label: 'Relatório Gerado', description: 'Plano de desenvolvimento' },
  { key: 'project', label: 'Projeto Criado', description: 'Plano de ação em execução' },
];

export function DiagnosticProgressDashboard({ status, hasIndicatorValues, hasReport, hasProjects }: Props) {
  const getStepStatus = (key: string): 'done' | 'current' | 'pending' => {
    switch (key) {
      case 'created': return 'done';
      case 'data': 
        if (status === 'DRAFT' && !hasIndicatorValues) return 'current';
        return hasIndicatorValues ? 'done' : 'pending';
      case 'calculated':
        if (status === 'CALCULATED') return 'done';
        if (status === 'DATA_READY') return 'current';
        return 'pending';
      case 'report':
        if (hasReport) return 'done';
        if (status === 'CALCULATED' && !hasReport) return 'current';
        return 'pending';
      case 'project':
        if (hasProjects) return 'done';
        if (hasReport && !hasProjects) return 'current';
        return 'pending';
      default: return 'pending';
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">Progresso do Diagnóstico</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          {STEPS.map((step, i) => {
            const stepStatus = getStepStatus(step.key);
            return (
              <div key={step.key} className="flex items-center flex-1">
                <div className="flex flex-col items-center text-center flex-1">
                  <div className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center mb-1.5 transition-colors',
                    stepStatus === 'done' && 'bg-primary text-primary-foreground',
                    stepStatus === 'current' && 'bg-primary/20 text-primary border-2 border-primary',
                    stepStatus === 'pending' && 'bg-muted text-muted-foreground',
                  )}>
                    {stepStatus === 'done' ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <Circle className="h-4 w-4" />
                    )}
                  </div>
                  <p className={cn(
                    'text-xs font-medium',
                    stepStatus === 'done' && 'text-primary',
                    stepStatus === 'current' && 'text-foreground',
                    stepStatus === 'pending' && 'text-muted-foreground',
                  )}>
                    {step.label}
                  </p>
                  <p className="text-[10px] text-muted-foreground hidden sm:block">{step.description}</p>
                </div>
                {i < STEPS.length - 1 && (
                  <ArrowRight className={cn(
                    'h-4 w-4 shrink-0 mx-1',
                    stepStatus === 'done' ? 'text-primary' : 'text-muted-foreground/30'
                  )} />
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
