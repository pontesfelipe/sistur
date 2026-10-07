import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { X, Send, Loader2, ThumbsUp, ThumbsDown, LifeBuoy, RotateCcw, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { FeedbackDialog } from '@/components/feedback/FeedbackDialog';
import { cn } from '@/lib/utils';
import avatar from '@/assets/support-bot-avatar.png';
import { tx } from '@/i18n/t';
import { getRouteSuggestions } from './supportSuggestions';

type Msg = {
  role: 'user' | 'assistant';
  content: string;
  question?: string;
  action?: { label: string; route: string } | null;
  redirectBeni?: boolean;
  rated?: boolean;
};

export function SupportWidget() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs, loading]);

  const suggestions = getRouteSuggestions(location.pathname);

  const ask = async (text: string) => {
    const q = text.trim();
    if (!q || loading) return;
    setInput('');
    const history = msgs.map(m => ({ role: m.role, content: m.content }));
    setMsgs(m => [...m, { role: 'user', content: q }]);
    setLoading(true);
    const { data, error } = await supabase.functions.invoke('support-chat', {
      body: { message: q, route: location.pathname, conversation_id: conversationId, history },
    });
    setLoading(false);
    if (error || data?.error) {
      setMsgs(m => [...m, { role: 'assistant', content: data?.error || tx('Não consegui responder agora. Tente novamente em instantes.') }]);
      return;
    }
    setConversationId(data.conversation_id);
    setMsgs(m => [...m, { role: 'assistant', content: data.answer, question: q, action: data.action, redirectBeni: data.redirect_beni }]);
  };

  const rate = async (i: number, helpful: boolean) => {
    const m = msgs[i];
    setMsgs(all => all.map((x, j) => (j === i ? { ...x, rated: true } : x)));
    await supabase.functions.invoke('support-chat', {
      body: { action: 'feedback', conversation_id: conversationId, question: m.question, answer: m.content, helpful, route: location.pathname },
    });
  };

  const reset = () => { setMsgs([]); setConversationId(null); };

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label={tx('Abrir suporte')}
          title={tx('Ajuda & Suporte')}
          className="fixed z-50 bottom-20 right-4 md:bottom-6 md:right-6 h-16 w-16 rounded-full bg-card border-2 border-primary shadow-lg hover:scale-105 transition-transform overflow-hidden"
        >
          <img src={avatar} alt="" width={64} height={64} className="h-full w-full object-contain p-1" />
        </button>
      )}

      {open && (
        <div
          role="dialog"
          aria-label={tx('Suporte SISTUR')}
          className="fixed z-50 bottom-20 right-2 left-2 md:left-auto md:bottom-6 md:right-6 md:w-[380px] h-[70vh] md:h-[560px] flex flex-col rounded-xl border bg-card shadow-2xl"
        >
          <div className="flex items-center gap-3 p-3 border-b bg-primary text-primary-foreground rounded-t-xl">
            <img src={avatar} alt="" width={40} height={40} className="h-10 w-10 rounded-full bg-card object-contain" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold leading-tight">{tx('Guia — Suporte SISTUR')}</p>
              <p className="text-xs opacity-80 truncate">{tx('Tela atual')}: {location.pathname}</p>
            </div>
            <Button size="icon" variant="ghost" className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/10" onClick={reset} aria-label={tx('Nova conversa')}>
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/10" onClick={() => setOpen(false)} aria-label={tx('Fechar')}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3 text-sm">
            {msgs.length === 0 && (
              <div className="space-y-3">
                <div className="rounded-lg bg-muted p-3">
                  {tx('Olá! Eu sou o Guia, a bússola do SISTUR. Te ajudo a encontrar telas, fazer cadastros e entender os recursos da plataforma. Para dúvidas sobre turismo e metodologia, fale com o Professor Beni.')}
                </div>
                <p className="text-xs text-muted-foreground">{tx('Sugestões para esta tela')}:</p>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map(s => (
                    <button key={s} onClick={() => ask(s)} className="text-xs rounded-full border px-3 py-1 hover:bg-accent text-left">
                      {tx(s)}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {msgs.map((m, i) => (
              <div key={i} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                <div className={cn('max-w-[85%] rounded-lg p-3 whitespace-pre-wrap', m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
                  {m.content}
                  {m.role === 'assistant' && (m.action || m.redirectBeni) && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {m.action && (
                        <Button size="sm" variant="secondary" onClick={() => navigate(m.action!.route)}>{m.action.label}</Button>
                      )}
                      {m.redirectBeni && (
                        <Button size="sm" variant="secondary" onClick={() => navigate('/professor-beni')}>
                          <Bot className="h-3 w-3 mr-1" />{tx('Falar com o Professor Beni')}
                        </Button>
                      )}
                    </div>
                  )}
                  {m.role === 'assistant' && m.question && !m.rated && (
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      {tx('Resolveu?')}
                      <button onClick={() => rate(i, true)} aria-label={tx('Sim')}><ThumbsUp className="h-3.5 w-3.5" /></button>
                      <button onClick={() => rate(i, false)} aria-label={tx('Não')}><ThumbsDown className="h-3.5 w-3.5" /></button>
                    </div>
                  )}
                  {m.rated && <p className="mt-2 text-xs text-muted-foreground">{tx('Obrigado! Isso me ajuda a aprender.')}</p>}
                </div>
              </div>
            ))}
            {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            <div ref={endRef} />
          </div>

          <div className="border-t p-2 space-y-2">
            <FeedbackDialog
              trigger={
                <button
                  className="w-full text-xs text-muted-foreground hover:text-foreground flex items-center justify-center gap-1"
                  onClick={() => conversationId && supabase.functions.invoke('support-chat', { body: { action: 'escalate', conversation_id: conversationId } })}
                >
                  <LifeBuoy className="h-3 w-3" />{tx('Não resolveu? Abrir chamado com a equipe')}
                </button>
              }
            />
            <form onSubmit={e => { e.preventDefault(); ask(input); }} className="flex gap-2">
              <Input value={input} onChange={e => setInput(e.target.value)} placeholder={tx('Digite sua dúvida sobre a plataforma...')} maxLength={1500} />
              <Button type="submit" size="icon" disabled={loading || !input.trim()} aria-label={tx('Enviar')}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
