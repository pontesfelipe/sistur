import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  BookOpen, 
  Trophy, 
  Clock, 
  Target, 
  TrendingUp,
  Award,
  CheckCircle,
} from 'lucide-react';

interface LMSProgressCardProps {
  coursesCompleted: number;
  coursesTotal: number;
  certificatesEarned: number;
  hoursSpent: number;
  currentStreak?: number;
  averageScore?: number;
}

export function LMSProgressCard({
  coursesCompleted,
  coursesTotal,
  certificatesEarned,
  hoursSpent,
  currentStreak = 0,
  averageScore = 0,
}: LMSProgressCardProps) {
  const progressPercentage = coursesTotal > 0 
    ? Math.round((coursesCompleted / coursesTotal) * 100) 
    : 0;

  return (
    <Card className="overflow-hidden">
      <div className="bg-gradient-to-r from-primary/20 via-primary/10 to-transparent p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold">Seu Progresso</h3>
            <p className="text-muted-foreground">Continue aprendendo!</p>
          </div>
          <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center">
            <Trophy className="h-8 w-8 text-primary" />
          </div>
        </div>
      </div>
      
      <CardContent className="pt-6 space-y-6">
        {/* Main Progress */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Cursos Concluídos</span>
            <span className="text-2xl font-bold">{coursesCompleted}/{coursesTotal}</span>
          </div>
          <Progress value={progressPercentage} className="h-3" />
          <p className="text-xs text-muted-foreground text-right">
            {progressPercentage}% completo
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-lg bg-muted/50 space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Award className="h-4 w-4" />
              <span className="text-xs">Certificados</span>
            </div>
            <p className="text-2xl font-bold">{certificatesEarned}</p>
          </div>
          
          <div className="p-4 rounded-lg bg-muted/50 space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span className="text-xs">Horas de Estudo</span>
            </div>
            <p className="text-2xl font-bold">{hoursSpent}h</p>
          </div>
          
          <div className="p-4 rounded-lg bg-muted/50 space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              <span className="text-xs">Nota Média</span>
            </div>
            <p className="text-2xl font-bold">{averageScore}%</p>
          </div>
          
          <div className="p-4 rounded-lg bg-muted/50 space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Target className="h-4 w-4" />
              <span className="text-xs">Sequência</span>
            </div>
            <p className="text-2xl font-bold">{currentStreak} dias</p>
          </div>
        </div>

        {/* Achievement Badges */}
        {(coursesCompleted >= 1 || certificatesEarned >= 1) && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Conquistas</p>
            <div className="flex flex-wrap gap-2">
              {coursesCompleted >= 1 && (
                <Badge variant="secondary" className="gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Primeiro Curso
                </Badge>
              )}
              {coursesCompleted >= 5 && (
                <Badge variant="secondary" className="gap-1">
                  <BookOpen className="h-3 w-3" />
                  Estudioso
                </Badge>
              )}
              {certificatesEarned >= 1 && (
                <Badge className="bg-amber-500/20 text-amber-700 gap-1">
                  <Award className="h-3 w-3" />
                  Certificado
                </Badge>
              )}
              {currentStreak >= 7 && (
                <Badge className="bg-green-500/20 text-green-700 gap-1">
                  <TrendingUp className="h-3 w-3" />
                  Dedicado
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
