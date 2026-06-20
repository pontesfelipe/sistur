import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, TrendingUp, Calendar, AlertCircle, X, BarChart3 } from 'lucide-react';
import {
  useDistributionChannels,
  useSeasonalityMonths,
  type EnterpriseChannelType,
} from '@/hooks/useEnterpriseRevenue';
import { useProfile } from '@/hooks/useProfile';

const CHANNEL_TYPES: { value: EnterpriseChannelType; label: string; defaultCommission: number }[] = [
  { value: 'DIRETO', label: 'Direto (site/telefone/walk-in)', defaultCommission: 0 },
  { value: 'OTA', label: 'OTA (Booking, Expedia, Airbnb…)', defaultCommission: 18 },
  { value: 'AGENCIA', label: 'Agência / Operadora', defaultCommission: 12 },
  { value: 'CORPORATIVO', label: 'Corporativo / Convênio', defaultCommission: 5 },
  { value: 'EVENTOS', label: 'Eventos / Grupos', defaultCommission: 8 },
  { value: 'OUTRO', label: 'Outro', defaultCommission: 0 },
];

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

interface Props {
  destinationId: string;
  destinationName: string;
  onClose?: () => void;
}

export function EnterpriseRevenuePanel({ destinationId, destinationName, onClose }: Props) {
  const { profile } = useProfile();
  const orgId = profile?.org_id;
  const { channels, upsert, remove, totalShare, weightedCommission, directShare } =
    useDistributionChannels(destinationId);

  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const { months, upsertMonth, seasonalityIndex } = useSeasonalityMonths(destinationId, year);

  const [newChannel, setNewChannel] = useState({
    channel_name: '',
    channel_type: 'OTA' as EnterpriseChannelType,
    share_pct: 0,
    commission_pct: 18,
  });

  if (!orgId) return null;

  const handleAddChannel = () => {
    if (!newChannel.channel_name.trim()) return;
    upsert.mutate({
      destination_id: destinationId,
      org_id: orgId,
      ...newChannel,
    });
    setNewChannel({ channel_name: '', channel_type: 'OTA', share_pct: 0, commission_pct: 18 });
  };

  const handleMonthChange = (month: number, field: 'occupancy_rate' | 'adr', value: string) => {
    const num = value === '' ? null : Number(value);
    const existing = months.find((m) => m.month === month);
    upsertMonth.mutate({
      destination_id: destinationId,
      org_id: orgId,
      year,
      month,
      occupancy_rate: field === 'occupancy_rate' ? num : existing?.occupancy_rate ?? null,
      adr: field === 'adr' ? num : existing?.adr ?? null,
    });
  };

  const seasonalityLabel =
    seasonalityIndex < 0.15 ? { label: 'Muito estável', color: 'bg-emerald-500/15 text-emerald-700' } :
    seasonalityIndex < 0.30 ? { label: 'Estável', color: 'bg-emerald-500/15 text-emerald-700' } :
    seasonalityIndex < 0.45 ? { label: 'Moderada', color: 'bg-amber-500/15 text-amber-700' } :
    seasonalityIndex < 0.60 ? { label: 'Alta', color: 'bg-orange-500/15 text-orange-700' } :
    { label: 'Muito alta', color: 'bg-red-500/15 text-red-700' };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <BarChart3 className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <CardTitle className="text-lg">Receita & Canais</CardTitle>
              <CardDescription>{destinationName} — mix de distribuição e sazonalidade real</CardDescription>
            </div>
          </div>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="canais" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="canais" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              Canais de Distribuição
            </TabsTrigger>
            <TabsTrigger value="sazonalidade" className="gap-2">
              <Calendar className="h-4 w-4" />
              Sazonalidade Mensal
            </TabsTrigger>
          </TabsList>

          {/* CANAIS */}
          <TabsContent value="canais" className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-lg border p-3 bg-muted/30">
                <div className="text-xs text-muted-foreground">Total declarado</div>
                <div className={`text-2xl font-bold ${Math.abs(totalShare - 100) > 1 ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {totalShare.toFixed(1)}%
                </div>
                {Math.abs(totalShare - 100) > 1 && (
                  <div className="flex items-center gap-1 mt-1 text-xs text-amber-600">
                    <AlertCircle className="h-3 w-3" /> Soma deve totalizar 100%
                  </div>
                )}
              </div>
              <div className="rounded-lg border p-3 bg-muted/30">
                <div className="text-xs text-muted-foreground">Comissão média ponderada</div>
                <div className="text-2xl font-bold">{weightedCommission.toFixed(1)}%</div>
                <div className="text-xs text-muted-foreground mt-1">Quanto menor, melhor</div>
              </div>
              <div className="rounded-lg border p-3 bg-muted/30">
                <div className="text-xs text-muted-foreground">% Vendas diretas</div>
                <div className="text-2xl font-bold text-emerald-600">{directShare.toFixed(1)}%</div>
                <div className="text-xs text-muted-foreground mt-1">Alvo: ≥ 30%</div>
              </div>
            </div>

            {/* Existing channels */}
            <div className="space-y-2">
              {channels.length === 0 && (
                <div className="text-sm text-muted-foreground text-center py-6 border border-dashed rounded-lg">
                  Nenhum canal cadastrado. Adicione abaixo o mix real de reservas.
                </div>
              )}
              {channels.map((c) => (
                <div key={c.id} className="flex items-center gap-2 p-3 border rounded-lg">
                  <Badge variant="outline">{CHANNEL_TYPES.find((t) => t.value === c.channel_type)?.label.split(' ')[0]}</Badge>
                  <div className="flex-1 font-medium">{c.channel_name}</div>
                  <div className="text-sm text-muted-foreground">Share: <span className="font-semibold text-foreground">{Number(c.share_pct).toFixed(1)}%</span></div>
                  <div className="text-sm text-muted-foreground">Com.: <span className="font-semibold text-foreground">{Number(c.commission_pct).toFixed(1)}%</span></div>
                  <Button variant="ghost" size="icon" onClick={() => remove.mutate(c.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Add new */}
            <div className="border-t pt-4 space-y-3">
              <Label>Adicionar canal</Label>
              <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
                <div className="md:col-span-4">
                  <Input
                    placeholder="Nome do canal (ex: Booking.com)"
                    value={newChannel.channel_name}
                    onChange={(e) => setNewChannel((p) => ({ ...p, channel_name: e.target.value }))}
                  />
                </div>
                <div className="md:col-span-3">
                  <Select
                    value={newChannel.channel_type}
                    onValueChange={(v: EnterpriseChannelType) => {
                      const def = CHANNEL_TYPES.find((t) => t.value === v);
                      setNewChannel((p) => ({ ...p, channel_type: v, commission_pct: def?.defaultCommission ?? p.commission_pct }));
                    }}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CHANNEL_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <Input
                    type="number" min="0" max="100" step="0.1"
                    placeholder="Share %"
                    value={newChannel.share_pct || ''}
                    onChange={(e) => setNewChannel((p) => ({ ...p, share_pct: Number(e.target.value) }))}
                  />
                </div>
                <div className="md:col-span-2">
                  <Input
                    type="number" min="0" max="100" step="0.1"
                    placeholder="Comissão %"
                    value={newChannel.commission_pct || ''}
                    onChange={(e) => setNewChannel((p) => ({ ...p, commission_pct: Number(e.target.value) }))}
                  />
                </div>
                <div className="md:col-span-1">
                  <Button onClick={handleAddChannel} disabled={!newChannel.channel_name.trim()} className="w-full">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* SAZONALIDADE */}
          <TabsContent value="sazonalidade" className="space-y-4">
            <div className="flex items-center gap-3">
              <Label>Ano de referência</Label>
              <Select value={year.toString()} onValueChange={(v) => setYear(Number(v))}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[currentYear, currentYear - 1, currentYear - 2].map((y) => (
                    <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="ml-auto flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Índice de sazonalidade:</span>
                <Badge className={seasonalityLabel.color}>
                  {seasonalityIndex.toFixed(3)} — {seasonalityLabel.label}
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {MONTH_NAMES.map((name, idx) => {
                const month = idx + 1;
                const data = months.find((m) => m.month === month);
                return (
                  <div key={month} className="grid grid-cols-12 items-center gap-2 p-2 border rounded">
                    <div className="col-span-2 font-medium text-sm">{name}</div>
                    <div className="col-span-5">
                      <Input
                        type="number" min="0" max="100" step="0.1"
                        placeholder="Ocupação %"
                        defaultValue={data?.occupancy_rate ?? ''}
                        onBlur={(e) => {
                          const v = e.target.value;
                          if (v !== String(data?.occupancy_rate ?? '')) {
                            handleMonthChange(month, 'occupancy_rate', v);
                          }
                        }}
                      />
                    </div>
                    <div className="col-span-5">
                      <Input
                        type="number" min="0" step="0.01"
                        placeholder="ADR R$"
                        defaultValue={data?.adr ?? ''}
                        onBlur={(e) => {
                          const v = e.target.value;
                          if (v !== String(data?.adr ?? '')) {
                            handleMonthChange(month, 'adr', v);
                          }
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              Preencha ao menos 3 meses para que o índice de sazonalidade seja calculado.
              O índice (coeficiente de variação da ocupação) alimenta automaticamente o indicador
              <strong> ENT_SEASONALITY_INDEX</strong> no próximo cálculo do diagnóstico.
            </p>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
