import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, Settings2, Users, Calendar, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';

interface ClassroomMember {
  student_id: string;
  student_name?: string;
}

interface AssignmentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: ClassroomMember[];
  availableTracks: { id: string; name: string }[];
  availableTrainings: { training_id: string; title: string }[];
  availableExams: { ruleset_id: string; label: string }[];
  isPending: boolean;
  onSubmit: (input: {
    assignment_type: string;
    title: string;
    description?: string;
    track_id?: string;
    training_id?: string;
    exam_ruleset_id?: string;
    available_from?: string;
    due_date?: string;
    target_user_ids?: string[] | null;
    override_time_limit_minutes?: number | null;
    override_max_attempts?: number | null;
    override_min_score_pct?: number | null;
  }) => void;
}

const schema = z.object({
  type: z.enum(['track', 'training', 'exam', 'custom']),
  title: z.string().trim().min(1, 'Título obrigatório').max(200),
  description: z.string().trim().max(1000).optional(),
  track_id: z.string().optional(),
  training_id: z.string().optional(),
  exam_ruleset_id: z.string().optional(),
  available_from: z.string().optional(),
  due_date: z.string().optional(),
  target_user_ids: z.array(z.string()).optional(),
  override_time_limit_minutes: z.number().int().min(5).max(480).nullable().optional(),
  override_max_attempts: z.number().int().min(1).max(10).nullable().optional(),
  override_min_score_pct: z.number().min(0).max(100).nullable().optional(),
});

const initialForm = {
  type: 'exam' as 'track' | 'training' | 'exam' | 'custom',
  title: '',
  description: '',
  track_id: '',
  training_id: '',
  exam_ruleset_id: '',
  available_from: '',
  due_date: '',
  target_user_ids: [] as string[],
  override_time_limit_minutes: '' as string,
  override_max_attempts: '' as string,
  override_min_score_pct: '' as string,
};

export function AssignmentFormDialog({
  open,
  onOpenChange,
  members,
  availableTracks,
  availableTrainings,
  availableExams,
  isPending,
  onSubmit,
}: AssignmentFormDialogProps) {
  const [form, setForm] = useState(initialForm);
  const [allMembers, setAllMembers] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    if (!open) {
      setForm(initialForm);
      setAllMembers(true);
      setShowAdvanced(false);
    }
  }, [open]);

  const isExam = form.type === 'exam';

  const handleSubmit = () => {
    let title = form.title.trim();
    if (!title) {
      if (form.type === 'track' && form.track_id) {
        title = availableTracks.find(t => t.id === form.track_id)?.name || '';
      } else if (form.type === 'training' && form.training_id) {
        title = availableTrainings.find(t => t.training_id === form.training_id)?.title || '';
      } else if (form.type === 'exam' && form.exam_ruleset_id) {
        title = availableExams.find(e => e.ruleset_id === form.exam_ruleset_id)?.label || '';
      }
    }

    const parsed = schema.safeParse({
      type: form.type,
      title,
      description: form.description || undefined,
      track_id: form.track_id || undefined,
      training_id: form.training_id || undefined,
      exam_ruleset_id: form.exam_ruleset_id || undefined,
      available_from: form.available_from || undefined,
      due_date: form.due_date || undefined,
      target_user_ids: allMembers ? undefined : form.target_user_ids,
      override_time_limit_minutes: form.override_time_limit_minutes
        ? Number(form.override_time_limit_minutes)
        : null,
      override_max_attempts: form.override_max_attempts ? Number(form.override_max_attempts) : null,
      override_min_score_pct: form.override_min_score_pct
        ? Number(form.override_min_score_pct)
        : null,
    });

    if (!parsed.success) {
      const first = parsed.error.issues[0];
      toast.error(first?.message || 'Dados inválidos');
      return;
    }

    if (form.type === 'track' && !form.track_id) return toast.error('Selecione uma trilha');
    if (form.type === 'training' && !form.training_id) return toast.error('Selecione um treinamento');
    if (form.type === 'exam' && !form.exam_ruleset_id) return toast.error('Selecione uma prova');

    if (
      form.available_from &&
      form.due_date &&
      new Date(form.available_from) >= new Date(form.due_date)
    ) {
      return toast.error('A data de entrega deve ser posterior à liberação');
    }

    if (!allMembers && (!form.target_user_ids || form.target_user_ids.length === 0)) {
      return toast.error('Selecione ao menos um aluno-alvo');
    }

    onSubmit({
      assignment_type: parsed.data.type,
      title: parsed.data.title,
      description: parsed.data.description,
      track_id: parsed.data.track_id,
      training_id: parsed.data.training_id,
      exam_ruleset_id: parsed.data.exam_ruleset_id,
      available_from: form.available_from
        ? new Date(form.available_from).toISOString()
        : undefined,
      due_date: form.due_date ? new Date(form.due_date).toISOString() : undefined,
      target_user_ids: allMembers ? null : form.target_user_ids,
      override_time_limit_minutes: parsed.data.override_time_limit_minutes ?? null,
      override_max_attempts: parsed.data.override_max_attempts ?? null,
      override_min_score_pct: parsed.data.override_min_score_pct ?? null,
    });
  };

  const toggleMember = (id: string) => {
    setForm(p => ({
      ...p,
      target_user_ids: p.target_user_ids.includes(id)
        ? p.target_user_ids.filter(x => x !== id)
        : [...p.target_user_ids, id],
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova atividade</DialogTitle>
          <DialogDescription>
            Configure quando a atividade abre, quem recebe e (para provas) regras específicas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Type */}
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select
              value={form.type}
              onValueChange={(v: any) =>
                setForm(p => ({
                  ...p,
                  type: v,
                  track_id: '',
                  training_id: '',
                  exam_ruleset_id: '',
                  title: '',
                }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="exam">Prova / Exame</SelectItem>
                <SelectItem value="track">Trilha de aprendizado</SelectItem>
                <SelectItem value="training">Treinamento</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {form.type === 'track' && (
            <div className="space-y-2">
              <Label>Trilha *</Label>
              <Select
                value={form.track_id}
                onValueChange={v => {
                  const t = availableTracks.find(x => x.id === v);
                  setForm(p => ({ ...p, track_id: v, title: t?.name || p.title }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Escolha uma trilha" />
                </SelectTrigger>
                <SelectContent>
                  {availableTracks.map(t => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {form.type === 'training' && (
            <div className="space-y-2">
              <Label>Treinamento *</Label>
              <Select
                value={form.training_id}
                onValueChange={v => {
                  const t = availableTrainings.find(x => x.training_id === v);
                  setForm(p => ({ ...p, training_id: v, title: t?.title || p.title }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Escolha um treinamento" />
                </SelectTrigger>
                <SelectContent>
                  {availableTrainings.map(t => (
                    <SelectItem key={t.training_id} value={t.training_id}>
                      {t.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {form.type === 'exam' && (
            <div className="space-y-2">
              <Label>Prova *</Label>
              <Select
                value={form.exam_ruleset_id}
                onValueChange={v => {
                  const e = availableExams.find(x => x.ruleset_id === v);
                  setForm(p => ({ ...p, exam_ruleset_id: v, title: e?.label || p.title }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Escolha uma prova" />
                </SelectTrigger>
                <SelectContent>
                  {availableExams.map(e => (
                    <SelectItem key={e.ruleset_id} value={e.ruleset_id}>
                      {e.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Título</Label>
            <Input
              value={form.title}
              maxLength={200}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label>Descrição (opcional)</Label>
            <Textarea
              value={form.description}
              maxLength={1000}
              rows={2}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
            />
          </div>

          <Separator />

          {/* Schedule */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                Liberada em
              </Label>
              <Input
                type="datetime-local"
                value={form.available_from}
                onChange={e => setForm(p => ({ ...p, available_from: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">Em branco = imediatamente</p>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                Entrega até
              </Label>
              <Input
                type="datetime-local"
                value={form.due_date}
                onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">Em branco = sem prazo</p>
            </div>
          </div>

          <Separator />

          {/* Targets */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              Quem recebe
            </Label>
            <div className="flex items-center gap-2">
              <Checkbox
                id="all-members"
                checked={allMembers}
                onCheckedChange={v => setAllMembers(!!v)}
              />
              <label htmlFor="all-members" className="text-sm cursor-pointer">
                Toda a turma ({members.length} alunos)
              </label>
            </div>

            {!allMembers && (
              <div className="border rounded-md p-2 space-y-1 max-h-40 overflow-y-auto">
                {members.length === 0 ? (
                  <p className="text-xs text-muted-foreground p-2">Nenhum aluno na turma</p>
                ) : (
                  members.map(m => (
                    <div key={m.student_id} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-muted">
                      <Checkbox
                        id={`m-${m.student_id}`}
                        checked={form.target_user_ids.includes(m.student_id)}
                        onCheckedChange={() => toggleMember(m.student_id)}
                      />
                      <label htmlFor={`m-${m.student_id}`} className="text-sm cursor-pointer flex-1">
                        {m.student_name || 'Aluno'}
                      </label>
                    </div>
                  ))
                )}
                {!allMembers && form.target_user_ids.length > 0 && (
                  <Badge variant="secondary" className="ml-1 mt-1">
                    {form.target_user_ids.length} selecionado(s)
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* Overrides — only for exams */}
          {isExam && (
            <>
              <Separator />
              <button
                type="button"
                onClick={() => setShowAdvanced(s => !s)}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Settings2 className="h-3.5 w-3.5" />
                {showAdvanced ? 'Ocultar' : 'Mostrar'} regras específicas (opcional)
              </button>

              {showAdvanced && (
                <div className="grid grid-cols-3 gap-3 p-3 bg-muted/30 rounded-md">
                  <div className="space-y-1">
                    <Label className="text-xs">Tempo (min)</Label>
                    <Input
                      type="number"
                      min={5}
                      max={480}
                      placeholder="padrão"
                      value={form.override_time_limit_minutes}
                      onChange={e =>
                        setForm(p => ({ ...p, override_time_limit_minutes: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Tentativas</Label>
                    <Input
                      type="number"
                      min={1}
                      max={10}
                      placeholder="padrão"
                      value={form.override_max_attempts}
                      onChange={e =>
                        setForm(p => ({ ...p, override_max_attempts: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Nota mín. (%)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      placeholder="padrão"
                      value={form.override_min_score_pct}
                      onChange={e =>
                        setForm(p => ({ ...p, override_min_score_pct: e.target.value }))
                      }
                    />
                  </div>
                  <p className="col-span-3 text-xs text-muted-foreground">
                    Em branco = usar regras padrão da prova
                  </p>
                </div>
              )}
            </>
          )}

          <Button className="w-full" onClick={handleSubmit} disabled={isPending}>
            {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Atribuir atividade
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
