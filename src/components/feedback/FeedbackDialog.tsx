import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { MessageSquarePlus, Lightbulb, Bug, Loader2 } from 'lucide-react';
import { useUserFeedback } from '@/hooks/useUserFeedback';

interface FeedbackDialogProps {
  trigger?: React.ReactNode;
}

export function FeedbackDialog({ trigger }: FeedbackDialogProps) {
  const [open, setOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState<'feature' | 'bug'>('feature');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  const { submitFeedback } = useUserFeedback();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !description.trim()) return;

    setSubmitting(true);
    const success = await submitFeedback(feedbackType, title, description);
    setSubmitting(false);

    if (success) {
      setTitle('');
      setDescription('');
      setFeedbackType('feature');
      setOpen(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setFeedbackType('feature');
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) resetForm();
    }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <MessageSquarePlus className="h-5 w-5" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquarePlus className="h-5 w-5 text-primary" />
            Enviar Feedback
          </DialogTitle>
          <DialogDescription>
            Sua opinião é importante para melhorar o SISTUR
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            <Label>Tipo de feedback</Label>
            <RadioGroup 
              value={feedbackType} 
              onValueChange={(v) => setFeedbackType(v as 'feature' | 'bug')}
              className="grid grid-cols-2 gap-4"
            >
              <div className="relative">
                <RadioGroupItem value="feature" id="feature" className="peer sr-only" />
                <Label
                  htmlFor="feature"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer transition-colors"
                >
                  <Lightbulb className="h-6 w-6 mb-2 text-yellow-500" />
                  <span className="text-sm font-medium">Sugestão</span>
                  <span className="text-xs text-muted-foreground">Nova feature</span>
                </Label>
              </div>
              <div className="relative">
                <RadioGroupItem value="bug" id="bug" className="peer sr-only" />
                <Label
                  htmlFor="bug"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer transition-colors"
                >
                  <Bug className="h-6 w-6 mb-2 text-red-500" />
                  <span className="text-sm font-medium">Bug</span>
                  <span className="text-xs text-muted-foreground">Reportar erro</span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">
              {feedbackType === 'feature' ? 'Título da sugestão' : 'Título do bug'}
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={feedbackType === 'feature' 
                ? 'Ex: Adicionar exportação para Excel' 
                : 'Ex: Erro ao salvar diagnóstico'
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição detalhada</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={feedbackType === 'feature'
                ? 'Descreva a funcionalidade que gostaria de ver no sistema...'
                : 'Descreva o que aconteceu, os passos para reproduzir o erro e o que era esperado...'
              }
              rows={4}
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting || !title.trim() || !description.trim()}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                'Enviar Feedback'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
