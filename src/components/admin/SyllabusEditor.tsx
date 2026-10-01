import { tx } from '@/i18n/t';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import type { TrainingFormData } from '@/hooks/useEduAdmin';

type BibRef = { autor?: string; titulo?: string; ano?: string | number; link?: string };

interface Props {
  value: TrainingFormData;
  onChange: (patch: Partial<TrainingFormData>) => void;
}

function ListEditor({
  label, items, onChange, placeholder,
}: { label: string; items: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="space-y-2">
        {items.map((it, i) => (
          <div key={i} className="flex gap-2">
            <Input
              value={it}
              placeholder={placeholder}
              onChange={(e) => {
                const next = [...items];
                next[i] = e.target.value;
                onChange(next);
              }}
            />
            <Button type="button" variant="ghost" size="icon" onClick={() => onChange(items.filter((_, j) => j !== i))}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={() => onChange([...items, ''])}>
          <Plus className="h-3 w-3 mr-1" /> {tx("Adicionar")}
        </Button>
      </div>
    </div>
  );
}

function BibEditor({
  label, items, onChange,
}: { label: string; items: BibRef[]; onChange: (v: BibRef[]) => void }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="space-y-3">
        {items.map((it, i) => (
          <div key={i} className="grid grid-cols-12 gap-2 items-start border rounded-md p-2">
            <Input className="col-span-3" placeholder={tx("Autor")} value={it.autor || ''} onChange={(e) => {
              const next = [...items]; next[i] = { ...it, autor: e.target.value }; onChange(next);
            }} />
            <Input className="col-span-5" placeholder={tx("Título")} value={it.titulo || ''} onChange={(e) => {
              const next = [...items]; next[i] = { ...it, titulo: e.target.value }; onChange(next);
            }} />
            <Input className="col-span-1" placeholder={tx("Ano")} value={String(it.ano || '')} onChange={(e) => {
              const next = [...items]; next[i] = { ...it, ano: e.target.value }; onChange(next);
            }} />
            <Input className="col-span-2" placeholder={tx("Link")} value={it.link || ''} onChange={(e) => {
              const next = [...items]; next[i] = { ...it, link: e.target.value }; onChange(next);
            }} />
            <Button type="button" variant="ghost" size="icon" className="col-span-1" onClick={() => onChange(items.filter((_, j) => j !== i))}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={() => onChange([...items, {}])}>
          <Plus className="h-3 w-3 mr-1" /> {tx("Adicionar referência")}
        </Button>
      </div>
    </div>
  );
}

export function SyllabusEditor({ value, onChange }: Props) {
  return (
    <div className="space-y-5 pt-4 border-t">
      <div>
        <Label className="text-base font-semibold">{tx("Plano de Ensino")}</Label>
        <p className="text-xs text-muted-foreground">{tx("Documento pedagógico formal exibido na página do curso.")}</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="ementa">{tx("Ementa")}</Label>
        <Textarea id="ementa" rows={3} value={value.ementa || ''}
          onChange={(e) => onChange({ ementa: e.target.value })}
          placeholder={tx("Resumo programático do curso")} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{tx("Carga horária teórica (h)")}</Label>
          <Input type="number" value={value.carga_horaria_teorica ?? ''} onChange={(e) =>
            onChange({ carga_horaria_teorica: e.target.value === '' ? undefined : Number(e.target.value) })} />
        </div>
        <div className="space-y-2">
          <Label>{tx("Carga horária prática (h)")}</Label>
          <Input type="number" value={value.carga_horaria_pratica ?? ''} onChange={(e) =>
            onChange({ carga_horaria_pratica: e.target.value === '' ? undefined : Number(e.target.value) })} />
        </div>
      </div>

      <ListEditor label={tx("Competências")} items={value.competencias || []}
        onChange={(v) => onChange({ competencias: v })}
        placeholder={tx("Ex: Diagnosticar gargalos territoriais")} />

      <ListEditor label={tx("Habilidades (objetivos de aprendizagem)")} items={value.habilidades || []}
        onChange={(v) => onChange({ habilidades: v })}
        placeholder={tx("Ex: Aplicar a metodologia de Mario Beni")} />

      <ListEditor label={tx("Pré-requisitos")} items={value.prerequisitos || []}
        onChange={(v) => onChange({ prerequisitos: v })}
        placeholder={tx("Ex: Curso introdutório de turismo")} />

      <div className="space-y-2">
        <Label htmlFor="metodologia">{tx("Metodologia")}</Label>
        <Textarea id="metodologia" rows={3} value={value.metodologia || ''}
          onChange={(e) => onChange({ metodologia: e.target.value })}
          placeholder={tx("Estratégias didáticas, recursos e atividades")} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="criterios_avaliacao">{tx("Critérios de Avaliação")}</Label>
        <Textarea id="criterios_avaliacao" rows={3} value={value.criterios_avaliacao || ''}
          onChange={(e) => onChange({ criterios_avaliacao: e.target.value })}
          placeholder={tx("Como o aluno será avaliado e nota mínima")} />
      </div>

      <BibEditor label={tx("Bibliografia básica")} items={value.bibliografia_basica || []}
        onChange={(v) => onChange({ bibliografia_basica: v })} />

      <BibEditor label={tx("Bibliografia complementar")} items={value.bibliografia_complementar || []}
        onChange={(v) => onChange({ bibliografia_complementar: v })} />
    </div>
  );
}