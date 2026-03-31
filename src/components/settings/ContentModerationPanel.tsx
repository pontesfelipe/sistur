import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useProfileContext } from '@/contexts/ProfileContext';
import { toast } from 'sonner';
import { Shield, Thermometer, Eye, ImageIcon, Loader2, Save } from 'lucide-react';

interface ModerationSettings {
  id?: string;
  strictness_level: number;
  auto_reject_enabled: boolean;
  require_image_review: boolean;
  max_images_per_post: number;
}

const STRICTNESS_LABELS: Record<number, { label: string; description: string; color: string }> = {
  1: { label: 'Muito Permissivo', description: 'Apenas conteúdo explícito é bloqueado', color: 'text-green-600' },
  2: { label: 'Permissivo', description: 'Bloqueia conteúdo explícito e violento', color: 'text-emerald-600' },
  3: { label: 'Moderado', description: 'Equilíbrio entre permissividade e restrição', color: 'text-amber-600' },
  4: { label: 'Restritivo', description: 'Aceita apenas conteúdo claramente profissional', color: 'text-orange-600' },
  5: { label: 'Muito Restritivo', description: 'Apenas conteúdo diretamente relacionado a turismo', color: 'text-red-600' },
};

export function ContentModerationPanel() {
  const { user } = useAuth();
  const { profile } = useProfileContext();
  const [settings, setSettings] = useState<ModerationSettings>({
    strictness_level: 3,
    auto_reject_enabled: true,
    require_image_review: false,
    max_images_per_post: 6,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const orgId = profile?.viewing_demo_org_id || profile?.org_id;

  useEffect(() => {
    loadSettings();
  }, [orgId]);

  const loadSettings = async () => {
    if (!orgId) return;
    try {
      const { data, error } = await supabase
        .from('content_moderation_settings')
        .select('*')
        .eq('org_id', orgId)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setSettings({
          id: data.id,
          strictness_level: data.strictness_level,
          auto_reject_enabled: data.auto_reject_enabled,
          require_image_review: data.require_image_review,
          max_images_per_post: data.max_images_per_post,
        });
      }
    } catch (error) {
      console.error('Error loading moderation settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!orgId || !user) return;
    setIsSaving(true);
    try {
      if (settings.id) {
        const { error } = await supabase
          .from('content_moderation_settings')
          .update({
            strictness_level: settings.strictness_level,
            auto_reject_enabled: settings.auto_reject_enabled,
            require_image_review: settings.require_image_review,
            max_images_per_post: settings.max_images_per_post,
            updated_at: new Date().toISOString(),
            updated_by: user.id,
          })
          .eq('id', settings.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('content_moderation_settings')
          .insert({
            org_id: orgId,
            strictness_level: settings.strictness_level,
            auto_reject_enabled: settings.auto_reject_enabled,
            require_image_review: settings.require_image_review,
            max_images_per_post: settings.max_images_per_post,
            updated_by: user.id,
          })
          .select()
          .single();
        if (error) throw error;
        setSettings(prev => ({ ...prev, id: data.id }));
      }
      toast.success('Configurações de moderação salvas!');
    } catch (error: any) {
      toast.error('Erro ao salvar: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const strictnessInfo = STRICTNESS_LABELS[settings.strictness_level];

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          Moderação de Conteúdo
        </CardTitle>
        <CardDescription>
          Configure as políticas de moderação automática para o Social Turismo
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Strictness Thermometer */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2 text-base font-medium">
              <Thermometer className="h-4 w-4" />
              Nível de Restrição
            </Label>
            <Badge variant="outline" className={strictnessInfo.color}>
              {strictnessInfo.label}
            </Badge>
          </div>
          
          {/* Visual thermometer */}
          <div className="relative pt-2 pb-4">
            <div className="flex justify-between mb-2 text-xs text-muted-foreground">
              <span>Permissivo</span>
              <span>Restritivo</span>
            </div>
            <div className="relative h-3 rounded-full overflow-hidden bg-gradient-to-r from-green-200 via-amber-200 to-red-200 dark:from-green-900 dark:via-amber-900 dark:to-red-900">
              <div 
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-green-500 via-amber-500 to-red-500 rounded-full transition-all duration-300"
                style={{ width: `${(settings.strictness_level / 5) * 100}%` }}
              />
            </div>
            <Slider
              value={[settings.strictness_level]}
              onValueChange={([v]) => setSettings(prev => ({ ...prev, strictness_level: v }))}
              min={1}
              max={5}
              step={1}
              className="mt-2"
            />
          </div>
          <p className="text-sm text-muted-foreground">{strictnessInfo.description}</p>
        </div>

        <Separator />

        {/* Auto-reject toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-sm font-medium">Rejeição Automática</Label>
            <p className="text-xs text-muted-foreground">
              Bloquear automaticamente imagens que não passam na moderação
            </p>
          </div>
          <Switch
            checked={settings.auto_reject_enabled}
            onCheckedChange={(v) => setSettings(prev => ({ ...prev, auto_reject_enabled: v }))}
          />
        </div>

        {/* Manual review toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <Eye className="h-4 w-4" />
              Revisão Manual
            </Label>
            <p className="text-xs text-muted-foreground">
              Exigir aprovação manual de admin antes de publicar imagens
            </p>
          </div>
          <Switch
            checked={settings.require_image_review}
            onCheckedChange={(v) => setSettings(prev => ({ ...prev, require_image_review: v }))}
          />
        </div>

        <Separator />

        {/* Max images per post */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <ImageIcon className="h-4 w-4" />
              Máximo de Imagens por Post
            </Label>
            <Badge variant="secondary">{settings.max_images_per_post}</Badge>
          </div>
          <Slider
            value={[settings.max_images_per_post]}
            onValueChange={([v]) => setSettings(prev => ({ ...prev, max_images_per_post: v }))}
            min={1}
            max={10}
            step={1}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>1 imagem</span>
            <span>10 imagens</span>
          </div>
        </div>

        <Separator />

        <Button onClick={saveSettings} disabled={isSaving} className="w-full gap-2">
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salvar Configurações
        </Button>
      </CardContent>
    </Card>
  );
}
