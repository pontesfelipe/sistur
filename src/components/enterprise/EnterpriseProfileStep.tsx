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
import { ClimateComfortSearch } from './ClimateComfortSearch';
import { LocalTransportSearch } from './LocalTransportSearch';
import { BrandStrengthSearch } from './BrandStrengthSearch';
import { DemandTrendsSearch } from './DemandTrendsSearch';
import { ConsolidatedReputationSearch } from './ConsolidatedReputationSearch';
import { SocialMediaSearch } from './SocialMediaSearch';
import { AirConnectivitySearch } from './AirConnectivitySearch';
import { TariffSeasonalitySearch } from './TariffSeasonalitySearch';
import { TelecomCoverageSearch } from './TelecomCoverageSearch';
import { UrbanAccessibilitySearch } from './UrbanAccessibilitySearch';
import { HealthInfrastructureSearch } from './HealthInfrastructureSearch';
import {
  runAllAutoFills,
  runOneAutoFill,
  setAutoFillMeta,
  useAutoFillStatuses,
  hydrateAutoFillState,
  getAutoFillSnapshot,
  resetAutoFillState,
  type AutoFillEntry,
} from '@/lib/autoFillRunner';
import { Play, RefreshCw, AlertCircle, Info } from 'lucide-react';
import { EnterpriseOnboardingTour } from './EnterpriseOnboardingTour';
import { BookOpen } from 'lucide-react';

interface EnterpriseProfileStepProps {
  destinationId: string;
  destinationName: string;
  onComplete: () => void;
  onBack?: () => void;
  onReviewAutoFill?: (values: Record<string, number>) => void;
  /**
   * ID da rodada/assessment atual. Usado para isolar o `autofill_run_state`
   * por diagnóstico: o `enterprise_profiles` é único por destino, então sem
   * esse escopo o estado verde dos blocos vazaria de uma rodada anterior para
   * uma nova rodada do mesmo destino.
   */
  assessmentId?: string | null;
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

export function EnterpriseProfileStep({ destinationId, destinationName, onComplete, onBack, onReviewAutoFill, assessmentId }: EnterpriseProfileStepProps) {
  const [tourOpen, setTourOpen] = useState(false);
  // Fase 12.3 — auto-abre o tour na primeira visita ao Step Enterprise
  useEffect(() => {
    if (typeof window === 'undefined' || !destinationId) return;
    if (!localStorage.getItem('sistur:enterprise:tour-seen-v1')) {
      const t = setTimeout(() => setTourOpen(true), 600);
      return () => clearTimeout(t);
    }
  }, [destinationId]);
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
  const [climateData, setClimateData] = useState<Record<string, any> | null>(null);
  const [climateAutoFilled, setClimateAutoFilled] = useState(false);
  const [transportData, setTransportData] = useState<Record<string, any> | null>(null);
  const [transportAutoFilled, setTransportAutoFilled] = useState(false);
  const [brandData, setBrandData] = useState<Record<string, any> | null>(null);
  const [brandAutoFilled, setBrandAutoFilled] = useState(false);
  const [demandData, setDemandData] = useState<Record<string, any> | null>(null);
  const [demandAutoFilled, setDemandAutoFilled] = useState(false);
  const [reputationData, setReputationData] = useState<Record<string, any> | null>(null);
  const [reputationAutoFilled, setReputationAutoFilled] = useState(false);
  const [socialData, setSocialData] = useState<Record<string, any> | null>(null);
  const [socialAutoFilled, setSocialAutoFilled] = useState(false);
  const [airConnData, setAirConnData] = useState<Record<string, any> | null>(null);
  const [airConnAutoFilled, setAirConnAutoFilled] = useState(false);
  const [tariffSeasonalityData, setTariffSeasonalityData] = useState<Record<string, any> | null>(null);
  const [tariffSeasonalityAutoFilled, setTariffSeasonalityAutoFilled] = useState(false);
  const [telecomData, setTelecomData] = useState<Record<string, any> | null>(null);
  const [telecomAutoFilled, setTelecomAutoFilled] = useState(false);
  const [accessibilityData, setAccessibilityData] = useState<Record<string, any> | null>(null);
  const [accessibilityAutoFilled, setAccessibilityAutoFilled] = useState(false);
  const [healthData, setHealthData] = useState<Record<string, any> | null>(null);
  const [healthAutoFilled, setHealthAutoFilled] = useState(false);

  // Nome do empreendimento — fonte única alimentada pelo bloco Reviews e
  // propagada para todos os demais blocos que dependem da identidade do
  // estabelecimento (presença digital, reclamações, sustentabilidade, preço,
  // marca, demanda, reputação OTAs, redes sociais e concorrentes).
  const [enterpriseName, setEnterpriseName] = useState<string>('');
  const businessQuery = (enterpriseName || '').trim();
  const hasBusinessName = businessQuery.length > 0;

  // "Rodar todos": orquestra os blocos auto registrados via useAutoFillRunner
  const [runAllLoading, setRunAllLoading] = useState(false);
  const [runAllProgress, setRunAllProgress] = useState<{ id: string; index: number; total: number } | null>(null);

  // Friendly labels + data source per block id. Registered once on mount so the
  // global registry can render meaningful badges/toasts without coupling each
  // search component to the orchestrator.
  const BLOCK_META: Record<string, { label: string; source: string }> = {
    reviews: { label: 'Reviews', source: 'Booking + TripAdvisor + Google' },
    digital: { label: 'Presença Digital', source: 'Google + OTAs + redes sociais' },
    context: { label: 'Contexto Municipal', source: 'IBGE + ANAC + ANATEL + Mapa do Turismo' },
    complaints: { label: 'Reclamações Públicas', source: 'Reclame Aqui + Procon' },
    competitors: { label: 'Concorrentes', source: 'Booking + TripAdvisor + Google' },
    sustainability: { label: 'Sustentabilidade & ESG', source: 'Site oficial + certificadoras' },
    pricing: { label: 'Preço & Posicionamento', source: 'OTAs + metabuscadores' },
    events: { label: 'Eventos Locais', source: 'Sympla + Eventbrite + agendas municipais' },
    safety: { label: 'Segurança Turística', source: 'SSP + notícias regionais' },
    climate: { label: 'Clima & Conforto', source: 'INMET + dados históricos' },
    transport: { label: 'Transporte Urbano', source: 'GTFS + ANTT + prefeituras' },
    brand: { label: 'Força da Marca', source: 'Pesquisa web + menções' },
    demand: { label: 'Demanda & Trends', source: 'Google Trends + buscas sazonais' },
    reputation: { label: 'Reputação Consolidada OTAs', source: 'Booking + Expedia + TripAdvisor' },
    social: { label: 'Redes Sociais', source: 'Instagram + Facebook + TikTok' },
    air: { label: 'Conectividade Aérea', source: 'ANAC (anac_air_connectivity)' },
    tariff: { label: 'Sazonalidade Tarifária', source: 'Derivado: demanda + eventos + ADR' },
    telecom: { label: 'Conectividade Telecom', source: 'Anatel (anatel_coverage_cache)' },
    accessibility: { label: 'Acessibilidade Urbana', source: 'Busca pública na web (5 dimensões)' },
    health: { label: 'Infra. de Saúde do Entorno', source: 'DATASUS/CNES (datasus_health_cache)' },
  };
  useEffect(() => {
    Object.entries(BLOCK_META).forEach(([id, m]) => setAutoFillMeta(id, m));
    // BLOCK_META is a stable object literal, fine to ignore deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Subscribe to per-block status (running / success / error)
  const statuses = useAutoFillStatuses();
  const statusById = new Map(statuses.map((s) => [s.id, s]));

  const blockToast = ({ label, status, error }: { label: string; status: 'success' | 'error' | 'no_data'; error?: string }) => {
    if (status === 'success') {
      toast.success(`✓ ${label}`);
    } else if (status === 'no_data') {
      toast.warning(`ⓘ ${label}: sem informações disponíveis${error ? ` — ${error}` : ''}`);
    } else {
      toast.error(`✗ ${label}${error ? `: ${error}` : ''}`);
    }
  };

  const handleRunAll = async () => {
    if (runAllLoading) return;
    setRunAllLoading(true);
    setRunAllProgress(null);
    toast.info('Iniciando preenchimento automático...');
    let okCount = 0;
    let failCount = 0;
    let noDataCount = 0;
    try {
      await runAllAutoFills({
        delayMs: 800,
        onProgress: (info) => setRunAllProgress(info),
        onBlockComplete: (info) => {
          blockToast(info);
          if (info.status === 'success') okCount++;
          else if (info.status === 'no_data') noDataCount++;
          else failCount++;
        },
      });
      if (failCount === 0 && noDataCount === 0) {
        toast.success(`Todos os ${okCount} blocos foram executados com sucesso`);
      } else if (failCount === 0) {
        toast.info(`${okCount} OK • ${noDataCount} sem informações disponíveis`);
      } else {
        toast.warning(`${okCount} OK • ${noDataCount} sem dados • ${failCount} falharam — use "Tentar novamente"`);
      }
      persistRunState();
    } catch (e: any) {
      console.error(e);
      toast.error('Falha ao executar blocos: ' + (e?.message || 'erro desconhecido'));
    } finally {
      setRunAllLoading(false);
      setRunAllProgress(null);
    }
  };

  const handleRetryOne = async (id: string) => {
    const label = BLOCK_META[id]?.label ?? id;
    toast.info(`Reexecutando ${label}...`);
    const result = await runOneAutoFill(id, { onComplete: blockToast });
    if ('status' in result && result.status === 'missing') {
      toast.error(`Bloco "${label}" não está registrado (verifique se a etapa foi montada)`);
    }
    persistRunState();
  };

  // Persist run state to enterprise_profiles.autofill_run_state (best-effort)
  const persistRunState = async () => {
    try {
      if (!effectiveOrgId) return;
      const snapshot = getAutoFillSnapshot();
      // Escopa o snapshot por assessmentId quando disponível, mantendo
      // compatibilidade com o formato antigo (array puro) caso não haja id.
      let payload: any = snapshot;
      if (assessmentId) {
        const { data: current } = await supabase
          .from('enterprise_profiles')
          .select('autofill_run_state')
          .eq('destination_id', destinationId)
          .maybeSingle();
        const existing = (current?.autofill_run_state ?? null) as any;
        const byAssessment =
          existing && !Array.isArray(existing) && typeof existing === 'object' && existing.byAssessment
            ? { ...existing.byAssessment }
            : {};
        byAssessment[assessmentId] = snapshot;
        payload = { byAssessment };
      }
      await supabase
        .from('enterprise_profiles')
        .update({ autofill_run_state: payload as any } as any)
        .eq('destination_id', destinationId);
    } catch (e) {
      console.warn('[autoFillRunner] failed to persist run state', e);
    }
  };

  // Auto-cascade: assim que a busca de Reviews concluir (usuário digitou o nome do hotel ali),
  // dispara automaticamente todos os demais blocos uma única vez.
  const [autoCascadeTriggered, setAutoCascadeTriggered] = useState(false);
  useEffect(() => {
    if (reviewAutoFilled && !autoCascadeTriggered && !runAllLoading) {
      setAutoCascadeTriggered(true);
      handleRunAll();
    }
  }, [reviewAutoFilled, autoCascadeTriggered, runAllLoading]);

  // Resumo de progresso dos blocos automáticos (Step 4)
  const autoFillFlags = [
    { key: 'reviews', label: 'Reviews', done: reviewAutoFilled },
    { key: 'digital', label: 'Presença Digital', done: digitalAutoFilled },
    { key: 'context', label: 'Contexto Municipal', done: contextAutoFilled },
    { key: 'cnpj', label: 'CNPJ', done: !!cnpjData },
    { key: 'complaints', label: 'Reclamações', done: complaintsAutoFilled },
    { key: 'competitors', label: 'Concorrentes', done: (competitorsCount ?? 0) > 0 },
    { key: 'sustainability', label: 'Sustentabilidade', done: sustainabilityAutoFilled },
    { key: 'pricing', label: 'Preço/Posicionamento', done: pricingAutoFilled },
    { key: 'events', label: 'Eventos Locais', done: eventsAutoFilled },
    { key: 'safety', label: 'Segurança', done: safetyAutoFilled },
    { key: 'climate', label: 'Clima/Conforto', done: climateAutoFilled },
    { key: 'transport', label: 'Transporte', done: transportAutoFilled },
    { key: 'brand', label: 'Força da Marca', done: brandAutoFilled },
    { key: 'demand', label: 'Demanda/Trends', done: demandAutoFilled },
    { key: 'reputation', label: 'Reputação OTAs', done: reputationAutoFilled },
    { key: 'social', label: 'Redes Sociais', done: socialAutoFilled },
    { key: 'air', label: 'Conectividade Aérea', done: airConnAutoFilled },
    { key: 'tariff', label: 'Sazonalidade Tarifária', done: tariffSeasonalityAutoFilled },
    { key: 'telecom', label: 'Telecom', done: telecomAutoFilled },
    { key: 'accessibility', label: 'Acessibilidade', done: accessibilityAutoFilled },
    { key: 'health', label: 'Saúde do Entorno', done: healthAutoFilled },
  ];
  const autoFillDone = autoFillFlags.filter((b) => b.done).length;
  const autoFillTotal = autoFillFlags.length;
  const autoFillPct = Math.round((autoFillDone / autoFillTotal) * 100);

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

  const handleClimateAutoFill = (v: Record<string, number>) => { setClimateAutoFilled(true); onReviewAutoFill?.(v); };
  const handleClimateCapture = (a: Record<string, any>) => setClimateData(a);

  const handleTransportAutoFill = (v: Record<string, number>) => { setTransportAutoFilled(true); onReviewAutoFill?.(v); };
  const handleTransportCapture = (a: Record<string, any>) => setTransportData(a);

  const handleBrandAutoFill = (v: Record<string, number>) => { setBrandAutoFilled(true); onReviewAutoFill?.(v); };
  const handleBrandCapture = (a: Record<string, any>) => setBrandData(a);

  const handleDemandAutoFill = (v: Record<string, number>) => { setDemandAutoFilled(true); onReviewAutoFill?.(v); };
  const handleDemandCapture = (a: Record<string, any>) => setDemandData(a);

  const handleReputationAutoFill = (v: Record<string, number>) => { setReputationAutoFilled(true); onReviewAutoFill?.(v); };
  const handleReputationCapture = (a: Record<string, any>) => setReputationData(a);

  const handleSocialAutoFill = (v: Record<string, number>) => { setSocialAutoFilled(true); onReviewAutoFill?.(v); };
  const handleSocialCapture = (a: Record<string, any>) => setSocialData(a);

  const handleAirConnAutoFill = (v: Record<string, number>) => { setAirConnAutoFilled(true); onReviewAutoFill?.(v); };
  const handleAirConnCapture = (a: Record<string, any>) => setAirConnData(a);

  const handleTariffSeasonalityAutoFill = (v: Record<string, number>) => { setTariffSeasonalityAutoFilled(true); onReviewAutoFill?.(v); };
  const handleTariffSeasonalityCapture = (a: Record<string, any>) => setTariffSeasonalityData(a);

  const handleTelecomAutoFill = (v: Record<string, number>) => { setTelecomAutoFilled(true); onReviewAutoFill?.(v); };
  const handleTelecomCapture = (a: Record<string, any>) => setTelecomData(a);

  const handleAccessibilityAutoFill = (v: Record<string, number>) => { setAccessibilityAutoFilled(true); onReviewAutoFill?.(v); };
  const handleAccessibilityCapture = (a: Record<string, any>) => setAccessibilityData(a);

  const handleHealthAutoFill = (v: Record<string, number>) => { setHealthAutoFilled(true); onReviewAutoFill?.(v); };
  const handleHealthCapture = (a: Record<string, any>) => setHealthData(a);

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
      if (ep.climate_analysis) setClimateData(ep.climate_analysis);
      if (ep.transport_analysis) setTransportData(ep.transport_analysis);
      if (ep.brand_strength_analysis) setBrandData(ep.brand_strength_analysis);
      if (ep.demand_trends_analysis) setDemandData(ep.demand_trends_analysis);
      if (ep.consolidated_reputation_analysis) setReputationData(ep.consolidated_reputation_analysis);
      if (ep.social_media_analysis) setSocialData(ep.social_media_analysis);
      if (ep.air_connectivity_analysis) setAirConnData(ep.air_connectivity_analysis);
      if (ep.tariff_seasonality_analysis) setTariffSeasonalityData(ep.tariff_seasonality_analysis);
      if (ep.telecom_coverage_analysis) setTelecomData(ep.telecom_coverage_analysis);
      if (ep.urban_accessibility_analysis) setAccessibilityData(ep.urban_accessibility_analysis);
      if (ep.health_infrastructure_analysis) setHealthData(ep.health_infrastructure_analysis);
      // Hydrate apenas o snapshot da rodada atual. Se o estado salvo for o
      // formato antigo (array puro), ele pertence a uma rodada anterior do
      // mesmo destino — descartamos para não pintar blocos como "verde" em
      // um novo diagnóstico.
      if (ep.autofill_run_state) {
        const raw = ep.autofill_run_state as any;
        if (assessmentId && raw && !Array.isArray(raw) && raw.byAssessment) {
          const entries = raw.byAssessment[assessmentId];
          if (Array.isArray(entries)) {
            hydrateAutoFillState(entries as AutoFillEntry[]);
          } else {
            resetAutoFillState();
          }
        } else {
          resetAutoFillState();
        }
      } else {
        resetAutoFillState();
      }
    }
  }, [existingProfile]);

  const saveProfile = useMutation({
    mutationFn: async () => {
      if (!effectiveOrgId) throw new Error('Organização não encontrada');

      // Merge autofill_run_state por assessmentId para não sobrescrever o
      // snapshot de rodadas anteriores no mesmo destino.
      let mergedRunState: any = getAutoFillSnapshot();
      if (assessmentId) {
        const { data: current } = await supabase
          .from('enterprise_profiles')
          .select('autofill_run_state')
          .eq('destination_id', destinationId)
          .maybeSingle();
        const existing = (current?.autofill_run_state ?? null) as any;
        const byAssessment =
          existing && !Array.isArray(existing) && typeof existing === 'object' && existing.byAssessment
            ? { ...existing.byAssessment }
            : {};
        byAssessment[assessmentId] = getAutoFillSnapshot();
        mergedRunState = { byAssessment };
      }

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
        climate_analysis: climateData,
        transport_analysis: transportData,
        brand_strength_analysis: brandData,
        demand_trends_analysis: demandData,
        consolidated_reputation_analysis: reputationData,
        social_media_analysis: socialData,
        air_connectivity_analysis: airConnData,
        tariff_seasonality_analysis: tariffSeasonalityData,
        telecom_coverage_analysis: telecomData,
        urban_accessibility_analysis: accessibilityData,
        health_infrastructure_analysis: healthData,
        autofill_run_state: mergedRunState as any,
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
      {/* Fase 12.3 — Tour de onboarding (auto-abre na 1ª visita, reabrível via botão) */}
      <EnterpriseOnboardingTour
        destinationId={destinationId}
        open={tourOpen}
        onOpenChange={setTourOpen}
      />
      {/* 0) Resumo de progresso dos blocos automáticos */}
      <Card className="border-primary/20">
        <CardContent className="py-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-sm font-medium">
                  Pré-preenchimento automático: {autoFillDone}/{autoFillTotal} blocos
                </div>
                <div className="text-xs text-muted-foreground">
                  Cada bloco abaixo busca dados públicos para preencher indicadores do diagnóstico
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-32 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${autoFillPct}%` }}
                />
              </div>
              <Badge variant={autoFillDone === autoFillTotal ? 'default' : 'secondary'} className="text-[10px]">
                {autoFillPct}%
              </Badge>
              <Button
                size="sm"
                onClick={handleRunAll}
                disabled={runAllLoading}
                className="ml-2"
              >
                {runAllLoading ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                ) : (
                  <Play className="h-3.5 w-3.5 mr-1" />
                )}
                {runAllLoading ? 'Executando...' : 'Rodar todos'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setTourOpen(true)}
                title="Abrir tour do módulo Enterprise"
              >
                <BookOpen className="h-3.5 w-3.5 mr-1" />
                Tour
              </Button>
            </div>
          </div>
          {runAllLoading && runAllProgress && (
            <div className="mt-3 text-xs text-muted-foreground">
              Executando bloco <span className="font-medium text-foreground">{runAllProgress.id}</span>
              {' '}({runAllProgress.index + 1}/{runAllProgress.total})
            </div>
          )}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {autoFillFlags.map((b) => {
              const st = statusById.get(b.key);
              const status = st?.status ?? (b.done ? 'success' : 'idle');
              const isError = status === 'error';
              const isRunning = status === 'running';
              const isNoData = status === 'no_data';
              const isSuccess = (status === 'success' || b.done) && !isNoData;
              return (
                <div key={b.key} className="inline-flex items-center gap-1">
                  <Badge
                    variant="outline"
                    title={
                      isNoData
                        ? `Sem informações disponíveis${st?.error ? ` — ${st.error}` : ''}${st?.source ? ` · Fonte: ${st.source}` : ''}`
                        : st?.source
                          ? `Fonte: ${st.source}${st.error ? ` · Erro: ${st.error}` : ''}`
                          : undefined
                    }
                    className={cn(
                      'text-[10px] gap-1',
                      isError && 'border-red-500/50 text-red-700 dark:text-red-400 bg-red-500/5',
                      isRunning && 'border-blue-500/40 text-blue-700 dark:text-blue-400 bg-blue-500/5',
                      isNoData && 'border-amber-500/50 text-amber-700 dark:text-amber-400 bg-amber-500/5',
                      !isError && !isRunning && !isNoData && isSuccess && 'border-green-500/40 text-green-700 dark:text-green-400',
                      !isError && !isRunning && !isNoData && !isSuccess && 'text-muted-foreground opacity-60',
                    )}
                  >
                    {isRunning && <Loader2 className="h-2.5 w-2.5 animate-spin" />}
                    {isError && <AlertCircle className="h-2.5 w-2.5" />}
                    {isNoData && <Info className="h-2.5 w-2.5" />}
                    {!isRunning && !isError && !isNoData && isSuccess && <CheckCircle2 className="h-2.5 w-2.5" />}
                    {b.label}
                  </Badge>
                  {(isError || isNoData) && (
                    <button
                      type="button"
                      onClick={() => handleRetryOne(b.key)}
                      disabled={runAllLoading}
                      title={`Tentar novamente: ${b.label}`}
                      className={cn(
                        'inline-flex items-center justify-center h-4 w-4 rounded disabled:opacity-40',
                        isError && 'text-red-700 dark:text-red-400 hover:bg-red-500/10',
                        isNoData && 'text-amber-700 dark:text-amber-400 hover:bg-amber-500/10',
                      )}
                    >
                      <RefreshCw className="h-3 w-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {!hasBusinessName && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-50/60 dark:bg-amber-950/20 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
          <div className="font-medium flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Informe o nome do empreendimento abaixo (bloco Reviews) antes de rodar os blocos automáticos.
          </div>
          <p className="text-xs mt-1 opacity-90">
            Os blocos da seção <strong>Sobre o Empreendimento</strong> dependem do nome digitado nesse campo. Sem ele, as buscas voltarão como "sem dados" ou trarão informações do município no lugar do hotel.
          </p>
        </div>
      )}

      {/* === SECTION: 🏨 Sobre o Empreendimento === */}
      <div className="pt-4 pb-1">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          🏨 Sobre o Empreendimento
        </h3>
        <p className="text-xs text-muted-foreground">Buscas focadas no estabelecimento — usam o nome do hotel/pousada digitado no bloco Reviews.</p>
      </div>
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
            onBusinessNameChange={setEnterpriseName}
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
            businessName={businessQuery}
            location={destinationName}
            onAutoFill={handleDigitalAutoFill}
            onAnalysisCapture={handleDigitalAnalysisCapture}
          />
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
            businessName={businessQuery}
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
            businessName={businessQuery}
            location={destinationName}
            propertyType={formData.property_type}
            onCaptured={setCompetitorsCount}
          />
        </CardContent>
      </Card>

      {/* 2) Perfil do Empreendimento (ABAIXO do pré-preenchimento) */}      {/* 1.10) Sustentabilidade & ESG */}
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
            businessName={businessQuery}
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
            businessName={businessQuery}
            location={destinationName}
            onAutoFill={handlePricingAutoFill}
            onAnalysisCapture={handlePricingCapture}
          />
        </CardContent>
      </Card>
      {/* 1.16) Força da Marca */}
      <Card className="border-pink-500/30 bg-gradient-to-br from-pink-50/50 to-fuchsia-50/30 dark:from-pink-950/20 dark:to-fuchsia-950/10">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-pink-500/10"><Sparkles className="h-5 w-5 text-pink-600" /></div>
            <div className="flex-1">
              <CardTitle className="text-lg flex items-center gap-2">
                Força da Marca
                <Badge variant="secondary" className="text-[10px]"><Sparkles className="h-3 w-3 mr-1" />Auto</Badge>
              </CardTitle>
              <CardDescription>Visibilidade orgânica: resultados de busca, autoridade de domínios, mídia e OTAs</CardDescription>
            </div>
            {brandAutoFilled && (
              <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30"><CheckCircle2 className="h-3 w-3 mr-1" />Preenchido</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <BrandStrengthSearch businessName={businessQuery} location={destinationName} onAutoFill={handleBrandAutoFill} onAnalysisCapture={handleBrandCapture} />
        </CardContent>
      </Card>
      {/* 1.17) Demanda & Tendências */}
      <Card className="border-cyan-500/30 bg-gradient-to-br from-cyan-50/50 to-sky-50/30 dark:from-cyan-950/20 dark:to-sky-950/10">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/10"><Sparkles className="h-5 w-5 text-cyan-600" /></div>
            <div className="flex-1">
              <CardTitle className="text-lg flex items-center gap-2">
                Demanda & Tendências
                <Badge variant="secondary" className="text-[10px]"><Sparkles className="h-3 w-3 mr-1" />Auto</Badge>
              </CardTitle>
              <CardDescription>Volume orgânico, sinais transacionais em OTAs, distribuição mensal e picos de interesse</CardDescription>
            </div>
            {demandAutoFilled && (
              <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30"><CheckCircle2 className="h-3 w-3 mr-1" />Preenchido</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <DemandTrendsSearch businessName={businessQuery} location={destinationName} onAutoFill={handleDemandAutoFill} onAnalysisCapture={handleDemandCapture} />
        </CardContent>
      </Card>
      {/* 1.18) Reputação Consolidada Multi-OTA */}
      <Card className="border-yellow-500/30 bg-gradient-to-br from-yellow-50/50 to-amber-50/30 dark:from-yellow-950/20 dark:to-amber-950/10">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-500/10"><Sparkles className="h-5 w-5 text-yellow-600" /></div>
            <div className="flex-1">
              <CardTitle className="text-lg flex items-center gap-2">
                Reputação Consolidada
                <Badge variant="secondary" className="text-[10px]"><Sparkles className="h-3 w-3 mr-1" />Auto</Badge>
              </CardTitle>
              <CardDescription>Nota agregada de Booking, Google, TripAdvisor, Airbnb e demais OTAs em escala 0-10</CardDescription>
            </div>
            {reputationAutoFilled && (
              <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30"><CheckCircle2 className="h-3 w-3 mr-1" />Preenchido</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <ConsolidatedReputationSearch businessName={businessQuery} location={destinationName} onAutoFill={handleReputationAutoFill} onAnalysisCapture={handleReputationCapture} />
        </CardContent>
      </Card>
      {/* 1.19) Presença em Redes Sociais */}
      <Card className="border-fuchsia-500/30 bg-gradient-to-br from-fuchsia-50/50 to-pink-50/30 dark:from-fuchsia-950/20 dark:to-pink-950/10">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-fuchsia-500/10"><Sparkles className="h-5 w-5 text-fuchsia-600" /></div>
            <div className="flex-1">
              <CardTitle className="text-lg flex items-center gap-2">
                Presença em Redes Sociais
                <Badge variant="secondary" className="text-[10px]"><Sparkles className="h-3 w-3 mr-1" />Auto</Badge>
              </CardTitle>
              <CardDescription>Instagram, Facebook, TikTok, YouTube e LinkedIn: perfis ativos e base estimada de seguidores</CardDescription>
            </div>
            {socialAutoFilled && (
              <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30"><CheckCircle2 className="h-3 w-3 mr-1" />Preenchido</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <SocialMediaSearch businessName={businessQuery} location={destinationName} onAutoFill={handleSocialAutoFill} onAnalysisCapture={handleSocialCapture} />
        </CardContent>
      </Card>
      {/* === SECTION: 📄 Cadastro Legal === */}
      <div className="pt-4 pb-1">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          📄 Cadastro Legal
        </h3>
        <p className="text-xs text-muted-foreground">Dados oficiais da pessoa jurídica do empreendimento.</p>
      </div>
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
      {/* === SECTION: 🌎 Sobre o Município / Destino === */}
      <div className="pt-4 pb-1">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          🌎 Sobre o Município / Destino
        </h3>
        <p className="text-xs text-muted-foreground">Indicadores do contexto territorial onde o empreendimento opera (independe do nome do hotel).</p>
      </div>
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
      {/* 1.14) Conforto Climático */}
      <Card className="border-sky-500/30 bg-gradient-to-br from-sky-50/50 to-blue-50/30 dark:from-sky-950/20 dark:to-blue-950/10">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-sky-500/10"><Sparkles className="h-5 w-5 text-sky-600" /></div>
            <div className="flex-1">
              <CardTitle className="text-lg flex items-center gap-2">
                Conforto Climático
                <Badge variant="secondary" className="text-[10px]"><Sparkles className="h-3 w-3 mr-1" />Auto</Badge>
              </CardTitle>
              <CardDescription>Open-Meteo (5 anos): temperatura, chuva e melhores meses do destino</CardDescription>
            </div>
            {climateAutoFilled && (
              <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30"><CheckCircle2 className="h-3 w-3 mr-1" />Preenchido</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <ClimateComfortSearch destinationId={destinationId} onAutoFill={handleClimateAutoFill} onAnalysisCapture={handleClimateCapture} />
        </CardContent>
      </Card>
      {/* 1.15) Transporte Intra-Destino */}
      <Card className="border-orange-500/30 bg-gradient-to-br from-orange-50/50 to-amber-50/30 dark:from-orange-950/20 dark:to-amber-950/10">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-500/10"><Sparkles className="h-5 w-5 text-orange-600" /></div>
            <div className="flex-1">
              <CardTitle className="text-lg flex items-center gap-2">
                Transporte Intra-Destino
                <Badge variant="secondary" className="text-[10px]"><Sparkles className="h-3 w-3 mr-1" />Auto</Badge>
              </CardTitle>
              <CardDescription>Apps, transporte público, transfer e alternativos disponíveis no destino</CardDescription>
            </div>
            {transportAutoFilled && (
              <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30"><CheckCircle2 className="h-3 w-3 mr-1" />Preenchido</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <LocalTransportSearch destinationName={destinationName} onAutoFill={handleTransportAutoFill} onAnalysisCapture={handleTransportCapture} />
        </CardContent>
      </Card>
      {/* 1.20) Conectividade Aérea (ANAC) */}
      <Card className="border-sky-500/30 bg-gradient-to-br from-sky-50/50 to-indigo-50/30 dark:from-sky-950/20 dark:to-indigo-950/10">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-sky-500/10"><Sparkles className="h-5 w-5 text-sky-600" /></div>
            <div className="flex-1">
              <CardTitle className="text-lg flex items-center gap-2">
                Conectividade Aérea
                <Badge variant="secondary" className="text-[10px]"><Sparkles className="h-3 w-3 mr-1" />Auto</Badge>
              </CardTitle>
              <CardDescription>ANAC — voos/semana, passageiros 12m e participação internacional do aeroporto do município</CardDescription>
            </div>
            {airConnAutoFilled && (
              <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30"><CheckCircle2 className="h-3 w-3 mr-1" />Preenchido</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <AirConnectivitySearch destinationId={destinationId} onAutoFill={handleAirConnAutoFill} onAnalysisCapture={handleAirConnCapture} />
        </CardContent>
      </Card>
      {/* 1.22) Conectividade Telecom (Anatel) */}
      <Card className="border-cyan-500/30 bg-gradient-to-br from-cyan-50/50 to-blue-50/30 dark:from-cyan-950/20 dark:to-blue-950/10">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/10"><Sparkles className="h-5 w-5 text-cyan-600" /></div>
            <div className="flex-1">
              <CardTitle className="text-lg flex items-center gap-2">
                Conectividade Telecom
                <Badge variant="secondary" className="text-[10px]"><Sparkles className="h-3 w-3 mr-1" />Auto</Badge>
              </CardTitle>
              <CardDescription>Anatel — cobertura 4G, 5G e Wi-Fi público do município (afeta PMS cloud, OTA mobile e check-in digital)</CardDescription>
            </div>
            {telecomAutoFilled && (
              <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30"><CheckCircle2 className="h-3 w-3 mr-1" />Preenchido</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <TelecomCoverageSearch destinationId={destinationId} onAutoFill={handleTelecomAutoFill} onAnalysisCapture={handleTelecomCapture} />
        </CardContent>
      </Card>
      {/* 1.23) Acessibilidade Urbana */}
      <Card className="border-indigo-500/30 bg-gradient-to-br from-indigo-50/50 to-violet-50/30 dark:from-indigo-950/20 dark:to-violet-950/10">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-500/10"><Sparkles className="h-5 w-5 text-indigo-600" /></div>
            <div className="flex-1">
              <CardTitle className="text-lg flex items-center gap-2">
                Acessibilidade Urbana
                <Badge variant="secondary" className="text-[10px]"><Sparkles className="h-3 w-3 mr-1" />Auto</Badge>
              </CardTitle>
              <CardDescription>Pesquisa web por evidências de calçadas, rampas, sinalização tátil, transporte acessível e atrativos PCD no município</CardDescription>
            </div>
            {accessibilityAutoFilled && (
              <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30"><CheckCircle2 className="h-3 w-3 mr-1" />Preenchido</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <UrbanAccessibilitySearch destinationId={destinationId} onAutoFill={handleAccessibilityAutoFill} onAnalysisCapture={handleAccessibilityCapture} />
        </CardContent>
      </Card>
      {/* 1.24) Infraestrutura de Saúde do Entorno (DATASUS) */}
      <Card className="border-rose-500/30 bg-gradient-to-br from-rose-50/50 to-pink-50/30 dark:from-rose-950/20 dark:to-pink-950/10">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-rose-500/10"><Sparkles className="h-5 w-5 text-rose-600" /></div>
            <div className="flex-1">
              <CardTitle className="text-lg flex items-center gap-2">
                Infraestrutura de Saúde do Entorno
                <Badge variant="secondary" className="text-[10px]"><Sparkles className="h-3 w-3 mr-1" />Auto</Badge>
              </CardTitle>
              <CardDescription>DATASUS/CNES — hospitais, leitos, pronto-socorro 24h e densidade por 1k habitantes do município</CardDescription>
            </div>
            {healthAutoFilled && (
              <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30"><CheckCircle2 className="h-3 w-3 mr-1" />Preenchido</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <HealthInfrastructureSearch destinationId={destinationId} onAutoFill={handleHealthAutoFill} onAnalysisCapture={handleHealthCapture} />
        </CardContent>
      </Card>

      {/* === SECTION: 🔄 Indicadores Derivados === */}
      <div className="pt-4 pb-1">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          🔄 Indicadores Derivados
        </h3>
        <p className="text-xs text-muted-foreground">Calculados automaticamente a partir dos blocos acima.</p>
      </div>
      {/* 1.21) Sazonalidade Tarifária (derivada) */}
      <Card className="border-violet-500/30 bg-gradient-to-br from-violet-50/50 to-purple-50/30 dark:from-violet-950/20 dark:to-purple-950/10">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-violet-500/10"><Sparkles className="h-5 w-5 text-violet-600" /></div>
            <div className="flex-1">
              <CardTitle className="text-lg flex items-center gap-2">
                Sazonalidade Tarifária
                <Badge variant="secondary" className="text-[10px]"><Sparkles className="h-3 w-3 mr-1" />Derivada</Badge>
              </CardTitle>
              <CardDescription>Cruza demanda orgânica, eventos locais e ADR mensal para mapear picos e baixas tarifárias</CardDescription>
            </div>
            {tariffSeasonalityAutoFilled && (
              <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30"><CheckCircle2 className="h-3 w-3 mr-1" />Preenchido</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <TariffSeasonalitySearch
            pricingData={pricingData}
            demandData={demandData}
            eventsData={eventsData}
            onAutoFill={handleTariffSeasonalityAutoFill}
            onAnalysisCapture={handleTariffSeasonalityCapture}
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
