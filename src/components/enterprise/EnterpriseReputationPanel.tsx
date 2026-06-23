import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Star, Trash2, Plus, Loader2, Search, ExternalLink, Award, History, Trophy, X } from 'lucide-react';
import { useReviewSnapshots, useCompetitors } from '@/hooks/useEnterpriseReputation';
import { useEnterpriseProfile } from '@/hooks/useEnterpriseProfiles';
import { useProfile } from '@/hooks/useProfile';

const SOURCES = ['Google', 'TripAdvisor', 'Booking', 'Expedia', 'Decolar', 'Airbnb', 'Outro'];

interface Props {
  destinationId: string;
  destinationName: string;
  onClose?: () => void;
}

export function EnterpriseReputationPanel({ destinationId, destinationName, onClose }: Props) {
  const { profile } = useProfile();
  const orgId = profile?.org_id;
  const { profile: enterpriseProfile } = useEnterpriseProfile(destinationId);

  const { snapshots, addSnapshot, removeSnapshot } = useReviewSnapshots(destinationId);
  const { competitors, upsertCompetitor, removeCompetitor, searchCompetitors, avgCompetitorRating } =
    useCompetitors(destinationId);

  const [newSnapshot, setNewSnapshot] = useState({
    source: 'Google',
    rating: '',
    review_volume: '',
    response_rate: '',
    sentiment_positive_pct: '',
  });

  const [newCompetitor, setNewCompetitor] = useState({ name: '', rating: '', review_volume: '' });

  if (!orgId) return null;

  // Own current rating (latest snapshot)
  const ownLatest = snapshots[0];
  const ownRating = ownLatest?.rating ? Number(ownLatest.rating) : 0;
  const compGap = ownRating > 0 && avgCompetitorRating > 0 ? ownRating - avgCompetitorRating : 0;

  const handleAddSnapshot = () => {
    if (!newSnapshot.source || !newSnapshot.rating) return;
    addSnapshot.mutate({
      org_id: orgId,
      destination_id: destinationId,
      source: newSnapshot.source,
      rating: Number(newSnapshot.rating),
      review_volume: newSnapshot.review_volume ? Number(newSnapshot.review_volume) : null,
      response_rate: newSnapshot.response_rate ? Number(newSnapshot.response_rate) : null,
      sentiment_positive_pct: newSnapshot.sentiment_positive_pct ? Number(newSnapshot.sentiment_positive_pct) : null,
    });
    setNewSnapshot({ source: 'Google', rating: '', review_volume: '', response_rate: '', sentiment_positive_pct: '' });
  };

  const handleSearchCompetitors = () => {
    searchCompetitors.mutate({
      destination_id: destinationId,
      business_name: destinationName,
      location: destinationName,
      property_type: enterpriseProfile?.property_type,
      limit: 5,
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-500/10">
              <Award className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <CardTitle className="text-lg">Reputação Competitiva</CardTitle>
              <CardDescription>{destinationName} — histórico de reviews e benchmarking</CardDescription>
            </div>
          </div>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="historico" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="historico" className="gap-2"><History className="h-4 w-4" />Histórico de Reviews</TabsTrigger>
            <TabsTrigger value="concorrentes" className="gap-2"><Trophy className="h-4 w-4" />Concorrentes</TabsTrigger>
          </TabsList>

          {/* HISTÓRICO */}
          <TabsContent value="historico" className="space-y-4">
            {snapshots.length === 0 && (
              <div className="text-sm text-muted-foreground text-center py-6 border border-dashed rounded-lg">
                Nenhum snapshot. Registre periodicamente as notas e volumes para acompanhar a evolução.
              </div>
            )}

            <div className="space-y-2">
              {snapshots.map((s) => (
                <div key={s.id} className="flex items-center gap-3 p-3 border rounded-lg">
                  <Badge variant="outline">{s.source}</Badge>
                  <div className="text-xs text-muted-foreground w-24">{new Date(s.snapshot_date).toLocaleDateString('pt-BR')}</div>
                  <div className="flex items-center gap-1 font-semibold">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    {s.rating != null ? Number(s.rating).toFixed(2) : '—'}
                  </div>
                  {s.review_volume != null && (
                    <div className="text-xs text-muted-foreground">{s.review_volume} reviews</div>
                  )}
                  {s.response_rate != null && (
                    <div className="text-xs">Resposta: <span className="font-semibold">{Number(s.response_rate).toFixed(0)}%</span></div>
                  )}
                  {s.sentiment_positive_pct != null && (
                    <div className="text-xs">Pos.: <span className="font-semibold text-emerald-600">{Number(s.sentiment_positive_pct).toFixed(0)}%</span></div>
                  )}
                  <div className="ml-auto" />
                  <Button variant="ghost" size="icon" onClick={() => removeSnapshot.mutate(s.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="border-t pt-4 space-y-3">
              <Label>Novo snapshot</Label>
              <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
                <div className="md:col-span-2">
                  <Select value={newSnapshot.source} onValueChange={(v) => setNewSnapshot((p) => ({ ...p, source: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Input className="md:col-span-2" type="number" step="0.01" placeholder="Nota (0-10)"
                  value={newSnapshot.rating} onChange={(e) => setNewSnapshot((p) => ({ ...p, rating: e.target.value }))} />
                <Input className="md:col-span-2" type="number" placeholder="Volume"
                  value={newSnapshot.review_volume} onChange={(e) => setNewSnapshot((p) => ({ ...p, review_volume: e.target.value }))} />
                <Input className="md:col-span-2" type="number" placeholder="% Resposta"
                  value={newSnapshot.response_rate} onChange={(e) => setNewSnapshot((p) => ({ ...p, response_rate: e.target.value }))} />
                <Input className="md:col-span-2" type="number" placeholder="% Positivo"
                  value={newSnapshot.sentiment_positive_pct} onChange={(e) => setNewSnapshot((p) => ({ ...p, sentiment_positive_pct: e.target.value }))} />
                <Button className="md:col-span-2" onClick={handleAddSnapshot} disabled={!newSnapshot.rating}>
                  <Plus className="h-4 w-4 mr-1" />Salvar
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Notas em escala 0–10. Para fontes que usam 0–5 (TripAdvisor, Google), multiplique por 2 antes de inserir.
              </p>
            </div>
          </TabsContent>

          {/* CONCORRENTES */}
          <TabsContent value="concorrentes" className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-lg border p-3 bg-muted/30">
                <div className="text-xs text-muted-foreground">Sua nota (último snapshot)</div>
                <div className="text-2xl font-bold flex items-center gap-1">
                  <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                  {ownRating > 0 ? ownRating.toFixed(2) : '—'}
                </div>
              </div>
              <div className="rounded-lg border p-3 bg-muted/30">
                <div className="text-xs text-muted-foreground">Média dos concorrentes</div>
                <div className="text-2xl font-bold">{avgCompetitorRating > 0 ? avgCompetitorRating.toFixed(2) : '—'}</div>
                <div className="text-xs text-muted-foreground mt-1">{competitors.length} capturados</div>
              </div>
              <div className="rounded-lg border p-3 bg-muted/30">
                <div className="text-xs text-muted-foreground">Gap competitivo (ENT_COMP_GAP)</div>
                <div className={`text-2xl font-bold ${compGap > 0 ? 'text-emerald-600' : compGap < 0 ? 'text-red-600' : ''}`}>
                  {compGap !== 0 ? (compGap > 0 ? '+' : '') + compGap.toFixed(2) : '—'}
                </div>
                <div className="text-xs text-muted-foreground mt-1">Positivo = vantagem</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button onClick={handleSearchCompetitors} disabled={searchCompetitors.isPending}>
                {searchCompetitors.isPending
                  ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  : <Search className="h-4 w-4 mr-2" />}
                Buscar concorrentes (busca pública)
              </Button>
              <span className="text-xs text-muted-foreground">
                Captura automática de até 5 concorrentes em {destinationName}. Substitui buscas anteriores; preserva os adicionados manualmente.
              </span>
            </div>

            <div className="space-y-2">
              {competitors.length === 0 && (
                <div className="text-sm text-muted-foreground text-center py-6 border border-dashed rounded-lg">
                  Nenhum concorrente. Use a busca acima ou adicione manualmente abaixo.
                </div>
              )}
              {competitors.map((c) => (
                <div key={c.id} className="flex items-center gap-3 p-3 border rounded-lg">
                  <Badge variant={c.is_manual ? 'secondary' : 'outline'}>
                    {c.is_manual ? 'Manual' : c.source_name || 'Web'}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{c.name}</div>
                    {c.notes && <div className="text-xs text-muted-foreground truncate">{c.notes}</div>}
                  </div>
                  {c.rating != null && (
                    <div className="flex items-center gap-1 font-semibold">
                      <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                      {Number(c.rating).toFixed(2)}
                    </div>
                  )}
                  {c.review_volume != null && (
                    <div className="text-xs text-muted-foreground w-16 text-right">{c.review_volume} rv</div>
                  )}
                  {c.source_url && (
                    <a href={c.source_url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                  <Button variant="ghost" size="icon" onClick={() => removeCompetitor.mutate(c.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="border-t pt-4 space-y-3">
              <Label>Adicionar concorrente manualmente</Label>
              <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
                <Input className="md:col-span-6" placeholder="Nome do concorrente"
                  value={newCompetitor.name} onChange={(e) => setNewCompetitor((p) => ({ ...p, name: e.target.value }))} />
                <Input className="md:col-span-2" type="number" step="0.01" placeholder="Nota (0-10)"
                  value={newCompetitor.rating} onChange={(e) => setNewCompetitor((p) => ({ ...p, rating: e.target.value }))} />
                <Input className="md:col-span-2" type="number" placeholder="Volume"
                  value={newCompetitor.review_volume} onChange={(e) => setNewCompetitor((p) => ({ ...p, review_volume: e.target.value }))} />
                <Button className="md:col-span-2"
                  disabled={!newCompetitor.name.trim()}
                  onClick={() => {
                    upsertCompetitor.mutate({
                      org_id: orgId,
                      destination_id: destinationId,
                      name: newCompetitor.name.trim(),
                      rating: newCompetitor.rating ? Number(newCompetitor.rating) : null,
                      review_volume: newCompetitor.review_volume ? Number(newCompetitor.review_volume) : null,
                      is_manual: true,
                    });
                    setNewCompetitor({ name: '', rating: '', review_volume: '' });
                  }}>
                  <Plus className="h-4 w-4 mr-1" />Adicionar
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
