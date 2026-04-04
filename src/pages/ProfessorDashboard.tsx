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
  Building2, GraduationCap, Target, BarChart3, Settings
} from 'lucide-react';
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

// ─── Classrooms Panel (EDU) ───
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
  const { classrooms, isLoading: loadingClassrooms, createClassroom, deleteClassroom } = useClassrooms();
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', focus_area: '', period_start: '', period_end: '' });

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
            <Card key={c.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedGroupId(c.id)}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base">{c.name}</CardTitle>
                  <Badge variant={c.status === 'active' ? 'default' : 'secondary'}>
                    {c.status === 'active' ? 'Ativo' : 'Arquivado'}
                  </Badge>
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
              <CardContent>
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
  const { hasERPAccess, hasEDUAccess, isProfessor, isAdmin, isAnalyst } = useProfileContext();
  
  // Determine available contexts
  const showEDU = isProfessor || hasEDUAccess || isAdmin;
  const showERP = hasERPAccess || isAdmin || isAnalyst;
  const defaultTab = showERP && !isProfessor ? 'erp' : 'edu';

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
            <TabsList>
              <TabsTrigger value="erp" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" /> Capacitação ERP
              </TabsTrigger>
              <TabsTrigger value="edu" className="flex items-center gap-2">
                <School className="h-4 w-4" /> Salas de Aula
              </TabsTrigger>
              {isProfessor && (
                <TabsTrigger value="referral" className="flex items-center gap-2">
                  <Gift className="h-4 w-4" /> Referências
                </TabsTrigger>
              )}
            </TabsList>

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
        )}
      </div>
    </AppLayout>
  );
}
