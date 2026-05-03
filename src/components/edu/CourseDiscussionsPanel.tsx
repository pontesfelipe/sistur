import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageSquare, CheckCircle2, Send, Plus, GraduationCap } from 'lucide-react';
import {
  useCourseDiscussions,
  useDiscussionReplies,
  useCreateDiscussion,
  useCreateReply,
  useAcceptReply,
  type CourseDiscussion,
} from '@/hooks/useCourseDiscussions';
import { useAuth } from '@/hooks/useAuth';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Props {
  trainingId: string;
  isInstructor?: boolean;
}

function ReplyList({ discussion, isInstructor }: { discussion: CourseDiscussion; isInstructor: boolean }) {
  const { user } = useAuth();
  const { data: replies = [], isLoading } = useDiscussionReplies(discussion.id);
  const createReply = useCreateReply(discussion.training_id);
  const acceptReply = useAcceptReply(discussion.id);
  const [body, setBody] = useState('');

  const canAccept = user?.id === discussion.author_id || isInstructor;

  return (
    <div className="space-y-3 pl-4 border-l-2 border-muted">
      {isLoading && <Skeleton className="h-16 w-full" />}
      {replies.map((r) => (
        <div key={r.id} className={`p-3 rounded-md border ${r.is_accepted ? 'border-success bg-success/5' : 'border-border'}`}>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{r.author_name}</span>
              {r.is_instructor_reply && (
                <Badge variant="secondary" className="text-xs">
                  <GraduationCap className="h-3 w-3 mr-1" /> Instrutor
                </Badge>
              )}
              {r.is_accepted && (
                <Badge variant="default" className="text-xs bg-success">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Aceita
                </Badge>
              )}
            </div>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(r.created_at), { addSuffix: true, locale: ptBR })}
            </span>
          </div>
          <p className="text-sm whitespace-pre-wrap">{r.body}</p>
          {canAccept && !r.is_accepted && r.author_id !== user?.id && (
            <Button
              size="sm"
              variant="ghost"
              className="mt-2 h-7 text-xs"
              onClick={() => acceptReply.mutate(r.id)}
            >
              <CheckCircle2 className="h-3 w-3 mr-1" /> Marcar como aceita
            </Button>
          )}
        </div>
      ))}
      <div className="flex gap-2">
        <Textarea
          placeholder="Escrever resposta..."
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={2}
          className="text-sm"
        />
        <Button
          size="sm"
          disabled={!body.trim() || createReply.isPending}
          onClick={() => {
            createReply.mutate(
              { discussion_id: discussion.id, body: body.trim(), is_instructor_reply: isInstructor },
              { onSuccess: () => setBody('') },
            );
          }}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function CourseDiscussionsPanel({ trainingId, isInstructor = false }: Props) {
  const { data: discussions = [], isLoading } = useCourseDiscussions(trainingId);
  const createDiscussion = useCreateDiscussion();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="h-4 w-4" /> Fórum de Dúvidas
            </CardTitle>
            <CardDescription>
              {discussions.length} {discussions.length === 1 ? 'tópico' : 'tópicos'} neste curso
            </CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={() => setShowForm((v) => !v)}>
            <Plus className="h-4 w-4 mr-1" /> Nova pergunta
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showForm && (
          <div className="space-y-2 p-3 border rounded-md bg-muted/30">
            <Input
              placeholder="Título da pergunta"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <Textarea
              placeholder="Descreva sua dúvida..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={3}
            />
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button
                size="sm"
                disabled={!title.trim() || !body.trim() || createDiscussion.isPending}
                onClick={() => {
                  createDiscussion.mutate(
                    { training_id: trainingId, title: title.trim(), body: body.trim() },
                    {
                      onSuccess: () => {
                        setTitle(''); setBody(''); setShowForm(false);
                      },
                    },
                  );
                }}
              >
                Publicar
              </Button>
            </div>
          </div>
        )}

        {isLoading && <Skeleton className="h-24 w-full" />}
        {!isLoading && discussions.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">
            Ainda não há perguntas neste curso. Seja o primeiro a perguntar!
          </p>
        )}
        {discussions.map((d) => (
          <div key={d.id} className="space-y-2">
            <button
              type="button"
              className="w-full text-left p-3 rounded-md border hover:bg-muted/50 transition-colors"
              onClick={() => setOpenId(openId === d.id ? null : d.id)}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{d.title}</span>
                  {d.status === 'resolved' && (
                    <Badge variant="default" className="bg-success text-xs">Resolvida</Badge>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {d.reply_count} {d.reply_count === 1 ? 'resposta' : 'respostas'}
                </span>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">{d.body}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {d.author_name} · {formatDistanceToNow(new Date(d.created_at), { addSuffix: true, locale: ptBR })}
              </p>
            </button>
            {openId === d.id && (
              <>
                <Separator />
                <ReplyList discussion={d} isInstructor={isInstructor} />
              </>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}