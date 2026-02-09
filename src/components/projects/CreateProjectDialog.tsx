import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  useDestinationsWithReportData,
  useCreateProject,
  useCreatePhases,
  useCreateTasks,
  useCreateMilestones,
  METHODOLOGY_INFO,
  ProjectMethodology,
  TaskPriority,
} from '@/hooks/useProjects';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import {
  Loader2,
  Wand2,
  AlertCircle,
  CheckCircle2,
  MapPin,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateProjectDialog({ open, onOpenChange }: CreateProjectDialogProps) {
  const { data: availableDestinations, isLoading: loadingDestinations } = useDestinationsWithReportData();
  const { profile } = useProfile();
  const createProject = useCreateProject();
  const createPhases = useCreatePhases();
  const createTasks = useCreateTasks();
  const createMilestones = useCreateMilestones();
  const { toast } = useToast();

  const [step, setStep] = useState<'select' | 'configure' | 'generate'>('select');
  const [selectedAssessment, setSelectedAssessment] = useState<string>('');
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [methodology, setMethodology] = useState<ProjectMethodology>('waterfall');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [plannedStartDate, setPlannedStartDate] = useState('');
  const [plannedEndDate, setPlannedEndDate] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState('');

  const selectedData = availableDestinations?.find((d) => d.assessment_id === selectedAssessment);

  const handleSelectContinue = () => {
    if (!selectedData) return;
    setProjectName(`Projeto ${selectedData.destination_name}`);
    setStep('configure');
  };

  const handleGenerate = async () => {
    const effectiveOrgId = profile?.viewing_demo_org_id || profile?.org_id;
    if (!selectedData || !effectiveOrgId) return;

    setIsGenerating(true);
    setGenerationProgress('Buscando dados do relatório...');

    try {
      // Fetch report data
      const { data: report } = await supabase
        .from('generated_reports')
        .select('id, report_content')
        .eq('assessment_id', selectedAssessment)
        .single();

      // Fetch issues, prescriptions, action plans, pillar scores, and indicator scores
      const [issuesRes, prescriptionsRes, actionPlansRes, pillarScoresRes, indicatorScoresRes] = await Promise.all([
        supabase.from('issues').select('*').eq('assessment_id', selectedAssessment),
        supabase.from('prescriptions').select('*').eq('assessment_id', selectedAssessment),
        supabase.from('action_plans').select('*').eq('assessment_id', selectedAssessment).order('priority', { ascending: true }),
        supabase.from('pillar_scores').select('*').eq('assessment_id', selectedAssessment),
        supabase.from('indicator_scores').select('*, indicator:indicators(code, name, pillar, theme)').eq('assessment_id', selectedAssessment).order('score', { ascending: true }),
      ]);

      // Build pillar scores map
      const pillarScoresMap: Record<string, any> = {};
      (pillarScoresRes.data || []).forEach((ps: any) => {
        pillarScoresMap[ps.pillar] = { score: ps.score, severity: ps.severity };
      });

      setGenerationProgress('Gerando estrutura do projeto com IA...');

      // Call AI to generate project structure
      const { data: aiResponse, error: aiError } = await supabase.functions.invoke('generate-project-structure', {
        body: {
          destinationName: selectedData.destination_name,
          methodology,
          reportContent: report?.report_content || '',
          issues: issuesRes.data || [],
          prescriptions: prescriptionsRes.data || [],
          actionPlans: actionPlansRes.data || [],
          pillarScores: pillarScoresMap,
          indicatorScores: indicatorScoresRes.data || [],
        },
      });

      if (aiError) throw aiError;

      const structure = aiResponse?.structure;

      setGenerationProgress('Criando projeto...');

      // Create the project with effective org_id (supports demo mode)
      const project = await createProject.mutateAsync({
        org_id: effectiveOrgId!,
        destination_id: selectedData.destination_id,
        assessment_id: selectedAssessment,
        report_id: report?.id,
        name: projectName,
        description: projectDescription || structure?.description,
        methodology,
        priority,
        planned_start_date: plannedStartDate || undefined,
        planned_end_date: plannedEndDate || undefined,
        generated_structure: structure,
      });

      setGenerationProgress('Criando fases...');

      // Create phases based on methodology
      const methodologyPhases = METHODOLOGY_INFO[methodology].phases;
      const phases = methodologyPhases.map((phase, index) => ({
        project_id: project.id,
        name: structure?.phases?.[index]?.name || phase.name,
        description: structure?.phases?.[index]?.description || phase.description,
        phase_order: index + 1,
        phase_type: methodology === 'waterfall' ? 'waterfall_phase' : 
                    methodology === 'safe' ? 'safe_pi' : 
                    methodology === 'scrum' ? 'sprint' : 'kanban_column',
        status: 'pending' as const,
        deliverables: structure?.phases?.[index]?.deliverables || [],
        planned_start_date: null,
        planned_end_date: null,
        actual_start_date: null,
        actual_end_date: null,
      }));

      const createdPhases = await createPhases.mutateAsync(phases);

      setGenerationProgress('Criando tarefas...');

      // Create tasks from AI-generated structure or issues/prescriptions
      const tasks: Parameters<typeof createTasks.mutateAsync>[0] = [];

      if (structure?.tasks && Array.isArray(structure.tasks)) {
        structure.tasks.forEach((task: any, index: number) => {
          tasks.push({
            project_id: project.id,
            phase_id: createdPhases?.[0]?.id || null,
            parent_task_id: null,
            title: task.title,
            description: task.description,
            task_type: task.type || 'task',
            status: 'todo',
            priority: task.priority || 'medium',
            assignee_id: null,
            assignee_name: null,
            estimated_hours: task.estimatedHours || null,
            actual_hours: null,
            story_points: task.storyPoints || null,
            planned_start_date: null,
            planned_end_date: null,
            actual_start_date: null,
            actual_end_date: null,
            linked_issue_id: null,
            linked_prescription_id: null,
            linked_action_plan_id: null,
            tags: task.tags || [],
          });
        });
      }

      // Also create tasks from issues
      issuesRes.data?.forEach((issue) => {
        tasks.push({
          project_id: project.id,
          phase_id: null,
          parent_task_id: null,
          title: `Resolver: ${issue.title}`,
          description: null,
          task_type: 'task',
          status: 'backlog',
          priority: issue.severity === 'CRITICO' ? 'critical' : issue.severity === 'MODERADO' ? 'high' : 'medium',
          assignee_id: null,
          assignee_name: null,
          estimated_hours: null,
          actual_hours: null,
          story_points: null,
          planned_start_date: null,
          planned_end_date: null,
          actual_start_date: null,
          actual_end_date: null,
          linked_issue_id: issue.id,
          linked_prescription_id: null,
          linked_action_plan_id: null,
          tags: [issue.pillar],
        });
      });

      if (tasks.length > 0) {
        await createTasks.mutateAsync(tasks);
      }

      setGenerationProgress('Criando marcos...');

      // Create milestones
      if (structure?.milestones && Array.isArray(structure.milestones)) {
        const milestones = structure.milestones.map((m: any) => ({
          project_id: project.id,
          name: m.name,
          description: m.description,
          target_date: m.targetDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          completed_date: null,
          status: 'pending' as const,
        }));

        await createMilestones.mutateAsync(milestones);
      }

      toast({
        title: 'Projeto criado com sucesso!',
        description: `${projectName} foi criado com ${tasks.length} tarefas`,
      });

      // Reset and close
      resetForm();
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating project:', error);
      toast({
        title: 'Erro ao criar projeto',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
      setGenerationProgress('');
    }
  };

  const resetForm = () => {
    setStep('select');
    setSelectedAssessment('');
    setProjectName('');
    setProjectDescription('');
    setMethodology('waterfall');
    setPriority('medium');
    setPlannedStartDate('');
    setPlannedEndDate('');
  };

  const handleClose = () => {
    if (!isGenerating) {
      resetForm();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-primary" />
            {step === 'select' && 'Selecionar Base do Projeto'}
            {step === 'configure' && 'Configurar Projeto'}
            {step === 'generate' && 'Gerando Projeto'}
          </DialogTitle>
          <DialogDescription>
            {step === 'select' && 'Escolha um destino com diagnóstico calculado e relatório gerado'}
            {step === 'configure' && 'Defina as configurações e metodologia do projeto'}
            {step === 'generate' && 'Aguarde enquanto geramos a estrutura do projeto'}
          </DialogDescription>
        </DialogHeader>

        {step === 'select' && (
          <div className="space-y-4">
            {loadingDestinations ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : !availableDestinations || availableDestinations.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <AlertCircle className="h-10 w-10 text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground text-center">
                    Nenhum destino disponível. Para criar um projeto, você precisa ter:
                  </p>
                  <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                    <li>• Um diagnóstico com status CALCULATED</li>
                    <li>• Um relatório gerado para esse diagnóstico</li>
                  </ul>
                </CardContent>
              </Card>
            ) : (
              <RadioGroup
                value={selectedAssessment}
                onValueChange={setSelectedAssessment}
                className="space-y-3"
              >
                {availableDestinations.map((item) => (
                  <Card
                    key={item.assessment_id}
                    className={cn(
                      'cursor-pointer transition-colors',
                      selectedAssessment === item.assessment_id && 'border-primary ring-1 ring-primary'
                    )}
                    onClick={() => setSelectedAssessment(item.assessment_id)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-3">
                        <RadioGroupItem value={item.assessment_id} id={item.assessment_id} />
                        <div className="flex-1">
                          <CardTitle className="text-base flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            {item.destination_name}
                            {item.destination_uf && (
                              <Badge variant="outline" className="text-xs">
                                {item.destination_uf}
                              </Badge>
                            )}
                          </CardTitle>
                          <CardDescription className="flex items-center gap-2 mt-1">
                            <FileText className="h-3 w-3" />
                            {item.assessment_title}
                          </CardDescription>
                        </div>
                        <Badge variant="secondary" className="bg-green-100 text-green-700">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Pronto
                        </Badge>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </RadioGroup>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button onClick={handleSelectContinue} disabled={!selectedAssessment}>
                Continuar
              </Button>
            </div>
          </div>
        )}

        {step === 'configure' && (
          <div className="space-y-6">
            {/* Project Info */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Projeto *</Label>
                <Input
                  id="name"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="Nome do projeto"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  placeholder="Descrição detalhada do projeto (opcional - será gerada pela IA)"
                  rows={3}
                />
              </div>
            </div>

            {/* Methodology Selection */}
            <div className="space-y-3">
              <Label>Metodologia de Gestão *</Label>
              <div className="grid md:grid-cols-2 gap-3">
                {(Object.keys(METHODOLOGY_INFO) as ProjectMethodology[]).map((key) => {
                  const info = METHODOLOGY_INFO[key];
                  return (
                    <Card
                      key={key}
                      className={cn(
                        'cursor-pointer transition-colors',
                        methodology === key && 'border-primary ring-1 ring-primary'
                      )}
                      onClick={() => setMethodology(key)}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            checked={methodology === key}
                            onChange={() => setMethodology(key)}
                            className="h-4 w-4"
                          />
                          <CardTitle className="text-sm">{info.name}</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-xs text-muted-foreground">{info.description}</p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* Priority and Dates */}
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Prioridade</Label>
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
                <Label htmlFor="startDate">Data de Início</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={plannedStartDate}
                  onChange={(e) => setPlannedStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">Data de Término</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={plannedEndDate}
                  onChange={(e) => setPlannedEndDate(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-between gap-2 pt-4">
              <Button variant="outline" onClick={() => setStep('select')}>
                Voltar
              </Button>
              <Button onClick={handleGenerate} disabled={!projectName || isGenerating}>
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <Wand2 className="h-4 w-4 mr-2" />
                    Gerar Projeto com IA
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {isGenerating && (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-muted-foreground">{generationProgress}</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
