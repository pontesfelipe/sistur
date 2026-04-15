import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
} from '@/hooks/useOfficialData';
import { useAuth } from '@/hooks/useAuth';
import { formatIndicatorValueBR } from '@/data/enterpriseIndicatorGuidance';

interface DataValidationPanelProps {
  ibgeCode: string;
  orgId: string;
  destinationName: string;
  onValidationComplete: (values: ExternalIndicatorValue[]) => void;
}

// Source display info
const SOURCE_INFO: Record<string, { name: string; color: string; icon: string }> = {
  IBGE: { name: 'IBGE', color: 'bg-blue-500', icon: '📊' },
  DATASUS: { name: 'DATASUS', color: 'bg-green-500', icon: '🏥' },
  INEP: { name: 'INEP', color: 'bg-purple-500', icon: '📚' },
  STN: { name: 'Tesouro Nacional', color: 'bg-amber-500', icon: '💰' },
  CADASTUR: { name: 'CADASTUR', color: 'bg-cyan-500', icon: '🏨' },
  MAPA_TURISMO: { name: 'Mapa do Turismo', color: 'bg-teal-500', icon: '🗺️' },
  MANUAL: { name: 'Preenchimento Manual', color: 'bg-gray-400', icon: '✏️' },
};

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
}: DataValidationPanelProps) {
  const { user } = useAuth();
  const [editedValues, setEditedValues] = useState<Record<string, number | null>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmedIds, setConfirmedIds] = useState<Set<string>>(new Set());
  const [autoFetched, setAutoFetched] = useState(false);

  const { data: rawValues = [], isLoading } = useExternalIndicatorValues(ibgeCode, orgId);
  const fetchOfficialData = useFetchOfficialData();
  const validateValues = useValidateIndicatorValues();

  // Always fetch fresh data when the panel mounts for a new diagnostic
  useEffect(() => {
    if (!autoFetched && ibgeCode && orgId) {
      setAutoFetched(true);
      fetchOfficialData.mutate({ ibgeCode, orgId });
    }
  }, [ibgeCode, orgId, autoFetched]);

  const values = useMemo(
    () => rawValues.filter(isOfficialPreFilledValue),
    [rawValues]
  );

  const manualCount = useMemo(
    () => rawValues.filter((value) => !isOfficialPreFilledValue(value)).length,
    [rawValues]
  );

  const handleFetchData = async () => {
    await fetchOfficialData.mutateAsync({ ibgeCode, orgId });
  };

  const handleValueChange = (id: string, rawInput: string) => {
    // Accept Brazilian input: comma as decimal
    const cleaned = rawInput.replace(/\./g, '').replace(',', '.');
    const numValue = cleaned === '' ? null : parseFloat(cleaned);
    setEditedValues(prev => ({ ...prev, [id]: Number.isFinite(numValue) ? numValue : null }));
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(values.map(v => v.id)));
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

  const handleValidateSelected = async () => {
    if (!user?.id || selectedIds.size === 0) return;

    const valuesToValidate = values
      .filter(v => selectedIds.has(v.id))
      .map(v => ({
        id: v.id,
        raw_value: editedValues[v.id] !== undefined ? editedValues[v.id] : v.raw_value,
      }));

    await validateValues.mutateAsync({ values: valuesToValidate, userId: user.id });
    
    setConfirmedIds(prev => {
      const next = new Set(prev);
      selectedIds.forEach(id => next.add(id));
      return next;
    });
    setSelectedIds(new Set());

    const validatedValues = values.filter(v => selectedIds.has(v.id));
    onValidationComplete(validatedValues);
  };

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
                  bySource[src].indicators.push(
                    v.indicator_code.replace('igma_', '').replace(/_/g, ' ')
                  );
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
                              source === 'CADASTUR' && "border-cyan-500/40 bg-cyan-50/50 dark:bg-cyan-950/20",
                              source === 'DATASUS' && "border-green-500/40 bg-green-50/50 dark:bg-green-950/20",
                              source !== 'MAPA_TURISMO' && source !== 'IBGE' && source !== 'CADASTUR' && source !== 'DATASUS' && "border-muted"
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
                  checked={selectedIds.size === values.length && values.length > 0}
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {values.map((value) => {
                    const sourceInfo = SOURCE_INFO[value.source_code];
                    const isEdited = editedValues[value.id] !== undefined;
                    const displayValue = isEdited ? editedValues[value.id] : value.raw_value;
                    const isConfirmed = confirmedIds.has(value.id);

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
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="font-medium cursor-help">
                                  {value.indicator_code.replace('igma_', '').replace(/_/g, ' ')}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs">{value.indicator_code}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                        <TableCell>
                          {isConfirmed ? (
                            <span className="font-mono">
                              {displayValue !== null && displayValue !== undefined
                                ? formatIndicatorValueBR(displayValue, { code: value.indicator_code })
                                : '—'}
                            </span>
                          ) : (
                            <Input
                              type="text"
                              inputMode="decimal"
                              value={isEdited
                                ? (displayValue !== null && displayValue !== undefined
                                    ? formatIndicatorValueBR(displayValue, { code: value.indicator_code })
                                    : '')
                                : (value.raw_value !== null && value.raw_value !== undefined
                                    ? formatIndicatorValueBR(value.raw_value, { code: value.indicator_code })
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
                                  <p className="text-xs">Dado revisado e confirmado nesta sessão</p>
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
