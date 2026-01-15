import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { 
  Plus, 
  Search, 
  HelpCircle,
  Pencil,
  Trash2,
  CheckCircle,
  XCircle,
  FileQuestion,
  BarChart3,
  ListChecks,
} from 'lucide-react';
import { 
  useQuizQuestions, 
  useQuizMutations,
  useQuizOptions,
  type QuizQuestion 
} from '@/hooks/useQuizzes';
import { PILLAR_INFO, type Pillar } from '@/types/sistur';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface QuestionFormData {
  stem: string;
  question_type: 'multiple_choice' | 'true_false' | 'short_answer';
  pillar: Pillar;
  difficulty: number;
  points: number;
  explanation?: string;
  options: { text: string; is_correct: boolean }[];
}

const defaultFormData: QuestionFormData = {
  stem: '',
  question_type: 'multiple_choice',
  pillar: 'RA',
  difficulty: 1,
  points: 10,
  explanation: '',
  options: [
    { text: '', is_correct: true },
    { text: '', is_correct: false },
    { text: '', is_correct: false },
    { text: '', is_correct: false },
  ],
};

const QuizManagement = () => {
  const [activeTab, setActiveTab] = useState('questions');
  const [searchQuery, setSearchQuery] = useState('');
  const [pillarFilter, setPillarFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<string | null>(null);
  const [formData, setFormData] = useState<QuestionFormData>(defaultFormData);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  
  const { data: questions, isLoading } = useQuizQuestions();
  const { createQuestion, updateQuestion, deleteQuestion, createOption, deleteOption } = useQuizMutations();
  
  const filteredQuestions = questions?.filter(q => {
    const matchesSearch = !searchQuery || 
      q.stem.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPillar = pillarFilter === 'all' || q.pillar === pillarFilter;
    return matchesSearch && matchesPillar;
  }) || [];

  const stats = {
    total: questions?.length || 0,
    byPillar: {
      RA: questions?.filter(q => q.pillar === 'RA').length || 0,
      OE: questions?.filter(q => q.pillar === 'OE').length || 0,
      AO: questions?.filter(q => q.pillar === 'AO').length || 0,
    },
    byType: {
      multiple_choice: questions?.filter(q => q.question_type === 'multiple_choice').length || 0,
      true_false: questions?.filter(q => q.question_type === 'true_false').length || 0,
      short_answer: questions?.filter(q => q.question_type === 'short_answer').length || 0,
    }
  };

  const handleOpenCreate = () => {
    setEditingQuestion(null);
    setFormData(defaultFormData);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (question: QuizQuestion) => {
    setEditingQuestion(question.quiz_id);
    setFormData({
      stem: question.stem,
      question_type: question.question_type,
      pillar: question.pillar as Pillar,
      difficulty: question.difficulty,
      points: question.points,
      explanation: question.explanation || '',
      options: [
        { text: '', is_correct: true },
        { text: '', is_correct: false },
        { text: '', is_correct: false },
        { text: '', is_correct: false },
      ],
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    try {
      if (editingQuestion) {
        await updateQuestion.mutateAsync({
          quizId: editingQuestion,
          data: {
            stem: formData.stem,
            pillar: formData.pillar,
            difficulty: formData.difficulty,
            points: formData.points,
            explanation: formData.explanation,
          },
        });
        toast.success('Questão atualizada com sucesso!');
      } else {
        const newQuestion = await createQuestion.mutateAsync({
          stem: formData.stem,
          question_type: formData.question_type,
          pillar: formData.pillar,
          difficulty: formData.difficulty,
          points: formData.points,
          explanation: formData.explanation,
        });
        
        // Create options for the question
        for (const opt of formData.options.filter(o => o.text.trim())) {
          await createOption.mutateAsync({
            quiz_id: newQuestion.quiz_id,
            option_text: opt.text,
            is_correct: opt.is_correct,
            display_order: formData.options.indexOf(opt),
          });
        }
        
        toast.success('Questão criada com sucesso!');
      }
      setIsDialogOpen(false);
      setFormData(defaultFormData);
      setEditingQuestion(null);
    } catch (error) {
      toast.error('Erro ao salvar questão');
      console.error(error);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      await deleteQuestion.mutateAsync(deleteConfirmId);
      toast.success('Questão excluída');
      setDeleteConfirmId(null);
    } catch (error) {
      toast.error('Erro ao excluir questão');
    }
  };

  const updateOption = (index: number, field: 'text' | 'is_correct', value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options.map((opt, i) => {
        if (i === index) {
          return { ...opt, [field]: value };
        }
        if (field === 'is_correct' && value === true) {
          return { ...opt, is_correct: false };
        }
        return opt;
      }),
    }));
  };

  const getDifficultyBadge = (difficulty: number) => {
    if (difficulty <= 1) return <Badge variant="outline" className="bg-green-500/10 text-green-700">Fácil</Badge>;
    if (difficulty <= 2) return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-700">Médio</Badge>;
    return <Badge variant="outline" className="bg-red-500/10 text-red-700">Difícil</Badge>;
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'multiple_choice':
        return <Badge variant="secondary"><ListChecks className="w-3 h-3 mr-1" />Múltipla Escolha</Badge>;
      case 'true_false':
        return <Badge variant="secondary"><CheckCircle className="w-3 h-3 mr-1" />V/F</Badge>;
      default:
        return <Badge variant="secondary"><FileQuestion className="w-3 h-3 mr-1" />Dissertativa</Badge>;
    }
  };

  return (
    <AppLayout 
      title="Banco de Questões" 
      subtitle="Gerenciamento de questões para exames e quizzes"
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="questions" className="gap-2">
            <HelpCircle className="h-4 w-4" />
            Questões
          </TabsTrigger>
          <TabsTrigger value="stats" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Estatísticas
          </TabsTrigger>
        </TabsList>

        {/* QUESTIONS TAB */}
        <TabsContent value="questions" className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <div className="flex gap-3 flex-1">
              <div className="relative max-w-sm flex-1">
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
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={handleOpenCreate}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nova Questão
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingQuestion ? 'Editar Questão' : 'Nova Questão'}
                  </DialogTitle>
                  <DialogDescription>
                    Preencha as informações da questão
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="stem">Enunciado</Label>
                    <Textarea 
                      id="stem" 
                      value={formData.stem}
                      onChange={(e) => setFormData(prev => ({ ...prev, stem: e.target.value }))}
                      placeholder="Digite o enunciado da questão..."
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Tipo</Label>
                      <Select 
                        value={formData.question_type} 
                        onValueChange={(v) => setFormData(prev => ({ ...prev, question_type: v as any }))}
                        disabled={!!editingQuestion}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="multiple_choice">Múltipla Escolha</SelectItem>
                          <SelectItem value="true_false">Verdadeiro/Falso</SelectItem>
                          <SelectItem value="short_answer">Dissertativa</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Pilar</Label>
                      <Select 
                        value={formData.pillar} 
                        onValueChange={(v) => setFormData(prev => ({ ...prev, pillar: v as Pillar }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="RA">RA</SelectItem>
                          <SelectItem value="OE">OE</SelectItem>
                          <SelectItem value="AO">AO</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Dificuldade</Label>
                      <Select 
                        value={formData.difficulty.toString()} 
                        onValueChange={(v) => setFormData(prev => ({ ...prev, difficulty: parseInt(v) }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">Fácil</SelectItem>
                          <SelectItem value="2">Médio</SelectItem>
                          <SelectItem value="3">Difícil</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="points">Pontos</Label>
                      <Input 
                        id="points" 
                        type="number"
                        value={formData.points}
                        onChange={(e) => setFormData(prev => ({ ...prev, points: parseInt(e.target.value) || 10 }))}
                      />
                    </div>
                  </div>

                  {formData.question_type === 'multiple_choice' && !editingQuestion && (
                    <div className="space-y-4 pt-4 border-t">
                      <Label className="text-base font-semibold">Alternativas</Label>
                      {formData.options.map((opt, idx) => (
                        <div key={idx} className="flex items-center gap-3">
                          <Button
                            type="button"
                            variant={opt.is_correct ? "default" : "outline"}
                            size="sm"
                            onClick={() => updateOption(idx, 'is_correct', true)}
                            className="w-10"
                          >
                            {opt.is_correct ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                          </Button>
                          <Input
                            value={opt.text}
                            onChange={(e) => updateOption(idx, 'text', e.target.value)}
                            placeholder={`Alternativa ${String.fromCharCode(65 + idx)}`}
                            className="flex-1"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="explanation">Explicação (opcional)</Label>
                    <Textarea 
                      id="explanation" 
                      value={formData.explanation || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, explanation: e.target.value }))}
                      placeholder="Explicação exibida após resposta..."
                      rows={2}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleSubmit}
                    disabled={!formData.stem || createQuestion.isPending || updateQuestion.isPending}
                  >
                    {editingQuestion ? 'Salvar' : 'Criar Questão'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Questions Table */}
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-6 space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : filteredQuestions.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground">
                  <HelpCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma questão encontrada</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50%]">Enunciado</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Pilar</TableHead>
                      <TableHead>Dificuldade</TableHead>
                      <TableHead>Pts</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredQuestions.map((question) => (
                      <TableRow key={question.quiz_id}>
                        <TableCell className="font-medium max-w-md truncate">
                          {question.stem}
                        </TableCell>
                        <TableCell>{getTypeBadge(question.question_type)}</TableCell>
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
                        <TableCell>{getDifficultyBadge(question.difficulty)}</TableCell>
                        <TableCell>{question.points}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenEdit(question)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteConfirmId(question.quiz_id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* STATS TAB */}
        <TabsContent value="stats" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-2xl font-bold">{stats.total}</CardTitle>
                <CardDescription>Total de Questões</CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-2xl font-bold text-green-600">{stats.byPillar.RA}</CardTitle>
                <CardDescription>Pilar RA</CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-2xl font-bold text-blue-600">{stats.byPillar.OE}</CardTitle>
                <CardDescription>Pilar OE</CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-2xl font-bold text-purple-600">{stats.byPillar.AO}</CardTitle>
                <CardDescription>Pilar AO</CardDescription>
              </CardHeader>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Distribuição por Tipo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <ListChecks className="h-4 w-4" />
                    Múltipla Escolha
                  </span>
                  <span className="font-semibold">{stats.byType.multiple_choice}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Verdadeiro/Falso
                  </span>
                  <span className="font-semibold">{stats.byType.true_false}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <FileQuestion className="h-4 w-4" />
                    Dissertativa
                  </span>
                  <span className="font-semibold">{stats.byType.short_answer}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Questão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta questão? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
};

export default QuizManagement;
