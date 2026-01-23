import { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Send, 
  Loader2, 
  GraduationCap, 
  User, 
  Leaf, 
  Building2, 
  Cog,
  Sparkles,
  BookOpen,
  RefreshCw,
  Trash2,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Square
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

type Message = {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
};

interface BeniChatBotProps {
  context?: {
    destination?: string;
    pillarScores?: Record<string, number>;
    igmaFlags?: Record<string, boolean>;
  };
}

const SUGGESTED_QUESTIONS = [
  {
    icon: Leaf,
    text: "O que significa RA estar crítico?",
    color: "text-emerald-600"
  },
  {
    icon: Building2,
    text: "Como funciona a hierarquia RA → OE → AO?",
    color: "text-blue-600"
  },
  {
    icon: Cog,
    text: "O que são as 6 regras do IGMA?",
    color: "text-amber-600"
  },
  {
    icon: BookOpen,
    text: "Explique a teoria sistêmica do turismo",
    color: "text-purple-600"
  }
];

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/beni-chat`;

export function BeniChatBot({ context }: BeniChatBotProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Load messages from database on mount
  const loadMessages = useCallback(async () => {
    if (!user) {
      setIsLoadingHistory(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('beni_chat_messages')
        .select('id, role, content, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setMessages(data?.map(m => ({
        id: m.id,
        role: m.role as 'user' | 'assistant',
        content: m.content
      })) || []);
    } catch (error) {
      console.error('Error loading chat history:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [user]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    // Scroll to bottom when messages change
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  const saveMessage = async (role: 'user' | 'assistant', content: string): Promise<string | null> => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('beni_chat_messages')
        .insert({ user_id: user.id, role, content })
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
      const { error } = await supabase
        .from('beni_chat_messages')
        .delete()
        .eq('id', messageId);

      if (error) throw error;

      setMessages(prev => prev.filter(m => m.id !== messageId));
      toast.success('Mensagem deletada');
    } catch (error) {
      console.error('Error deleting message:', error);
      toast.error('Erro ao deletar mensagem');
    }
  };

  const streamChat = async (userMessage: string) => {
    const userMsg: Message = { role: 'user', content: userMessage };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);
    setInput('');

    // Save user message
    const userMsgId = await saveMessage('user', userMessage);
    if (userMsgId) {
      setMessages(prev => prev.map((m, idx) => 
        idx === prev.length - 1 ? { ...m, id: userMsgId } : m
      ));
    }

    // Create AbortController with timeout for mobile compatibility
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

    try {
      console.log('[BeniChat] Starting request to:', CHAT_URL);
      
      const response = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ 
          messages: [...messages, userMsg],
          context 
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      console.log('[BeniChat] Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Erro ${response.status}`);
      }

      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';
      let assistantContent = '';
      let lastActivityTime = Date.now();

      // Add initial assistant message
      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      // Read with activity timeout for iOS/Safari compatibility
      const readWithTimeout = async (): Promise<ReadableStreamReadResult<Uint8Array>> => {
        const activityTimeout = setTimeout(() => {
          console.log('[BeniChat] Activity timeout, closing reader');
          reader.cancel();
        }, 30000); // 30 second activity timeout
        
        try {
          const result = await reader.read();
          clearTimeout(activityTimeout);
          lastActivityTime = Date.now();
          return result;
        } catch (error) {
          clearTimeout(activityTimeout);
          throw error;
        }
      };

      let readAttempts = 0;
      const maxAttempts = 1000; // Prevent infinite loops

      while (readAttempts < maxAttempts) {
        readAttempts++;
        
        try {
          const { done, value } = await readWithTimeout();
          if (done) {
            console.log('[BeniChat] Stream complete');
            break;
          }

          textBuffer += decoder.decode(value, { stream: true });

          let newlineIndex: number;
          while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
            let line = textBuffer.slice(0, newlineIndex);
            textBuffer = textBuffer.slice(newlineIndex + 1);

            if (line.endsWith('\r')) line = line.slice(0, -1);
            if (line.startsWith(':') || line.trim() === '') continue;
            if (!line.startsWith('data: ')) continue;

            const jsonStr = line.slice(6).trim();
            if (jsonStr === '[DONE]') {
              console.log('[BeniChat] Received [DONE] marker');
              break;
            }

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
              // Incomplete JSON, put it back
              textBuffer = line + '\n' + textBuffer;
              break;
            }
          }
        } catch (readError) {
          console.error('[BeniChat] Read error:', readError);
          // If we have some content, don't throw - use what we have
          if (assistantContent.length > 0) {
            console.log('[BeniChat] Partial content received, using it');
            break;
          }
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

      // Save assistant message after complete
      if (assistantContent) {
        console.log('[BeniChat] Saving assistant message, length:', assistantContent.length);
        const assistantMsgId = await saveMessage('assistant', assistantContent);
        if (assistantMsgId) {
          setMessages(prev => prev.map((m, idx) => 
            idx === prev.length - 1 ? { ...m, id: assistantMsgId } : m
          ));
        }
        
        // Speak the response if voice is enabled
        if (voiceEnabled) {
          speakText(assistantContent);
        }
      } else {
        console.warn('[BeniChat] No content received from assistant');
        toast.error('Professor Beni não respondeu. Tente novamente.');
        // Remove the empty assistant message
        setMessages(prev => prev.filter(m => m.content !== ''));
      }

    } catch (error) {
      clearTimeout(timeoutId);
      console.error('[BeniChat] Error:', error);
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          toast.error('Tempo limite excedido. Tente uma pergunta mais curta.');
        } else {
          toast.error(error.message || 'Erro ao conectar com o Professor Beni');
        }
      } else {
        toast.error('Erro ao conectar com o Professor Beni');
      }
      
      // Remove the empty assistant message if there was an error
      setMessages(prev => prev.filter(m => m.content !== ''));
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    streamChat(input.trim());
  };

  const handleSuggestion = (text: string) => {
    if (isLoading) return;
    streamChat(text);
  };

  const handleClearChat = async () => {
    if (!user) {
      setMessages([]);
      setInput('');
      return;
    }

    try {
      const { error } = await supabase
        .from('beni_chat_messages')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;

      setMessages([]);
      setInput('');
      toast.success('Histórico limpo');
    } catch (error) {
      console.error('Error clearing chat:', error);
      toast.error('Erro ao limpar histórico');
    }
  };

  // Voice input using Web Speech API
  const toggleVoiceInput = useCallback(() => {
    // Check browser support - use window properties with type assertion
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognitionAPI) {
      toast.error('Seu navegador não suporta reconhecimento de voz');
      return;
    }

    if (isListening) {
      // Stop listening
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    // Start listening
    const recognition = new SpeechRecognitionAPI();
    recognition.lang = 'pt-BR';
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0].transcript)
        .join('');
      
      setInput(transcript);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'no-speech') {
        toast.error('Nenhuma fala detectada. Tente novamente.');
      } else if (event.error === 'not-allowed') {
        toast.error('Permissão de microfone negada');
      } else {
        toast.error('Erro no reconhecimento de voz');
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [isListening]);

  // Clean text for speech (remove markdown, asterisks, etc.)
  const cleanTextForSpeech = (text: string): string => {
    return text
      // Remove bold/italic markers
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/__([^_]+)__/g, '$1')
      .replace(/_([^_]+)_/g, '$1')
      // Remove headers
      .replace(/^#{1,6}\s+/gm, '')
      // Remove bullet points and lists
      .replace(/^[\s]*[-•*]\s+/gm, '')
      .replace(/^[\s]*\d+\.\s+/gm, '')
      // Remove code blocks
      .replace(/```[\s\S]*?```/g, '')
      .replace(/`([^`]+)`/g, '$1')
      // Remove links, keep text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      // Remove multiple newlines
      .replace(/\n{3,}/g, '\n\n')
      // Clean up extra spaces
      .replace(/\s+/g, ' ')
      .trim();
  };

  // Text-to-speech function using ElevenLabs API
  const speakText = useCallback(async (text: string) => {
    // Cancel any ongoing audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    // Clean the text for natural speech
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

      if (!response.ok) {
        throw new Error(`TTS request failed: ${response.status}`);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
        audioRef.current = null;
      };

      audio.onerror = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
        audioRef.current = null;
        toast.error('Erro ao reproduzir áudio');
      };

      await audio.play();
    } catch (error) {
      console.error('TTS error:', error);
      setIsSpeaking(false);
      toast.error('Erro ao gerar voz');
    } finally {
      setIsLoadingAudio(false);
    }
  }, []);

  // Stop speaking
  const stopSpeaking = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsSpeaking(false);
  }, []);

  // Toggle voice response mode
  const toggleVoiceResponse = useCallback(() => {
    const newState = !voiceEnabled;
    setVoiceEnabled(newState);
    toast.success(newState ? 'Respostas por voz ativadas' : 'Respostas por voz desativadas');
    
    if (!newState) {
      stopSpeaking();
    }
  }, [voiceEnabled, stopSpeaking]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  if (isLoadingHistory) {
    return (
      <Card className="h-[calc(100vh-12rem)] min-h-[400px] max-h-[700px] flex items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Carregando histórico...
        </div>
      </Card>
    );
  }

  return (
    <Card className="h-[calc(100vh-12rem)] min-h-[400px] max-h-[700px] flex flex-col">
      <CardHeader className="pb-3 border-b shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar className="h-12 w-12 bg-primary">
                <AvatarFallback className="bg-primary text-primary-foreground text-lg font-bold">
                  MB
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1 bg-emerald-500 rounded-full p-1">
                <Sparkles className="h-3 w-3 text-white" />
              </div>
            </div>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                Professor Mario Beni
                <Badge variant="outline" className="text-xs font-normal">IA</Badge>
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Especialista em Turismo Sustentável
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Voice response toggle */}
            <Button 
              variant={voiceEnabled ? "default" : "ghost"}
              size="sm"
              onClick={toggleVoiceResponse}
              className={cn(
                "text-muted-foreground",
                voiceEnabled && "text-primary-foreground"
              )}
              title={voiceEnabled ? "Desativar respostas por voz" : "Ativar respostas por voz"}
            >
              {voiceEnabled ? (
                <Volume2 className="h-4 w-4" />
              ) : (
                <VolumeX className="h-4 w-4" />
              )}
            </Button>
            
            {/* Stop speaking button */}
            {isSpeaking && (
              <Button 
                variant="destructive"
                size="sm"
                onClick={stopSpeaking}
                className="animate-pulse"
                title="Parar leitura"
              >
                <Square className="h-4 w-4" />
              </Button>
            )}
            
            {messages.length > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleClearChat}
                className="text-muted-foreground"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Nova conversa
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden p-0 flex flex-col">
        <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-8 px-4">
              <div className="bg-primary/10 rounded-full p-4 mb-4">
                <GraduationCap className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Bem-vindo ao SISTUR!</h3>
              <p className="text-sm text-muted-foreground text-center mb-6 max-w-sm">
                Sou o Professor Mario Beni. Posso ajudá-lo a entender a teoria sistêmica 
                do turismo e como ela se aplica ao seu território.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
                {SUGGESTED_QUESTIONS.map((q, idx) => (
                  <Button
                    key={idx}
                    variant="outline"
                    className="justify-start h-auto py-3 px-4 text-left whitespace-normal"
                    onClick={() => handleSuggestion(q.text)}
                  >
                    <q.icon className={`h-4 w-4 mr-2 shrink-0 ${q.color}`} />
                    <span className="text-sm leading-tight">{q.text}</span>
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message, idx) => (
                <div
                  key={message.id || idx}
                  className={`flex gap-3 group ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {message.role === 'assistant' && (
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                        MB
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div className="flex items-start gap-1 max-w-[85%]">
                    {message.role === 'user' && message.id && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => deleteMessage(message.id!)}
                      >
                        <Trash2 className="h-3 w-3 text-muted-foreground" />
                      </Button>
                    )}
                    <div
                      className={`rounded-2xl px-4 py-3 ${
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">
                        {message.content || (
                          <span className="flex items-center gap-2 text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Pensando...
                          </span>
                        )}
                      </p>
                    </div>
                    {message.role === 'assistant' && message.id && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => deleteMessage(message.id!)}
                      >
                        <Trash2 className="h-3 w-3 text-muted-foreground" />
                      </Button>
                    )}
                  </div>
                  {message.role === 'user' && (
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="p-4 border-t shrink-0">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isListening ? "Ouvindo..." : "Pergunte sobre turismo sustentável..."}
              disabled={isLoading}
              className="flex-1"
            />
            <Button 
              type="button" 
              variant={isListening ? "destructive" : "outline"}
              size="icon"
              onClick={toggleVoiceInput}
              disabled={isLoading}
              className={cn(
                "shrink-0 transition-all",
                isListening && "animate-pulse"
              )}
              title={isListening ? "Parar gravação" : "Falar"}
            >
              {isListening ? (
                <MicOff className="h-4 w-4" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </Button>
            <Button type="submit" disabled={isLoading || !input.trim()}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}