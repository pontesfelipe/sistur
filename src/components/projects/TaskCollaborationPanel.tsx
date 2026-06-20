import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Send, Trash2, Plus, Clock, ArrowRight, UserCheck } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  useTaskComments, useAddTaskComment, useDeleteTaskComment,
  useTaskActivity, useTaskRaci, useAddTaskRaci, useRemoveTaskRaci,
  useOrgUsers, RaciRole,
} from '@/hooks/useProjectCollab';
import { useAuth } from '@/hooks/useAuth';

const RACI_INFO: Record<RaciRole, { label: string; color: string; hint: string }> = {
  R: { label: 'Responsável',  color: 'bg-blue-100 text-blue-700',     hint: 'Executa a tarefa' },
  A: { label: 'Aprovador',    color: 'bg-purple-100 text-purple-700', hint: 'Aprova a entrega' },
  C: { label: 'Consultado',   color: 'bg-amber-100 text-amber-700',   hint: 'Fornece insumos' },
  I: { label: 'Informado',    color: 'bg-gray-100 text-gray-700',     hint: 'Recebe atualizações' },
};

export function TaskCollaborationPanel({
  taskId, projectId, canEdit,
}: { taskId: string; projectId: string; canEdit: boolean }) {
  return (
    <div className="space-y-4">
      <RaciSection taskId={taskId} projectId={projectId} canEdit={canEdit} />
      <CommentsSection taskId={taskId} projectId={projectId} />
      <ActivitySection taskId={taskId} />
    </div>
  );
}

// ----- RACI -----
function RaciSection({ taskId, projectId, canEdit }: { taskId: string; projectId: string; canEdit: boolean }) {
  const { data: raci = [] } = useTaskRaci(taskId);
  const { data: users = [] } = useOrgUsers();
  const addRaci = useAddTaskRaci();
  const removeRaci = useRemoveTaskRaci();
  const [openRole, setOpenRole] = useState<RaciRole | null>(null);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <UserCheck className="h-4 w-4" /> Matriz RACI
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {(['R', 'A', 'C', 'I'] as RaciRole[]).map((role) => {
          const info = RACI_INFO[role];
          const entries = raci.filter((r) => r.role === role || r.role === info.label);
          return (
            <div key={role} className="flex items-start gap-3 text-sm">
              <Badge className={`${info.color} w-24 justify-center shrink-0`} variant="secondary">
                {info.label}
              </Badge>
              <div className="flex-1 flex flex-wrap gap-1.5">
                {entries.map((e) => (
                  <Badge key={e.id} variant="outline" className="gap-1">
                    {e.user_name || e.user_id.slice(0, 8)}
                    {canEdit && (
                      <button onClick={() => removeRaci.mutate({ id: e.id, taskId })}>
                        <Trash2 className="h-3 w-3 ml-1 text-destructive" />
                      </button>
                    )}
                  </Badge>
                ))}
                {canEdit && (
                  <Popover open={openRole === role} onOpenChange={(o) => setOpenRole(o ? role : null)}>
                    <PopoverTrigger asChild>
                      <Button size="sm" variant="ghost" className="h-6 px-2 text-xs">
                        <Plus className="h-3 w-3 mr-1" /> adicionar
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Buscar..." />
                        <CommandList>
                          <CommandEmpty>Sem usuários.</CommandEmpty>
                          <CommandGroup>
                            {users
                              .filter((u) => !entries.some((e) => e.user_id === u.user_id))
                              .map((u) => (
                                <CommandItem
                                  key={u.user_id}
                                  value={u.full_name || u.user_id}
                                  onSelect={async () => {
                                    await addRaci.mutateAsync({
                                      projectId, taskId, userId: u.user_id,
                                      userName: u.full_name, role,
                                    });
                                    setOpenRole(null);
                                  }}
                                >
                                  <span className="text-sm">{u.full_name || u.user_id.slice(0, 8)}</span>
                                </CommandItem>
                              ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

// ----- Comments -----
function CommentsSection({ taskId, projectId }: { taskId: string; projectId: string }) {
  const { user } = useAuth();
  const { data: comments = [] } = useTaskComments(taskId);
  const addComment = useAddTaskComment();
  const delComment = useDeleteTaskComment();
  const [body, setBody] = useState('');

  const submit = async () => {
    if (!body.trim()) return;
    await addComment.mutateAsync({ taskId, projectId, body: body.trim() });
    setBody('');
  };

  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">Comentários ({comments.length})</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {comments.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">Nenhum comentário ainda.</p>
          )}
          {comments.map((c) => (
            <div key={c.id} className="flex gap-2 group">
              <Avatar className="h-7 w-7 shrink-0">
                <AvatarFallback className="text-[10px]">
                  {(c.user_name || '?').slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium">{c.user_name || 'Usuário'}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {format(new Date(c.created_at), "dd/MM HH:mm", { locale: ptBR })}
                  </span>
                  {c.user_id === user?.id && (
                    <button
                      className="opacity-0 group-hover:opacity-100 transition"
                      onClick={() => delComment.mutate({ id: c.id, taskId })}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </button>
                  )}
                </div>
                <p className="text-sm whitespace-pre-wrap break-words">{c.body}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Textarea
            value={body} onChange={(e) => setBody(e.target.value)}
            placeholder="Escrever comentário..." rows={2} className="text-sm"
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit(); }}
          />
          <Button size="sm" onClick={submit} disabled={!body.trim() || addComment.isPending}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ----- Activity -----
function ActivitySection({ taskId }: { taskId: string }) {
  const { data: activity = [] } = useTaskActivity(taskId);
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Clock className="h-4 w-4" /> Histórico
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activity.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-3">Sem registros.</p>
        ) : (
          <ul className="space-y-1.5 text-xs max-h-48 overflow-y-auto">
            {activity.map((a) => (
              <li key={a.id} className="flex items-start gap-2">
                <span className="text-muted-foreground tabular-nums shrink-0">
                  {format(new Date(a.created_at), "dd/MM HH:mm", { locale: ptBR })}
                </span>
                <span>
                  {a.action === 'created' && <>Tarefa criada</>}
                  {a.action === 'status_changed' && (
                    <>Status: <strong>{a.old_value}</strong> <ArrowRight className="inline h-3 w-3" /> <strong>{a.new_value}</strong></>
                  )}
                  {a.action === 'assigned' && (
                    <>Responsável alterado</>
                  )}
                  {!['created','status_changed','assigned'].includes(a.action) && a.action}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}