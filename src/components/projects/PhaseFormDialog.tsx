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
  useCreatePhase,
  useUpdatePhase,
  ProjectPhase,
  PhaseStatus,
} from '@/hooks/useProjects';
import { Loader2 } from 'lucide-react';

interface PhaseFormDialogProps {
  projectId: string;
  phase?: ProjectPhase | null;
  phasesCount: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PHASE_STATUS_OPTIONS: { value: PhaseStatus; label: string }[] = [
  { value: 'pending', label: 'Pendente' },
  { value: 'in_progress', label: 'Em Progresso' },
  { value: 'completed', label: 'Concluído' },
  { value: 'blocked', label: 'Bloqueado' },
];

export function PhaseFormDialog({
  projectId,
  phase,
  phasesCount,
  open,
  onOpenChange,
}: PhaseFormDialogProps) {
  const createPhase = useCreatePhase();
  const updatePhase = useUpdatePhase();
  const isEditing = !!phase;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<PhaseStatus>('pending');
  const [phaseOrder, setPhaseOrder] = useState(1);
  const [phaseType, setPhaseType] = useState('custom');
  const [plannedStartDate, setPlannedStartDate] = useState('');
  const [plannedEndDate, setPlannedEndDate] = useState('');

  useEffect(() => {
    if (phase) {
      setName(phase.name);
      setDescription(phase.description || '');
      setStatus(phase.status);
      setPhaseOrder(phase.phase_order);
      setPhaseType(phase.phase_type);
      setPlannedStartDate(phase.planned_start_date?.split('T')[0] || '');
      setPlannedEndDate(phase.planned_end_date?.split('T')[0] || '');
    } else {
      setName('');
      setDescription('');
      setStatus('pending');
      setPhaseOrder(phasesCount + 1);
      setPhaseType('custom');
      setPlannedStartDate('');
      setPlannedEndDate('');
    }
  }, [phase, phasesCount, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isEditing && phase) {
      await updatePhase.mutateAsync({
        id: phase.id,
        updates: {
          name,
          description: description || null,
          status,
          phase_order: phaseOrder,
          phase_type: phaseType,
          planned_start_date: plannedStartDate || null,
          planned_end_date: plannedEndDate || null,
        },
      });
    } else {
      await createPhase.mutateAsync({
        project_id: projectId,
        name,
        description: description || null,
        status,
        phase_order: phaseOrder,
        phase_type: phaseType,
        planned_start_date: plannedStartDate || null,
        planned_end_date: plannedEndDate || null,
        actual_start_date: null,
        actual_end_date: null,
        deliverables: [],
      });
    }

    onOpenChange(false);
  };

  const isPending = createPhase.isPending || updatePhase.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Fase' : 'Nova Fase'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Atualize as informações da fase' : 'Adicione uma nova fase ao projeto'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="phase-name">Nome da Fase *</Label>
            <Input
              id="phase-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Planejamento, Execução..."
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phase-description">Descrição</Label>
            <Textarea
              id="phase-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrição da fase"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as PhaseStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PHASE_STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phase-order">Ordem</Label>
              <Input
                id="phase-order"
                type="number"
                min={1}
                value={phaseOrder}
                onChange={(e) => setPhaseOrder(parseInt(e.target.value) || 1)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phase-start">Data de Início</Label>
              <Input
                id="phase-start"
                type="date"
                value={plannedStartDate}
                onChange={(e) => setPlannedStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phase-end">Data de Término</Label>
              <Input
                id="phase-end"
                type="date"
                value={plannedEndDate}
                onChange={(e) => setPlannedEndDate(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending || !name}>
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEditing ? 'Salvar Alterações' : 'Criar Fase'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
