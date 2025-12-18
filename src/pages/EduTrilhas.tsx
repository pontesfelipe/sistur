import { useState } from 'react';
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
  Route, 
  Users,
  GraduationCap,
  ArrowRight,
  Target,
  ChevronLeft,
  Plus,
  Video,
  Search
} from 'lucide-react';
import { useEduTracks, useEduTrack, useEduTrackMutations, useEduTrackWithTrainings } from '@/hooks/useEdu';
import { useEduTrainings, EduTraining } from '@/hooks/useEduTrainings';
import { TARGET_AGENT_INFO, PILLAR_INFO, type TargetAgent } from '@/types/sistur';

// Track colors for visual differentiation
const TRACK_COLORS = [
  'from-blue-500/20 to-blue-600/5 border-blue-500/30',
  'from-green-500/20 to-green-600/5 border-green-500/30',
  'from-purple-500/20 to-purple-600/5 border-purple-500/30',
  'from-orange-500/20 to-orange-600/5 border-orange-500/30',
  'from-pink-500/20 to-pink-600/5 border-pink-500/30',
  'from-cyan-500/20 to-cyan-600/5 border-cyan-500/30',
];

interface CreateTrackDialogProps {
  trainings: EduTraining[];
  onCreateTrack: (data: { 
    track: { name: string; description?: string; objective?: string; audience?: TargetAgent; delivery?: string }; 
    trainingIds: string[] 
  }) => void;
  isCreating: boolean;
}

const CreateTrackDialog = ({ trainings, onCreateTrack, isCreating }: CreateTrackDialogProps) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [objective, setObjective] = useState('');
  const [audience, setAudience] = useState<TargetAgent | ''>('');
  const [delivery, setDelivery] = useState('');
  const [selectedTrainings, setSelectedTrainings] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTrainings = trainings.filter(t => 
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.course_code?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmit = () => {
    if (!name.trim() || selectedTrainings.length === 0) return;
    
    onCreateTrack({
      track: {
        name: name.trim(),
        description: description.trim() || undefined,
        objective: objective.trim() || undefined,
        audience: audience || undefined,
        delivery: delivery.trim() || undefined,
      },
      trainingIds: selectedTrainings,
    });
    
    // Reset form
    setOpen(false);
    setName('');
    setDescription('');
    setObjective('');
    setAudience('');
    setDelivery('');
    setSelectedTrainings([]);
    setSearchQuery('');
  };

  const toggleTraining = (trainingId: string) => {
    setSelectedTrainings(prev => 
      prev.includes(trainingId) 
        ? prev.filter(id => id !== trainingId)
        : [...prev, trainingId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Criar Trilha
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Trilha Formativa</DialogTitle>
          <DialogDescription>
            Crie uma trilha agrupando treinamentos para um percurso estruturado de capacitação.
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
            <div className="border rounded-md max-h-60 overflow-y-auto">
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
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!name.trim() || selectedTrainings.length === 0 || isCreating}
          >
            {isCreating ? 'Criando...' : 'Criar Trilha'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const EduTrilhas = () => {
  const { data: tracks, isLoading } = useEduTracks();
  const { data: trainings } = useEduTrainings();
  const { createTrackWithTrainings } = useEduTrackMutations();

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
          <CreateTrackDialog 
            trainings={trainings}
            onCreateTrack={(data) => createTrackWithTrainings.mutate(data)}
            isCreating={createTrackWithTrainings.isPending}
          />
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      ) : tracks && tracks.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tracks.map((track, index) => (
            <Card
              key={track.id}
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
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {track.objective}
                    </p>
                  </div>
                )}
                {track.delivery && (
                  <div className="flex items-center gap-2 mb-4">
                    <GraduationCap className="h-4 w-4 text-primary" />
                    <span className="text-sm text-muted-foreground">
                      {track.delivery}
                    </span>
                  </div>
                )}
                <Button className="w-full" asChild>
                  <Link to={`/edu/trilha/${track.id}`}>
                    Ver Trilha
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
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
            <CreateTrackDialog 
              trainings={trainings}
              onCreateTrack={(data) => createTrackWithTrainings.mutate(data)}
              isCreating={createTrackWithTrainings.isPending}
            />
          )}
        </div>
      )}
    </AppLayout>
  );
};

// Track Detail Page
export const EduTrilhaDetalhe = () => {
  const { id } = useParams<{ id: string }>();
  const { data: track, isLoading: trackLoading } = useEduTrack(id);
  const { data: trackWithTrainings, isLoading: trainingsLoading } = useEduTrackWithTrainings(id);
  const { data: allTrainings } = useEduTrainings();

  const isLoading = trackLoading || trainingsLoading;

  // Map training_ids to actual training data
  const trackTrainings = trackWithTrainings?.trainings
    ?.map(tt => allTrainings?.find(t => t.training_id === tt.training_id))
    .filter(Boolean) as EduTraining[] | undefined;

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
      <div className="mb-6">
        <Button variant="outline" asChild>
          <Link to="/edu/trilhas">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Voltar às Trilhas
          </Link>
        </Button>
      </div>

      {/* Track Info */}
      <Card className="mb-8">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
              <p className="text-sm text-muted-foreground mb-1">Treinamentos na trilha</p>
              <p className="text-2xl font-bold">{trackTrainings?.length || track.courses?.length || 0}</p>
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
        </CardContent>
      </Card>

      {/* Trainings in Track */}
      <h3 className="text-xl font-semibold mb-4">Treinamentos da Trilha</h3>
      {trackTrainings && trackTrainings.length > 0 ? (
        <div className="space-y-4">
          {trackTrainings.map((training, index) => (
            <Card key={training.training_id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
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
                    </div>
                    <h4 className="font-medium truncate">
                      {training.title}
                    </h4>
                    {training.objective && (
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {training.objective}
                      </p>
                    )}
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
          ))}
        </div>
      ) : track.courses && track.courses.length > 0 ? (
        // Fallback to old courses structure
        <div className="space-y-4">
          {track.courses.map((tc, index) => (
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