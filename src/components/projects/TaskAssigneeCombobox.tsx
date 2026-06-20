import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, User, X } from 'lucide-react';
import { useOrgUsers, OrgUser } from '@/hooks/useProjectCollab';
import { cn } from '@/lib/utils';

interface Props {
  value: string | null;          // user_id
  displayName?: string | null;
  onChange: (user: OrgUser | null) => void;
  placeholder?: string;
  className?: string;
}

export function TaskAssigneeCombobox({ value, displayName, onChange, placeholder, className }: Props) {
  const { data: users = [], isLoading } = useOrgUsers();
  const [open, setOpen] = useState(false);
  const selected = users.find((u) => u.user_id === value) || null;
  const label = selected?.full_name || displayName || null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button" variant="outline"
          className={cn('w-full justify-between font-normal', className)}
        >
          <span className="flex items-center gap-2 min-w-0">
            {selected ? (
              <Avatar className="h-5 w-5">
                {selected.avatar_url && <AvatarImage src={selected.avatar_url} />}
                <AvatarFallback className="text-[9px]">
                  {(selected.full_name || '?').slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            ) : (
              <User className="h-4 w-4 text-muted-foreground" />
            )}
            <span className="truncate">{label || placeholder || 'Selecionar responsável...'}</span>
          </span>
          {value && (
            <X
              className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground"
              onClick={(e) => { e.stopPropagation(); onChange(null); }}
            />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar pessoa..." />
          <CommandList>
            <CommandEmpty>{isLoading ? 'Carregando...' : 'Nenhum usuário encontrado.'}</CommandEmpty>
            <CommandGroup>
              {users.map((u) => (
                <CommandItem
                  key={u.user_id}
                  value={`${u.full_name || ''} ${u.user_id}`}
                  onSelect={() => { onChange(u); setOpen(false); }}
                >
                  <Avatar className="h-6 w-6 mr-2">
                    {u.avatar_url && <AvatarImage src={u.avatar_url} />}
                    <AvatarFallback className="text-[10px]">
                      {(u.full_name || '?').slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm flex-1">{u.full_name || u.user_id.slice(0, 8)}</span>
                  {value === u.user_id && <Check className="h-4 w-4" />}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}