import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Loader2, Mic, MicOff, Paperclip, X, FileText } from 'lucide-react';
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
  pendingFile?: File | null;
  onFileSelected?: (file: File | null) => void;
  accept?: string;
}

export function ChatInput({
  input, onInputChange, onSubmit, onKeyDown, onToggleVoiceInput,
  isLoading, isListening, inputRef, pendingFile, onFileSelected, accept,
}: ChatInputProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  // Auto-grow: 3 a ~10 linhas
  useEffect(() => {
    const el = inputRef.current as unknown as HTMLTextAreaElement | null;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 260)}px`;
  }, [input, inputRef]);

  return (
    <div className="p-3 border-t shrink-0">
      <form onSubmit={onSubmit} className="rounded-xl border bg-background focus-within:ring-2 focus-within:ring-ring">
        {pendingFile && (
          <div className="px-3 pt-3">
            <span className="inline-flex items-center gap-2 rounded-md bg-muted px-2 py-1 text-xs">
              <FileText className="h-3 w-3" />
              <span className="max-w-[220px] truncate">{pendingFile.name}</span>
              <button type="button" onClick={() => onFileSelected?.(null)} aria-label="Remover anexo">
                <X className="h-3 w-3" />
              </button>
            </span>
          </div>
        )}
        <Textarea
          ref={inputRef as any}
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={isListening ? 'Ouvindo...' : 'Pergunte ao Professor Beni... (Enter envia, Shift+Enter quebra linha)'}
          disabled={isLoading}
          className="min-h-[84px] max-h-[260px] resize-none border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
          rows={3}
        />
        <div className="flex items-center justify-between gap-2 px-2 pb-2">
          <div className="flex items-center gap-1">
            {onFileSelected && (
              <>
                <input
                  ref={fileRef}
                  type="file"
                  accept={accept}
                  className="hidden"
                  onChange={(e) => { onFileSelected(e.target.files?.[0] ?? null); e.target.value = ''; }}
                />
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8" disabled={isLoading}
                  onClick={() => fileRef.current?.click()} title="Anexar arquivo (até 10 MB)">
                  <Paperclip className="h-4 w-4" />
                </Button>
              </>
            )}
            <Button
              type="button"
              variant={isListening ? 'destructive' : 'ghost'}
              size="icon"
              onClick={onToggleVoiceInput}
              disabled={isLoading}
              className={cn('h-8 w-8', isListening && 'animate-pulse')}
              title={isListening ? 'Parar gravação' : 'Falar'}
            >
              {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
          </div>
          <Button type="submit" size="icon" className="h-8 w-8" disabled={isLoading || (!input.trim() && !pendingFile)} title="Enviar">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </form>
    </div>
  );
}
