import { useState, useRef } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
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
  AlertTriangle,
  Info,
  Database,
  Shield,
  ShieldAlert,
  ShieldCheck,
  FileText,
  PenLine,
  Download,
  HelpCircle,
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
  const [activeTab, setActiveTab] = useState<string>('formulario');

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

  const handleSaveAllValues = async () => {
    if (!selectedAssessment || Object.keys(editedValues).length === 0) return;

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

  const pillarNames = {
    RA: 'Relações Ambientais',
    OE: 'Organização Estrutural',
    AO: 'Ações Operacionais',
  };

  // Group indicators by pillar
  const indicatorsByPillar = indicators.reduce((acc, ind) => {
    const pillar = ind.pillar as 'RA' | 'OE' | 'AO';
    if (!acc[pillar]) acc[pillar] = [];
    acc[pillar].push(ind);
    return acc;
  }, {} as Record<string, typeof indicators>);

  // Calculate fill progress
  const filledCount = indicators.filter(ind => {
    const value = getValueForIndicator(ind.id);
    return value !== null && value !== undefined;
  }).length;
  const fillProgress = indicators.length > 0 ? (filledCount / indicators.length) * 100 : 0;

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
    <AppLayout 
      title="Preenchimento de Dados" 
      subtitle="Importe ou preencha os valores dos indicadores"
    >
      {/* Assessment Selector */}
      <Card className="mb-6">
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
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Selecionar diagnóstico" />
              </SelectTrigger>
              <SelectContent>
                {assessments?.filter(a => a.status !== 'CALCULATED').map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.title} - {(a.destinations as any)?.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {selectedAssessment && (
        <>
          {/* Progress */}
          <Card className="mb-6">
            <CardContent className="py-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Progresso do Preenchimento</span>
                <span className="text-sm text-muted-foreground">
                  {filledCount} de {indicators.length} indicadores
                </span>
              </div>
              <Progress value={fillProgress} className="h-2" />
              {fillProgress === 100 && (
                <p className="text-sm text-severity-good mt-2 flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4" />
                  Todos os indicadores preenchidos! O diagnóstico pode ser calculado.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Tabs for Form vs CSV */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
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
              {/* Action bar */}
              {Object.keys(editedValues).length > 0 && (
                <Card className="border-accent">
                  <CardContent className="py-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">
                        {Object.keys(editedValues).length} valor(es) não salvo(s)
                      </span>
                      <Button onClick={handleSaveAllValues} disabled={bulkUpsertValues.isPending}>
                        <Save className="mr-2 h-4 w-4" />
                        Salvar Todos
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

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
                            
                            return (
                              <div key={indicator.id} className="grid grid-cols-12 gap-4 items-center py-2 border-b last:border-0">
                                <div className="col-span-1">
                                  <span className="font-mono text-xs text-muted-foreground">
                                    {indicator.code}
                                  </span>
                                </div>
                                <div className="col-span-6">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-sm">{indicator.name}</span>
                                    {indicator.description && (
                                      <Tooltip>
                                        <TooltipTrigger>
                                          <HelpCircle className="h-4 w-4 text-muted-foreground" />
                                        </TooltipTrigger>
                                        <TooltipContent className="max-w-xs">
                                          {indicator.description}
                                        </TooltipContent>
                                      </Tooltip>
                                    )}
                                  </div>
                                  <span className="text-xs text-muted-foreground">
                                    {indicator.unit && `Unidade: ${indicator.unit}`}
                                    {indicator.min_ref !== null && indicator.max_ref !== null && 
                                      ` | Ref: ${indicator.min_ref} - ${indicator.max_ref}`
                                    }
                                  </span>
                                </div>
                                <div className="col-span-3">
                                  <Input
                                    type="number"
                                    step="any"
                                    value={currentValue ?? ''}
                                    onChange={(e) => handleValueChange(indicator.id, e.target.value)}
                                    className={cn(
                                      'w-full',
                                      hasUnsavedChanges && 'border-accent ring-1 ring-accent'
                                    )}
                                    placeholder="Valor"
                                  />
                                </div>
                                <div className="col-span-2 flex justify-end">
                                  {hasUnsavedChanges && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleSaveValue(indicator.id)}
                                      disabled={upsertValue.isPending}
                                    >
                                      <Save className="h-3 w-3" />
                                    </Button>
                                  )}
                                  {!hasUnsavedChanges && currentValue !== null && (
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
              {/* CSV Format Help */}
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

              {/* Upload Section */}
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

                  {/* Parsed Preview */}
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
    </AppLayout>
  );
};

export default Importacoes;
