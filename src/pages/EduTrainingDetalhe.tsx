import { useParams, Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, 
  GraduationCap, 
  Video, 
  Users, 
  Target,
  BookOpen,
  FileText,
  CheckCircle2,
  AlertCircle,
  Clock,
  Eye
} from 'lucide-react';
import { useEduTraining, type TrainingModule } from '@/hooks/useEduTrainings';
import { PILLAR_INFO } from '@/types/sistur';
import { VideoPlayer } from '@/components/edu/VideoPlayer';

const EduTrainingDetalhe = () => {
  const { id } = useParams<{ id: string }>();
  const { data: training, isLoading, error } = useEduTraining(id);

  if (isLoading) {
    return (
      <AppLayout title="Carregando..." subtitle="Buscando detalhes do treinamento">
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AppLayout>
    );
  }

  if (error || !training) {
    return (
      <AppLayout title="Treinamento não encontrado" subtitle="">
        <div className="text-center py-16">
          <AlertCircle className="mx-auto h-12 w-12 text-destructive/50" />
          <h3 className="mt-4 text-lg font-semibold">Treinamento não encontrado</h3>
          <p className="mt-2 text-muted-foreground">
            O treinamento solicitado não existe ou foi removido.
          </p>
          <Button variant="outline" asChild className="mt-4">
            <Link to="/edu">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar ao catálogo
            </Link>
          </Button>
        </div>
      </AppLayout>
    );
  }

  const pillarInfo = PILLAR_INFO[training.pillar as keyof typeof PILLAR_INFO];
  const modules = Array.isArray(training.modules) ? training.modules as TrainingModule[] : [];
  
  // Extract video metadata
  const hasVideo = !!training.video_url;
  const videoProvider = (training.video_provider as 'youtube' | 'vimeo' | 'supabase' | 'mux') || 'supabase';
  const ingestionMeta = training.ingestion_metadata as { viewCount?: number; likeCount?: number } | null;

  return (
    <AppLayout 
      title={training.title}
      subtitle={`${training.type === 'course' ? 'Curso' : 'Live'} • Pilar ${training.pillar}`}
    >
      {/* Back button */}
      <Button variant="ghost" asChild className="mb-6">
        <Link to="/edu">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar ao catálogo
        </Link>
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Video Player */}
          {hasVideo && training.video_url && (
            <VideoPlayer
              videoUrl={training.video_url}
              videoProvider={videoProvider}
              trainingId={training.training_id}
            />
          )}

          {/* Thumbnail fallback when no video */}
          {!hasVideo && training.thumbnail_url && (
            <Card className="overflow-hidden">
              <div className="aspect-video relative">
                <img 
                  src={training.thumbnail_url} 
                  alt={training.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <div className="text-center text-white">
                    <Video className="h-12 w-12 mx-auto mb-2 opacity-70" />
                    <p className="text-sm opacity-80">Vídeo em breve</p>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Header card */}
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <Badge 
                  variant={training.pillar.toLowerCase() as 'ra' | 'oe' | 'ao'}
                  className="text-sm"
                >
                  {training.course_code || training.pillar}
                </Badge>
                <Badge variant={training.type === 'course' ? 'default' : 'secondary'}>
                  {training.type === 'course' ? (
                    <><GraduationCap className="h-3 w-3 mr-1" />Curso</>
                  ) : (
                    <><Video className="h-3 w-3 mr-1" />Live</>
                  )}
                </Badge>
                {pillarInfo && (
                  <Badge variant="outline" style={{ borderColor: pillarInfo.color, color: pillarInfo.color }}>
                    {pillarInfo.name}
                  </Badge>
                )}
                {training.duration_minutes && (
                  <Badge variant="outline" className="text-muted-foreground">
                    <Clock className="h-3 w-3 mr-1" />
                    {training.duration_minutes} min
                  </Badge>
                )}
                {ingestionMeta?.viewCount && (
                  <Badge variant="outline" className="text-muted-foreground">
                    <Eye className="h-3 w-3 mr-1" />
                    {ingestionMeta.viewCount.toLocaleString('pt-BR')}
                  </Badge>
                )}
              </div>
              <CardTitle className="text-2xl">{training.title}</CardTitle>
              {training.objective && (
                <CardDescription className="text-base mt-2 whitespace-pre-line">
                  {training.objective}
                </CardDescription>
              )}
            </CardHeader>
          </Card>

          {/* Modules */}
          {modules.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Módulos do Curso
                </CardTitle>
                <CardDescription>
                  {modules.length} módulos estruturados para o aprendizado
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {modules.map((module, index) => (
                  <div 
                    key={index}
                    className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                        {module.module_number}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-foreground">
                          {module.module_title}
                        </h4>
                        {module.lives && module.lives.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {module.lives.map((live, liveIndex) => (
                              <div 
                                key={liveIndex}
                                className="flex items-center gap-2 text-sm text-muted-foreground"
                              >
                                <CheckCircle2 className="h-4 w-4 text-primary/60" />
                                {live}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Empty modules state */}
          {modules.length === 0 && training.type === 'course' && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <FileText className="mx-auto h-10 w-10 opacity-50 mb-3" />
                <p>Estrutura modular em desenvolvimento.</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Target audience */}
          {training.target_audience && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Público-alvo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {training.target_audience}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Info card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="h-4 w-4" />
                Informações
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tipo</span>
                <span className="font-medium">
                  {training.type === 'course' ? 'Curso' : 'Live'}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Pilar</span>
                <span className="font-medium">{pillarInfo?.fullName || training.pillar}</span>
              </div>
              {training.course_code && (
                <>
                  <Separator />
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Código</span>
                    <span className="font-medium">{training.course_code}</span>
                  </div>
                </>
              )}
              {modules.length > 0 && (
                <>
                  <Separator />
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Módulos</span>
                    <span className="font-medium">{modules.length}</span>
                  </div>
                </>
              )}
              {training.duration_minutes && (
                <>
                  <Separator />
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Duração</span>
                    <span className="font-medium">{training.duration_minutes} min</span>
                  </div>
                </>
              )}
              {training.source && (
                <>
                  <Separator />
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Fonte</span>
                    <span className="font-medium text-xs">{training.source}</span>
                  </div>
                </>
              )}
              {training.ingestion_source && (
                <>
                  <Separator />
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Origem</span>
                    <Badge variant="outline" className="text-xs">
                      {training.ingestion_source === 'youtube_data_api' ? 'YouTube' : training.ingestion_source}
                    </Badge>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
};

export default EduTrainingDetalhe;
