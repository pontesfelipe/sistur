import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { MapPin, Plus, Trash2, Check, ChevronsUpDown, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DraftUnit {
  destination_id: string;
  destination_name: string;
  destination_uf: string | null;
  unit_name: string;
  is_primary: boolean;
}

interface AssessmentUnitsManagerProps {
  destinations: any[];
  value: DraftUnit[];
  onChange: (units: DraftUnit[]) => void;
  /** Sugestão de prefixo do nome da unidade (ex.: nome da marca). */
  unitNamePrefix?: string | null;
}

/**
 * Gerencia a lista de unidades de um diagnóstico empresarial multi-unidade,
 * em **modo rascunho** (antes do assessment existir no banco). Após a
 * criação do assessment, as unidades são persistidas via `useAssessmentUnits`.
 */
export function AssessmentUnitsManager({
  destinations,
  value,
  onChange,
  unitNamePrefix,
}: AssessmentUnitsManagerProps) {
  const [popoverOpen, setPopoverOpen] = useState(false);

  const usedIds = useMemo(() => new Set(value.map((u) => u.destination_id)), [value]);
  const available = useMemo(
    () => destinations.filter((d) => !usedIds.has(d.id)),
    [destinations, usedIds],
  );

  const addDestination = (id: string) => {
    const dest = destinations.find((d) => d.id === id);
    if (!dest) return;
    const unit: DraftUnit = {
      destination_id: dest.id,
      destination_name: dest.name,
      destination_uf: dest.uf ?? null,
      unit_name: unitNamePrefix ? `${unitNamePrefix} ${dest.name}` : dest.name,
      is_primary: value.length === 0, // primeira vira principal
    };
    onChange([...value, unit]);
    setPopoverOpen(false);
  };

  const updateUnit = (idx: number, patch: Partial<DraftUnit>) => {
    const next = value.map((u, i) => (i === idx ? { ...u, ...patch } : u));
    // Garante exatamente uma primária
    if (patch.is_primary) {
      for (let i = 0; i < next.length; i++) if (i !== idx) next[i] = { ...next[i], is_primary: false };
    }
    onChange(next);
  };

  const removeUnit = (idx: number) => {
    const next = value.filter((_, i) => i !== idx);
    // Se removeu a principal e ainda há outras, promove a primeira
    if (value[idx].is_primary && next.length > 0) {
      next[0] = { ...next[0], is_primary: true };
    }
    onChange(next);
  };

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" />
          Unidades do diagnóstico
        </CardTitle>
        <CardDescription>
          Adicione um município por unidade do empreendimento. O diagnóstico
          será <strong>único</strong>, mas a coleta e a análise serão feitas
          por unidade — refletindo as diferenças de contexto de cada localidade.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="justify-between flex-1 font-normal">
                <span className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Adicionar unidade (município)
                </span>
                <ChevronsUpDown className="h-4 w-4 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
              <Command>
                <CommandInput placeholder="Buscar município..." />
                <CommandList>
                  <CommandEmpty>
                    {available.length === 0
                      ? 'Todos os destinos disponíveis já foram adicionados.'
                      : 'Nenhum município encontrado.'}
                  </CommandEmpty>
                  <CommandGroup>
                    {available.map((d) => (
                      <CommandItem
                        key={d.id}
                        value={`${d.name} ${d.uf ?? ''}`}
                        onSelect={() => addDestination(d.id)}
                      >
                        <Check className="mr-2 h-4 w-4 opacity-0" />
                        <span className="truncate">
                          {d.name}
                          {d.uf ? ` - ${d.uf}` : ''}
                        </span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          <Badge variant="secondary">{value.length} unidade{value.length === 1 ? '' : 's'}</Badge>
        </div>

        {value.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-6">
            Nenhuma unidade adicionada ainda. Clique em <strong>Adicionar unidade</strong> para começar.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Município</TableHead>
                <TableHead>Nome da unidade</TableHead>
                <TableHead className="text-center w-24">Principal</TableHead>
                <TableHead className="text-right w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {value.map((u, idx) => (
                <TableRow key={u.destination_id}>
                  <TableCell className="font-medium text-sm">
                    {u.destination_name}
                    {u.destination_uf && (
                      <span className="ml-1 text-xs text-muted-foreground">/{u.destination_uf}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Input
                      value={u.unit_name}
                      onChange={(e) => updateUnit(idx, { unit_name: e.target.value })}
                      placeholder={`Ex.: ${unitNamePrefix ?? 'Hotel'} ${u.destination_name}`}
                      className="h-8 text-sm"
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <button
                      type="button"
                      onClick={() => updateUnit(idx, { is_primary: true })}
                      aria-label="Marcar como principal"
                      className={cn(
                        'inline-flex items-center justify-center w-7 h-7 rounded-full transition-colors',
                        u.is_primary ? 'bg-amber-100 text-amber-600' : 'text-muted-foreground hover:bg-muted',
                      )}
                    >
                      <Star className={cn('h-4 w-4', u.is_primary && 'fill-current')} />
                    </button>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => removeUnit(idx)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}