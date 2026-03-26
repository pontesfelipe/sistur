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
import { toast } from 'sonner';
import {
  Users, Copy, Gift, Plus, School, BookOpen, ClipboardList,
  Trash2, Calendar, Loader2, Check, X, UserPlus, FileText
} from 'lucide-react';
import { format } from 'date-fns';

// ─── Referral Panel ───
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

          {/* Progress bar */}
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-primary rounded-full h-2 transition-all"
              style={{ width: `${Math.min(100, ((count || 0) / 5) * 100)}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Students list */}
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

// ─── Classroom Detail ───
function ClassroomDetail({ classroomId, onBack }: { classroomId: string; onBack: () => void }) {
  const { data: students, isLoading: loadingStudents } = useClassroomStudents(classroomId);
  const { addStudent, removeStudent } = useClassroomStudentActions(classroomId);
  const { data: assignments } = useClassroomAssignments(classroomId);
  const { createAssignment, deleteAssignment } = useClassroomAssignmentActions(classroomId);
  const { data: allStudents } = useProfessorStudents();

  const [showAddStudent, setShowAddStudent] = useState(false);
  const [showAddAssignment, setShowAddAssignment] = useState(false);
  const [assignmentForm, setAssignmentForm] = useState({ type: 'custom' as string, title: '', description: '', due_date: '' });

  const enrolledIds = new Set(students?.map(s => s.student_id) || []);
  const availableStudents = allStudents?.filter(s => !enrolledIds.has(s.student_id)) || [];

  const handleAddAssignment = () => {
    if (!assignmentForm.title.trim()) { toast.error('Título obrigatório'); return; }
    createAssignment.mutate({
      assignment_type: assignmentForm.type,
      title: assignmentForm.title,
      description: assignmentForm.description || undefined,
      due_date: assignmentForm.due_date || undefined,
    }, {
      onSuccess: () => {
        setShowAddAssignment(false);
        setAssignmentForm({ type: 'custom', title: '', description: '', due_date: '' });
      },
    });
  };

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={onBack}>← Voltar às Salas</Button>

      {/* Students Tab */}
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

      {/* Assignments */}
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
                  <select
                    value={assignmentForm.type}
                    onChange={e => setAssignmentForm(p => ({ ...p, type: e.target.value }))}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="custom">Conteúdo próprio</option>
                    <option value="track">Trilha de aprendizado</option>
                    <option value="training">Treinamento</option>
                    <option value="exam">Teste/Exame</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Título *</Label>
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
                            a.assignment_type === 'exam' ? 'Teste' :
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

// ─── Classrooms Panel ───
function ClassroomsPanel() {
  const { classrooms, isLoading, createClassroom, deleteClassroom } = useClassrooms();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', discipline: '', period_start: '', period_end: '' });

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
            <Card key={c.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedId(c.id)}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base">{c.name}</CardTitle>
                  <Badge variant={c.status === 'active' ? 'default' : 'secondary'}>
                    {c.status === 'active' ? 'Ativa' : 'Arquivada'}
                  </Badge>
                </div>
                {c.discipline && <CardDescription>{c.discipline}</CardDescription>}
              </CardHeader>
              <CardContent>
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
    </div>
  );
}

// ─── Main Page ───
export default function ProfessorDashboard() {
  return (
    <AppLayout title="Painel do Professor">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold">Painel do Professor</h1>
          <p className="text-muted-foreground">Gerencie alunos, salas e atividades</p>
        </div>

        <Tabs defaultValue="classrooms" className="space-y-6">
          <TabsList>
            <TabsTrigger value="classrooms" className="flex items-center gap-2">
              <School className="h-4 w-4" /> Salas
            </TabsTrigger>
            <TabsTrigger value="referral" className="flex items-center gap-2">
              <Gift className="h-4 w-4" /> Referências
            </TabsTrigger>
          </TabsList>

          <TabsContent value="classrooms">
            <ClassroomsPanel />
          </TabsContent>

          <TabsContent value="referral">
            <ReferralPanel />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
