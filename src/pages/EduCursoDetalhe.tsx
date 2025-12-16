import { Link, useParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { 
  ChevronLeft,
  Clock,
  Users,
  GraduationCap,
  ExternalLink,
  Video,
  BookOpen,
  Target,
  CheckCircle2
} from 'lucide-react';
import { useEduCourse } from '@/hooks/useEdu';
import { PILLAR_INFO, TARGET_AGENT_INFO } from '@/types/sistur';

const LIVE_TYPE_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  primary: { label: 'Principal', icon: '🎯', color: 'bg-green-500/10 text-green-700 border-green-500/20' },
  case: { label: 'Caso', icon: '📘', color: 'bg-blue-500/10 text-blue-700 border-blue-500/20' },
  complementary: { label: 'Complementar', icon: '➕', color: 'bg-gray-500/10 text-gray-700 border-gray-500/20' },
};

const EduCursoDetalhe = () => {
  const { id } = useParams<{ id: string }>();
  const { data: course, isLoading } = useEduCourse(id);

  if (isLoading) {
    return (
      <AppLayout title="Carregando..." subtitle="">
        <Skeleton className="h-64" />
      </AppLayout>
    );
  }

  if (!course) {
    return (
      <AppLayout title="Curso não encontrado" subtitle="">
        <div className="text-center py-16">
          <GraduationCap className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <p className="mt-4 text-muted-foreground">Este curso não existe ou foi removido.</p>
          <Button className="mt-4" asChild>
            <Link to="/edu">Voltar ao Catálogo</Link>
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout 
      title={course.title} 
      subtitle={`${course.code} • ${PILLAR_INFO[course.pillar].fullName}`}
    >
      <div className="mb-6">
        <Button variant="outline" asChild>
          <Link to="/edu">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Voltar ao Catálogo
          </Link>
        </Button>
      </div>

      {/* Course Header */}
      <Card className="mb-8">
        <CardContent className="p-6">
          <div className="flex flex-wrap items-start gap-4 mb-4">
            <Badge variant={course.pillar.toLowerCase() as 'ra' | 'oe' | 'ao'} className="text-base px-3 py-1">
              {course.code}
            </Badge>
            {course.suggested_hours && (
              <Badge variant="outline" className="text-base px-3 py-1">
                <Clock className="h-4 w-4 mr-2" />
                {course.suggested_hours} horas
              </Badge>
            )}
            {course.audience && (
              <Badge variant="secondary" className="text-base px-3 py-1">
                <Users className="h-4 w-4 mr-2" />
                {TARGET_AGENT_INFO[course.audience].label}
              </Badge>
            )}
          </div>

          {course.objective && (
            <div className="mb-4">
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Objetivo</h3>
              <p className="text-foreground">{course.objective}</p>
            </div>
          )}

          {course.description && (
            <div className="mb-4">
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Descrição</h3>
              <p className="text-foreground">{course.description}</p>
            </div>
          )}

          {course.certification && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10">
              <GraduationCap className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">Certificação</p>
                <p className="text-sm text-muted-foreground">{course.certification}</p>
              </div>
            </div>
          )}

          {course.url && (
            <Button className="mt-4" asChild>
              <a href={course.url} target="_blank" rel="noopener noreferrer">
                Acessar Curso
                <ExternalLink className="ml-2 h-4 w-4" />
              </a>
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Modules */}
      <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <BookOpen className="h-5 w-5 text-primary" />
        Módulos do Curso ({course.modules?.length || 0})
      </h3>

      {course.modules && course.modules.length > 0 ? (
        <Accordion type="single" collapsible className="space-y-4">
          {course.modules.map((module, index) => {
            const primaryLives = module.lives?.filter(l => l.live_type === 'primary') || [];
            const caseLives = module.lives?.filter(l => l.live_type === 'case') || [];
            const complementaryLives = module.lives?.filter(l => l.live_type === 'complementary') || [];
            
            return (
              <AccordionItem 
                key={module.id} 
                value={module.id}
                className="border rounded-lg overflow-hidden"
              >
                <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50">
                  <div className="flex items-center gap-3 text-left">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-sm">
                      {module.module_index}
                    </div>
                    <div>
                      <h4 className="font-medium">{module.title}</h4>
                      <p className="text-xs text-muted-foreground">
                        {module.lives?.length || 0} lives
                        {module.activities && (module.activities as string[]).length > 0 && 
                          ` • ${(module.activities as string[]).length} atividades`
                        }
                      </p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  {/* Lives by Type */}
                  {[
                    { type: 'primary', lives: primaryLives, label: 'Lives Principais' },
                    { type: 'case', lives: caseLives, label: 'Cases' },
                    { type: 'complementary', lives: complementaryLives, label: 'Complementares' },
                  ].map(({ type, lives, label }) => lives.length > 0 && (
                    <div key={type} className="mb-4">
                      <p className="text-sm font-medium mb-2 flex items-center gap-2">
                        <span>{LIVE_TYPE_LABELS[type].icon}</span>
                        {label}
                      </p>
                      <div className="space-y-2">
                        {lives.map((ml) => (
                          <div 
                            key={ml.id}
                            className={`flex items-center gap-3 p-3 rounded-lg border ${LIVE_TYPE_LABELS[type].color}`}
                          >
                            <Video className="h-4 w-4 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">
                                {ml.live?.title || 'Live não encontrada'}
                              </p>
                              {ml.live?.duration_minutes && (
                                <p className="text-xs text-muted-foreground">
                                  {ml.live.duration_minutes} min
                                </p>
                              )}
                            </div>
                            {ml.live?.url && (
                              <Button variant="ghost" size="sm" asChild>
                                <a href={ml.live.url} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  {/* Activities */}
                  {module.activities && (module.activities as string[]).length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2 flex items-center gap-2">
                        <Target className="h-4 w-4" />
                        Atividades
                      </p>
                      <ul className="space-y-2">
                        {(module.activities as string[]).map((activity, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                            {activity}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {module.lives?.length === 0 && (!module.activities || (module.activities as string[]).length === 0) && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhum conteúdo cadastrado neste módulo.
                    </p>
                  )}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      ) : (
        <Card>
          <CardContent className="py-8 text-center">
            <BookOpen className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
            <p className="text-muted-foreground">
              Nenhum módulo cadastrado para este curso.
            </p>
          </CardContent>
        </Card>
      )}
    </AppLayout>
  );
};

export default EduCursoDetalhe;
