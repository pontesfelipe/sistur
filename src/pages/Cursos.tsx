import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Search, 
  GraduationCap,
  Clock,
  ExternalLink,
  Filter
} from 'lucide-react';
import { mockCourses } from '@/data/mockData';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const Cursos = () => {
  const levelLabels = {
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

  return (
    <AppLayout 
      title="SISTUR EDU" 
      subtitle="Catálogo de cursos e trilhas de capacitação"
    >
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between mb-6">
        <div className="flex gap-3 flex-1">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar cursos..."
              className="pl-9"
            />
          </div>
          <Select defaultValue="all">
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Pilar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="ra">IRA</SelectItem>
              <SelectItem value="oe">IOE</SelectItem>
              <SelectItem value="ao">IAO</SelectItem>
            </SelectContent>
          </Select>
          <Select defaultValue="all">
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Nível" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="basico">Básico</SelectItem>
              <SelectItem value="intermediario">Intermediário</SelectItem>
              <SelectItem value="avancado">Avançado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Novo Curso
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <div className="p-4 rounded-lg border bg-card">
          <p className="text-sm text-muted-foreground">Total de Cursos</p>
          <p className="text-2xl font-display font-bold">{mockCourses.length}</p>
        </div>
        <div className="p-4 rounded-lg border bg-card">
          <p className="text-sm text-muted-foreground">Nível Básico</p>
          <p className="text-2xl font-display font-bold">
            {mockCourses.filter(c => c.level === 'BASICO').length}
          </p>
        </div>
        <div className="p-4 rounded-lg border bg-card">
          <p className="text-sm text-muted-foreground">Nível Intermediário</p>
          <p className="text-2xl font-display font-bold">
            {mockCourses.filter(c => c.level === 'INTERMEDIARIO').length}
          </p>
        </div>
        <div className="p-4 rounded-lg border bg-card">
          <p className="text-sm text-muted-foreground">Nível Avançado</p>
          <p className="text-2xl font-display font-bold">
            {mockCourses.filter(c => c.level === 'AVANCADO').length}
          </p>
        </div>
      </div>

      {/* Courses Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockCourses.map((course, index) => (
          <div
            key={course.id}
            className="group p-6 rounded-xl border bg-card hover:shadow-lg transition-all duration-300 animate-fade-in"
            style={{ animationDelay: `${index * 100}ms` }}
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

            {/* Tags */}
            <div className="mt-4 flex flex-wrap gap-2">
              {course.tags.map((tag, i) => (
                <Badge
                  key={i}
                  variant={tag.pillar.toLowerCase() as 'ra' | 'oe' | 'ao'}
                  className="text-xs"
                >
                  {tag.pillar} • {tag.theme}
                </Badge>
              ))}
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

      {/* Empty State */}
      {mockCourses.length === 0 && (
        <div className="text-center py-16">
          <GraduationCap className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold text-foreground">
            Nenhum curso cadastrado
          </h3>
          <p className="mt-2 text-muted-foreground">
            Comece cadastrando seu primeiro curso de capacitação.
          </p>
          <Button className="mt-4">
            <Plus className="mr-2 h-4 w-4" />
            Novo Curso
          </Button>
        </div>
      )}
    </AppLayout>
  );
};

export default Cursos;
