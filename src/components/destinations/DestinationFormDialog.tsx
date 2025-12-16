import { useState } from 'react';
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

const UF_OPTIONS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

const destinationSchema = z.object({
  name: z.string().trim().min(2, 'Nome deve ter pelo menos 2 caracteres').max(100, 'Nome muito longo'),
  uf: z.string().length(2, 'Selecione um estado'),
  ibge_code: z.string().regex(/^\d{7}$/, 'Código IBGE deve ter 7 dígitos').optional().or(z.literal('')),
  latitude: z.string().optional().transform((val) => val ? parseFloat(val) : null).refine((val) => val === null || (val >= -90 && val <= 90), 'Latitude inválida'),
  longitude: z.string().optional().transform((val) => val ? parseFloat(val) : null).refine((val) => val === null || (val >= -180 && val <= 180), 'Longitude inválida'),
});

type DestinationFormValues = z.input<typeof destinationSchema>;

interface DestinationFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { name: string; uf: string; ibge_code?: string | null; latitude?: number | null; longitude?: number | null }) => Promise<void>;
}

export function DestinationFormDialog({ open, onOpenChange, onSubmit }: DestinationFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<DestinationFormValues>({
    resolver: zodResolver(destinationSchema),
    defaultValues: {
      name: '',
      uf: '',
      ibge_code: '',
      latitude: '',
      longitude: '',
    },
  });

  const handleSubmit = async (values: DestinationFormValues) => {
    setIsSubmitting(true);
    try {
      const parsed = destinationSchema.parse(values);
      await onSubmit({
        name: parsed.name,
        uf: parsed.uf,
        ibge_code: parsed.ibge_code || null,
        latitude: parsed.latitude,
        longitude: parsed.longitude,
      });
      form.reset();
      onOpenChange(false);
    } catch (error) {
      console.error('Error submitting destination:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Novo Destino</DialogTitle>
          <DialogDescription>
            Cadastre um novo destino turístico para análise.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Destino</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Bonito" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="uf"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estado (UF)</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o estado" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {UF_OPTIONS.map((uf) => (
                        <SelectItem key={uf} value={uf}>
                          {uf}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="ibge_code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Código IBGE (opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: 5002704" maxLength={7} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="latitude"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Latitude (opcional)</FormLabel>
                    <FormControl>
                      <Input type="number" step="any" placeholder="-21.1261" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="longitude"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Longitude (opcional)</FormLabel>
                    <FormControl>
                      <Input type="number" step="any" placeholder="-56.4836" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
