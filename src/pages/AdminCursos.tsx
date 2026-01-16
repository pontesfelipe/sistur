import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  GraduationCap,
  Clock,
  Users,
  Search,
  Filter,
  Video,
  MoreVertical,
  Archive,
  Eye,
  Send,
  FileText,
  Link as LinkIcon,
  Play,
  Shield
} from 'lucide-react';
import { useAdminTrainings, useAdminTrainingMutations, TrainingFormData } from '@/hooks/useEduAdmin';
import { TrainingAccessManager } from '@/components/admin/TrainingAccessManager';

type PillarType = 'RA' | 'OE' | 'AO';
type TrainingType = 'course' | 'live';
type TrainingStatus = 'draft' | 'published' | 'archived';

const PILLAR_LABELS: Record<PillarType, string> = {
  RA: 'RA - Relações Ambientais',
  AO: 'AO - Ações Operacionais',
  OE: 'OE - Organização Estrutural',
};

const PILLAR_COLORS: Record<PillarType, string> = {
  RA: 'bg-blue-500/10 text-blue-700 border-blue-500/20',
  AO: 'bg-purple-500/10 text-purple-700 border-purple-500/20',
  OE: 'bg-green-500/10 text-green-700 border-green-500/20',
};

const STATUS_LABELS: Record<TrainingStatus, { label: string; color: string }> = {
  draft: { label: 'Rascunho', color: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20' },
  published: { label: 'Publicado', color: 'bg-green-500/10 text-green-700 border-green-500/20' },
  archived: { label: 'Arquivado', color: 'bg-gray-500/10 text-gray-700 border-gray-500/20' },
};

const LEVEL_OPTIONS = [
  { value: 'Básico', label: 'Básico' },
  { value: 'Intermediário', label: 'Intermediário' },
  { value: 'Avançado', label: 'Avançado' },
];

const TARGET_AUDIENCE_OPTIONS = [
  { value: 'GESTORES', label: 'Gestores Públicos' },
  { value: 'TECNICOS', label: 'Técnicos' },
  { value: 'TRADE', label: 'Trade Turístico' },
];

interface FormData {
  training_id: string;
  title: string;
  type: TrainingType;
  pillar: PillarType | '';
  level: string;
  description: string;
  objective: string;
  target_audience: string;
  course_code: string;
  duration_minutes: number | null;
  video_url: string;
  video_provider: string;
  thumbnail_url: string;
  status: TrainingStatus;
  active: boolean;
}

const defaultFormData: FormData = {
  training_id: '',
  title: '',
  type: 'course',
  pillar: '',
  level: 'Básico',
  description: '',
  objective: '',
  target_audience: 'GESTORES',
  course_code: '',
  duration_minutes: null,
  video_url: '',
  video_provider: 'youtube',
  thumbnail_url: '',
  status: 'draft',
  active: true,
};

export default function AdminCursos() {
  const { data: trainings, isLoading } = useAdminTrainings();
  const { createTraining, updateTraining, archiveTraining, publishTraining, deleteTraining } = useAdminTrainingMutations();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isAccessDialogOpen, setIsAccessDialogOpen] = useState(false);
  const [editingTraining, setEditingTraining] = useState<typeof trainings extends (infer T)[] ? T : never | null>(null);
  const [accessTraining, setAccessTraining] = useState<typeof trainings extends (infer T)[] ? T : never | null>(null);
  const [deletingTrainingId, setDeletingTrainingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(defaultFormData);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPillar, setFilterPillar] = useState<PillarType | 'all'>('all');
  const [filterType, setFilterType] = useState<TrainingType | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<TrainingStatus | 'all'>('all');

  const handleOpenAccessManager = (training: NonNullable<typeof trainings>[number]) => {
    setAccessTraining(training);
    setIsAccessDialogOpen(true);
  };

  const handleOpenCreate = (type: TrainingType = 'course') => {
    setEditingTraining(null);
    setFormData({
      ...defaultFormData,
      type,
      training_id: `${type}-${Date.now().toString(36)}`,
    });
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (training: NonNullable<typeof trainings>[number]) => {
    setEditingTraining(training);
    setFormData({
      training_id: training.training_id,
      title: training.title,
      type: (training.type as TrainingType) || 'course',
      pillar: (training.pillar as PillarType) || '',
      level: training.level || 'Básico',
      description: training.description || '',
      objective: training.objective || '',
      target_audience: training.target_audience || 'GESTORES',
      course_code: training.course_code || '',
      duration_minutes: training.duration_minutes,
      video_url: training.video_url || '',
      video_provider: training.video_provider || 'youtube',
      thumbnail_url: training.thumbnail_url || '',
      status: (training.status as TrainingStatus) || 'draft',
      active: training.active ?? true,
    });
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingTraining(null);
    setFormData(defaultFormData);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast.error('Título é obrigatório');
      return;
    }
    
    if (!formData.pillar) {
      toast.error('Pilar é obrigatório');
      return;
    }

    const trainingData: TrainingFormData = {
      training_id: formData.training_id,
      title: formData.title.trim(),
      type: formData.type,
      pillar: formData.pillar as PillarType,
      level: formData.level || undefined,
      description: formData.description.trim() || undefined,
      objective: formData.objective.trim() || undefined,
      target_audience: formData.target_audience || undefined,
      course_code: formData.course_code.trim() || undefined,
      duration_minutes: formData.duration_minutes || undefined,
      video_url: formData.video_url.trim() || undefined,
      video_provider: formData.video_provider as 'youtube' | 'vimeo' | 'supabase' | 'mux' || undefined,
      thumbnail_url: formData.thumbnail_url.trim() || undefined,
      status: formData.status,
      active: formData.active,
    };

    if (editingTraining) {
      updateTraining.mutate(
        { trainingId: editingTraining.training_id, data: trainingData },
        {
          onSuccess: () => {
            toast.success('Treinamento atualizado!');
            handleCloseDialog();
          },
          onError: (error) => {
            toast.error(`Erro ao atualizar: ${error.message}`);
          },
        }
      );
    } else {
      createTraining.mutate(trainingData, {
        onSuccess: () => {
          toast.success('Treinamento criado!');
          handleCloseDialog();
        },
        onError: (error) => {
          toast.error(`Erro ao criar: ${error.message}`);
        },
      });
    }
  };

  const handleOpenDelete = (id: string) => {
    setDeletingTrainingId(id);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (deletingTrainingId) {
      deleteTraining.mutate(deletingTrainingId, {
        onSuccess: () => {
          toast.success('Treinamento excluído!');
          setIsDeleteDialogOpen(false);
          setDeletingTrainingId(null);
        },
        onError: (error) => {
          toast.error(`Erro ao excluir: ${error.message}`);
        },
      });
    }
  };

  const handlePublish = (trainingId: string) => {
    publishTraining.mutate(trainingId, {
      onSuccess: () => toast.success('Treinamento publicado!'),
      onError: (error) => toast.error(`Erro ao publicar: ${error.message}`),
    });
  };

  const handleArchive = (trainingId: string) => {
    archiveTraining.mutate(trainingId, {
      onSuccess: () => toast.success('Treinamento arquivado!'),
      onError: (error) => toast.error(`Erro ao arquivar: ${error.message}`),
    });
  };

  // Filtered trainings
  const filteredTrainings = trainings?.filter(training => {
    const matchesSearch = searchQuery === '' || 
      training.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      training.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      training.course_code?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesPillar = filterPillar === 'all' || training.pillar === filterPillar;
    const matchesType = filterType === 'all' || training.type === filterType;
    const matchesStatus = filterStatus === 'all' || training.status === filterStatus;
    
    return matchesSearch && matchesPillar && matchesType && matchesStatus;
  });

  // Stats
  const stats = {
    total: trainings?.length || 0,
    courses: trainings?.filter(t => t.type === 'course').length || 0,
    lives: trainings?.filter(t => t.type === 'live').length || 0,
    published: trainings?.filter(t => t.status === 'published').length || 0,
    draft: trainings?.filter(t => t.status === 'draft').length || 0,
  };

  return (
    <AppLayout title="Administração de Treinamentos" subtitle="Gerencie o catálogo SISTUR EDU">
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">Total</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-primary">{stats.courses}</div>
              <p className="text-xs text-muted-foreground">Cursos</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-purple-600">{stats.lives}</div>
              <p className="text-xs text-muted-foreground">Lives</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">{stats.published}</div>
              <p className="text-xs text-muted-foreground">Publicados</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-yellow-600">{stats.draft}</div>
              <p className="text-xs text-muted-foreground">Rascunhos</p>
            </CardContent>
          </Card>
        </div>

        {/* Actions Bar */}
        <Card>
          <CardContent className="py-4">
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
              <div className="flex flex-1 flex-wrap gap-3 w-full lg:w-auto">
                <div className="relative flex-1 min-w-[200px] max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar treinamentos..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={filterPillar} onValueChange={(v) => setFilterPillar(v as PillarType | 'all')}>
                  <SelectTrigger className="w-[160px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Pilar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os pilares</SelectItem>
                    <SelectItem value="RA">RA</SelectItem>
                    <SelectItem value="AO">AO</SelectItem>
                    <SelectItem value="OE">OE</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterType} onValueChange={(v) => setFilterType(v as TrainingType | 'all')}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="course">Cursos</SelectItem>
                    <SelectItem value="live">Lives</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as TrainingStatus | 'all')}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="draft">Rascunho</SelectItem>
                    <SelectItem value="published">Publicado</SelectItem>
                    <SelectItem value="archived">Arquivado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => handleOpenCreate('course')} className="gap-2">
                  <GraduationCap className="h-4 w-4" />
                  Novo Curso
                </Button>
                <Button onClick={() => handleOpenCreate('live')} variant="outline" className="gap-2">
                  <Video className="h-4 w-4" />
                  Nova Live
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Trainings Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary" />
              Catálogo de Treinamentos
            </CardTitle>
            <CardDescription>
              {filteredTrainings?.length || 0} treinamento(s) encontrado(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                Carregando treinamentos...
              </div>
            ) : filteredTrainings?.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <GraduationCap className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">Nenhum treinamento encontrado</p>
                <Button variant="link" onClick={() => handleOpenCreate('course')}>
                  Criar primeiro treinamento
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[250px]">Título</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Pilar</TableHead>
                      <TableHead>Nível</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Duração</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTrainings?.map((training) => (
                      <TableRow key={training.training_id}>
                        <TableCell className="font-medium">
                          <div className="flex items-start gap-3">
                            {training.thumbnail_url ? (
                              <img 
                                src={training.thumbnail_url} 
                                alt="" 
                                className="w-16 h-10 object-cover rounded"
                              />
                            ) : (
                              <div className="w-16 h-10 bg-muted rounded flex items-center justify-center">
                                {training.type === 'course' ? (
                                  <GraduationCap className="h-5 w-5 text-muted-foreground" />
                                ) : (
                                  <Video className="h-5 w-5 text-muted-foreground" />
                                )}
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="truncate font-medium" title={training.title}>
                                {training.title}
                              </div>
                              {training.course_code && (
                                <p className="text-xs text-muted-foreground">{training.course_code}</p>
                              )}
                            </div>
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
                          {training.pillar ? (
                            <Badge variant="outline" className={PILLAR_COLORS[training.pillar as PillarType]}>
                              {training.pillar}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{training.level || '-'}</span>
                        </TableCell>
                        <TableCell>
                          {training.status ? (
                            <Badge variant="outline" className={STATUS_LABELS[training.status as TrainingStatus]?.color}>
                              {STATUS_LABELS[training.status as TrainingStatus]?.label}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className={STATUS_LABELS.draft.color}>
                              {STATUS_LABELS.draft.label}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {training.duration_minutes ? (
                            <div className="flex items-center gap-1 text-sm">
                              <Clock className="h-3 w-3 text-muted-foreground" />
                              {training.duration_minutes} min
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleOpenEdit(training)}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <a href={`/edu/training/${training.training_id}`} target="_blank" rel="noopener noreferrer">
                                  <Eye className="h-4 w-4 mr-2" />
                                  Visualizar
                                </a>
                              </DropdownMenuItem>
                              {training.video_url && (
                                <DropdownMenuItem asChild>
                                  <a href={training.video_url} target="_blank" rel="noopener noreferrer">
                                    <Play className="h-4 w-4 mr-2" />
                                    Ver vídeo
                                  </a>
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleOpenAccessManager(training)}>
                                <Shield className="h-4 w-4 mr-2" />
                                Gerenciar Acesso
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {training.status !== 'published' && (
                                <DropdownMenuItem onClick={() => handlePublish(training.training_id)}>
                                  <Send className="h-4 w-4 mr-2" />
                                  Publicar
                                </DropdownMenuItem>
                              )}
                              {training.status !== 'archived' && (
                                <DropdownMenuItem onClick={() => handleArchive(training.training_id)}>
                                  <Archive className="h-4 w-4 mr-2" />
                                  Arquivar
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => handleOpenDelete(training.training_id)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {formData.type === 'course' ? (
                  <GraduationCap className="h-5 w-5" />
                ) : (
                  <Video className="h-5 w-5" />
                )}
                {editingTraining ? 'Editar' : 'Novo'} {formData.type === 'course' ? 'Curso' : 'Live'}
              </DialogTitle>
              <DialogDescription>
                {editingTraining
                  ? 'Atualize as informações do treinamento'
                  : 'Preencha os dados para criar um novo treinamento no catálogo SISTUR EDU'}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto pr-2 space-y-4">
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="basic">Básico</TabsTrigger>
                  <TabsTrigger value="content">Conteúdo</TabsTrigger>
                  <TabsTrigger value="media">Mídia</TabsTrigger>
                  <TabsTrigger value="access" disabled={!editingTraining}>
                    <Shield className="h-3 w-3 mr-1" />
                    Acesso
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="basic" className="space-y-4 mt-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="title">Título *</Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="Nome do treinamento"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Tipo *</Label>
                      <Select
                        value={formData.type}
                        onValueChange={(v) => setFormData({ ...formData, type: v as TrainingType })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="course">
                            <div className="flex items-center gap-2">
                              <GraduationCap className="h-4 w-4" />
                              Curso
                            </div>
                          </SelectItem>
                          <SelectItem value="live">
                            <div className="flex items-center gap-2">
                              <Video className="h-4 w-4" />
                              Live
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Pilar *</Label>
                      <Select
                        value={formData.pillar}
                        onValueChange={(v) => setFormData({ ...formData, pillar: v as PillarType })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o pilar" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="RA">{PILLAR_LABELS.RA}</SelectItem>
                          <SelectItem value="AO">{PILLAR_LABELS.AO}</SelectItem>
                          <SelectItem value="OE">{PILLAR_LABELS.OE}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Nível</Label>
                      <Select
                        value={formData.level}
                        onValueChange={(v) => setFormData({ ...formData, level: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {LEVEL_OPTIONS.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Público-alvo</Label>
                      <Select
                        value={formData.target_audience}
                        onValueChange={(v) => setFormData({ ...formData, target_audience: v })}
                      >
                        <SelectTrigger>
                          <Users className="h-4 w-4 mr-2" />
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TARGET_AUDIENCE_OPTIONS.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="course_code">Código</Label>
                      <Input
                        id="course_code"
                        value={formData.course_code}
                        onChange={(e) => setFormData({ ...formData, course_code: e.target.value })}
                        placeholder="Ex: RA-101"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="duration">Duração (min)</Label>
                      <Input
                        id="duration"
                        type="number"
                        min={0}
                        value={formData.duration_minutes || ''}
                        onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value ? parseInt(e.target.value) : null })}
                        placeholder="60"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select
                        value={formData.status}
                        onValueChange={(v) => setFormData({ ...formData, status: v as TrainingStatus })}
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
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="active"
                      checked={formData.active}
                      onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                    />
                    <Label htmlFor="active">Ativo (visível no catálogo)</Label>
                  </div>
                </TabsContent>

                <TabsContent value="content" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="description">Descrição</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Descrição detalhada do treinamento"
                      rows={4}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="objective">Objetivo</Label>
                    <Textarea
                      id="objective"
                      value={formData.objective}
                      onChange={(e) => setFormData({ ...formData, objective: e.target.value })}
                      placeholder="O que o aluno vai aprender neste treinamento"
                      rows={3}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="media" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>Provedor de Vídeo</Label>
                    <Select
                      value={formData.video_provider}
                      onValueChange={(v) => setFormData({ ...formData, video_provider: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="youtube">YouTube</SelectItem>
                        <SelectItem value="vimeo">Vimeo</SelectItem>
                        <SelectItem value="supabase">Upload direto</SelectItem>
                        <SelectItem value="mux">Mux</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="video_url">URL do Vídeo</Label>
                    <div className="flex gap-2">
                      <LinkIcon className="h-4 w-4 mt-3 text-muted-foreground" />
                      <Input
                        id="video_url"
                        value={formData.video_url}
                        onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                        placeholder="https://www.youtube.com/watch?v=..."
                        className="flex-1"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="thumbnail_url">URL da Thumbnail</Label>
                    <div className="flex gap-2">
                      <FileText className="h-4 w-4 mt-3 text-muted-foreground" />
                      <Input
                        id="thumbnail_url"
                        value={formData.thumbnail_url}
                        onChange={(e) => setFormData({ ...formData, thumbnail_url: e.target.value })}
                        placeholder="https://..."
                        className="flex-1"
                      />
                    </div>
                    {formData.thumbnail_url && (
                      <div className="mt-2">
                        <img 
                          src={formData.thumbnail_url} 
                          alt="Preview" 
                          className="w-32 h-20 object-cover rounded border"
                          onError={(e) => (e.currentTarget.style.display = 'none')}
                        />
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="access" className="space-y-4 mt-4">
                  {editingTraining ? (
                    <TrainingAccessManager 
                      trainingId={editingTraining.training_id} 
                      trainingTitle={editingTraining.title} 
                    />
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      Salve o treinamento primeiro para configurar o controle de acesso.
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </form>

            <DialogFooter className="flex-shrink-0 pt-4 border-t">
              <Button variant="outline" onClick={handleCloseDialog}>
                Cancelar
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={createTraining.isPending || updateTraining.isPending}
              >
                {createTraining.isPending || updateTraining.isPending 
                  ? 'Salvando...' 
                  : editingTraining ? 'Salvar' : 'Criar'
                }
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir treinamento?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. O treinamento será permanentemente removido do catálogo.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteTraining.isPending ? 'Excluindo...' : 'Excluir'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Access Management Dialog */}
        <Dialog open={isAccessDialogOpen} onOpenChange={setIsAccessDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Gerenciar Acesso
              </DialogTitle>
              <DialogDescription>
                Configure quem pode acessar este treinamento
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto">
              {accessTraining && (
                <TrainingAccessManager 
                  trainingId={accessTraining.training_id} 
                  trainingTitle={accessTraining.title} 
                />
              )}
            </div>
            <DialogFooter className="flex-shrink-0 pt-4 border-t">
              <Button onClick={() => setIsAccessDialogOpen(false)}>
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
