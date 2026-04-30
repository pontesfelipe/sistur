import { useState, useMemo, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  AlertCircle,
  CheckCircle2,
  Database,
  Edit2,
  Info,
  Loader2,
  RefreshCw,
  Shield,
  Star,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  ExternalIndicatorValue, 
  useExternalIndicatorValues,
  useFetchOfficialData,
  useValidateIndicatorValues,
  useUnvalidateIndicatorValues,
} from '@/hooks/useOfficialData';
import { useAuth } from '@/hooks/useAuth';
import { useIndicatorValues, useIndicators } from '@/hooks/useIndicators';
import {
  EMPTY_SELECT_VALUE,
  formatIndicatorFieldDisplayValue,
  getIndicatorFieldConfig,
  getIndicatorSelectValue,
  parseIndicatorSelectValue,
} from '@/lib/indicatorFieldConfig';

interface DataValidationPanelProps {
  ibgeCode: string;
  orgId: string;
  destinationName: string;
  onValidationComplete: (values: ExternalIndicatorValue[]) => void;
  /** Assessment receiving the validated values; when provided, values are persisted immediately. */
  assessmentId?: string | null;
  /** Whether the host assessment opted into the Mandala MST extension. */
  includeMandala?: boolean;
}

// Source display info
const SOURCE_INFO: Record<string, { name: string; color: string; icon: string }> = {
  IBGE: { name: 'IBGE', color: 'bg-blue-500', icon: '📊' },
  IBGE_CENSO: { name: 'IBGE / SIDRA (Censo)', color: 'bg-indigo-500', icon: '🏘️' },
  DATASUS: { name: 'DATASUS', color: 'bg-green-500', icon: '🏥' },
  INEP: { name: 'INEP', color: 'bg-purple-500', icon: '📚' },
  STN: { name: 'Tesouro Nacional', color: 'bg-amber-500', icon: '💰' },
  CADASTUR: { name: 'CADASTUR', color: 'bg-cyan-500', icon: '🏨' },
  MAPA_TURISMO: { name: 'Mapa do Turismo', color: 'bg-teal-500', icon: '🗺️' },
  ANA: { name: 'ANA — Águas', color: 'bg-sky-500', icon: '💧' },
  TSE: { name: 'TSE — Eleições', color: 'bg-rose-500', icon: '🗳️' },
  ANATEL: { name: 'Anatel — Conectividade', color: 'bg-fuchsia-500', icon: '📡' },
  MANUAL: { name: 'Preenchimento Manual', color: 'bg-gray-400', icon: '✏️' },
};

// Indicators that come from the Mandala MST extension (Tasso, Silva & Nascimento, 2024)
function isMandalaIndicator(code: string): boolean {
  return code.startsWith('MST_');
}

// Confidence level display
const CONFIDENCE_CRITERIA: Record<number, { label: string; color: string }> = {
  1: { label: 'Preenchimento manual', color: 'text-destructive' },
  2: { label: 'Pesquisa local', color: 'text-orange-500' },
  3: { label: 'Fonte secundária', color: 'text-yellow-600' },
  4: { label: 'Atualização trimestral', color: 'text-cyan-600' },
  5: { label: 'API oficial', color: 'text-green-600' },
};

const OFFICIAL_COLLECTION_METHODS: ExternalIndicatorValue['collection_method'][] = ['AUTOMATIC', 'BATCH'];

function isOfficialPreFilledValue(value: ExternalIndicatorValue) {
  return OFFICIAL_COLLECTION_METHODS.includes(value.collection_method);
}

export function DataValidationPanel({
  ibgeCode,
  orgId,
  destinationName,
  onValidationComplete,
  assessmentId,
  includeMandala = false,
}: DataValidationPanelProps) {
  const { user } = useAuth();
  const [editedValues, setEditedValues] = useState<Record<string, number | null>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmedIds, setConfirmedIds] = useState<Set<string>>(new Set());
  const [autoFetched, setAutoFetched] = useState(false);
  const [anaIqaStatus, setAnaIqaStatus] = useState<'success' | 'unavailable' | null>(null);
  const queryClient = useQueryClient();

  const { data: rawValues = [], isLoading } = useExternalIndicatorValues(ibgeCode, orgId);
  const fetchOfficialData = useFetchOfficialData();
  const validateValues = useValidateIndicatorValues();
  const unvalidateValues = useUnvalidateIndicatorValues();
  const { values: assessmentValues = [] } = useIndicatorValues(assessmentId || undefined);

  // Catalog of indicators (used to display friendly names instead of raw codes)
  const { indicators: indicatorCatalog = [] } = useIndicators({ scope: 'all' });
  const indicatorNameByCode = useMemo(() => {
    const map = new Map<string, string>();
    indicatorCatalog.forEach((ind) => {
      if (ind?.code && ind?.name) map.set(ind.code.toLowerCase(), ind.name);
    });
    return map;
  }, [indicatorCatalog]);

  const getIndicatorDisplayName = (code: string): string => {
    const friendly = indicatorNameByCode.get(code.toLowerCase());
    if (friendly) return friendly;
    // Fallback: clean up the code if no name is found in the catalog
    return code.replace('igma_', '').replace('MST_', '').replace(/_/g, ' ');
  };

  // Only auto-fetch when there is NO cached external data yet. If the user
  // had already validated indicators in a previous session, refetching would
  // wipe their progress and force them to re-validate the pre-fill from
  // scratch. The user can still trigger a refresh manually via "Atualizar".
  useEffect(() => {
    if (autoFetched || isLoading || !ibgeCode || !orgId) return;
    if (rawValues && rawValues.length > 0) {
      setAutoFetched(true);
      return;
    }
    setAutoFetched(true);
    fetchOfficialData.mutate(
      { ibgeCode, orgId, includeMandala },
      {
        onSuccess: (data) => {
          const iqa = data?.ana_status?.iqa;
          if (iqa?.status === 'success') setAnaIqaStatus('success');
          else setAnaIqaStatus('unavailable');
        },
      }
    );
  }, [ibgeCode, orgId, autoFetched, includeMandala, isLoading, rawValues]);

  const assessmentValueByCode = useMemo(() => {
    const map = new Map<string, number | null>();
    assessmentValues.forEach((value: any) => {
      const code = value?.indicator?.code;
      if (code) map.set(code, value.value_raw ?? null);
    });
    return map;
  }, [assessmentValues]);

  const isPersistedInAssessment = (value: ExternalIndicatorValue) => {
    if (!assessmentId || !assessmentValueByCode.has(value.indicator_code)) return false;
    const savedValue = assessmentValueByCode.get(value.indicator_code);
    if (savedValue === null || savedValue === undefined || value.raw_value === null || value.raw_value === undefined) {
      return savedValue === value.raw_value;
    }
    return Number(savedValue) === Number(value.raw_value);
  };

  // Mirror the persisted validation state for the source row, but also honor
  // the current assessment's saved indicator_values. This prevents a resumed
  // diagnostic from asking for revalidation when the official value was already
  // accepted and copied into that specific assessment.
  useEffect(() => {
    setConfirmedIds(new Set(
      (rawValues || [])
        .filter(v => (v as any).validated || isPersistedInAssessment(v))
        .map(v => v.id)
    ));
  }, [rawValues, assessmentValueByCode, assessmentId]);

  const values = useMemo(
    () => rawValues.filter(isOfficialPreFilledValue),
    [rawValues]
  );

  const manualCount = useMemo(
    () => rawValues.filter((value) => !isOfficialPreFilledValue(value)).length,
    [rawValues]
  );

  const handleFetchData = async () => {
    await fetchOfficialData.mutateAsync({ ibgeCode, orgId, includeMandala });
  };

  const handleValueChange = (id: string, rawInput: string) => {
    const value = values.find((item) => item.id === id);
    const fieldConfig = getIndicatorFieldConfig({ code: value?.indicator_code });

    if (fieldConfig.kind === 'select') {
      setEditedValues((prev) => ({
        ...prev,
        [id]: parseIndicatorSelectValue(rawInput, { code: value?.indicator_code }),
      }));
      return;
    }

    const cleaned = rawInput.replace(/\./g, '').replace(',', '.');
    const numValue = cleaned === '' ? null : parseFloat(cleaned);
    setEditedValues(prev => ({ ...prev, [id]: Number.isFinite(numValue) ? numValue : null }));
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      // Only select rows that have NOT yet been confirmed/validated, so the
      // user doesn't accidentally re-validate (and thus re-stamp) data they
      // already approved in a previous session.
      setSelectedIds(new Set(values.filter(v => !confirmedIds.has(v.id)).map(v => v.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedIds(newSelected);
  };

  const persistValidatedValuesToAssessment = async (validatedValues: ExternalIndicatorValue[]) => {
    if (!assessmentId || !orgId || validatedValues.length === 0) return;

    const codes = validatedValues.map(v => v.indicator_code);
    const { data: indicatorRows, error: indErr } = await supabase
      .from('indicators')
      .select('id, code')
      .in('code', codes);
    if (indErr) throw indErr;

    const codeToId = new Map((indicatorRows || []).map(r => [r.code, r.id]));
    const valuesToPersist = validatedValues
      .filter(v => v.raw_value !== null && codeToId.has(v.indicator_code))
      .map(v => ({
        assessment_id: assessmentId,
        indicator_id: codeToId.get(v.indicator_code)!,
        value_raw: Number(v.raw_value),
        source: `Pré-preenchido (${v.source_code})`,
        org_id: orgId,
        reference_date: v.reference_year ? `${v.reference_year}-01-01` : null,
      }));

    if (valuesToPersist.length === 0) return;
    const { error } = await supabase
      .from('indicator_values')
      .upsert(valuesToPersist, { onConflict: 'assessment_id,indicator_id' });
    if (error) throw error;
    await queryClient.invalidateQueries({ queryKey: ['indicator-values', assessmentId] });
  };

  const handleValidateSelected = async () => {
    if (!user?.id || selectedIds.size === 0) return;

    const selectedValues = values.filter(v => selectedIds.has(v.id));
    const valuesToValidate = selectedValues.map(v => ({
      id: v.id,
      raw_value: editedValues[v.id] !== undefined ? editedValues[v.id] : v.raw_value,
    }));

    await validateValues.mutateAsync({ values: valuesToValidate, userId: user.id });
    const validatedValues = selectedValues.map(v => ({
      ...v,
      raw_value: editedValues[v.id] !== undefined ? editedValues[v.id] : v.raw_value,
      validated: true,
      validated_by: user.id,
      validated_at: new Date().toISOString(),
    }));
    await persistValidatedValuesToAssessment(validatedValues);
    
    setConfirmedIds(prev => {
      const next = new Set(prev);
      selectedIds.forEach(id => next.add(id));
      return next;
    });
    setSelectedIds(new Set());

    onValidationComplete(validatedValues);
  };

  const handleUnvalidate = async (id: string) => {
    await unvalidateValues.mutateAsync({ ids: [id] });
    setConfirmedIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const selectableValues = values.filter(v => !confirmedIds.has(v.id));
  const validatedCount = confirmedIds.size;
  const pendingCount = values.length - validatedCount;
  const autoCount = values.length;

  return (
    <div className="space-y-6">

      {/* Header with actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">Validação de Dados Oficiais</h3>
          <p className="text-sm text-muted-foreground">
            {destinationName} • Código IBGE: {ibgeCode}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleFetchData}
            disabled={fetchOfficialData.isPending}
          >
            {fetchOfficialData.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            {values.length === 0 ? 'Buscar Dados' : 'Atualizar'}
          </Button>
          <Button
            onClick={handleValidateSelected}
            disabled={selectedIds.size === 0 || validateValues.isPending}
          >
            {validateValues.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4 mr-2" />
            )}
            Validar Selecionados ({selectedIds.size})
          </Button>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total</span>
            </div>
            <p className="text-2xl font-bold">{values.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-sm text-muted-foreground">Validados</span>
            </div>
            <p className="text-2xl font-bold text-green-600">{validatedCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              <span className="text-sm text-muted-foreground">Pendentes</span>
            </div>
            <p className="text-2xl font-bold text-amber-600">{pendingCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Edit2 className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-muted-foreground">Editados</span>
            </div>
            <p className="text-2xl font-bold text-blue-600">{Object.keys(editedValues).length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Source breakdown - visual display of where data came from */}
      {values.length > 0 && (
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Fontes de Dados Utilizadas
            </CardTitle>
            <CardDescription>
              Detalhamento das bases oficiais que alimentaram o pré-preenchimento automático
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {(() => {
                const bySource: Record<string, { count: number; indicators: string[] }> = {};
                values.forEach(v => {
                  const src = v.source_code || 'MANUAL';
                  if (!bySource[src]) bySource[src] = { count: 0, indicators: [] };
                  bySource[src].count++;
                  bySource[src].indicators.push(getIndicatorDisplayName(v.indicator_code));
                });
                return Object.entries(bySource)
                  .sort((a, b) => b[1].count - a[1].count)
                  .map(([source, data]) => {
                    const info = SOURCE_INFO[source] || { name: source, color: 'bg-gray-400', icon: '📄' };
                    return (
                      <TooltipProvider key={source}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className={cn(
                              "flex items-center gap-3 p-3 rounded-lg border cursor-help transition-colors",
                              source === 'MAPA_TURISMO' && "border-teal-500/40 bg-teal-50/50 dark:bg-teal-950/20",
                              source === 'IBGE' && "border-blue-500/40 bg-blue-50/50 dark:bg-blue-950/20",
                              source === 'IBGE_CENSO' && "border-indigo-500/40 bg-indigo-50/50 dark:bg-indigo-950/20",
                              source === 'CADASTUR' && "border-cyan-500/40 bg-cyan-50/50 dark:bg-cyan-950/20",
                              source === 'DATASUS' && "border-green-500/40 bg-green-50/50 dark:bg-green-950/20",
                              source === 'INEP' && "border-purple-500/40 bg-purple-50/50 dark:bg-purple-950/20",
                              source === 'STN' && "border-amber-500/40 bg-amber-50/50 dark:bg-amber-950/20",
                              !['MAPA_TURISMO','IBGE','IBGE_CENSO','CADASTUR','DATASUS','INEP','STN'].includes(source) && "border-muted"
                            )}>
                              <span className="text-2xl">{info.icon}</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{info.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {data.count} indicador{data.count > 1 ? 'es' : ''}
                                </p>
                              </div>
                              <Badge variant="secondary" className="text-xs font-bold">
                                {data.count}
                              </Badge>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="max-w-xs">
                            <p className="font-medium mb-1">{info.name}</p>
                            <ul className="text-xs space-y-0.5">
                              {data.indicators.map((ind, i) => (
                                <li key={i} className="capitalize">• {ind}</li>
                              ))}
                            </ul>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    );
                  });
              })()}
            </div>
            {manualCount > 0 && (
              <p className="text-xs text-muted-foreground mt-3 pt-3 border-t">
                ✏️ {manualCount} indicador{manualCount > 1 ? 'es' : ''} requer{manualCount > 1 ? 'em' : ''} preenchimento manual na próxima etapa.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* IQA / ANA unavailability notice */}
      {anaIqaStatus === 'unavailable' && !values.some(v => v.indicator_code === 'ana_iqa') && (
        <Card className="border-sky-500/40 bg-sky-50/50 dark:bg-sky-950/20">
          <CardContent className="p-4 flex items-start gap-3">
            <span className="text-2xl shrink-0">💧</span>
            <div className="space-y-1">
              <p className="text-sm font-medium">
                Índice de Qualidade da Água (IQA / ANA) — sem dados disponíveis
              </p>
              <p className="text-xs text-muted-foreground">
                A ANA não possui estações de monitoramento de qualidade da água num raio de 50 km
                deste município. O campo permanecerá disponível para preenchimento manual na próxima
                etapa, caso você tenha acesso a fontes locais (vigilância sanitária, secretaria de
                meio ambiente ou estudos de bacia hidrográfica).
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : values.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Database className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h4 className="font-medium mb-2">Nenhum dado pré-preenchido</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Clique em "Buscar Dados" para carregar dados oficiais das bases públicas.
            </p>
            <Button onClick={handleFetchData} disabled={fetchOfficialData.isPending}>
              {fetchOfficialData.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Buscar Dados Oficiais
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Indicadores Pré-preenchidos</CardTitle>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="select-all"
                  checked={selectableValues.length > 0 && selectedIds.size === selectableValues.length}
                  onCheckedChange={handleSelectAll}
                />
                <label htmlFor="select-all" className="text-sm text-muted-foreground cursor-pointer">
                  Selecionar todos
                </label>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Indicador</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Fonte</TableHead>
                    <TableHead>Ano</TableHead>
                    <TableHead>Critério</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-24 text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {values.map((value) => {
                    const sourceInfo = SOURCE_INFO[value.source_code];
                    const isEdited = editedValues[value.id] !== undefined;
                    const displayValue = isEdited ? editedValues[value.id] : value.raw_value;
                    const isConfirmed = confirmedIds.has(value.id);
                    const fieldConfig = getIndicatorFieldConfig({ code: value.indicator_code });

                    return (
                      <TableRow key={value.id} className={cn(isConfirmed && 'bg-muted/30')}>
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.has(value.id)}
                            onCheckedChange={(checked) => handleSelectOne(value.id, !!checked)}
                            disabled={isConfirmed}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 flex-wrap">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="font-medium cursor-help">
                                    {getIndicatorDisplayName(value.indicator_code)}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="text-xs font-mono">{value.indicator_code}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            {isMandalaIndicator(value.indicator_code) && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-primary/50 text-primary bg-primary/10 cursor-help">
                                      🌀 MST
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-xs">
                                    <p className="text-xs">
                                      Indicador da Mandala da Sustentabilidade no Turismo (Tasso, Silva &amp; Nascimento, 2024) — extensão complementar ativada via opt-in no diagnóstico.
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {isConfirmed ? (
                            <span className="font-mono">
                              {displayValue !== null && displayValue !== undefined
                                ? formatIndicatorFieldDisplayValue(displayValue, { code: value.indicator_code })
                                : '—'}
                            </span>
                          ) : fieldConfig.kind === 'select' ? (
                            <Select
                              value={isEdited
                                ? (displayValue === null
                                    ? EMPTY_SELECT_VALUE
                                    : getIndicatorSelectValue(displayValue, { code: value.indicator_code }))
                                : (getIndicatorSelectValue(value.raw_value, { code: value.indicator_code }) || EMPTY_SELECT_VALUE)
                              }
                              onValueChange={(selectedValue) => handleValueChange(value.id, selectedValue)}
                            >
                              <SelectTrigger className={cn(
                                'h-8 w-32',
                                isEdited && 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                              )}>
                                <SelectValue placeholder="Selecionar" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value={EMPTY_SELECT_VALUE}>Não informado</SelectItem>
                                {fieldConfig.options.map((option) => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Input
                              type="text"
                              inputMode="decimal"
                              value={isEdited
                                ? (displayValue !== null && displayValue !== undefined
                                    ? formatIndicatorFieldDisplayValue(displayValue, { code: value.indicator_code })
                                    : '')
                                : (value.raw_value !== null && value.raw_value !== undefined
                                    ? formatIndicatorFieldDisplayValue(value.raw_value, { code: value.indicator_code })
                                    : '')
                              }
                              onChange={(e) => {
                                const raw = e.target.value;
                                if (raw !== '' && !/^-?[\d.,]*$/.test(raw)) return;
                                handleValueChange(value.id, raw);
                              }}
                              className={cn(
                                'w-28 h-8 text-right font-mono',
                                isEdited && 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                              )}
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <Badge variant="outline" className="gap-1">
                              <span>{sourceInfo?.icon}</span>
                              {sourceInfo?.name || value.source_code}
                            </Badge>
                            {value.collection_method === 'AUTOMATIC' ? (
                              <Badge className="bg-green-600 text-white text-[10px] px-1.5 py-0">API</Badge>
                            ) : value.collection_method === 'BATCH' ? (
                              <Badge className="bg-cyan-600 text-white text-[10px] px-1.5 py-0">Trimestral</Badge>
                            ) : (
                              <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Manual</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-muted-foreground">
                            {value.reference_year || '—'}
                          </span>
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const criteria = CONFIDENCE_CRITERIA[value.confidence_level];
                            return (
                              <span className={cn('text-xs font-medium', criteria?.color)}>
                                {criteria?.label || '—'}
                              </span>
                            );
                          })()}
                        </TableCell>
                        <TableCell>
                          {isConfirmed ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge variant="default" className="bg-green-500 cursor-help">
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                    Confirmado
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="text-xs">Dado revisado, salvo e confirmado</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge variant="secondary" className="cursor-help">
                                    <AlertCircle className="h-3 w-3 mr-1" />
                                    Aguardando revisão
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="text-xs">Selecione e clique "Validar" para confirmar este dado</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {isConfirmed && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUnvalidate(value.id)}
                              disabled={unvalidateValues.isPending}
                            >
                              Desvalidar
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
