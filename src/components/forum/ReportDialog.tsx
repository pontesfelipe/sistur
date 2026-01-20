import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useForum } from '@/hooks/useForum';
import { Loader2, Flag } from 'lucide-react';

const REPORT_REASONS = [
  { value: 'spam', label: 'Spam ou propaganda' },
  { value: 'offensive', label: 'Conteúdo ofensivo ou inadequado' },
  { value: 'misinformation', label: 'Informação falsa ou enganosa' },
  { value: 'harassment', label: 'Assédio ou bullying' },
  { value: 'copyright', label: 'Violação de direitos autorais' },
  { value: 'other', label: 'Outro motivo' },
];

interface ReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId: string;
  replyId?: string;
  targetType: 'post' | 'reply';
}

export function ReportDialog({
  open,
  onOpenChange,
  postId,
  replyId,
  targetType,
}: ReportDialogProps) {
  const { reportPost } = useForum();
  const [reason, setReason] = useState('');
  const [comment, setComment] = useState('');

  const handleSubmit = async () => {
    if (!reason) return;

    await reportPost.mutateAsync({
      post_id: postId,
      reply_id: replyId,
      reason,
      comment: comment || undefined,
    });

    setReason('');
    setComment('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5 text-destructive" />
            Denunciar {targetType === 'post' ? 'Post' : 'Resposta'}
          </DialogTitle>
          <DialogDescription>
            Informe o motivo da denúncia. Nossa equipe irá analisar e tomar as medidas necessárias.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Motivo da denúncia *</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um motivo" />
              </SelectTrigger>
              <SelectContent>
                {REPORT_REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="comment">Comentário adicional (opcional)</Label>
            <Textarea
              id="comment"
              placeholder="Forneça mais detalhes sobre a denúncia..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!reason || reportPost.isPending}
            variant="destructive"
          >
            {reportPost.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Flag className="h-4 w-4 mr-2" />
            )}
            Enviar Denúncia
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
