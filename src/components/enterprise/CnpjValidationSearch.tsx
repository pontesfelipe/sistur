import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, ShieldCheck, Building2, MapPin, CheckCircle2, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  initialCnpj?: string | null;
  onValidated?: (data: { cnpj: string; record: any; yearsInOperation: number | null }) => void;
}

function formatCnpj(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

export function CnpjValidationSearch({ initialCnpj, onValidated }: Props) {
  const [cnpj, setCnpj] = useState(initialCnpj ? formatCnpj(initialCnpj) : '');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  const run = async () => {
    const digits = cnpj.replace(/\D/g, '');
    if (digits.length !== 14) {
      toast.error('Informe um CNPJ válido (14 dígitos).');
      return;
    }
    setLoading(true);
    setData(null);
    try {
      const { data: resp, error } = await supabase.functions.invoke('validate-cnpj', {
        body: { cnpj: digits },
      });
      if (error) throw error;
      if (!resp?.success) throw new Error(resp?.error || 'CNPJ não validado');
      const record = resp.data;
      setData(record);

      let years: number | null = null;
      const opening = record?.raw_response?.data_inicio_atividade;
      if (opening) {
        years = Math.max(0, new Date().getFullYear() - new Date(opening).getFullYear());
      }

      onValidated?.({ cnpj: digits, record, yearsInOperation: years });
      toast.success('CNPJ validado');
    } catch (e: any) {
      toast.error('Erro: ' + (e.message || ''));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-2">
        <div className="flex-1 space-y-1">
          <label className="text-xs font-medium">CNPJ</label>
          <Input value={cnpj} onChange={(e) => setCnpj(formatCnpj(e.target.value))} placeholder="00.000.000/0000-00" />
        </div>
        <Button onClick={run} disabled={loading} size="sm">
          {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
          Validar
        </Button>
      </div>

      {data && (
        <>
          <Separator />
          <Card><CardContent className="p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium"><Building2 className="h-4 w-4" /> {data.razao_social}</div>
            {data.nome_fantasia && <p className="text-xs text-muted-foreground">Nome fantasia: {data.nome_fantasia}</p>}
            <div className="flex flex-wrap gap-1.5">
              <Badge variant={/ativ/i.test(data.situacao_cadastral || '') ? 'default' : 'destructive'} className="text-[10px] gap-1">
                {/ativ/i.test(data.situacao_cadastral || '') ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                {data.situacao_cadastral}
              </Badge>
              {data.cnae_principal && <Badge variant="outline" className="text-[10px]">CNAE {data.cnae_principal}</Badge>}
              {data.cadastur_status === 'requer_verificacao_manual' && (
                <Badge variant="secondary" className="text-[10px]">CADASTUR relevante</Badge>
              )}
            </div>
            {data.cnae_descricao && <p className="text-xs text-muted-foreground">{data.cnae_descricao}</p>}
            {data.endereco && (
              <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {[data.endereco.logradouro, data.endereco.numero, data.endereco.bairro, data.endereco.municipio, data.endereco.uf].filter(Boolean).join(', ')}
              </p>
            )}
          </CardContent></Card>
        </>
      )}
    </div>
  );
}