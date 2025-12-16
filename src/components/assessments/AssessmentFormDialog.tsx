import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { useDestinations } from '@/hooks/useDestinations';

const assessmentSchema = z.object({
  title: z.string().trim().min(3, 'Título deve ter pelo menos 3 caracteres').max(100, 'Título muito longo'),
  destination_id: z.string().min(1, 'Selecione um destino'),
  period_start: z.string().optional(),
  period_end: z.string().optional(),
  status: z.enum(['DRAFT', 'DATA_READY', 'CALCULATED']),
}).refine((data) => {
  if (data.period_start && data.period_end) {
    return new Date(data.period_start) <= new Date(data.period_end);
  }
  return true;
}, {
  message: 'Data inicial deve ser anterior à data final',
  path: ['period_end'],
});

type AssessmentFormValues = z.infer<typeof assessmentSchema>;

export interface Assessment {
  id: string;
  title: string;
  destination_id: string;
  period_start: string | null;
  period_end: string | null;
  status: 'DRAFT' | 'DATA_READY' | 'CALCULATED';
}

interface AssessmentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    title: string;
    destination_id: string;
    period_start?: string | null;
    period_end?: string | null;
    status: 'DRAFT' | 'DATA_READY' | 'CALCULATED';
  }) => Promise<void>;
  assessment?: Assessment | null;
}

export function AssessmentFormDialog({ open, onOpenChange, onSubmit, assessment }: AssessmentFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { destinations, isLoading: destinationsLoading } = useDestinations();
  const isEditing = !!assessment;

  const form = useForm<AssessmentFormValues>({
    resolver: zodResolver(assessmentSchema),
    defaultValues: {
      title: '',
      destination_id: '',
      period_start: '',
      period_end: '',
      status: 'DRAFT',
    },
  });

  useEffect(() => {
    if (open && assessment) {
      form.reset({
        title: assessment.title,
        destination_id: assessment.destination_id,
        period_start: assessment.period_start || '',
        period_end: assessment.period_end || '',
        status: assessment.status,
      });
    } else if (open && !assessment) {
      form.reset({
        title: '',
        destination_id: '',
        period_start: '',
        period_end: '',
        status: 'DRAFT',
      });
    }
  }, [open, assessment, form]);

  const handleSubmit = async (values: AssessmentFormValues) => {
    setIsSubmitting(true);
    try {
      await onSubmit({
        title: values.title,
        destination_id: values.destination_id,
        period_start: values.period_start || null,
        period_end: values.period_end || null,
        status: values.status,
      });
      form.reset();
      onOpenChange(false);
    } catch (error) {
      console.error('Error submitting assessment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Diagnóstico' : 'Novo Diagnóstico'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Atualize as informações do diagnóstico.' : 'Crie uma nova rodada de avaliação.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Diagnóstico 2024" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="destination_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Destino</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o destino" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {destinationsLoading ? (
                        <SelectItem value="" disabled>Carregando...</SelectItem>
                      ) : destinations && destinations.length > 0 ? (
                        destinations.map((dest) => (
                          <SelectItem key={dest.id} value={dest.id}>
                            {dest.name} {dest.uf ? `- ${dest.uf}` : ''}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="" disabled>Nenhum destino cadastrado</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="period_start"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data Início</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="period_end"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data Fim</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="DRAFT">Rascunho</SelectItem>
                      <SelectItem value="DATA_READY">Dados Prontos</SelectItem>
                      <SelectItem value="CALCULATED">Calculado</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting || (destinations?.length === 0)}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? 'Atualizar' : 'Criar'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
