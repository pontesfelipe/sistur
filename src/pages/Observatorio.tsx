import { useMemo, useState } from "react";
import {
  useObservatoryMetrics,
  useObservatorySummary,
  useObservatoryEvents,
  useUpsertMeasurement,
  useCreateObservatoryEvent,
  useDeleteObservatoryEvent,
} from "@/hooks/useObservatorio";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Activity, Bed, CalendarDays, DollarSign, Briefcase, Plus, Trash2, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useProfileContext } from "@/contexts/ProfileContext";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { CsvImportDialog } from "@/components/observatorio/CsvImportDialog";
import { RegressionAlertsPanel } from "@/components/observatorio/RegressionAlertsPanel";

const CATEGORY_META: Record<string, { label: string; icon: any; color: string }> = {
  fluxo: { label: "Fluxo Turístico", icon: Activity, color: "text-blue-600" },
  ocupacao: { label: "Ocupação", icon: Bed, color: "text-purple-600" },
  eventos: { label: "Eventos", icon: CalendarDays, color: "text-orange-600" },
  receita: { label: "Receita", icon: DollarSign, color: "text-green-600" },
  empregos: { label: "Empregos", icon: Briefcase, color: "text-amber-600" },
};

function formatValue(value: number, unit: string) {
  if (unit === "BRL") return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value);
  if (unit === "%") return `${value.toFixed(1)}%`;
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(value);
}

const MONTHS = [
  { v: null as number | null, label: "Anual" },
  { v: 1, label: "Jan" }, { v: 2, label: "Fev" }, { v: 3, label: "Mar" },
  { v: 4, label: "Abr" }, { v: 5, label: "Mai" }, { v: 6, label: "Jun" },
  { v: 7, label: "Jul" }, { v: 8, label: "Ago" }, { v: 9, label: "Set" },
  { v: 10, label: "Out" }, { v: 11, label: "Nov" }, { v: 12, label: "Dez" },
];

export default function Observatorio() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const { roles } = useProfileContext();
  const queryClient = useQueryClient();
  const isAdmin = roles.some((r) => r.role === "ADMIN" || r.role === "ORG_ADMIN");
  const [ingesting, setIngesting] = useState(false);

  const runIngestion = async () => {
    setIngesting(true);
    try {
      const { data, error } = await supabase.functions.invoke("ingest-observatory", {
        body: { year },
      });
      if (error) throw error;
      toast.success(`Ingestão concluída — ${data?.processed ?? 0} medições atualizadas`);
      queryClient.invalidateQueries({ queryKey: ["observatory"] });
    } catch (e: any) {
      toast.error("Falha na ingestão: " + (e.message ?? "erro desconhecido"));
    } finally {
      setIngesting(false);
    }
  };

  const { data: metrics = [], isLoading: loadingMetrics } = useObservatoryMetrics();
  const { data: summary = [], isLoading: loadingSummary } = useObservatorySummary(year);
  const { data: events = [], isLoading: loadingEvents } = useObservatoryEvents(year);
  const upsert = useUpsertMeasurement();
  const createEvent = useCreateObservatoryEvent();
  const deleteEvent = useDeleteObservatoryEvent();

  const [measureDialog, setMeasureDialog] = useState<{ metricId: string; name: string; unit: string } | null>(null);
  const [measureValue, setMeasureValue] = useState("");
  const [measureMonth, setMeasureMonth] = useState<string>("null");
  const [measureSource, setMeasureSource] = useState("");

  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [newEvent, setNewEvent] = useState({
    name: "", description: "", category: "cultural",
    start_date: "", end_date: "", estimated_attendance: "", estimated_revenue: "",
  });

  const summaryByCategory = useMemo(() => {
    const map: Record<string, typeof summary> = {};
    summary.forEach((row) => {
      if (!map[row.category]) map[row.category] = [];
      map[row.category].push(row);
    });
    return map;
  }, [summary]);

  const categories = Object.keys(CATEGORY_META);

  const handleSaveMeasurement = async () => {
    if (!measureDialog) return;
    const value = parseFloat(measureValue);
    if (isNaN(value)) return;
    await upsert.mutateAsync({
      metric_id: measureDialog.metricId,
      reference_year: year,
      reference_month: measureMonth === "null" ? null : parseInt(measureMonth),
      value,
      source: measureSource || undefined,
    });
    setMeasureDialog(null);
    setMeasureValue("");
    setMeasureSource("");
    setMeasureMonth("null");
  };

  const handleCreateEvent = async () => {
    if (!newEvent.name || !newEvent.start_date || !newEvent.end_date) return;
    await createEvent.mutateAsync({
      name: newEvent.name,
      description: newEvent.description || undefined,
      category: newEvent.category,
      start_date: newEvent.start_date,
      end_date: newEvent.end_date,
      estimated_attendance: newEvent.estimated_attendance ? parseInt(newEvent.estimated_attendance) : undefined,
      estimated_revenue: newEvent.estimated_revenue ? parseFloat(newEvent.estimated_revenue) : undefined,
    });
    setEventDialogOpen(false);
    setNewEvent({ name: "", description: "", category: "cultural", start_date: "", end_date: "", estimated_attendance: "", estimated_revenue: "" });
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Observatório Turístico</h1>
          <p className="text-muted-foreground mt-1">
            Acompanhamento permanente de fluxo, ocupação, eventos, receita e empregos no destino.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <>
              <Button size="sm" variant="outline" onClick={runIngestion} disabled={ingesting}>
                {ingesting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                Atualizar de fontes oficiais
              </Button>
              <CsvImportDialog metrics={metrics} />
            </>
          )}
          <Label className="text-sm">Ano de referência</Label>
          <Select value={String(year)} onValueChange={(v) => setYear(parseInt(v))}>
            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[currentYear - 2, currentYear - 1, currentYear, currentYear + 1].map((y) => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI cards por categoria */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {categories.map((cat) => {
          const meta = CATEGORY_META[cat];
          const Icon = meta.icon;
          const rows = summaryByCategory[cat] || [];
          const topMetric = rows.find((r) => r.data_points > 0) || rows[0];
          return (
            <Card key={cat}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">{meta.label}</CardTitle>
                  <Icon className={`h-4 w-4 ${meta.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                {topMetric ? (
                  <>
                    <div className="text-2xl font-bold">
                      {topMetric.data_points > 0 ? formatValue(Number(topMetric.total_value), topMetric.unit) : "—"}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 truncate">{topMetric.metric_name}</p>
                  </>
                ) : (
                  <div className="text-2xl font-bold text-muted-foreground">—</div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Tabs defaultValue="indicadores" className="space-y-4">
        <TabsList>
          <TabsTrigger value="indicadores">Indicadores</TabsTrigger>
          <TabsTrigger value="eventos">Calendário de Eventos</TabsTrigger>
        </TabsList>

        <TabsContent value="indicadores" className="space-y-4">
          {loadingMetrics || loadingSummary ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : (
            categories.map((cat) => {
              const meta = CATEGORY_META[cat];
              const Icon = meta.icon;
              const catMetrics = metrics.filter((m) => m.category === cat);
              const catSummary = summaryByCategory[cat] || [];
              return (
                <Card key={cat}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Icon className={`h-5 w-5 ${meta.color}`} /> {meta.label}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {catMetrics.map((m) => {
                        const s = catSummary.find((r) => r.metric_code === m.code);
                        const hasData = s && s.data_points > 0;
                        return (
                          <div key={m.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/40 transition-colors">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium truncate">{m.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {hasData ? `${formatValue(Number(s!.total_value), m.unit)} · ${s!.data_points} ${s!.data_points === 1 ? "registro" : "registros"}` : "Sem dados em " + year}
                              </p>
                            </div>
                            <Button size="sm" variant="outline" onClick={() => setMeasureDialog({ metricId: m.id, name: m.name, unit: m.unit })}>
                              <Plus className="h-3 w-3 mr-1" /> Registrar
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="eventos" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={eventDialogOpen} onOpenChange={setEventDialogOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" /> Novo Evento</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Novo Evento Turístico</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label>Nome *</Label>
                    <Input value={newEvent.name} onChange={(e) => setNewEvent({ ...newEvent, name: e.target.value })} />
                  </div>
                  <div>
                    <Label>Categoria</Label>
                    <Select value={newEvent.category} onValueChange={(v) => setNewEvent({ ...newEvent, category: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cultural">Cultural</SelectItem>
                        <SelectItem value="esportivo">Esportivo</SelectItem>
                        <SelectItem value="gastronomico">Gastronômico</SelectItem>
                        <SelectItem value="religioso">Religioso</SelectItem>
                        <SelectItem value="corporativo">Corporativo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Data início *</Label>
                      <Input type="date" value={newEvent.start_date} onChange={(e) => setNewEvent({ ...newEvent, start_date: e.target.value })} />
                    </div>
                    <div>
                      <Label>Data fim *</Label>
                      <Input type="date" value={newEvent.end_date} onChange={(e) => setNewEvent({ ...newEvent, end_date: e.target.value })} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Público estimado</Label>
                      <Input type="number" value={newEvent.estimated_attendance} onChange={(e) => setNewEvent({ ...newEvent, estimated_attendance: e.target.value })} />
                    </div>
                    <div>
                      <Label>Receita estimada (R$)</Label>
                      <Input type="number" value={newEvent.estimated_revenue} onChange={(e) => setNewEvent({ ...newEvent, estimated_revenue: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <Label>Descrição</Label>
                    <Textarea value={newEvent.description} onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })} />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setEventDialogOpen(false)}>Cancelar</Button>
                  <Button onClick={handleCreateEvent} disabled={createEvent.isPending}>
                    {createEvent.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Salvar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {loadingEvents ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : events.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">
              Nenhum evento cadastrado para {year}.
            </CardContent></Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {events.map((ev) => (
                <Card key={ev.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <CardTitle className="text-base truncate">{ev.name}</CardTitle>
                        <CardDescription className="mt-1">
                          {format(new Date(ev.start_date), "dd 'de' MMM", { locale: ptBR })} – {format(new Date(ev.end_date), "dd 'de' MMM yyyy", { locale: ptBR })}
                        </CardDescription>
                      </div>
                      {ev.category && <Badge variant="secondary" className="capitalize">{ev.category}</Badge>}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {ev.description && <p className="text-sm text-muted-foreground mb-3">{ev.description}</p>}
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Público estimado</p>
                        <p className="font-medium">{ev.estimated_attendance ? new Intl.NumberFormat("pt-BR").format(ev.estimated_attendance) : "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Receita estimada</p>
                        <p className="font-medium">{ev.estimated_revenue ? formatValue(Number(ev.estimated_revenue), "BRL") : "—"}</p>
                      </div>
                    </div>
                    <div className="flex justify-end mt-3">
                      <Button size="sm" variant="ghost" onClick={() => deleteEvent.mutate(ev.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialog para registrar medição */}
      <Dialog open={!!measureDialog} onOpenChange={(o) => !o && setMeasureDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Registrar Medição</DialogTitle></DialogHeader>
          {measureDialog && (
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">{measureDialog.name} ({measureDialog.unit})</div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Período</Label>
                  <Select value={measureMonth} onValueChange={setMeasureMonth}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MONTHS.map((m) => (
                        <SelectItem key={String(m.v)} value={String(m.v)}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Valor</Label>
                  <Input type="number" value={measureValue} onChange={(e) => setMeasureValue(e.target.value)} />
                </div>
              </div>
              <div>
                <Label>Fonte (opcional)</Label>
                <Input placeholder="ex: CAGED, IBGE, levantamento próprio" value={measureSource} onChange={(e) => setMeasureSource(e.target.value)} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setMeasureDialog(null)}>Cancelar</Button>
            <Button onClick={handleSaveMeasurement} disabled={upsert.isPending || !measureValue}>
              {upsert.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}