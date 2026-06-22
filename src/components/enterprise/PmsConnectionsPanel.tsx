import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Plug, RefreshCw, Trash2, ExternalLink, Loader2, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { useProfileContext } from '@/contexts/ProfileContext';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

interface Props {
  destinationId: string;
}

type Provider = 'cloudbeds' | 'stays' | 'opera' | 'hits';

const PROVIDER_LABEL: Record<Provider, string> = {
  cloudbeds: 'Cloudbeds',
  stays: 'Stays',
  opera: 'Oracle Opera Cloud',
  hits: 'HITS Mobile',
};

const SUPABASE_PROJECT_REF = (import.meta as any).env?.VITE_SUPABASE_PROJECT_ID ?? '';
const SUPABASE_FUNCTIONS_URL = `https://${SUPABASE_PROJECT_REF}.supabase.co/functions/v1`;
const CLOUDBEDS_CLIENT_ID = (import.meta as any).env?.VITE_CLOUDBEDS_CLIENT_ID ?? '';

/** Fase 13 — Conectores PMS nativos (Cloudbeds em produção; demais em breve). */
export function PmsConnectionsPanel({ destinationId }: Props) {
  const { profile } = useProfileContext();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [provider, setProvider] = useState<Provider>('cloudbeds');
  const [propertyId, setPropertyId] = useState('');
  const [propertyName, setPropertyName] = useState('');

  const { data: conns, isLoading } = useQuery({
    queryKey: ['pms-connections', destinationId],
    queryFn: async () => {
      const { data } = await supabase
        .from('enterprise_pms_connections')
        .select('id, provider, property_id, property_name, status, last_sync_at, last_sync_status, last_sync_error')
        .eq('destination_id', destinationId)
        .order('created_at', { ascending: false });
      return data ?? [];
    },
  });

  const createConn = useMutation({
    mutationFn: async () => {
      if (!profile?.org_id) throw new Error('Organização não encontrada');
      const { data, error } = await supabase
        .from('enterprise_pms_connections')
        .insert({
          org_id: profile.org_id,
          destination_id: destinationId,
          provider,
          property_id: propertyId || null,
          property_name: propertyName || null,
          status: 'pending',
          created_by: profile.user_id,
        })
        .select('id')
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: (id) => {
      qc.invalidateQueries({ queryKey: ['pms-connections', destinationId] });
      setOpen(false);
      if (provider === 'cloudbeds') {
        if (!CLOUDBEDS_CLIENT_ID) {
          toast.error('VITE_CLOUDBEDS_CLIENT_ID não configurado — configure as credenciais OAuth primeiro.');
          return;
        }
        const redirect = `${SUPABASE_FUNCTIONS_URL}/pms-oauth-callback?provider=cloudbeds`;
        const authUrl = new URL('https://hotels.cloudbeds.com/api/v1.1/oauth');
        authUrl.searchParams.set('client_id', CLOUDBEDS_CLIENT_ID);
        authUrl.searchParams.set('redirect_uri', redirect);
        authUrl.searchParams.set('response_type', 'code');
        authUrl.searchParams.set('scope', 'read:hotel read:reservation read:rate');
        authUrl.searchParams.set('state', id);
        window.location.href = authUrl.toString();
      } else {
        toast.info(`${PROVIDER_LABEL[provider]} será habilitado em breve. Conexão registrada como pendente.`);
      }
    },
    onError: (e: any) => toast.error('Erro ao criar conexão: ' + (e?.message ?? '')),
  });

  const syncNow = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.functions.invoke('sync-pms-connector', { body: { connectionId: id } });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pms-connections', destinationId] });
      toast.success('Sincronização disparada.');
    },
    onError: (e: any) => toast.error('Falha: ' + (e?.message ?? '')),
  });

  const removeConn = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('enterprise_pms_connections').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pms-connections', destinationId] });
      toast.success('Conexão removida.');
    },
    onError: (e: any) => toast.error('Erro: ' + (e?.message ?? '')),
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Plug className="h-5 w-5 text-primary" />
              Conectores PMS
              <Badge variant="secondary" className="text-[10px]">
                <Sparkles className="h-3 w-3 mr-1" /> Beta
              </Badge>
            </CardTitle>
            <CardDescription>
              Sincronização automática diária de ADR, RevPAR, ocupação e demais KPIs operacionais.
              Substitui o CSV manual quando ativo.
            </CardDescription>
          </div>
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plug className="h-3.5 w-3.5 mr-1" /> Conectar PMS
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading && <Skeleton className="h-16" />}
        {!isLoading && (!conns || conns.length === 0) && (
          <p className="text-sm text-muted-foreground">Nenhum PMS conectado. Use "Conectar PMS" para começar.</p>
        )}
        {(conns ?? []).map((c) => (
          <div key={c.id} className="rounded-lg border p-3 flex items-center gap-3 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm">{PROVIDER_LABEL[c.provider as Provider] ?? c.provider}</span>
                {c.property_name && <span className="text-xs text-muted-foreground">· {c.property_name}</span>}
                <Badge variant={c.status === 'active' ? 'default' : c.status === 'error' ? 'destructive' : 'secondary'} className="text-[10px]">
                  {c.status}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {c.last_sync_at ? `Última sync: ${new Date(c.last_sync_at).toLocaleString('pt-BR')}` : 'Nunca sincronizado'}
                {c.last_sync_error ? ` · ${c.last_sync_error}` : ''}
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={() => syncNow.mutate(c.id)} disabled={syncNow.isPending || c.status !== 'active'}>
              {syncNow.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => removeConn.mutate(c.id)} disabled={removeConn.isPending}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Conectar PMS</DialogTitle>
            <DialogDescription>
              Hoje suportamos OAuth Cloudbeds em produção. Outros provedores ficam como pendentes até implementação.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label htmlFor="prov">Provedor</Label>
              <Select value={provider} onValueChange={(v) => setProvider(v as Provider)}>
                <SelectTrigger id="prov"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cloudbeds">Cloudbeds (OAuth)</SelectItem>
                  <SelectItem value="stays">Stays (em breve)</SelectItem>
                  <SelectItem value="opera">Oracle Opera Cloud (em breve)</SelectItem>
                  <SelectItem value="hits">HITS Mobile (em breve)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="pid">ID da propriedade no PMS (opcional)</Label>
              <Input id="pid" value={propertyId} onChange={(e) => setPropertyId(e.target.value)} placeholder="Ex.: 12345" />
            </div>
            <div>
              <Label htmlFor="pname">Apelido / nome da propriedade</Label>
              <Input id="pname" value={propertyName} onChange={(e) => setPropertyName(e.target.value)} placeholder="Ex.: Hotel Bem-vindo Centro" />
            </div>
            {provider === 'cloudbeds' && (
              <p className="text-xs text-muted-foreground flex items-start gap-1">
                <ExternalLink className="h-3 w-3 mt-0.5 shrink-0" />
                Você será redirecionado para autorizar no Cloudbeds. Ao retornar, a sincronização diária inicia automaticamente.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={() => createConn.mutate()} disabled={createConn.isPending}>
              {createConn.isPending && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
              Continuar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}