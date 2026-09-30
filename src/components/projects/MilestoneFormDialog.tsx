import { tx } from '@/i18n/t';
import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useCreateMilestone,
  useUpdateMilestone,
  ProjectMilestone,
} from '@/hooks/useProjects';
import { Loader2 } from 'lucide-react';

interface MilestoneFormDialogProps {
  projectId: string;
  milestone?: ProjectMilestone | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type MilestoneStatus = 'pending' | 'completed' | 'missed';

const STATUS_OPTIONS: { value: MilestoneStatus; label: string }[] = [
  { value: 'pending', label: 'Pendente' },
  { value: 'completed', label: 'Concluído' },
  { value: 'missed', label: 'Atrasado' },
];

export function MilestoneFormDialog({
  projectId,
  milestone,
  open,
  onOpenChange,
}: MilestoneFormDialogProps) {
  const createMilestone = useCreateMilestone();
  const updateMilestone = useUpdateMilestone();
  const isEditing = !!milestone;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [status, setStatus] = useState<MilestoneStatus>('pending');
  const [completedDate, setCompletedDate] = useState('');

  useEffect(() => {
    if (milestone) {
      setName(milestone.name);
      setDescription(milestone.description || '');
      setTargetDate(milestone.target_date?.split('T')[0] || '');
      setStatus(milestone.status);
      setCompletedDate(milestone.completed_date?.split('T')[0] || '');
    } else {
      setName('');
      setDescription('');
      setTargetDate('');
      setStatus('pending');
      setCompletedDate('');
    }
  }, [milestone, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const milestoneData = {
      name,
      description: description || null,
      target_date: targetDate,
      status,
      completed_date: status === 'completed' ? (completedDate || new Date().toISOString().split('T')[0]) : null,
    };

    if (isEditing && milestone) {
      await updateMilestone.mutateAsync({
        id: milestone.id,
        updates: milestoneData,
      });
    } else {
      await createMilestone.mutateAsync({
        project_id: projectId,
        ...milestoneData,
      });
    }

    onOpenChange(false);
  };

  const isPending = createMilestone.isPending || updateMilestone.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? tx('Editar Marco') : tx('Novo Marco')}</DialogTitle>
          <DialogDescription>
            {isEditing ? tx('Atualize as informações do marco') : tx('Adicione um novo marco ao projeto')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="milestone-name">{tx('Nome do Marco *')}</Label>
            <Input
              id="milestone-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={tx('Ex: Entrega da primeira versão')}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="milestone-description">{tx('Descrição')}</Label>
            <Textarea
              id="milestone-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={tx('Descrição do marco')}
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="milestone-target">{tx('Data Prevista *')}</Label>
              <Input
                id="milestone-target"
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>{tx('Status')}</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as MilestoneStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {tx(opt.label)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {status === 'completed' && (
            <div className="space-y-2">
              <Label htmlFor="milestone-completed">{tx('Data de Conclusão')}</Label>
              <Input
                id="milestone-completed"
                type="date"
                value={completedDate}
                onChange={(e) => setCompletedDate(e.target.value)}
              />
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {tx('Cancelar')}
            </Button>
            <Button type="submit" disabled={isPending || !name || !targetDate}>
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEditing ? tx('Salvar Alterações') : tx('Criar Marco')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
