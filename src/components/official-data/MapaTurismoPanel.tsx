import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMapaTurismo, useMapaTurismoStats, useMapaTurismoSyncLogs, useIngestMapaTurismo } from '@/hooks/useMapaTurismo';
import { Loader2, Download, MapPin, BarChart3, RefreshCw, CheckCircle2, XCircle, Clock, Flame, Database } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const UF_LIST = [
  'AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT',
  'PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'
];

const CATEGORY_COLORS: Record<string, string> = {
  A: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  B: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  C: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  D: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  E: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

const TYPE_LABELS: Record<string, string> = {
  turistico: 'Município Turístico',
  complementar: 'Oferta Complementar',
  apoio: 'Apoio ao Turismo',
};

export default function MapaTurismoPanel() {
  const [filterUF, setFilterUF] = useState<string>('');
  const [filterAno, setFilterAno] = useState<number | undefined>();
  const [syncYear, setSyncYear] = useState<number>(2017);
  const [syncType, setSyncType] = useState<'mapa_turismo' | 'categorizacao'>('mapa_turismo');
  const [useFirecrawl, setUseFirecrawl] = useState(true);

  const { data: municipios, isLoading } = useMapaTurismo({
    uf: filterUF || undefined,
    ano: filterAno,
  });
  const { data: stats } = useMapaTurismoStats();
  const { data: syncLogs } = useMapaTurismoSyncLogs();
  const ingestMutation = useIngestMapaTurismo();

  const handleSync = () => {
    ingestMutation.mutate({ year: syncYear, sync_type: syncType, use_firecrawl: useFirecrawl });
  };

  return (
    <div className="space-y-6">
      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">{stats?.totalMunicipios || 0}</p>
                <p className="text-sm text-muted-foreground">Municípios Mapeados</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">{stats ? Object.keys(stats.byUF).length : 0}</p>
                <p className="text-sm text-muted-foreground">UFs com Dados</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div>
              <p className="text-2xl font-bold">{stats?.latestYear || '—'}</p>
              <p className="text-sm text-muted-foreground">Ano Mais Recente</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div>
              <p className="text-2xl font-bold">{stats ? Object.keys(stats.byCategoria).length : 0}</p>
              <p className="text-sm text-muted-foreground">Categorias</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category distribution */}
      {stats && Object.keys(stats.byCategoria).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribuição por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {Object.entries(stats.byCategoria).sort().map(([cat, count]) => (
                <div key={cat} className="flex items-center gap-2">
                  <Badge className={CATEGORY_COLORS[cat] || 'bg-muted'}>
                    Categoria {cat}
                  </Badge>
                  <span className="text-sm font-medium">{count as number}</span>
                </div>
              ))}
            </div>
            {Object.keys(stats.byType).length > 0 && (
              <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t">
                {Object.entries(stats.byType).map(([type, count]) => (
                  <div key={type} className="flex items-center gap-2">
                    <Badge variant="outline">{TYPE_LABELS[type] || type}</Badge>
                    <span className="text-sm">{count as number}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="dados">
        <TabsList>
          <TabsTrigger value="dados">Dados</TabsTrigger>
          <TabsTrigger value="importar">Importar</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="dados" className="space-y-4">
          {/* Filters */}
          <div className="flex gap-3 flex-wrap">
            <Select value={filterUF} onValueChange={setFilterUF}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="UF" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas UFs</SelectItem>
                {UF_LIST.map(uf => (
                  <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {stats?.availableYears && (
              <Select value={filterAno?.toString() || ''} onValueChange={(v) => setFilterAno(v ? Number(v) : undefined)}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Ano" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {stats.availableYears.map(y => (
                    <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !municipios || municipios.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <MapPin className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p>Nenhum dado importado ainda.</p>
                <p className="text-sm">Use a aba "Importar" para buscar dados do Mapa do Turismo.</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Município</TableHead>
                      <TableHead>UF</TableHead>
                      <TableHead>Região Turística</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Ano</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {municipios.map(m => (
                      <TableRow key={m.id}>
                        <TableCell className="font-medium">{m.municipio}</TableCell>
                        <TableCell>{m.uf}</TableCell>
                        <TableCell className="text-sm">{m.regiao_turistica || '—'}</TableCell>
                        <TableCell>
                          {m.categoria ? (
                            <Badge className={CATEGORY_COLORS[m.categoria] || 'bg-muted'}>
                              {m.categoria}
                            </Badge>
                          ) : '—'}
                        </TableCell>
                        <TableCell className="text-sm">
                          {m.municipality_type ? TYPE_LABELS[m.municipality_type] || m.municipality_type : '—'}
                        </TableCell>
                        <TableCell>{m.ano_referencia}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="importar" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Download className="h-5 w-5" />
                Importar do Mapa do Turismo Brasileiro
              </CardTitle>
              <CardDescription>
                Dados importados via <strong>Firecrawl</strong> (scraping inteligente) com fallback para <strong>dados.turismo.gov.br</strong> (CKAN API).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Firecrawl toggle */}
              <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                <Flame className="h-5 w-5 text-orange-500 shrink-0" />
                <div className="flex-1">
                  <Label htmlFor="firecrawl-toggle" className="font-medium cursor-pointer">
                    Usar Firecrawl (Scraping Inteligente)
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Busca dados mais recentes via scraping do portal oficial. Se falhar, usa CSVs do CKAN como fallback.
                  </p>
                </div>
                <Switch
                  id="firecrawl-toggle"
                  checked={useFirecrawl}
                  onCheckedChange={setUseFirecrawl}
                />
              </div>

              <div className="flex gap-3 items-end flex-wrap">
                <div>
                  <label className="text-sm font-medium block mb-1">Tipo de Dados</label>
                  <Select value={syncType} onValueChange={(v: any) => setSyncType(v)}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mapa_turismo">Mapa do Turismo</SelectItem>
                      <SelectItem value="categorizacao">Categorização</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {!useFirecrawl && (
                  <div>
                    <label className="text-sm font-medium block mb-1">Ano</label>
                    <Select value={syncYear.toString()} onValueChange={(v) => setSyncYear(Number(v))}>
                      <SelectTrigger className="w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {syncType === 'mapa_turismo' ? (
                          <>
                            <SelectItem value="2017">2017</SelectItem>
                            <SelectItem value="2016">2016</SelectItem>
                            <SelectItem value="2013">2013</SelectItem>
                          </>
                        ) : (
                          <>
                            <SelectItem value="2017">2017/2018</SelectItem>
                            <SelectItem value="2014">2014/2015</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <Button 
                  onClick={handleSync} 
                  disabled={ingestMutation.isPending}
                >
                  {ingestMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : useFirecrawl ? (
                    <Flame className="h-4 w-4 mr-2" />
                  ) : (
                    <Database className="h-4 w-4 mr-2" />
                  )}
                  {useFirecrawl ? 'Importar via Firecrawl' : 'Importar via CKAN'}
                </Button>
              </div>

              <div className="text-sm text-muted-foreground space-y-1 bg-muted/50 rounded-lg p-4">
                <p><strong>Estratégia de coleta:</strong></p>
                <ul className="list-disc ml-4 space-y-1">
                  <li><strong>🔥 Firecrawl (primário):</strong> Scraping inteligente do portal oficial para dados mais recentes</li>
                  <li><strong>📊 CKAN (fallback):</strong> CSVs estáticos de dados.turismo.gov.br (2013-2017)</li>
                </ul>
                <p className="mt-2">Os dados importados são vinculados automaticamente aos destinos cadastrados no SISTUR.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="historico" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Histórico de Sincronização</CardTitle>
            </CardHeader>
            <CardContent>
              {!syncLogs || syncLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhuma sincronização realizada.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Ano</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Registros</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {syncLogs.map(log => (
                      <TableRow key={log.id}>
                        <TableCell className="text-sm">
                          {format(new Date(log.started_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {log.sync_type === 'mapa_turismo' ? 'Mapa' : 'Categorização'}
                          </Badge>
                        </TableCell>
                        <TableCell>{log.ano_referencia || '—'}</TableCell>
                        <TableCell>
                          {log.status === 'success' ? (
                            <Badge className="bg-green-100 text-green-800"><CheckCircle2 className="h-3 w-3 mr-1" /> OK</Badge>
                          ) : log.status === 'error' ? (
                            <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Erro</Badge>
                          ) : (
                            <Badge variant="secondary"><Clock className="h-3 w-3 mr-1 animate-spin" /> Executando</Badge>
                          )}
                        </TableCell>
                        <TableCell>{log.records_inserted}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
