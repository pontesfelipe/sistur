import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Users, ArrowRight, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { ClassroomAnnouncementsPanel } from '@/components/edu/ClassroomAnnouncementsPanel';
import { ClassroomLeaderboardPanel } from '@/components/edu/ClassroomLeaderboardPanel';

interface StudentClassroom {
  classroom_id: string;
  name: string;
  description: string | null;
  discipline: string | null;
  professor_name: string | null;
}

function useStudentClassrooms() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['student-classrooms', user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<StudentClassroom[]> => {
      const { data: rows } = await supabase
        .from('classroom_students')
        .select('classroom_id, classrooms!inner(id, name, description, discipline, professor_id)')
        .eq('student_id', user!.id);
      const list = (rows ?? []).map((r: any) => ({
        classroom_id: r.classroom_id,
        name: r.classrooms?.name ?? '',
        description: r.classrooms?.description ?? null,
        discipline: r.classrooms?.discipline ?? null,
        professor_id: r.classrooms?.professor_id,
      }));
      const profIds = Array.from(new Set(list.map((l: any) => l.professor_id).filter(Boolean)));
      let nameMap = new Map<string, string>();
      if (profIds.length) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', profIds);
        nameMap = new Map((profs ?? []).map((p: any) => [p.user_id, p.full_name ?? 'Professor']));
      }
      return list.map((l: any) => ({
        classroom_id: l.classroom_id,
        name: l.name,
        description: l.description,
        discipline: l.discipline,
        professor_name: nameMap.get(l.professor_id) ?? null,
      }));
    },
  });
}

const EduMinhasTurmas = () => {
  const { data: classrooms = [], isLoading } = useStudentClassrooms();
  const [activeId, setActiveId] = useState<string | null>(null);

  const active = classrooms.find((c) => c.classroom_id === activeId);

  useEffect(() => {
    if (!activeId && classrooms.length === 1) setActiveId(classrooms[0].classroom_id);
  }, [activeId, classrooms]);

  return (
    <AppLayout title="Minhas Turmas">
      <div className="container max-w-5xl py-6 space-y-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6" /> Minhas Turmas
          </h1>
          <p className="text-sm text-muted-foreground">
            Turmas em que você está matriculado e anúncios dos professores.
          </p>
        </div>

        {isLoading && <Skeleton className="h-32 w-full" />}
        {!isLoading && classrooms.length === 0 && (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Você ainda não está matriculado em nenhuma turma.
            </CardContent>
          </Card>
        )}

        {active ? (
          <div className="space-y-4">
            <Button variant="ghost" size="sm" onClick={() => setActiveId(null)}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Voltar para turmas
            </Button>
            <Card>
              <CardHeader>
                <CardTitle>{active.name}</CardTitle>
                <CardDescription>
                  {active.discipline && <span>{active.discipline}</span>}
                  {active.professor_name && <span> · Prof. {active.professor_name}</span>}
                </CardDescription>
              </CardHeader>
              {active.description && (
                <CardContent className="text-sm text-muted-foreground">{active.description}</CardContent>
              )}
            </Card>
            <ClassroomAnnouncementsPanel classroomId={active.classroom_id} canManage={false} />
            <ClassroomLeaderboardPanel classroomId={active.classroom_id} showOptInToggle />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {classrooms.map((c) => (
              <button
                key={c.classroom_id}
                type="button"
                onClick={() => setActiveId(c.classroom_id)}
                className="text-left"
              >
                <Card className="hover:bg-muted/50 transition-colors h-full">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{c.name}</CardTitle>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <CardDescription>
                      {c.discipline && <span>{c.discipline}</span>}
                      {c.professor_name && <span> · Prof. {c.professor_name}</span>}
                    </CardDescription>
                  </CardHeader>
                  {c.description && (
                    <CardContent className="text-sm text-muted-foreground line-clamp-2">
                      {c.description}
                    </CardContent>
                  )}
                </Card>
              </button>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default EduMinhasTurmas;