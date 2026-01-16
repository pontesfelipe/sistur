import { useState } from 'react';
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
  Shield,
  Paperclip,
  ClipboardCheck,
  Award,
  HelpCircle
} from 'lucide-react';
import { useAdminTrainings, useAdminTrainingMutations, TrainingFormData } from '@/hooks/useEduAdmin';
import { TrainingAccessManager } from '@/components/admin/TrainingAccessManager';
import { TrainingMaterialsManager, TrainingMaterial } from '@/components/admin/TrainingMaterialsManager';
import { ExamRulesetManager } from '@/components/admin/ExamRulesetManager';
import { CertificateStatsPanel } from '@/components/admin/CertificateStatsPanel';
import { QuestionBankPanel } from '@/components/admin/QuestionBankPanel';

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
  materials: TrainingMaterial[];
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
  materials: [],
};

export function AdminTrainingsPanel() {
  const [mainTab, setMainTab] = useState<'trainings' | 'certificates' | 'questions'>('trainings');
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
    const existingMaterials: TrainingMaterial[] = Array.isArray(training.materials) 
      ? (training.materials as TrainingMaterial[])
      : [];
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
      materials: existingMaterials,
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
      materials: formData.materials,
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

  const stats = {
    total: trainings?.length || 0,
    courses: trainings?.filter(t => t.type === 'course').length || 0,
    lives: trainings?.filter(t => t.type === 'live').length || 0,
    published: trainings?.filter(t => t.status === 'published').length || 0,
    draft: trainings?.filter(t => t.status === 'draft').length || 0,
  };

  return (
    <div className="space-y-6">
      <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as 'trainings' | 'certificates' | 'questions')}>
        <TabsList className="w-full max-w-lg">
          <TabsTrigger value="trainings" className="gap-2 flex-1">
            <GraduationCap className="h-4 w-4" />
            Treinamentos
          </TabsTrigger>
          <TabsTrigger value="questions" className="gap-2 flex-1">
            <HelpCircle className="h-4 w-4" />
            Questões
          </TabsTrigger>
          <TabsTrigger value="certificates" className="gap-2 flex-1">
            <Award className="h-4 w-4" />
            Certificados
          </TabsTrigger>
        </TabsList>

        <TabsContent value="trainings" className="space-y-6 mt-6">
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
                        <TableHead>Treinamento</TableHead>
                        <TableHead className="hidden md:table-cell">Pilar</TableHead>
                        <TableHead className="hidden md:table-cell">Tipo</TableHead>
                        <TableHead className="hidden lg:table-cell">Status</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTrainings?.map((training) => (
                        <TableRow key={training.training_id}>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">{training.title}</span>
                              {training.course_code && (
                                <span className="text-xs text-muted-foreground">{training.course_code}</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <Badge className={PILLAR_COLORS[training.pillar as PillarType]}>
                              {training.pillar}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <Badge variant="outline">
                              {training.type === 'course' ? (
                                <><GraduationCap className="h-3 w-3 mr-1" />Curso</>
                              ) : (
                                <><Video className="h-3 w-3 mr-1" />Live</>
                              )}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            <Badge className={STATUS_LABELS[training.status as TrainingStatus]?.color}>
                              {STATUS_LABELS[training.status as TrainingStatus]?.label}
                            </Badge>
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
                                <DropdownMenuItem onClick={() => handleOpenAccessManager(training)}>
                                  <Shield className="h-4 w-4 mr-2" />
                                  Acesso
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {training.status === 'draft' && (
                                  <DropdownMenuItem onClick={() => handlePublish(training.training_id)}>
                                    <Send className="h-4 w-4 mr-2" />
                                    Publicar
                                  </DropdownMenuItem>
                                )}
                                {training.status === 'published' && (
                                  <DropdownMenuItem onClick={() => handleArchive(training.training_id)}>
                                    <Archive className="h-4 w-4 mr-2" />
                                    Arquivar
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => handleOpenDelete(training.training_id)}
                                  className="text-destructive"
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
        </TabsContent>

        <TabsContent value="questions" className="mt-6">
          <QuestionBankPanel />
        </TabsContent>

        <TabsContent value="certificates" className="mt-6">
          <CertificateStatsPanel />
        </TabsContent>
      </Tabs>

      {/* Training Form Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTraining ? 'Editar Treinamento' : 'Novo Treinamento'}
            </DialogTitle>
            <DialogDescription>
              {editingTraining 
                ? 'Atualize os dados do treinamento' 
                : 'Preencha os dados para criar um novo treinamento'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Título do treinamento"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="course_code">Código</Label>
                <Input
                  id="course_code"
                  value={formData.course_code}
                  onChange={(e) => setFormData(prev => ({ ...prev, course_code: e.target.value }))}
                  placeholder="Ex: RA-001"
                />
              </div>

              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select 
                  value={formData.type} 
                  onValueChange={(v) => setFormData(prev => ({ ...prev, type: v as TrainingType }))}
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
                <Label>Pilar *</Label>
                <Select 
                  value={formData.pillar} 
                  onValueChange={(v) => setFormData(prev => ({ ...prev, pillar: v as PillarType }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o pilar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RA">{PILLAR_LABELS.RA}</SelectItem>
                    <SelectItem value="OE">{PILLAR_LABELS.OE}</SelectItem>
                    <SelectItem value="AO">{PILLAR_LABELS.AO}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Nível</Label>
                <Select 
                  value={formData.level} 
                  onValueChange={(v) => setFormData(prev => ({ ...prev, level: v }))}
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
                  onValueChange={(v) => setFormData(prev => ({ ...prev, target_audience: v }))}
                >
                  <SelectTrigger>
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
                <Label htmlFor="duration">Duração (minutos)</Label>
                <Input
                  id="duration"
                  type="number"
                  value={formData.duration_minutes || ''}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    duration_minutes: e.target.value ? parseInt(e.target.value) : null 
                  }))}
                  placeholder="60"
                />
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select 
                  value={formData.status} 
                  onValueChange={(v) => setFormData(prev => ({ ...prev, status: v as TrainingStatus }))}
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

            <div className="space-y-2">
              <Label htmlFor="objective">Objetivo</Label>
              <Textarea
                id="objective"
                value={formData.objective}
                onChange={(e) => setFormData(prev => ({ ...prev, objective: e.target.value }))}
                placeholder="Descreva o objetivo do treinamento"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descrição completa do conteúdo"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="video_url">URL do Vídeo</Label>
                <Input
                  id="video_url"
                  value={formData.video_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, video_url: e.target.value }))}
                  placeholder="https://youtube.com/..."
                />
              </div>

              <div className="space-y-2">
                <Label>Provedor de Vídeo</Label>
                <Select 
                  value={formData.video_provider} 
                  onValueChange={(v) => setFormData(prev => ({ ...prev, video_provider: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="youtube">YouTube</SelectItem>
                    <SelectItem value="vimeo">Vimeo</SelectItem>
                    <SelectItem value="supabase">Storage</SelectItem>
                    <SelectItem value="mux">Mux</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="thumbnail_url">URL da Thumbnail</Label>
              <Input
                id="thumbnail_url"
                value={formData.thumbnail_url}
                onChange={(e) => setFormData(prev => ({ ...prev, thumbnail_url: e.target.value }))}
                placeholder="https://..."
              />
            </div>

            <div className="space-y-4">
              <Label>Materiais de Apoio</Label>
              <TrainingMaterialsManager
                trainingId={formData.training_id}
                materials={formData.materials}
                onMaterialsChange={(materials) => setFormData(prev => ({ ...prev, materials }))}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="active"
                checked={formData.active}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, active: checked }))}
              />
              <Label htmlFor="active">Ativo</Label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createTraining.isPending || updateTraining.isPending}>
                {editingTraining ? 'Salvar' : 'Criar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este treinamento? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Access Manager Dialog */}
      {accessTraining && (
        <Dialog open={isAccessDialogOpen} onOpenChange={setIsAccessDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Gerenciar Acesso: {accessTraining.title}</DialogTitle>
              <DialogDescription>
                Configure quem pode acessar este treinamento
              </DialogDescription>
            </DialogHeader>
            <TrainingAccessManager 
              trainingId={accessTraining.training_id} 
              trainingTitle={accessTraining.title}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
