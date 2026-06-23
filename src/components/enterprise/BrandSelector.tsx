import { useMemo, useState } from 'react';
import { Check, ChevronsUpDown, Plus, Building2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useEnterpriseBrands, BrandType } from '@/hooks/useEnterpriseBrands';

interface BrandSelectorProps {
  value: string | null;
  onChange: (brandId: string | null, brandName: string | null) => void;
  /** Texto auxiliar exibido abaixo do seletor. */
  helperText?: string;
  /** Mostra rótulo. Default true. */
  showLabel?: boolean;
}

const BRAND_TYPE_LABELS: Record<BrandType, string> = {
  independent: 'Independente',
  chain: 'Rede',
  franchise: 'Franquia',
  collection: 'Coleção',
};

/**
 * Seletor de Marca / Rede de Hotéis para o fluxo Empresarial.
 * Permite escolher uma marca existente ou criar uma nova em modal.
 */
export function BrandSelector({
  value,
  onChange,
  helperText,
  showLabel = true,
}: BrandSelectorProps) {
  const { brands, isLoading, createBrand } = useEnterpriseBrands();
  const [open, setOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [draftType, setDraftType] = useState<BrandType>('independent');
  const [draftWebsite, setDraftWebsite] = useState('');

  const selected = useMemo(
    () => brands.find((b) => b.id === value) ?? null,
    [brands, value],
  );

  const handleCreate = async () => {
    if (!draftName.trim()) return;
    const created = await createBrand.mutateAsync({
      name: draftName.trim(),
      brand_type: draftType,
      website: draftWebsite.trim() || null,
    });
    onChange(created.id, created.name);
    setDraftName('');
    setDraftWebsite('');
    setDraftType('independent');
    setDialogOpen(false);
  };

  return (
    <div className="space-y-2">
      {showLabel && (
        <Label className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-primary" />
          Marca / Rede de Hotéis
        </Label>
      )}
      <div className="flex gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="flex-1 justify-between font-normal"
              disabled={isLoading}
            >
              <span className="truncate text-left">
                {isLoading ? (
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Carregando marcas...
                  </span>
                ) : selected ? (
                  <span className="flex items-center gap-2">
                    <span>{selected.name}</span>
                    <span className="text-xs text-muted-foreground">
                      ({BRAND_TYPE_LABELS[selected.brand_type]})
                    </span>
                  </span>
                ) : (
                  <span className="text-muted-foreground">
                    Selecione uma marca existente ou crie uma nova
                  </span>
                )}
              </span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-[--radix-popover-trigger-width] p-0"
            align="start"
          >
            <Command>
              <CommandInput placeholder="Buscar marca..." />
              <CommandList>
                <CommandEmpty>
                  Nenhuma marca encontrada. Clique em <strong>Nova marca</strong>.
                </CommandEmpty>
                <CommandGroup>
                  {brands.map((b) => (
                    <CommandItem
                      key={b.id}
                      value={`${b.name} ${BRAND_TYPE_LABELS[b.brand_type]}`}
                      onSelect={() => {
                        onChange(b.id, b.name);
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4',
                          value === b.id ? 'opacity-100' : 'opacity-0',
                        )}
                      />
                      <span className="truncate">{b.name}</span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {BRAND_TYPE_LABELS[b.brand_type]}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        <Button
          type="button"
          variant="outline"
          onClick={() => setDialogOpen(true)}
          className="shrink-0"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nova marca
        </Button>
      </div>
      {helperText && (
        <p className="text-xs text-muted-foreground">{helperText}</p>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova marca / rede</DialogTitle>
            <DialogDescription>
              Uma marca agrupa unidades do mesmo empreendimento em municípios
              diferentes. Cada unidade mantém seu próprio diagnóstico, e a marca
              permite análises consolidadas da rede.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="brand-name">Nome da marca</Label>
              <Input
                id="brand-name"
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                placeholder="Ex.: Rede Atlântica, Accor, Hotel da Família"
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={draftType} onValueChange={(v) => setDraftType(v as BrandType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="independent">Independente (1 unidade)</SelectItem>
                  <SelectItem value="chain">Rede própria</SelectItem>
                  <SelectItem value="franchise">Franquia</SelectItem>
                  <SelectItem value="collection">Coleção / soft brand</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="brand-site">Site (opcional)</Label>
              <Input
                id="brand-site"
                value={draftWebsite}
                onChange={(e) => setDraftWebsite(e.target.value)}
                placeholder="https://..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={!draftName.trim() || createBrand.isPending}>
              {createBrand.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Criar marca
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}