import { useState, useEffect, useCallback } from 'react';
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
import { Loader2, Search, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

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

interface IBGEResult {
  ibge_code: string;
  name: string;
  uf: string;
  uf_name: string;
}

export interface Destination {
  id: string;
  name: string;
  uf: string | null;
  ibge_code: string | null;
  latitude: number | null;
  longitude: number | null;
}

interface DestinationFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { name: string; uf: string; ibge_code?: string | null; latitude?: number | null; longitude?: number | null }) => Promise<void>;
  destination?: Destination | null;
}

export function DestinationFormDialog({ open, onOpenChange, onSubmit, destination }: DestinationFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [ibgeResults, setIbgeResults] = useState<IBGEResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [selectedIBGE, setSelectedIBGE] = useState<IBGEResult | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const isEditing = !!destination;

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

  const watchedName = form.watch('name');
  const watchedUf = form.watch('uf');

  useEffect(() => {
    if (open && destination) {
      form.reset({
        name: destination.name,
        uf: destination.uf || '',
        ibge_code: destination.ibge_code || '',
        latitude: destination.latitude?.toString() || '',
        longitude: destination.longitude?.toString() || '',
      });
      setSelectedIBGE(null);
      setSearchError(null);
    } else if (open && !destination) {
      form.reset({
        name: '',
        uf: '',
        ibge_code: '',
        latitude: '',
        longitude: '',
      });
      setSelectedIBGE(null);
      setSearchError(null);
    }
  }, [open, destination, form]);

  const searchIBGE = useCallback(async (name: string, uf: string) => {
    if (name.length < 2) {
      setIbgeResults([]);
      setShowResults(false);
      setSearchError(null);
      return;
    }

    setIsSearching(true);
    setSearchError(null);

    try {
      const { data, error } = await supabase.functions.invoke('search-ibge', {
        body: { name, uf: uf || undefined },
      });

      if (error) {
        console.error('Error searching IBGE:', error);
        setSearchError('Erro ao buscar município');
        setIbgeResults([]);
      } else if (data.results) {
        setIbgeResults(data.results);
        setShowResults(true);
        if (data.results.length === 0) {
          setSearchError('Município não encontrado no IBGE');
        }
      }
    } catch (err) {
      console.error('Error:', err);
      setSearchError('Erro ao conectar com serviço IBGE');
      setIbgeResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    if (watchedName && watchedName.length >= 2 && !selectedIBGE) {
      const timeout = setTimeout(() => {
        searchIBGE(watchedName, watchedUf);
      }, 500);
      setSearchTimeout(timeout);
    } else {
      setIbgeResults([]);
      setShowResults(false);
      if (!selectedIBGE) {
        setSearchError(null);
      }
    }

    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [watchedName, watchedUf, selectedIBGE, searchIBGE]);

  const handleSelectIBGE = async (result: IBGEResult) => {
    form.setValue('name', result.name, { shouldValidate: true });
    form.setValue('uf', result.uf, { shouldValidate: true });
    form.setValue('ibge_code', result.ibge_code, { shouldValidate: true });
    setSelectedIBGE(result);
    setShowResults(false);
    setSearchError(null);
    setIbgeResults([]);

    // Fetch coordinates for the selected municipality
    setIsSearching(true);
    try {
      const { data } = await supabase.functions.invoke('search-ibge', {
        body: { name: result.name, uf: result.uf, fetchCoords: true },
      });

      if (data?.results?.[0]) {
        const coordResult = data.results[0];
        if (coordResult.latitude && coordResult.longitude) {
          form.setValue('latitude', coordResult.latitude.toFixed(6), { shouldValidate: true });
          form.setValue('longitude', coordResult.longitude.toFixed(6), { shouldValidate: true });
        }
      }
    } catch (err) {
      console.error('Error fetching coordinates:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleNameChange = (value: string) => {
    form.setValue('name', value, { shouldValidate: true });
    if (selectedIBGE && value !== selectedIBGE.name) {
      setSelectedIBGE(null);
      form.setValue('ibge_code', '', { shouldValidate: true });
    }
  };

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
      setSelectedIBGE(null);
      setSearchError(null);
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
          <DialogTitle>{isEditing ? 'Editar Destino' : 'Novo Destino'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Atualize as informações do destino turístico.' : 'Digite o nome do município para buscar automaticamente no IBGE.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="relative">
                  <FormLabel>Nome do Destino</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input 
                        placeholder="Ex: Bonito" 
                        {...field}
                        onChange={(e) => handleNameChange(e.target.value)}
                        className={cn(
                          selectedIBGE && 'pr-10 border-green-500',
                          searchError && !selectedIBGE && 'border-amber-500'
                        )}
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {isSearching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                        {!isSearching && selectedIBGE && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                        {!isSearching && searchError && !selectedIBGE && <AlertCircle className="h-4 w-4 text-amber-500" />}
                      </div>
                    </div>
                  </FormControl>
                  
                  {/* IBGE Results Dropdown */}
                  {showResults && ibgeResults.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-auto">
                      {ibgeResults.map((result) => (
                        <button
                          key={result.ibge_code}
                          type="button"
                          className="w-full px-3 py-2 text-left hover:bg-muted flex items-center justify-between text-sm"
                          onClick={() => handleSelectIBGE(result)}
                        >
                          <span className="font-medium">{result.name}</span>
                          <span className="text-muted-foreground text-xs">{result.uf}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  
                  {/* Status Messages */}
                  {selectedIBGE && (
                    <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Município encontrado no IBGE (código: {selectedIBGE.ibge_code})
                    </p>
                  )}
                  {searchError && !selectedIBGE && (
                    <p className="text-xs text-amber-600 flex items-center gap-1 mt-1">
                      <AlertCircle className="h-3 w-3" />
                      {searchError}
                    </p>
                  )}
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
                  <Select 
                    onValueChange={(value) => {
                      field.onChange(value);
                      if (selectedIBGE) {
                        setSelectedIBGE(null);
                        form.setValue('ibge_code', '', { shouldValidate: true });
                      }
                    }} 
                    value={field.value}
                  >
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
                  <FormLabel>Código IBGE</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Preenchido automaticamente" 
                      maxLength={7} 
                      {...field} 
                      readOnly={!!selectedIBGE}
                      className={cn(selectedIBGE && 'bg-muted')}
                    />
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
                {isEditing ? 'Atualizar' : 'Salvar'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
