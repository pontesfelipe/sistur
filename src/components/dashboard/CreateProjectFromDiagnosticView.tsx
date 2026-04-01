import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useIssues } from "@/hooks/useAssessmentData";
import { useCreateProject, useCreateTasks, type ProjectMethodology, type TaskPriority } from "@/hooks/useProjects";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { 
  FolderKanban, 
  AlertTriangle,
  Loader2,
  CheckCircle2,
  ArrowRight,
  ListChecks,
  Settings2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

interface CreateProjectFromDiagnosticViewProps {
  assessmentId: string;
  destinationId?: string;
}

const PILLAR_CONFIG = {
  RA: { label: "Relações Ambientais", color: "text-pillar-ra border-pillar-ra/30 bg-pillar-ra/10" },
  OE: { label: "Organização Estrutural", color: "text-pillar-oe border-pillar-oe/30 bg-pillar-oe/10" },
  AO: { label: "Ações Operacionais", color: "text-pillar-ao border-pillar-ao/30 bg-pillar-ao/10" },
};

const METHODOLOGY_OPTIONS: { value: ProjectMethodology; label: string; description: string }[] = [
  { value: "kanban", label: "Kanban", description: "Fluxo contínuo, ideal para equipes pequenas" },
  { value: "scrum", label: "Scrum", description: "Sprints com entregas incrementais" },
  { value: "waterfall", label: "Cascata", description: "Fases sequenciais com marcos definidos" },
  { value: "safe", label: "SAFe", description: "Framework escalável para grandes organizações" },
];

export function CreateProjectFromDiagnosticView({ assessmentId, destinationId }: CreateProjectFromDiagnosticViewProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { data: plans, isLoading: plansLoading } = useActionPlans(assessmentId);
  const { data: prescriptions, isLoading: prescriptionsLoading } = usePrescriptions(assessmentId);
  const createProject = useCreateProject();
  const createTasks = useCreateTasks();

  const [step, setStep] = useState<'select' | 'configure'>('select');
  const [selectedPlanIds, setSelectedPlanIds] = useState<Set<string>>(new Set());
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [methodology, setMethodology] = useState<ProjectMethodology>("kanban");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [plannedStartDate, setPlannedStartDate] = useState("");
  const [plannedEndDate, setPlannedEndDate] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const isLoading = plansLoading || prescriptionsLoading;

  // Merge action plans as selectable items
  const selectableItems = useMemo(() => {
    if (!plans) return [];
    return plans.map(plan => ({
      id: plan.id,
      title: plan.title,
      description: plan.description,
      pillar: plan.pillar,
      priority: plan.priority,
      linkedIssueId: plan.linked_issue_id,
      linkedPrescriptionId: plan.linked_prescription_id,
    }));
  }, [plans]);

  const toggleItem = (id: string) => {
    setSelectedPlanIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedPlanIds.size === selectableItems.length) {
      setSelectedPlanIds(new Set());
    } else {
      setSelectedPlanIds(new Set(selectableItems.map(i => i.id)));
    }
  };

  const handleContinue = () => {
    if (selectedPlanIds.size === 0) {
      toast.error("Selecione pelo menos um item para criar o projeto");
      return;
    }
    // Auto-suggest project name
    if (!projectName) {
      const pillars = new Set(
        selectableItems.filter(i => selectedPlanIds.has(i.id) && i.pillar).map(i => i.pillar)
      );
      const pillarStr = Array.from(pillars).join("/");
      setProjectName(`Projeto ${pillarStr || "Diagnóstico"} — ${selectedPlanIds.size} ações`);
    }
    setStep('configure');
  };

  const handleCreateProject = async () => {
    if (!projectName.trim()) {
      toast.error("Informe o nome do projeto");
      return;
    }
    if (!profile?.org_id || !destinationId) {
      toast.error("Dados da organização ou destino não encontrados");
      return;
    }

    setIsCreating(true);
    try {
      // 1. Create the project
      const project = await createProject.mutateAsync({
        org_id: profile.org_id,
        destination_id: destinationId,
        assessment_id: assessmentId,
        name: projectName.trim(),
        description: projectDescription.trim() || undefined,
        methodology,
        priority,
        planned_start_date: plannedStartDate || undefined,
        planned_end_date: plannedEndDate || undefined,
      });

      // 2. Create tasks from selected action plans
      const selectedItems = selectableItems.filter(i => selectedPlanIds.has(i.id));
      if (selectedItems.length > 0) {
        const tasks = selectedItems.map((item, idx) => ({
          project_id: project.id,
          phase_id: null,
          parent_task_id: null,
          title: item.title,
          description: item.description,
          task_type: 'task' as const,
          status: 'todo' as const,
          priority: item.priority === 1 ? 'critical' as const : item.priority <= 3 ? 'high' as const : 'medium' as const,
          assignee_id: null,
          assignee_name: null,
          estimated_hours: null,
          actual_hours: null,
          story_points: null,
          planned_start_date: null,
          planned_end_date: null,
          actual_start_date: null,
          actual_end_date: null,
          linked_issue_id: item.linkedIssueId,
          linked_prescription_id: item.linkedPrescriptionId,
          linked_action_plan_id: item.id,
          tags: item.pillar ? [item.pillar] : [],
        }));

        await createTasks.mutateAsync(tasks);
      }

      toast.success("Projeto criado com sucesso!", {
        description: `${selectedItems.length} tarefas adicionadas ao projeto`,
      });

      // Navigate to the project
      navigate(`/projetos`);
    } catch (err) {
      console.error('Error creating project:', err);
      toast.error("Erro ao criar projeto");
    } finally {
      setIsCreating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!selectableItems.length) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <FolderKanban className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">Nenhuma ação identificada</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Execute o diagnóstico para identificar gargalos e gerar ações que podem ser convertidas em projeto.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Step 1: Select items
  if (step === 'select') {
    return (
      <div className="space-y-6">
        {/* Header */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="flex items-start gap-4 pt-6">
            <div className="p-3 rounded-lg bg-primary/10">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-display font-semibold text-foreground">
                Criar Projeto a partir do Diagnóstico
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Selecione as ações identificadas pelo diagnóstico que deseja incluir como tarefas no novo projeto. 
                Após selecionar, você poderá configurar os detalhes do projeto.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Select all */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Checkbox 
              checked={selectedPlanIds.size === selectableItems.length && selectableItems.length > 0}
              onCheckedChange={selectAll}
            />
            <span className="text-sm font-medium">
              Selecionar todas ({selectableItems.length} ações)
            </span>
          </div>
          <Badge variant="secondary" className="text-xs">
            {selectedPlanIds.size} selecionada{selectedPlanIds.size !== 1 ? 's' : ''}
          </Badge>
        </div>

        {/* Items list */}
        <div className="space-y-2">
          {selectableItems.map((item) => {
            const isSelected = selectedPlanIds.has(item.id);
            const pillarConfig = item.pillar ? PILLAR_CONFIG[item.pillar as keyof typeof PILLAR_CONFIG] : null;

            return (
              <Card 
                key={item.id} 
                className={`cursor-pointer transition-all ${
                  isSelected ? 'ring-2 ring-primary border-primary/50' : 'hover:bg-muted/50'
                } ${item.priority === 1 ? 'border-l-4 border-l-destructive' : ''}`}
                onClick={() => toggleItem(item.id)}
              >
                <CardContent className="flex items-start gap-3 py-3 px-4">
                  <Checkbox 
                    checked={isSelected}
                    onCheckedChange={() => toggleItem(item.id)}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {item.priority === 1 && (
                        <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />
                      )}
                      <p className="font-medium text-sm truncate">{item.title}</p>
                    </div>
                    {item.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {pillarConfig && (
                      <Badge variant="outline" className={`text-xs ${pillarConfig.color}`}>
                        {item.pillar}
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs">
                      P{item.priority}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Continue button */}
        <div className="flex justify-end">
          <Button 
            onClick={handleContinue} 
            disabled={selectedPlanIds.size === 0}
            className="gap-2"
          >
            Continuar
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  // Step 2: Configure project
  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex items-start gap-4 pt-6">
          <div className="p-3 rounded-lg bg-primary/10">
            <Settings2 className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-display font-semibold text-foreground">
              Configurar Projeto
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Preencha os detalhes do projeto. {selectedPlanIds.size} ação(ões) serão convertidas em tarefas.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FolderKanban className="h-4 w-4" />
            Detalhes do Projeto
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Nome do Projeto *</label>
            <Input
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Ex: Plano de Melhoria Turística 2026"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Descrição</label>
            <Textarea
              value={projectDescription}
              onChange={(e) => setProjectDescription(e.target.value)}
              placeholder="Descreva os objetivos e escopo do projeto..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Metodologia</label>
              <Select value={methodology} onValueChange={(v) => setMethodology(v as ProjectMethodology)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {METHODOLOGY_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <div>
                        <span className="font-medium">{opt.label}</span>
                        <span className="text-muted-foreground ml-2 text-xs">{opt.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Prioridade</label>
              <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baixa</SelectItem>
                  <SelectItem value="medium">Média</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="critical">Crítica</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Data de Início</label>
              <Input
                type="date"
                value={plannedStartDate}
                onChange={(e) => setPlannedStartDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Data de Término</label>
              <Input
                type="date"
                value={plannedEndDate}
                onChange={(e) => setPlannedEndDate(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Selected items preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ListChecks className="h-4 w-4" />
            Tarefas que serão criadas ({selectedPlanIds.size})
          </CardTitle>
          <CardDescription>
            Cada ação selecionada será convertida em uma tarefa do projeto
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-1.5">
            {selectableItems.filter(i => selectedPlanIds.has(i.id)).map(item => {
              const pillarConfig = item.pillar ? PILLAR_CONFIG[item.pillar as keyof typeof PILLAR_CONFIG] : null;
              return (
                <div key={item.id} className="flex items-center gap-2 py-1.5 px-2 rounded-md bg-muted/50 text-sm">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="flex-1 truncate">{item.title}</span>
                  {pillarConfig && (
                    <Badge variant="outline" className={`text-xs ${pillarConfig.color}`}>
                      {item.pillar}
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => setStep('select')}>
          Voltar
        </Button>
        <Button 
          onClick={handleCreateProject}
          disabled={isCreating || !projectName.trim()}
          className="gap-2"
        >
          {isCreating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Criando projeto...
            </>
          ) : (
            <>
              <FolderKanban className="h-4 w-4" />
              Criar Projeto
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
