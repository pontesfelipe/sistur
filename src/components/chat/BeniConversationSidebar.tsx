import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuSub,
  DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Folder, FolderPlus, MessageSquare, MoreHorizontal, Search, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { BeniConversation, BeniFolder, useBeniConversations } from '@/hooks/useBeniConversations';

type Api = ReturnType<typeof useBeniConversations>;

interface Props {
  api: Api;
  activeId?: string;
  onNew: () => void;
  onNavigate?: () => void;
  onDeletedActive: () => void;
}

export function BeniConversationSidebar({ api, activeId, onNew, onNavigate, onDeletedActive }: Props) {
  const [q, setQ] = useState('');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [folderDialog, setFolderDialog] = useState<{ id?: string; name: string; instructions: string } | null>(null);
  const [renameDialog, setRenameDialog] = useState<{ id: string; title: string } | null>(null);

  const filtered = useMemo(
    () => api.conversations.filter((c) => c.title.toLowerCase().includes(q.toLowerCase())),
    [api.conversations, q],
  );
  const byFolder = (fid: string | null) => filtered.filter((c) => c.folder_id === fid);

  const saveFolder = async () => {
    if (!folderDialog?.name.trim()) return;
    try {
      if (folderDialog.id) await api.updateFolder(folderDialog.id, { name: folderDialog.name.trim(), instructions: folderDialog.instructions || null });
      else await api.createFolder(folderDialog.name.trim(), folderDialog.instructions);
      setFolderDialog(null);
    } catch { toast.error('Erro ao salvar pasta'); }
  };

  const renderConv = (c: BeniConversation) => (
    <div key={c.id} className={cn('group flex items-center rounded-md text-sm hover:bg-muted', activeId === c.id && 'bg-muted font-medium')}>
      <Link to={`/professor-beni/c/${c.id}`} onClick={onNavigate} className="flex min-w-0 flex-1 items-center gap-2 px-2 py-1.5">
        <MessageSquare className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span className="truncate">{c.title}</span>
      </Link>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100" aria-label="Opções">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setRenameDialog({ id: c.id, title: c.title })}>Renomear</DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Mover para</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem onClick={() => api.updateConversation(c.id, { folder_id: null })}>Sem pasta</DropdownMenuItem>
              {api.folders.map((f) => (
                <DropdownMenuItem key={f.id} onClick={() => api.updateConversation(c.id, { folder_id: f.id })}>{f.name}</DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-destructive" onClick={async () => {
            if (!confirm('Excluir esta conversa?')) return;
            await api.deleteConversation(c.id);
            if (c.id === activeId) onDeletedActive();
          }}>Excluir</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  const renderFolder = (f: BeniFolder) => {
    const items = byFolder(f.id);
    const isCol = collapsed[f.id];
    return (
      <div key={f.id} className="space-y-0.5">
        <div className="group flex items-center rounded-md hover:bg-muted">
          <button className="flex min-w-0 flex-1 items-center gap-1.5 px-2 py-1.5 text-sm font-medium" onClick={() => setCollapsed((s) => ({ ...s, [f.id]: !isCol }))}>
            {isCol ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            <Folder className="h-3.5 w-3.5 text-primary" />
            <span className="truncate">{f.name}</span>
            <span className="text-xs text-muted-foreground">({items.length})</span>
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100" aria-label="Opções da pasta">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setFolderDialog({ id: f.id, name: f.name, instructions: f.instructions || '' })}>Editar</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive" onClick={async () => {
                if (!confirm('Excluir a pasta? As conversas vão para "Sem pasta".')) return;
                await api.deleteFolder(f.id);
              }}>Excluir</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {!isCol && <div className="ml-4 space-y-0.5">{items.map(renderConv)}</div>}
      </div>
    );
  };

  const loose = byFolder(null);

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex gap-2">
        <Button className="flex-1" onClick={onNew}><Plus className="mr-1 h-4 w-4" />Nova conversa</Button>
        <Button variant="outline" size="icon" title="Nova pasta" onClick={() => setFolderDialog({ name: '', instructions: '' })}>
          <FolderPlus className="h-4 w-4" />
        </Button>
      </div>
      <div className="relative">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input className="pl-8" placeholder="Buscar conversas" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <ScrollArea className="flex-1">
        <div className="space-y-1 pr-2">
          {api.folders.map(renderFolder)}
          {loose.length > 0 && (
            <div className="pt-2">
              <p className="px-2 pb-1 text-xs font-medium uppercase text-muted-foreground">Sem pasta</p>
              {loose.map(renderConv)}
            </div>
          )}
          {!api.isLoading && api.conversations.length === 0 && (
            <p className="px-2 py-4 text-sm text-muted-foreground">Nenhuma conversa ainda.</p>
          )}
        </div>
      </ScrollArea>

      <Dialog open={!!folderDialog} onOpenChange={(o) => !o && setFolderDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{folderDialog?.id ? 'Editar pasta' : 'Nova pasta'}</DialogTitle></DialogHeader>
          <Input placeholder="Nome do projeto" value={folderDialog?.name ?? ''} onChange={(e) => setFolderDialog((d) => d && { ...d, name: e.target.value })} />
          <Textarea
            placeholder="Instruções para o Beni neste projeto (opcional). Ex.: foco no destino Barretos."
            value={folderDialog?.instructions ?? ''}
            maxLength={2000}
            onChange={(e) => setFolderDialog((d) => d && { ...d, instructions: e.target.value })}
          />
          <DialogFooter><Button onClick={saveFolder}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!renameDialog} onOpenChange={(o) => !o && setRenameDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Renomear conversa</DialogTitle></DialogHeader>
          <Input value={renameDialog?.title ?? ''} onChange={(e) => setRenameDialog((d) => d && { ...d, title: e.target.value })} />
          <DialogFooter>
            <Button onClick={async () => {
              if (!renameDialog?.title.trim()) return;
              await api.updateConversation(renameDialog.id, { title: renameDialog.title.trim().slice(0, 120) });
              setRenameDialog(null);
            }}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
