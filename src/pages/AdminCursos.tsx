import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
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
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  GraduationCap,
  Clock,
  Users,
  Layers,
  Search,
  Filter
} from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type Course = Database['public']['Tables']['courses']['Row'];
type CourseInsert = Database['public']['Tables']['courses']['Insert'];
type PillarType = Database['public']['Enums']['pillar_type'];
type TargetAgent = Database['public']['Enums']['target_agent'];
type CourseLevel = Database['public']['Enums']['course_level'];

const PILLAR_LABELS: Record<PillarType, string> = {
  RA: 'RA - Relações Ambientais',
  AO: 'AO - Ações Operacionais',
  OE: 'OE - Organização Estrutural',
};

const TARGET_AGENT_LABELS: Record<TargetAgent, string> = {
  GESTORES: 'Gestores Públicos',
  TECNICOS: 'Técnicos',
  TRADE: 'Trade Turístico',
};

const LEVEL_LABELS: Record<CourseLevel, string> = {
  BASICO: 'Básico',
  INTERMEDIARIO: 'Intermediário',
  AVANCADO: 'Avançado',
};

const PILLAR_COLORS: Record<PillarType, string> = {
  RA: 'bg-blue-500/10 text-blue-700 border-blue-500/20',
  AO: 'bg-purple-500/10 text-purple-700 border-purple-500/20',
  OE: 'bg-green-500/10 text-green-700 border-green-500/20',
};

interface CourseFormData {
  title: string;
  description: string;
  pillar: PillarType | '';
  target_agent: TargetAgent;
  level: CourseLevel;
  theme: string;
  duration_minutes: number | null;
  url: string;
  tags: string[];
}

const defaultFormData: CourseFormData = {
  title: '',
  description: '',
  pillar: '',
  target_agent: 'GESTORES',
  level: 'BASICO',
  theme: '',
  duration_minutes: null,
  url: '',
  tags: [],
};

export default function AdminCursos() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [deletingCourseId, setDeletingCourseId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CourseFormData>(defaultFormData);
  const [tagsInput, setTagsInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPillar, setFilterPillar] = useState<PillarType | 'all'>('all');

  // Fetch courses
  const { data: courses, isLoading } = useQuery({
    queryKey: ['admin-courses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Course[];
    },
  });

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: CourseFormData) => {
      const courseData: CourseInsert = {
        title: data.title.trim(),
        description: data.description.trim() || null,
        pillar: data.pillar || null,
        target_agent: data.target_agent,
        level: data.level,
        theme: data.theme.trim() || null,
        duration_minutes: data.duration_minutes,
        url: data.url.trim() || null,
        tags: data.tags,
      };

      if (editingCourse) {
        const { error } = await supabase
          .from('courses')
          .update(courseData)
          .eq('id', editingCourse.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('courses')
          .insert(courseData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-courses'] });
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      toast.success(editingCourse ? 'Curso atualizado!' : 'Curso criado!');
      handleCloseDialog();
    },
    onError: (error) => {
      console.error('Error saving course:', error);
      toast.error('Erro ao salvar curso');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('courses')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-courses'] });
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      toast.success('Curso excluído!');
      setIsDeleteDialogOpen(false);
      setDeletingCourseId(null);
    },
    onError: (error) => {
      console.error('Error deleting course:', error);
      toast.error('Erro ao excluir curso');
    },
  });

  const handleOpenCreate = () => {
    setEditingCourse(null);
    setFormData(defaultFormData);
    setTagsInput('');
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (course: Course) => {
    setEditingCourse(course);
    setFormData({
      title: course.title,
      description: course.description || '',
      pillar: course.pillar || '',
      target_agent: course.target_agent || 'GESTORES',
      level: course.level,
      theme: course.theme || '',
      duration_minutes: course.duration_minutes,
      url: course.url || '',
      tags: Array.isArray(course.tags) ? (course.tags as string[]) : [],
    });
    setTagsInput(Array.isArray(course.tags) ? (course.tags as string[]).join(', ') : '');
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingCourse(null);
    setFormData(defaultFormData);
    setTagsInput('');
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

    const tags = tagsInput
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    saveMutation.mutate({ ...formData, tags });
  };

  const handleOpenDelete = (id: string) => {
    setDeletingCourseId(id);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (deletingCourseId) {
      deleteMutation.mutate(deletingCourseId);
    }
  };

  // Filtered courses
  const filteredCourses = courses?.filter(course => {
    const matchesSearch = searchQuery === '' || 
      course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.theme?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesPillar = filterPillar === 'all' || course.pillar === filterPillar;
    
    return matchesSearch && matchesPillar;
  });

  return (
    <AppLayout title="Administração de Cursos" subtitle="Gerencie o catálogo SISTUR EDU">
      <div className="space-y-6">
        {/* Actions Bar */}
        <Card>
          <CardContent className="py-4">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex flex-1 gap-3 w-full sm:w-auto">
                <div className="relative flex-1 sm:max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar cursos..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={filterPillar} onValueChange={(v) => setFilterPillar(v as PillarType | 'all')}>
                  <SelectTrigger className="w-[180px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filtrar pilar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os pilares</SelectItem>
                    <SelectItem value="RA">RA - Relações Ambientais</SelectItem>
                    <SelectItem value="AO">AO - Ações Operacionais</SelectItem>
                    <SelectItem value="OE">OE - Organização Estrutural</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleOpenCreate} className="gap-2">
                <Plus className="h-4 w-4" />
                Novo Curso
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Courses Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary" />
              Catálogo de Cursos
            </CardTitle>
            <CardDescription>
              {filteredCourses?.length || 0} curso(s) encontrado(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                Carregando cursos...
              </div>
            ) : filteredCourses?.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <GraduationCap className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">Nenhum curso encontrado</p>
                <Button variant="link" onClick={handleOpenCreate}>
                  Criar primeiro curso
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Título</TableHead>
                      <TableHead>Pilar</TableHead>
                      <TableHead>Agente</TableHead>
                      <TableHead>Nível</TableHead>
                      <TableHead>Tema</TableHead>
                      <TableHead>Duração</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCourses?.map((course) => (
                      <TableRow key={course.id}>
                        <TableCell className="font-medium max-w-[250px]">
                          <div className="truncate" title={course.title}>
                            {course.title}
                          </div>
                          {course.description && (
                            <p className="text-xs text-muted-foreground truncate mt-0.5" title={course.description}>
                              {course.description}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          {course.pillar ? (
                            <Badge variant="outline" className={PILLAR_COLORS[course.pillar]}>
                              {course.pillar}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm">
                              {course.target_agent ? TARGET_AGENT_LABELS[course.target_agent] : '-'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {LEVEL_LABELS[course.level]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {course.theme || '-'}
                          </span>
                        </TableCell>
                        <TableCell>
                          {course.duration_minutes ? (
                            <div className="flex items-center gap-1 text-sm">
                              <Clock className="h-3 w-3 text-muted-foreground" />
                              {course.duration_minutes} min
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenEdit(course)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenDelete(course.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
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
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingCourse ? 'Editar Curso' : 'Novo Curso'}
              </DialogTitle>
              <DialogDescription>
                {editingCourse
                  ? 'Atualize as informações do curso'
                  : 'Preencha os dados para criar um novo curso no catálogo SISTUR EDU'}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Nome do curso"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descrição detalhada do curso"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pillar">Pilar *</Label>
                  <Select
                    value={formData.pillar}
                    onValueChange={(v) => setFormData({ ...formData, pillar: v as PillarType })}
                  >
                    <SelectTrigger>
                      <Layers className="h-4 w-4 mr-2" />
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
                  <Label htmlFor="target_agent">Agente Alvo *</Label>
                  <Select
                    value={formData.target_agent}
                    onValueChange={(v) => setFormData({ ...formData, target_agent: v as TargetAgent })}
                  >
                    <SelectTrigger>
                      <Users className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Selecione o agente" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GESTORES">{TARGET_AGENT_LABELS.GESTORES}</SelectItem>
                      <SelectItem value="TECNICOS">{TARGET_AGENT_LABELS.TECNICOS}</SelectItem>
                      <SelectItem value="TRADE">{TARGET_AGENT_LABELS.TRADE}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="level">Nível *</Label>
                  <Select
                    value={formData.level}
                    onValueChange={(v) => setFormData({ ...formData, level: v as CourseLevel })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o nível" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BASICO">{LEVEL_LABELS.BASICO}</SelectItem>
                      <SelectItem value="INTERMEDIARIO">{LEVEL_LABELS.INTERMEDIARIO}</SelectItem>
                      <SelectItem value="AVANCADO">{LEVEL_LABELS.AVANCADO}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="theme">Tema</Label>
                  <Input
                    id="theme"
                    value={formData.theme}
                    onChange={(e) => setFormData({ ...formData, theme: e.target.value })}
                    placeholder="Ex: Sustentabilidade, Governança"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duration">Duração (minutos)</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={formData.duration_minutes || ''}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      duration_minutes: e.target.value ? parseInt(e.target.value) : null 
                    })}
                    placeholder="Ex: 60"
                    min={0}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="url">URL do Curso</Label>
                  <Input
                    id="url"
                    type="url"
                    value={formData.url}
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tags">Tags (separadas por vírgula)</Label>
                <Input
                  id="tags"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="Ex: sustentabilidade, ambiental, legislação"
                />
              </div>

              <DialogFooter className="gap-2">
                <Button type="button" variant="outline" onClick={handleCloseDialog}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? 'Salvando...' : editingCourse ? 'Atualizar' : 'Criar'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir Curso</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir este curso? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteMutation.isPending ? 'Excluindo...' : 'Excluir'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
}
