import { useState, useRef, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  AlertCircle,
  CheckCircle2,
  Upload,
  FileSpreadsheet,
  Save,
  Info,
  Database,
  Shield,
  ShieldAlert,
  ShieldCheck,
  PenLine,
  Download,
  HelpCircle,
  Calculator,
  Loader2,
  Hotel,
  Landmark,
  EyeOff,
} from 'lucide-react';
import { useIndicators, useIndicatorValues } from '@/hooks/useIndicators';
import { useAssessments } from '@/hooks/useAssessments';
import { useCalculateAssessment } from '@/hooks/useCalculateAssessment';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { validateIndicatorValue, getValidationForIndicator } from '@/data/enterpriseIndicatorGuidance';
import { EnterpriseDataEntryPanel } from '@/components/enterprise/EnterpriseDataEntryPanel';

interface DataImportPanelProps {
  preSelectedAssessmentId?: string;
}

interface ParsedRow {
  indicator_code: string;
  value: number | null;
  source?: string;
  valid: boolean;
  error?: string;
}

const officialSources = ['IBGE', 'DATASUS', 'INEP', 'STN', 'CADASTUR', 'Pré-preenchido'];

const pillarNames = {
  RA: 'Relações Ambientais',
  OE: 'Organização Estrutural',
  AO: 'Ações Operacionais',
};

export function DataImportPanel({ preSelectedAssessmentId }: DataImportPanelProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedAssessment, setSelectedAssessment] = useState<string>(preSelectedAssessmentId || '');
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [editedValues, setEditedValues] = useState<Record<string, { value: number | null; source: string; is_ignored?: boolean; _rawInput?: string }>>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string | null>>({});
  const [activeTab, setActiveTab] = useState<string>('formulario');

  const { assessments, isLoading: loadingAssessments, updateAssessment } = useAssessments();
  const { values, isLoading: loadingValues, upsertValue, bulkUpsertValues } = useIndicatorValues(selectedAssessment);
  const { calculate, loading: calculating } = useCalculateAssessment();

  // Get the selected assessment's tier and type FIRST
  const selectedAssessmentData = assessments?.find(a => a.id === selectedAssessment);
  const assessmentTier = (selectedAssessmentData?.tier || 'COMPLETE') as 'SMALL' | 'MEDIUM' | 'COMPLETE';
  const isEnterpriseAssessment = selectedAssessmentData?.diagnostic_type === 'enterprise';

  // Use unified indicators with scope filter based on diagnostic type
  const { indicators, isLoading: loadingIndicators } = useIndicators({
    scope: isEnterpriseAssessment ? 'enterprise' : 'territorial',
    tier: assessmentTier,
  });

  const { profile } = useProfile();
  const [hasAutoInjected, setHasAutoInjected] = useState(false);

  useEffect(() => {
    if (preSelectedAssessmentId && assessments?.length) {
      const exists = assessments.some(a => a.id === preSelectedAssessmentId);
      if (exists) {
        setSelectedAssessment(preSelectedAssessmentId);
      }
    }
  }, [preSelectedAssessmentId, assessments]);

  // Auto-inject validated external indicator values into indicator_values
  // so pre-filled data appears in the form
  useEffect(() => {
    if (
      hasAutoInjected ||
      !selectedAssessment ||
      !selectedAssessmentData ||
      isEnterpriseAssessment ||
      loadingIndicators ||
      loadingValues ||
      !indicators.length
    ) return;

    const destinationId = selectedAssessmentData.destination_id;
    if (!destinationId) return;

    const doInject = async () => {
      try {
        // Get IBGE code for this destination
        const { data: dest } = await supabase
          .from('destinations')
          .select('ibge_code')
          .eq('id', destinationId)
          .single();

        if (!dest?.ibge_code) return;

        const effectiveOrgId = profile?.viewing_demo_org_id || profile?.org_id;
        if (!effectiveOrgId) return;

        // Fetch validated external values
        const { data: extValues } = await supabase
          .from('external_indicator_values')
          .select('*')
          .eq('municipality_ibge_code', dest.ibge_code)
          .eq('validated', true);

        if (!extValues?.length) return;

        // Map indicator codes to IDs
        const codeToIndicator = new Map(indicators.map(ind => [ind.code, ind]));

        // Find which indicators already have values
        const existingIndicatorIds = new Set(values.map(v => v.indicator_id));

        const toInsert: Array<{
          assessment_id: string;
          indicator_id: string;
          value_raw: number;
          source: string;
          org_id: string;
          reference_date: string | null;
        }> = [];

        for (const ext of extValues) {
          const indicator = codeToIndicator.get(ext.indicator_code);
          if (!indicator) continue;
          if (existingIndicatorIds.has(indicator.id)) continue;
          if (ext.raw_value === null) continue;

          toInsert.push({
            assessment_id: selectedAssessment,
            indicator_id: indicator.id,
            value_raw: Number(ext.raw_value),
            source: `Pré-preenchido (${ext.source_code})`,
            org_id: effectiveOrgId,
            reference_date: ext.reference_year ? `${ext.reference_year}-01-01` : null,
          });
        }

        if (toInsert.length > 0) {
          for (const val of toInsert) {
            await supabase.from('indicator_values').insert(val);
          }
          // Refetch indicator values to update the form
          await queryClient.invalidateQueries({ queryKey: ['indicator-values', selectedAssessment] });
          toast.success(`${toInsert.length} indicadores pré-preenchidos automaticamente`);
        }

        setHasAutoInjected(true);
      } catch (err) {
        console.error('Error auto-injecting external values:', err);
        setHasAutoInjected(true);
      }
    };

    doInject();
  }, [selectedAssessment, selectedAssessmentData, isEnterpriseAssessment, loadingIndicators, loadingValues, indicators, values, hasAutoInjected, profile]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Cap file size (5 MB) to prevent locking the page on a bad drop.
    const MAX_BYTES = 5 * 1024 * 1024;
    if (file.size > MAX_BYTES) {
      toast.error('Arquivo muito grande', { description: 'Tamanho máximo: 5 MB.' });
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Detect separator from first data-bearing line (`;` for pt-BR Excel, `,` otherwise)
    const detectSeparator = (text: string): string => {
      const firstLine = text.split(/\r?\n/).find(l => l.trim().length > 0) || '';
      // Count occurrences outside quoted fields
      let semiCount = 0, commaCount = 0, inQ = false;
      for (const ch of firstLine) {
        if (ch === '"') { inQ = !inQ; continue; }
        if (!inQ && ch === ';') semiCount++;
        if (!inQ && ch === ',') commaCount++;
      }
      return semiCount >= commaCount && semiCount > 0 ? ';' : ',';
    };

    const parseCsvLine = (line: string, separator: string): string[] => {
      // Minimal CSV tokenizer supporting quoted fields and escaped quotes ("").
      const result: string[] = [];
      let field = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (inQuotes) {
          if (ch === '"') {
            if (line[i + 1] === '"') { field += '"'; i++; }
            else { inQuotes = false; }
          } else {
            field += ch;
          }
        } else if (ch === '"') {
          inQuotes = true;
        } else if (ch === separator) {
          result.push(field);
          field = '';
        } else {
          field += ch;
        }
      }
      result.push(field);
      return result.map(s => s.trim());
    };

    const reader = new FileReader();
    reader.onerror = () => {
      toast.error('Não foi possível ler o arquivo.');
    };
    reader.onload = (e) => {
      const buffer = e.target?.result as ArrayBuffer;
      if (!buffer) {
        toast.error('Arquivo vazio.');
        return;
      }

      // Try UTF-8 first; if it produces replacement chars, fall back to Latin1 (Windows-1252)
      let text = new TextDecoder('utf-8').decode(buffer);
      if (text.includes('\uFFFD')) {
        text = new TextDecoder('windows-1252').decode(buffer);
      }

      // Strip UTF-8 BOM if present so the first header cell matches.
      const cleaned = text.replace(/^\uFEFF/, '');
      const sep = detectSeparator(cleaned);
      const lines = cleaned.split(/\r?\n/).filter(line => line.trim().length > 0);

      if (lines.length < 2) {
        toast.error('CSV sem linhas de dados', {
          description: 'Inclua o cabeçalho e ao menos uma linha de dados.',
        });
        return;
      }

      const dataLines = lines.slice(1);

      const parsed: ParsedRow[] = dataLines.map((line, idx) => {
        const rowNumber = idx + 2; // account for header
        const cells = parseCsvLine(line, sep);

        if (cells.length < 2) {
          return {
            indicator_code: '',
            value: null,
            source: '',
            valid: false,
            error: `Linha ${rowNumber}: colunas insuficientes (esperado código,valor[,fonte])`,
          };
        }

        const [code, valueStr, source = ''] = cells;

        if (!code) {
          return {
            indicator_code: '',
            value: null,
            source,
            valid: false,
            error: `Linha ${rowNumber}: código do indicador vazio`,
          };
        }

        const indicator = indicators.find(i => i.code === code);
        if (!indicator) {
          return { indicator_code: code, value: null, source, valid: false, error: 'Código não encontrado' };
        }

        // Parse value as number; accept comma decimal separator (pt-BR CSVs).
        const normalized = valueStr.replace(/\./g, '').replace(',', '.');
        const value = parseFloat(normalized);
        if (!Number.isFinite(value)) {
          return { indicator_code: code, value: null, source, valid: false, error: 'Valor inválido (deve ser numérico)' };
        }

        return { indicator_code: code, value, source, valid: true };
      });

      setParsedData(parsed);
      const validCount = parsed.filter(p => p.valid).length;
      const errorCount = parsed.length - validCount;
      if (errorCount === 0) {
        toast.success(`${validCount} linhas válidas`);
      } else {
        toast.warning(`${validCount} válidas, ${errorCount} com erro`, {
          description: 'Revise a tabela abaixo antes de importar.',
        });
      }
    };
    reader.readAsArrayBuffer(file);
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

  // Format number for display in pt-BR (comma as decimal separator)
  const formatDisplayValue = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return '';
    return value.toLocaleString('pt-BR', { maximumFractionDigits: 10 });
  };

  // Format validation hint numbers in pt-BR
  const formatHintNumber = (value: number | undefined): string => {
    if (value === undefined) return '';
    return value.toLocaleString('pt-BR', { maximumFractionDigits: 10 });
  };

  // Parse Brazilian formatted input (comma → dot) to number
  const parseBRInput = (value: string): number | null => {
    if (value === '') return null;
    // Replace comma with dot for parsing
    const normalized = value.replace(/\./g, '').replace(',', '.');
    const num = parseFloat(normalized);
    return isNaN(num) ? null : num;
  };

  const handleValueChange = (indicatorId: string, value: string) => {
    const indicator = indicators.find(i => i.id === indicatorId);
    
    // Normalize for validation (comma → dot)
    const normalizedValue = value.replace(',', '.');
    
    // Validate the value
    if (indicator) {
      const error = validateIndicatorValue(normalizedValue, indicator as any);
      setValidationErrors(prev => ({ ...prev, [indicatorId]: error }));
    }

    setEditedValues(prev => ({
      ...prev,
      [indicatorId]: {
        ...prev[indicatorId],
        value: parseBRInput(value),
        source: prev[indicatorId]?.source || 'Manual',
        is_ignored: prev[indicatorId]?.is_ignored ?? false,
      },
    }));
  };

  const handleToggleIgnore = async (indicatorId: string) => {
    if (!selectedAssessment) return;
    
    const existingValue = values.find(v => v.indicator_id === indicatorId);
    const currentIgnored = existingValue?.is_ignored ?? false;
    const newIgnored = !currentIgnored;
    
    // If there's already a saved value, update it directly
    if (existingValue) {
      await upsertValue.mutateAsync({
        assessment_id: selectedAssessment,
        indicator_id: indicatorId,
        value_raw: existingValue.value_raw,
        source: existingValue.source,
        is_ignored: newIgnored,
        ignore_reason: newIgnored ? 'Marcado como não aplicável pelo usuário' : null,
      });
    } else {
      // Create a new entry marked as ignored (with null value)
      await upsertValue.mutateAsync({
        assessment_id: selectedAssessment,
        indicator_id: indicatorId,
        value_raw: null,
        source: 'Manual',
        is_ignored: newIgnored,
        ignore_reason: newIgnored ? 'Marcado como não aplicável pelo usuário' : null,
      });
    }
  };

  const handleSaveValue = async (indicatorId: string) => {
    if (!selectedAssessment) return;
    
    const edited = editedValues[indicatorId];
    if (!edited) return;

    // Block save if validation error
    if (validationErrors[indicatorId]) {
      toast.error('Corrija o valor antes de salvar');
      return;
    }

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

  const handleSaveAllValues = async () => {
    if (!selectedAssessment || Object.keys(editedValues).length === 0) return;

    // Check for validation errors
    const activeErrors = Object.entries(validationErrors).filter(([id, err]) => err && editedValues[id]);
    if (activeErrors.length > 0) {
      toast.error('Corrija os erros de validação antes de salvar', {
        description: `${activeErrors.length} indicador(es) com valores inválidos`,
      });
      return;
    }

    const dataToSave = Object.entries(editedValues).map(([indicatorId, data]) => ({
      assessment_id: selectedAssessment,
      indicator_id: indicatorId,
      value_raw: data.value,
      source: data.source,
    }));

    await bulkUpsertValues.mutateAsync(dataToSave);
    setEditedValues({});
    toast.success('Todos os valores foram salvos!');
  };

  const getValueForIndicator = (indicatorId: string) => {
    if (editedValues[indicatorId] !== undefined) {
      return editedValues[indicatorId].value;
    }
    const existing = values.find(v => v.indicator_id === indicatorId);
    return existing?.value_raw ?? null;
  };

  const indicatorsByPillar = indicators.reduce((acc, ind) => {
    const pillar = ind.pillar as 'RA' | 'OE' | 'AO';
    if (!acc[pillar]) acc[pillar] = [];
    acc[pillar].push(ind);
    return acc;
  }, {} as Record<string, typeof indicators>);

  const ignoredCount = values.filter(v => v.is_ignored === true).length;
  const activeIndicators = indicators.filter(ind => {
    const existing = values.find(v => v.indicator_id === ind.id);
    return existing?.is_ignored !== true;
  });
  
  const filledCount = activeIndicators.filter(ind => {
    const value = getValueForIndicator(ind.id);
    return value !== null && value !== undefined;
  }).length;
  const fillProgress = activeIndicators.length > 0 ? (filledCount / activeIndicators.length) * 100 : 0;

  // Promote DRAFT assessments to DATA_READY once all active indicators are
  // filled, so they show up under the "Dados Prontos" bucket on the listing
  // page even before the user clicks "Calcular". Only runs once per fill
  // transition — we don't downgrade from DATA_READY back to DRAFT here to
  // avoid clobbering status manually set elsewhere.
  useEffect(() => {
    if (!selectedAssessment || !selectedAssessmentData) return;
    if (selectedAssessmentData.status !== 'DRAFT') return;
    if (activeIndicators.length === 0) return;
    if (fillProgress < 100) return;
    if (Object.keys(editedValues).length > 0) return;
    if (updateAssessment.isPending) return;

    updateAssessment.mutate({ id: selectedAssessment, status: 'DATA_READY' });
  }, [selectedAssessment, selectedAssessmentData, activeIndicators.length, fillProgress, editedValues, updateAssessment]);

  const preFilledCount = values.filter(v => {
    if (v.is_ignored) return false;
    const source = v.source || '';
    return officialSources.some(s => source.toUpperCase().includes(s.toUpperCase()));
  }).length;
  const manualCount = filledCount - preFilledCount;

  const downloadTemplate = () => {
    const header = 'codigo,valor,fonte';
    const rows = indicators.map(ind => `${ind.code},,`);
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template_indicadores.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Assessment Selector */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Database className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Selecione o Diagnóstico</h3>
                <p className="text-sm text-muted-foreground">
                  Escolha o diagnóstico para preencher os dados
                </p>
              </div>
            </div>
            <Select value={selectedAssessment} onValueChange={setSelectedAssessment}>
              <SelectTrigger className="w-72">
                <SelectValue placeholder="Selecionar diagnóstico" />
              </SelectTrigger>
              <SelectContent>
                {assessments?.filter(a => a.status !== 'CALCULATED').map((a) => {
                  const isEnterprise = a.diagnostic_type === 'enterprise';
                  return (
                    <SelectItem key={a.id} value={a.id}>
                      <div className="flex items-center gap-2">
                        {isEnterprise ? (
                          <Hotel className="h-4 w-4 text-amber-600" />
                        ) : (
                          <Landmark className="h-4 w-4 text-blue-600" />
                        )}
                        <span>{a.title} - {(a.destinations as any)?.name}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          {selectedAssessmentData && (
            <div className="mt-3 pt-3 border-t flex items-center gap-2 text-sm text-muted-foreground">
              {isEnterpriseAssessment ? (
                <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                  <Hotel className="h-3 w-3 mr-1" />
                  Enterprise
                </Badge>
              ) : (
                <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                  <Landmark className="h-3 w-3 mr-1" />
                  Territorial
                </Badge>
              )}
              <Badge variant="outline">
                Nível: {assessmentTier === 'SMALL' ? 'Essencial' : assessmentTier === 'MEDIUM' ? 'Estratégico' : 'Integral'}
              </Badge>
              {!isEnterpriseAssessment && (
                <span>
                  {indicators.length} indicadores para este nível
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Render Enterprise Panel for Enterprise diagnostics */}
      {selectedAssessment && isEnterpriseAssessment && (
        <EnterpriseDataEntryPanel 
          assessmentId={selectedAssessment} 
          tier={assessmentTier as 'SMALL' | 'MEDIUM' | 'COMPLETE'}
          onComplete={() => {
            navigate(`/diagnosticos/${selectedAssessment}`);
          }}
        />
      )}

      {/* Render Territorial Panel for non-Enterprise diagnostics */}
      {selectedAssessment && !isEnterpriseAssessment && (
        <>
          {/* Progress */}
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Progresso do Preenchimento</span>
                <span className="text-sm text-muted-foreground">
                  {filledCount} de {activeIndicators.length} indicadores
                  {ignoredCount > 0 && (
                    <span className="text-destructive ml-1">({ignoredCount} ignorado{ignoredCount > 1 ? 's' : ''})</span>
                  )}
                </span>
              </div>
              <Progress value={fillProgress} className="h-2" />
              
              {filledCount > 0 && (
                <div className="flex items-center gap-4 mt-3 pt-3 border-t">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-primary" />
                    <span className="text-xs text-muted-foreground">
                      Pré-preenchido: <strong className="text-foreground">{preFilledCount}</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-accent" />
                    <span className="text-xs text-muted-foreground">
                      Manual: <strong className="text-foreground">{manualCount}</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-2 ml-auto">
                    <Database className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {preFilledCount > 0 
                        ? `${Math.round((preFilledCount / filledCount) * 100)}% dos dados de fontes oficiais`
                        : 'Nenhum dado pré-preenchido ainda'}
                    </span>
                  </div>
                </div>
              )}
              
              {/* Show calculate button when at least 50% filled */}
              {fillProgress >= 50 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <p className={cn(
                    "text-sm flex items-center gap-1",
                    fillProgress === 100 ? "text-severity-good" : "text-severity-moderate"
                  )}>
                    <CheckCircle2 className="h-4 w-4" />
                    {fillProgress === 100 
                      ? "Todos os indicadores preenchidos! O diagnóstico pode ser calculado."
                      : `${Math.round(fillProgress)}% dos indicadores preenchidos. O diagnóstico pode ser calculado.`
                    }
                  </p>
                  <Button 
                    onClick={async () => {
                      const result = await calculate(selectedAssessment);
                      if (result) {
                        navigate(`/diagnosticos/${selectedAssessment}`);
                      }
                    }}
                    disabled={calculating || Object.keys(editedValues).length > 0}
                    className="gap-2"
                  >
                    {calculating ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Calculando...
                      </>
                    ) : (
                      <>
                        <Calculator className="h-4 w-4" />
                        Calcular Diagnóstico
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tabs for Form vs CSV */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="formulario" className="gap-2">
                <PenLine className="h-4 w-4" />
                Formulário
              </TabsTrigger>
              <TabsTrigger value="csv" className="gap-2">
                <FileSpreadsheet className="h-4 w-4" />
                Importar CSV
              </TabsTrigger>
            </TabsList>

            {/* Form Tab */}
            <TabsContent value="formulario" className="space-y-6">
              {Object.keys(editedValues).length > 0 && (() => {
                const errorCount = Object.entries(validationErrors).filter(([id, err]) => err && editedValues[id]).length;
                return (
                <Card className={cn("border-accent", errorCount > 0 && "border-destructive")}>
                  <CardContent className="py-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm space-y-1">
                        <span>{Object.keys(editedValues).length} valor(es) não salvo(s)</span>
                        {errorCount > 0 && (
                          <p className="text-destructive flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            {errorCount} com erro de validação
                          </p>
                        )}
                      </div>
                      <Button onClick={handleSaveAllValues} disabled={bulkUpsertValues.isPending || errorCount > 0}>
                        <Save className="mr-2 h-4 w-4" />
                        Salvar Todos
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                );
              })()}

              {loadingIndicators ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : (
                <Accordion type="multiple" defaultValue={['RA', 'OE', 'AO']} className="space-y-4">
                  {(['RA', 'OE', 'AO'] as const).map(pillar => (
                    <AccordionItem key={pillar} value={pillar} className="border rounded-lg px-4">
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-3">
                          <Badge variant={pillar.toLowerCase() as 'ra' | 'oe' | 'ao'}>
                            {pillar}
                          </Badge>
                          <span className="font-semibold">{pillarNames[pillar]}</span>
                          <span className="text-sm text-muted-foreground">
                            ({indicatorsByPillar[pillar]?.length || 0} indicadores)
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-4 py-2">
                          {indicatorsByPillar[pillar]?.map((indicator) => {
                            const currentValue = getValueForIndicator(indicator.id);
                            const hasUnsavedChanges = editedValues[indicator.id] !== undefined;
                            const existingValue = values.find(v => v.indicator_id === indicator.id);
                            const isPreFilled = existingValue?.source && officialSources.some(s => 
                              existingValue.source?.toUpperCase().includes(s.toUpperCase())
                            );
                            const isIgnored = existingValue?.is_ignored === true;
                            const valError = validationErrors[indicator.id];
                            const valRules = getValidationForIndicator(indicator as any);
                            
                            return (
                              <div key={indicator.id} className={cn(
                                "grid grid-cols-12 gap-3 items-start py-3 border-b last:border-0",
                                isIgnored && "opacity-50",
                                valError && "bg-destructive/5 rounded-lg px-2 -mx-2"
                              )}>
                                <div className="col-span-5">
                                  <div className="flex items-start gap-2">
                                    <span className={cn(
                                      "font-medium text-sm leading-tight",
                                      isIgnored && "line-through"
                                    )}>{indicator.name}</span>
                                    {indicator.description && (
                                      <Tooltip>
                                        <TooltipTrigger>
                                          <HelpCircle className="h-4 w-4 text-muted-foreground shrink-0" />
                                        </TooltipTrigger>
                                        <TooltipContent className="max-w-xs bg-popover text-popover-foreground z-50">
                                          {indicator.description}
                                        </TooltipContent>
                                      </Tooltip>
                                    )}
                                  </div>
                                  <div className="flex flex-wrap items-center gap-1 mt-1">
                                    {indicator.theme && (
                                      <Badge variant="outline" className="text-xs px-1.5 py-0">
                                        {indicator.theme}
                                      </Badge>
                                    )}
                                    {indicator.unit && (
                                      <span className="text-xs text-muted-foreground">
                                        {indicator.unit}
                                      </span>
                                    )}
                                    {!isIgnored && (valRules.min !== undefined || valRules.max !== undefined) && (
                                      <span className="text-xs text-muted-foreground">
                                        ({valRules.min !== undefined ? `mín: ${formatHintNumber(valRules.min)}` : ''}
                                        {valRules.min !== undefined && valRules.max !== undefined ? ' · ' : ''}
                                        {valRules.max !== undefined ? `máx: ${formatHintNumber(valRules.max)}` : ''}
                                        {valRules.integer ? ' · inteiro' : ''})
                                      </span>
                                    )}
                                    {isIgnored && (
                                      <Badge variant="outline" className="text-xs px-1.5 py-0 border-destructive/50 text-destructive">
                                        <EyeOff className="h-3 w-3 mr-1" />
                                        Ignorado
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                <div className="col-span-3">
                                  <div className="relative">
                                    <Input
                                      type="text"
                                      inputMode="decimal"
                                      value={hasUnsavedChanges 
                                        ? (editedValues[indicator.id]?._rawInput ?? formatDisplayValue(currentValue))
                                        : formatDisplayValue(currentValue)
                                      }
                                      onChange={(e) => {
                                        // Allow only digits, comma, dot and minus
                                        const raw = e.target.value;
                                        if (raw !== '' && !/^-?[\d.,]*$/.test(raw)) return;
                                        // Store raw input for display
                                        setEditedValues(prev => ({
                                          ...prev,
                                          [indicator.id]: {
                                            ...prev[indicator.id],
                                            value: parseBRInput(raw),
                                            source: prev[indicator.id]?.source || 'Manual',
                                            is_ignored: prev[indicator.id]?.is_ignored ?? false,
                                            _rawInput: raw,
                                          },
                                        }));
                                        // Validate
                                        if (indicators.find(i => i.id === indicator.id)) {
                                          const normalizedValue = raw.replace(',', '.');
                                          const error = validateIndicatorValue(normalizedValue, indicator as any);
                                          setValidationErrors(prev => ({ ...prev, [indicator.id]: error }));
                                        }
                                      }}
                                      disabled={isIgnored}
                                      className={cn(
                                        'w-full pr-8',
                                        valError && 'border-destructive ring-1 ring-destructive',
                                        !valError && hasUnsavedChanges && 'border-accent ring-1 ring-accent',
                                        !valError && isPreFilled && !hasUnsavedChanges && 'border-primary/40 bg-primary/5',
                                        isIgnored && 'bg-muted cursor-not-allowed'
                                      )}
                                      placeholder={isIgnored ? 'Ignorado' : 'Valor'}
                                    />
                                    {isPreFilled && !hasUnsavedChanges && !isIgnored && !valError && (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <PenLine className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-primary/50 pointer-events-auto cursor-pointer" />
                                        </TooltipTrigger>
                                        <TooltipContent>Clique no campo para editar o valor pré-preenchido</TooltipContent>
                                      </Tooltip>
                                    )}
                                  </div>
                                  {valError && (
                                    <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                                      <AlertCircle className="h-3 w-3 shrink-0" />
                                      {valError}
                                    </p>
                                  )}
                                </div>
                                <div className="col-span-4 flex justify-end items-center gap-1.5">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant={isIgnored ? "destructive" : "ghost"}
                                        className="h-8 w-8 p-0"
                                        onClick={() => handleToggleIgnore(indicator.id)}
                                      >
                                        <EyeOff className="h-3.5 w-3.5" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      {isIgnored ? 'Reativar indicador' : 'Ignorar indicador (não será considerado no cálculo)'}
                                    </TooltipContent>
                                  </Tooltip>
                                  {existingValue?.source && !hasUnsavedChanges && !isIgnored && (
                                    <Tooltip>
                                      <TooltipTrigger>
                                        <Badge 
                                          variant="outline" 
                                          className={cn(
                                            "text-xs",
                                            isPreFilled 
                                              ? "border-primary/50 text-primary bg-primary/10" 
                                              : "border-accent/50 text-accent bg-accent/10"
                                          )}
                                        >
                                          {isPreFilled ? (
                                            <Database className="h-3 w-3 mr-1" />
                                          ) : (
                                            <PenLine className="h-3 w-3 mr-1" />
                                          )}
                                          {existingValue.source.length > 10 
                                            ? existingValue.source.substring(0, 10) + '...' 
                                            : existingValue.source}
                                        </Badge>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        Fonte: {existingValue.source}
                                      </TooltipContent>
                                    </Tooltip>
                                  )}
                                  {hasUnsavedChanges && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleSaveValue(indicator.id)}
                                      disabled={upsertValue.isPending || !!valError}
                                    >
                                      <Save className="h-3 w-3" />
                                    </Button>
                                  )}
                                  {!hasUnsavedChanges && currentValue !== null && !isIgnored && (
                                    <CheckCircle2 className="h-5 w-5 text-severity-good" />
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </TabsContent>

            {/* CSV Tab */}
            <TabsContent value="csv" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Info className="h-5 w-5 text-primary" />
                    Formato do Arquivo CSV
                  </CardTitle>
                  <CardDescription>
                    O arquivo deve seguir exatamente este formato para importação correta
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-muted/50 rounded-lg p-4 font-mono text-sm">
                    <p className="text-muted-foreground mb-2"># Linha de cabeçalho (obrigatória):</p>
                    <p className="text-foreground">codigo,valor,fonte</p>
                    <p className="text-muted-foreground mt-3 mb-2"># Linhas de dados:</p>
                    <p className="text-foreground">RA001,75,IBGE</p>
                    <p className="text-foreground">RA002,92,Pesquisa Local</p>
                    <p className="text-foreground">OE001,8500,Manual</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="p-3 bg-card border rounded-lg">
                      <p className="font-medium mb-1">codigo</p>
                      <p className="text-muted-foreground">Código do indicador (ex: RA001)</p>
                    </div>
                    <div className="p-3 bg-card border rounded-lg">
                      <p className="font-medium mb-1">valor</p>
                      <p className="text-muted-foreground">Valor numérico do indicador</p>
                    </div>
                    <div className="p-3 bg-card border rounded-lg">
                      <p className="font-medium mb-1">fonte</p>
                      <p className="text-muted-foreground">Fonte dos dados (opcional)</p>
                    </div>
                  </div>

                  <Button variant="outline" onClick={downloadTemplate}>
                    <Download className="mr-2 h-4 w-4" />
                    Baixar Template CSV
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Upload className="h-5 w-5 text-primary" />
                    Carregar Arquivo
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-3">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                    <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                      <FileSpreadsheet className="mr-2 h-4 w-4" />
                      Selecionar Arquivo CSV
                    </Button>
                    {parsedData.length > 0 && (
                      <Button onClick={handleImport} disabled={bulkUpsertValues.isPending}>
                        <Save className="mr-2 h-4 w-4" />
                        Importar {parsedData.filter(p => p.valid).length} valores
                      </Button>
                    )}
                  </div>

                  {parsedData.length > 0 && (
                    <div className="mt-4 border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-16">Status</TableHead>
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
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}

      {!selectedAssessment && (
        <Card className="p-16 text-center">
          <Database className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Selecione um Diagnóstico</h3>
          <p className="text-muted-foreground">
            Escolha um diagnóstico acima para começar a preencher os dados dos indicadores.
          </p>
        </Card>
      )}
    </div>
  );
}
