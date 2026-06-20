import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { BookOpen, GraduationCap, Plus, Trash2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useProjectEduEnrollments,
  useCreateEduEnrollment,
  useUpdateEduEnrollment,
  useDeleteEduEnrollment,
  EDU_ENROLLMENT_STATUS_INFO,
  type EduEnrollmentStatus,
} from '@/hooks/useProjectGovernance';
import { useProjectIndicatorImpact } from '@/hooks/useProjectIndicatorLinks';
import { useEduRecommendationsForAssessment } from '@/hooks/useEduRecommendationsForAssessment';
import { useProject } from '@/hooks/useProjects';

interface Props {
  projectId: string;
}

export function ProjectEduPanel({ projectId }: Props) {
  const { data: project } = useProject(projectId);
  const { data: enrollments = [] } = useProjectEduEnrollments(projectId);
  const { data: impact } = useProjectIndicatorImpact(projectId);
  const { data: recommendations = [] } = useEduRecommendationsForAssessment(project?.assessment_id);
  const create = useCreateEduEnrollment();
  const update = useUpdateEduEnrollment();
  const del = useDeleteEduEnrollment();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ course_title: '', target_audience: 'Gestores', user_name: '', is_mandatory: false, indicator_code: '' });

  const linkedIndicators = (impact?.indicators || []).map((i: any) => i.indicator_code);
  const relevantRecs = (recommendations as any[]).filter(r => linkedIndicators.includes(r.indicator_code));

  const completed = enrollments.filter(e => e.enrollment_status === 'completed').length;
  const mandatoryPending = enrollments.filter(e => e.is_mandatory && e.enrollment_status !== 'completed' && e.enrollment_status !== 'waived').length;

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <GraduationCap className="h-8 w-8 text-primary" />
            <div><p className="text-sm text-muted-foreground">Concluídos</p><p className="text-2xl font-bold">{completed}/{enrollments.length}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <BookOpen className="h-8 w-8 text-amber-500" />
            <div><p className="text-sm text-muted-foreground">Obrigatórios pendentes</p><p className="text-2xl font-bold">{mandatoryPending}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <Sparkles className="h-8 w-8 text-purple-500" />
            <div><p className="text-sm text-muted-foreground">Cursos sugeridos</p><p className="text-2xl font-bold">{relevantRecs.length}</p></div>
          </CardContent>
        </Card>
      </div>

      {/* Suggested from prescriptions */}
      {relevantRecs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Sparkles className="h-4 w-4 text-purple-500" /> Cursos recomendados pelo diagnóstico</CardTitle>
            <CardDescription>Prescrições EDU para os indicadores deste projeto</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {relevantRecs.slice(0, 8).map((r: any, idx: number) => {
                const already = enrollments.some(e => e.course_title === r.course_title);
                return (
                  <div key={idx} className="flex items-center justify-between border rounded p-2">
                    <div>
                      <p className="text-sm font-medium">{r.course_title}</p>
                      <p className="text-xs text-muted-foreground">{r.indicator_code} · {r.target_audience || 'Geral'}</p>
                    </div>
                    <Button size="sm" variant={already ? 'outline' : 'default'} disabled={already} onClick={() => create.mutate({
                      project_id: projectId,
                      course_title: r.course_title,
                      target_audience: r.target_audience || null,
                      indicator_code: r.indicator_code,
                      is_mandatory: false,
                      enrollment_status: 'suggested',
                    })}>
                      {already ? 'Vinculado' : 'Vincular'}
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Enrollments */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Capacitações vinculadas</CardTitle>
            <CardDescription>Cursos que apoiam a execução deste projeto</CardDescription>
          </div>
          <Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />Novo</Button>
        </CardHeader>
        <CardContent>
          {enrollments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhuma capacitação vinculada ainda.</p>
          ) : (
            <div className="space-y-2">
              {enrollments.map(e => {
                const info = EDU_ENROLLMENT_STATUS_INFO[e.enrollment_status];
                return (
                  <div key={e.id} className="border rounded p-3 flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm">{e.course_title}</p>
                        {e.is_mandatory && <Badge variant="destructive">Obrigatório</Badge>}
                        <Badge className={cn('text-white', info.color)}>{info.label}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {e.user_name && `Aluno: ${e.user_name} · `}
                        {e.target_audience && `Público: ${e.target_audience} · `}
                        {e.indicator_code && `Indicador: ${e.indicator_code}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select value={e.enrollment_status} onValueChange={(v) => update.mutate({ id: e.id, updates: { enrollment_status: v as EduEnrollmentStatus, completed_at: v === 'completed' ? new Date().toISOString() : null } })}>
                        <SelectTrigger className="w-36 h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(EDU_ENROLLMENT_STATUS_INFO).map(([k, info]) => <SelectItem key={k} value={k}>{info.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Button size="icon" variant="ghost" onClick={() => del.mutate({ id: e.id, projectId })}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Vincular capacitação</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Curso</Label><Input value={form.course_title} onChange={e => setForm({ ...form, course_title: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Público</Label>
                <Select value={form.target_audience} onValueChange={v => setForm({ ...form, target_audience: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Gestores">Gestores</SelectItem>
                    <SelectItem value="Técnicos">Técnicos</SelectItem>
                    <SelectItem value="Trade">Trade</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Indicador (opcional)</Label><Input value={form.indicator_code} onChange={e => setForm({ ...form, indicator_code: e.target.value })} /></div>
            </div>
            <div><Label>Aluno (opcional)</Label><Input value={form.user_name} onChange={e => setForm({ ...form, user_name: e.target.value })} /></div>
            <div className="flex items-center gap-2">
              <Checkbox checked={form.is_mandatory} onCheckedChange={v => setForm({ ...form, is_mandatory: !!v })} />
              <Label>Obrigatório</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={async () => {
              if (!form.course_title) return;
              await create.mutateAsync({
                project_id: projectId,
                course_title: form.course_title,
                target_audience: form.target_audience,
                user_name: form.user_name || null,
                indicator_code: form.indicator_code || null,
                is_mandatory: form.is_mandatory,
                enrollment_status: 'suggested',
              });
              setOpen(false);
              setForm({ course_title: '', target_audience: 'Gestores', user_name: '', is_mandatory: false, indicator_code: '' });
            }}>Vincular</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}