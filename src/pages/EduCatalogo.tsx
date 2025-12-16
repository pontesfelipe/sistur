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
  Clock,
  ExternalLink,
  Users,
  BookOpen,
  Route,
  Target,
  Sparkles
} from 'lucide-react';
import { useEduCourses, useEduTracks } from '@/hooks/useEdu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  PILLAR_INFO, 
  TARGET_AGENT_INFO,
  type Pillar 
} from '@/types/sistur';

const EduCatalogo = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [audienceFilter, setAudienceFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<string>('all');
  
  const { data: allCourses, isLoading: coursesLoading } = useEduCourses();
  const { data: tracks, isLoading: tracksLoading } = useEduTracks();

  // Filter courses
  const filteredCourses = allCourses?.filter(course => {
    const matchesSearch = !searchQuery || 
      course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.code.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesPillar = activeTab === 'all' || course.pillar === activeTab;
    
    const matchesAudience = audienceFilter === 'all' || course.audience === audienceFilter;
    
    return matchesSearch && matchesPillar && matchesAudience;
  }) || [];

  // Group courses by pillar for stats
  const coursesByPillar: Record<Pillar, number> = {
    RA: allCourses?.filter(c => c.pillar === 'RA').length || 0,
    OE: allCourses?.filter(c => c.pillar === 'OE').length || 0,
    AO: allCourses?.filter(c => c.pillar === 'AO').length || 0,
  };

  const isLoading = coursesLoading || tracksLoading;

  return (
    <AppLayout 
      title="SISTUR EDU" 
      subtitle="Catálogo de cursos e capacitação baseada em diagnóstico"
    >
      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3 mb-6">
        <Button variant="outline" asChild>
          <Link to="/edu/trilhas">
            <Route className="mr-2 h-4 w-4" />
            Ver Trilhas ({tracks?.length || 0})
          </Link>
        </Button>
        <Button asChild>
          <Link to="/learning">
            <Sparkles className="mr-2 h-4 w-4" />
            Gerar Recomendações
          </Link>
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between mb-6">
        <div className="flex gap-3 flex-1">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar cursos por nome ou código..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={audienceFilter} onValueChange={setAudienceFilter}>
            <SelectTrigger className="w-48">
              <Users className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Público-alvo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os públicos</SelectItem>
              <SelectItem value="GESTORES">Gestores Públicos</SelectItem>
              <SelectItem value="TECNICOS">Técnicos</SelectItem>
              <SelectItem value="TRADE">Trade Turístico</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats by Pillar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
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
                  <p className="text-2xl font-display font-bold">{coursesByPillar[pillar]}</p>
                  <p className="text-xs text-muted-foreground">{PILLAR_INFO[pillar].fullName}</p>
                </div>
                <Badge variant={pillar.toLowerCase() as 'ra' | 'oe' | 'ao'}>
                  {pillar}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="all" className="gap-2">
              <BookOpen className="h-4 w-4" />
              Todos ({allCourses?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="RA" className="gap-2">
              IRA ({coursesByPillar.RA})
            </TabsTrigger>
            <TabsTrigger value="OE" className="gap-2">
              IOE ({coursesByPillar.OE})
            </TabsTrigger>
            <TabsTrigger value="AO" className="gap-2">
              IAO ({coursesByPillar.AO})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-6">
            {filteredCourses.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCourses.map((course, index) => (
                  <Card
                    key={course.id}
                    className="group hover:shadow-lg transition-all duration-300 animate-fade-in"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant={course.pillar.toLowerCase() as 'ra' | 'oe' | 'ao'}>
                          {course.code}
                        </Badge>
                        {course.suggested_hours && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {course.suggested_hours}h
                          </span>
                        )}
                      </div>
                      <CardTitle className="text-lg group-hover:text-primary transition-colors">
                        {course.title}
                      </CardTitle>
                      {course.objective && (
                        <CardDescription className="line-clamp-2">
                          {course.objective}
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {course.audience && (
                          <Badge variant="outline" className="text-xs">
                            <Users className="h-3 w-3 mr-1" />
                            {TARGET_AGENT_INFO[course.audience].label}
                          </Badge>
                        )}
                        {course.certification && (
                          <Badge variant="secondary" className="text-xs">
                            <GraduationCap className="h-3 w-3 mr-1" />
                            Certificação
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" className="flex-1" asChild>
                          <Link to={`/edu/curso/${course.id}`}>
                            <Target className="mr-2 h-4 w-4" />
                            Ver Módulos
                          </Link>
                        </Button>
                        {course.url && (
                          <Button variant="ghost" size="icon" asChild>
                            <a href={course.url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <GraduationCap className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <h3 className="mt-4 text-lg font-semibold">
                  {allCourses?.length === 0 
                    ? 'Nenhum curso cadastrado' 
                    : 'Nenhum curso encontrado'}
                </h3>
                <p className="mt-2 text-muted-foreground">
                  {allCourses?.length === 0 
                    ? 'Os cursos serão importados em breve.'
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
