import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { 
  ClipboardCheck, 
  Clock, 
  Target, 
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Info,
  BookOpen
} from 'lucide-react';
import { useExamRulesets, useExamRuleset, useExamRulesetMutations, ExamRuleset } from '@/hooks/useExams';
import { useLMSCourses } from '@/hooks/useLMSCourses';

interface ExamRulesetManagerProps {
  trainingId: string;
  trainingTitle: string;
  pillar?: string;
}

export function ExamRulesetManager({ trainingId, trainingTitle, pillar }: ExamRulesetManagerProps) {
  const { data: lmsCourses, isLoading: loadingCourses } = useLMSCourses();
  const { createRuleset, updateRuleset } = useExamRulesetMutations();
  
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const { data: ruleset, isLoading: loadingRuleset } = useExamRuleset(selectedCourseId || undefined);

  // Form state
  const [formData, setFormData] = useState({
    min_score_pct: 70,
    time_limit_minutes: 60,
    question_count: 10,
    allow_retake: true,
    retake_wait_hours: 24,
    max_attempts: 3,
    min_days_between_same_quiz: 30,
  });

  // Update form when ruleset loads
  useEffect(() => {
    if (ruleset) {
      setFormData({
        min_score_pct: ruleset.min_score_pct,
        time_limit_minutes: ruleset.time_limit_minutes,
        question_count: ruleset.question_count,
        allow_retake: ruleset.allow_retake ?? true,
        retake_wait_hours: ruleset.retake_wait_hours ?? 24,
        max_attempts: ruleset.max_attempts ?? 3,
        min_days_between_same_quiz: ruleset.min_days_between_same_quiz ?? 30,
      });
    }
  }, [ruleset]);

  // Filter courses by pillar if provided
  const filteredCourses = lmsCourses?.filter(course => 
    !pillar || course.primary_pillar === pillar
  ) || [];

  const handleSave = async () => {
    if (!selectedCourseId) {
      toast.error('Selecione um curso LMS primeiro');
      return;
    }

    if (ruleset) {
      updateRuleset.mutate({
        rulesetId: ruleset.ruleset_id,
        ...formData,
      });
    } else {
      createRuleset.mutate({
        course_id: selectedCourseId,
        ...formData,
        pillar_mix: null,
      });
    }
  };

  const isLoading = loadingCourses;
  const isSaving = createRuleset.isPending || updateRuleset.isPending;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Course Selection */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            Curso LMS Vinculado
          </CardTitle>
          <CardDescription>
            Selecione o curso para configurar as regras de exame
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione um curso..." />
            </SelectTrigger>
            <SelectContent>
              {filteredCourses.length === 0 ? (
                <div className="py-4 text-center text-sm text-muted-foreground">
                  Nenhum curso disponível
                </div>
              ) : (
                filteredCourses.map(course => (
                  <SelectItem key={course.course_id} value={course.course_id}>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {course.primary_pillar}
                      </Badge>
                      {course.title}
                    </div>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedCourseId && (
        <>
          {/* Status Card */}
          <Card className={ruleset ? "border-green-500/30 bg-green-500/5" : "border-muted"}>
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {ruleset ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <Info className="h-5 w-5 text-muted-foreground" />
                  )}
                  <div>
                    <p className="font-medium">
                      {ruleset ? 'Regras de Exame Configuradas' : 'Nenhuma regra configurada'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {loadingRuleset ? 'Carregando...' : ruleset ? 'Regras ativas para este curso' : 'Configure as regras abaixo'}
                    </p>
                  </div>
                </div>
                {ruleset && (
                  <Badge variant="outline" className="bg-green-500/10 text-green-700">
                    Ativo
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Settings */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Passing Criteria */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" />
                  Critérios de Aprovação
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="min_score">Nota mínima (%)</Label>
                  <Input
                    id="min_score"
                    type="number"
                    min={0}
                    max={100}
                    value={formData.min_score_pct}
                    onChange={(e) => setFormData({ ...formData, min_score_pct: parseInt(e.target.value) || 0 })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Percentual mínimo para aprovação no exame
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="question_count">Número de questões</Label>
                  <Input
                    id="question_count"
                    type="number"
                    min={1}
                    max={100}
                    value={formData.question_count}
                    onChange={(e) => setFormData({ ...formData, question_count: parseInt(e.target.value) || 10 })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Questões selecionadas aleatoriamente do banco
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Time Limit */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  Tempo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="time_limit">Limite de tempo (minutos)</Label>
                  <Input
                    id="time_limit"
                    type="number"
                    min={5}
                    max={480}
                    value={formData.time_limit_minutes}
                    onChange={(e) => setFormData({ ...formData, time_limit_minutes: parseInt(e.target.value) || 60 })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Tempo máximo para completar o exame
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="min_days">Dias entre mesmas questões</Label>
                  <Input
                    id="min_days"
                    type="number"
                    min={0}
                    max={365}
                    value={formData.min_days_between_same_quiz}
                    onChange={(e) => setFormData({ ...formData, min_days_between_same_quiz: parseInt(e.target.value) || 30 })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Evita repetição de questões recentes
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Retake Rules */}
            <Card className="md:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 text-primary" />
                  Regras de Retentativa
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-3">
                  <div className="flex items-center justify-between space-x-2 md:col-span-3">
                    <div>
                      <Label htmlFor="allow_retake" className="font-medium">Permitir retentativas</Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Alunos podem refazer o exame se reprovados
                      </p>
                    </div>
                    <Switch
                      id="allow_retake"
                      checked={formData.allow_retake}
                      onCheckedChange={(checked) => setFormData({ ...formData, allow_retake: checked })}
                    />
                  </div>

                  {formData.allow_retake && (
                    <>
                      <Separator className="md:col-span-3" />
                      
                      <div className="space-y-2">
                        <Label htmlFor="max_attempts">Máximo de tentativas</Label>
                        <Input
                          id="max_attempts"
                          type="number"
                          min={1}
                          max={10}
                          value={formData.max_attempts}
                          onChange={(e) => setFormData({ ...formData, max_attempts: parseInt(e.target.value) || 3 })}
                        />
                        <p className="text-xs text-muted-foreground">
                          Total de tentativas permitidas
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="retake_wait">Espera entre tentativas (horas)</Label>
                        <Input
                          id="retake_wait"
                          type="number"
                          min={0}
                          max={720}
                          value={formData.retake_wait_hours}
                          onChange={(e) => setFormData({ ...formData, retake_wait_hours: parseInt(e.target.value) || 24 })}
                        />
                        <p className="text-xs text-muted-foreground">
                          Tempo de espera antes de nova tentativa
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={isSaving} className="gap-2">
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <ClipboardCheck className="h-4 w-4" />
                  {ruleset ? 'Atualizar Regras' : 'Criar Regras de Exame'}
                </>
              )}
            </Button>
          </div>
        </>
      )}

      {!selectedCourseId && (
        <Card className="border-yellow-500/30 bg-yellow-500/5">
          <CardContent className="py-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-800">Selecione um curso</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Escolha um curso LMS acima para configurar as regras de exame.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
