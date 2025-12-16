import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  Search, 
  GraduationCap,
  Clock,
  ExternalLink,
  Users,
  AlertTriangle,
  CheckCircle,
  Target
} from 'lucide-react';
import { useCourses } from '@/hooks/useCourses';
import { usePrescriptionsByPillar } from '@/hooks/usePrescriptions';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  PILLAR_INFO, 
  SEVERITY_INFO, 
  INTERPRETATION_INFO, 
  TARGET_AGENT_INFO,
  type Pillar 
} from '@/types/sistur';

const Cursos = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [pillarFilter, setPillarFilter] = useState<string>('all');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  
  const { courses, isLoading: coursesLoading } = useCourses();
  const { data: prescriptions, isLoading: prescriptionsLoading } = usePrescriptionsByPillar();

  const levelLabels: Record<string, string> = {
    BASICO: 'Básico',
    INTERMEDIARIO: 'Intermediário',
    AVANCADO: 'Avançado',
  };

  const formatDuration = (minutes?: number) => {
    if (!minutes) return null;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h${mins > 0 ? ` ${mins}min` : ''}` : `${mins}min`;
  };

  // Filter courses
  const filteredCourses = courses?.filter(course => {
    const matchesSearch = !searchQuery || 
      course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesPillar = pillarFilter === 'all' || 
      course.pillar === pillarFilter ||
      course.tags?.some(tag => tag.pillar === pillarFilter);
    
    const matchesLevel = levelFilter === 'all' || course.level === levelFilter;
    
    return matchesSearch && matchesPillar && matchesLevel;
  }) || [];

  // Group courses by pillar
  const coursesByPillar: Record<Pillar, typeof filteredCourses> = {
    RA: filteredCourses.filter(c => c.pillar === 'RA' || c.tags?.some(t => t.pillar === 'RA')),
    OE: filteredCourses.filter(c => c.pillar === 'OE' || c.tags?.some(t => t.pillar === 'OE')),
    AO: filteredCourses.filter(c => c.pillar === 'AO' || c.tags?.some(t => t.pillar === 'AO')),
  };

  // Group prescriptions by pillar
  const prescriptionsByPillar: Record<Pillar, typeof prescriptions> = {
    RA: prescriptions?.filter(p => p.pillar === 'RA') || [],
    OE: prescriptions?.filter(p => p.pillar === 'OE') || [],
    AO: prescriptions?.filter(p => p.pillar === 'AO') || [],
  };

  const isLoading = coursesLoading || prescriptionsLoading;

  return (
    <AppLayout 
      title="SISTUR EDU" 
      subtitle="Prescrição de capacitação baseada em diagnóstico"
    >
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between mb-6">
        <div className="flex gap-3 flex-1">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar cursos..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={pillarFilter} onValueChange={setPillarFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Pilar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="RA">IRA - Relações Ambientais</SelectItem>
              <SelectItem value="OE">IOE - Org. Estrutural</SelectItem>
              <SelectItem value="AO">IAO - Ações Operacionais</SelectItem>
            </SelectContent>
          </Select>
          <Select value={levelFilter} onValueChange={setLevelFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Nível" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="BASICO">Básico</SelectItem>
              <SelectItem value="INTERMEDIARIO">Intermediário</SelectItem>
              <SelectItem value="AVANCADO">Avançado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Novo Curso
        </Button>
      </div>

      {/* Stats by Pillar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {(['RA', 'OE', 'AO'] as Pillar[]).map((pillar) => (
          <Card key={pillar} className={`border-l-4 border-l-${PILLAR_INFO[pillar].color}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{PILLAR_INFO[pillar].name}</p>
                  <p className="text-2xl font-display font-bold">{coursesByPillar[pillar].length}</p>
                  <p className="text-xs text-muted-foreground">{PILLAR_INFO[pillar].fullName}</p>
                </div>
                <div className="text-right">
                  {prescriptionsByPillar[pillar].length > 0 && (
                    <Badge variant={pillar.toLowerCase() as 'ra' | 'oe' | 'ao'}>
                      {prescriptionsByPillar[pillar].length} prescrições
                    </Badge>
                  )}
                </div>
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
        <Tabs defaultValue="prescriptions" className="space-y-6">
          <TabsList>
            <TabsTrigger value="prescriptions" className="gap-2">
              <Target className="h-4 w-4" />
              Prescrições Ativas
            </TabsTrigger>
            <TabsTrigger value="catalog" className="gap-2">
              <GraduationCap className="h-4 w-4" />
              Catálogo Completo
            </TabsTrigger>
          </TabsList>

          {/* Prescriptions Tab */}
          <TabsContent value="prescriptions" className="space-y-6">
            {prescriptions && prescriptions.length > 0 ? (
              (['RA', 'OE', 'AO'] as Pillar[]).map((pillar) => {
                const pillarPrescriptions = prescriptionsByPillar[pillar];
                if (pillarPrescriptions.length === 0) return null;

                return (
                  <div key={pillar} className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Badge variant={pillar.toLowerCase() as 'ra' | 'oe' | 'ao'} className="text-sm">
                        {PILLAR_INFO[pillar].name}
                      </Badge>
                      <span className="text-lg font-semibold">{PILLAR_INFO[pillar].fullName}</span>
                    </div>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {pillarPrescriptions.map((prescription) => (
                        <Card key={prescription.id} className="border-l-4 border-l-amber-500">
                          <CardHeader className="pb-2">
                            <div className="flex items-start justify-between">
                              <div className="space-y-1">
                                <CardTitle className="text-base">
                                  {prescription.course?.title || 'Curso não encontrado'}
                                </CardTitle>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Badge variant={prescription.status === 'CRITICO' ? 'destructive' : 'secondary'}>
                                    {prescription.status === 'CRITICO' ? (
                                      <><AlertTriangle className="h-3 w-3 mr-1" /> Crítico</>
                                    ) : (
                                      'Atenção'
                                    )}
                                  </Badge>
                                  {prescription.interpretation && (
                                    <span className={`text-xs ${INTERPRETATION_INFO[prescription.interpretation].color}`}>
                                      {INTERPRETATION_INFO[prescription.interpretation].label}
                                    </span>
                                  )}
                                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Users className="h-3 w-3" />
                                    {TARGET_AGENT_INFO[prescription.target_agent].label}
                                  </span>
                                </div>
                              </div>
                              <span className="text-xs text-muted-foreground">
                                Prioridade #{prescription.priority}
                              </span>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-2">
                            <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
                              {prescription.justification}
                            </p>
                            {prescription.course?.duration_minutes && (
                              <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatDuration(prescription.course.duration_minutes)}
                                </span>
                                <Badge variant="outline">{levelLabels[prescription.course.level]}</Badge>
                              </div>
                            )}
                            {prescription.course?.url && (
                              <Button variant="outline" size="sm" className="mt-3" asChild>
                                <a href={prescription.course.url} target="_blank" rel="noopener noreferrer">
                                  Acessar curso
                                  <ExternalLink className="ml-2 h-3 w-3" />
                                </a>
                              </Button>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-16">
                <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
                <h3 className="mt-4 text-lg font-semibold text-foreground">
                  Nenhuma prescrição ativa
                </h3>
                <p className="mt-2 text-muted-foreground">
                  Execute um diagnóstico para gerar prescrições de capacitação.
                </p>
              </div>
            )}
          </TabsContent>

          {/* Catalog Tab */}
          <TabsContent value="catalog">
            {filteredCourses.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCourses.map((course, index) => (
                  <div
                    key={course.id}
                    className="group p-6 rounded-xl border bg-card hover:shadow-lg transition-all duration-300 animate-fade-in"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-lg bg-accent/10 text-accent">
                        <GraduationCap className="h-6 w-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <Badge variant="secondary">{levelLabels[course.level]}</Badge>
                          {course.duration_minutes && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {formatDuration(course.duration_minutes)}
                            </span>
                          )}
                        </div>
                        <h3 className="font-display font-semibold text-foreground group-hover:text-primary transition-colors">
                          {course.title}
                        </h3>
                      </div>
                    </div>

                    {course.description && (
                      <p className="mt-3 text-sm text-muted-foreground line-clamp-2">
                        {course.description}
                      </p>
                    )}

                    {/* Pillar Badge */}
                    <div className="mt-4 flex flex-wrap gap-2">
                      {course.pillar && (
                        <Badge
                          variant={course.pillar.toLowerCase() as 'ra' | 'oe' | 'ao'}
                          className="text-xs"
                        >
                          {PILLAR_INFO[course.pillar as Pillar].name} • {course.theme || 'Geral'}
                        </Badge>
                      )}
                      {!course.pillar && course.tags?.map((tag, i) => (
                        <Badge
                          key={i}
                          variant={tag.pillar.toLowerCase() as 'ra' | 'oe' | 'ao'}
                          className="text-xs"
                        >
                          {tag.pillar} • {tag.theme}
                        </Badge>
                      ))}
                      {course.target_agent && (
                        <Badge variant="outline" className="text-xs">
                          <Users className="h-3 w-3 mr-1" />
                          {TARGET_AGENT_INFO[course.target_agent].label}
                        </Badge>
                      )}
                    </div>

                    {course.url && (
                      <Button
                        variant="outline"
                        className="w-full mt-4"
                        asChild
                      >
                        <a href={course.url} target="_blank" rel="noopener noreferrer">
                          Acessar curso
                          <ExternalLink className="ml-2 h-3 w-3" />
                        </a>
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <GraduationCap className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <h3 className="mt-4 text-lg font-semibold text-foreground">
                  Nenhum curso encontrado
                </h3>
                <p className="mt-2 text-muted-foreground">
                  {searchQuery || pillarFilter !== 'all' || levelFilter !== 'all' 
                    ? 'Tente ajustar os filtros de busca.'
                    : 'Comece cadastrando seu primeiro curso de capacitação.'}
                </p>
                <Button className="mt-4">
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Curso
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </AppLayout>
  );
};

export default Cursos;
