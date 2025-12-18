import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { 
  Route, 
  Users,
  GraduationCap,
  ArrowRight,
  Target,
  ChevronLeft,
  Plus,
  Video,
  Search,
  CheckCircle2,
  Circle,
  Edit,
  Trash2,
  Award,
  Calendar
} from 'lucide-react';
import { 
  useEduTracks, 
  useEduTrack, 
  useEduTrackMutations, 
  useEduTrackWithTrainings,
  useUserTrackProgress,
  useAllUserProgress,
  useTrainingProgressMutations,
  EduTrack
} from '@/hooks/useEdu';
import { useEduTrainings, EduTraining } from '@/hooks/useEduTrainings';
import { useAuth } from '@/hooks/useAuth';
import { TARGET_AGENT_INFO, type TargetAgent } from '@/types/sistur';
import { TrackCertificate } from '@/components/edu/TrackCertificate';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Track colors for visual differentiation
const TRACK_COLORS = [
  'from-blue-500/20 to-blue-600/5 border-blue-500/30',
  'from-green-500/20 to-green-600/5 border-green-500/30',
  'from-purple-500/20 to-purple-600/5 border-purple-500/30',
  'from-orange-500/20 to-orange-600/5 border-orange-500/30',
  'from-pink-500/20 to-pink-600/5 border-pink-500/30',
  'from-cyan-500/20 to-cyan-600/5 border-cyan-500/30',
];

interface TrackFormDialogProps {
  trainings: EduTraining[];
  onSubmit: (data: { 
    track: { name: string; description?: string; objective?: string; audience?: TargetAgent; delivery?: string }; 
    trainingIds: string[] 
  }) => void;
  isSubmitting: boolean;
  initialData?: {
    name: string;
    description?: string;
    objective?: string;
    audience?: TargetAgent;
    delivery?: string;
    trainingIds: string[];
  };
  mode: 'create' | 'edit';
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TrackFormDialog = ({ 
  trainings, 
  onSubmit, 
  isSubmitting, 
  initialData,
  mode,
  open,
  onOpenChange
}: TrackFormDialogProps) => {
  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [objective, setObjective] = useState(initialData?.objective || '');
  const [audience, setAudience] = useState<TargetAgent | ''>(initialData?.audience || '');
  const [delivery, setDelivery] = useState(initialData?.delivery || '');
  const [selectedTrainings, setSelectedTrainings] = useState<string[]>(initialData?.trainingIds || []);
  const [searchQuery, setSearchQuery] = useState('');

  // Reset form when initialData changes
  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setDescription(initialData.description || '');
      setObjective(initialData.objective || '');
      setAudience(initialData.audience || '');
      setDelivery(initialData.delivery || '');
      setSelectedTrainings(initialData.trainingIds || []);
    }
  }, [initialData]);

  const filteredTrainings = trainings.filter(t => 
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.course_code?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmit = () => {
    if (!name.trim() || selectedTrainings.length === 0) return;
    
    onSubmit({
      track: {
        name: name.trim(),
        description: description.trim() || undefined,
        objective: objective.trim() || undefined,
        audience: audience || undefined,
        delivery: delivery.trim() || undefined,
      },
      trainingIds: selectedTrainings,
    });
    
    if (mode === 'create') {
      // Reset form only on create
      setName('');
      setDescription('');
      setObjective('');
      setAudience('');
      setDelivery('');
      setSelectedTrainings([]);
      setSearchQuery('');
    }
  };

  const toggleTraining = (trainingId: string) => {
    setSelectedTrainings(prev => 
      prev.includes(trainingId) 
        ? prev.filter(id => id !== trainingId)
        : [...prev, trainingId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Nova Trilha Formativa' : 'Editar Trilha'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create' 
              ? 'Crie uma trilha agrupando treinamentos para um percurso estruturado de capacitação.'
              : 'Edite os dados da trilha e os treinamentos associados.'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome da Trilha *</Label>
            <Input
              id="name"
              placeholder="Ex: Gestão de Destinos Turísticos"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              placeholder="Descreva o objetivo e conteúdo da trilha..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="objective">Objetivo</Label>
            <Input
              id="objective"
              placeholder="Objetivo principal da trilha"
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Público-alvo</Label>
              <Select value={audience} onValueChange={(v) => setAudience(v as TargetAgent)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GESTORES">Gestores Públicos</SelectItem>
                  <SelectItem value="TECNICOS">Técnicos</SelectItem>
                  <SelectItem value="TRADE">Trade Turístico</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="delivery">Certificação</Label>
              <Input
                id="delivery"
                placeholder="Ex: Certificado de 40h"
                value={delivery}
                onChange={(e) => setDelivery(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Treinamentos da Trilha * ({selectedTrainings.length} selecionados)</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar treinamentos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="border rounded-md max-h-80 overflow-y-auto">
              {filteredTrainings.length > 0 ? (
                filteredTrainings.map((training) => (
                  <div
                    key={training.training_id}
                    className={`flex items-start gap-3 p-3 border-b last:border-0 hover:bg-muted/50 cursor-pointer ${
                      selectedTrainings.includes(training.training_id) ? 'bg-primary/5' : ''
                    }`}
                    onClick={() => toggleTraining(training.training_id)}
                  >
                    <Checkbox
                      checked={selectedTrainings.includes(training.training_id)}
                      onCheckedChange={() => toggleTraining(training.training_id)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={training.pillar.toLowerCase() as 'ra' | 'oe' | 'ao'} className="text-xs">
                          {training.course_code || training.pillar}
                        </Badge>
                        <Badge variant={training.type === 'course' ? 'default' : 'secondary'} className="text-xs">
                          {training.type === 'course' ? (
                            <><GraduationCap className="h-3 w-3 mr-1" />Curso</>
                          ) : (
                            <><Video className="h-3 w-3 mr-1" />Live</>
                          )}
                        </Badge>
                      </div>
                      <p className="font-medium text-sm truncate">{training.title}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-muted-foreground text-sm">
                  Nenhum treinamento encontrado
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!name.trim() || selectedTrainings.length === 0 || isSubmitting}
          >
            {isSubmitting ? 'Salvando...' : mode === 'create' ? 'Criar Trilha' : 'Salvar Alterações'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Progress indicator component for track cards
interface TrackProgressProps {
  trackId: string;
  totalTrainings: number;
}

const TrackProgress = ({ trackId, totalTrainings }: TrackProgressProps) => {
  const { data: progress } = useUserTrackProgress(trackId);
  const completedCount = progress?.length || 0;
  const percentage = totalTrainings > 0 ? Math.round((completedCount / totalTrainings) * 100) : 0;

  if (totalTrainings === 0) return null;

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
        <span>Progresso</span>
        <span>{completedCount}/{totalTrainings} ({percentage}%)</span>
      </div>
      <Progress value={percentage} className="h-2" />
    </div>
  );
};

const EduTrilhas = () => {
  const { data: tracks, isLoading } = useEduTracks();
  const { data: trainings } = useEduTrainings();
  const { createTrackWithTrainings } = useEduTrackMutations();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  return (
    <AppLayout 
      title="Trilhas Formativas" 
      subtitle="Percursos estruturados de capacitação com certificação"
    >
      <div className="flex items-center justify-between mb-6">
        <Button variant="outline" asChild>
          <Link to="/edu">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Voltar ao Catálogo
          </Link>
        </Button>
        
        {trainings && trainings.length > 0 && (
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Criar Trilha
          </Button>
        )}
      </div>

      {trainings && (
        <TrackFormDialog
          trainings={trainings}
          onSubmit={(data) => {
            createTrackWithTrainings.mutate(data);
            setCreateDialogOpen(false);
          }}
          isSubmitting={createTrackWithTrainings.isPending}
          mode="create"
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
        />
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      ) : tracks && tracks.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tracks.map((track, index) => (
            <TrackCard key={track.id} track={track} index={index} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <Route className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold">Nenhuma trilha cadastrada</h3>
          <p className="mt-2 text-muted-foreground mb-4">
            Crie trilhas formativas agrupando treinamentos para seus públicos-alvo.
          </p>
          {trainings && trainings.length > 0 && (
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Criar Trilha
            </Button>
          )}
        </div>
      )}
    </AppLayout>
  );
};

// Separate component to fetch progress for each track
const TrackCard = ({ track, index }: { track: EduTrack; index: number }) => {
  const { data: trackWithTrainings } = useEduTrackWithTrainings(track.id);
  const totalTrainings = trackWithTrainings?.trainings?.length || 0;

  return (
    <Card
      className={`group hover:shadow-lg transition-all duration-300 animate-fade-in bg-gradient-to-br ${TRACK_COLORS[index % TRACK_COLORS.length]}`}
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <CardHeader>
        <div className="flex items-center gap-2 mb-2">
          <div className="p-2 rounded-lg bg-background/80">
            <Route className="h-5 w-5 text-primary" />
          </div>
          {track.audience && (
            <Badge variant="secondary" className="text-xs">
              <Users className="h-3 w-3 mr-1" />
              {TARGET_AGENT_INFO[track.audience].label}
            </Badge>
          )}
        </div>
        <CardTitle className="text-xl group-hover:text-primary transition-colors">
          {track.name}
        </CardTitle>
        {track.description && (
          <CardDescription className="line-clamp-2">
            {track.description}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        {track.objective && (
          <div className="mb-4">
            <p className="text-sm font-medium text-foreground/80 mb-1">Objetivo</p>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {track.objective}
            </p>
          </div>
        )}
        
        {totalTrainings > 0 && (
          <div className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
            <GraduationCap className="h-4 w-4" />
            <span>{totalTrainings} treinamentos</span>
          </div>
        )}
        
        {track.delivery && (
          <div className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4" />
            <span>{track.delivery}</span>
          </div>
        )}

        {/* Progress indicator */}
        {totalTrainings > 0 && (
          <TrackProgress trackId={track.id} totalTrainings={totalTrainings} />
        )}
        
        <Button className="w-full mt-4" asChild>
          <Link to={`/edu/trilha/${track.id}`}>
            Ver Trilha
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
};

// Track Detail Page
export const EduTrilhaDetalhe = () => {
  const { id } = useParams<{ id: string }>();
  const { data: track, isLoading: trackLoading } = useEduTrack(id);
  const { data: trackWithTrainings, isLoading: trainingsLoading } = useEduTrackWithTrainings(id);
  const { data: allTrainings } = useEduTrainings();
  const { data: userProgress } = useUserTrackProgress(id);
  const { markComplete, markIncomplete } = useTrainingProgressMutations();
  const { updateTrackWithTrainings, deleteTrack } = useEduTrackMutations();
  const { user } = useAuth();
  
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [certificateOpen, setCertificateOpen] = useState(false);
  const [userName, setUserName] = useState<string>('');

  // Fetch user profile for certificate
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.id) return;
      const { data } = await import('@/integrations/supabase/client').then(m => 
        m.supabase.from('profiles').select('full_name').eq('user_id', user.id).maybeSingle()
      );
      setUserName(data?.full_name || user.email || 'Usuário');
    };
    fetchProfile();
  }, [user]);

  const isLoading = trackLoading || trainingsLoading;

  // Map training_ids to actual training data
  const trackTrainings = trackWithTrainings?.trainings
    ?.map(tt => allTrainings?.find(t => t.training_id === tt.training_id))
    .filter(Boolean) as EduTraining[] | undefined;

  // Create a map of training_id to completion date
  const completionMap = new Map(
    userProgress?.map(p => [p.training_id, new Date(p.completed_at)]) || []
  );
  
  const completedTrainingIds = new Set(userProgress?.map(p => p.training_id) || []);
  const totalTrainings = trackTrainings?.length || 0;
  const completedCount = trackTrainings?.filter(t => completedTrainingIds.has(t.training_id)).length || 0;
  const progressPercentage = totalTrainings > 0 ? Math.round((completedCount / totalTrainings) * 100) : 0;
  const isTrackComplete = progressPercentage === 100 && totalTrainings > 0;

  // Get latest completion date for certificate
  const latestCompletionDate = userProgress?.length 
    ? new Date(Math.max(...userProgress.map(p => new Date(p.completed_at).getTime())))
    : new Date();

  const handleToggleComplete = (trainingId: string) => {
    if (!id) return;
    
    if (completedTrainingIds.has(trainingId)) {
      markIncomplete.mutate({ trackId: id, trainingId });
    } else {
      markComplete.mutate({ trackId: id, trainingId });
    }
  };

  const handleUpdateTrack = (data: { 
    track: { name: string; description?: string; objective?: string; audience?: TargetAgent; delivery?: string }; 
    trainingIds: string[] 
  }) => {
    if (!id) return;
    updateTrackWithTrainings.mutate({
      id,
      track: data.track,
      trainingIds: data.trainingIds,
    });
    setEditDialogOpen(false);
  };

  if (isLoading) {
    return (
      <AppLayout title="Carregando..." subtitle="">
        <Skeleton className="h-64" />
      </AppLayout>
    );
  }

  if (!track) {
    return (
      <AppLayout title="Trilha não encontrada" subtitle="">
        <div className="text-center py-16">
          <Route className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <p className="mt-4 text-muted-foreground">Esta trilha não existe ou foi removida.</p>
          <Button className="mt-4" asChild>
            <Link to="/edu/trilhas">Voltar às Trilhas</Link>
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout 
      title={track.name} 
      subtitle={track.objective || 'Trilha formativa SISTUR EDU'}
    >
      <div className="flex items-center justify-between mb-6">
        <Button variant="outline" asChild>
          <Link to="/edu/trilhas">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Voltar às Trilhas
          </Link>
        </Button>
        
        <div className="flex items-center gap-2">
          {isTrackComplete && (
            <Button onClick={() => setCertificateOpen(true)}>
              <Award className="mr-2 h-4 w-4" />
              Ver Certificado
            </Button>
          )}
          <Button variant="outline" onClick={() => setEditDialogOpen(true)}>
            <Edit className="mr-2 h-4 w-4" />
            Editar
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="icon" className="text-destructive hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir trilha?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação não pode ser desfeita. A trilha "{track.name}" será permanentemente excluída.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => {
                    deleteTrack.mutate(track.id);
                    window.location.href = '/edu/trilhas';
                  }}
                >
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Edit Dialog */}
      {allTrainings && (
        <TrackFormDialog
          trainings={allTrainings}
          onSubmit={handleUpdateTrack}
          isSubmitting={updateTrackWithTrainings.isPending}
          mode="edit"
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          initialData={{
            name: track.name,
            description: track.description || undefined,
            objective: track.objective || undefined,
            audience: track.audience || undefined,
            delivery: track.delivery || undefined,
            trainingIds: trackWithTrainings?.trainings?.map(t => t.training_id) || [],
          }}
        />
      )}

      {/* Certificate Dialog */}
      <TrackCertificate
        open={certificateOpen}
        onOpenChange={setCertificateOpen}
        trackName={track.name}
        userName={userName}
        completedAt={latestCompletionDate}
        totalTrainings={totalTrainings}
        delivery={track.delivery || undefined}
      />

      {/* Track Info with Progress */}
      <Card className="mb-8">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {track.audience && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Público-alvo</p>
                <Badge variant="secondary">
                  <Users className="h-3 w-3 mr-1" />
                  {TARGET_AGENT_INFO[track.audience].label}
                </Badge>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground mb-1">Treinamentos</p>
              <p className="text-2xl font-bold">{totalTrainings}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Concluídos</p>
              <p className="text-2xl font-bold text-green-600">{completedCount}</p>
            </div>
            {track.delivery && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Certificação</p>
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-primary" />
                  <span className="text-sm">{track.delivery}</span>
                </div>
              </div>
            )}
          </div>
          
          {/* Overall Progress Bar */}
          {totalTrainings > 0 && (
            <div className="mt-6">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="font-medium">Seu progresso na trilha</span>
                <span className="text-muted-foreground">{progressPercentage}% concluído</span>
              </div>
              <Progress value={progressPercentage} className="h-3" />
              {isTrackComplete && (
                <div className="flex items-center justify-between mt-2">
                  <p className="text-sm text-green-600 flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4" />
                    Parabéns! Você concluiu todos os treinamentos desta trilha!
                  </p>
                  <Button size="sm" variant="outline" onClick={() => setCertificateOpen(true)}>
                    <Award className="mr-2 h-4 w-4" />
                    Ver Certificado
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Trainings in Track */}
      <h3 className="text-xl font-semibold mb-4">Treinamentos da Trilha</h3>
      {trackTrainings && trackTrainings.length > 0 ? (
        <div className="space-y-4">
          {trackTrainings.map((training, index) => {
            const isCompleted = completedTrainingIds.has(training.training_id);
            const completionDate = completionMap.get(training.training_id);
            
            return (
              <Card 
                key={training.training_id} 
                className={`hover:shadow-md transition-shadow ${isCompleted ? 'bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-900' : ''}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {/* Completion toggle */}
                    <button
                      onClick={() => handleToggleComplete(training.training_id)}
                      className="flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-full"
                      title={isCompleted ? 'Marcar como não concluído' : 'Marcar como concluído'}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="h-8 w-8 text-green-600" />
                      ) : (
                        <Circle className="h-8 w-8 text-muted-foreground hover:text-primary transition-colors" />
                      )}
                    </button>
                    
                    {/* Step number */}
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                      isCompleted 
                        ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' 
                        : 'bg-primary/10 text-primary'
                    }`}>
                      {index + 1}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Badge variant={training.pillar.toLowerCase() as 'ra' | 'oe' | 'ao'}>
                          {training.course_code || training.pillar}
                        </Badge>
                        <Badge variant={training.type === 'course' ? 'default' : 'secondary'}>
                          {training.type === 'course' ? (
                            <><GraduationCap className="h-3 w-3 mr-1" />Curso</>
                          ) : (
                            <><Video className="h-3 w-3 mr-1" />Live</>
                          )}
                        </Badge>
                        {isCompleted && (
                          <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                            Concluído
                          </Badge>
                        )}
                      </div>
                      <h4 className={`font-medium truncate ${isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                        {training.title}
                      </h4>
                      <div className="flex items-center gap-4 mt-1">
                        {training.objective && (
                          <p className="text-sm text-muted-foreground line-clamp-1 flex-1">
                            {training.objective}
                          </p>
                        )}
                        {isCompleted && completionDate && (
                          <span className="text-xs text-green-600 flex items-center gap-1 flex-shrink-0">
                            <Calendar className="h-3 w-3" />
                            {format(completionDate, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/edu/training/${training.training_id}`}>
                        <Target className="mr-2 h-4 w-4" />
                        Ver
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : track.courses && track.courses.length > 0 ? (
        // Fallback to old courses structure
        <div className="space-y-4">
          {track.courses.map((tc: any, index: number) => (
            <Card key={tc.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {tc.course && (
                        <Badge variant={tc.course.pillar?.toLowerCase() as 'ra' | 'oe' | 'ao'}>
                          {tc.course.code}
                        </Badge>
                      )}
                    </div>
                    <h4 className="font-medium truncate">
                      {tc.course?.title || 'Curso não encontrado'}
                    </h4>
                    {tc.course?.objective && (
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {tc.course.objective}
                      </p>
                    )}
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link to={`/edu/curso/${tc.course_id}`}>
                      <Target className="mr-2 h-4 w-4" />
                      Ver
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          Nenhum treinamento associado a esta trilha.
        </div>
      )}
    </AppLayout>
  );
};

export default EduTrilhas;