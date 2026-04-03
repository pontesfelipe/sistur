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
          <DialogTitle>🎮 Jogo salvo encontrado</DialogTitle>
          <DialogDescription>
            {savedAt && (
              <>Salvo {formatDistanceToNow(savedAt, { addSuffix: true, locale: ptBR })}.</>
            )}
            {' '}Deseja continuar de onde parou?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-row gap-2 sm:justify-end">
          <Button variant="outline" onClick={onNewGame}>Novo Jogo</Button>
          <Button onClick={onResume}>Continuar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
