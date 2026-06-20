import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCreateTasks, useProjectPhases } from "@/hooks/useProjects";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Sparkles, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface Suggestion {
  title: string;
  description: string;
  priority: "low" | "medium" | "high" | "critical";
  estimated_hours: number | null;
  phase_id: string | null;
  indicator_code: string | null;
  tags: string[];
}

export function AISuggestTasksDialog({
  projectId,
  open,
  onOpenChange,
}: {
  projectId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const createTasks = useCreateTasks();
  const { data: phases = [] } = useProjectPhases(projectId);

  const generate = async () => {
    setLoading(true);
    setSuggestions([]);
    setSelected(new Set());
    try {
      const { data, error } = await supabase.functions.invoke("suggest-project-tasks", {
        body: { project_id: projectId },
      });
      if (error) throw error;
      const list = (data?.suggestions ?? []) as Suggestion[];
      setSuggestions(list);
      setSelected(new Set(list.map((_, i) => i)));
      if (list.length === 0) toast.info("Nenhuma sugestão gerada — projeto já parece coberto.");
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao gerar sugestões");
    } finally {
      setLoading(false);
    }
  };

  const importSelected = async () => {
    const toCreate = suggestions
      .filter((_, i) => selected.has(i))
      .map((s) => ({
        project_id: projectId,
        phase_id: s.phase_id,
        parent_task_id: null,
        title: s.title,
        description: s.description,
        task_type: "task" as const,
        status: "todo" as const,
        priority: s.priority,
        assignee_id: null,
        assignee_name: null,
        estimated_hours: s.estimated_hours,
        actual_hours: null,
        story_points: null,
        planned_start_date: null,
        planned_end_date: null,
        actual_start_date: null,
        actual_end_date: null,
        linked_issue_id: null,
        linked_prescription_id: null,
        linked_action_plan_id: null,
        tags: [...(s.tags ?? []), ...(s.indicator_code ? [s.indicator_code] : []), "IA"],
      }));
    if (toCreate.length === 0) {
      toast.info("Selecione ao menos uma sugestão.");
      return;
    }
    await createTasks.mutateAsync(toCreate as any);
    toast.success(`${toCreate.length} tarefa(s) criada(s).`);
    onOpenChange(false);
    setSuggestions([]);
    setSelected(new Set());
  };

  const toggle = (i: number) => {
    const next = new Set(selected);
    next.has(i) ? next.delete(i) : next.add(i);
    setSelected(next);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" /> Sugerir tarefas com IA</DialogTitle>
          <DialogDescription>
            A IA Lovable analisa indicadores vinculados, fases e tarefas existentes para sugerir novas tarefas acionáveis.
          </DialogDescription>
        </DialogHeader>

        {suggestions.length === 0 && !loading && (
          <div className="py-8 text-center">
            <Button onClick={generate} size="lg"><Sparkles className="h-4 w-4 mr-2" /> Gerar sugestões</Button>
          </div>
        )}

        {loading && (
          <div className="py-12 flex flex-col items-center gap-2 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="text-sm">Analisando projeto...</span>
          </div>
        )}

        {suggestions.length > 0 && (
          <div className="space-y-2">
            {suggestions.map((s, i) => {
              const phase = phases.find((p) => p.id === s.phase_id);
              return (
                <div key={i} className="border rounded-lg p-3 flex gap-3">
                  <Checkbox checked={selected.has(i)} onCheckedChange={() => toggle(i)} className="mt-1" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <Badge variant="outline" className="text-xs">{s.priority}</Badge>
                      {phase && <Badge variant="secondary" className="text-xs">{phase.name}</Badge>}
                      {s.indicator_code && <Badge className="text-xs font-mono bg-primary/10 text-primary">{s.indicator_code}</Badge>}
                      {s.estimated_hours && <span className="text-xs text-muted-foreground">{s.estimated_hours}h</span>}
                    </div>
                    <p className="font-medium text-sm">{s.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{s.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <DialogFooter>
          {suggestions.length > 0 && (
            <Button variant="outline" onClick={generate} disabled={loading}>
              <RefreshCw className="h-4 w-4 mr-1" /> Regenerar
            </Button>
          )}
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          {suggestions.length > 0 && (
            <Button onClick={importSelected} disabled={createTasks.isPending || selected.size === 0}>
              {createTasks.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Importar {selected.size} tarefa(s)
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}