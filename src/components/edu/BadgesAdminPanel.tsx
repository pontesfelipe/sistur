import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { Award, Pencil, Plus, Trash2, Trophy, Star, Flag, Map, Flame, Sparkles } from 'lucide-react';

const ICONS = ['Award', 'Trophy', 'Star', 'Flag', 'Map', 'Flame', 'Sparkles'] as const;
const ICON_MAP: Record<string, any> = { Award, Trophy, Star, Flag, Map, Flame, Sparkles };

interface BadgeRow {
  id: string;
  code: string;
  title: string;
  description: string | null;
  icon: string | null;
  criteria: string | null;
  xp_reward: number;
  active: boolean;
}

const empty = (): Omit<BadgeRow, 'id'> => ({
  code: '',
  title: '',
  description: '',
  icon: 'Award',
  criteria: '',
  xp_reward: 25,
  active: true,
});

export function BadgesAdminPanel() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<BadgeRow | null>(null);
  const [draft, setDraft] = useState<Omit<BadgeRow, 'id'>>(empty());
  const [open, setOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<BadgeRow | null>(null);

  const { data: badges, isLoading } = useQuery({
    queryKey: ['admin-badges'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('edu_badges')
        .select('*')
        .order('xp_reward', { ascending: true });
      if (error) throw error;
      return (data ?? []) as BadgeRow[];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!draft.code.trim() || !draft.title.trim()) {
        throw new Error('Código e título são obrigatórios');
      }
      if (editing) {
        const { error } = await supabase
          .from('edu_badges')
          .update({ ...draft })
          .eq('id', editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('edu_badges').insert({ ...draft });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? 'Badge atualizada' : 'Badge criada');
      qc.invalidateQueries({ queryKey: ['admin-badges'] });
      qc.invalidateQueries({ queryKey: ['edu-badges'] });
      setOpen(false);
      setEditing(null);
      setDraft(empty());
    },
    onError: (e: any) => toast.error(e.message ?? 'Erro ao salvar badge'),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('edu_badges').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Badge removida');
      qc.invalidateQueries({ queryKey: ['admin-badges'] });
      qc.invalidateQueries({ queryKey: ['edu-badges'] });
      setConfirmDelete(null);
    },
    onError: (e: any) => toast.error(e.message ?? 'Erro ao remover'),
  });

  const openCreate = () => {
    setEditing(null);
    setDraft(empty());
    setOpen(true);
  };

  const openEdit = (b: BadgeRow) => {
    setEditing(b);
    setDraft({
      code: b.code,
      title: b.title,
      description: b.description ?? '',
      icon: b.icon ?? 'Award',
      criteria: b.criteria ?? '',
      xp_reward: b.xp_reward,
      active: b.active,
    });
    setOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            Catálogo de Badges
          </h3>
          <p className="text-sm text-muted-foreground">
            Crie e gerencie badges concedidas aos alunos. Use códigos estáveis (ex: <code>first_course</code>).
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Nova badge
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : !badges?.length ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Nenhuma badge cadastrada ainda.
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {badges.map((b) => {
            const Icon = ICON_MAP[b.icon ?? 'Award'] ?? Award;
            return (
              <Card key={b.id} className={b.active ? '' : 'opacity-60'}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <CardTitle className="text-sm">{b.title}</CardTitle>
                        <CardDescription className="text-[11px] font-mono">
                          {b.code}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(b)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setConfirmDelete(b)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="text-xs space-y-1">
                  {b.description && <p>{b.description}</p>}
                  {b.criteria && (
                    <p className="text-muted-foreground">
                      <strong>Critério:</strong> {b.criteria}
                    </p>
                  )}
                  <div className="flex items-center gap-2 pt-1">
                    <Badge variant="secondary">+{b.xp_reward} XP</Badge>
                    {!b.active && <Badge variant="outline">inativa</Badge>}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar badge' : 'Nova badge'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Código (estável, snake_case)</Label>
              <Input
                value={draft.code}
                disabled={!!editing}
                onChange={(e) => setDraft({ ...draft, code: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                placeholder="ex: course_master"
              />
            </div>
            <div>
              <Label>Título</Label>
              <Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea
                rows={2}
                value={draft.description ?? ''}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              />
            </div>
            <div>
              <Label>Critério (texto livre)</Label>
              <Input
                value={draft.criteria ?? ''}
                onChange={(e) => setDraft({ ...draft, criteria: e.target.value })}
                placeholder="ex: Concluir 5 cursos"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>XP de recompensa</Label>
                <Input
                  type="number"
                  min={0}
                  value={draft.xp_reward}
                  onChange={(e) => setDraft({ ...draft, xp_reward: parseInt(e.target.value, 10) || 0 })}
                />
              </div>
              <div>
                <Label>Ícone</Label>
                <select
                  className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                  value={draft.icon ?? 'Award'}
                  onChange={(e) => setDraft({ ...draft, icon: e.target.value })}
                >
                  {ICONS.map((i) => (
                    <option key={i} value={i}>
                      {i}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={draft.active}
                onCheckedChange={(v) => setDraft({ ...draft, active: v })}
              />
              <Label>Ativa</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending ? 'Salvando…' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDelete} onOpenChange={(v) => !v && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover badge?</AlertDialogTitle>
            <AlertDialogDescription>
              A badge "{confirmDelete?.title}" será excluída. Alunos que já a ganharam
              perderão a referência.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDelete && remove.mutate(confirmDelete.id)}
              className="bg-destructive text-destructive-foreground"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}