import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Trash2, GripVertical, Pencil } from 'lucide-react';
import type { AdaptivePath, AdaptiveStep } from '@/hooks/useAdaptiveLearningPaths';

export function AdaptivePathEditor() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<AdaptivePath | null>(null);

  const { data: paths, isLoading } = useQuery({
    queryKey: ['admin-adaptive-paths'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('edu_learning_paths')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as AdaptivePath[];
    },
  });

  const createPath = useMutation({
    mutationFn: async (input: Partial<AdaptivePath>) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error('Não autenticado');
      const { error } = await supabase.from('edu_learning_paths').insert({
        title: input.title ?? 'Nova trilha',
        description: input.description ?? null,
        pillar: input.pillar ?? null,
        level: input.level ?? 'introdutorio',
        is_adaptive: input.is_adaptive ?? true,
        published: false,
        created_by: u.user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Trilha criada');
      qc.invalidateQueries({ queryKey: ['admin-adaptive-paths'] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updatePath = useMutation({
    mutationFn: async (input: AdaptivePath) => {
      const { error } = await supabase
        .from('edu_learning_paths')
        .update({
          title: input.title,
          description: input.description,
          pillar: input.pillar,
          level: input.level,
          is_adaptive: input.is_adaptive,
          published: input.published,
        })
        .eq('id', input.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Trilha atualizada');
      qc.invalidateQueries({ queryKey: ['admin-adaptive-paths'] });
      setEditing(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deletePath = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('edu_learning_paths').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Trilha removida');
      qc.invalidateQueries({ queryKey: ['admin-adaptive-paths'] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-lg">Trilhas Adaptativas</CardTitle>
            <CardDescription>Crie percursos com etapas, pré-requisitos e gatilhos por status do diagnóstico.</CardDescription>
          </div>
          <Button size="sm" onClick={() => createPath.mutate({})} disabled={createPath.isPending}>
            <Plus className="w-4 h-4 mr-1" /> Nova trilha
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
        {!isLoading && !paths?.length && (
          <p className="text-sm text-muted-foreground py-6 text-center">Nenhuma trilha criada ainda.</p>
        )}
        {(paths ?? []).map((p) => (
          <div key={p.id} className="border rounded-lg p-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">{p.title}</span>
                  {p.pillar && <Badge variant="outline">{p.pillar}</Badge>}
                  {p.level && <Badge variant="secondary" className="capitalize">{p.level}</Badge>}
                  {p.published ? (
                    <Badge>Publicada</Badge>
                  ) : (
                    <Badge variant="outline">Rascunho</Badge>
                  )}
                </div>
                {p.description && <p className="text-xs text-muted-foreground mt-1">{p.description}</p>}
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" onClick={() => setEditing(p)}>
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (confirm('Remover esta trilha e todas as etapas?')) deletePath.mutate(p.id);
                  }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
            <PathStepsEditor pathId={p.id} />
          </div>
        ))}

        <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar trilha</DialogTitle>
            </DialogHeader>
            {editing && (
              <div className="space-y-3">
                <div>
                  <Label>Título</Label>
                  <Input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
                </div>
                <div>
                  <Label>Descrição</Label>
                  <Textarea
                    value={editing.description ?? ''}
                    onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Pilar</Label>
                    <Select
                      value={editing.pillar ?? ''}
                      onValueChange={(v) => setEditing({ ...editing, pillar: v as any })}
                    >
                      <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="RA">RA</SelectItem>
                        <SelectItem value="OE">OE</SelectItem>
                        <SelectItem value="AO">AO</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Nível</Label>
                    <Select
                      value={editing.level ?? 'introdutorio'}
                      onValueChange={(v) => setEditing({ ...editing, level: v })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="introdutorio">Introdutório</SelectItem>
                        <SelectItem value="basico">Básico</SelectItem>
                        <SelectItem value="intermediario">Intermediário</SelectItem>
                        <SelectItem value="avancado">Avançado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Adaptativa</Label>
                  <Switch
                    checked={editing.is_adaptive}
                    onCheckedChange={(v) => setEditing({ ...editing, is_adaptive: v })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Publicada</Label>
                  <Switch
                    checked={editing.published}
                    onCheckedChange={(v) => setEditing({ ...editing, published: v })}
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
              <Button onClick={() => editing && updatePath.mutate(editing)} disabled={updatePath.isPending}>
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

function PathStepsEditor({ pathId }: { pathId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: steps } = useQuery({
    queryKey: ['admin-path-steps', pathId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('edu_learning_path_steps')
        .select('*')
        .eq('path_id', pathId)
        .order('order_index');
      if (error) throw error;
      return (data ?? []) as AdaptiveStep[];
    },
  });

  const { data: trainings } = useQuery({
    queryKey: ['admin-trainings-min'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('edu_trainings')
        .select('id, title')
        .order('title');
      if (error) throw error;
      return data ?? [];
    },
    enabled: open,
  });

  const addStep = useMutation({
    mutationFn: async () => {
      const nextOrder = (steps?.length ?? 0);
      const { error } = await supabase.from('edu_learning_path_steps').insert({
        path_id: pathId,
        title: `Etapa ${nextOrder + 1}`,
        order_index: nextOrder,
        required_status: 'any',
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-path-steps', pathId] }),
  });

  const updateStep = useMutation({
    mutationFn: async (s: AdaptiveStep) => {
      const { error } = await supabase
        .from('edu_learning_path_steps')
        .update({
          title: s.title,
          description: s.description,
          training_id: s.training_id,
          min_score: s.min_score,
          required_status: s.required_status,
          is_optional: s.is_optional,
          order_index: s.order_index,
        })
        .eq('id', s.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Etapa atualizada');
      qc.invalidateQueries({ queryKey: ['admin-path-steps', pathId] });
    },
  });

  const removeStep = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('edu_learning_path_steps').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-path-steps', pathId] }),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" className="text-xs">
          {steps?.length ?? 0} etapa(s) — gerenciar
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Etapas da trilha</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {(steps ?? []).map((s) => (
            <div key={s.id} className="border rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2">
                <GripVertical className="w-4 h-4 text-muted-foreground" />
                <Input
                  value={s.title}
                  onChange={(e) => updateStep.mutate({ ...s, title: e.target.value })}
                  className="flex-1"
                />
                <Button size="sm" variant="outline" onClick={() => removeStep.mutate(s.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
              <Textarea
                placeholder="Descrição"
                value={s.description ?? ''}
                onChange={(e) => updateStep.mutate({ ...s, description: e.target.value })}
                rows={2}
              />
              <div className="grid grid-cols-2 gap-2">
                <Select
                  value={s.training_id ?? ''}
                  onValueChange={(v) => updateStep.mutate({ ...s, training_id: v || null })}
                >
                  <SelectTrigger><SelectValue placeholder="Curso vinculado" /></SelectTrigger>
                  <SelectContent>
                    {(trainings ?? []).map((t: any) => (
                      <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={s.required_status}
                  onValueChange={(v) => updateStep.mutate({ ...s, required_status: v as any })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Sem gatilho</SelectItem>
                    <SelectItem value="atencao">Trigger: Atenção</SelectItem>
                    <SelectItem value="critico">Trigger: Crítico</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2 items-center">
                <div>
                  <Label className="text-xs">Nota mínima</Label>
                  <Input
                    type="number"
                    value={s.min_score ?? 70}
                    onChange={(e) => updateStep.mutate({ ...s, min_score: Number(e.target.value) })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Opcional</Label>
                  <Switch
                    checked={s.is_optional}
                    onCheckedChange={(v) => updateStep.mutate({ ...s, is_optional: v })}
                  />
                </div>
              </div>
            </div>
          ))}
          <Button onClick={() => addStep.mutate()} variant="outline" className="w-full">
            <Plus className="w-4 h-4 mr-1" /> Adicionar etapa
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}