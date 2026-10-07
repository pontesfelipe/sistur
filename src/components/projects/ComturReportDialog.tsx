import { useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import { tx } from '@/i18n/t';
import type { ComturMeta } from '@/lib/comturReport';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  defaultPeriod: { start: string; end: string };
  onGenerate: (meta: ComturMeta) => Promise<void>;
}

export function ComturReportDialog({ open, onOpenChange, defaultPeriod, onGenerate }: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const [meta, setMeta] = useState<ComturMeta>({
    meetingNumber: '', meetingDate: today, periodStart: defaultPeriod.start || today, periodEnd: defaultPeriod.end || today,
    organName: 'Secretaria Municipal de Turismo', responsibleName: '', responsibleRole: '', purpose: 'apreciacao',
  });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof ComturMeta) => (e: React.ChangeEvent<HTMLInputElement>) => setMeta({ ...meta, [k]: e.target.value });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{tx('Prestação de contas ao COMTUR')}</DialogTitle>
          <DialogDescription>{tx('Documento oficial em Word (padrão ABNT) para levar à reunião do Conselho.')}</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><Label>{tx('Órgão responsável')}</Label><Input value={meta.organName} onChange={set('organName')} /></div>
          <div><Label>{tx('Reunião (nº)')}</Label><Input placeholder="ex.: 5ª Ordinária" value={meta.meetingNumber} onChange={set('meetingNumber')} /></div>
          <div><Label>{tx('Data da reunião')}</Label><Input type="date" value={meta.meetingDate} onChange={set('meetingDate')} /></div>
          <div><Label>{tx('Período de')}</Label><Input type="date" value={meta.periodStart} onChange={set('periodStart')} /></div>
          <div><Label>{tx('até')}</Label><Input type="date" value={meta.periodEnd} onChange={set('periodEnd')} /></div>
          <div><Label>{tx('Responsável técnico')}</Label><Input value={meta.responsibleName} onChange={set('responsibleName')} /></div>
          <div><Label>{tx('Cargo')}</Label><Input value={meta.responsibleRole} onChange={set('responsibleRole')} /></div>
          <div className="col-span-2">
            <Label>{tx('Finalidade')}</Label>
            <RadioGroup className="flex gap-4 mt-1" value={meta.purpose} onValueChange={(v) => setMeta({ ...meta, purpose: v as ComturMeta['purpose'] })}>
              <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="apreciacao" />{tx('Apreciação')}</label>
              <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="aprovacao" />{tx('Aprovação')}</label>
            </RadioGroup>
          </div>
        </div>
        <DialogFooter>
          <Button disabled={busy} onClick={async () => {
            setBusy(true);
            try { await onGenerate(meta); onOpenChange(false); }
            catch (e: any) { toast.error(e?.message || tx('Erro ao gerar o documento')); }
            finally { setBusy(false); }
          }}>{busy ? tx('Gerando...') : tx('Gerar documento')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
