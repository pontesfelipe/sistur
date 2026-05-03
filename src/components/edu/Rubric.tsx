import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, ClipboardCheck, Eye, EyeOff } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

export interface RubricCriterion {
  name: string;
  max_points: number;
  descriptors: string[]; // 1 string per nível, do menor (0) para o maior
}

export interface Rubric {
  criteria: RubricCriterion[];
  total_max_points: number;
  visible_to_student: boolean;
}

export const EMPTY_RUBRIC: Rubric = {
  criteria: [],
  total_max_points: 0,
  visible_to_student: true,
};

export function isRubric(v: unknown): v is Rubric {
  return !!v && typeof v === 'object' && Array.isArray((v as any).criteria);
}

export function rubricTotal(r: Rubric): number {
  return r.criteria.reduce((sum, c) => sum + (Number(c.max_points) || 0), 0);
}

/* ============ EDITOR ============ */

export function RubricEditor({
  value, onChange,
}: { value: Rubric; onChange: (v: Rubric) => void }) {
  const update = (patch: Partial<Rubric>) => {
    const next = { ...value, ...patch };
    next.total_max_points = rubricTotal(next);
    onChange(next);
  };

  const updateCriterion = (i: number, patch: Partial<RubricCriterion>) => {
    const next = [...value.criteria];
    next[i] = { ...next[i], ...patch };
    update({ criteria: next });
  };

  const addCriterion = () => {
    update({
      criteria: [...value.criteria, { name: '', max_points: 5, descriptors: ['', ''] }],
    });
  };

  const removeCriterion = (i: number) => {
    update({ criteria: value.criteria.filter((_, idx) => idx !== i) });
  };

  const updateDescriptor = (ci: number, di: number, text: string) => {
    const next = [...value.criteria];
    const desc = [...(next[ci].descriptors || [])];
    desc[di] = text;
    next[ci] = { ...next[ci], descriptors: desc };
    update({ criteria: next });
  };

  const addDescriptor = (ci: number) => {
    const next = [...value.criteria];
    next[ci] = { ...next[ci], descriptors: [...(next[ci].descriptors || []), ''] };
    update({ criteria: next });
  };

  const removeDescriptor = (ci: number, di: number) => {
    const next = [...value.criteria];
    next[ci] = {
      ...next[ci],
      descriptors: (next[ci].descriptors || []).filter((_, j) => j !== di),
    };
    update({ criteria: next });
  };

  return (
    <div className="space-y-4 pt-4 border-t">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-base font-semibold flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4" /> Rubrica de Avaliação
          </Label>
          <p className="text-xs text-muted-foreground">
            Critérios com pontuação e descritores por nível. Total: <strong>{value.total_max_points || rubricTotal(value)} pontos</strong>.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={value.visible_to_student} onCheckedChange={(v) => update({ visible_to_student: v })} />
          <span className="text-xs text-muted-foreground">Visível ao aluno</span>
        </div>
      </div>

      {value.criteria.length === 0 && (
        <p className="text-xs text-muted-foreground italic">Nenhum critério definido.</p>
      )}

      <div className="space-y-3">
        {value.criteria.map((c, ci) => (
          <div key={ci} className="rounded-md border p-3 space-y-2">
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <Label className="text-xs">Critério</Label>
                <Input value={c.name} placeholder="Ex: Clareza argumentativa"
                  onChange={(e) => updateCriterion(ci, { name: e.target.value })} />
              </div>
              <div className="w-28">
                <Label className="text-xs">Pontos máx.</Label>
                <Input type="number" min={0} value={c.max_points}
                  onChange={(e) => updateCriterion(ci, { max_points: Number(e.target.value) || 0 })} />
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={() => removeCriterion(ci)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Descritores por nível (do menor para o maior)</Label>
              {(c.descriptors || []).map((d, di) => (
                <div key={di} className="flex gap-2 items-start">
                  <Badge variant="outline" className="mt-2 shrink-0">N{di}</Badge>
                  <Textarea rows={1} value={d} placeholder="Ex: Argumento ausente / pouco claro / consistente / sólido / excepcional"
                    onChange={(e) => updateDescriptor(ci, di, e.target.value)} />
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeDescriptor(ci, di)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => addDescriptor(ci)}>
                <Plus className="h-3 w-3 mr-1" /> Nível
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Button type="button" variant="outline" size="sm" onClick={addCriterion}>
        <Plus className="h-3 w-3 mr-1" /> Adicionar critério
      </Button>
    </div>
  );
}

/* ============ DISPLAY ============ */

export function RubricDisplay({
  rubric, hideIfNotVisible = true, title = 'Critérios de avaliação',
}: { rubric: unknown; hideIfNotVisible?: boolean; title?: string }) {
  if (!isRubric(rubric)) return null;
  if (hideIfNotVisible && rubric.visible_to_student === false) return null;
  if (!rubric.criteria.length) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <ClipboardCheck className="h-4 w-4" /> {title}
          <Badge variant="secondary" className="ml-auto">
            Total {rubric.total_max_points || rubricTotal(rubric)} pts
          </Badge>
          {rubric.visible_to_student ? (
            <Eye className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {rubric.criteria.map((c, ci) => (
          <div key={ci}>
            <div className="flex items-center justify-between text-sm">
              <strong>{c.name || `Critério ${ci + 1}`}</strong>
              <Badge variant="outline">{c.max_points} pts</Badge>
            </div>
            {(c.descriptors || []).length > 0 && (
              <ol className="mt-1 space-y-0.5 text-xs text-muted-foreground list-decimal pl-5">
                {c.descriptors.map((d, di) => <li key={di}>{d || <em>(sem descritor)</em>}</li>)}
              </ol>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}