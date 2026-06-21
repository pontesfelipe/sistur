import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Hotel, 
  Users, 
  Save, 
  Loader2,
  Building2,
  Star,
  DoorOpen,
  Calendar,
  CheckCircle2,
  ArrowRight,
  Search,
  Sparkles,
} from 'lucide-react';
import { useEnterpriseProfile, EnterpriseProfileInput } from '@/hooks/useEnterpriseProfiles';
import { useProfileContext } from '@/contexts/ProfileContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { BusinessReviewSearch } from './BusinessReviewSearch';
import { DigitalPresenceSearch } from './DigitalPresenceSearch';
import { DestinationContextSearch } from './DestinationContextSearch';
import { CnpjValidationSearch } from './CnpjValidationSearch';
import { PublicComplaintsSearch } from './PublicComplaintsSearch';
import { CompetitorsAutoSearch } from './CompetitorsAutoSearch';
import { SustainabilitySearch } from './SustainabilitySearch';
import { PricingPositioningSearch } from './PricingPositioningSearch';
import { LocalEventsSearch } from './LocalEventsSearch';
import { TourismSafetySearch } from './TourismSafetySearch';

interface EnterpriseProfileStepProps {
  destinationId: string;
  destinationName: string;
  onComplete: () => void;
  onBack?: () => void;
  onReviewAutoFill?: (values: Record<string, number>) => void;
}

const PROPERTY_TYPES = [
  { value: 'hotel', label: 'Hotel' },
  { value: 'resort', label: 'Resort' },
  { value: 'pousada', label: 'Pousada' },
  { value: 'hostel', label: 'Hostel' },
  { value: 'apart_hotel', label: 'Apart-Hotel' },
  { value: 'flat', label: 'Flat' },
  { value: 'camping', label: 'Camping/Glamping' },
];

const SEASONALITY_OPTIONS = [
  { value: 'alta', label: 'Alta (predominantemente alta temporada)' },
  { value: 'media', label: 'Média (equilibrado)' },
  { value: 'baixa', label: 'Baixa (predominantemente baixa temporada)' },
  { value: 'uniforme', label: 'Uniforme (sem sazonalidade)' },
];

const TARGET_MARKETS = [
  { value: 'corporativo', label: 'Corporativo' },
  { value: 'lazer', label: 'Lazer' },
  { value: 'familia', label: 'Família' },
  { value: 'eventos', label: 'Eventos' },
  { value: 'eco', label: 'Ecoturismo' },
];

export function EnterpriseProfileStep({ destinationId, destinationName, onComplete, onBack, onReviewAutoFill }: EnterpriseProfileStepProps) {
  const [reviewAutoFilled, setReviewAutoFilled] = useState(false);
  const [reviewAnalysisData, setReviewAnalysisData] = useState<Record<string, any> | null>(null);
  const [digitalAnalysisData, setDigitalAnalysisData] = useState<Record<string, any> | null>(null);
  const [digitalAutoFilled, setDigitalAutoFilled] = useState(false);
  const [contextAnalysisData, setContextAnalysisData] = useState<Record<string, any> | null>(null);
  const [contextAutoFilled, setContextAutoFilled] = useState(false);
  const [complaintsAnalysisData, setComplaintsAnalysisData] = useState<Record<string, any> | null>(null);
  const [complaintsAutoFilled, setComplaintsAutoFilled] = useState(false);
  const [cnpjData, setCnpjData] = useState<Record<string, any> | null>(null);
  const [cnpjValue, setCnpjValue] = useState<string | null>(null);
  const [competitorsCount, setCompetitorsCount] = useState<number | null>(null);
  const [sustainabilityData, setSustainabilityData] = useState<Record<string, any> | null>(null);
  const [sustainabilityAutoFilled, setSustainabilityAutoFilled] = useState(false);
  const [pricingData, setPricingData] = useState<Record<string, any> | null>(null);
  const [pricingAutoFilled, setPricingAutoFilled] = useState(false);
  const [eventsData, setEventsData] = useState<Record<string, any> | null>(null);
  const [eventsAutoFilled, setEventsAutoFilled] = useState(false);
  const [safetyData, setSafetyData] = useState<Record<string, any> | null>(null);
  const [safetyAutoFilled, setSafetyAutoFilled] = useState(false);

  const handleReviewAutoFill = (values: Record<string, number>) => {
    setReviewAutoFilled(true);
    onReviewAutoFill?.(values);
  };

  const handleProfileAutoFill = (metadata: { star_rating: number | null; property_type: string | null; room_count: number | null; employee_count: number | null }) => {
    setFormData(prev => {
      const updates: Partial<EnterpriseProfileInput> = {};
      if (metadata.star_rating != null) updates.star_rating = metadata.star_rating;
      if (metadata.property_type) updates.property_type = metadata.property_type;
      if (metadata.room_count != null) updates.room_count = metadata.room_count;
      if (metadata.employee_count != null) updates.employee_count = metadata.employee_count;
      return { ...prev, ...updates };
    });
    setReviewAutoFilled(true);
    toast.success('Perfil do empreendimento preenchido com dados dos reviews');
  };

  const handleReviewAnalysisCapture = (fullAnalysis: Record<string, any>) => {
    setReviewAnalysisData(fullAnalysis);
  };

  const handleDigitalAutoFill = (values: Record<string, number>) => {
    setDigitalAutoFilled(true);
    onReviewAutoFill?.(values);
  };

  const handleDigitalAnalysisCapture = (fullAnalysis: Record<string, any>) => {
    setDigitalAnalysisData(fullAnalysis);
  };

  const handleContextAutoFill = (values: Record<string, number>) => {
    setContextAutoFilled(true);
    onReviewAutoFill?.(values);
  };
  const handleContextCapture = (a: Record<string, any>) => setContextAnalysisData(a);

  const handleComplaintsAutoFill = (values: Record<string, number>) => {
    setComplaintsAutoFilled(true);
    onReviewAutoFill?.(values);
  };
  const handleComplaintsCapture = (a: Record<string, any>) => setComplaintsAnalysisData(a);

  const handleSustainabilityAutoFill = (values: Record<string, number>) => {
    setSustainabilityAutoFilled(true);
    onReviewAutoFill?.(values);
  };
  const handleSustainabilityCapture = (a: Record<string, any>) => setSustainabilityData(a);

  const handlePricingAutoFill = (values: Record<string, number>) => {
    setPricingAutoFilled(true);
    onReviewAutoFill?.(values);
  };
  const handlePricingCapture = (a: Record<string, any>) => setPricingData(a);

  const handleEventsAutoFill = (values: Record<string, number>) => {
    setEventsAutoFilled(true);
    onReviewAutoFill?.(values);
  };
  const handleEventsCapture = (a: Record<string, any>) => setEventsData(a);
  const handleSeasonalitySuggestion = (pattern: string, _peakMonths: number[]) => {
    setFormData((prev) => (prev.seasonality ? prev : { ...prev, seasonality: pattern }));
  };

  const handleSafetyAutoFill = (values: Record<string, number>) => {
    setSafetyAutoFilled(true);
    onReviewAutoFill?.(values);
  };
  const handleSafetyCapture = (a: Record<string, any>) => setSafetyData(a);

  const handleCnpjValidated = ({ cnpj, record, yearsInOperation }: { cnpj: string; record: any; yearsInOperation: number | null }) => {
    setCnpjValue(cnpj);
    setCnpjData(record);
    setFormData((prev) => ({
      ...prev,
      ...(yearsInOperation != null ? { years_in_operation: yearsInOperation } : {}),
    }));
    toast.success('Dados cadastrais aplicados ao perfil');
  };
  const { profile, effectiveOrgId } = useProfileContext();
  const { profile: existingProfile, isLoading } = useEnterpriseProfile(destinationId);
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState<Partial<EnterpriseProfileInput>>({
    property_type: 'hotel',
    star_rating: null,
    room_count: null,
    employee_count: null,
    seasonality: null,
    target_market: [],
    average_occupancy_rate: null,
  });

  // Load existing profile data
  useEffect(() => {
    if (existingProfile) {
      setFormData({
        property_type: existingProfile.property_type,
        star_rating: existingProfile.star_rating,
        room_count: existingProfile.room_count,
        employee_count: existingProfile.employee_count,
        seasonality: existingProfile.seasonality,
        target_market: existingProfile.target_market || [],
        average_occupancy_rate: existingProfile.average_occupancy_rate,
      });
      const ep = existingProfile as any;
      if (ep.cnpj) setCnpjValue(ep.cnpj);
      if (ep.cnpj_data) setCnpjData(ep.cnpj_data);
      if (ep.context_analysis) setContextAnalysisData(ep.context_analysis);
      if (ep.complaints_analysis) setComplaintsAnalysisData(ep.complaints_analysis);
      if (ep.digital_presence_analysis) setDigitalAnalysisData(ep.digital_presence_analysis);
      if (ep.sustainability_analysis) setSustainabilityData(ep.sustainability_analysis);
      if (ep.pricing_analysis) setPricingData(ep.pricing_analysis);
      if (ep.events_analysis) setEventsData(ep.events_analysis);
      if (ep.safety_analysis) setSafetyData(ep.safety_analysis);
    }
  }, [existingProfile]);

  const saveProfile = useMutation({
    mutationFn: async () => {
      if (!effectiveOrgId) throw new Error('Organização não encontrada');
      
      const payload = {
        ...formData,
        destination_id: destinationId,
        org_id: effectiveOrgId,
        review_analysis: reviewAnalysisData,
        digital_presence_analysis: digitalAnalysisData,
        context_analysis: contextAnalysisData,
        complaints_analysis: complaintsAnalysisData,
        cnpj: cnpjValue,
        cnpj_data: cnpjData,
        sustainability_analysis: sustainabilityData,
        pricing_analysis: pricingData,
        events_analysis: eventsData,
        safety_analysis: safetyData,
      };
      
      const { data, error } = await supabase
        .from('enterprise_profiles')
        .upsert(payload, { onConflict: 'destination_id' })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enterprise-profile', destinationId] });
      queryClient.invalidateQueries({ queryKey: ['enterprise-profiles'] });
      toast.success('Perfil do empreendimento salvo');
      onComplete();
    },
    onError: (error) => {
      console.error('Error saving profile:', error);
      toast.error('Erro ao salvar perfil');
    }
  });

  const handleNumberChange = (field: keyof EnterpriseProfileInput, value: string) => {
    const parsed = value === '' ? null : parseFloat(value);
    setFormData(prev => ({ ...prev, [field]: parsed }));
  };

  const toggleMarket = (value: string) => {
    setFormData(prev => {
      const currentArray = prev.target_market || [];
      const newArray = currentArray.includes(value)
        ? currentArray.filter(item => item !== value)
        : [...currentArray, value];
      return { ...prev, target_market: newArray };
    });
  };

  const isMinimallyComplete = formData.property_type && formData.room_count;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Carregando perfil...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1) Pré-preenchimento Automático via IA (ACIMA do perfil) */}
      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/5">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Search className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-lg flex items-center gap-2">
                Pré-preenchimento Automático
                <Badge variant="secondary" className="text-[10px]">
                  <Sparkles className="h-3 w-3 mr-1" />
                  IA
                </Badge>
              </CardTitle>
              <CardDescription>
                Busque reviews online do seu estabelecimento para preencher automaticamente o perfil e os indicadores de reputação
              </CardDescription>
            </div>
            {reviewAutoFilled && (
              <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Preenchido
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <BusinessReviewSearch
            onAutoFill={handleReviewAutoFill}
            onProfileAutoFill={handleProfileAutoFill}
            onAnalysisCapture={handleReviewAnalysisCapture}
            defaultLocation={destinationName}
            compact
          />
        </CardContent>
      </Card>

      {/* 1.5) Presença Digital Automática */}
      <Card className="border-blue-500/30 bg-gradient-to-br from-blue-50/50 to-cyan-50/30 dark:from-blue-950/20 dark:to-cyan-950/10">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Search className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-lg flex items-center gap-2">
                Presença Digital Automática
                <Badge variant="secondary" className="text-[10px]">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Auto
                </Badge>
              </CardTitle>
              <CardDescription>
                Detecta site oficial, Google Business, OTAs e redes sociais — preenche maturidade digital e canal direto
              </CardDescription>
            </div>
            {digitalAutoFilled && (
              <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Preenchido
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <DigitalPresenceSearch
            businessName={destinationName}
            location={destinationName}
            onAutoFill={handleDigitalAutoFill}
            onAnalysisCapture={handleDigitalAnalysisCapture}
          />
        </CardContent>
      </Card>

      {/* 1.6) Contexto & Conectividade do Destino */}
      <Card className="border-emerald-500/30 bg-gradient-to-br from-emerald-50/50 to-teal-50/30 dark:from-emerald-950/20 dark:to-teal-950/10">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <Search className="h-5 w-5 text-emerald-600" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-lg flex items-center gap-2">
                Contexto & Conectividade do Destino
                <Badge variant="secondary" className="text-[10px]"><Sparkles className="h-3 w-3 mr-1" />Auto</Badge>
              </CardTitle>
              <CardDescription>ANAC, ANATEL, eventos, Mapa do Turismo e contexto socioeconômico do município</CardDescription>
            </div>
            {contextAutoFilled && (
              <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30">
                <CheckCircle2 className="h-3 w-3 mr-1" />Preenchido
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <DestinationContextSearch
            destinationId={destinationId}
            onAutoFill={handleContextAutoFill}
            onAnalysisCapture={handleContextCapture}
          />
        </CardContent>
      </Card>

      {/* 1.7) Validação CNPJ */}
      <Card className="border-purple-500/30 bg-gradient-to-br from-purple-50/50 to-fuchsia-50/30 dark:from-purple-950/20 dark:to-fuchsia-950/10">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <Building2 className="h-5 w-5 text-purple-600" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-lg flex items-center gap-2">
                Validação CNPJ & Dados Cadastrais
                <Badge variant="secondary" className="text-[10px]"><Sparkles className="h-3 w-3 mr-1" />Auto</Badge>
              </CardTitle>
              <CardDescription>Receita Federal: razão social, CNAE, situação cadastral e anos de operação</CardDescription>
            </div>
            {cnpjData && (
              <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30">
                <CheckCircle2 className="h-3 w-3 mr-1" />Validado
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <CnpjValidationSearch initialCnpj={cnpjValue} onValidated={handleCnpjValidated} />
        </CardContent>
      </Card>

      {/* 1.8) Reclamações Públicas */}
      <Card className="border-rose-500/30 bg-gradient-to-br from-rose-50/50 to-orange-50/30 dark:from-rose-950/20 dark:to-orange-950/10">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-rose-500/10">
              <Search className="h-5 w-5 text-rose-600" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-lg flex items-center gap-2">
                Reclamações Públicas
                <Badge variant="secondary" className="text-[10px]"><Sparkles className="h-3 w-3 mr-1" />Auto</Badge>
              </CardTitle>
              <CardDescription>Reclame Aqui e Procon — reputação pública e taxa de solução</CardDescription>
            </div>
            {complaintsAutoFilled && (
              <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30">
                <CheckCircle2 className="h-3 w-3 mr-1" />Preenchido
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <PublicComplaintsSearch
            businessName={destinationName}
            location={destinationName}
            onAutoFill={handleComplaintsAutoFill}
            onAnalysisCapture={handleComplaintsCapture}
          />
        </CardContent>
      </Card>

      {/* 1.9) Concorrentes Automáticos */}
      <Card className="border-indigo-500/30 bg-gradient-to-br from-indigo-50/50 to-blue-50/30 dark:from-indigo-950/20 dark:to-blue-950/10">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-500/10">
              <Search className="h-5 w-5 text-indigo-600" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-lg flex items-center gap-2">
                Concorrentes Automáticos
                <Badge variant="secondary" className="text-[10px]"><Sparkles className="h-3 w-3 mr-1" />Auto</Badge>
              </CardTitle>
              <CardDescription>Benchmark competitivo via Booking, TripAdvisor e Google</CardDescription>
            </div>
            {competitorsCount != null && (
              <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30">
                <CheckCircle2 className="h-3 w-3 mr-1" />{competitorsCount} encontrados
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <CompetitorsAutoSearch
            destinationId={destinationId}
            businessName={destinationName}
            location={destinationName}
            propertyType={formData.property_type}
            onCaptured={setCompetitorsCount}
          />
        </CardContent>
      </Card>

      {/* 2) Perfil do Empreendimento (ABAIXO do pré-preenchimento) */}
      {/* 1.10) Sustentabilidade & ESG */}
      <Card className="border-green-500/30 bg-gradient-to-br from-green-50/50 to-emerald-50/30 dark:from-green-950/20 dark:to-emerald-950/10">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <Sparkles className="h-5 w-5 text-green-600" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-lg flex items-center gap-2">
                Sustentabilidade & Acessibilidade
                <Badge variant="secondary" className="text-[10px]"><Sparkles className="h-3 w-3 mr-1" />Auto</Badge>
              </CardTitle>
              <CardDescription>Certificações ESG, práticas sustentáveis e acessibilidade detectadas no site e em fontes públicas</CardDescription>
            </div>
            {sustainabilityAutoFilled && (
              <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30">
                <CheckCircle2 className="h-3 w-3 mr-1" />Preenchido
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <SustainabilitySearch
            businessName={destinationName}
            location={destinationName}
            onAutoFill={handleSustainabilityAutoFill}
            onAnalysisCapture={handleSustainabilityCapture}
          />
        </CardContent>
      </Card>

      {/* 1.11) Posicionamento de Preço */}
      <Card className="border-yellow-500/30 bg-gradient-to-br from-yellow-50/50 to-amber-50/30 dark:from-yellow-950/20 dark:to-amber-950/10">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-500/10">
              <Sparkles className="h-5 w-5 text-yellow-600" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-lg flex items-center gap-2">
                Posicionamento de Preço (ADR)
                <Badge variant="secondary" className="text-[10px]"><Sparkles className="h-3 w-3 mr-1" />Auto</Badge>
              </CardTitle>
              <CardDescription>Diária média estimada vs mercado a partir de OTAs públicas (Booking, Google, Hoteis.com)</CardDescription>
            </div>
            {pricingAutoFilled && (
              <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30">
                <CheckCircle2 className="h-3 w-3 mr-1" />Preenchido
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <PricingPositioningSearch
            businessName={destinationName}
            location={destinationName}
            onAutoFill={handlePricingAutoFill}
            onAnalysisCapture={handlePricingCapture}
          />
        </CardContent>
      </Card>

      {/* 1.12) Eventos & Sazonalidade Local */}
      <Card className="border-cyan-500/30 bg-gradient-to-br from-cyan-50/50 to-sky-50/30 dark:from-cyan-950/20 dark:to-sky-950/10">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/10">
              <Calendar className="h-5 w-5 text-cyan-600" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-lg flex items-center gap-2">
                Eventos & Sazonalidade Local
                <Badge variant="secondary" className="text-[10px]"><Sparkles className="h-3 w-3 mr-1" />Auto</Badge>
              </CardTitle>
              <CardDescription>Calendário de eventos públicos e observatório — detecta meses de pico e padrão sazonal</CardDescription>
            </div>
            {eventsAutoFilled && (
              <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30">
                <CheckCircle2 className="h-3 w-3 mr-1" />Preenchido
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <LocalEventsSearch
            destinationId={destinationId}
            onAutoFill={handleEventsAutoFill}
            onAnalysisCapture={handleEventsCapture}
            onSeasonalitySuggestion={handleSeasonalitySuggestion}
          />
        </CardContent>
      </Card>

      {/* 1.13) Segurança Turística */}
      <Card className="border-red-500/30 bg-gradient-to-br from-red-50/50 to-rose-50/30 dark:from-red-950/20 dark:to-rose-950/10">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/10">
              <Search className="h-5 w-5 text-red-600" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-lg flex items-center gap-2">
                Segurança Turística
                <Badge variant="secondary" className="text-[10px]"><Sparkles className="h-3 w-3 mr-1" />Auto</Badge>
              </CardTitle>
              <CardDescription>Sinais públicos de segurança: notícias, presença de polícia turística e alertas ativos</CardDescription>
            </div>
            {safetyAutoFilled && (
              <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30">
                <CheckCircle2 className="h-3 w-3 mr-1" />Preenchido
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <TourismSafetySearch
            destinationName={destinationName}
            onAutoFill={handleSafetyAutoFill}
            onAnalysisCapture={handleSafetyCapture}
          />
        </CardContent>
      </Card>

      <Card className="border-amber-500/30 bg-gradient-to-br from-amber-50/50 to-orange-50/30 dark:from-amber-950/20 dark:to-orange-950/10">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <Hotel className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <CardTitle className="text-lg">Perfil do Empreendimento</CardTitle>
              <CardDescription>{destinationName}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-sm text-muted-foreground">
            Essas informações contextualizam o diagnóstico e permitem benchmarks mais precisos para o seu tipo de empreendimento.
            {reviewAutoFilled && (
              <span className="text-primary font-medium ml-1">
                Alguns campos foram preenchidos automaticamente pela busca de reviews.
              </span>
            )}
          </p>
          
          {/* Tipo e Porte */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="property_type">
                Tipo de Empreendimento <span className="text-destructive">*</span>
              </Label>
              <Select 
                value={formData.property_type} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, property_type: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {PROPERTY_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="star_rating">Categoria (Estrelas)</Label>
              <Select 
                value={formData.star_rating?.toString() || ''} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, star_rating: value ? parseInt(value) : null }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map(rating => (
                    <SelectItem key={rating} value={rating.toString()}>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: rating }).map((_, i) => (
                          <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
                        ))}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Porte */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="room_count">
                <DoorOpen className="h-4 w-4 inline mr-1" />
                Nº de UHs <span className="text-destructive">*</span>
              </Label>
              <Input
                id="room_count"
                type="number"
                placeholder="Ex: 120"
                value={formData.room_count ?? ''}
                onChange={(e) => handleNumberChange('room_count', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="employee_count">
                <Users className="h-4 w-4 inline mr-1" />
                Nº de Funcionários
              </Label>
              <Input
                id="employee_count"
                type="number"
                placeholder="Ex: 80"
                value={formData.employee_count ?? ''}
                onChange={(e) => handleNumberChange('employee_count', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="average_occupancy_rate">
                Taxa de Ocupação Média (%)
              </Label>
              <Input
                id="average_occupancy_rate"
                type="number"
                min="0"
                max="100"
                step="0.1"
                placeholder="Ex: 65"
                value={formData.average_occupancy_rate ?? ''}
                onChange={(e) => handleNumberChange('average_occupancy_rate', e.target.value)}
              />
            </div>
          </div>

          {/* Operação */}
          <div className="space-y-2">
            <Label htmlFor="seasonality">
              <Calendar className="h-4 w-4 inline mr-1" />
              Sazonalidade
            </Label>
            <Select 
              value={formData.seasonality || ''} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, seasonality: value || null }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {SEASONALITY_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Mercado Alvo */}
          <div className="space-y-2">
            <Label>Mercado Alvo (selecione todos que se aplicam)</Label>
            <div className="flex flex-wrap gap-2">
              {TARGET_MARKETS.map(market => (
                <Badge
                  key={market.value}
                  variant={formData.target_market?.includes(market.value) ? "default" : "outline"}
                  className={cn(
                    "cursor-pointer transition-colors",
                    formData.target_market?.includes(market.value) && "bg-amber-500 hover:bg-amber-600"
                  )}
                  onClick={() => toggleMarket(market.value)}
                >
                  {market.label}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {isMinimallyComplete ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Perfil mínimo preenchido. Você pode adicionar mais detalhes depois.
                </>
              ) : (
                <>
                  <Building2 className="h-4 w-4 text-amber-500" />
                  Preencha ao menos o tipo e número de UHs para continuar.
                </>
              )}
            </div>
            <div className="flex items-center justify-between">
              {onBack && (
                <Button variant="outline" onClick={onBack}>
                  Voltar
                </Button>
              )}
              <div className="flex gap-3 ml-auto">
                <Button 
                  variant="outline"
                  onClick={onComplete}
                  disabled={saveProfile.isPending}
                >
                  Pular
                </Button>
                <Button 
                  onClick={() => saveProfile.mutate()} 
                  disabled={saveProfile.isPending || !isMinimallyComplete}
                >
                  {saveProfile.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <ArrowRight className="h-4 w-4 mr-2" />
                  )}
                  Salvar e Continuar
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
