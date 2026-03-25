import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { 
  Download, 
  FileSpreadsheet, 
  MapPin, 
  Calculator,
  GraduationCap,
  AlertTriangle,
  Loader2,
  Users
} from 'lucide-react';

type ExportType = 'assessments' | 'destinations' | 'indicators' | 'courses' | 'issues' | 'users';

function downloadCsv(data: Record<string, unknown>[], filename: string) {
  if (data.length === 0) {
    toast.error('Nenhum dado encontrado para exportar');
    return;
  }

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(';'),
    ...data.map(row => 
      headers.map(h => {
        const val = row[h];
        if (val === null || val === undefined) return '';
        const str = String(val);
        if (str.includes(';') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      }).join(';')
    )
  ].join('\n');

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
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrador',
  ANALYST: 'Analista',
  VIEWER: 'Visualizador',
  ESTUDANTE: 'Estudante',
  PROFESSOR: 'Professor',
};

export function DataExporter() {
  const [open, setOpen] = useState(false);
  const [exportType, setExportType] = useState<ExportType>('assessments');
  const [loading, setLoading] = useState(false);

  const exportData = async () => {
    try {
      setLoading(true);
      let data: Record<string, unknown>[] = [];
      let filename = '';

      switch (exportType) {
        case 'users': {
          // Fetch active users
          const [activeRes, pendingRes, licensesRes, termsRes] = await Promise.all([
            supabase.functions.invoke('manage-users', { body: { action: 'list' } }),
            supabase.functions.invoke('manage-users', { body: { action: 'list_pending' } }),
            supabase.from('licenses').select('user_id, plan, status, trial_ends_at, expires_at, created_at'),
            supabase.from('terms_acceptance' as any).select('user_id, accepted_at, terms_version'),
          ]);

          const activeUsers = activeRes.data?.users || [];
          const pendingUsers = pendingRes.data?.users || [];

          const licensesMap = new Map<string, any>();
          (licensesRes.data || []).forEach((l: any) => licensesMap.set(l.user_id, l));

          const termsMap = new Map<string, any>();
          (termsRes.data || []).forEach((t: any) => termsMap.set(t.user_id, t));

          const formatDate = (d: string | null) => d ? new Date(d).toLocaleDateString('pt-BR') : '';

          const rows = activeUsers.map((u: any) => {
            const license = licensesMap.get(u.user_id);
            const terms = termsMap.get(u.user_id);
            return {
              'Nome': u.full_name || '',
              'Email': u.email || '',
              'Status': 'Ativo',
              'Acesso': u.system_access || '—',
              'Papel': ROLE_LABELS[u.role] || u.role || '',
              'Plano Licença': license?.plan || '—',
              'Status Licença': license?.status || '—',
              'Expiração Licença': formatDate(license?.expires_at || license?.trial_ends_at),
              'Termos Aceitos': terms ? 'Sim' : 'Não',
              'Data Aceite Termos': formatDate(terms?.accepted_at),
              'Versão Termos': terms?.terms_version || '',
              'Criado em': formatDate(u.created_at),
            };
          });

          const pendingRows = pendingUsers.map((u: any) => {
            const license = licensesMap.get(u.user_id);
            const terms = termsMap.get(u.user_id);
            return {
              'Nome': u.full_name || '',
              'Email': u.email || '',
              'Status': 'Aguardando Aprovação',
              'Acesso': u.system_access || '—',
              'Papel': '—',
              'Plano Licença': license?.plan || '—',
              'Status Licença': license?.status || '—',
              'Expiração Licença': formatDate(license?.expires_at || license?.trial_ends_at),
              'Termos Aceitos': terms ? 'Sim' : 'Não',
              'Data Aceite Termos': formatDate(terms?.accepted_at),
              'Versão Termos': terms?.terms_version || '',
              'Criado em': formatDate(u.approval_requested_at || u.created_at),
            };
          });

          data = [...rows, ...pendingRows];
          filename = 'usuarios';
          break;
        }

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

      downloadCsv(data, filename);
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
      case 'users':
        return <Users className="h-4 w-4" />;
    }
  };

  const TYPE_LABELS: Record<ExportType, string> = {
    users: 'Usuários',
    assessments: 'Diagnósticos',
    destinations: 'Destinos',
    indicators: 'Indicadores',
    courses: 'Cursos',
    issues: 'Gargalos',
  };

  const TYPE_DESCRIPTIONS: Record<ExportType, string> = {
    users: 'Exporta todos os usuários (ativos e pendentes) com status, papel, licença, termos aceitos e acessos.',
    assessments: 'Exporta todas as rodadas de diagnóstico com status, datas e destino associado.',
    destinations: 'Exporta todos os destinos cadastrados com coordenadas e código IBGE.',
    indicators: 'Exporta a matriz completa de indicadores com pesos, referências e metadados.',
    courses: 'Exporta o catálogo de cursos SISTUR EDU com pilares e agentes-alvo.',
    issues: 'Exporta todos os gargalos detectados com severidade e interpretação territorial.',
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
                <SelectItem value="users">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Usuários
                  </div>
                </SelectItem>
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
                {TYPE_LABELS[exportType]}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-xs">
                {TYPE_DESCRIPTIONS[exportType]}
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
