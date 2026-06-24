import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Search,
  Loader2,
  CheckCircle2,
  XCircle,
  Globe,
  Lock,
  MapPin,
  Instagram,
  Facebook,
  Youtube,
  ExternalLink,
  TrendingUp,
  Sparkles,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useAutoFillRunner } from '@/lib/autoFillRunner';

interface DigitalPresenceAnalysis {
  own_website: { found: boolean; url: string | null; has_ssl: boolean | null };
  google_business: { found: boolean; completeness_score: number | null; has_photos: boolean | null; has_hours: boolean | null };
  otas: { platform: string; url: string | null; found: boolean }[];
  ota_coverage_pct: number;
  social_media: { instagram: boolean; facebook: boolean; tiktok: boolean; youtube: boolean };
  social_coverage_pct: number;
  digital_maturity_score: number;
  direct_channel_estimate_pct: number | null;
  summary: string;
  recommendations: string[];
}

interface Props {
  businessName: string;
  location: string;
  onAutoFill?: (indicatorValues: Record<string, number>) => void;
  onAnalysisCapture?: (analysis: Record<string, any>) => void;
}

export function DigitalPresenceSearch({ businessName, location, onAutoFill, onAnalysisCapture }: Props) {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<DigitalPresenceAnalysis | null>(null);

  const runSearch = async () => {
    if (!businessName?.trim() || !location?.trim()) {
      toast.error('Informe o nome do estabelecimento e a localização antes de buscar.');
      return;
    }
    setLoading(true);
    setAnalysis(null);
    try {
      const { data, error } = await supabase.functions.invoke('search-digital-presence', {
        body: { businessName: businessName.trim(), location: location.trim() },
      });
      if (error) throw error;
      if (!data?.analysis) throw new Error('Sem dados retornados');

      const a: DigitalPresenceAnalysis = data.analysis;
      setAnalysis(a);

      if (onAnalysisCapture) {
        onAnalysisCapture({ ...a, businessName, location, searchedAt: new Date().toISOString() });
      }

      if (onAutoFill) {
        const values: Record<string, number> = {};
        values['ENT_TECH_SCORE'] = a.digital_maturity_score;
        if (a.direct_channel_estimate_pct != null) {
          values['ENT_CONVERSAO_DIRETA'] = a.direct_channel_estimate_pct;
        }
        onAutoFill(values);
      }

      toast.success('Presença digital analisada com sucesso');
    } catch (e: any) {
      console.error(e);
      toast.error('Erro ao analisar presença digital: ' + (e.message || 'tente novamente'));
    } finally {
      setLoading(false);
    }
  };

  useAutoFillRunner('digital-presence', runSearch);

  const renderOk = (ok: boolean) =>
    ok ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-muted-foreground/40" />;

  return (
    <div className="space-y-4">
      {(businessName?.trim() || location?.trim()) && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-muted-foreground">Buscando:</span>
          {businessName?.trim() && (
            <Badge variant="secondary" className="text-[10px] gap-1">
              <Search className="h-3 w-3" />
              {businessName.trim()}
            </Badge>
          )}
          {location?.trim() && (
            <Badge variant="outline" className="text-[10px] gap-1">
              <MapPin className="h-3 w-3" />
              {location.trim()}
            </Badge>
          )}
        </div>
      )}
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Detecta automaticamente site oficial, Google Business, OTAs (Booking, Expedia, Airbnb…) e redes sociais — preenche maturidade digital e canal direto.
        </p>
        <Button onClick={runSearch} disabled={loading || !businessName || !location} size="sm">
          {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
          {loading ? 'Analisando...' : 'Analisar Presença Digital'}
        </Button>
      </div>

      {loading && (
        <div className="p-6 text-center space-y-2">
          <Loader2 className="h-7 w-7 animate-spin mx-auto text-primary" />
          <p className="text-sm text-muted-foreground">Verificando OTAs, Google Business, site oficial e redes sociais...</p>
          <Progress value={45} className="max-w-xs mx-auto" />
        </div>
      )}

      {analysis && (
        <div className="space-y-4">
          <Separator />

          {/* Top metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-[10px] text-muted-foreground uppercase">Maturidade Digital</p>
                <p className="text-2xl font-bold">{analysis.digital_maturity_score}/5</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-[10px] text-muted-foreground uppercase">OTAs</p>
                <p className="text-2xl font-bold">{analysis.ota_coverage_pct}%</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-[10px] text-muted-foreground uppercase">Redes Sociais</p>
                <p className="text-2xl font-bold">{analysis.social_coverage_pct}%</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-[10px] text-muted-foreground uppercase">Canal Direto (est.)</p>
                <p className="text-2xl font-bold">{analysis.direct_channel_estimate_pct ?? '—'}%</p>
              </CardContent>
            </Card>
          </div>

          {/* Site & GMB */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Card>
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Globe className="h-4 w-4" /> Site Oficial
                </div>
                <div className="flex items-center gap-2 text-xs">
                  {renderOk(analysis.own_website.found)} Site detectado
                </div>
                {analysis.own_website.found && (
                  <>
                    <div className="flex items-center gap-2 text-xs">
                      {renderOk(!!analysis.own_website.has_ssl)} <Lock className="h-3 w-3" /> HTTPS / SSL
                    </div>
                    {analysis.own_website.url && (
                      <a href={analysis.own_website.url} target="_blank" rel="noreferrer" className="text-xs text-primary inline-flex items-center gap-1 hover:underline truncate">
                        <ExternalLink className="h-3 w-3" /> {analysis.own_website.url}
                      </a>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <MapPin className="h-4 w-4" /> Google Business
                </div>
                <div className="flex items-center gap-2 text-xs">
                  {renderOk(analysis.google_business.found)} Perfil detectado
                </div>
                {analysis.google_business.found && (
                  <>
                    <div className="flex items-center gap-2 text-xs">
                      {renderOk(!!analysis.google_business.has_photos)} Fotos
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      {renderOk(!!analysis.google_business.has_hours)} Horário
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* OTAs */}
          <Card>
            <CardContent className="p-3 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <TrendingUp className="h-4 w-4" /> Canais de Distribuição (OTAs)
              </div>
              <div className="flex flex-wrap gap-1.5">
                {analysis.otas.map((o) => (
                  <Badge
                    key={o.platform}
                    variant={o.found ? 'default' : 'outline'}
                    className={cn('text-[10px] gap-1', !o.found && 'opacity-50')}
                  >
                    {o.found ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                    {o.platform}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Social */}
          <Card>
            <CardContent className="p-3 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Sparkles className="h-4 w-4" /> Redes Sociais
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant={analysis.social_media.instagram ? 'default' : 'outline'} className={cn('text-[10px] gap-1', !analysis.social_media.instagram && 'opacity-50')}>
                  <Instagram className="h-3 w-3" /> Instagram
                </Badge>
                <Badge variant={analysis.social_media.facebook ? 'default' : 'outline'} className={cn('text-[10px] gap-1', !analysis.social_media.facebook && 'opacity-50')}>
                  <Facebook className="h-3 w-3" /> Facebook
                </Badge>
                <Badge variant={analysis.social_media.tiktok ? 'default' : 'outline'} className={cn('text-[10px] gap-1', !analysis.social_media.tiktok && 'opacity-50')}>
                  TikTok
                </Badge>
                <Badge variant={analysis.social_media.youtube ? 'default' : 'outline'} className={cn('text-[10px] gap-1', !analysis.social_media.youtube && 'opacity-50')}>
                  <Youtube className="h-3 w-3" /> YouTube
                </Badge>
              </div>
            </CardContent>
          </Card>

          {analysis.recommendations.length > 0 && (
            <Card className="border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/10">
              <CardContent className="p-3 space-y-1.5">
                <p className="text-xs font-medium">Recomendações</p>
                <ul className="text-xs text-muted-foreground list-disc list-inside space-y-1">
                  {analysis.recommendations.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}