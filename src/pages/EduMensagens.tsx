import { useState, useMemo, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { eduTurmasNav } from '@/components/layout/eduSubNav';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Send, Search, MessageCircle } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  useConversations,
  useConversationMessages,
  useSendMessage,
} from '@/hooks/useEduMessages';
import { useAuth } from '@/hooks/useAuth';

const EduMensagens = () => {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const initialPeer = params.get('peer');
  const [activePeer, setActivePeer] = useState<string | null>(initialPeer);
  const [filter, setFilter] = useState('');
  const [body, setBody] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: conversations = [], isLoading: loadingConvs } = useConversations();
  const { data: messages = [], isLoading: loadingMsgs } = useConversationMessages(activePeer);
  const send = useSendMessage();

  const filtered = useMemo(
    () =>
      conversations.filter((c) =>
        c.peer_name.toLowerCase().includes(filter.toLowerCase()),
      ),
    [conversations, filter],
  );

  const activePeerName = useMemo(
    () => conversations.find((c) => c.peer_id === activePeer)?.peer_name ?? 'Conversa',
    [conversations, activePeer],
  );

  useEffect(() => {
    if (activePeer) setParams({ peer: activePeer }, { replace: true });
  }, [activePeer, setParams]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = () => {
    if (!activePeer || !body.trim()) return;
    send.mutate(
      { recipient_id: activePeer, body: body.trim() },
      { onSuccess: () => setBody('') },
    );
  };

  return (
    <AppLayout title="Mensagens">
      <div className="container max-w-6xl py-6 space-y-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageCircle className="h-6 w-6" /> Mensagens
          </h1>
          <p className="text-sm text-muted-foreground">
            Conversas diretas entre alunos e professores.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[calc(100vh-240px)] min-h-[500px]">
          {/* Conversations sidebar */}
          <Card className="md:col-span-1 flex flex-col overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Conversas</CardTitle>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  className="pl-8 h-9"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-0 overflow-hidden">
              <ScrollArea className="h-full">
                {loadingConvs && <Skeleton className="h-16 m-3" />}
                {!loadingConvs && filtered.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8 px-3">
                    Nenhuma conversa ainda.
                  </p>
                )}
                {filtered.map((c) => (
                  <button
                    key={c.peer_id}
                    type="button"
                    onClick={() => setActivePeer(c.peer_id)}
                    className={`w-full text-left px-3 py-3 border-b hover:bg-muted/50 transition-colors ${
                      activePeer === c.peer_id ? 'bg-muted' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm truncate">{c.peer_name}</span>
                      {c.unread_count > 0 && (
                        <Badge variant="default" className="text-xs h-5 px-1.5">
                          {c.unread_count}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{c.last_body}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDistanceToNow(new Date(c.last_at), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </p>
                  </button>
                ))}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Active conversation */}
          <Card className="md:col-span-2 flex flex-col overflow-hidden">
            {!activePeer ? (
              <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                Selecione uma conversa
              </div>
            ) : (
              <>
                <CardHeader className="border-b py-3">
                  <CardTitle className="text-base">{activePeerName}</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 p-0 overflow-hidden">
                  <ScrollArea className="h-full" ref={scrollRef as any}>
                    <div className="p-4 space-y-3">
                      {loadingMsgs && <Skeleton className="h-16 w-2/3" />}
                      {messages.map((m) => {
                        const mine = m.sender_id === user?.id;
                        return (
                          <div
                            key={m.id}
                            className={`flex ${mine ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[70%] rounded-lg px-3 py-2 ${
                                mine
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted'
                              }`}
                            >
                              <p className="text-sm whitespace-pre-wrap">{m.body}</p>
                              <p className={`text-xs mt-1 ${mine ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                                {format(new Date(m.created_at), 'dd/MM HH:mm', { locale: ptBR })}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </CardContent>
                <div className="border-t p-3 flex gap-2">
                  <Textarea
                    placeholder="Escrever mensagem..."
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    rows={2}
                    className="resize-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                  />
                  <Button
                    disabled={!body.trim() || send.isPending}
                    onClick={handleSend}
                    size="icon"
                    className="h-auto"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </>
            )}
          </Card>
        </div>
      </div>
    </AppLayout>
  );
};

export default EduMensagens;