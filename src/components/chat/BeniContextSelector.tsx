import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ClipboardList,
  FolderKanban,
  GraduationCap,
  Plus,
  X,
  Check,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface BeniContext {
  assessment?: {
    id: string;
    title: string;
    destinationName: string;
    status: string;
    pillarScores?: Record<string, number>;
    igmaFlags?: Record<string, boolean>;
    diagnosticType?: string;
  };
  trainings?: Array<{
    training_id: string;
    title: string;
    pillar: string;
    type: string;
  }>;
  projects?: Array<{
    id: string;
    name: string;
    status: string;
    methodology: string;
    destinationName?: string;
  }>;
}

interface BeniContextSelectorProps {
  context: BeniContext;
  onContextChange: (ctx: BeniContext) => void;
}

export function BeniContextSelector({ context, onContextChange }: BeniContextSelectorProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState('assessments');

  // Fetch calculated assessments
  const { data: assessments, isLoading: loadingAssessments } = useQuery({
    queryKey: ['beni-context-assessments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assessments')
        .select('id, title, status, diagnostic_type, igma_flags, destinations(name)')
        .in('status', ['CALCULATED', 'DATA_READY'])
        .order('calculated_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
    enabled: open,
  });

  // Fetch pillar scores from diagnosis_data_snapshots for selected assessment
  const { data: snapshotScores } = useQuery({
    queryKey: ['beni-context-snapshots', context.assessment?.id],
    queryFn: async () => {
      if (!context.assessment?.id) return null;
      const { data, error } = await supabase
        .from('diagnosis_data_snapshots')
        .select('indicator_code, value_used')
        .eq('assessment_id', context.assessment.id);
      if (error) throw error;
      // Group by pillar prefix (RA_, OE_, AO_)
      const pillarScores: Record<string, number[]> = { RA: [], OE: [], AO: [] };
      data?.forEach(s => {
        if (s.value_used == null) return;
        const prefix = s.indicator_code?.split('_')[0];
        if (prefix && pillarScores[prefix]) {
          pillarScores[prefix].push(s.value_used);
        }
      });
      const avg: Record<string, number> = {};
      Object.entries(pillarScores).forEach(([pillar, scores]) => {
        if (scores.length > 0) {
          avg[pillar] = scores.reduce((a, b) => a + b, 0) / scores.length;
        }
      });
      return Object.keys(avg).length > 0 ? avg : null;
    },
    enabled: !!context.assessment?.id,
  });

  // Update pillar scores when they load
  if (snapshotScores && context.assessment && !context.assessment.pillarScores) {
    onContextChange({
      ...context,
      assessment: { ...context.assessment, pillarScores: snapshotScores },
    });
  }

  const toggleTraining = (t: any) => {
    const current = context.trainings || [];
    const exists = current.find(c => c.training_id === t.training_id);
    if (exists) {
      onContextChange({ ...context, trainings: current.filter(c => c.training_id !== t.training_id) });
    } else {
      onContextChange({
        ...context,
        trainings: [...current, { training_id: t.training_id, title: t.title, pillar: t.pillar, type: t.type }],
      });
    }
  };

  const toggleProject = (p: any) => {
    const current = context.projects || [];
    const exists = current.find(c => c.id === p.id);
    if (exists) {
      onContextChange({ ...context, projects: current.filter(c => c.id !== p.id) });
    } else {
      onContextChange({
        ...context,
        projects: [...current, {
          id: p.id,
          name: p.name,
          status: p.status,
          methodology: p.methodology,
          destinationName: (p.destinations as any)?.name,
        }],
      });
    }
  };

  const contextCount = (context.assessment ? 1 : 0) + (context.trainings?.length || 0) + (context.projects?.length || 0);

  const pillarLabel = (p: string) => {
    if (p === 'RA') return 'Rel. Ambientais';
    if (p === 'OE') return 'Org. Estrutural';
    if (p === 'AO') return 'Ações Operacionais';
    return p;
  };

  const statusColor = (s: string) => {
    if (s === 'CALCULATED') return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400';
    if (s === 'DATA_READY') return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
    return '';
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Active context badges */}
      {context.assessment && (
        <Badge variant="secondary" className="gap-1 pl-2 pr-1">
          <ClipboardList className="h-3 w-3" />
          <span className="max-w-[120px] truncate text-xs">{context.assessment.title}</span>
          <button onClick={removeAssessment} className="ml-1 hover:bg-muted rounded-full p-0.5">
            <X className="h-3 w-3" />
          </button>
        </Badge>
      )}
      {(context.trainings?.length || 0) > 0 && (
        <Badge variant="secondary" className="gap-1">
          <GraduationCap className="h-3 w-3" />
          <span className="text-xs">{context.trainings!.length} treinamento(s)</span>
        </Badge>
      )}
      {(context.projects?.length || 0) > 0 && (
        <Badge variant="secondary" className="gap-1">
          <FolderKanban className="h-3 w-3" />
          <span className="text-xs">{context.projects!.length} projeto(s)</span>
        </Badge>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
            <Plus className="h-3 w-3" />
            {contextCount === 0 ? 'Adicionar contexto' : 'Editar contexto'}
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-lg max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Contexto da conversa</DialogTitle>
            <DialogDescription>
              Selecione diagnósticos, treinamentos ou projetos para que o Professor Beni tenha contexto sobre suas perguntas.
            </DialogDescription>
          </DialogHeader>
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="assessments" className="text-xs gap-1">
                <ClipboardList className="h-3 w-3" />
                Diagnósticos
              </TabsTrigger>
              <TabsTrigger value="trainings" className="text-xs gap-1">
                <GraduationCap className="h-3 w-3" />
                Treinamentos
              </TabsTrigger>
              <TabsTrigger value="projects" className="text-xs gap-1">
                <FolderKanban className="h-3 w-3" />
                Projetos
              </TabsTrigger>
            </TabsList>

            <TabsContent value="assessments">
              <ScrollArea className="h-[300px]">
                {loadingAssessments ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : !assessments?.length ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Nenhum diagnóstico calculado encontrado.
                  </p>
                ) : (
                  <div className="space-y-2 pr-2">
                    {assessments.map(a => {
                      const isSelected = context.assessment?.id === a.id;
                      const destName = (a.destinations as any)?.name || '';
                      return (
                        <button
                          key={a.id}
                          onClick={() => isSelected ? removeAssessment() : selectAssessment(a)}
                          className={cn(
                            "w-full text-left p-3 rounded-lg border transition-colors",
                            isSelected ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium truncate">{a.title}</span>
                            {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-muted-foreground truncate">{destName}</span>
                            <Badge variant="secondary" className={cn("text-[10px] h-4", statusColor(a.status))}>
                              {a.status === 'CALCULATED' ? 'Calculado' : 'Dados prontos'}
                            </Badge>
                            {a.diagnostic_type && (
                              <Badge variant="outline" className="text-[10px] h-4">
                                {a.diagnostic_type === 'enterprise' ? 'Empresarial' : 'Territorial'}
                              </Badge>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="trainings">
              <ScrollArea className="h-[300px]">
                {loadingTrainings ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : !trainings?.length ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Nenhum treinamento disponível.
                  </p>
                ) : (
                  <div className="space-y-2 pr-2">
                    {trainings.map(t => {
                      const isSelected = context.trainings?.some(c => c.training_id === t.training_id);
                      return (
                        <button
                          key={t.training_id}
                          onClick={() => toggleTraining(t)}
                          className={cn(
                            "w-full text-left p-3 rounded-lg border transition-colors",
                            isSelected ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium truncate">{t.title}</span>
                            {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-[10px] h-4">{pillarLabel(t.pillar)}</Badge>
                            <Badge variant="secondary" className="text-[10px] h-4">{t.type === 'course' ? 'Curso' : 'Live'}</Badge>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="projects">
              <ScrollArea className="h-[300px]">
                {loadingProjects ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : !projects?.length ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Nenhum projeto encontrado.
                  </p>
                ) : (
                  <div className="space-y-2 pr-2">
                    {projects.map(p => {
                      const isSelected = context.projects?.some(c => c.id === p.id);
                      const destName = (p.destinations as any)?.name || '';
                      return (
                        <button
                          key={p.id}
                          onClick={() => toggleProject(p)}
                          className={cn(
                            "w-full text-left p-3 rounded-lg border transition-colors",
                            isSelected ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium truncate">{p.name}</span>
                            {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            {destName && <span className="text-xs text-muted-foreground truncate">{destName}</span>}
                            <Badge variant="secondary" className="text-[10px] h-4 capitalize">{p.status.replace('_', ' ')}</Badge>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}
