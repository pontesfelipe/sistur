import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import {
  Youtube,
  CheckCircle,
  Trash2,
  RefreshCw,
  Search,
  ExternalLink,
  Play,
  Upload,
  AlertTriangle,
  Sparkles,
  Clock,
  Eye,
  Radio,
} from 'lucide-react';
import {
  useImportedTrainings,
  useYoutubeIngestion,
  useImportedTrainingActions,
  getConfidenceBadgeVariant,
  getConfidenceLabel,
  type ImportedTraining,
} from '@/hooks/useYoutubeIngestion';
import { PILLAR_INFO } from '@/types/sistur';

export function ImportReviewQueue() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [pillarFilter, setPillarFilter] = useState<string>('all');
  const [showIngestionDialog, setShowIngestionDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [ingestionLimit, setIngestionLimit] = useState(50);
  const [channelHandle, setChannelHandle] = useState('@ProfessorMarioBeni');
  
  const { data: importedTrainings, isLoading, refetch } = useImportedTrainings();
  const { runIngestion, previewIngestion, isPending, lastResult } = useYoutubeIngestion();
  const { batchPublish, batchUpdatePillar, batchDelete } = useImportedTrainingActions();
  
  const filteredTrainings = importedTrainings?.filter(t => {
    const matchesSearch = !searchQuery || 
      t.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPillar = pillarFilter === 'all' || t.pillar === pillarFilter;
    return matchesSearch && matchesPillar;
  }) || [];
  
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(filteredTrainings.map(t => t.training_id)));
    } else {
      setSelectedIds(new Set());
    }
  };
  
  const handleSelectOne = (id: string, checked: boolean) => {
    const newSet = new Set(selectedIds);
    if (checked) {
      newSet.add(id);
    } else {
      newSet.delete(id);
    }
    setSelectedIds(newSet);
  };
  
  const handleRunIngestion = async () => {
    try {
      const result = await runIngestion(channelHandle, undefined, ingestionLimit);
      if (result.success) {
        toast.success(`Importados ${result.imported} vídeos, ${result.skipped} já existentes`);
        setShowIngestionDialog(false);
        refetch();
      } else {
        toast.error(result.error || 'Erro na importação');
      }
    } catch (error) {
      toast.error('Erro ao executar importação');
    }
  };
  
  const handleBatchPublish = async () => {
    if (selectedIds.size === 0) return;
    try {
      await batchPublish.mutateAsync(Array.from(selectedIds));
      toast.success(`${selectedIds.size} treinamentos publicados`);
      setSelectedIds(new Set());
    } catch (error) {
      toast.error('Erro ao publicar');
    }
  };
  
  const handleBatchUpdatePillar = async (pillar: 'RA' | 'AO' | 'OE') => {
    if (selectedIds.size === 0) return;
    try {
      await batchUpdatePillar.mutateAsync({ 
        trainingIds: Array.from(selectedIds), 
        pillar 
      });
      toast.success(`Pilar atualizado para ${pillar}`);
      setSelectedIds(new Set());
    } catch (error) {
      toast.error('Erro ao atualizar pilar');
    }
  };
  
  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;
    try {
      await batchDelete.mutateAsync(Array.from(selectedIds));
      toast.success(`${selectedIds.size} treinamentos removidos`);
      setSelectedIds(new Set());
      setShowDeleteDialog(false);
    } catch (error) {
      toast.error('Erro ao remover');
    }
  };
  
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };
  
  return (
    <div className="space-y-6">
      {/* Import Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Youtube className="h-5 w-5 text-red-500" />
                Importação de Conteúdo
              </CardTitle>
              <CardDescription>
                Importe vídeos do YouTube automaticamente com classificação por pilar SISTUR
              </CardDescription>
            </div>
            <Button onClick={() => setShowIngestionDialog(true)}>
              <Upload className="mr-2 h-4 w-4" />
              Nova Importação
            </Button>
          </div>
        </CardHeader>
        {lastResult && (
          <CardContent>
            <div className="flex items-center gap-4 text-sm flex-wrap">
              <Badge variant="outline">
                <Sparkles className="mr-1 h-3 w-3" />
                Última importação: {lastResult.imported || 0} novos, {lastResult.skipped || 0} existentes
              </Badge>
              {lastResult.source && (
                <Badge variant={lastResult.source === 'youtube_data_api' ? 'default' : 'secondary'}>
                  {lastResult.source === 'youtube_data_api' ? 'Data API' : 'RSS'}
                </Badge>
              )}
              {lastResult.hasEnrichedMetadata && (
                <Badge variant="outline" className="text-green-600 border-green-300">
                  <Eye className="mr-1 h-3 w-3" />
                  Metadados enriquecidos
                </Badge>
              )}
              {lastResult.channelId && (
                <span className="text-muted-foreground">
                  Canal: {lastResult.channelId}
                </span>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Review Queue */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <div>
              <CardTitle>Fila de Revisão</CardTitle>
              <CardDescription>
                {filteredTrainings.length} treinamentos importados aguardando revisão
              </CardDescription>
            </div>
            
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {selectedIds.size} selecionados
                </span>
                <Select onValueChange={(v) => handleBatchUpdatePillar(v as 'RA' | 'AO' | 'OE')}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Alterar pilar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RA">RA</SelectItem>
                    <SelectItem value="AO">AO</SelectItem>
                    <SelectItem value="OE">OE</SelectItem>
                  </SelectContent>
                </Select>
                <Button 
                  size="sm" 
                  onClick={handleBatchPublish}
                  disabled={batchPublish.isPending}
                >
                  <CheckCircle className="mr-1 h-4 w-4" />
                  Publicar
                </Button>
                <Button 
                  size="sm" 
                  variant="destructive"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="mr-1 h-4 w-4" />
                  Excluir
                </Button>
              </div>
            )}
          </div>
          
          {/* Filters */}
          <div className="flex gap-3 pt-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por título..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={pillarFilter} onValueChange={setPillarFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Pilar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="RA">RA</SelectItem>
                <SelectItem value="AO">AO</SelectItem>
                <SelectItem value="OE">OE</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredTrainings.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Youtube className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum conteúdo importado aguardando revisão</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => setShowIngestionDialog(true)}
              >
                Iniciar Importação
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedIds.size === filteredTrainings.length && filteredTrainings.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Duração</TableHead>
                  <TableHead>Views</TableHead>
                  <TableHead>Pilar</TableHead>
                  <TableHead>Confiança</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Importado em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTrainings.map((training) => (
                  <TableRow key={training.training_id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(training.training_id)}
                        onCheckedChange={(checked) => 
                          handleSelectOne(training.training_id, checked as boolean)
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-start gap-3">
                        {training.thumbnail_url && (
                          <div className="relative">
                            <img 
                              src={training.thumbnail_url} 
                              alt="" 
                              className="w-24 h-14 object-cover rounded"
                            />
                            {training.ingestion_metadata?.is_live && (
                              <Badge className="absolute -top-1 -right-1 px-1 py-0.5 text-xs bg-red-500">
                                <Radio className="h-3 w-3" />
                              </Badge>
                            )}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{training.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {training.ingestion_metadata?.youtube_id}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {training.ingestion_metadata?.duration_formatted ? (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {training.ingestion_metadata.duration_formatted}
                        </div>
                      ) : training.duration_minutes ? (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {training.duration_minutes}min
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {training.ingestion_metadata?.view_count !== undefined ? (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Eye className="h-3 w-3" />
                          {training.ingestion_metadata.view_count.toLocaleString('pt-BR')}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        style={{
                          backgroundColor: PILLAR_INFO[training.pillar as keyof typeof PILLAR_INFO]?.color + '20',
                          color: PILLAR_INFO[training.pillar as keyof typeof PILLAR_INFO]?.color,
                          borderColor: PILLAR_INFO[training.pillar as keyof typeof PILLAR_INFO]?.color + '40',
                        }}
                      >
                        {training.pillar}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant={getConfidenceBadgeVariant(training.ingestion_confidence)}>
                          {Math.round(training.ingestion_confidence * 100)}%
                        </Badge>
                        {training.ingestion_confidence < 0.5 && (
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={training.type === 'live' ? 'secondary' : 'outline'}>
                        {training.type === 'live' ? 'Live' : 'Curso'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(training.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          asChild
                        >
                          <a 
                            href={training.video_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            title="Ver no YouTube"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            handleSelectOne(training.training_id, true);
                            handleBatchPublish();
                          }}
                          title="Publicar"
                        >
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Ingestion Dialog */}
      <AlertDialog open={showIngestionDialog} onOpenChange={setShowIngestionDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Youtube className="h-5 w-5 text-red-500" />
              Importar Vídeos do YouTube
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p>
                Esta ação irá buscar vídeos do canal e importá-los como rascunhos 
                com classificação automática por pilar SISTUR.
              </p>
              
              <div className="space-y-3 pt-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Canal do YouTube</label>
                  <Input
                    value={channelHandle}
                    onChange={(e) => setChannelHandle(e.target.value)}
                    placeholder="@ProfessorMarioBeni"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Limite de vídeos</label>
                  <Select 
                    value={ingestionLimit.toString()} 
                    onValueChange={(v) => setIngestionLimit(parseInt(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10 vídeos</SelectItem>
                      <SelectItem value="25">25 vídeos</SelectItem>
                      <SelectItem value="50">50 vídeos</SelectItem>
                      <SelectItem value="100">100 vídeos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRunIngestion}
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Importando...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Iniciar Importação
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir {selectedIds.size} treinamento(s)? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleBatchDelete}
              className="bg-destructive text-destructive-foreground"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}