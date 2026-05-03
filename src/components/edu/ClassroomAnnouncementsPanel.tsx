import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Megaphone, Pin, PinOff, Trash2, Plus } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  useClassroomAnnouncements,
  useCreateAnnouncement,
  useTogglePinAnnouncement,
  useDeleteAnnouncement,
} from '@/hooks/useClassroomAnnouncements';

interface Props {
  classroomId: string;
  canManage: boolean;
}

export function ClassroomAnnouncementsPanel({ classroomId, canManage }: Props) {
  const { data: announcements = [], isLoading } = useClassroomAnnouncements(classroomId);
  const create = useCreateAnnouncement();
  const togglePin = useTogglePinAnnouncement(classroomId);
  const remove = useDeleteAnnouncement(classroomId);

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [pinned, setPinned] = useState(false);

  const handleSubmit = () => {
    if (!title.trim() || !body.trim()) return;
    create.mutate(
      { classroom_id: classroomId, title: title.trim(), body: body.trim(), pinned },
      {
        onSuccess: () => {
          setTitle(''); setBody(''); setPinned(false); setShowForm(false);
        },
      },
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Megaphone className="h-4 w-4" /> Anúncios da Turma
            </CardTitle>
            <CardDescription>
              {announcements.length} {announcements.length === 1 ? 'anúncio publicado' : 'anúncios publicados'}
            </CardDescription>
          </div>
          {canManage && (
            <Button size="sm" variant="outline" onClick={() => setShowForm((v) => !v)}>
              <Plus className="h-4 w-4 mr-1" /> Novo anúncio
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showForm && canManage && (
          <div className="space-y-2 p-3 border rounded-md bg-muted/30">
            <Input
              placeholder="Título"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <Textarea
              placeholder="Mensagem para a turma..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
            />
            <div className="flex items-center gap-2">
              <Switch id="pinned" checked={pinned} onCheckedChange={setPinned} />
              <Label htmlFor="pinned" className="text-sm cursor-pointer">Fixar no topo</Label>
            </div>
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button size="sm" disabled={!title.trim() || !body.trim() || create.isPending} onClick={handleSubmit}>
                Publicar
              </Button>
            </div>
          </div>
        )}

        {isLoading && <Skeleton className="h-24 w-full" />}
        {!isLoading && announcements.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">
            Nenhum anúncio publicado ainda.
          </p>
        )}

        {announcements.map((a) => (
          <div
            key={a.id}
            className={`p-3 border rounded-md ${a.pinned ? 'border-primary/40 bg-primary/5' : ''}`}
          >
            <div className="flex items-start justify-between gap-2 mb-1">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <h4 className="font-medium text-sm truncate">{a.title}</h4>
                {a.pinned && (
                  <Badge variant="secondary" className="text-xs">
                    <Pin className="h-3 w-3 mr-1" /> Fixado
                  </Badge>
                )}
              </div>
              {canManage && (
                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => togglePin.mutate({ id: a.id, pinned: !a.pinned })}
                    title={a.pinned ? 'Desafixar' : 'Fixar'}
                  >
                    {a.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-destructive"
                    onClick={() => {
                      if (confirm('Remover este anúncio?')) remove.mutate(a.id);
                    }}
                    title="Remover"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>
            <p className="text-sm whitespace-pre-wrap text-muted-foreground">{a.body}</p>
            <p className="text-xs text-muted-foreground mt-2">
              {a.author_name} · {formatDistanceToNow(new Date(a.created_at), { addSuffix: true, locale: ptBR })}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}