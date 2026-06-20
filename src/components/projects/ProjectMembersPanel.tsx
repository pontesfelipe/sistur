import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, Trash2, UserPlus, Crown, Pencil, Eye } from 'lucide-react';
import {
  useProjectMembers, useAddProjectMember, useUpdateProjectMember, useRemoveProjectMember,
  useOrgUsers, useMyProjectRole, ProjectMemberRole,
} from '@/hooks/useProjectCollab';
import { cn } from '@/lib/utils';

const ROLE_LABEL: Record<ProjectMemberRole, { label: string; icon: any; color: string }> = {
  owner:  { label: 'Dono',          icon: Crown,  color: 'text-amber-600' },
  editor: { label: 'Editor',        icon: Pencil, color: 'text-blue-600' },
  viewer: { label: 'Visualizador',  icon: Eye,    color: 'text-muted-foreground' },
};

export function ProjectMembersPanel({ projectId }: { projectId: string }) {
  const { data: members = [], isLoading } = useProjectMembers(projectId);
  const { data: orgUsers = [] } = useOrgUsers();
  const addMember = useAddProjectMember();
  const updateMember = useUpdateProjectMember();
  const removeMember = useRemoveProjectMember();
  const { canManage } = useMyProjectRole(projectId);
  const [open, setOpen] = useState(false);
  const [pendingRole, setPendingRole] = useState<ProjectMemberRole>('editor');

  const memberIds = new Set(members.map((m) => m.user_id));
  const available = orgUsers.filter((u) => !memberIds.has(u.user_id));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-lg">Equipe do projeto</CardTitle>
          <CardDescription>
            Defina quem pode visualizar ou editar este projeto. Apenas Donos podem gerenciar a equipe.
          </CardDescription>
        </div>
        {canManage && (
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button size="sm"><UserPlus className="h-4 w-4 mr-1.5" /> Adicionar</Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
              <div className="p-3 border-b space-y-2">
                <label className="text-xs font-medium">Papel</label>
                <Select value={pendingRole} onValueChange={(v) => setPendingRole(v as ProjectMemberRole)}>
                  <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="owner">Dono — gerencia equipe e exclui</SelectItem>
                    <SelectItem value="editor">Editor — cria e edita tarefas</SelectItem>
                    <SelectItem value="viewer">Visualizador — apenas leitura</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Command>
                <CommandInput placeholder="Buscar usuário da organização..." />
                <CommandList>
                  <CommandEmpty>Nenhum usuário disponível.</CommandEmpty>
                  <CommandGroup>
                    {available.map((u) => (
                      <CommandItem
                        key={u.user_id}
                        value={`${u.full_name || ''} ${u.user_id}`}
                        onSelect={async () => {
                          await addMember.mutateAsync({ projectId, userId: u.user_id, role: pendingRole });
                          setOpen(false);
                        }}
                      >
                        <Avatar className="h-6 w-6 mr-2">
                          {u.avatar_url && <AvatarImage src={u.avatar_url} />}
                          <AvatarFallback className="text-[10px]">
                            {(u.full_name || '?').slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{u.full_name || u.user_id.slice(0, 8)}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : members.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum membro cadastrado ainda.</p>
        ) : (
          <ul className="divide-y">
            {members.map((m) => {
              const info = ROLE_LABEL[m.role];
              const Icon = info.icon;
              return (
                <li key={m.id} className="flex items-center justify-between py-2.5">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      {m.avatar_url && <AvatarImage src={m.avatar_url} />}
                      <AvatarFallback className="text-xs">
                        {(m.user_name || '?').slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{m.user_name || m.user_id.slice(0, 8)}</p>
                      <Badge variant="outline" className={cn('text-[10px] gap-1', info.color)}>
                        <Icon className="h-3 w-3" /> {info.label}
                      </Badge>
                    </div>
                  </div>
                  {canManage && (
                    <div className="flex items-center gap-2">
                      <Select
                        value={m.role}
                        onValueChange={(v) =>
                          updateMember.mutate({ id: m.id, role: v as ProjectMemberRole, projectId })
                        }
                      >
                        <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="owner">Dono</SelectItem>
                          <SelectItem value="editor">Editor</SelectItem>
                          <SelectItem value="viewer">Visualizador</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        size="icon" variant="ghost" className="h-8 w-8"
                        onClick={() => removeMember.mutate({ id: m.id, projectId })}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}