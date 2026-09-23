import { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Loader2, 
  Sparkles,
  Leaf, 
  Building2, 
  Cog,
  BookOpen,
  RefreshCw,
  Volume2,
  VolumeX,
  Square
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useBeniQuota } from '@/hooks/useBeniQuota';
import { Link } from 'react-router-dom';
import { ChatMessageList } from './ChatMessageList';
import { ChatInput } from './ChatInput';
import { BeniContextSelector, type BeniContext } from './BeniContextSelector';

type Message = {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  attachmentName?: string;
};

interface BeniChatBotProps {
  initialContext?: BeniContext;
  conversationId?: string;
  onConversationCreated?: (id: string) => void;
  onNewConversation?: () => void;
  onActivity?: () => void;
  headerExtra?: React.ReactNode;
}

const MAX_FILE = 10 * 1024 * 1024;
const ACCEPTED = '.pdf,.docx,.xlsx,.xls,.csv,.txt,.md,image/png,image/jpeg,image/webp';

const SUGGESTED_QUESTIONS = [
  { icon: Leaf, text: "O que significa RA estar crítico?", color: "text-emerald-600" },
  { icon: Building2, text: "Como funciona a hierarquia RA → OE → AO?", color: "text-blue-600" },
  { icon: Cog, text: "O que são as 6 regras do IGMA?", color: "text-amber-600" },
  { icon: BookOpen, text: "Explique a teoria sistêmica do turismo", color: "text-purple-600" },
];

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/beni-chat`;

export function BeniChatBot({ initialContext, conversationId, onConversationCreated, onNewConversation, onActivity, headerExtra }: BeniChatBotProps) {
  const convIdRef = useRef<string | undefined>(conversationId);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const { user } = useAuth();
  const beniQuota = useBeniQuota();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [beniContext, setBeniContext] = useState<BeniContext>(initialContext || {});
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Load messages from database on mount
  const loadMessages = useCallback(async () => {
    if (!user || !conversationId) { setMessages([]); setIsLoadingHistory(false); return; }
    try {
      const { data, error } = await supabase
        .from('beni_chat_messages')
        .select('id, role, content, created_at, beni_attachments(file_name)')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      setMessages(data?.map((m: any) => ({ id: m.id, role: m.role as 'user' | 'assistant', content: m.content, attachmentName: m.beni_attachments?.file_name })) || []);
    } catch (error) {
      console.error('Error loading chat history:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [user, conversationId]);

  useEffect(() => { loadMessages(); }, [loadMessages]);

  const ensureConversation = async (firstText: string): Promise<string | undefined> => {
    if (convIdRef.current || !user) return convIdRef.current;
    const title = firstText.replace(/\s+/g, ' ').trim().slice(0, 60) || 'Nova conversa';
    const { data, error } = await supabase.from('beni_conversations').insert({ user_id: user.id, title }).select('id').single();
    if (error) { console.error(error); toast.error('Não foi possível criar a conversa'); return undefined; }
    convIdRef.current = data.id;
    return data.id;
  };

  const saveMessage = async (role: 'user' | 'assistant', content: string, attachmentId?: string): Promise<string | null> => {
    if (!user || !convIdRef.current) return null;
    try {
      supabase.from('beni_conversations').update({ updated_at: new Date().toISOString() }).eq('id', convIdRef.current).then(() => {});
      const { data, error } = await supabase
        .from('beni_chat_messages')
        .insert({ user_id: user.id, role, content, conversation_id: convIdRef.current, attachment_id: attachmentId ?? null })
        .select('id')
        .single();
      if (error) throw error;
      return data.id;
    } catch (error) {
      console.error('Error saving message:', error);
      return null;
    }
  };

  const deleteMessage = async (messageId: string) => {
    if (!user || !messageId) return;
    try {
      const { error } = await supabase.from('beni_chat_messages').delete().eq('id', messageId);
      if (error) throw error;
      setMessages(prev => prev.filter(m => m.id !== messageId));
      toast.success('Mensagem deletada');
    } catch (error) {
      console.error('Error deleting message:', error);
      toast.error('Erro ao deletar mensagem');
    }
  };

  // Clean text for speech (remove markdown)
  const cleanTextForSpeech = (text: string): string => {
    return text
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/__([^_]+)__/g, '$1')
      .replace(/_([^_]+)_/g, '$1')
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/^[\s]*[-•*]\s+/gm, '')
      .replace(/^[\s]*\d+\.\s+/gm, '')
      .replace(/```[\s\S]*?```/g, '')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/\s+/g, ' ')
      .trim();
  };

  // Text-to-speech
  const speakText = useCallback(async (text: string) => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    const cleanText = cleanTextForSpeech(text);
    if (!cleanText.trim()) return;
    setIsLoadingAudio(true);
    setIsSpeaking(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ text: cleanText }),
        }
      );
      if (!response.ok) throw new Error(`TTS request failed: ${response.status}`);
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audio.onended = () => { setIsSpeaking(false); URL.revokeObjectURL(audioUrl); audioRef.current = null; };
      audio.onerror = () => { setIsSpeaking(false); URL.revokeObjectURL(audioUrl); audioRef.current = null; toast.error('Erro ao reproduzir áudio'); };
      await audio.play();
    } catch (error) {
      console.error('TTS error:', error);
      setIsSpeaking(false);
      toast.error('Erro ao gerar voz');
    } finally {
      setIsLoadingAudio(false);
    }
  }, []);

  const stopSpeaking = useCallback(() => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    setIsSpeaking(false);
  }, []);

  const toggleVoiceResponse = useCallback(() => {
    const newState = !voiceEnabled;
    setVoiceEnabled(newState);
    toast.success(newState ? 'Respostas por voz ativadas' : 'Respostas por voz desativadas');
    if (!newState) stopSpeaking();
  }, [voiceEnabled, stopSpeaking]);

  const uploadAttachment = async (file: File, convId: string): Promise<string | null> => {
    if (!user) return null;
    const safe = file.name.replace(/[^\w.\-]+/g, '_');
    const path = `${user.id}/${crypto.randomUUID()}-${safe}`;
    const { error: upErr } = await supabase.storage.from('beni-attachments').upload(path, file, { contentType: file.type || undefined });
    if (upErr) { toast.error('Falha ao enviar o anexo'); return null; }
    const { data, error } = await supabase.from('beni_attachments').insert({
      user_id: user.id, conversation_id: convId, file_name: file.name, file_path: path, mime: file.type || null, size: file.size,
    }).select('id').single();
    if (error) { toast.error('Falha ao registrar o anexo'); return null; }
    return data.id;
  };

  const handleFileSelected = (file: File | null) => {
    if (file && file.size > MAX_FILE) { toast.error('Arquivo acima de 10 MB'); return; }
    setPendingFile(file);
  };

  const streamChat = async (rawMessage: string) => {
    const file = pendingFile;
    const userMessage = rawMessage || (file ? 'Poderia avaliar este documento?' : '');
    const userMsg: Message = { role: 'user', content: userMessage, attachmentName: file?.name };
    const isNew = !convIdRef.current;
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);
    setInput('');
    setPendingFile(null);

    const convId = await ensureConversation(userMessage);
    if (!convId) { setIsLoading(false); setMessages(prev => prev.slice(0, -1)); return; }
    let attachmentId: string | null = null;
    if (file) {
      attachmentId = await uploadAttachment(file, convId);
      if (!attachmentId) { setIsLoading(false); setMessages(prev => prev.slice(0, -1)); return; }
    }

    const userMsgId = await saveMessage('user', userMessage, attachmentId ?? undefined);
    if (userMsgId) {
      setMessages(prev => prev.map((m, idx) => idx === prev.length - 1 ? { ...m, id: userMsgId } : m));
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), file ? 150000 : 90000);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Sessão expirada. Faça login novamente para conversar com o Professor Beni.');
      }
      const response = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content })), context: beniContext, conversationId: convId, attachmentId }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 402 && errorData.code === 'beni_quota_exceeded') {
          beniQuota.refresh();
          toast.error(errorData.error || 'Limite de perguntas ao Professor Beni atingido.', {
            action: { label: 'Ver planos', onClick: () => { window.location.href = '/assinatura'; } },
            duration: 8000,
          });
          setMessages(prev => prev.filter(m => m.content !== ''));
          setIsLoading(false);
          return;
        }
        throw new Error(errorData.error || `Erro ${response.status}`);
      }
      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';
      let assistantContent = '';

      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      const readWithTimeout = async (): Promise<ReadableStreamReadResult<Uint8Array>> => {
        const activityTimeout = setTimeout(() => { reader.cancel(); }, 30000);
        try {
          const result = await reader.read();
          clearTimeout(activityTimeout);
          return result;
        } catch (error) {
          clearTimeout(activityTimeout);
          throw error;
        }
      };

      let readAttempts = 0;
      while (readAttempts < 1000) {
        readAttempts++;
        try {
          const { done, value } = await readWithTimeout();
          if (done) break;
          textBuffer += decoder.decode(value, { stream: true });

          let newlineIndex: number;
          while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
            let line = textBuffer.slice(0, newlineIndex);
            textBuffer = textBuffer.slice(newlineIndex + 1);
            if (line.endsWith('\r')) line = line.slice(0, -1);
            if (line.startsWith(':') || line.trim() === '') continue;
            if (!line.startsWith('data: ')) continue;
            const jsonStr = line.slice(6).trim();
            if (jsonStr === '[DONE]') break;
            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                assistantContent += content;
                setMessages(prev => {
                  const updated = [...prev];
                  updated[updated.length - 1] = { role: 'assistant', content: assistantContent };
                  return updated;
                });
              }
            } catch {
              textBuffer = line + '\n' + textBuffer;
              break;
            }
          }
        } catch (readError) {
          if (assistantContent.length > 0) break;
          throw readError;
        }
      }

      // Final flush
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split('\n')) {
          if (!raw) continue;
          if (raw.endsWith('\r')) raw = raw.slice(0, -1);
          if (raw.startsWith(':') || raw.trim() === '') continue;
          if (!raw.startsWith('data: ')) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: 'assistant', content: assistantContent };
                return updated;
              });
            }
          } catch { /* ignore */ }
        }
      }

      if (assistantContent) {
        beniQuota.refresh();
        const assistantMsgId = await saveMessage('assistant', assistantContent);
        if (assistantMsgId) {
          setMessages(prev => prev.map((m, idx) => idx === prev.length - 1 ? { ...m, id: assistantMsgId } : m));
        }
        if (voiceEnabled) speakText(assistantContent);
        onActivity?.();
        if (isNew) onConversationCreated?.(convId);
      } else {
        toast.error('Professor Beni não respondeu. Tente novamente.');
        setMessages(prev => prev.filter(m => m.content !== ''));
      }
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error) {
        if (error.name === 'AbortError') toast.error('Tempo limite excedido. Tente uma pergunta mais curta.');
        else toast.error(error.message || 'Erro ao conectar com o Professor Beni');
      } else toast.error('Erro ao conectar com o Professor Beni');
      setMessages(prev => prev.filter(m => m.content !== ''));
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((!input.trim() && !pendingFile) || isLoading) return;
    streamChat(input.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); handleSubmit(); }
  };

  const handleSuggestion = (text: string) => {
    if (isLoading) return;
    streamChat(text);
  };

  const handleClearChat = () => {
    if (onNewConversation) { onNewConversation(); return; }
    convIdRef.current = undefined;
    setMessages([]); setInput('');
  };

  // Voice input using Web Speech API
  const toggleVoiceInput = useCallback(() => {
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) { toast.error('Seu navegador não suporta reconhecimento de voz'); return; }
    if (isListening) { recognitionRef.current?.stop(); setIsListening(false); return; }

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = 'pt-BR';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results).map((result: any) => result[0].transcript).join('');
      setInput(transcript);
    };
    recognition.onerror = (event: any) => {
      if (event.error === 'no-speech') toast.error('Nenhuma fala detectada. Tente novamente.');
      else if (event.error === 'not-allowed') toast.error('Permissão de microfone negada');
      else toast.error('Erro no reconhecimento de voz');
      setIsListening(false);
    };
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
    recognition.start();
  }, [isListening]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    };
  }, []);

  if (isLoadingHistory) {
    return (
      <Card className="h-[calc(100vh-10rem)] min-h-[480px] flex items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Carregando histórico...
        </div>
      </Card>
    );
  }

  return (
    <Card className="h-[calc(100vh-10rem)] min-h-[480px] flex flex-col">
      <CardHeader className="pb-3 border-b shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar className="h-12 w-12 bg-primary">
                <AvatarFallback className="bg-primary text-primary-foreground text-lg font-bold">MB</AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1 bg-emerald-500 rounded-full p-1">
                <Sparkles className="h-3 w-3 text-white" />
              </div>
            </div>
            <div>
              <CardTitle className="text-lg flex items-center gap-2 flex-wrap">
                Professor Mario Beni
                <Badge variant="outline" className="text-xs font-normal">IA</Badge>
                {!beniQuota.isLoading && !beniQuota.unlimited && beniQuota.balance?.authenticated && (
                  <Badge
                    variant={beniQuota.exhausted ? 'destructive' : 'secondary'}
                    className="text-xs font-normal"
                    title={
                      beniQuota.isTrial
                        ? 'Perguntas gratuitas do período de teste'
                        : 'Perguntas restantes neste mês' +
                          (beniQuota.totalCredits > 0 ? ` + ${beniQuota.totalCredits} créditos extras` : '')
                    }
                  >
                    {beniQuota.isTrial
                      ? `Teste: ${beniQuota.remaining}/10 perguntas`
                      : `Beni: ${beniQuota.remaining}/${beniQuota.allowance} este mês`}
                    {beniQuota.totalCredits > 0 && ` (+${beniQuota.totalCredits})`}
                  </Badge>
                )}
                {beniQuota.exhausted && (
                  <Link to="/assinatura" className="text-xs text-primary underline underline-offset-2">
                    Ver planos
                  </Link>
                )}
              </CardTitle>
              <p className="text-sm text-muted-foreground">Especialista em Turismo Sustentável</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant={voiceEnabled ? "default" : "ghost"}
              size="sm"
              onClick={toggleVoiceResponse}
              className={cn("text-muted-foreground", voiceEnabled && "text-primary-foreground")}
              title={voiceEnabled ? "Desativar respostas por voz" : "Ativar respostas por voz"}
            >
              {voiceEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </Button>
            {isSpeaking && (
              <Button variant="destructive" size="sm" onClick={stopSpeaking} className="animate-pulse" title="Parar leitura">
                <Square className="h-4 w-4" />
              </Button>
            )}
            {headerExtra}
            {messages.length > 0 && (
              <Button variant="ghost" size="sm" onClick={handleClearChat} className="text-muted-foreground">
                <RefreshCw className="h-4 w-4 mr-1" />
                Nova conversa
              </Button>
            )}
          </div>
        </div>
        <div className="mt-2">
          <BeniContextSelector context={beniContext} onContextChange={setBeniContext} />
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden p-0 flex flex-col">
        <ChatMessageList
          messages={messages}
          suggestedQuestions={SUGGESTED_QUESTIONS}
          onSuggestion={handleSuggestion}
          onDeleteMessage={deleteMessage}
          isLoading={isLoading}
        />
        {!beniQuota.isLoading && !beniQuota.unlimited && beniQuota.balance?.authenticated && (
          <div className="px-3 pt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground border-t">
            <span>
              {beniQuota.exhausted
                ? 'Você usou todas as perguntas disponíveis.'
                : beniQuota.isTrial
                  ? `Restam ${beniQuota.remaining} de 10 perguntas gratuitas do teste.`
                  : `Restam ${beniQuota.remaining} de ${beniQuota.allowance} perguntas este mês` +
                    (beniQuota.totalCredits > 0 ? `, além de ${beniQuota.totalCredits} créditos extras.` : '.')}
            </span>
            {(beniQuota.exhausted || beniQuota.remaining <= 5) && (
              <Link to="/assinatura" className="text-primary underline underline-offset-2 shrink-0">
                {beniQuota.isTrial ? 'Ver planos' : 'Comprar créditos'}
              </Link>
            )}
          </div>
        )}
        <ChatInput
          input={input}
          onInputChange={setInput}
          onSubmit={handleSubmit}
          onKeyDown={handleKeyDown}
          onToggleVoiceInput={toggleVoiceInput}
          isLoading={isLoading}
          isListening={isListening}
          inputRef={inputRef}
          pendingFile={pendingFile}
          onFileSelected={handleFileSelected}
          accept={ACCEPTED}
        />
      </CardContent>
    </Card>
  );
}
