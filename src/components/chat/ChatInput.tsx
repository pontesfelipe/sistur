import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Send,
  Loader2,
  Mic,
  MicOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatInputProps {
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: (e?: React.FormEvent) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onToggleVoiceInput: () => void;
  isLoading: boolean;
  isListening: boolean;
  inputRef: React.RefObject<HTMLInputElement>;
}

export function ChatInput({
  input,
  onInputChange,
  onSubmit,
  onKeyDown,
  onToggleVoiceInput,
  isLoading,
  isListening,
  inputRef,
}: ChatInputProps) {
  return (
    <div className="p-4 border-t shrink-0">
      <form onSubmit={onSubmit} className="flex gap-2 items-end">
        <Textarea
          ref={inputRef as any}
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={isListening ? "Ouvindo..." : "Pergunte sobre turismo sustentável... (Shift+Enter para enviar)"}
          disabled={isLoading}
          className="flex-1 min-h-[40px] max-h-[120px] resize-none"
          rows={1}
        />
        <Button
          type="button"
          variant={isListening ? "destructive" : "outline"}
          size="icon"
          onClick={onToggleVoiceInput}
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
  );
}
