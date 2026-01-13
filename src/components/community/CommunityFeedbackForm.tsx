import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useCommunityFeedback, TourismImpactPerception } from '@/hooks/useCommunityFeedback';
import { ThumbsUp, Minus, ThumbsDown, Send } from 'lucide-react';

interface CommunityFeedbackFormProps {
  destinationId: string;
  assessmentId?: string;
  onSubmitSuccess?: () => void;
}

export function CommunityFeedbackForm({
  destinationId,
  assessmentId,
  onSubmitSuccess,
}: CommunityFeedbackFormProps) {
  const { submitFeedback, isSubmitting } = useCommunityFeedback(destinationId);

  const [qualityOfLife, setQualityOfLife] = useState(3);
  const [environmentalConcern, setEnvironmentalConcern] = useState(3);
  const [culturalPreservation, setCulturalPreservation] = useState(3);
  const [tourismImpact, setTourismImpact] = useState<TourismImpactPerception>('NEUTRAL');
  const [concerns, setConcerns] = useState('');
  const [suggestions, setSuggestions] = useState('');

  const handleSubmit = () => {
    submitFeedback(
      {
        destination_id: destinationId,
        assessment_id: assessmentId,
        quality_of_life_score: qualityOfLife,
        environmental_concern_level: environmentalConcern,
        cultural_preservation_score: culturalPreservation,
        tourism_impact_perception: tourismImpact,
        concerns: concerns ? concerns.split('\n').filter(Boolean) : [],
        suggestions: suggestions ? suggestions.split('\n').filter(Boolean) : [],
      },
      {
        onSuccess: () => {
          // Reset form
          setQualityOfLife(3);
          setEnvironmentalConcern(3);
          setCulturalPreservation(3);
          setTourismImpact('NEUTRAL');
          setConcerns('');
          setSuggestions('');
          onSubmitSuccess?.();
        },
      }
    );
  };

  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <CardTitle>Feedback da Comunidade</CardTitle>
        <CardDescription>
          Compartilhe sua percepção sobre o turismo em sua região
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Quality of Life */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">
            Qualidade de Vida: {qualityOfLife}/5
          </Label>
          <Slider
            value={[qualityOfLife]}
            onValueChange={([val]) => setQualityOfLife(val)}
            min={1}
            max={5}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Muito Ruim</span>
            <span>Excelente</span>
          </div>
        </div>

        {/* Environmental Concern */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">
            Preocupação Ambiental: {environmentalConcern}/5
          </Label>
          <Slider
            value={[environmentalConcern]}
            onValueChange={([val]) => setEnvironmentalConcern(val)}
            min={1}
            max={5}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Sem Preocupação</span>
            <span>Muito Preocupado</span>
          </div>
        </div>

        {/* Cultural Preservation */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">
            Preservação Cultural: {culturalPreservation}/5
          </Label>
          <Slider
            value={[culturalPreservation]}
            onValueChange={([val]) => setCulturalPreservation(val)}
            min={1}
            max={5}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Não Preservada</span>
            <span>Bem Preservada</span>
          </div>
        </div>

        {/* Tourism Impact Perception */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Impacto do Turismo na Comunidade</Label>
          <div className="flex gap-3">
            <Button
              type="button"
              variant={tourismImpact === 'POSITIVE' ? 'default' : 'outline'}
              onClick={() => setTourismImpact('POSITIVE')}
              className="flex-1"
            >
              <ThumbsUp className="w-4 h-4 mr-2" />
              Positivo
            </Button>
            <Button
              type="button"
              variant={tourismImpact === 'NEUTRAL' ? 'default' : 'outline'}
              onClick={() => setTourismImpact('NEUTRAL')}
              className="flex-1"
            >
              <Minus className="w-4 h-4 mr-2" />
              Neutro
            </Button>
            <Button
              type="button"
              variant={tourismImpact === 'NEGATIVE' ? 'default' : 'outline'}
              onClick={() => setTourismImpact('NEGATIVE')}
              className="flex-1"
            >
              <ThumbsDown className="w-4 h-4 mr-2" />
              Negativo
            </Button>
          </div>
        </div>

        {/* Concerns */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">
            Preocupações (uma por linha)
          </Label>
          <Textarea
            value={concerns}
            onChange={(e) => setConcerns(e.target.value)}
            placeholder="Liste suas preocupações sobre o turismo na região..."
            rows={3}
          />
        </div>

        {/* Suggestions */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">
            Sugestões (uma por linha)
          </Label>
          <Textarea
            value={suggestions}
            onChange={(e) => setSuggestions(e.target.value)}
            placeholder="Compartilhe suas sugestões para melhorar o turismo..."
            rows={3}
          />
        </div>

        {/* Submit */}
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full"
        >
          <Send className="w-4 h-4 mr-2" />
          {isSubmitting ? 'Enviando...' : 'Enviar Feedback'}
        </Button>
      </CardContent>
    </Card>
  );
}
