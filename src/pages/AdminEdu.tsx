import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { 
  Plus, 
  Search, 
  GraduationCap, 
  Video, 
  Upload,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Archive,
  CheckCircle,
  Clock,
  FileVideo,
  BarChart3,
  Users,
  TrendingUp,
  Play
} from 'lucide-react';
import { useAdminTrainings, useAdminTrainingMutations, useVideoUpload, type TrainingFormData } from '@/hooks/useEduAdmin';
import { useAdminEnrollmentStats, useAdminEventStats } from '@/hooks/useEduEnrollments';
import { PILLAR_INFO, type Pillar } from '@/types/sistur';
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

const defaultFormData: TrainingFormData = {
  training_id: '',
  title: '',
  type: 'course',
  pillar: 'RA',
  status: 'draft',
  level: 'BASICO',
  description: '',
  objectives: '',
  target_audience: '',
  course_code: '',
  duration_minutes: 60,
  language: 'pt-BR',
};

const AdminEdu = () => {
  const [activeTab, setActiveTab] = useState('trainings');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTraining, setEditingTraining] = useState<string | null>(null);
  const [formData, setFormData] = useState<TrainingFormData>(defaultFormData);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  
  const { data: trainings, isLoading } = useAdminTrainings();
  const { data: enrollmentStats } = useAdminEnrollmentStats();
  const { data: eventStats } = useAdminEventStats(30);
  const { createTraining, updateTraining, deleteTraining, publishTraining, archiveTraining } = useAdminTrainingMutations();
  const { uploadVideo } = useVideoUpload();
  
  const filteredTrainings = trainings?.filter(training => {
    const matchesSearch = !searchQuery || 
      training.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      training.course_code?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || training.status === statusFilter;
    const matchesType = typeFilter === 'all' || training.type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  }) || [];
  
  const handleOpenCreate = () => {
    setEditingTraining(null);
    setFormData({
      ...defaultFormData,
      training_id: `TRN-${Date.now().toString(36).toUpperCase()}`,
    });
    setIsDialogOpen(true);
  };
  
  const handleOpenEdit = (training: (typeof trainings)[number]) => {
    setEditingTraining(training.training_id);
    setFormData({
      training_id: training.training_id,
      title: training.title,
      type: training.type as 'course' | 'live',
      pillar: training.pillar as 'RA' | 'OE' | 'AO',
      status: (training.status || 'draft') as 'draft' | 'published' | 'archived',
      level: training.level || 'BASICO',
      description: training.objective || '',
      objectives: training.objective || '',
      target_audience: training.target_audience || '',
      course_code: training.course_code || '',
      duration_minutes: training.duration_minutes || 60,
      language: training.language || 'pt-BR',
      video_url: training.video_url || '',
      video_provider: (training.video_provider as 'supabase' | 'mux' | 'vimeo' | 'youtube') || 'supabase',
    });
    setIsDialogOpen(true);
  };
  
  const handleSubmit = async () => {
    try {
      if (editingTraining) {
        await updateTraining.mutateAsync({
          trainingId: editingTraining,
          data: formData,
        });
        toast.success('Treinamento atualizado com sucesso!');
      } else {
        await createTraining.mutateAsync(formData);
        toast.success('Treinamento criado com sucesso!');
      }
      setIsDialogOpen(false);
      setFormData(defaultFormData);
      setEditingTraining(null);
    } catch (error) {
      toast.error('Erro ao salvar treinamento');
      console.error(error);
    }
  };
  
  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !formData.training_id) return;
    
    setUploadingVideo(true);
    try {
      const result = await uploadVideo.mutateAsync({
        file,
        trainingId: formData.training_id,
      });
      setFormData(prev => ({
        ...prev,
        video_url: result.url,
        video_provider: 'supabase',
        video_asset: { path: result.path },
      }));
      toast.success('Vídeo enviado com sucesso!');
    } catch (error) {
      toast.error('Erro ao enviar vídeo');
      console.error(error);
    } finally {
      setUploadingVideo(false);
    }
  };
  
  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      await deleteTraining.mutateAsync(deleteConfirmId);
      toast.success('Treinamento excluído');
      setDeleteConfirmId(null);
    } catch (error) {
      toast.error('Erro ao excluir treinamento');
    }
  };
  
  const handlePublish = async (trainingId: string) => {
    try {
      await publishTraining.mutateAsync(trainingId);
      toast.success('Treinamento publicado!');
    } catch (error) {
      toast.error('Erro ao publicar treinamento');
    }
  };
  
  const handleArchive = async (trainingId: string) => {
    try {
      await archiveTraining.mutateAsync(trainingId);
      toast.success('Treinamento arquivado');
    } catch (error) {
      toast.error('Erro ao arquivar treinamento');
    }
  };
  
  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'published':
        return <Badge className="bg-green-500/20 text-green-700 border-green-500/30"><Eye className="w-3 h-3 mr-1" />Publicado</Badge>;
      case 'archived':
        return <Badge variant="secondary"><Archive className="w-3 h-3 mr-1" />Arquivado</Badge>;
      default:
        return <Badge variant="outline"><EyeOff className="w-3 h-3 mr-1" />Rascunho</Badge>;
    }
  };
  
  const formatWatchTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins} minutos`;
  };

  return (
    <AppLayout 
      title="Administração EDU" 
      subtitle="Gerenciamento de treinamentos, vídeos e analytics"
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="trainings" className="gap-2">
            <GraduationCap className="h-4 w-4" />
            Treinamentos
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        {/* TRAININGS TAB */}
        <TabsContent value="trainings" className="space-y-6">
          {/* Actions Bar */}
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <div className="flex gap-3 flex-1">
              <div className="relative max-w-sm flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar treinamentos..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="draft">Rascunho</SelectItem>
                  <SelectItem value="published">Publicado</SelectItem>
                  <SelectItem value="archived">Arquivado</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="course">Cursos</SelectItem>
                  <SelectItem value="live">Lives</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={handleOpenCreate}>
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Treinamento
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingTraining ? 'Editar Treinamento' : 'Novo Treinamento'}
                  </DialogTitle>
                  <DialogDescription>
                    Preencha as informações do treinamento
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="training_id">ID</Label>
                      <Input 
                        id="training_id" 
                        value={formData.training_id}
                        onChange={(e) => setFormData(prev => ({ ...prev, training_id: e.target.value }))}
                        disabled={!!editingTraining}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="course_code">Código do Curso</Label>
                      <Input 
                        id="course_code" 
                        value={formData.course_code || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, course_code: e.target.value }))}
                        placeholder="Ex: EDU-001"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="title">Título</Label>
                    <Input 
                      id="title" 
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Nome do treinamento"
                    />
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Tipo</Label>
                      <Select 
                        value={formData.type} 
                        onValueChange={(v) => setFormData(prev => ({ ...prev, type: v as 'course' | 'live' }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="course">Curso</SelectItem>
                          <SelectItem value="live">Live</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Pilar</Label>
                      <Select 
                        value={formData.pillar} 
                        onValueChange={(v) => setFormData(prev => ({ ...prev, pillar: v as 'RA' | 'OE' | 'AO' }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="RA">RA - Recursos e Atrativos</SelectItem>
                          <SelectItem value="OE">OE - Oferta e Estrutura</SelectItem>
                          <SelectItem value="AO">AO - Ação Organizada</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Nível</Label>
                      <Select 
                        value={formData.level || 'BASICO'} 
                        onValueChange={(v) => setFormData(prev => ({ ...prev, level: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="BASICO">Básico</SelectItem>
                          <SelectItem value="INTERMEDIARIO">Intermediário</SelectItem>
                          <SelectItem value="AVANCADO">Avançado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="description">Descrição / Objetivo</Label>
                    <Textarea 
                      id="description" 
                      value={formData.description || formData.objectives || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value, objectives: e.target.value }))}
                      placeholder="Descreva o objetivo do treinamento"
                      rows={3}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="target_audience">Público-alvo</Label>
                      <Input 
                        id="target_audience" 
                        value={formData.target_audience || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, target_audience: e.target.value }))}
                        placeholder="Ex: Gestores, Técnicos"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="duration">Duração (minutos)</Label>
                      <Input 
                        id="duration" 
                        type="number"
                        value={formData.duration_minutes || 60}
                        onChange={(e) => setFormData(prev => ({ ...prev, duration_minutes: parseInt(e.target.value) || 60 }))}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select 
                      value={formData.status} 
                      onValueChange={(v) => setFormData(prev => ({ ...prev, status: v as 'draft' | 'published' | 'archived' }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Rascunho</SelectItem>
                        <SelectItem value="published">Publicado</SelectItem>
                        <SelectItem value="archived">Arquivado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Video Upload Section */}
                  <div className="space-y-4 pt-4 border-t">
                    <Label className="text-base font-semibold">Vídeo</Label>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Provedor</Label>
                        <Select 
                          value={formData.video_provider || 'supabase'} 
                          onValueChange={(v) => setFormData(prev => ({ ...prev, video_provider: v as 'supabase' | 'mux' | 'vimeo' | 'youtube' }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="supabase">Upload direto</SelectItem>
                            <SelectItem value="youtube">YouTube</SelectItem>
                            <SelectItem value="vimeo">Vimeo</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="video_url">URL do Vídeo</Label>
                        <Input 
                          id="video_url" 
                          value={formData.video_url || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, video_url: e.target.value }))}
                          placeholder="URL ou será preenchido após upload"
                        />
                      </div>
                    </div>
                    
                    {formData.video_provider === 'supabase' && (
                      <div className="flex items-center gap-4">
                        <Button 
                          type="button" 
                          variant="outline"
                          disabled={uploadingVideo}
                          className="relative"
                        >
                          <input
                            type="file"
                            accept="video/*"
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            onChange={handleVideoUpload}
                            disabled={uploadingVideo}
                          />
                          {uploadingVideo ? (
                            <>
                              <Clock className="mr-2 h-4 w-4 animate-spin" />
                              Enviando...
                            </>
                          ) : (
                            <>
                              <Upload className="mr-2 h-4 w-4" />
                              Fazer Upload
                            </>
                          )}
                        </Button>
                        {formData.video_url && (
                          <Badge variant="secondary" className="gap-1">
                            <FileVideo className="h-3 w-3" />
                            Vídeo enviado
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleSubmit}
                    disabled={!formData.title || !formData.training_id || createTraining.isPending || updateTraining.isPending}
                  >
                    {(createTraining.isPending || updateTraining.isPending) ? 'Salvando...' : 'Salvar'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Trainings Table */}
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Treinamento</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Pilar</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Vídeo</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTrainings.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        Nenhum treinamento encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTrainings.map((training) => (
                      <TableRow key={training.training_id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{training.title}</p>
                            <p className="text-xs text-muted-foreground">{training.course_code || training.training_id}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={training.type === 'course' ? 'default' : 'secondary'}>
                            {training.type === 'course' ? (
                              <><GraduationCap className="h-3 w-3 mr-1" />Curso</>
                            ) : (
                              <><Video className="h-3 w-3 mr-1" />Live</>
                            )}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={training.pillar.toLowerCase() as 'ra' | 'oe' | 'ao'}>
                            {training.pillar}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(training.status)}
                        </TableCell>
                        <TableCell>
                          {training.video_url ? (
                            <Badge variant="outline" className="gap-1">
                              <Play className="h-3 w-3" />
                              {training.video_provider || 'supabase'}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {training.status !== 'published' && (
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handlePublish(training.training_id)}
                                title="Publicar"
                              >
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              </Button>
                            )}
                            {training.status === 'published' && (
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleArchive(training.training_id)}
                                title="Arquivar"
                              >
                                <Archive className="h-4 w-4" />
                              </Button>
                            )}
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleOpenEdit(training)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => setDeleteConfirmId(training.training_id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        {/* ANALYTICS TAB */}
        <TabsContent value="analytics" className="space-y-6">
          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Matrículas</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{enrollmentStats?.totalEnrollments || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {enrollmentStats?.activeEnrollments || 0} ativos
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Conclusões</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{enrollmentStats?.completedEnrollments || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {enrollmentStats?.completedTrainings || 0} treinamentos concluídos
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tempo Total Assistido</CardTitle>
                <Play className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatWatchTime(enrollmentStats?.totalWatchSeconds || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Média de progresso: {enrollmentStats?.averageProgress || 0}%
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Eventos (30 dias)</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{eventStats?.totalEvents || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Interações registradas
                </p>
              </CardContent>
            </Card>
          </div>
          
          {/* Event Types Breakdown */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Tipos de Eventos</CardTitle>
                <CardDescription>Distribuição de eventos nos últimos 30 dias</CardDescription>
              </CardHeader>
              <CardContent>
                {eventStats?.byType && Object.keys(eventStats.byType).length > 0 ? (
                  <div className="space-y-3">
                    {Object.entries(eventStats.byType).map(([type, count]) => (
                      <div key={type} className="flex items-center justify-between">
                        <span className="text-sm font-medium capitalize">{type.replace('_', ' ')}</span>
                        <Badge variant="secondary">{count}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    Nenhum evento registrado ainda
                  </p>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Status das Matrículas</CardTitle>
                <CardDescription>Distribuição por status atual</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500" />
                      Ativos
                    </span>
                    <Badge>{enrollmentStats?.activeEnrollments || 0}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-blue-500" />
                      Concluídos
                    </span>
                    <Badge>{enrollmentStats?.completedEnrollments || 0}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-gray-400" />
                      Abandonados
                    </span>
                    <Badge variant="secondary">{enrollmentStats?.droppedEnrollments || 0}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Trainings Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Resumo dos Treinamentos</CardTitle>
              <CardDescription>Visão geral do catálogo</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <p className="text-2xl font-bold">{trainings?.length || 0}</p>
                  <p className="text-sm text-muted-foreground">Total</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-green-500/10">
                  <p className="text-2xl font-bold">{trainings?.filter(t => t.status === 'published').length || 0}</p>
                  <p className="text-sm text-muted-foreground">Publicados</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-yellow-500/10">
                  <p className="text-2xl font-bold">{trainings?.filter(t => t.status === 'draft').length || 0}</p>
                  <p className="text-sm text-muted-foreground">Rascunhos</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-blue-500/10">
                  <p className="text-2xl font-bold">{trainings?.filter(t => t.video_url).length || 0}</p>
                  <p className="text-sm text-muted-foreground">Com Vídeo</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este treinamento? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
};

export default AdminEdu;
