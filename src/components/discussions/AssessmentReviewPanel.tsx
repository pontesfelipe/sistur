import { useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Loader2,
  Send,
  Trash2,
  AtSign,
  CheckCircle2,
  Circle,
  Layers,
  Target,
  MessageSquare,
  RotateCcw,
  Anchor,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import {
  useDiscussionComments,
  useMentionableMembers,
  useCanComment,
  useCreateComment,
  useDeleteComment,
  useSetCommentStatus,
  type MentionableMember,
  type CommentAnchorType,
  type CommentStatus,
} from '@/hooks/useDiscussionComments';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface IndicatorOpt {
  code: string;
  label: string;
  pillar?: string | null;
}

interface Props {
  assessmentId: string;
  orgId: string;
  indicators?: IndicatorOpt[];
  pillarKeys?: string[];
}

const PILLAR_LABEL: Record<string, string> = {
  RA: 'Relações Ambientais',
  OE: 'Organização Estrutural',
  AO: 'Ações Operacionais',
};

function initials(name?: string | null) {
  if (!name) return 'U';
  return (
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join('') || 'U'
  );
}

function getMentionTrigger(value: string, caret: number): { query: string; start: number } | null {
  const slice = value.slice(0, caret);
  const at = slice.lastIndexOf('@');
  if (at === -1) return null;
  const after = slice.slice(at + 1);
  if (/\s/.test(after)) return null;
  if (at > 0 && !/\s/.test(slice[at - 1])) return null;
  return { query: after, start: at };
}

export function AssessmentReviewPanel({ assessmentId, orgId, indicators = [], pillarKeys = ['RA', 'OE', 'AO'] }: Props) {
  const { user } = useAuth();
  const { data: canComment, isLoading: canLoading } = useCanComment(orgId);
  const { data: comments, isLoading } = useDiscussionComments('assessment', assessmentId);
  const create = useCreateComment();
  const del = useDeleteComment('assessment', assessmentId);
  const setStatus = useSetCommentStatus('assessment', assessmentId);

  // composer state
  const [body, setBody] = useState('');
  const [anchorType, setAnchorType] = useState<CommentAnchorType>('general');
  const [anchorRef, setAnchorRef] = useState<string | null>(null);
  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const [mentions, setMentions] = useState<MentionableMember[]>([]);
  const [trigger, setTrigger] = useState<{ query: string; start: number } | null>(null);
  const taRef = useRef<HTMLTextAreaElement | null>(null);

  const { data: suggestions = [] } = useMentionableMembers(orgId, trigger?.query ?? '');
  const { data: allMembers = [] } = useMentionableMembers(orgId, '');

  // filters
  const [statusFilter, setStatusFilter] = useState<'all' | CommentStatus>('all');
  const [anchorFilter, setAnchorFilter] = useState<string>('all');

  const filtered = useMemo(() => {
    return (comments || []).filter((c) => {
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      if (anchorFilter === 'all') return true;
      if (anchorFilter === 'general') return c.anchor_type === 'general' || !c.anchor_type;
      if (anchorFilter.startsWith('pillar:')) {
        return c.anchor_type === 'pillar' && c.anchor_ref === anchorFilter.slice(7);
      }
      if (anchorFilter.startsWith('indicator:')) {
        return c.anchor_type === 'indicator' && c.anchor_ref === anchorFilter.slice(10);
      }
      return true;
    });
  }, [comments, statusFilter, anchorFilter]);

  const summary = useMemo(() => {
    const total = comments?.length ?? 0;
    const open = comments?.filter((c) => c.status === 'open').length ?? 0;
    return { total, open, resolved: total - open };
  }, [comments]);

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
    setMentions((prev) => (prev.find((p) => p.user_id === m.user_id) ? prev : [...prev, m]));
    setTrigger(null);
    requestAnimationFrame(() => {
      const pos = before.length + token.length;
      taRef.current?.focus();
      taRef.current?.setSelectionRange(pos, pos);
    });
  }

  async function submit() {
    if (!body.trim() || !user?.id) return;
    const usedMentions = mentions.filter((m) => body.includes(`@${m.full_name}`));
    await create.mutateAsync({
      entity_type: 'assessment',
      entity_id: assessmentId,
      org_id: orgId,
      body: body.trim(),
      mentioned_user_ids: usedMentions.map((m) => m.user_id),
      anchor_type: anchorType,
      anchor_ref: anchorType === 'general' ? null : anchorRef,
      assignee_id: assigneeId,
    });
    setBody('');
    setMentions([]);
    setTrigger(null);
    setAssigneeId(null);
    // keep anchor selection sticky so multiple comments on same target are easy
  }

  function anchorBadge(c: { anchor_type: CommentAnchorType | null; anchor_ref: string | null }) {
    if (!c.anchor_type || c.anchor_type === 'general') {
      return (
        <Badge variant="outline" className="text-[10px] gap-1">
          <MessageSquare className="h-3 w-3" /> Diagnóstico
        </Badge>
      );
    }
    if (c.anchor_type === 'pillar') {
      return (
        <Badge variant="outline" className="text-[10px] gap-1 border-primary/40 text-primary">
          <Layers className="h-3 w-3" /> Pilar {c.anchor_ref}
        </Badge>
      );
    }
    const ind = indicators.find((i) => i.code === c.anchor_ref);
    return (
      <Badge variant="outline" className="text-[10px] gap-1 border-blue-500/40 text-blue-600 dark:text-blue-400 max-w-[260px]">
        <Target className="h-3 w-3 shrink-0" />
        <span className="truncate">{ind?.label || c.anchor_ref}</span>
      </Badge>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="h-5 w-5" />
              Revisão técnica do diagnóstico
            </CardTitle>
            <CardDescription>
              Comentários ancorados em pilares ou indicadores específicos, com responsável e status (aberto / resolvido).
              Use @ para mencionar pessoas da sua organização.
            </CardDescription>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge variant="outline" className="gap-1">
              <Circle className="h-3 w-3 text-amber-500 fill-amber-500" />
              {summary.open} aberto{summary.open === 1 ? '' : 's'}
            </Badge>
            <Badge variant="outline" className="gap-1">
              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
              {summary.resolved} resolvido{summary.resolved === 1 ? '' : 's'}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 border-b pb-3">
          <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
            <TabsList className="h-8">
              <TabsTrigger value="all" className="text-xs h-6 px-2.5">Todos</TabsTrigger>
              <TabsTrigger value="open" className="text-xs h-6 px-2.5">Abertos</TabsTrigger>
              <TabsTrigger value="resolved" className="text-xs h-6 px-2.5">Resolvidos</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex items-center gap-1.5 ml-auto">
            <Anchor className="h-3.5 w-3.5 text-muted-foreground" />
            <Select value={anchorFilter} onValueChange={setAnchorFilter}>
              <SelectTrigger className="h-8 w-[220px] text-xs">
                <SelectValue placeholder="Filtrar por âncora" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as âncoras</SelectItem>
                <SelectItem value="general">Sobre o diagnóstico</SelectItem>
                {pillarKeys.map((p) => (
                  <SelectItem key={p} value={`pillar:${p}`}>
                    Pilar {p} — {PILLAR_LABEL[p] || p}
                  </SelectItem>
                ))}
                {indicators.slice(0, 200).map((i) => (
                  <SelectItem key={i.code} value={`indicator:${i.code}`}>
                    Indicador · {i.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhum item de revisão{statusFilter !== 'all' ? ` ${statusFilter === 'open' ? 'aberto' : 'resolvido'}` : ''} nesse filtro.
          </p>
        ) : (
          <ul className="space-y-3">
            {filtered.map((c) => {
              const isResolved = c.status === 'resolved';
              const isMine = c.author_id === user?.id;
              const assignee = allMembers.find((m) => m.user_id === c.assignee_id);
              return (
                <li
                  key={c.id}
                  className={`rounded-lg border p-3 flex gap-3 transition-colors ${
                    isResolved ? 'bg-muted/30 opacity-80' : 'bg-card'
                  }`}
                >
                  <Avatar className="h-9 w-9 mt-0.5">
                    <AvatarFallback className="text-xs">{initials(c.author_name)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{c.author_name}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: ptBR })}
                      </span>
                      {anchorBadge(c)}
                      {isResolved && (
                        <Badge variant="outline" className="text-[10px] gap-1 border-emerald-500/40 text-emerald-700 dark:text-emerald-400">
                          <CheckCircle2 className="h-3 w-3" /> Resolvido
                        </Badge>
                      )}
                      {assignee && !isResolved && (
                        <Badge variant="outline" className="text-[10px] gap-1">
                          <AtSign className="h-3 w-3" /> Resp.: {assignee.full_name}
                        </Badge>
                      )}
                      <div className="ml-auto flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() =>
                            setStatus.mutate({ comment_id: c.id, status: isResolved ? 'open' : 'resolved' })
                          }
                          title={isResolved ? 'Reabrir' : 'Marcar como resolvido'}
                        >
                          {isResolved ? (
                            <RotateCcw className="h-3.5 w-3.5" />
                          ) : (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          )}
                        </Button>
                        {isMine && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            onClick={() => del.mutate(c.id)}
                            title="Remover"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <p className={`text-sm whitespace-pre-wrap break-words mt-1.5 ${isResolved ? 'line-through opacity-70' : ''}`}>
                      {c.body}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {/* Composer */}
        {canLoading ? null : !canComment ? (
          <p className="text-xs text-muted-foreground border-t pt-4">
            Você não tem permissão para comentar aqui.
          </p>
        ) : (
          <div className="border-t pt-4 space-y-3 relative">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <Select
                value={anchorType}
                onValueChange={(v) => {
                  setAnchorType(v as CommentAnchorType);
                  setAnchorRef(null);
                }}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">Sobre o diagnóstico</SelectItem>
                  <SelectItem value="pillar">Sobre um pilar</SelectItem>
                  <SelectItem value="indicator">Sobre um indicador</SelectItem>
                </SelectContent>
              </Select>

              {anchorType === 'pillar' && (
                <Select value={anchorRef ?? ''} onValueChange={setAnchorRef}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Escolha o pilar" />
                  </SelectTrigger>
                  <SelectContent>
                    {pillarKeys.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p} — {PILLAR_LABEL[p] || p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {anchorType === 'indicator' && (
                <Select value={anchorRef ?? ''} onValueChange={setAnchorRef}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Escolha o indicador" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {indicators.map((i) => (
                      <SelectItem key={i.code} value={i.code}>
                        {i.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <Select value={assigneeId ?? '__none'} onValueChange={(v) => setAssigneeId(v === '__none' ? null : v)}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Atribuir responsável (opcional)" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  <SelectItem value="__none">Sem responsável</SelectItem>
                  {allMembers.map((m) => (
                    <SelectItem key={m.user_id} value={m.user_id}>
                      {m.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Textarea
              ref={taRef}
              value={body}
              onChange={handleChange}
              placeholder="Descreva a observação técnica. Use @ para mencionar membros."
              rows={3}
              maxLength={4000}
            />
            {trigger && suggestions.length > 0 && (
              <div className="absolute z-10 bg-popover border rounded-md shadow-md max-h-56 overflow-auto w-72">
                {suggestions.map((s) => (
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

            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs text-muted-foreground">
                {anchorType === 'general'
                  ? 'Comentário geral sobre o diagnóstico.'
                  : anchorType === 'pillar'
                    ? anchorRef
                      ? `Ancorado no pilar ${anchorRef}.`
                      : 'Selecione o pilar.'
                    : anchorRef
                      ? `Ancorado no indicador ${anchorRef}.`
                      : 'Selecione o indicador.'}
              </span>
              <Button
                onClick={submit}
                disabled={
                  !body.trim() ||
                  create.isPending ||
                  (anchorType !== 'general' && !anchorRef)
                }
                size="sm"
              >
                {create.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" /> Enviar revisão
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