import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const ADMIN_REASONS = [
  'Solicitação do usuário',
  'Violação de termos',
  'Inadimplência',
  'Reestruturação organizacional',
  'Outro',
] as const;

interface AdminCancelLicenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  licenseId: string;
  userName: string;
  planLabel: string;
  onCancelled: () => void;
}

export function AdminCancelLicenseDialog({
  open,
  onOpenChange,
  licenseId,
  userName,
  planLabel,
  onCancelled,
}: AdminCancelLicenseDialogProps) {
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
      const { error } = await supabase.rpc('admin_cancel_license', {
        p_license_id: licenseId,
        p_reason: fullReason,
      });
      if (error) throw error;
      toast.success(`Licença de ${userName} cancelada.`);
      onCancelled();
      onOpenChange(false);
    } catch (err: any) {
      toast.error('Erro ao cancelar: ' + (err?.message || 'Tente novamente'));
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
            <DialogTitle>Cancelar licença</DialogTitle>
          </div>
          <DialogDescription>
            Cancelar o plano <strong>{planLabel}</strong> de <strong>{userName}</strong>.
            O acesso será mantido até o fim do período vigente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label className="text-sm font-medium mb-2 block">
              Motivo <span className="text-destructive">*</span>
            </Label>
            <div className="flex flex-wrap gap-2">
              {ADMIN_REASONS.map(reason => (
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
            <Label htmlFor="admin-cancel-details" className="text-sm font-medium mb-1.5 block">
              {selectedReason === 'Outro' ? 'Descreva o motivo *' : 'Detalhes (opcional)'}
            </Label>
            <Textarea
              id="admin-cancel-details"
              value={details}
              onChange={e => setDetails(e.target.value)}
              placeholder="Observações internas..."
              className="resize-none"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={processing}>
            Voltar
          </Button>
          <Button variant="destructive" onClick={handleCancel} disabled={!canSubmit || processing}>
            {processing ? 'Cancelando...' : 'Confirmar cancelamento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
