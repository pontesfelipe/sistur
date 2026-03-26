import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const CANCELLATION_REASONS = [
  'Custo elevado',
  'Não utilizo as funcionalidades',
  'Encontrei outra solução',
  'Dificuldade de uso',
  'Suporte insatisfatório',
  'Motivos pessoais',
  'Outro',
] as const;

interface CancelSubscriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planLabel: string;
  expiresAt: string | null;
  isTrial: boolean;
  onCancelled: () => void;
}

export function CancelSubscriptionDialog({
  open,
  onOpenChange,
  planLabel,
  expiresAt,
  isTrial,
  onCancelled,
}: CancelSubscriptionDialogProps) {
  const [selectedReason, setSelectedReason] = useState('');
  const [details, setDetails] = useState('');
  const [processing, setProcessing] = useState(false);

  const fullReason = selectedReason === 'Outro'
    ? `Outro: ${details}`.trim()
    : details
      ? `${selectedReason} — ${details}`
      : selectedReason;

  const canSubmit = selectedReason && (selectedReason !== 'Outro' || details.trim().length > 0);

  const handleCancel = async () => {
    if (!canSubmit) return;
    setProcessing(true);
    try {
      const { error } = await supabase.rpc('cancel_my_license', { p_reason: fullReason });
      if (error) throw error;
      toast.success(
        isTrial
          ? 'Trial cancelado com sucesso.'
          : `Plano cancelado. Acesso mantido até ${expiresAt ? new Date(expiresAt).toLocaleDateString('pt-BR') : 'o fim do período'}.`,
      );
      onCancelled();
      onOpenChange(false);
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.includes('no_active_license')) {
        toast.error('Nenhuma licença ativa encontrada.');
      } else {
        toast.error('Erro ao cancelar: ' + msg);
      }
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <DialogTitle>Cancelar plano</DialogTitle>
          </div>
          <DialogDescription>
            {isTrial
              ? 'Ao cancelar o trial, você perderá o acesso imediatamente.'
              : `Ao cancelar o plano ${planLabel}, você manterá acesso até o fim do período contratado.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label className="text-sm font-medium mb-2 block">
              Motivo do cancelamento <span className="text-destructive">*</span>
            </Label>
            <div className="flex flex-wrap gap-2">
              {CANCELLATION_REASONS.map(reason => (
                <button
                  key={reason}
                  type="button"
                  onClick={() => setSelectedReason(reason)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    selectedReason === reason
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-muted/50 text-muted-foreground border-border hover:border-primary/50'
                  }`}
                >
                  {reason}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="cancel-details" className="text-sm font-medium mb-1.5 block">
              {selectedReason === 'Outro' ? 'Descreva o motivo *' : 'Detalhes adicionais (opcional)'}
            </Label>
            <Textarea
              id="cancel-details"
              value={details}
              onChange={e => setDetails(e.target.value)}
              placeholder="Conte-nos mais sobre sua decisão..."
              className="resize-none"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={processing}>
            Voltar
          </Button>
          <Button
            variant="destructive"
            onClick={handleCancel}
            disabled={!canSubmit || processing}
          >
            {processing ? 'Cancelando...' : 'Confirmar cancelamento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
