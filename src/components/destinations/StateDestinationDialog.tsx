import { useState } from 'react';
import { tx } from '@/i18n/t';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Landmark, Loader2 } from 'lucide-react';
import { useDestinations } from '@/hooks/useDestinations';
import { BR_STATES } from '@/lib/brStates';

/** Cria um "destino" na escala estadual (UF inteira) para o diagnóstico estadual. */
export function StateDestinationDialog() {
  const { createDestination } = useDestinations();
  const [open, setOpen] = useState(false);
  const [uf, setUf] = useState('');
  const state = BR_STATES.find((s) => s.uf === uf);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Landmark className="h-4 w-4" /> {tx('Novo Estado')}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{tx('Diagnóstico estadual')}</DialogTitle>
          <DialogDescription>
            {tx('Avalia o estado como um todo, com indicadores próprios de escala estadual (malha aérea, governança, regionalização).')}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label>{tx('Estado')}</Label>
          <Select value={uf} onValueChange={setUf}>
            <SelectTrigger><SelectValue placeholder={tx('Selecione o estado')} /></SelectTrigger>
            <SelectContent>
              {BR_STATES.map((s) => (
                <SelectItem key={s.uf} value={s.uf}>{s.name} ({s.uf})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>{tx('Cancelar')}</Button>
          <Button
            disabled={!state || createDestination.isPending}
            onClick={async () => {
              if (!state) return;
              await createDestination.mutateAsync({
                name: `Estado ${state.prep} ${state.name}`,
                uf: state.uf,
                ibge_code: state.ibge,
                territory_scale: 'state',
              });
              setOpen(false);
              setUf('');
            }}
          >
            {createDestination.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {tx('Criar')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
