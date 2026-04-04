import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Search,
  Star,
  Globe,
  TrendingUp,
  TrendingDown,
  ThumbsUp,
  ThumbsDown,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Sparkles,
  Hotel,
  MapPin,
  ArrowRight,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface GuestExperienceDimensions {
  atendimento: number | null;
  limpeza: number | null;
  infraestrutura: number | null;
  gastronomia: number | null;
  localizacao: number | null;
  custo_beneficio: number | null;
}

interface BusinessReviewAnalysis {
  review_score: number | null;
  review_count: number | null;
  digital_maturity: number | null;
  platforms_found: string[];
  sentiment_summary: string;
  sentiment_score: number | null;
  guest_experience_dimensions: GuestExperienceDimensions;
  recurring_themes: string[];
  strengths: string[];
  weaknesses: string[];
  sample_positive_quotes: string[];
  sample_negative_quotes: string[];
  recommendation: string;
  sources: { platform: string; url: string; rating: number | null }[];
}

interface SearchResult {
  success: boolean;
  businessName: string;
  location: string;
  searchResults: { google: number; tripAdvisor: number; general: number };
  analysis: BusinessReviewAnalysis | null;
}

interface BusinessReviewSearchProps {
  /** If provided, enables auto-fill mode */
  onAutoFill?: (indicatorValues: Record<string, number>) => void;
  /** Pre-fill business name */
  defaultBusinessName?: string;
  /** Pre-fill location */
  defaultLocation?: string;
  /** Compact mode for embedding */
  compact?: boolean;
}

const PROPERTY_TYPES = [
  { value: 'hotel', label: 'Hotel' },
  { value: 'resort', label: 'Resort' },
  { value: 'pousada', label: 'Pousada' },
  { value: 'hostel', label: 'Hostel' },
  { value: 'restaurante', label: 'Restaurante' },
  { value: 'atracao', label: 'Atração Turística' },
  { value: 'operadora', label: 'Operadora/Agência' },
];

export function BusinessReviewSearch({ onAutoFill, defaultBusinessName = '', defaultLocation = '', compact = false }: BusinessReviewSearchProps) {
  const [businessName, setBusinessName] = useState(defaultBusinessName);
  const [location, setLocation] = useState(defaultLocation);
  const [propertyType, setPropertyType] = useState('hotel');
  const [isSearching, setIsSearching] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);

  const handleSearch = async () => {
    if (!businessName.trim() || !location.trim()) {
      toast.error('Informe o nome do estabelecimento e a localização');
      return;
    }

    setIsSearching(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('search-business-reviews', {
        body: { businessName: businessName.trim(), location: location.trim(), propertyType },
      });

      if (error) throw error;
      setResult(data);
      toast.success('Busca concluída!');
    } catch (err: any) {
      console.error('Search error:', err);
      toast.error('Erro ao buscar reviews: ' + (err.message || 'Tente novamente'));
    } finally {
      setIsSearching(false);
    }
  };

  const handleAutoFill = () => {
    if (!result?.analysis || !onAutoFill) return;

    const values: Record<string, number> = {};
    if (result.analysis.review_score !== null) {
      values['ENT_REVIEW_SCORE'] = result.analysis.review_score;
    }
    if (result.analysis.digital_maturity !== null) {
      values['ENT_TECH_SCORE'] = result.analysis.digital_maturity;
    }
    if (result.analysis.sentiment_score !== null) {
      values['ENT_SENTIMENT_SCORE'] = result.analysis.sentiment_score;
    }

    if (Object.keys(values).length === 0) {
      toast.warning('Nenhum indicador encontrado para auto-preencher');
      return;
    }

    onAutoFill(values);
    toast.success(`${Object.keys(values).length} indicador(es) preenchido(s) automaticamente`);
  };

  const DIMENSION_LABELS: Record<string, string> = {
    atendimento: 'Atendimento',
    limpeza: 'Limpeza',
    infraestrutura: 'Infraestrutura',
    gastronomia: 'Gastronomia',
    localizacao: 'Localização',
    custo_beneficio: 'Custo-Benefício',
  };

  const renderStars = (score: number | null) => {
    if (score === null) return <span className="text-muted-foreground text-sm">N/A</span>;
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            className={cn(
              'h-4 w-4',
              i <= Math.round(score)
                ? 'fill-amber-400 text-amber-400'
                : 'text-muted-foreground/30'
            )}
          />
        ))}
        <span className="ml-1 font-semibold text-sm">{score.toFixed(1)}</span>
      </div>
    );
  };

  return (
    <Card className={cn(!compact && 'max-w-2xl mx-auto')}>
      <CardHeader className={compact ? 'pb-3' : undefined}>
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <Search className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className={compact ? 'text-base' : 'text-lg'}>
              Busca de Reviews Online
            </CardTitle>
            <CardDescription>
              Pesquise avaliações em Google, TripAdvisor e outros
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search Form */}
        <div className={cn('grid gap-3', compact ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2')}>
          <div className="space-y-1.5">
            <Label htmlFor="businessName" className="text-xs font-medium">
              <Hotel className="h-3 w-3 inline mr-1" />
              Nome do Estabelecimento
            </Label>
            <Input
              id="businessName"
              placeholder="Ex: Hotel Fasano"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              disabled={isSearching}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="location" className="text-xs font-medium">
              <MapPin className="h-3 w-3 inline mr-1" />
              Localização
            </Label>
            <Input
              id="location"
              placeholder="Ex: São Paulo, SP"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              disabled={isSearching}
            />
          </div>
        </div>

        <div className="flex items-end gap-3">
          <div className="flex-1 space-y-1.5">
            <Label className="text-xs font-medium">Tipo</Label>
            <Select value={propertyType} onValueChange={setPropertyType} disabled={isSearching}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROPERTY_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleSearch} disabled={isSearching || !businessName.trim() || !location.trim()}>
            {isSearching ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Buscando...
              </>
            ) : (
              <>
                <Search className="h-4 w-4 mr-2" />
                Buscar Reviews
              </>
            )}
          </Button>
        </div>

        {/* Loading State */}
        {isSearching && (
          <div className="p-6 text-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <div>
              <p className="font-medium">Pesquisando reviews online...</p>
              <p className="text-sm text-muted-foreground">
                Google Maps, TripAdvisor, Booking.com e mais
              </p>
            </div>
            <Progress value={45} className="max-w-xs mx-auto" />
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-4 pt-2">
            <Separator />

            {/* Search Summary */}
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="gap-1">
                <Globe className="h-3 w-3" />
                Google: {result.searchResults.google} resultado(s)
              </Badge>
              <Badge variant="outline" className="gap-1">
                <Globe className="h-3 w-3" />
                TripAdvisor: {result.searchResults.tripAdvisor} resultado(s)
              </Badge>
              <Badge variant="outline" className="gap-1">
                <Globe className="h-3 w-3" />
                Outros: {result.searchResults.general} resultado(s)
              </Badge>
            </div>

            {result.analysis ? (
              <>
                {/* Score Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                   <Card className="border-amber-200 dark:border-amber-800">
                    <CardContent className="p-4 text-center">
                      <p className="text-xs text-muted-foreground mb-1">Nota Média</p>
                      {renderStars(result.analysis.review_score)}
                      {result.analysis.review_count && (
                        <p className="text-xs text-muted-foreground mt-1">
                          ~{result.analysis.review_count} reviews
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="border-purple-200 dark:border-purple-800">
                    <CardContent className="p-4 text-center">
                      <p className="text-xs text-muted-foreground mb-1">Sentimento</p>
                      {renderStars(result.analysis.sentiment_score)}
                      <p className="text-xs text-muted-foreground mt-1">baseado nos comentários</p>
                    </CardContent>
                  </Card>

                  <Card className="border-blue-200 dark:border-blue-800">
                    <CardContent className="p-4 text-center">
                      <p className="text-xs text-muted-foreground mb-1">Maturidade Digital</p>
                      <div className="flex items-center justify-center gap-1">
                        <TrendingUp className="h-4 w-4 text-blue-500" />
                        <span className="font-semibold">
                          {result.analysis.digital_maturity !== null
                            ? `${result.analysis.digital_maturity}/5`
                            : 'N/A'}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Guest Experience Dimensions */}
                {result.analysis.guest_experience_dimensions && (
                  <Card>
                    <CardContent className="p-4 space-y-3">
                      <span className="text-xs font-medium">📊 Dimensões da Experiência do Hóspede</span>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {Object.entries(result.analysis.guest_experience_dimensions).map(([key, val]) => (
                          val !== null && (
                            <div key={key} className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                              <span className="text-xs text-muted-foreground">{DIMENSION_LABELS[key] || key}</span>
                              <div className="flex items-center gap-1">
                                <Star className={cn('h-3 w-3', val >= 4 ? 'fill-amber-400 text-amber-400' : val >= 3 ? 'fill-amber-300 text-amber-300' : 'fill-orange-400 text-orange-400')} />
                                <span className="text-xs font-semibold">{val.toFixed(1)}</span>
                              </div>
                            </div>
                          )
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Recurring Themes */}
                {result.analysis.recurring_themes?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {result.analysis.recurring_themes.map((theme, i) => (
                      <Badge key={i} variant="secondary" className="text-[10px]">
                        {theme}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Sentiment */}
                <Card>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      <span className="font-medium text-sm">Análise de Sentimento</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{result.analysis.sentiment_summary}</p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {result.analysis.strengths.length > 0 && (
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1 text-xs font-medium text-green-600">
                            <ThumbsUp className="h-3 w-3" /> Pontos Fortes
                          </div>
                          <ul className="space-y-1">
                            {result.analysis.strengths.map((s, i) => (
                              <li key={i} className="text-xs text-muted-foreground flex items-start gap-1">
                                <CheckCircle2 className="h-3 w-3 text-green-500 mt-0.5 shrink-0" />
                                {s}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {result.analysis.weaknesses.length > 0 && (
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1 text-xs font-medium text-orange-600">
                            <ThumbsDown className="h-3 w-3" /> Pontos de Atenção
                          </div>
                          <ul className="space-y-1">
                            {result.analysis.weaknesses.map((w, i) => (
                              <li key={i} className="text-xs text-muted-foreground flex items-start gap-1">
                                <AlertTriangle className="h-3 w-3 text-orange-500 mt-0.5 shrink-0" />
                                {w}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {result.analysis.recommendation && (
                      <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                        <p className="text-xs font-medium text-primary mb-1">💡 Recomendação</p>
                        <p className="text-xs text-muted-foreground">{result.analysis.recommendation}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Sources */}
                {result.analysis.sources.length > 0 && (
                  <Card>
                    <CardContent className="p-4 space-y-2">
                      <span className="text-xs font-medium">Fontes Encontradas</span>
                      <div className="space-y-1.5">
                        {result.analysis.sources.map((src, i) => (
                          <div key={i} className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-[10px] px-1.5">
                                {src.platform}
                              </Badge>
                              {src.rating !== null && renderStars(src.rating)}
                            </div>
                            {src.url && (
                              <a
                                href={src.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline flex items-center gap-1"
                              >
                                Abrir <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Auto-fill Button */}
                {onAutoFill && (result.analysis.review_score !== null || result.analysis.digital_maturity !== null) && (
                  <Button
                    onClick={handleAutoFill}
                    className="w-full gap-2"
                    variant="default"
                  >
                    <ArrowRight className="h-4 w-4" />
                    Preencher Indicadores Automaticamente
                    <Badge variant="secondary" className="ml-1">
                      {[result.analysis.review_score !== null, result.analysis.digital_maturity !== null].filter(Boolean).length} indicador(es)
                    </Badge>
                  </Button>
                )}
              </>
            ) : (
              <div className="p-4 text-center text-muted-foreground">
                <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-amber-500" />
                <p className="font-medium">Nenhuma análise disponível</p>
                <p className="text-sm">Não foram encontrados dados suficientes para gerar uma análise.</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
