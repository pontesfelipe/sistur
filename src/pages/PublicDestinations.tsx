import { AppLayout } from '@/components/layout/AppLayout';
import { usePublicDestinations } from '@/hooks/usePublicDestinations';
import { PublicDestinationCard } from '@/components/public/PublicDestinationCard';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Globe, Award, CheckCircle, Info } from 'lucide-react';

export default function PublicDestinations() {
  const { destinations, isLoading, certifiedCount, readyCount } = usePublicDestinations(true);

  return (
    <AppLayout title="Destinos Públicos">
      <div className="container py-8 space-y-8">
        {/* Header */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-primary/10">
              <Globe className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Destinos Turísticos Certificados</h1>
              <p className="text-muted-foreground">
                Avaliados pela metodologia SISTUR de Mario Carlos Beni
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="flex gap-4">
            <Badge variant="secondary" className="py-1.5 px-3">
              <CheckCircle className="w-4 h-4 mr-1" />
              {readyCount} destinos prontos
            </Badge>
            <Badge variant="secondary" className="py-1.5 px-3">
              <Award className="w-4 h-4 mr-1" />
              {certifiedCount} certificados
            </Badge>
          </div>
        </div>

        {/* Methodology Info */}
        <Card className="bg-muted/50">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-primary mt-0.5" />
              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-1">Metodologia SISTUR</p>
                <p>
                  Os destinos listados foram avaliados segundo os princípios sistêmicos de Mario Carlos Beni,
                  priorizando sustentabilidade ambiental (RA), governança responsável (AO) e infraestrutura
                  adequada (OE). Apenas destinos sem limitações críticas são exibidos publicamente.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Destinations Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i}>
                <CardContent className="p-6 space-y-4">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-16 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : destinations && destinations.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {destinations.map((destination) => (
              <PublicDestinationCard
                key={destination.destination_id}
                destination={destination}
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Globe className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhum destino disponível</h3>
              <p className="text-muted-foreground">
                Ainda não há destinos com avaliações calculadas e prontos para visitação.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
