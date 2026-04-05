import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useProfessorReferralCode, useProfessorStudents, useReferralCount } from '@/hooks/useProfessorReferral';
import { useClassrooms, useClassroomStudents, useClassroomStudentActions, useClassroomAssignments, useClassroomAssignmentActions } from '@/hooks/useClassrooms';
import { useAuth } from '@/hooks/useAuth';
import { useProfileContext } from '@/contexts/ProfileContext';
import { toast } from 'sonner';
import {
  Users, Copy, Gift, Plus, School, BookOpen, ClipboardList,
  Trash2, Calendar, Loader2, Check, X, UserPlus, FileText,
  Building2, GraduationCap, Target, BarChart3, Settings,
  MoreVertical, Pencil
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { DeleteConfirmDialog } from '@/components/projects/DeleteConfirmDialog';
import { AdminTrainingsPanel } from '@/components/edu/AdminTrainingsPanel';
import { format } from 'date-fns';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// ─── Referral Panel (EDU) ───
function ReferralPanel() {
  const { referralCode, isLoading, generateCode } = useProfessorReferralCode();
  const { data: students } = useProfessorStudents();
  const { data: count } = useReferralCount();
  const qualifies = (count || 0) >= 5;

  const copyCode = () => {
    if (referralCode?.code) {
      navigator.clipboard.writeText(referralCode.code);
      toast.success('Código copiado!');
    }
  };

  const copyLink = () => {
    if (referralCode?.code) {
      const link = `${window.location.origin}/auth?ref=${referralCode.code}`;
      navigator.clipboard.writeText(link);
      toast.success('Link copiado!');
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            Programa de Referência
          </CardTitle>
          <CardDescription>
            Convide 5 estudantes e ganhe isenção na mensalidade enquanto mantiver 5+ alunos ativos.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : referralCode ? (
            <>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-muted rounded-lg px-4 py-3 font-mono text-lg font-bold tracking-widest text-center">
                  {referralCode.code}
                </div>
                <Button variant="outline" size="icon" onClick={copyCode} title="Copiar código">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <Button variant="secondary" className="w-full" onClick={copyLink}>
                <Copy className="h-4 w-4 mr-2" />
                Copiar link de convite
              </Button>
            </>
          ) : (
            <Button onClick={() => generateCode.mutate()} disabled={generateCode.isPending}>
              {generateCode.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
              Gerar código de referência
            </Button>
          )}

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Alunos indicados ativos</p>
              <p className="text-3xl font-bold">{count || 0} <span className="text-sm text-muted-foreground font-normal">/ 5 necessários</span></p>
            </div>
            <Badge variant={qualifies ? 'default' : 'secondary'} className={qualifies ? 'bg-green-600' : ''}>
              {qualifies ? '✓ Isenção ativa' : 'Em progresso'}
            </Badge>
          </div>

          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-primary rounded-full h-2 transition-all"
              style={{ width: `${Math.min(100, ((count || 0) / 5) * 100)}%` }}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Alunos Indicados ({students?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!students?.length ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum aluno indicado ainda. Compartilhe seu código!
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map(s => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.student_name}</TableCell>
                    <TableCell>
                      <Badge variant={s.status === 'active' ? 'default' : 'secondary'}>
                        {s.status === 'active' ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(s.created_at), 'dd/MM/yyyy')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Classroom Detail (EDU) ───
function ClassroomDetail({ classroomId, onBack }: { classroomId: string; onBack: () => void }) {
  const { data: students, isLoading: loadingStudents } = useClassroomStudents(classroomId);
  const { addStudent, removeStudent } = useClassroomStudentActions(classroomId);
  const { data: assignments } = useClassroomAssignments(classroomId);
  const { createAssignment, deleteAssignment } = useClassroomAssignmentActions(classroomId);
  const { data: allStudents } = useProfessorStudents();

  const [showAddStudent, setShowAddStudent] = useState(false);
  const [showAddAssignment, setShowAddAssignment] = useState(false);
  const [showDeleteAssignment, setShowDeleteAssignment] = useState(false);
  const [deletingAssignment, setDeletingAssignment] = useState<any>(null);
  const [assignmentForm, setAssignmentForm] = useState({
    type: 'custom' as string, title: '', description: '', due_date: '',
    track_id: '', training_id: '', exam_ruleset_id: '',
  });

  // Fetch available tracks, trainings, exams
  const { data: availableTracks } = useQuery({
    queryKey: ['available-tracks'],
    queryFn: async () => {
      const { data } = await supabase.from('edu_tracks').select('id, name').eq('active', true).order('name');
      return data || [];
    },
  });
  const { data: availableTrainings } = useQuery({
    queryKey: ['available-trainings-list'],
    queryFn: async () => {
      const { data } = await supabase.from('edu_trainings').select('training_id, title, type').eq('active', true).order('title');
      return data || [];
    },
  });
  const { data: availableExams } = useQuery({
    queryKey: ['available-exam-rulesets'],
    queryFn: async () => {
      const { data } = await supabase
        .from('exam_rulesets')
        .select('ruleset_id, question_count, min_score_pct, time_limit_minutes, course_id')
        .order('created_at', { ascending: false });
      if (!data?.length) return [];
      // Get course names for display
      const courseIds = data.map(d => d.course_id).filter(Boolean) as string[];
      let courseMap = new Map<string, string>();
      if (courseIds.length) {
        const { data: courses } = await supabase.from('lms_courses').select('course_id, title').in('course_id', courseIds);
        courses?.forEach(c => courseMap.set(c.course_id, c.title));
      }
      return data.map(r => ({
        ruleset_id: r.ruleset_id,
        label: courseMap.get(r.course_id || '') || `Prova (${r.question_count}q, ${r.time_limit_minutes}min)`,
      }));
    },
  });

  const enrolledIds = new Set(students?.map(s => s.student_id) || []);
  const availableStudents = allStudents?.filter(s => !enrolledIds.has(s.student_id)) || [];

  const resetForm = () => setAssignmentForm({ type: 'custom', title: '', description: '', due_date: '', track_id: '', training_id: '', exam_ruleset_id: '' });

  const handleAddAssignment = () => {
    let title = assignmentForm.title;
    // Auto-fill title from selected entity
    if (!title.trim()) {
      if (assignmentForm.type === 'track' && assignmentForm.track_id) {
        title = availableTracks?.find(t => t.id === assignmentForm.track_id)?.name || '';
      } else if (assignmentForm.type === 'training' && assignmentForm.training_id) {
        title = availableTrainings?.find(t => t.training_id === assignmentForm.training_id)?.title || '';
      } else if (assignmentForm.type === 'exam' && assignmentForm.exam_ruleset_id) {
        title = availableExams?.find(e => e.ruleset_id === assignmentForm.exam_ruleset_id)?.label || '';
      }
    }
    if (!title.trim()) { toast.error('Título obrigatório'); return; }

    createAssignment.mutate({
      assignment_type: assignmentForm.type,
      title,
      description: assignmentForm.description || undefined,
      due_date: assignmentForm.due_date || undefined,
      track_id: assignmentForm.type === 'track' ? assignmentForm.track_id || undefined : undefined,
      training_id: assignmentForm.type === 'training' ? assignmentForm.training_id || undefined : undefined,
      exam_ruleset_id: assignmentForm.type === 'exam' ? assignmentForm.exam_ruleset_id || undefined : undefined,
    }, {
      onSuccess: () => { setShowAddAssignment(false); resetForm(); },
    });
  };

  const confirmDeleteAssignment = (a: any) => {
    setDeletingAssignment(a);
    setShowDeleteAssignment(true);
  };

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={onBack}>← Voltar às Salas</Button>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Alunos</CardTitle>
            <CardDescription>{students?.length || 0} alunos matriculados</CardDescription>
          </div>
          <Dialog open={showAddStudent} onOpenChange={setShowAddStudent}>
            <DialogTrigger asChild>
              <Button size="sm"><UserPlus className="h-4 w-4 mr-2" />Adicionar</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Adicionar aluno à sala</DialogTitle></DialogHeader>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {availableStudents.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    Nenhum aluno disponível. Convide alunos com seu código de referência.
                  </p>
                ) : (
                  availableStudents.map(s => (
                    <div key={s.student_id} className="flex items-center justify-between p-2 rounded hover:bg-muted">
                      <span className="text-sm font-medium">{s.student_name}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { addStudent.mutate(s.student_id); setShowAddStudent(false); }}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {loadingStudents ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> :
            !students?.length ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum aluno nesta sala.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Matriculado em</TableHead>
                    <TableHead className="w-16" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map(s => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.student_name}</TableCell>
                      <TableCell className="text-muted-foreground">{format(new Date(s.enrolled_at), 'dd/MM/yyyy')}</TableCell>
                      <TableCell>
                        <Button size="icon" variant="ghost" onClick={() => removeStudent.mutate(s.student_id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><ClipboardList className="h-5 w-5" /> Atividades</CardTitle>
            <CardDescription>Trilhas, testes e conteúdo atribuído à sala</CardDescription>
          </div>
          <Dialog open={showAddAssignment} onOpenChange={setShowAddAssignment}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-2" />Nova Atividade</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nova Atividade</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={assignmentForm.type} onValueChange={v => setAssignmentForm(p => ({ ...p, type: v, track_id: '', training_id: '', exam_ruleset_id: '', title: '' }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="custom">Conteúdo próprio</SelectItem>
                      <SelectItem value="track">Trilha de aprendizado</SelectItem>
                      <SelectItem value="training">Treinamento</SelectItem>
                      <SelectItem value="exam">Prova / Exame</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {assignmentForm.type === 'track' && (
                  <div className="space-y-2">
                    <Label>Selecionar Trilha *</Label>
                    <Select value={assignmentForm.track_id} onValueChange={v => {
                      const track = availableTracks?.find(t => t.id === v);
                      setAssignmentForm(p => ({ ...p, track_id: v, title: track?.name || p.title }));
                    }}>
                      <SelectTrigger><SelectValue placeholder="Escolha uma trilha" /></SelectTrigger>
                      <SelectContent>
                        {availableTracks?.map(t => (
                          <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {assignmentForm.type === 'training' && (
                  <div className="space-y-2">
                    <Label>Selecionar Treinamento *</Label>
                    <Select value={assignmentForm.training_id} onValueChange={v => {
                      const tr = availableTrainings?.find(t => t.training_id === v);
                      setAssignmentForm(p => ({ ...p, training_id: v, title: tr?.title || p.title }));
                    }}>
                      <SelectTrigger><SelectValue placeholder="Escolha um treinamento" /></SelectTrigger>
                      <SelectContent>
                        {availableTrainings?.map(t => (
                          <SelectItem key={t.training_id} value={t.training_id}>{t.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {assignmentForm.type === 'exam' && (
                  <div className="space-y-2">
                    <Label>Selecionar Prova *</Label>
                    <Select value={assignmentForm.exam_ruleset_id} onValueChange={v => {
                      const ex = availableExams?.find(e => e.ruleset_id === v);
                      setAssignmentForm(p => ({ ...p, exam_ruleset_id: v, title: ex?.label || p.title }));
                    }}>
                      <SelectTrigger><SelectValue placeholder="Escolha uma prova" /></SelectTrigger>
                      <SelectContent>
                        {availableExams?.map(e => (
                          <SelectItem key={e.ruleset_id} value={e.ruleset_id}>{e.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>{assignmentForm.type === 'custom' ? 'Título *' : 'Título (auto-preenchido)'}</Label>
                  <Input value={assignmentForm.title} onChange={e => setAssignmentForm(p => ({ ...p, title: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Textarea value={assignmentForm.description} onChange={e => setAssignmentForm(p => ({ ...p, description: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Data de entrega</Label>
                  <Input type="date" value={assignmentForm.due_date} onChange={e => setAssignmentForm(p => ({ ...p, due_date: e.target.value }))} />
                </div>
                <Button className="w-full" onClick={handleAddAssignment} disabled={createAssignment.isPending}>
                  {createAssignment.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Criar Atividade
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {!assignments?.length ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhuma atividade criada.</p>
          ) : (
            <div className="space-y-3">
              {assignments.map(a => (
                <div key={a.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      {a.assignment_type === 'track' ? <BookOpen className="h-4 w-4 text-primary" /> :
                        a.assignment_type === 'exam' ? <ClipboardList className="h-4 w-4 text-primary" /> :
                          <FileText className="h-4 w-4 text-primary" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{a.title}</p>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {a.assignment_type === 'track' ? 'Trilha' :
                            a.assignment_type === 'exam' ? 'Prova' :
                              a.assignment_type === 'training' ? 'Treinamento' : 'Conteúdo'}
                        </Badge>
                        {a.due_date && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(a.due_date), 'dd/MM/yyyy')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => confirmDeleteAssignment(a)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <DeleteConfirmDialog
        open={showDeleteAssignment}
        onOpenChange={setShowDeleteAssignment}
        title="Excluir Atividade"
        description={`Tem certeza que deseja excluir a atividade "${deletingAssignment?.title}"?`}
        onConfirm={() => {
          deleteAssignment.mutate(deletingAssignment.id, {
            onSuccess: () => { setShowDeleteAssignment(false); setDeletingAssignment(null); },
          });
        }}
        isPending={deleteAssignment.isPending}
      />
    </div>
  );
}
// ─── Classrooms Panel (EDU) ───
function ClassroomsPanel() {
  const { classrooms, isLoading, createClassroom, updateClassroom, deleteClassroom } = useClassrooms();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingClassroom, setEditingClassroom] = useState<any>(null);
  const [form, setForm] = useState({ name: '', description: '', discipline: '', period_start: '', period_end: '' });
  const [editForm, setEditForm] = useState({ name: '', description: '', discipline: '', period_start: '', period_end: '', status: 'active' });

  if (selectedId) {
    return <ClassroomDetail classroomId={selectedId} onBack={() => setSelectedId(null)} />;
  }

  const handleCreate = () => {
    if (!form.name.trim()) { toast.error('Nome obrigatório'); return; }
    createClassroom.mutate({
      name: form.name,
      description: form.description || undefined,
      discipline: form.discipline || undefined,
      period_start: form.period_start || undefined,
      period_end: form.period_end || undefined,
    }, {
      onSuccess: () => {
        setShowCreate(false);
        setForm({ name: '', description: '', discipline: '', period_start: '', period_end: '' });
      },
    });
  };

  const openEdit = (c: any) => {
    setEditingClassroom(c);
    setEditForm({
      name: c.name || '',
      description: c.description || '',
      discipline: c.discipline || '',
      period_start: c.period_start || '',
      period_end: c.period_end || '',
      status: c.status || 'active',
    });
    setShowEdit(true);
  };

  const handleEdit = () => {
    if (!editForm.name.trim()) { toast.error('Nome obrigatório'); return; }
    updateClassroom.mutate({
      id: editingClassroom.id,
      name: editForm.name,
      description: editForm.description || undefined,
      discipline: editForm.discipline || undefined,
      period_start: editForm.period_start || undefined,
      period_end: editForm.period_end || undefined,
      status: editForm.status,
    }, {
      onSuccess: () => { setShowEdit(false); setEditingClassroom(null); },
    });
  };

  const openDelete = (c: any) => {
    setEditingClassroom(c);
    setShowDeleteConfirm(true);
  };

  const handleDelete = () => {
    deleteClassroom.mutate(editingClassroom.id, {
      onSuccess: () => { setShowDeleteConfirm(false); setEditingClassroom(null); },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Minhas Salas</h3>
          <p className="text-sm text-muted-foreground">Gerencie turmas, alunos e atividades</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Nova Sala</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Criar Nova Sala</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome da sala *</Label>
                <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Ex: Turismo Sustentável 2026.1" />
              </div>
              <div className="space-y-2">
                <Label>Disciplina</Label>
                <Input value={form.discipline} onChange={e => setForm(p => ({ ...p, discipline: e.target.value }))} placeholder="Ex: Gestão de Destinos" />
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Início do período</Label>
                  <Input type="date" value={form.period_start} onChange={e => setForm(p => ({ ...p, period_start: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Fim do período</Label>
                  <Input type="date" value={form.period_end} onChange={e => setForm(p => ({ ...p, period_end: e.target.value }))} />
                </div>
              </div>
              <Button className="w-full" onClick={handleCreate} disabled={createClassroom.isPending}>
                {createClassroom.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Criar Sala
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : !classrooms?.length ? (
        <Card>
          <CardContent className="py-12 text-center">
            <School className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Nenhuma sala criada</p>
            <p className="text-sm text-muted-foreground">Crie sua primeira sala para organizar alunos e atividades.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {classrooms.map(c => (
            <Card key={c.id} className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base flex-1 cursor-pointer" onClick={() => setSelectedId(c.id)}>{c.name}</CardTitle>
                  <div className="flex items-center gap-1">
                    <Badge variant={c.status === 'active' ? 'default' : 'secondary'}>
                      {c.status === 'active' ? 'Ativa' : 'Arquivada'}
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={e => e.stopPropagation()}>
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEdit(c); }}>
                          <Pencil className="h-4 w-4 mr-2" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); openDelete(c); }}>
                          <Trash2 className="h-4 w-4 mr-2" /> Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                {c.discipline && <CardDescription>{c.discipline}</CardDescription>}
              </CardHeader>
              <CardContent onClick={() => setSelectedId(c.id)}>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1"><Users className="h-4 w-4" />{c.student_count || 0} alunos</span>
                  {c.period_start && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {format(new Date(c.period_start), 'dd/MM/yy')}
                      {c.period_end && ` - ${format(new Date(c.period_end), 'dd/MM/yy')}`}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Sala</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome da sala *</Label>
              <Input value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Disciplina</Label>
              <Input value={editForm.discipline} onChange={e => setEditForm(p => ({ ...p, discipline: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea value={editForm.description} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Início do período</Label>
                <Input type="date" value={editForm.period_start} onChange={e => setEditForm(p => ({ ...p, period_start: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Fim do período</Label>
                <Input type="date" value={editForm.period_end} onChange={e => setEditForm(p => ({ ...p, period_end: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={editForm.status} onValueChange={v => setEditForm(p => ({ ...p, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativa</SelectItem>
                  <SelectItem value="archived">Arquivada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={handleEdit} disabled={updateClassroom.isPending}>
              {updateClassroom.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Salvar Alterações
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <DeleteConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Excluir Sala"
        description={`Tem certeza que deseja excluir a sala "${editingClassroom?.name}"? Todos os alunos e atividades associados serão removidos.`}
        onConfirm={handleDelete}
        isPending={deleteClassroom.isPending}
      />
    </div>
  );
}

// ─── ERP: Team Training Panel ───
function ERPTeamTrainingPanel() {
  const { user } = useAuth();
  const { profile, effectiveOrgId } = useProfileContext();

  // Fetch org members
  const { data: orgMembers, isLoading: loadingMembers } = useQuery({
    queryKey: ['org-members', effectiveOrgId],
    queryFn: async () => {
      if (!effectiveOrgId) return [];
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, system_access, created_at')
        .eq('org_id', effectiveOrgId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!effectiveOrgId,
  });

  // Fetch org member roles
  const { data: memberRoles } = useQuery({
    queryKey: ['org-member-roles', effectiveOrgId],
    queryFn: async () => {
      if (!effectiveOrgId) return [];
      const { data, error } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .eq('org_id', effectiveOrgId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!effectiveOrgId,
  });

  // Fetch available trainings for ERP context (pillar-based)
  const { data: trainings } = useQuery({
    queryKey: ['erp-trainings-available'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('edu_trainings')
        .select('training_id, title, type, pillar, level, duration_minutes')
        .eq('active', true)
        .order('pillar')
        .order('title');
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch classrooms used for ERP training groups  
  const { classrooms, isLoading: loadingClassrooms, createClassroom, updateClassroom, deleteClassroom } = useClassrooms();
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', focus_area: '', period_start: '', period_end: '' });
  const [editingGroup, setEditingGroup] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({ name: '', description: '', focus_area: '', period_start: '', period_end: '', status: 'active' });
  const [deleteGroupId, setDeleteGroupId] = useState<string | null>(null);

  const handleEditGroup = (group: any) => {
    setEditingGroup(group);
    setEditForm({
      name: group.name || '',
      description: group.description || '',
      focus_area: group.discipline || '',
      period_start: group.period_start ? group.period_start.split('T')[0] : '',
      period_end: group.period_end ? group.period_end.split('T')[0] : '',
      status: group.status || 'active',
    });
  };

  const handleSaveEditGroup = () => {
    if (!editingGroup || !editForm.name.trim()) { toast.error('Nome obrigatório'); return; }
    updateClassroom.mutate({
      id: editingGroup.id,
      name: editForm.name,
      description: editForm.description || undefined,
      discipline: editForm.focus_area || undefined,
      period_start: editForm.period_start || undefined,
      period_end: editForm.period_end || undefined,
      status: editForm.status,
    }, { onSuccess: () => setEditingGroup(null) });
  };

  const handleDeleteGroup = () => {
    if (!deleteGroupId) return;
    deleteClassroom.mutate(deleteGroupId, { onSuccess: () => setDeleteGroupId(null) });
  };

  if (selectedGroupId) {
    return <ERPGroupDetail groupId={selectedGroupId} onBack={() => setSelectedGroupId(null)} orgMembers={orgMembers || []} />;
  }

  const handleCreate = () => {
    if (!form.name.trim()) { toast.error('Nome obrigatório'); return; }
    createClassroom.mutate({
      name: form.name,
      description: form.description || undefined,
      discipline: form.focus_area || 'Capacitação ERP',
      period_start: form.period_start || undefined,
      period_end: form.period_end || undefined,
    }, {
      onSuccess: () => {
        setShowCreate(false);
        setForm({ name: '', description: '', focus_area: '', period_start: '', period_end: '' });
      },
    });
  };

  const getRoleLabel = (userId: string) => {
    const role = memberRoles?.find(r => r.user_id === userId);
    if (!role) return 'Membro';
    const labels: Record<string, string> = { ADMIN: 'Administrador', ANALYST: 'Analista', VIEWER: 'Visualizador' };
    return labels[role.role] || role.role;
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{orgMembers?.length || 0}</p>
                <p className="text-sm text-muted-foreground">Membros da Equipe</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{classrooms?.length || 0}</p>
                <p className="text-sm text-muted-foreground">Grupos de Capacitação</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <GraduationCap className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{trainings?.length || 0}</p>
                <p className="text-sm text-muted-foreground">Treinamentos Disponíveis</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Training Groups */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Grupos de Capacitação</h3>
          <p className="text-sm text-muted-foreground">Organize equipes e atribua treinamentos de metodologia diagnóstica</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Novo Grupo</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Criar Grupo de Capacitação</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome do grupo *</Label>
                <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Ex: Equipe Diagnóstico Territorial 2026" />
              </div>
              <div className="space-y-2">
                <Label>Área de foco</Label>
                <Select value={form.focus_area} onValueChange={v => setForm(p => ({ ...p, focus_area: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione a área" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="territorial">Diagnóstico Territorial</SelectItem>
                    <SelectItem value="enterprise">Diagnóstico Enterprise</SelectItem>
                    <SelectItem value="metodologia">Metodologia SISTUR</SelectItem>
                    <SelectItem value="geral">Capacitação Geral</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Objetivo do grupo de capacitação..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Início</Label>
                  <Input type="date" value={form.period_start} onChange={e => setForm(p => ({ ...p, period_start: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Fim</Label>
                  <Input type="date" value={form.period_end} onChange={e => setForm(p => ({ ...p, period_end: e.target.value }))} />
                </div>
              </div>
              <Button className="w-full" onClick={handleCreate} disabled={createClassroom.isPending}>
                {createClassroom.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Criar Grupo
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loadingClassrooms ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : !classrooms?.length ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Nenhum grupo de capacitação</p>
            <p className="text-sm text-muted-foreground">Crie um grupo para organizar a capacitação da equipe em metodologia diagnóstica.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {classrooms.map(c => (
            <Card key={c.id} className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base cursor-pointer" onClick={() => setSelectedGroupId(c.id)}>{c.name}</CardTitle>
                  <div className="flex items-center gap-1">
                    <Badge variant={c.status === 'active' ? 'default' : 'secondary'}>
                      {c.status === 'active' ? 'Ativo' : 'Arquivado'}
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => e.stopPropagation()}>
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEditGroup(c); }}>
                          <Pencil className="h-4 w-4 mr-2" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setDeleteGroupId(c.id); }} className="text-destructive">
                          <Trash2 className="h-4 w-4 mr-2" /> Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                {c.discipline && (
                  <CardDescription className="flex items-center gap-1">
                    <Target className="h-3 w-3" />
                    {c.discipline === 'territorial' ? 'Diagnóstico Territorial' :
                     c.discipline === 'enterprise' ? 'Diagnóstico Enterprise' :
                     c.discipline === 'metodologia' ? 'Metodologia SISTUR' :
                     c.discipline === 'geral' ? 'Capacitação Geral' : c.discipline}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent onClick={() => setSelectedGroupId(c.id)}>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1"><Users className="h-4 w-4" />{c.student_count || 0} membros</span>
                  {c.period_start && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {format(new Date(c.period_start), 'dd/MM/yy')}
                      {c.period_end && ` - ${format(new Date(c.period_end), 'dd/MM/yy')}`}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Group Dialog */}
      <Dialog open={!!editingGroup} onOpenChange={open => !open && setEditingGroup(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Grupo de Capacitação</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do grupo *</Label>
              <Input value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Área de foco</Label>
              <Select value={editForm.focus_area} onValueChange={v => setEditForm(p => ({ ...p, focus_area: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione a área" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="territorial">Diagnóstico Territorial</SelectItem>
                  <SelectItem value="enterprise">Diagnóstico Enterprise</SelectItem>
                  <SelectItem value="metodologia">Metodologia SISTUR</SelectItem>
                  <SelectItem value="geral">Capacitação Geral</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea value={editForm.description} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Início</Label>
                <Input type="date" value={editForm.period_start} onChange={e => setEditForm(p => ({ ...p, period_start: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Fim</Label>
                <Input type="date" value={editForm.period_end} onChange={e => setEditForm(p => ({ ...p, period_end: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={editForm.status} onValueChange={v => setEditForm(p => ({ ...p, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="archived">Arquivado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={handleSaveEditGroup} disabled={updateClassroom.isPending}>
              {updateClassroom.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Salvar alterações
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Group Confirmation */}
      <DeleteConfirmDialog
        open={!!deleteGroupId}
        onOpenChange={open => !open && setDeleteGroupId(null)}
        onConfirm={handleDeleteGroup}
        title="Excluir grupo"
        description="Tem certeza que deseja excluir este grupo de capacitação? Todos os membros e atribuições serão removidos."
      />

      {/* Team Members Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Membros da Organização
          </CardTitle>
          <CardDescription>Equipe disponível para capacitação</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingMembers ? (
            <Loader2 className="h-5 w-5 animate-spin mx-auto" />
          ) : !orgMembers?.length ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum membro encontrado.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Função</TableHead>
                  <TableHead>Acesso</TableHead>
                  <TableHead>Desde</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orgMembers.map(m => (
                  <TableRow key={m.user_id}>
                    <TableCell className="font-medium">{m.full_name || 'Sem nome'}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{getRoleLabel(m.user_id)}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {m.system_access === 'ERP' ? 'ERP' : m.system_access === 'EDU' ? 'EDU' : '—'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(m.created_at), 'dd/MM/yyyy')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── ERP Group Detail ───
function ERPGroupDetail({ groupId, onBack, orgMembers }: { groupId: string; onBack: () => void; orgMembers: any[] }) {
  const { data: students, isLoading: loadingStudents } = useClassroomStudents(groupId);
  const { addStudent, removeStudent } = useClassroomStudentActions(groupId);
  const { data: assignments } = useClassroomAssignments(groupId);
  const { createAssignment, deleteAssignment } = useClassroomAssignmentActions(groupId);

  const [showAddMember, setShowAddMember] = useState(false);
  const [showAddTraining, setShowAddTraining] = useState(false);
  const [trainingForm, setTrainingForm] = useState({ type: 'training' as string, title: '', description: '', due_date: '' });

  const enrolledIds = new Set(students?.map(s => s.student_id) || []);
  const availableMembers = orgMembers.filter(m => !enrolledIds.has(m.user_id));

  const handleAddTraining = () => {
    if (!trainingForm.title.trim()) { toast.error('Título obrigatório'); return; }
    createAssignment.mutate({
      assignment_type: trainingForm.type,
      title: trainingForm.title,
      description: trainingForm.description || undefined,
      due_date: trainingForm.due_date || undefined,
    }, {
      onSuccess: () => {
        setShowAddTraining(false);
        setTrainingForm({ type: 'training', title: '', description: '', due_date: '' });
      },
    });
  };

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={onBack}>← Voltar aos Grupos</Button>

      {/* Members */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Membros do Grupo</CardTitle>
            <CardDescription>{students?.length || 0} membros atribuídos</CardDescription>
          </div>
          <Dialog open={showAddMember} onOpenChange={setShowAddMember}>
            <DialogTrigger asChild>
              <Button size="sm"><UserPlus className="h-4 w-4 mr-2" />Adicionar Membro</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Adicionar membro ao grupo</DialogTitle></DialogHeader>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {availableMembers.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    Todos os membros da organização já estão neste grupo.
                  </p>
                ) : (
                  availableMembers.map(m => (
                    <div key={m.user_id} className="flex items-center justify-between p-2 rounded hover:bg-muted">
                      <div>
                        <span className="text-sm font-medium">{m.full_name || 'Sem nome'}</span>
                        <span className="text-xs text-muted-foreground ml-2">{m.system_access}</span>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { addStudent.mutate(m.user_id); setShowAddMember(false); }}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {loadingStudents ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> :
            !students?.length ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum membro neste grupo.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Adicionado em</TableHead>
                    <TableHead className="w-16" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map(s => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.student_name}</TableCell>
                      <TableCell className="text-muted-foreground">{format(new Date(s.enrolled_at), 'dd/MM/yyyy')}</TableCell>
                      <TableCell>
                        <Button size="icon" variant="ghost" onClick={() => removeStudent.mutate(s.student_id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
        </CardContent>
      </Card>

      {/* Training Assignments */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><ClipboardList className="h-5 w-5" /> Treinamentos Atribuídos</CardTitle>
            <CardDescription>Capacitações e conteúdos de metodologia diagnóstica</CardDescription>
          </div>
          <Dialog open={showAddTraining} onOpenChange={setShowAddTraining}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-2" />Atribuir Treinamento</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Atribuir Treinamento</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <select
                    value={trainingForm.type}
                    onChange={e => setTrainingForm(p => ({ ...p, type: e.target.value }))}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="training">Treinamento de Metodologia</option>
                    <option value="track">Trilha de Capacitação</option>
                    <option value="exam">Avaliação de Conhecimento</option>
                    <option value="custom">Material Personalizado</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Título *</Label>
                  <Input value={trainingForm.title} onChange={e => setTrainingForm(p => ({ ...p, title: e.target.value }))} placeholder="Ex: Metodologia de Indicadores RA" />
                </div>
                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Textarea value={trainingForm.description} onChange={e => setTrainingForm(p => ({ ...p, description: e.target.value }))} placeholder="Objetivo e escopo do treinamento..." />
                </div>
                <div className="space-y-2">
                  <Label>Prazo de conclusão</Label>
                  <Input type="date" value={trainingForm.due_date} onChange={e => setTrainingForm(p => ({ ...p, due_date: e.target.value }))} />
                </div>
                <Button className="w-full" onClick={handleAddTraining} disabled={createAssignment.isPending}>
                  {createAssignment.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Atribuir
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {!assignments?.length ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum treinamento atribuído.</p>
          ) : (
            <div className="space-y-3">
              {assignments.map(a => (
                <div key={a.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      {a.assignment_type === 'track' ? <BookOpen className="h-4 w-4 text-primary" /> :
                        a.assignment_type === 'exam' ? <ClipboardList className="h-4 w-4 text-primary" /> :
                        a.assignment_type === 'training' ? <GraduationCap className="h-4 w-4 text-primary" /> :
                          <FileText className="h-4 w-4 text-primary" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{a.title}</p>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {a.assignment_type === 'track' ? 'Trilha' :
                            a.assignment_type === 'exam' ? 'Avaliação' :
                              a.assignment_type === 'training' ? 'Treinamento' : 'Material'}
                        </Badge>
                        {a.due_date && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(a.due_date), 'dd/MM/yyyy')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => deleteAssignment.mutate(a.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main Page ───
export default function ProfessorDashboard() {
  const { hasERPAccess, hasEDUAccess, isProfessor, isAdmin, isAnalyst, isOrgAdmin } = useProfileContext();
  
  // Determine available contexts
  const showEDU = isProfessor || hasEDUAccess || isAdmin;
  const showERP = hasERPAccess || isAdmin || isAnalyst;
  const canManageContent = isAdmin || isProfessor || isOrgAdmin;
  const defaultTab = showERP && !isProfessor ? 'erp' : canManageContent ? 'content' : 'edu';

  return (
    <AppLayout title="Gestão de Treinamentos">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold">Gestão de Treinamentos</h1>
          <p className="text-muted-foreground">
            {showERP && showEDU
              ? 'Gerencie capacitação de equipes e salas de aula'
              : showERP
              ? 'Gerencie a capacitação da equipe em metodologia diagnóstica'
              : 'Gerencie alunos, salas e atividades'}
          </p>
        </div>

        {showERP && showEDU ? (
          <Tabs defaultValue={defaultTab} className="space-y-6">
            <TabsList className="flex-wrap">
              {canManageContent && (
                <TabsTrigger value="content" className="flex items-center gap-2">
                  <Settings className="h-4 w-4" /> Gestão de Conteúdo
                </TabsTrigger>
              )}
              <TabsTrigger value="erp" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" /> Capacitação ERP
              </TabsTrigger>
              <TabsTrigger value="edu" className="flex items-center gap-2">
                <School className="h-4 w-4" /> Salas de Aula
              </TabsTrigger>
              {(isProfessor || isAdmin) && (
                <TabsTrigger value="referral" className="flex items-center gap-2">
                  <Gift className="h-4 w-4" /> Referências
                </TabsTrigger>
              )}
            </TabsList>

            {canManageContent && (
              <TabsContent value="content">
                <AdminTrainingsPanel />
              </TabsContent>
            )}

            <TabsContent value="erp">
              <ERPTeamTrainingPanel />
            </TabsContent>

            <TabsContent value="edu">
              <ClassroomsPanel />
            </TabsContent>

            {isProfessor && (
              <TabsContent value="referral">
                <ReferralPanel />
              </TabsContent>
            )}
          </Tabs>
        ) : showERP ? (
          <ERPTeamTrainingPanel />
        ) : (
          <Tabs defaultValue={canManageContent ? 'content' : 'classrooms'} className="space-y-6">
            <TabsList>
              {canManageContent && (
                <TabsTrigger value="content" className="flex items-center gap-2">
                  <Settings className="h-4 w-4" /> Gestão de Conteúdo
                </TabsTrigger>
              )}
              <TabsTrigger value="classrooms" className="flex items-center gap-2">
                <School className="h-4 w-4" /> Salas
              </TabsTrigger>
              <TabsTrigger value="referral" className="flex items-center gap-2">
                <Gift className="h-4 w-4" /> Referências
              </TabsTrigger>
            </TabsList>

            {canManageContent && (
              <TabsContent value="content">
                <AdminTrainingsPanel />
              </TabsContent>
            )}

            <TabsContent value="classrooms">
              <ClassroomsPanel />
            </TabsContent>

            <TabsContent value="referral">
              <ReferralPanel />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </AppLayout>
  );
}
