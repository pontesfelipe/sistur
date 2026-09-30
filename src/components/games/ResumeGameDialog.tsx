import { getDateLocale } from '@/i18n/dateLocale';
import { tx } from '@/i18n/t';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ResumeGameDialogProps {
  open: boolean;
  savedAt: Date | null;
  onResume: () => void;
  onNewGame: () => void;
}

export function ResumeGameDialog({ open, savedAt, onResume, onNewGame }: ResumeGameDialogProps) {
  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={e => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{tx('🎮 Jogo salvo encontrado')}</DialogTitle>
          <DialogDescription>
            {savedAt && (
              <>Salvo {formatDistanceToNow(savedAt, { addSuffix: true, locale: getDateLocale() })}.</>
            )}
            {' '}Deseja continuar de onde parou?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-row gap-2 sm:justify-end">
          <Button variant="outline" onClick={onNewGame}>{tx('Novo Jogo')}</Button>
          <Button onClick={onResume}>{tx('Continuar')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
