import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageSquarePlus, Lightbulb, Bug, Loader2 } from 'lucide-react';
import { useUserFeedback } from '@/hooks/useUserFeedback';

import { tx } from "@/i18n/t";
interface FeedbackDialogProps {
  trigger?: React.ReactNode;
}

const featureCategories = [
  { value: 'nova_funcionalidade', label: tx('Nova funcionalidade') },
  { value: 'melhoria_ux', label: tx('Melhoria de usabilidade (UX)') },
  { value: 'integracao', label: tx('Integração com outros sistemas') },
  { value: 'relatorios', label: tx('Novos relatórios/dashboards') },
  { value: 'performance', label: tx('Melhorias de performance') },
  { value: 'documentacao', label: tx('Documentação/Tutoriais') },
  { value: 'mobile', label: tx('Versão mobile/responsividade') },
  { value: 'outro_sugestao', label: tx('Outro') },
];

const bugCategories = [
  { value: 'erro_visual', label: tx('Erro visual/layout quebrado') },
  { value: 'erro_dados', label: tx('Dados incorretos/não aparecem') },
  { value: 'erro_login', label: tx('Problema de login/autenticação') },
  { value: 'erro_carregamento', label: tx('Página não carrega/lenta') },
  { value: 'erro_funcionalidade', label: tx('Funcionalidade não funciona') },
  { value: 'erro_calculo', label: tx('Erro de cálculo/processamento') },
  { value: 'erro_exportacao', label: tx('Erro ao exportar/gerar relatório') },
  { value: 'outro_bug', label: tx('Outro') },
];

export function FeedbackDialog({ trigger }: FeedbackDialogProps) {
  const [open, setOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState<'feature' | 'bug'>('feature');
  const [category, setCategory] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  const { submitFeedback } = useUserFeedback();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !description.trim() || !category) return;

    setSubmitting(true);
    const success = await submitFeedback(feedbackType, title, description, category);
    setSubmitting(false);

    if (success) {
      setTitle('');
      setDescription('');
      setCategory('');
      setFeedbackType('feature');
      setOpen(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setCategory('');
    setFeedbackType('feature');
  };

  const handleTypeChange = (type: 'feature' | 'bug') => {
    setFeedbackType(type);
    setCategory(''); // Reset category when type changes
  };

  const categories = feedbackType === 'feature' ? featureCategories : bugCategories;

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
            {tx("Enviar Feedback")}
          </DialogTitle>
          <DialogDescription>
            {tx("Sua opinião é importante para melhorar o SISTUR")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            <Label>{tx("Tipo de feedback")}</Label>
            <RadioGroup 
              value={feedbackType} 
              onValueChange={(v) => handleTypeChange(v as 'feature' | 'bug')}
              className="grid grid-cols-2 gap-4"
            >
              <div className="relative">
                <RadioGroupItem value="feature" id="feature" className="peer sr-only" />
                <Label
                  htmlFor="feature"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer transition-colors"
                >
                  <Lightbulb className="h-6 w-6 mb-2 text-yellow-500" />
                  <span className="text-sm font-medium">{tx("Sugestão")}</span>
                  <span className="text-xs text-muted-foreground">{tx("Nova feature")}</span>
                </Label>
              </div>
              <div className="relative">
                <RadioGroupItem value="bug" id="bug" className="peer sr-only" />
                <Label
                  htmlFor="bug"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer transition-colors"
                >
                  <Bug className="h-6 w-6 mb-2 text-red-500" />
                  <span className="text-sm font-medium">{tx("Bug")}</span>
                  <span className="text-xs text-muted-foreground">{tx("Reportar erro")}</span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">{tx("Categoria")}</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder={tx("Selecione uma categoria")} />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">
              {feedbackType === 'feature' ? tx('Título da sugestão') : tx('Título do bug')}
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={feedbackType === 'feature' 
                ? tx('Ex: Adicionar exportação para Excel') 
                : tx('Ex: Erro ao salvar diagnóstico')
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{tx("Descrição detalhada")}</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={feedbackType === 'feature'
                ? tx('Descreva a funcionalidade que gostaria de ver no sistema...')
                : tx('Descreva o que aconteceu, os passos para reproduzir o erro e o que era esperado...')
              }
              rows={4}
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {tx("Cancelar")}
            </Button>
            <Button type="submit" disabled={submitting || !title.trim() || !description.trim() || !category}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {tx("Enviando...")}
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
