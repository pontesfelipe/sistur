import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription,
} from '@/components/ui/dialog';
import { Plus, Search, Users as UsersIcon, GraduationCap } from 'lucide-react';
import { useMessageContacts, type MessageContact } from '@/hooks/useClassroomEvents';

interface Props {
  onPick: (peerId: string) => void;
}

export function NewMessageDialog({ onPick }: Props) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const { data: contacts = [], isLoading } = useMessageContacts();

  const grouped = useMemo(() => {
    const f = filter.trim().toLowerCase();
    const filtered = f
      ? contacts.filter(c => c.full_name.toLowerCase().includes(f) || c.classroom_name.toLowerCase().includes(f))
      : contacts;
    // Deduplicate per peer keeping first classroom seen
    const byUser = new Map<string, MessageContact>();
    for (const c of filtered) if (!byUser.has(c.user_id)) byUser.set(c.user_id, c);
    return Array.from(byUser.values()).sort((a, b) => a.full_name.localeCompare(b.full_name));
  }, [contacts, filter]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="default">
          <Plus className="h-4 w-4 mr-2" /> Nova mensagem
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Iniciar conversa</DialogTitle>
          <DialogDescription>
            Escolha um professor ou aluno das suas turmas.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8" placeholder="Buscar nome ou turma..." value={filter} onChange={e => setFilter(e.target.value)} />
          </div>
          <ScrollArea className="h-[60vh] -mx-2 px-2">
            {isLoading && <Skeleton className="h-12" />}
            {!isLoading && grouped.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhum contato disponível. Você precisa estar matriculado em uma turma.
              </p>
            )}
            <div className="space-y-1">
              {grouped.map(c => (
                <button
                  key={c.user_id}
                  type="button"
                  onClick={() => { onPick(c.user_id); setOpen(false); }}
                  className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-muted transition-colors text-left"
                >
                  <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">
                    {c.full_name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{c.full_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{c.classroom_name}</p>
                  </div>
                  <Badge variant={c.role === 'professor' ? 'default' : 'secondary'} className="text-[10px] gap-1">
                    {c.role === 'professor' ? <GraduationCap className="h-3 w-3" /> : <UsersIcon className="h-3 w-3" />}
                    {c.role === 'professor' ? 'Professor' : 'Aluno'}
                  </Badge>
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}