// Fase 4 (v1.86.0) — Importação operacional via CSV/PMS
//
// Componente opcional do Step 5 Enterprise (acima do EnterpriseDataEntryPanel).
// Permite ao usuário carregar uma planilha exportada de qualquer PMS
// (Opera Cloud, Cloudbeds, Stays, ou CSV genérico) seguindo o template
// canônico documentado em `mem/features/enterprise/auto-fill-catalog.md`.
//
// O componente:
//  1) Aceita drag-and-drop ou seleção de arquivo .csv.
//  2) Parsing client-side (UTF-8 → fallback Windows-1252) com detecção
//     automática de separador (`;` ou `,`) e vírgula decimal pt-BR.
//  3) Valida bounds por coluna (ex.: occupancy 0–100, NPS -100 a 100).
//  4) Calcula a média de cada métrica entre as linhas (1 linha = 1 mês).
//  5) Mostra preview com nº de linhas, período coberto e métricas médias.
//  6) Ao confirmar:
//     - Grava o lote em `enterprise_pms_imports` (raw + parsed + status='applied').
//     - Faz upsert em `enterprise_indicator_values` para cada ENT_* mapeado.
//     - Notifica o painel pai (callback) para recarregar o estado de cobertura.
//
// Não conversa com PMS via API nesta fase — o CSV cobre os mesmos dados.
import { useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CloudUpload, Download, FileSpreadsheet, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useProfileContext } from '@/contexts/ProfileContext';

// Mapeamento canônico CSV → ENT_* (apenas códigos já presentes em
// enterprise_indicators e que aceitam dado mensal médio).
interface MetricSpec {
  csv: string;
  code: string;          // ENT_*
  label: string;
  unit: string;
  min: number;
  max: number;
  decimals?: number;
}

const METRIC_SPECS: MetricSpec[] = [
  { csv: 'occupancy_pct',    code: 'ENT_OCUPACAO',     label: 'Taxa de Ocupação',          unit: '%',           min: 0,    max: 100,    decimals: 1 },
  { csv: 'adr_brl',          code: 'ENT_ADR',          label: 'Diária Média (ADR)',        unit: 'R$',          min: 0,    max: 10000,  decimals: 2 },
  { csv: 'revpar_brl',       code: 'ENT_REVPAR',       label: 'RevPAR',                    unit: 'R$',          min: 0,    max: 10000,  decimals: 2 },
  { csv: 'gop_pct',          code: 'ENT_GOP',          label: 'GOP',                       unit: '%',           min: -50,  max: 100,    decimals: 1 },
  { csv: 'nps',              code: 'ENT_NPS',          label: 'NPS',                       unit: 'score',       min: -100, max: 100,    decimals: 1 },
  { csv: 'turnover_pct',     code: 'ENT_TURNOVER',     label: 'Turnover',                  unit: '%',           min: 0,    max: 200,    decimals: 1 },
  { csv: 'training_hours',   code: 'ENT_HORAS_TREINO', label: 'Horas de Treinamento',      unit: 'horas/ano',   min: 0,    max: 500,    decimals: 1 },
  { csv: 'energy_kwh',       code: 'ENT_ENERGIA_KWH',  label: 'Consumo Energético/UH',     unit: 'kWh/UH/mês',  min: 0,    max: 1000,   decimals: 1 },
  { csv: 'water_l',          code: 'ENT_AGUA_LITROS',  label: 'Consumo de Água/Hóspede',   unit: 'L/hóspede/d', min: 0,    max: 2000,   decimals: 1 },
  { csv: 'repeat_guest_pct', code: 'ENT_RETORNO',      label: 'Taxa de Retorno',           unit: '%',           min: 0,    max: 100,    decimals: 1 },
];

type ParsedRow = Record<string, string>;
type MetricAggregate = {
  spec: MetricSpec;
  values: number[];
  mean: number | null;
  outOfBoundsRows: number[];
};

interface Props {
  assessmentId: string;
  onApplied?: () => void;
}

function detectSeparator(text: string): ';' | ',' {
  const firstLine = text.split(/\r?\n/, 1)[0] || '';
  const semis = (firstLine.match(/;/g) || []).length;
  const commas = (firstLine.match(/,/g) || []).length;
  return semis > commas ? ';' : ',';
}

function parseCsvLine(line: string, sep: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inside = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inside && line[i + 1] === '"') { cur += '"'; i++; } else { inside = !inside; }
    } else if (ch === sep && !inside) {
      out.push(cur); cur = '';
    } else { cur += ch; }
  }
  out.push(cur);
  return out.map(s => s.trim());
}

function parseNumberPtBR(raw: string): number | null {
  if (!raw) return null;
  // Strip R$, %, espaços; converter vírgula decimal e separador de milhar.
  const cleaned = raw.replace(/[R$%\s]/g, '');
  const normalized = cleaned.includes(',')
    ? cleaned.replace(/\./g, '').replace(',', '.')
    : cleaned;
  const n = parseFloat(normalized);
  return Number.isFinite(n) ? n : null;
}

function downloadTemplate() {
  const header = ['period_month', ...METRIC_SPECS.map(m => m.csv)].join(';');
  const sample = [
    '2026-01;72,5;420,00;304,50;38,2;52;18,3;6,5;75,2;180,4;28,1',
    '2026-02;78,1;435,50;340,10;41,0;58;15,9;7,1;72,8;172,9;30,5',
    '2026-03;81,9;448,30;367,20;42,5;61;14,2;8,0;70,1;168,7;32,8',
  ];
  const csv = '\uFEFF' + [header, ...sample].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'template_pms_sistur.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export function PmsCsvImportPanel({ assessmentId, onApplied }: Props) {
  const { effectiveOrgId } = useProfileContext();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [period, setPeriod] = useState<{ start: string | null; end: string | null }>({ start: null, end: null });
  const [source, setSource] = useState<'csv_generic' | 'opera' | 'cloudbeds' | 'stays'>('csv_generic');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const aggregates: MetricAggregate[] = useMemo(() => {
    return METRIC_SPECS.map(spec => {
      const values: number[] = [];
      const oob: number[] = [];
      rows.forEach((r, idx) => {
        const n = parseNumberPtBR(r[spec.csv] || '');
        if (n == null) return;
        if (n < spec.min || n > spec.max) { oob.push(idx + 2); return; }
        values.push(n);
      });
      const mean = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : null;
      return { spec, values, mean, outOfBoundsRows: oob };
    });
  }, [rows]);

  const validMetricCount = aggregates.filter(a => a.mean != null).length;
  const totalOob = aggregates.reduce((sum, a) => sum + a.outOfBoundsRows.length, 0);

  const handleFile = (file: File) => {
    setDone(false);
    setFileName(file.name);
    const reader = new FileReader();
    reader.onerror = () => toast.error('Falha ao ler o arquivo.');
    reader.onload = (e) => {
      const buffer = e.target?.result as ArrayBuffer;
      if (!buffer) { toast.error('Arquivo vazio.'); return; }
      let text = new TextDecoder('utf-8').decode(buffer);
      if (text.includes('\uFFFD')) text = new TextDecoder('windows-1252').decode(buffer);
      const cleaned = text.replace(/^\uFEFF/, '');
      const sep = detectSeparator(cleaned);
      const lines = cleaned.split(/\r?\n/).filter(l => l.trim().length > 0);
      if (lines.length < 2) { toast.error('CSV precisa de cabeçalho + ao menos 1 linha de dados.'); return; }
      const header = parseCsvLine(lines[0], sep).map(h => h.toLowerCase());
      const dataRows: ParsedRow[] = lines.slice(1).map(line => {
        const cells = parseCsvLine(line, sep);
        const obj: ParsedRow = {};
        header.forEach((h, i) => { obj[h] = cells[i] ?? ''; });
        return obj;
      });
      const months = dataRows.map(r => r['period_month']).filter(Boolean).sort();
      setRows(dataRows);
      setPeriod({ start: months[0] ?? null, end: months[months.length - 1] ?? null });
      toast.success(`${dataRows.length} linhas lidas`, { description: `Separador ${sep === ';' ? 'ponto-vírgula' : 'vírgula'}` });
    };
    reader.readAsArrayBuffer(file);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const applyImport = async () => {
    if (!effectiveOrgId) { toast.error('Organização não identificada.'); return; }
    if (rows.length === 0 || validMetricCount === 0) { toast.error('Nada para importar.'); return; }
    setBusy(true);
    try {
      // 1) Resolver IDs dos enterprise_indicators
      const codes = aggregates.filter(a => a.mean != null).map(a => a.spec.code);
      const { data: indRows, error: indErr } = await supabase
        .from('enterprise_indicators')
        .select('id, code')
        .in('code', codes);
      if (indErr) throw indErr;
      const byCode = new Map((indRows || []).map(r => [r.code as string, r.id as string]));

      const refDate = period.end ? `${period.end}-01`.slice(0, 10) : new Date().toISOString().slice(0, 10);

      // 2) Salvar lote em enterprise_pms_imports
      const parsedMetrics: Record<string, number> = {};
      aggregates.forEach(a => { if (a.mean != null) parsedMetrics[a.spec.code] = a.mean; });
      const { data: { user } } = await supabase.auth.getUser();
      const { error: impErr } = await supabase
        .from('enterprise_pms_imports')
        .insert({
          org_id: effectiveOrgId,
          assessment_id: assessmentId,
          source,
          period_start: period.start ? `${period.start}-01` : null,
          period_end: period.end ? `${period.end}-01` : null,
          raw_payload: rows as any,
          parsed_metrics: parsedMetrics as any,
          status: 'applied',
          rows_count: rows.length,
          imported_by: user?.id ?? null,
          applied_at: new Date().toISOString(),
        });
      if (impErr) throw impErr;

      // 3) Upsert em enterprise_indicator_values (legacy table reconhecida
      //    pelo calculate-assessment como fallback) — uma linha por ENT_*.
      const valuesRows = aggregates
        .filter(a => a.mean != null && byCode.has(a.spec.code))
        .map(a => ({
          org_id: effectiveOrgId,
          assessment_id: assessmentId,
          indicator_id: byCode.get(a.spec.code)!,
          value: Number(a.mean!.toFixed(a.spec.decimals ?? 2)),
          source: `PMS CSV (${source})`,
          reference_date: refDate,
          validated: true,
          validated_at: new Date().toISOString(),
          validated_by: user?.id ?? null,
        }));

      // Sem onConflict declarado na tabela (id é PK; (assessment_id,indicator_id)
      // não tem unique). Estratégia: apagar valores anteriores oriundos de PMS
      // CSV deste assessment + indicadores, depois inserir.
      const indicatorIds = valuesRows.map(v => v.indicator_id);
      const { error: delErr } = await supabase
        .from('enterprise_indicator_values')
        .delete()
        .eq('assessment_id', assessmentId)
        .in('indicator_id', indicatorIds)
        .like('source', 'PMS CSV%');
      if (delErr) throw delErr;
      const { error: insErr } = await supabase
        .from('enterprise_indicator_values')
        .insert(valuesRows);
      if (insErr) throw insErr;

      setDone(true);
      toast.success(`${valuesRows.length} indicadores operacionais importados`, {
        description: 'O cálculo será atualizado quando você concluir o diagnóstico.',
      });
      onApplied?.();
    } catch (err: any) {
      console.error('PMS CSV import failed:', err);
      toast.error('Falha ao importar CSV', { description: err?.message ?? 'Tente novamente.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Importar dados operacionais (PMS / CSV)
            </CardTitle>
            <CardDescription>
              Opcional. Suba uma planilha exportada do seu PMS (Opera, Cloudbeds, Stays) ou um CSV genérico
              com as métricas mensais. Aceita UTF-8/Latin1, vírgula decimal e separador <code>;</code> ou <code>,</code>.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={downloadTemplate}>
            <Download className="h-4 w-4 mr-2" />
            Baixar template
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Dropzone */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-muted/40 transition-colors"
        >
          <CloudUpload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm font-medium">
            {fileName ?? 'Arraste o CSV aqui ou clique para selecionar'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Máx. 1 arquivo .csv</p>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
        </div>

        {/* Origem do PMS */}
        {rows.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap text-sm">
            <span className="text-muted-foreground">Origem da planilha:</span>
            {(['csv_generic', 'opera', 'cloudbeds', 'stays'] as const).map(s => (
              <Badge
                key={s}
                variant={source === s ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => setSource(s)}
              >
                {s === 'csv_generic' ? 'CSV genérico' : s.charAt(0).toUpperCase() + s.slice(1)}
              </Badge>
            ))}
            {period.start && period.end && (
              <span className="ml-auto text-muted-foreground">
                Período: {period.start} → {period.end} · {rows.length} linha(s)
              </span>
            )}
          </div>
        )}

        {/* Preview de agregados */}
        {rows.length > 0 && (
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Indicador</TableHead>
                  <TableHead>Coluna CSV</TableHead>
                  <TableHead className="text-right">Média</TableHead>
                  <TableHead className="text-right">Linhas válidas</TableHead>
                  <TableHead className="text-right">Fora do range</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {aggregates.map(a => (
                  <TableRow key={a.spec.code}>
                    <TableCell className="font-medium">
                      {a.spec.label}
                      <span className="text-xs text-muted-foreground ml-1">({a.spec.code})</span>
                    </TableCell>
                    <TableCell><code className="text-xs">{a.spec.csv}</code></TableCell>
                    <TableCell className="text-right">
                      {a.mean != null
                        ? `${a.mean.toFixed(a.spec.decimals ?? 2)} ${a.spec.unit}`
                        : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-right">{a.values.length}</TableCell>
                    <TableCell className="text-right">
                      {a.outOfBoundsRows.length > 0
                        ? <Badge variant="destructive">{a.outOfBoundsRows.length}</Badge>
                        : '0'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {totalOob > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {totalOob} valor(es) fora do intervalo permitido foram ignorados. Verifique a coluna correspondente no CSV.
            </AlertDescription>
          </Alert>
        )}

        {/* Ação */}
        {rows.length > 0 && (
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="text-sm text-muted-foreground">
              {validMetricCount} de {METRIC_SPECS.length} métricas com média calculada.
            </div>
            <Button onClick={applyImport} disabled={busy || validMetricCount === 0 || done}>
              {busy ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Importando…</>
              ) : done ? (
                <><CheckCircle2 className="h-4 w-4 mr-2" /> Importado</>
              ) : (
                <>Aplicar ao diagnóstico</>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}