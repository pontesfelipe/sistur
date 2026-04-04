import { useState, useMemo } from 'react';
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
  Clock,
  Sparkles,
  UserCircle,
  Settings,
  Lock,
  CheckCircle2,
  ChevronRight
} from 'lucide-react';
import { useEduTrainings, useEduTrainingStats } from '@/hooks/useEduTrainings';
import { useEduTracks } from '@/hooks/useEdu';
import { useStudentProfile } from '@/hooks/useStudentProfile';
import { useProfile } from '@/hooks/useProfile';
import { PersonalizedRecommendationsPanel } from '@/components/edu/PersonalizedRecommendationsPanel';
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
import { 
  useCurriculumLevels,
  useUserCurriculumProgress,
  LEVEL_COLORS,
  LEVEL_SHORT_NAMES,
} from '@/hooks/useCurriculumLevels';
import type { EduTraining } from '@/hooks/useEduTrainings';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const EduCatalogo = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [contentFilter, setContentFilter] = useState<string>('all');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<string>('all');
  
  const { data: trainings, isLoading: trainingsLoading } = useEduTrainings();
  const { data: stats } = useEduTrainingStats();
  const { data: tracks, isLoading: tracksLoading } = useEduTracks();
  const { hasProfile } = useStudentProfile();
  const { isAdmin, isProfessor, isOrgAdmin } = useProfile();
  const { data: curriculumLevels } = useCurriculumLevels();
  const { data: curriculumProgress } = useUserCurriculumProgress();

  // Filter trainings
  const filteredTrainings = useMemo(() => {
    return trainings?.filter(training => {
      const matchesSearch = !searchQuery || 
        training.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        training.course_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        training.objective?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesPillar = activeTab === 'all' || training.pillar === activeTab;
      const matchesType = typeFilter === 'all' || training.type === typeFilter;
      const matchesLevel = levelFilter === 'all' || 
        String(training.curriculum_level) === levelFilter ||
        (levelFilter === 'none' && !training.curriculum_level);

      const hasContent = !!training.video_url || (Array.isArray(training.modules) && training.modules.length > 0);
      const matchesContent = contentFilter === 'all' || 
        (contentFilter === 'content' && hasContent) ||
        (contentFilter === 'wip' && !hasContent);
      
      return matchesSearch && matchesPillar && matchesType && matchesContent && matchesLevel;
    }) || [];
  }, [trainings, searchQuery, activeTab, typeFilter, contentFilter, levelFilter]);

  // Group trainings by level when no level filter is set
  const groupedByLevel = useMemo(() => {
    if (levelFilter !== 'all') return null;
    
    const groups: Record<string, EduTraining[]> = {
      '1': [], '2': [], '3': [], '4': [], 'none': [],
    };
    filteredTrainings.forEach(t => {
      const key = t.curriculum_level ? String(t.curriculum_level) : 'none';
      groups[key].push(t);
    });
    return groups;
  }, [filteredTrainings, levelFilter]);

  // Count stats for content filter
  const contentCount = trainings?.filter(t => !!t.video_url || (Array.isArray(t.modules) && t.modules.length > 0)).length || 0;
  const wipCount = (trainings?.length || 0) - contentCount;

  const isLoading = trainingsLoading || tracksLoading;

  const isLevelLocked = (level: number): boolean => {
    if (level <= 1) return false;
    return (curriculumProgress?.maxUnlockedLevel ?? 1) < level;
  };

  const renderTrainingCard = (training: EduTraining & { curriculum_level?: number | null }, index: number) => {
    const locked = training.curriculum_level ? isLevelLocked(training.curriculum_level) : false;

    return (
      <Card
        key={training.training_id}
        className={`group transition-all duration-300 animate-fade-in ${locked ? 'opacity-60' : 'hover:shadow-lg'}`}
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
            {training.curriculum_level && (
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${LEVEL_COLORS[training.curriculum_level]?.badge || ''}`}>
                Nível {training.curriculum_level}
              </span>
            )}
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
            {locked ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" className="flex-1 cursor-not-allowed" disabled>
                      <Lock className="mr-2 h-4 w-4" />
                      Bloqueado
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Complete um curso de nível {(training.curriculum_level ?? 1) - 1} primeiro</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <Button variant="outline" className="flex-1" asChild>
                <Link to={`/edu/training/${training.training_id}`}>
                  <Target className="mr-2 h-4 w-4" />
                  Ver Detalhes
                </Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderLevelGroupHeader = (levelNum: number) => {
    const levelInfo = curriculumLevels?.find(l => l.level === levelNum);
    const locked = isLevelLocked(levelNum);
    const colors = LEVEL_COLORS[levelNum];

    return (
      <div className="flex items-center gap-3 mb-3">
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold ${colors?.badge || ''}`}>
          {locked ? <Lock className="h-3.5 w-3.5" /> : <GraduationCap className="h-3.5 w-3.5" />}
          Nível {levelNum} — {levelInfo?.name || LEVEL_SHORT_NAMES[levelNum]}
        </span>
        {locked && (
          <span className="text-xs text-muted-foreground">
            Complete um curso de nível {levelNum - 1} primeiro
          </span>
        )}
      </div>
    );
  };

  return (
    <AppLayout 
      title="SISTUR EDU" 
      subtitle="Catálogo de cursos e lives baseado em diagnóstico IGMA"
    >
      
          {/* Curriculum Progression Indicator */}
          <Card className="mb-6 border-primary/20">
            <CardContent className="py-4">
              <div className="flex items-center gap-2 mb-2 text-sm font-medium text-muted-foreground">
                <GraduationCap className="h-4 w-4" />
                Progressão Curricular
              </div>
              <div className="flex items-center gap-1 flex-wrap">
                {[1, 2, 3, 4].map((lvl, i) => {
                  const unlocked = (curriculumProgress?.maxUnlockedLevel ?? 1) >= lvl;
                  const completed = curriculumProgress?.completedLevels?.has(lvl);
                  const colors = LEVEL_COLORS[lvl];
                  return (
                    <div key={lvl} className="flex items-center gap-1">
                      <button
                        onClick={() => setLevelFilter(levelFilter === String(lvl) ? 'all' : String(lvl))}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                          levelFilter === String(lvl) ? 'ring-2 ring-primary ring-offset-2' : ''
                        } ${
                          completed
                            ? `${colors.badge} opacity-100`
                            : unlocked
                              ? `${colors.badge} opacity-80`
                              : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {completed ? (
                          <CheckCircle2 className="h-3 w-3" />
                        ) : !unlocked ? (
                          <Lock className="h-3 w-3" />
                        ) : null}
                        {LEVEL_SHORT_NAMES[lvl]}
                      </button>
                      {i < 3 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-3 mb-6">
            <Button variant={hasProfile ? "outline" : "default"} asChild>
              <Link to="/edu/perfil">
                {hasProfile ? (
                  <>
                    <UserCircle className="mr-2 h-4 w-4" />
                    Meu Perfil
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Preencher Perfil
                  </>
                )}
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/edu/trilhas">
                <Route className="mr-2 h-4 w-4" />
                Ver Trilhas ({tracks?.length || 0})
              </Link>
            </Button>
          </div>

          {/* Personalized Recommendations Section */}
          <div className="mb-8">
            <PersonalizedRecommendationsPanel limit={6} showHeader showEmptyState />
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
              <Select value={levelFilter} onValueChange={setLevelFilter}>
                <SelectTrigger className="w-full sm:w-44">
                  <SelectValue placeholder="Nível" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os níveis</SelectItem>
                  {[1, 2, 3, 4].map(lvl => (
                    <SelectItem key={lvl} value={String(lvl)}>
                      Nível {lvl} — {LEVEL_SHORT_NAMES[lvl]}
                    </SelectItem>
                  ))}
                  <SelectItem value="none">Sem nível</SelectItem>
                </SelectContent>
              </Select>
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
                  groupedByLevel && levelFilter === 'all' ? (
                    // Grouped view by level
                    <div className="space-y-8">
                      {[1, 2, 3, 4].map(lvl => {
                        const items = groupedByLevel[String(lvl)];
                        if (!items?.length) return null;
                        return (
                          <div key={lvl}>
                            {renderLevelGroupHeader(lvl)}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                              {items.map((t, i) => renderTrainingCard(t as EduTraining & { curriculum_level?: number | null }, i))}
                            </div>
                          </div>
                        );
                      })}
                      {groupedByLevel['none']?.length > 0 && (
                        <div>
                          <div className="flex items-center gap-3 mb-3">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-muted text-muted-foreground">
                              <BookOpen className="h-3.5 w-3.5" />
                              Sem nível definido
                            </span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                            {groupedByLevel['none'].map((t, i) => renderTrainingCard(t as EduTraining & { curriculum_level?: number | null }, i))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    // Flat view when filtered by specific level
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                      {filteredTrainings.map((training, index) => renderTrainingCard(training as EduTraining & { curriculum_level?: number | null }, index))}
                    </div>
                  )
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
        </>
      )}
    </AppLayout>
  );
};

export default EduCatalogo;
