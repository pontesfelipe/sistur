import { useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Loader2, MessageSquare, Send, Trash2, AtSign } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import {
  useDiscussionComments,
  useMentionableMembers,
  useCanComment,
  useCreateComment,
  useDeleteComment,
  type CommentEntityType,
  type MentionableMember,
} from '@/hooks/useDiscussionComments';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Props {
  entityType: CommentEntityType;
  entityId: string;
  orgId: string;
  title?: string;
  description?: string;
}

function initials(name?: string | null) {
  if (!name) return 'U';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0]?.toUpperCase())
    .join('') || 'U';
}

/** Extrai o token de menção em curso (após o último @ sem espaço). */
function getMentionTrigger(value: string, caret: number): { query: string; start: number } | null {
  const slice = value.slice(0, caret);
  const at = slice.lastIndexOf('@');
  if (at === -1) return null;
  const after = slice.slice(at + 1);
  if (/\s/.test(after)) return null;
  // só dispara se @ estiver no início ou precedido de espaço/quebra
  if (at > 0 && !/\s/.test(slice[at - 1])) return null;
  return { query: after, start: at };
}

export function CommentsPanel({ entityType, entityId, orgId, title, description }: Props) {
  const { user } = useAuth();
  const { data: canComment, isLoading: canLoading } = useCanComment(orgId);
  const { data: comments, isLoading } = useDiscussionComments(entityType, entityId);
  const create = useCreateComment();
  const del = useDeleteComment(entityType, entityId);

  const [body, setBody] = useState('');
  const [mentions, setMentions] = useState<MentionableMember[]>([]);
  const [trigger, setTrigger] = useState<{ query: string; start: number } | null>(null);
  const taRef = useRef<HTMLTextAreaElement | null>(null);

  const { data: suggestions = [] } = useMentionableMembers(orgId, trigger?.query ?? '');

  const mentionedIds = useMemo(
    () => Array.from(new Set(mentions.map(m => m.user_id))),
    [mentions]
  );

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const v = e.target.value;
    setBody(v);
    const caret = e.target.selectionStart ?? v.length;
    setTrigger(getMentionTrigger(v, caret));
  }

  function insertMention(m: MentionableMember) {
    if (!trigger || !taRef.current) return;
    const before = body.slice(0, trigger.start);
    const caret = taRef.current.selectionStart ?? body.length;
    const after = body.slice(caret);
    const token = `@${m.full_name} `;
    const next = `${before}${token}${after}`;
    setBody(next);
    setMentions(prev => (prev.find(p => p.user_id === m.user_id) ? prev : [...prev, m]));
    setTrigger(null);
    requestAnimationFrame(() => {
      const pos = before.length + token.length;
      taRef.current?.focus();
      taRef.current?.setSelectionRange(pos, pos);
    });
  }

  async function submit() {
    if (!body.trim() || !user?.id) return;
    // mantém apenas menções cujo nome ainda aparece no texto
    const usedMentions = mentions.filter(m => body.includes(`@${m.full_name}`));
    await create.mutateAsync({
      entity_type: entityType,
      entity_id: entityId,
      org_id: orgId,
      body: body.trim(),
      mentioned_user_ids: usedMentions.map(m => m.user_id),
    });
    setBody('');
    setMentions([]);
    setTrigger(null);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          {title ?? 'Discussão'}
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Lista */}
        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (comments?.length ?? 0) === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            Nenhum comentário ainda. Seja a primeira pessoa a comentar.
          </p>
        ) : (
          <ul className="space-y-4">
            {comments!.map(c => (
              <li key={c.id} className="flex gap-3">
                <Avatar className="h-9 w-9 mt-0.5">
                  <AvatarFallback className="text-xs">{initials(c.author_name)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{c.author_name}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: ptBR })}
                    </span>
                    {c.edited_at && (
                      <Badge variant="outline" className="text-[10px] px-1 py-0">editado</Badge>
                    )}
                    {(c.author_id === user?.id) && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 ml-auto"
                        onClick={() => del.mutate(c.id)}
                        title="Remover"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    )}
                  </div>
                  <p className="text-sm whitespace-pre-wrap break-words mt-1">{c.body}</p>
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* Composer */}
        {canLoading ? null : !canComment ? (
          <p className="text-xs text-muted-foreground border-t pt-4">
            Você não tem permissão para comentar aqui. Contas pendentes de aprovação ou em organização padrão não podem participar de discussões.
          </p>
        ) : (
          <div className="border-t pt-4 space-y-2 relative">
            <Textarea
              ref={taRef}
              value={body}
              onChange={handleChange}
              placeholder="Escreva um comentário. Use @ para mencionar alguém da sua organização."
              rows={3}
              maxLength={4000}
            />
            {trigger && suggestions.length > 0 && (
              <div className="absolute z-10 bg-popover border rounded-md shadow-md max-h-56 overflow-auto w-72">
                {suggestions.map(s => (
                  <button
                    key={s.user_id}
                    type="button"
                    onClick={() => insertMention(s)}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-accent text-sm text-left"
                  >
                    <AtSign className="h-3.5 w-3.5 text-muted-foreground" />
                    {s.full_name}
                  </button>
                ))}
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {mentionedIds.length > 0
                  ? `${mentionedIds.length} menção(ões) — serão notificadas`
                  : 'Use @ para mencionar membros da organização'}
              </span>
              <Button onClick={submit} disabled={!body.trim() || create.isPending} size="sm">
                {create.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" /> Enviar
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}