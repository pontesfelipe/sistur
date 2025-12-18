import { useState, useMemo } from 'react';
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
};

// Confidence level display
const CONFIDENCE_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: 'Muito baixa', color: 'text-red-500' },
  2: { label: 'Baixa', color: 'text-orange-500' },
  3: { label: 'Média', color: 'text-yellow-500' },
  4: { label: 'Alta', color: 'text-lime-500' },
  5: { label: 'Muito alta', color: 'text-green-500' },
};

export function DataValidationPanel({
  ibgeCode,
  orgId,
  destinationName,
  onValidationComplete,
}: DataValidationPanelProps) {
  const { user } = useAuth();
  const [editedValues, setEditedValues] = useState<Record<string, number | null>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data: values = [], isLoading, refetch } = useExternalIndicatorValues(ibgeCode, orgId);
  const fetchOfficialData = useFetchOfficialData();
  const validateValues = useValidateIndicatorValues();

  // Group values by source
  const valuesBySource = useMemo(() => {
    const grouped: Record<string, ExternalIndicatorValue[]> = {};
    values.forEach(v => {
      if (!grouped[v.source_code]) {
        grouped[v.source_code] = [];
      }
      grouped[v.source_code].push(v);
    });
    return grouped;
  }, [values]);

  const handleFetchData = async () => {
    await fetchOfficialData.mutateAsync({ ibgeCode, orgId });
  };

  const handleValueChange = (id: string, value: string) => {
    const numValue = value === '' ? null : parseFloat(value);
    setEditedValues(prev => ({ ...prev, [id]: numValue }));
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
    
    // Notify parent with validated values
    const validatedValues = values.filter(v => selectedIds.has(v.id));
    onValidationComplete(validatedValues);
  };

  const validatedCount = values.filter(v => v.validated).length;
  const pendingCount = values.length - validatedCount;

  return (
    <div className="space-y-6">
      {/* Institutional banner */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-foreground mb-1">Transparência e Governança</p>
              <p className="text-muted-foreground">
                Este diagnóstico foi parcialmente pré-preenchido com dados oficiais de bases públicas 
                nacionais (IBGE, DATASUS, INEP, Tesouro Nacional). Todos os dados devem ser validados 
                pelo usuário responsável antes do cálculo dos indicadores e recomendações.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

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
                    <TableHead>Confiança</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {values.map((value) => {
                    const sourceInfo = SOURCE_INFO[value.source_code];
                    const confidenceInfo = CONFIDENCE_LABELS[value.confidence_level];
                    const isEdited = editedValues[value.id] !== undefined;
                    const displayValue = isEdited ? editedValues[value.id] : value.raw_value;

                    return (
                      <TableRow key={value.id} className={cn(value.validated && 'bg-muted/30')}>
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.has(value.id)}
                            onCheckedChange={(checked) => handleSelectOne(value.id, !!checked)}
                            disabled={value.validated}
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
                          {value.validated ? (
                            <span className="font-mono">{displayValue?.toLocaleString('pt-BR')}</span>
                          ) : (
                            <Input
                              type="number"
                              step="any"
                              value={displayValue ?? ''}
                              onChange={(e) => handleValueChange(value.id, e.target.value)}
                              className={cn(
                                'w-28 h-8 text-right font-mono',
                                isEdited && 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                              )}
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="gap-1">
                            <span>{sourceInfo?.icon}</span>
                            {sourceInfo?.name || value.source_code}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-muted-foreground">
                            {value.reference_year || '—'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((level) => (
                              <Star
                                key={level}
                                className={cn(
                                  'h-3 w-3',
                                  level <= value.confidence_level
                                    ? 'fill-amber-400 text-amber-400'
                                    : 'text-muted-foreground/30'
                                )}
                              />
                            ))}
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  <Info className="h-3 w-3 text-muted-foreground ml-1" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className={confidenceInfo?.color}>{confidenceInfo?.label}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </TableCell>
                        <TableCell>
                          {value.validated ? (
                            <Badge variant="default" className="bg-green-500">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Validado
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Pendente
                            </Badge>
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
