import { Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Route, 
  Users,
  GraduationCap,
  ArrowRight,
  Target,
  ChevronLeft
} from 'lucide-react';
import { useEduTracks, useEduTrack } from '@/hooks/useEdu';
import { TARGET_AGENT_INFO, PILLAR_INFO, type Pillar } from '@/types/sistur';
import { useParams } from 'react-router-dom';

// Track colors for visual differentiation
const TRACK_COLORS = [
  'from-blue-500/20 to-blue-600/5 border-blue-500/30',
  'from-green-500/20 to-green-600/5 border-green-500/30',
  'from-purple-500/20 to-purple-600/5 border-purple-500/30',
  'from-orange-500/20 to-orange-600/5 border-orange-500/30',
  'from-pink-500/20 to-pink-600/5 border-pink-500/30',
  'from-cyan-500/20 to-cyan-600/5 border-cyan-500/30',
];

const EduTrilhas = () => {
  const { data: tracks, isLoading } = useEduTracks();

  return (
    <AppLayout 
      title="Trilhas Formativas" 
      subtitle="Percursos estruturados de capacitação com certificação"
    >
      <div className="mb-6">
        <Button variant="outline" asChild>
          <Link to="/edu">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Voltar ao Catálogo
          </Link>
        </Button>
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
          <p className="mt-2 text-muted-foreground">
            As trilhas formativas serão importadas em breve.
          </p>
        </div>
      )}
    </AppLayout>
  );
};

// Track Detail Page
export const EduTrilhaDetalhe = () => {
  const { id } = useParams<{ id: string }>();
  const { data: track, isLoading } = useEduTrack(id);

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
              <p className="text-sm text-muted-foreground mb-1">Cursos na trilha</p>
              <p className="text-2xl font-bold">{track.courses?.length || 0}</p>
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

      {/* Courses in Track */}
      <h3 className="text-xl font-semibold mb-4">Cursos da Trilha</h3>
      {track.courses && track.courses.length > 0 ? (
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
          Nenhum curso associado a esta trilha.
        </div>
      )}
    </AppLayout>
  );
};

export default EduTrilhas;
