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
} from "@/components/ui/select";
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
import { 
  useQuizQuestions, 
  type QuizQuestion 
} from '@/hooks/useQuizzes';
import { useLMSCourses } from '@/hooks/useLMSCourses';
import { useExamRulesetMutations } from '@/hooks/useExams';
import { PILLAR_INFO, type Pillar } from '@/types/sistur';
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
  const { createRuleset } = useExamRulesetMutations();
  
  const filteredQuestions = questions?.filter(q => {
    const matchesSearch = !searchQuery || 
      q.stem.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPillar = pillarFilter === 'all' || q.pillar === pillarFilter;
    return matchesSearch && matchesPillar;
  }) || [];

  const selectedQuestionDetails = questions?.filter(q => 
    selectedQuestions.includes(q.quiz_id)
  ) || [];

  const toggleQuestion = (quizId: string) => {
    setSelectedQuestions(prev => 
      prev.includes(quizId) 
        ? prev.filter(id => id !== quizId)
        : [...prev, quizId]
    );
  };

  const removeQuestion = (quizId: string) => {
    setSelectedQuestions(prev => prev.filter(id => id !== quizId));
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
      // Create pillar mix based on selected questions distribution
      const pillarCounts: Record<string, number> = {};
      selectedQuestionDetails.forEach(q => {
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

      toast.success('Exame configurado com sucesso!');
      setIsCreateDialogOpen(false);
      setSelectedCourseId('');
      clearSelection();
    } catch (error) {
      console.error('Error creating exam:', error);
      toast.error('Erro ao criar exame');
    }
  };

  const getDifficultyBadge = (difficulty: number) => {
    if (difficulty <= 1) return <Badge variant="outline" className="bg-green-500/10 text-green-700 text-xs">Fácil</Badge>;
    if (difficulty <= 2) return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-700 text-xs">Médio</Badge>;
    return <Badge variant="outline" className="bg-red-500/10 text-red-700 text-xs">Difícil</Badge>;
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'multiple_choice':
        return <Badge variant="secondary" className="text-xs"><ListChecks className="w-3 h-3 mr-1" />ME</Badge>;
      case 'true_false':
        return <Badge variant="secondary" className="text-xs"><CheckCircle className="w-3 h-3 mr-1" />V/F</Badge>;
      default:
        return <Badge variant="secondary" className="text-xs"><FileQuestion className="w-3 h-3 mr-1" />Dis</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Question Pool */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-primary" />
                Banco de Questões
              </CardTitle>
              <CardDescription>
                Selecione as questões para compor o exame
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
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
                        <TableHead className="w-20">Dif.</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredQuestions.map((question) => (
                        <TableRow 
                          key={question.quiz_id}
                          className={selectedQuestions.includes(question.quiz_id) ? "bg-primary/5" : ""}
                        >
                          <TableCell>
                            <Checkbox
                              checked={selectedQuestions.includes(question.quiz_id)}
                              onCheckedChange={() => toggleQuestion(question.quiz_id)}
                            />
                          </TableCell>
                          <TableCell className="font-medium max-w-md">
                            <span className="line-clamp-2">{question.stem}</span>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant="outline"
                              style={{ 
                                backgroundColor: `${PILLAR_INFO[question.pillar as Pillar]?.color}20`,
                                borderColor: PILLAR_INFO[question.pillar as Pillar]?.color 
                              }}
                            >
                              {question.pillar}
                            </Badge>
                          </TableCell>
                          <TableCell>{getTypeBadge(question.question_type)}</TableCell>
                          <TableCell>{getDifficultyBadge(question.difficulty || 1)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Selected Questions */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-primary" />
                  Exame ({selectedQuestions.length})
                </CardTitle>
                {selectedQuestions.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearSelection}>
                    Limpar
                  </Button>
                )}
              </div>
              <CardDescription>
                Questões selecionadas para o exame
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedQuestions.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Selecione questões ao lado</p>
                </div>
              ) : (
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2">
                    {selectedQuestionDetails.map((question, idx) => (
                      <div 
                        key={question.quiz_id}
                        className="flex items-start gap-2 p-2 rounded-lg bg-muted/50 group"
                      >
                        <div className="flex items-center gap-2 shrink-0">
                          <GripVertical className="h-4 w-4 text-muted-foreground" />
                          <span className="text-xs font-medium text-muted-foreground w-5">
                            {idx + 1}.
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm line-clamp-2">{question.stem}</p>
                          <div className="flex gap-1 mt-1">
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
                <Button 
                  className="w-full mt-4" 
                  onClick={() => setIsCreateDialogOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Atribuir a Curso
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Stats Summary */}
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
                    {selectedQuestionDetails.filter(q => q.pillar === 'RA').length}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Pilar OE:</span>
                  <span className="font-medium">
                    {selectedQuestionDetails.filter(q => q.pillar === 'OE').length}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Pilar AO:</span>
                  <span className="font-medium">
                    {selectedQuestionDetails.filter(q => q.pillar === 'AO').length}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Create Exam Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Atribuir Exame ao Curso</DialogTitle>
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
                    <div className="py-4 text-center text-sm text-muted-foreground">
                      Carregando...
                    </div>
                  ) : lmsCourses?.length === 0 ? (
                    <div className="py-4 text-center text-sm text-muted-foreground">
                      Nenhum curso disponível
                    </div>
                  ) : (
                    lmsCourses?.map(course => (
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
                  onChange={(e) => setExamSettings({ 
                    ...examSettings, 
                    min_score_pct: parseInt(e.target.value) || 70 
                  })}
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
                  onChange={(e) => setExamSettings({ 
                    ...examSettings, 
                    time_limit_minutes: parseInt(e.target.value) || 60 
                  })}
                />
              </div>
            </div>

            <Card className="bg-muted/50">
              <CardContent className="py-3">
                <div className="flex items-center gap-2 text-sm">
                  <BookOpen className="h-4 w-4 text-primary" />
                  <span className="font-medium">{selectedQuestions.length} questões</span>
                  <span className="text-muted-foreground">serão atribuídas ao curso</span>
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
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Criar Exame'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
