import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Building2, Plus, MapPin, Pencil, Trash2, Loader2 } from 'lucide-react';
import { useEnterpriseBrands, useBrandUnits, BrandType, EnterpriseBrand } from '@/hooks/useEnterpriseBrands';

const BRAND_TYPE_LABELS: Record<BrandType, string> = {
  independent: 'Independente',
  chain: 'Rede',
  franchise: 'Franquia',
  collection: 'Coleção',
};

export function BrandManagementPanel() {
  const { brands, isLoading, createBrand, updateBrand, deleteBrand } = useEnterpriseBrands();
  const { data: allUnits } = useBrandUnits(undefined as any); // all units in org
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<EnterpriseBrand | null>(null);
  const [form, setForm] = useState({
    name: '',
    brand_type: 'independent' as BrandType,
    website: '',
    headquarters_uf: '',
    notes: '',
  });

  const unitsByBrand = useMemo(() => {
    const map = new Map<string, number>();
    (allUnits ?? []).forEach((u) => {
      if (!u.brand_id) return;
      map.set(u.brand_id, (map.get(u.brand_id) ?? 0) + 1);
    });
    return map;
  }, [allUnits]);

  const resetForm = () => {
    setForm({ name: '', brand_type: 'independent', website: '', headquarters_uf: '', notes: '' });
    setEditing(null);
  };

  const handleOpenNew = () => {
    resetForm();
    setOpen(true);
  };

  const handleEdit = (b: EnterpriseBrand) => {
    setEditing(b);
    setForm({
      name: b.name,
      brand_type: b.brand_type,
      website: b.website ?? '',
      headquarters_uf: b.headquarters_uf ?? '',
      notes: b.notes ?? '',
    });
    setOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) return;
    if (editing) {
      await updateBrand.mutateAsync({
        id: editing.id,
        name: form.name.trim(),
        brand_type: form.brand_type,
        website: form.website.trim() || null,
        headquarters_uf: form.headquarters_uf.trim() || null,
        notes: form.notes.trim() || null,
      });
    } else {
      await createBrand.mutateAsync({
        name: form.name.trim(),
        brand_type: form.brand_type,
        website: form.website.trim() || null,
        headquarters_uf: form.headquarters_uf.trim() || null,
        notes: form.notes.trim() || null,
      });
    }
    resetForm();
    setOpen(false);
  };

  const handleDelete = async (b: EnterpriseBrand) => {
    const count = unitsByBrand.get(b.id) ?? 0;
    const ok = window.confirm(
      count > 0
        ? `A marca "${b.name}" tem ${count} unidade(s) vinculada(s). Ao remover, as unidades ficarão sem marca (mas os diagnósticos serão preservados). Continuar?`
        : `Remover a marca "${b.name}"?`,
    );
    if (!ok) return;
    await deleteBrand.mutateAsync(b.id);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          Marcas / Redes de Hotéis
        </CardTitle>
        <CardDescription>
          Uma marca agrupa unidades do mesmo empreendimento em municípios diferentes.
          Cada unidade mantém seu próprio diagnóstico, e a marca permite consolidar a
          análise de desempenho da rede em diferentes territórios.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-end">
          <Button onClick={handleOpenNew}>
            <Plus className="h-4 w-4 mr-2" />
            Nova marca
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2 py-8 justify-center text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando marcas...
          </div>
        ) : brands.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <Building2 className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">Nenhuma marca cadastrada ainda.</p>
            <p className="text-xs">Marcas existentes aparecem automaticamente quando você cria diagnósticos empresariais.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Marca</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-center">Unidades</TableHead>
                <TableHead>Site</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {brands.map((b) => {
                const count = unitsByBrand.get(b.id) ?? 0;
                return (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium">{b.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{BRAND_TYPE_LABELS[b.brand_type]}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={count > 1 ? 'default' : 'secondary'} className="gap-1">
                        <MapPin className="h-3 w-3" />
                        {count}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground truncate max-w-[200px]">
                      {b.website ?? '—'}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(b)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(b)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}

        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? 'Editar marca' : 'Nova marca / rede'}</DialogTitle>
              <DialogDescription>
                Defina os dados da marca. As unidades em cada município são vinculadas via o diagnóstico empresarial.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={form.brand_type} onValueChange={(v) => setForm({ ...form, brand_type: v as BrandType })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="independent">Independente</SelectItem>
                      <SelectItem value="chain">Rede</SelectItem>
                      <SelectItem value="franchise">Franquia</SelectItem>
                      <SelectItem value="collection">Coleção</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>UF da matriz</Label>
                  <Input
                    value={form.headquarters_uf}
                    onChange={(e) => setForm({ ...form, headquarters_uf: e.target.value.toUpperCase().slice(0, 2) })}
                    placeholder="SP"
                    maxLength={2}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Site</Label>
                <Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://..." />
              </div>
              <div className="space-y-2">
                <Label>Notas</Label>
                <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setOpen(false); resetForm(); }}>Cancelar</Button>
              <Button
                onClick={handleSubmit}
                disabled={!form.name.trim() || createBrand.isPending || updateBrand.isPending}
              >
                {(createBrand.isPending || updateBrand.isPending) && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                {editing ? 'Salvar' : 'Criar marca'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}