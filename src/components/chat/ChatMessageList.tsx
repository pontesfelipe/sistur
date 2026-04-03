import { useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Loader2,
  GraduationCap,
  User,
  Trash2,
} from 'lucide-react';

type Message = {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
};

interface SuggestedQuestion {
  icon: React.ElementType;
  text: string;
  color: string;
}

interface ChatMessageListProps {
  messages: Message[];
  suggestedQuestions: SuggestedQuestion[];
  onSuggestion: (text: string) => void;
  onDeleteMessage: (messageId: string) => void;
  isLoading: boolean;
}

export function ChatMessageList({
  messages,
  suggestedQuestions,
  onSuggestion,
  onDeleteMessage,
  isLoading,
}: ChatMessageListProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  return (
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
            {suggestedQuestions.map((q, idx) => (
              <Button
                key={idx}
                variant="outline"
                className="justify-start h-auto py-3 px-4 text-left whitespace-normal"
                onClick={() => onSuggestion(q.text)}
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
                    onClick={() => onDeleteMessage(message.id!)}
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
                    onClick={() => onDeleteMessage(message.id!)}
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
  );
}
