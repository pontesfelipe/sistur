import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, 
  GraduationCap,
  Users,
  BookOpen,
  Route,
  Target,
  Video,
  FileText,
  Clock
} from 'lucide-react';
import { useEduTrainings, useEduTrainingStats } from '@/hooks/useEduTrainings';
import { useEduTracks } from '@/hooks/useEdu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  PILLAR_INFO, 
  type Pillar 
} from '@/types/sistur';

const EduCatalogo = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [contentFilter, setContentFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<string>('all');
  
  const { data: trainings, isLoading: trainingsLoading } = useEduTrainings();
  const { data: stats } = useEduTrainingStats();
  const { data: tracks, isLoading: tracksLoading } = useEduTracks();

  // Filter trainings
  const filteredTrainings = trainings?.filter(training => {
    const matchesSearch = !searchQuery || 
      training.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      training.course_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      training.objective?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesPillar = activeTab === 'all' || training.pillar === activeTab;
    
    const matchesType = typeFilter === 'all' || training.type === typeFilter;

    const hasContent = !!training.video_url || (Array.isArray(training.modules) && training.modules.length > 0);
    const matchesContent = contentFilter === 'all' || 
      (contentFilter === 'content' && hasContent) ||
      (contentFilter === 'wip' && !hasContent);
    
    return matchesSearch && matchesPillar && matchesType && matchesContent;
  }) || [];

  // Count stats for content filter
  const contentCount = trainings?.filter(t => !!t.video_url || (Array.isArray(t.modules) && t.modules.length > 0)).length || 0;
  const wipCount = (trainings?.length || 0) - contentCount;

  const isLoading = trainingsLoading || tracksLoading;

  return (
    <AppLayout 
      title="SISTUR EDU" 
      subtitle="Catálogo de cursos e lives baseado em diagnóstico IGMA"
    >
      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3 mb-6">
        <Button variant="outline" asChild>
          <Link to="/edu/trilhas">
            <Route className="mr-2 h-4 w-4" />
            Ver Trilhas ({tracks?.length || 0})
          </Link>
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou código..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-3">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos tipos</SelectItem>
              <SelectItem value="course">
                <span className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4" />
                  Cursos
                </span>
              </SelectItem>
              <SelectItem value="live">
                <span className="flex items-center gap-2">
                  <Video className="h-4 w-4" />
                  Lives
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
          <Select value={contentFilter} onValueChange={setContentFilter}>
            <SelectTrigger className="w-full sm:w-52">
              <SelectValue placeholder="Conteúdo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="content">
                <span className="flex items-center gap-2">
                  <Video className="h-4 w-4 text-primary" />
                  Com conteúdo ({contentCount})
                </span>
              </SelectItem>
              <SelectItem value="wip">
                <span className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  Em progresso ({wipCount})
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats by Pillar */}
      <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
        {(['RA', 'OE', 'AO'] as Pillar[]).map((pillar) => (
          <Card 
            key={pillar} 
            className={`border-l-4 cursor-pointer transition-all hover:shadow-md ${
              activeTab === pillar ? 'ring-2 ring-primary' : ''
            }`}
            style={{ borderLeftColor: PILLAR_INFO[pillar].color }}
            onClick={() => setActiveTab(activeTab === pillar ? 'all' : pillar)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{PILLAR_INFO[pillar].name}</p>
                  <div className="flex items-center gap-3">
                    <div className="text-center">
                      <p className="text-xl font-display font-bold">
                        {stats?.byPillar[pillar]?.courses || 0}
                      </p>
                      <p className="text-xs text-muted-foreground">cursos</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xl font-display font-bold">
                        {stats?.byPillar[pillar]?.lives || 0}
                      </p>
                      <p className="text-xs text-muted-foreground">lives</p>
                    </div>
                  </div>
                </div>
                <Badge variant={pillar.toLowerCase() as 'ra' | 'oe' | 'ao'}>
                  {pillar}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Summary Stats */}
      <div className="flex items-center gap-4 mb-6 text-sm text-muted-foreground">
        <span className="flex items-center gap-1">
          <GraduationCap className="h-4 w-4" />
          {stats?.totalCourses || 0} cursos
        </span>
        <span className="flex items-center gap-1">
          <Video className="h-4 w-4" />
          {stats?.totalLives || 0} lives
        </span>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-2 sm:flex sm:flex-wrap h-auto gap-1">
            <TabsTrigger value="all" className="gap-2">
              <BookOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Todos</span> ({trainings?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="RA" className="gap-2">
              RA ({(stats?.byPillar.RA?.courses || 0) + (stats?.byPillar.RA?.lives || 0)})
            </TabsTrigger>
            <TabsTrigger value="OE" className="gap-2">
              OE ({(stats?.byPillar.OE?.courses || 0) + (stats?.byPillar.OE?.lives || 0)})
            </TabsTrigger>
            <TabsTrigger value="AO" className="gap-2">
              AO ({(stats?.byPillar.AO?.courses || 0) + (stats?.byPillar.AO?.lives || 0)})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-6">
            {filteredTrainings.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {filteredTrainings.map((training, index) => (
                  <Card
                    key={training.training_id}
                    className="group hover:shadow-lg transition-all duration-300 animate-fade-in"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
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
                        {(() => {
                          const hasContent = !!training.video_url || (Array.isArray(training.modules) && training.modules.length > 0);
                          return hasContent ? (
                            <Badge variant="ready">
                              <Video className="h-3 w-3 mr-1" />
                              Com conteúdo
                            </Badge>
                          ) : (
                            <Badge variant="draft">
                              <Clock className="h-3 w-3 mr-1" />
                              Em progresso
                            </Badge>
                          );
                        })()}
                      </div>
                      <CardTitle className="text-lg group-hover:text-primary transition-colors line-clamp-2">
                        {training.title}
                      </CardTitle>
                      {training.objective && (
                        <CardDescription className="line-clamp-3">
                          {training.objective}
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {training.target_audience && (
                          <Badge variant="outline" className="text-xs line-clamp-1">
                            <Users className="h-3 w-3 mr-1 flex-shrink-0" />
                            <span className="truncate max-w-32">{training.target_audience.split(',')[0]}</span>
                          </Badge>
                        )}
                        {Array.isArray(training.modules) && training.modules.length > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            <FileText className="h-3 w-3 mr-1" />
                            {training.modules.length} módulos
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" className="flex-1" asChild>
                          <Link to={`/edu/training/${training.training_id}`}>
                            <Target className="mr-2 h-4 w-4" />
                            Ver Detalhes
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <GraduationCap className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <h3 className="mt-4 text-lg font-semibold">
                  {trainings?.length === 0 
                    ? 'Nenhum treinamento cadastrado' 
                    : 'Nenhum treinamento encontrado'}
                </h3>
                <p className="mt-2 text-muted-foreground">
                  {trainings?.length === 0 
                    ? 'Os treinamentos serão importados em breve.'
                    : 'Tente ajustar os filtros de busca.'}
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </AppLayout>
  );
};

export default EduCatalogo;
