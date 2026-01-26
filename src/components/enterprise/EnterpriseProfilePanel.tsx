import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Hotel, 
  Users, 
  Target, 
  Award, 
  Save, 
  Loader2,
  Building2,
  Star,
  DoorOpen,
  Calendar,
  TrendingUp,
  Globe,
  Leaf,
  Accessibility,
  X
} from 'lucide-react';
import { useEnterpriseProfile, EnterpriseProfileInput } from '@/hooks/useEnterpriseProfiles';
import { useProfile } from '@/hooks/useProfile';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface EnterpriseProfilePanelProps {
  destinationId: string;
  destinationName: string;
  onClose?: () => void;
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

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const TARGET_MARKETS = [
  { value: 'corporativo', label: 'Corporativo' },
  { value: 'lazer', label: 'Lazer' },
  { value: 'familia', label: 'Família' },
  { value: 'eventos', label: 'Eventos' },
  { value: 'eco', label: 'Ecoturismo' },
  { value: 'terceira_idade', label: 'Terceira Idade' },
  { value: 'lua_de_mel', label: 'Lua de Mel' },
];

const CERTIFICATIONS = [
  { value: 'iso_9001', label: 'ISO 9001' },
  { value: 'iso_14001', label: 'ISO 14001' },
  { value: 'green_key', label: 'Green Key' },
  { value: 'leed', label: 'LEED' },
  { value: 'rainforest', label: 'Rainforest Alliance' },
  { value: 'cadastur', label: 'CADASTUR' },
  { value: 'selo_turismo', label: 'Selo Turismo Responsável' },
];

const SUSTAINABILITY_INITIATIVES = [
  { value: 'energia_solar', label: 'Energia Solar' },
  { value: 'reuso_agua', label: 'Reuso de Água' },
  { value: 'compostagem', label: 'Compostagem' },
  { value: 'amenities_sustentaveis', label: 'Amenities Sustentáveis' },
  { value: 'fornecedores_locais', label: 'Fornecedores Locais' },
  { value: 'reducao_plastico', label: 'Redução de Plástico' },
  { value: 'horta_organica', label: 'Horta Orgânica' },
];

const ACCESSIBILITY_FEATURES = [
  { value: 'cadeirante', label: 'Acesso para Cadeirante' },
  { value: 'deficiencia_visual', label: 'Recursos para Deficientes Visuais' },
  { value: 'deficiencia_auditiva', label: 'Recursos para Deficientes Auditivos' },
  { value: 'elevadores', label: 'Elevadores Acessíveis' },
  { value: 'banheiros_adaptados', label: 'Banheiros Adaptados' },
  { value: 'sinalizacao_braile', label: 'Sinalização em Braille' },
];

export function EnterpriseProfilePanel({ destinationId, destinationName, onClose }: EnterpriseProfilePanelProps) {
  const { profile } = useProfile();
  const { profile: existingProfile, isLoading } = useEnterpriseProfile(destinationId);
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState<Partial<EnterpriseProfileInput>>({
    property_type: 'hotel',
    star_rating: null,
    room_count: null,
    suite_count: null,
    total_capacity: null,
    employee_count: null,
    years_in_operation: null,
    seasonality: null,
    peak_months: [],
    target_market: [],
    average_occupancy_rate: null,
    average_daily_rate: null,
    primary_source_markets: [],
    certifications: [],
    sustainability_initiatives: [],
    accessibility_features: [],
    notes: null,
  });

  // Load existing profile data
  useEffect(() => {
    if (existingProfile) {
      setFormData({
        property_type: existingProfile.property_type,
        star_rating: existingProfile.star_rating,
        room_count: existingProfile.room_count,
        suite_count: existingProfile.suite_count,
        total_capacity: existingProfile.total_capacity,
        employee_count: existingProfile.employee_count,
        years_in_operation: existingProfile.years_in_operation,
        seasonality: existingProfile.seasonality,
        peak_months: existingProfile.peak_months || [],
        target_market: existingProfile.target_market || [],
        average_occupancy_rate: existingProfile.average_occupancy_rate,
        average_daily_rate: existingProfile.average_daily_rate,
        primary_source_markets: existingProfile.primary_source_markets || [],
        certifications: existingProfile.certifications || [],
        sustainability_initiatives: existingProfile.sustainability_initiatives || [],
        accessibility_features: existingProfile.accessibility_features || [],
        notes: existingProfile.notes,
      });
    }
  }, [existingProfile]);

  const saveProfile = useMutation({
    mutationFn: async () => {
      if (!profile?.org_id) throw new Error('Organização não encontrada');
      
      const payload = {
        ...formData,
        destination_id: destinationId,
        org_id: profile.org_id,
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
      toast.success('Perfil do empreendimento salvo com sucesso');
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

  const toggleArrayItem = (field: keyof EnterpriseProfileInput, value: string) => {
    setFormData(prev => {
      const currentArray = (prev[field] as string[]) || [];
      const newArray = currentArray.includes(value)
        ? currentArray.filter(item => item !== value)
        : [...currentArray, value];
      return { ...prev, [field]: newArray };
    });
  };

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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <Hotel className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <CardTitle className="text-lg">Perfil do Empreendimento</CardTitle>
              <CardDescription>{destinationName}</CardDescription>
            </div>
          </div>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="tipo" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="tipo" className="gap-2">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">Tipo e Porte</span>
            </TabsTrigger>
            <TabsTrigger value="operacao" className="gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Operação</span>
            </TabsTrigger>
            <TabsTrigger value="mercado" className="gap-2">
              <Target className="h-4 w-4" />
              <span className="hidden sm:inline">Mercado</span>
            </TabsTrigger>
            <TabsTrigger value="certificacoes" className="gap-2">
              <Award className="h-4 w-4" />
              <span className="hidden sm:inline">Certificações</span>
            </TabsTrigger>
          </TabsList>

          {/* Tipo e Porte */}
          <TabsContent value="tipo" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="property_type">Tipo de Empreendimento</Label>
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

              <div className="space-y-2">
                <Label htmlFor="room_count" className="flex items-center gap-2">
                  <DoorOpen className="h-4 w-4" />
                  Número de UHs (Quartos)
                </Label>
                <Input
                  id="room_count"
                  type="number"
                  min="0"
                  value={formData.room_count || ''}
                  onChange={(e) => handleNumberChange('room_count', e.target.value)}
                  placeholder="Ex: 120"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="suite_count">Número de Suítes</Label>
                <Input
                  id="suite_count"
                  type="number"
                  min="0"
                  value={formData.suite_count || ''}
                  onChange={(e) => handleNumberChange('suite_count', e.target.value)}
                  placeholder="Ex: 20"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="total_capacity">Capacidade Total de Hóspedes</Label>
                <Input
                  id="total_capacity"
                  type="number"
                  min="0"
                  value={formData.total_capacity || ''}
                  onChange={(e) => handleNumberChange('total_capacity', e.target.value)}
                  placeholder="Ex: 300"
                />
              </div>
            </div>
          </TabsContent>

          {/* Equipe e Operação */}
          <TabsContent value="operacao" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="employee_count" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Número de Funcionários
                </Label>
                <Input
                  id="employee_count"
                  type="number"
                  min="0"
                  value={formData.employee_count || ''}
                  onChange={(e) => handleNumberChange('employee_count', e.target.value)}
                  placeholder="Ex: 50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="years_in_operation" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Anos de Operação
                </Label>
                <Input
                  id="years_in_operation"
                  type="number"
                  min="0"
                  value={formData.years_in_operation || ''}
                  onChange={(e) => handleNumberChange('years_in_operation', e.target.value)}
                  placeholder="Ex: 15"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="seasonality">Perfil de Sazonalidade</Label>
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

              <div className="space-y-2 md:col-span-2">
                <Label>Meses de Alta Temporada</Label>
                <div className="flex flex-wrap gap-2">
                  {MONTHS.map((month, idx) => {
                    const monthValue = (idx + 1).toString().padStart(2, '0');
                    const isSelected = (formData.peak_months || []).includes(monthValue);
                    return (
                      <Badge
                        key={monthValue}
                        variant={isSelected ? 'default' : 'outline'}
                        className="cursor-pointer hover:bg-primary/80"
                        onClick={() => toggleArrayItem('peak_months', monthValue)}
                      >
                        {month.slice(0, 3)}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Mercado e Público */}
          <TabsContent value="mercado" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="average_occupancy_rate" className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Taxa de Ocupação Média (%)
                </Label>
                <Input
                  id="average_occupancy_rate"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={formData.average_occupancy_rate || ''}
                  onChange={(e) => handleNumberChange('average_occupancy_rate', e.target.value)}
                  placeholder="Ex: 72.5"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="average_daily_rate">ADR Médio (R$)</Label>
                <Input
                  id="average_daily_rate"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.average_daily_rate || ''}
                  onChange={(e) => handleNumberChange('average_daily_rate', e.target.value)}
                  placeholder="Ex: 450.00"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Público-Alvo</Label>
                <div className="flex flex-wrap gap-2">
                  {TARGET_MARKETS.map(market => {
                    const isSelected = (formData.target_market || []).includes(market.value);
                    return (
                      <Badge
                        key={market.value}
                        variant={isSelected ? 'default' : 'outline'}
                        className="cursor-pointer hover:bg-primary/80"
                        onClick={() => toggleArrayItem('target_market', market.value)}
                      >
                        {market.label}
                      </Badge>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="primary_source_markets" className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Principais Mercados Emissores
                </Label>
                <Input
                  id="primary_source_markets"
                  value={(formData.primary_source_markets || []).join(', ')}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    primary_source_markets: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                  }))}
                  placeholder="Ex: São Paulo, Rio Grande do Sul, Argentina"
                />
                <p className="text-xs text-muted-foreground">Separe os mercados por vírgula</p>
              </div>
            </div>
          </TabsContent>

          {/* Certificações */}
          <TabsContent value="certificacoes" className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Award className="h-4 w-4" />
                  Certificações
                </Label>
                <div className="flex flex-wrap gap-2">
                  {CERTIFICATIONS.map(cert => {
                    const isSelected = (formData.certifications || []).includes(cert.value);
                    return (
                      <Badge
                        key={cert.value}
                        variant={isSelected ? 'default' : 'outline'}
                        className="cursor-pointer hover:bg-primary/80"
                        onClick={() => toggleArrayItem('certifications', cert.value)}
                      >
                        {cert.label}
                      </Badge>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Leaf className="h-4 w-4 text-green-600" />
                  Iniciativas de Sustentabilidade
                </Label>
                <div className="flex flex-wrap gap-2">
                  {SUSTAINABILITY_INITIATIVES.map(init => {
                    const isSelected = (formData.sustainability_initiatives || []).includes(init.value);
                    return (
                      <Badge
                        key={init.value}
                        variant={isSelected ? 'default' : 'outline'}
                        className={`cursor-pointer ${isSelected ? 'bg-green-600 hover:bg-green-700' : 'hover:bg-green-600/20'}`}
                        onClick={() => toggleArrayItem('sustainability_initiatives', init.value)}
                      >
                        {init.label}
                      </Badge>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Accessibility className="h-4 w-4 text-blue-600" />
                  Recursos de Acessibilidade
                </Label>
                <div className="flex flex-wrap gap-2">
                  {ACCESSIBILITY_FEATURES.map(feat => {
                    const isSelected = (formData.accessibility_features || []).includes(feat.value);
                    return (
                      <Badge
                        key={feat.value}
                        variant={isSelected ? 'default' : 'outline'}
                        className={`cursor-pointer ${isSelected ? 'bg-blue-600 hover:bg-blue-700' : 'hover:bg-blue-600/20'}`}
                        onClick={() => toggleArrayItem('accessibility_features', feat.value)}
                      >
                        {feat.label}
                      </Badge>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Observações Adicionais</Label>
                <Textarea
                  id="notes"
                  value={formData.notes || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value || null }))}
                  placeholder="Informações adicionais sobre o empreendimento..."
                  rows={3}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end mt-6 pt-4 border-t">
          <Button 
            onClick={() => saveProfile.mutate()}
            disabled={saveProfile.isPending}
          >
            {saveProfile.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Salvar Perfil
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
