import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Plus,
  Search,
  HelpCircle,
  CheckCircle,
  ClipboardList,
  Loader2,
  GripVertical,
  X,
  ListChecks,
  FileQuestion,
  BookOpen,
} from 'lucide-react';
import { useQuizQuestions } from '@/hooks/useQuizzes';
import { useLMSCourses } from '@/hooks/useLMSCourses';
import { useExamRulesets, useExamRulesetMutations } from '@/hooks/useExams';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export function ExamBuilderPanel() {
  const [searchQuery, setSearchQuery] = useState('');
  const [pillarFilter, setPillarFilter] = useState<string>('all');
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [examSettings, setExamSettings] = useState({
    min_score_pct: 70,
    time_limit_minutes: 60,
  });

  const { data: questions, isLoading } = useQuizQuestions();
  const { data: lmsCourses, isLoading: loadingCourses } = useLMSCourses();
  const { data: examRulesets, isLoading: loadingRulesets } = useExamRulesets();
  const { createRuleset } = useExamRulesetMutations();

  const filteredQuestions =
    questions?.filter((q) => {
      const matchesSearch = !searchQuery || q.stem.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesPillar = pillarFilter === 'all' || q.pillar === pillarFilter;
      return matchesSearch && matchesPillar;
    }) || [];

  const selectedQuestionDetails =
    questions?.filter((q) => selectedQuestions.includes(q.quiz_id)) || [];

  const toggleQuestion = (quizId: string) => {
    setSelectedQuestions((prev) =>
      prev.includes(quizId) ? prev.filter((id) => id !== quizId) : [...prev, quizId]
    );
  };

  const removeQuestion = (quizId: string) => {
    setSelectedQuestions((prev) => prev.filter((id) => id !== quizId));
  };

  const clearSelection = () => {
    setSelectedQuestions([]);
  };

  const handleCreateExam = async () => {
    if (!selectedCourseId) {
      toast.error('Selecione um curso');
      return;
    }

    if (selectedQuestions.length === 0) {
      toast.error('Selecione pelo menos uma questão');
      return;
    }

    try {
      const pillarCounts: Record<string, number> = {};
      selectedQuestionDetails.forEach((q) => {
        pillarCounts[q.pillar] = (pillarCounts[q.pillar] || 0) + 1;
      });

      await createRuleset.mutateAsync({
        course_id: selectedCourseId,
        min_score_pct: examSettings.min_score_pct,
        time_limit_minutes: examSettings.time_limit_minutes,
        question_count: selectedQuestions.length,
        allow_retake: true,
        retake_wait_hours: 24,
        max_attempts: 3,
        min_days_between_same_quiz: 0,
        pillar_mix: pillarCounts,
      });

      toast.success('Exame criado com sucesso!');
      setIsCreateDialogOpen(false);
      setSelectedCourseId('');
      clearSelection();
    } catch (error) {
      console.error('Error creating exam:', error);
      toast.error('Erro ao criar exame');
    }
  };

  const getDifficultyBadge = (difficulty: number | null | undefined) => {
    if ((difficulty || 0) <= 0.34) {
      return <Badge variant="outline" className="text-xs">Fácil</Badge>;
    }

    if ((difficulty || 0) <= 0.66) {
      return <Badge variant="secondary" className="text-xs">Médio</Badge>;
    }

    return <Badge className="text-xs">Difícil</Badge>;
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'multiple_choice':
        return (
          <Badge variant="secondary" className="text-xs">
            <ListChecks className="mr-1 h-3 w-3" />
            ME
          </Badge>
        );
      case 'true_false':
        return (
          <Badge variant="secondary" className="text-xs">
            <CheckCircle className="mr-1 h-3 w-3" />
            V/F
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="text-xs">
            <FileQuestion className="mr-1 h-3 w-3" />
            Dis.
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardList className="h-4 w-4 text-primary" />
            Provas cadastradas
          </CardTitle>
          <CardDescription>
            {examRulesets?.length || 0} prova(s) já configurada(s) no sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingRulesets ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, index) => (
                <Skeleton key={index} className="h-12 w-full" />
              ))}
            </div>
          ) : !examRulesets?.length ? (
            <div className="py-8 text-center text-muted-foreground">
              <ClipboardList className="mx-auto mb-2 h-8 w-8 opacity-50" />
              <p className="text-sm">Nenhuma prova cadastrada ainda</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Curso</TableHead>
                    <TableHead>Questões</TableHead>
                    <TableHead>Nota mínima</TableHead>
                    <TableHead>Tempo</TableHead>
                    <TableHead>Tentativas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {examRulesets.map((ruleset) => (
                    <TableRow key={ruleset.ruleset_id}>
                      <TableCell className="font-medium">
                        {ruleset.lms_courses?.title || 'Curso sem título'}
                      </TableCell>
                      <TableCell>{ruleset.question_count}</TableCell>
                      <TableCell>{Number(ruleset.min_score_pct)}%</TableCell>
                      <TableCell>{ruleset.time_limit_minutes} min</TableCell>
                      <TableCell>{ruleset.max_attempts}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <HelpCircle className="h-4 w-4 text-primary" />
                Banco de Questões
              </CardTitle>
              <CardDescription>
                Selecione as questões para compor uma nova prova
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar questões..."
                    className="pl-9"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Select value={pillarFilter} onValueChange={setPillarFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Pilar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="RA">RA</SelectItem>
                    <SelectItem value="OE">OE</SelectItem>
                    <SelectItem value="AO">AO</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {isLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, index) => (
                    <Skeleton key={index} className="h-12 w-full" />
                  ))}
                </div>
              ) : filteredQuestions.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <HelpCircle className="mx-auto mb-2 h-8 w-8 opacity-50" />
                  <p className="text-sm">Nenhuma questão encontrada</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10"></TableHead>
                        <TableHead>Enunciado</TableHead>
                        <TableHead className="w-20">Pilar</TableHead>
                        <TableHead className="w-20">Tipo</TableHead>
                        <TableHead className="w-24">Dif.</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredQuestions.map((question) => (
                        <TableRow
                          key={question.quiz_id}
                          className={selectedQuestions.includes(question.quiz_id) ? 'bg-primary/5' : ''}
                        >
                          <TableCell>
                            <Checkbox
                              checked={selectedQuestions.includes(question.quiz_id)}
                              onCheckedChange={() => toggleQuestion(question.quiz_id)}
                            />
                          </TableCell>
                          <TableCell className="max-w-md font-medium">
                            <span className="line-clamp-2">{question.stem}</span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{question.pillar}</Badge>
                          </TableCell>
                          <TableCell>{getTypeBadge(question.question_type)}</TableCell>
                          <TableCell>{getDifficultyBadge(question.difficulty)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <ClipboardList className="h-4 w-4 text-primary" />
                  Nova prova ({selectedQuestions.length})
                </CardTitle>
                {selectedQuestions.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearSelection}>
                    Limpar
                  </Button>
                )}
              </div>
              <CardDescription>
                Questões selecionadas para a nova prova
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedQuestions.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <ClipboardList className="mx-auto mb-2 h-8 w-8 opacity-50" />
                  <p className="text-sm">Selecione questões ao lado</p>
                </div>
              ) : (
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2">
                    {selectedQuestionDetails.map((question, index) => (
                      <div
                        key={question.quiz_id}
                        className="group flex items-start gap-2 rounded-lg bg-muted/50 p-2"
                      >
                        <div className="flex shrink-0 items-center gap-2">
                          <GripVertical className="h-4 w-4 text-muted-foreground" />
                          <span className="w-5 text-xs font-medium text-muted-foreground">
                            {index + 1}.
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-2 text-sm">{question.stem}</p>
                          <div className="mt-1 flex gap-1">
                            <Badge variant="outline" className="text-xs">
                              {question.pillar}
                            </Badge>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100"
                          onClick={() => removeQuestion(question.quiz_id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}

              {selectedQuestions.length > 0 && (
                <Button className="mt-4 w-full" onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Criar prova
                </Button>
              )}
            </CardContent>
          </Card>

          {selectedQuestions.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Resumo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total de questões:</span>
                  <span className="font-medium">{selectedQuestions.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Pilar RA:</span>
                  <span className="font-medium">
                    {selectedQuestionDetails.filter((q) => q.pillar === 'RA').length}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Pilar OE:</span>
                  <span className="font-medium">
                    {selectedQuestionDetails.filter((q) => q.pillar === 'OE').length}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Pilar AO:</span>
                  <span className="font-medium">
                    {selectedQuestionDetails.filter((q) => q.pillar === 'AO').length}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar prova</DialogTitle>
            <DialogDescription>
              Configure as regras e associe a um curso LMS
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Curso LMS</Label>
              <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um curso..." />
                </SelectTrigger>
                <SelectContent>
                  {loadingCourses ? (
                    <div className="py-4 text-center text-sm text-muted-foreground">Carregando...</div>
                  ) : lmsCourses?.length === 0 ? (
                    <div className="py-4 text-center text-sm text-muted-foreground">
                      Nenhum curso disponível
                    </div>
                  ) : (
                    lmsCourses?.map((course) => (
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
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="min_score">Nota mínima (%)</Label>
                <Input
                  id="min_score"
                  type="number"
                  min={0}
                  max={100}
                  value={examSettings.min_score_pct}
                  onChange={(e) =>
                    setExamSettings({
                      ...examSettings,
                      min_score_pct: parseInt(e.target.value) || 70,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="time_limit">Tempo (minutos)</Label>
                <Input
                  id="time_limit"
                  type="number"
                  min={5}
                  max={480}
                  value={examSettings.time_limit_minutes}
                  onChange={(e) =>
                    setExamSettings({
                      ...examSettings,
                      time_limit_minutes: parseInt(e.target.value) || 60,
                    })
                  }
                />
              </div>
            </div>

            <Card className="bg-muted/50">
              <CardContent className="py-3">
                <div className="flex items-center gap-2 text-sm">
                  <BookOpen className="h-4 w-4 text-primary" />
                  <span className="font-medium">{selectedQuestions.length} questões</span>
                  <span className="text-muted-foreground">serão usadas nesta prova</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleCreateExam}
              disabled={!selectedCourseId || createRuleset.isPending}
            >
              {createRuleset.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Criar prova'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
