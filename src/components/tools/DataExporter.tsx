import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { 
  Download, 
  FileSpreadsheet, 
  MapPin, 
  Calculator,
  GraduationCap,
  AlertTriangle,
  Loader2
} from 'lucide-react';

type ExportType = 'assessments' | 'destinations' | 'indicators' | 'courses' | 'issues';

export function DataExporter() {
  const [open, setOpen] = useState(false);
  const [exportType, setExportType] = useState<ExportType>('assessments');
  const [loading, setLoading] = useState(false);
  const [includeScores, setIncludeScores] = useState(true);
  const [includeMetadata, setIncludeMetadata] = useState(false);

  const exportData = async () => {
    try {
      setLoading(true);
      let data: Record<string, unknown>[] = [];
      let filename = '';

      switch (exportType) {
        case 'assessments': {
          const { data: assessments, error } = await supabase
            .from('assessments')
            .select(`
              id,
              title,
              status,
              created_at,
              calculated_at,
              period_start,
              period_end,
              destinations(name)
            `)
            .order('created_at', { ascending: false });
          
          if (error) throw error;
          
          data = (assessments || []).map(a => ({
            'ID': a.id,
            'Título': a.title,
            'Destino': (a.destinations as { name: string })?.name || '',
            'Status': a.status,
            'Período Início': a.period_start || '',
            'Período Fim': a.period_end || '',
            'Criado em': a.created_at,
            'Calculado em': a.calculated_at || ''
          }));
          filename = 'diagnosticos';
          break;
        }

        case 'destinations': {
          const { data: destinations, error } = await supabase
            .from('destinations')
            .select('*')
            .order('name');
          
          if (error) throw error;
          
          data = (destinations || []).map(d => ({
            'ID': d.id,
            'Nome': d.name,
            'UF': d.uf || '',
            'Código IBGE': d.ibge_code || '',
            'Latitude': d.latitude || '',
            'Longitude': d.longitude || '',
            'Criado em': d.created_at
          }));
          filename = 'destinos';
          break;
        }

        case 'indicators': {
          const { data: indicators, error } = await supabase
            .from('indicators')
            .select('*')
            .order('pillar, theme, name');
          
          if (error) throw error;
          
          data = (indicators || []).map(i => ({
            'Código': i.code,
            'Nome': i.name,
            'Pilar': i.pillar,
            'Tema': i.theme,
            'Descrição': i.description || '',
            'Unidade': i.unit || '',
            'Peso': i.weight,
            'Direção': i.direction,
            'Normalização': i.normalization,
            'Ref. Mínimo': i.min_ref || '',
            'Ref. Máximo': i.max_ref || '',
            'Fonte': i.data_source || '',
            'Coleta': i.collection_type || ''
          }));
          filename = 'indicadores';
          break;
        }

        case 'courses': {
          const { data: courses, error } = await supabase
            .from('courses')
            .select('*')
            .order('pillar, title');
          
          if (error) throw error;
          
          data = (courses || []).map(c => ({
            'ID': c.id,
            'Título': c.title,
            'Descrição': c.description || '',
            'Pilar': c.pillar || '',
            'Tema': c.theme || '',
            'Nível': c.level,
            'Duração (min)': c.duration_minutes || '',
            'Agente Alvo': c.target_agent || '',
            'URL': c.url || ''
          }));
          filename = 'cursos';
          break;
        }

        case 'issues': {
          const { data: issues, error } = await supabase
            .from('issues')
            .select(`
              *,
              assessments(title)
            `)
            .order('created_at', { ascending: false });
          
          if (error) throw error;
          
          data = (issues || []).map(i => ({
            'ID': i.id,
            'Diagnóstico': (i.assessments as { title: string })?.title || '',
            'Título': i.title,
            'Pilar': i.pillar,
            'Tema': i.theme,
            'Severidade': i.severity,
            'Interpretação': i.interpretation || '',
            'Criado em': i.created_at
          }));
          filename = 'gargalos';
          break;
        }
      }

      if (data.length === 0) {
        toast.error('Nenhum dado encontrado para exportar');
        return;
      }

      // Convert to CSV
      const headers = Object.keys(data[0]);
      const csvContent = [
        headers.join(';'),
        ...data.map(row => 
          headers.map(h => {
            const val = row[h];
            if (val === null || val === undefined) return '';
            const str = String(val);
            // Escape quotes and wrap in quotes if contains separator or newline
            if (str.includes(';') || str.includes('"') || str.includes('\n')) {
              return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
          }).join(';')
        )
      ].join('\n');

      // Add BOM for Excel UTF-8 compatibility
      const BOM = '\uFEFF';
      const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `sistur_${filename}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`${data.length} registros exportados com sucesso`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Erro ao exportar dados');
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = (type: ExportType) => {
    switch (type) {
      case 'assessments':
        return <Calculator className="h-4 w-4" />;
      case 'destinations':
        return <MapPin className="h-4 w-4" />;
      case 'indicators':
        return <FileSpreadsheet className="h-4 w-4" />;
      case 'courses':
        return <GraduationCap className="h-4 w-4" />;
      case 'issues':
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <Download className="h-4 w-4 mr-2" />
          Exportar Dados
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            Exportar Dados
          </DialogTitle>
          <DialogDescription>
            Exporte dados do SISTUR em formato CSV compatível com Excel
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Tipo de Dados</Label>
            <Select value={exportType} onValueChange={(v) => setExportType(v as ExportType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="assessments">
                  <div className="flex items-center gap-2">
                    <Calculator className="h-4 w-4" />
                    Diagnósticos
                  </div>
                </SelectItem>
                <SelectItem value="destinations">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Destinos
                  </div>
                </SelectItem>
                <SelectItem value="indicators">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4" />
                    Indicadores
                  </div>
                </SelectItem>
                <SelectItem value="courses">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-4 w-4" />
                    Cursos
                  </div>
                </SelectItem>
                <SelectItem value="issues">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Gargalos
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card className="bg-muted/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                {getTypeIcon(exportType)}
                {exportType === 'assessments' && 'Diagnósticos'}
                {exportType === 'destinations' && 'Destinos'}
                {exportType === 'indicators' && 'Indicadores'}
                {exportType === 'courses' && 'Cursos'}
                {exportType === 'issues' && 'Gargalos'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-xs">
                {exportType === 'assessments' && 'Exporta todas as rodadas de diagnóstico com status, datas e destino associado.'}
                {exportType === 'destinations' && 'Exporta todos os destinos cadastrados com coordenadas e código IBGE.'}
                {exportType === 'indicators' && 'Exporta a matriz completa de indicadores com pesos, referências e metadados.'}
                {exportType === 'courses' && 'Exporta o catálogo de cursos SISTUR EDU com pilares e agentes-alvo.'}
                {exportType === 'issues' && 'Exporta todos os gargalos detectados com severidade e interpretação territorial.'}
              </CardDescription>
            </CardContent>
          </Card>

          <Button onClick={exportData} className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Exportando...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Exportar CSV
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            O arquivo será salvo em formato CSV com separador ponto-e-vírgula, 
            compatível com Excel em português.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
