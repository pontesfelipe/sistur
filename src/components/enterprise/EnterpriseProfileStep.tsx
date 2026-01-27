import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
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
} from 'lucide-react';
import { useEnterpriseProfile, EnterpriseProfileInput } from '@/hooks/useEnterpriseProfiles';
import { useProfile } from '@/hooks/useProfile';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface EnterpriseProfileStepProps {
  destinationId: string;
  destinationName: string;
  onComplete: () => void;
  onBack?: () => void;
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

export function EnterpriseProfileStep({ destinationId, destinationName, onComplete, onBack }: EnterpriseProfileStepProps) {
  const { profile } = useProfile();
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
