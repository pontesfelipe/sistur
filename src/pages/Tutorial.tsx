import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProfileContext } from '@/contexts/ProfileContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { ExternalLink, CheckCircle2, BookOpen, ChevronRight, Clock } from 'lucide-react';
import { tutorialCategories, getTutorialForRole, getUserTutorialRole, type TutorialRole, type TutorialCategory } from '@/data/tutorialData';
import { getDetailedTopicIds, getTopicDetail } from '@/data/tutorialSteps';

const ROLE_LABELS: Record<TutorialRole, string> = {
  ADMIN: 'Administrador',
  PROFESSOR: 'Professor',
  ESTUDANTE: 'Estudante',
  ERP: 'Gestor ERP',
};

export default function Tutorial() {
  const navigate = useNavigate();
  const { isAdmin, isProfessor, isEstudante, hasERPAccess } = useProfileContext();
  const userRole = getUserTutorialRole(isAdmin, isProfessor, isEstudante, hasERPAccess);
  
  const [viewRole, setViewRole] = useState<TutorialRole>(userRole);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('sistur_tutorial_completed');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  const categories = useMemo(() => getTutorialForRole(viewRole), [viewRole]);
  const detailedIds = useMemo(() => new Set(getDetailedTopicIds()), []);

  const toggleStep = (stepId: string) => {
    setCompletedSteps(prev => {
      const next = new Set(prev);
      if (next.has(stepId)) next.delete(stepId);
      else next.add(stepId);
      localStorage.setItem('sistur_tutorial_completed', JSON.stringify([...next]));
      return next;
    });
  };

  const totalSteps = categories.reduce((sum, cat) => sum + cat.steps.length, 0);
  const doneSteps = categories.reduce(
    (sum, cat) => sum + cat.steps.filter(s => completedSteps.has(s.id)).length, 0
  );
  const progressPct = totalSteps > 0 ? Math.round((doneSteps / totalSteps) * 100) : 0;

  // Available roles to view (admin can see all, others see their own)
  const availableRoles: TutorialRole[] = isAdmin 
    ? ['ADMIN', 'ERP', 'PROFESSOR', 'ESTUDANTE'] 
    : [userRole];

  return (
    <AppLayout title="Tutorial" subtitle="Aprenda a usar o SISTUR">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-primary" />
              Tutorial do SISTUR
            </h1>
            <p className="text-muted-foreground mt-1">
              Aprenda a usar todas as funcionalidades da plataforma
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-sm px-3 py-1">
              {doneSteps}/{totalSteps} concluídos ({progressPct}%)
            </Badge>
            <Badge className="bg-primary/10 text-primary border-primary/20">
              {ROLE_LABELS[viewRole]}
            </Badge>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-muted rounded-full h-2.5">
          <div
            className="bg-primary h-2.5 rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Role tabs (admin can switch) */}
        {availableRoles.length > 1 && (
          <Tabs value={viewRole} onValueChange={(v) => setViewRole(v as TutorialRole)}>
            <TabsList>
              {availableRoles.map(role => (
                <TabsTrigger key={role} value={role}>{ROLE_LABELS[role]}</TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        )}

        {/* Tutorial categories */}
        <div className="space-y-8">
          {categories.map((cat) => (
            <section key={cat.id}>
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-foreground">{cat.title}</h2>
                <p className="text-sm text-muted-foreground">{cat.description}</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {cat.steps.map((step) => {
                  const done = completedSteps.has(step.id);
                  return (
                    <Card
                      key={step.id}
                      className={cn(
                        'transition-all duration-200 hover:shadow-md cursor-pointer',
                        done && 'border-primary/30 bg-primary/5'
                      )}
                      onClick={() => toggleStep(step.id)}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              'h-9 w-9 rounded-lg flex items-center justify-center',
                              done ? 'bg-primary/20' : 'bg-muted'
                            )}>
                              <step.icon className={cn('h-5 w-5', done ? 'text-primary' : 'text-muted-foreground')} />
                            </div>
                            <CardTitle className="text-sm">{step.title}</CardTitle>
                          </div>
                          {done && <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <CardDescription className="text-xs leading-relaxed">
                          {step.description}
                        </CardDescription>
                        {step.route && (
                          <Button
                            variant="link"
                            size="sm"
                            className="px-0 mt-2 h-auto text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(step.route!);
                            }}
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Ir para {step.title}
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
