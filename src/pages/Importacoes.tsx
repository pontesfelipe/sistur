import { useState, useRef } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  AlertCircle,
  CheckCircle2,
  Upload,
  FileSpreadsheet,
  Save,
  AlertTriangle,
  Info,
  Database,
  Shield,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { useIndicators, useIndicatorValues } from '@/hooks/useIndicators';
import { useAssessments } from '@/hooks/useAssessments';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type CollectionType = 'AUTOMATICA' | 'MANUAL' | 'ESTIMADA';
type DataSource = 'IBGE' | 'CADASTUR' | 'PESQUISA_LOCAL' | 'MANUAL' | 'OUTRO';

interface ParsedRow {
  indicator_code: string;
  value: number | null;
  source?: string;
  valid: boolean;
  error?: string;
}

const reliabilityIcons = {
  AUTOMATICA: { icon: ShieldCheck, color: 'text-severity-good', label: 'Alta confiança' },
  MANUAL: { icon: Shield, color: 'text-severity-moderate', label: 'Média confiança' },
  ESTIMADA: { icon: ShieldAlert, color: 'text-severity-critical', label: 'Baixa confiança' },
};

const sourceLabels: Record<DataSource, string> = {
  IBGE: 'IBGE',
  CADASTUR: 'Cadastur',
  PESQUISA_LOCAL: 'Pesquisa Local',
  MANUAL: 'Manual',
  OUTRO: 'Outro',
};

const Importacoes = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedAssessment, setSelectedAssessment] = useState<string>('');
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [editedValues, setEditedValues] = useState<Record<string, { value: number | null; source: string }>>({});

  const { indicators, isLoading: loadingIndicators } = useIndicators();
  const { assessments, isLoading: loadingAssessments } = useAssessments();
  const { values, isLoading: loadingValues, upsertValue, bulkUpsertValues } = useIndicatorValues(selectedAssessment);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());
      
      // Skip header line
      const dataLines = lines.slice(1);
      
      const parsed: ParsedRow[] = dataLines.map(line => {
        const [code, valueStr, source] = line.split(',').map(s => s.trim());
        const value = parseFloat(valueStr);
        
        const indicator = indicators.find(i => i.code === code);
        
        if (!indicator) {
          return { indicator_code: code, value: null, source, valid: false, error: 'Código não encontrado' };
        }
        
        if (isNaN(value)) {
          return { indicator_code: code, value: null, source, valid: false, error: 'Valor inválido' };
        }

        return { indicator_code: code, value, source, valid: true };
      });

      setParsedData(parsed);
      toast.success(`${parsed.filter(p => p.valid).length} linhas válidas de ${parsed.length}`);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!selectedAssessment || parsedData.length === 0) return;

    const validRows = parsedData.filter(p => p.valid);
    const importData = validRows.map(row => {
      const indicator = indicators.find(i => i.code === row.indicator_code);
      return {
        assessment_id: selectedAssessment,
        indicator_id: indicator!.id,
        value_raw: row.value,
        source: row.source || 'CSV Import',
      };
    });

    await bulkUpsertValues.mutateAsync(importData);
    setParsedData([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleValueChange = (indicatorId: string, value: string) => {
    setEditedValues(prev => ({
      ...prev,
      [indicatorId]: {
        ...prev[indicatorId],
        value: value === '' ? null : parseFloat(value),
        source: prev[indicatorId]?.source || 'Manual',
      },
    }));
  };

  const handleSaveValue = async (indicatorId: string) => {
    if (!selectedAssessment) return;
    
    const edited = editedValues[indicatorId];
    if (!edited) return;

    await upsertValue.mutateAsync({
      assessment_id: selectedAssessment,
      indicator_id: indicatorId,
      value_raw: edited.value,
      source: edited.source,
    });

    setEditedValues(prev => {
      const next = { ...prev };
      delete next[indicatorId];
      return next;
    });
  };

  const getValueForIndicator = (indicatorId: string) => {
    if (editedValues[indicatorId] !== undefined) {
      return editedValues[indicatorId].value;
    }
    const existing = values.find(v => v.indicator_id === indicatorId);
    return existing?.value_raw ?? null;
  };

  const pillarNames = {
    RA: 'Relações Ambientais',
    OE: 'Organização Estrutural',
    AO: 'Ações Operacionais',
  };

  return (
    <AppLayout 
      title="Fonte Única da Verdade" 
      subtitle="Importação e edição de dados dos indicadores"
    >
      {/* Assessment Selector */}
      <div className="bg-card rounded-xl border p-6 mb-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Database className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Selecione o Diagnóstico</h3>
              <p className="text-sm text-muted-foreground">
                Escolha o diagnóstico para importar ou editar dados
              </p>
            </div>
          </div>
          <Select value={selectedAssessment} onValueChange={setSelectedAssessment}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Selecionar diagnóstico" />
            </SelectTrigger>
            <SelectContent>
              {assessments?.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {selectedAssessment && (
        <>
          {/* CSV Import Section */}
          <div className="bg-card rounded-xl border p-6 mb-6">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-accent/10">
                  <FileSpreadsheet className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <h3 className="font-semibold">Importar CSV</h3>
                  <p className="text-sm text-muted-foreground">
                    Formato: código,valor,fonte (uma linha por indicador)
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="mr-2 h-4 w-4" />
                  Selecionar Arquivo
                </Button>
                {parsedData.length > 0 && (
                  <Button onClick={handleImport} disabled={bulkUpsertValues.isPending}>
                    <Save className="mr-2 h-4 w-4" />
                    Importar {parsedData.filter(p => p.valid).length} linhas
                  </Button>
                )}
              </div>
            </div>

            {/* Parsed Preview */}
            {parsedData.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Código</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Fonte</TableHead>
                      <TableHead>Mensagem</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedData.slice(0, 10).map((row, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          {row.valid ? (
                            <CheckCircle2 className="h-4 w-4 text-severity-good" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-severity-critical" />
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-sm">{row.indicator_code}</TableCell>
                        <TableCell>{row.value ?? '—'}</TableCell>
                        <TableCell>{row.source || '—'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {row.error || 'OK'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {parsedData.length > 10 && (
                  <div className="p-2 text-center text-sm text-muted-foreground border-t">
                    +{parsedData.length - 10} linhas adicionais
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Manual Data Entry Table */}
          <div className="bg-card rounded-xl border overflow-hidden">
            <div className="p-4 border-b">
              <h3 className="font-semibold">Edição Manual de Dados</h3>
              <p className="text-sm text-muted-foreground">
                Preencha ou edite os valores dos indicadores diretamente
              </p>
            </div>

            {loadingIndicators ? (
              <div className="p-8 space-y-3">
                {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-24">Código</TableHead>
                    <TableHead>Indicador</TableHead>
                    <TableHead className="w-20">Pilar</TableHead>
                    <TableHead className="w-24">Confiança</TableHead>
                    <TableHead className="w-32">Valor</TableHead>
                    <TableHead className="w-24"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {indicators.map((indicator) => {
                    const currentValue = getValueForIndicator(indicator.id);
                    const hasUnsavedChanges = editedValues[indicator.id] !== undefined;
                    const collectionType = (indicator as any).collection_type as CollectionType | undefined;
                    const reliability = reliabilityIcons[collectionType || 'MANUAL'];
                    const ReliabilityIcon = reliability.icon;

                    return (
                      <TableRow key={indicator.id}>
                        <TableCell className="font-mono text-sm">
                          {indicator.code}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{indicator.name}</span>
                            {indicator.description && (
                              <Tooltip>
                                <TooltipTrigger>
                                  <Info className="h-4 w-4 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                  {indicator.description}
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">{indicator.theme}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={indicator.pillar.toLowerCase() as 'ra' | 'oe' | 'ao'}>
                            {indicator.pillar}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Tooltip>
                            <TooltipTrigger>
                              <div className="flex items-center gap-1.5">
                                <ReliabilityIcon className={cn('h-4 w-4', reliability.color)} />
                                <span className="text-xs text-muted-foreground">
                                  {Math.round(((indicator as any).reliability_score || 0.7) * 100)}%
                                </span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              {reliability.label} ({collectionType || 'MANUAL'})
                            </TooltipContent>
                          </Tooltip>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="any"
                            value={currentValue ?? ''}
                            onChange={(e) => handleValueChange(indicator.id, e.target.value)}
                            className={cn(
                              'w-full',
                              hasUnsavedChanges && 'border-accent'
                            )}
                            placeholder="—"
                          />
                        </TableCell>
                        <TableCell>
                          {hasUnsavedChanges && (
                            <Button
                              size="sm"
                              onClick={() => handleSaveValue(indicator.id)}
                              disabled={upsertValue.isPending}
                            >
                              <Save className="h-3 w-3 mr-1" />
                              Salvar
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}

            {indicators.length === 0 && !loadingIndicators && (
              <div className="p-8 text-center text-muted-foreground">
                <AlertTriangle className="mx-auto h-8 w-8 mb-2" />
                <p>Nenhum indicador cadastrado. Cadastre indicadores primeiro.</p>
              </div>
            )}
          </div>
        </>
      )}

      {!selectedAssessment && (
        <div className="bg-card rounded-xl border p-16 text-center">
          <Database className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Selecione um Diagnóstico</h3>
          <p className="text-muted-foreground">
            Escolha um diagnóstico acima para começar a importar ou editar dados.
          </p>
        </div>
      )}
    </AppLayout>
  );
};

export default Importacoes;
