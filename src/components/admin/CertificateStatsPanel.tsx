import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Award, 
  TrendingUp, 
  TrendingDown, 
  CheckCircle, 
  XCircle,
  BarChart3
} from 'lucide-react';
import { useCertificateStats } from '@/hooks/useCertificates';

export function CertificateStatsPanel() {
  const { data: stats, isLoading, error } = useCertificateStats();

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-4 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error || !stats) {
    return (
      <Card className="border-destructive/30 bg-destructive/5">
        <CardContent className="py-6 text-center text-destructive">
          Erro ao carregar estatísticas de certificados
        </CardContent>
      </Card>
    );
  }

  const monthChange = stats.thisMonth - stats.lastMonth;
  const monthChangePercent = stats.lastMonth > 0 
    ? Math.round((monthChange / stats.lastMonth) * 100) 
    : stats.thisMonth > 0 ? 100 : 0;

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total de Certificados</p>
              </div>
              <div className="p-3 rounded-full bg-primary/10">
                <Award className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-green-600">{stats.active}</p>
                <p className="text-sm text-muted-foreground">Ativos</p>
              </div>
              <div className="p-3 rounded-full bg-green-500/10">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-red-600">{stats.revoked}</p>
                <p className="text-sm text-muted-foreground">Revogados</p>
              </div>
              <div className="p-3 rounded-full bg-red-500/10">
                <XCircle className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-3xl font-bold">{stats.thisMonth}</p>
                  {monthChange !== 0 && (
                    <Badge 
                      variant="outline" 
                      className={monthChange > 0 
                        ? "bg-green-500/10 text-green-700 border-green-500/30" 
                        : "bg-red-500/10 text-red-700 border-red-500/30"
                      }
                    >
                      {monthChange > 0 ? (
                        <TrendingUp className="h-3 w-3 mr-1" />
                      ) : (
                        <TrendingDown className="h-3 w-3 mr-1" />
                      )}
                      {monthChange > 0 ? '+' : ''}{monthChangePercent}%
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">Este mês</p>
              </div>
              <div className="p-3 rounded-full bg-blue-500/10">
                <BarChart3 className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* By Pillar */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Certificados por Pilar</CardTitle>
          <CardDescription>Distribuição de certificados emitidos por área</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center justify-between p-4 rounded-lg bg-blue-500/5 border border-blue-500/20">
              <div>
                <p className="text-2xl font-bold text-blue-700">{stats.byPillar.RA}</p>
                <p className="text-sm text-muted-foreground">Relações Ambientais</p>
              </div>
              <Badge variant="outline" className="bg-blue-500/10 text-blue-700 border-blue-500/30">
                RA
              </Badge>
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg bg-green-500/5 border border-green-500/20">
              <div>
                <p className="text-2xl font-bold text-green-700">{stats.byPillar.OE}</p>
                <p className="text-sm text-muted-foreground">Organização Estrutural</p>
              </div>
              <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/30">
                OE
              </Badge>
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg bg-purple-500/5 border border-purple-500/20">
              <div>
                <p className="text-2xl font-bold text-purple-700">{stats.byPillar.AO}</p>
                <p className="text-sm text-muted-foreground">Ações Operacionais</p>
              </div>
              <Badge variant="outline" className="bg-purple-500/10 text-purple-700 border-purple-500/30">
                AO
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
