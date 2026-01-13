import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CommunityFeedbackSummary } from '@/hooks/useCommunityFeedback';
import { Users, MessageCircle, Lightbulb, ThumbsUp, ThumbsDown, Minus } from 'lucide-react';

interface CommunityFeedbackSummaryCardProps {
  summary: CommunityFeedbackSummary;
}

export function CommunityFeedbackSummaryCard({ summary }: CommunityFeedbackSummaryCardProps) {
  const getSeverityColor = (value: number) => {
    if (value >= 0.67) return 'bg-severity-good';
    if (value >= 0.34) return 'bg-severity-moderate';
    return 'bg-severity-critical';
  };

  return (
    <Card className="animate-fade-in">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="w-5 h-5" />
            Feedback da Comunidade
          </CardTitle>
          <Badge variant="secondary">
            {summary.feedback_count} resposta{summary.feedback_count !== 1 ? 's' : ''}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Scores Overview */}
        <div className="space-y-3">
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span>Qualidade de Vida</span>
              <span className="font-medium">
                {(summary.avg_quality_of_life * 100).toFixed(0)}%
              </span>
            </div>
            <Progress
              value={summary.avg_quality_of_life * 100}
              className="h-2"
              indicatorClassName={getSeverityColor(summary.avg_quality_of_life)}
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span>Preocupação Ambiental</span>
              <span className="font-medium">
                {(summary.avg_environmental_concern * 100).toFixed(0)}%
              </span>
            </div>
            <Progress
              value={summary.avg_environmental_concern * 100}
              className="h-2"
              indicatorClassName={getSeverityColor(1 - summary.avg_environmental_concern)}
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span>Preservação Cultural</span>
              <span className="font-medium">
                {(summary.avg_cultural_preservation * 100).toFixed(0)}%
              </span>
            </div>
            <Progress
              value={summary.avg_cultural_preservation * 100}
              className="h-2"
              indicatorClassName={getSeverityColor(summary.avg_cultural_preservation)}
            />
          </div>
        </div>

        {/* Perception Distribution */}
        <div className="pt-3 border-t">
          <div className="text-sm font-medium mb-2">Percepção sobre o Turismo</div>
          <div className="flex gap-2">
            <div className="flex-1 p-2 rounded bg-severity-good/10 text-center">
              <ThumbsUp className="w-4 h-4 mx-auto mb-1 text-severity-good" />
              <div className="text-lg font-bold text-severity-good">
                {(summary.positive_perception_ratio * 100).toFixed(0)}%
              </div>
              <div className="text-xs text-muted-foreground">Positivo</div>
            </div>
            <div className="flex-1 p-2 rounded bg-severity-moderate/10 text-center">
              <Minus className="w-4 h-4 mx-auto mb-1 text-severity-moderate" />
              <div className="text-lg font-bold text-severity-moderate">
                {(summary.neutral_perception_ratio * 100).toFixed(0)}%
              </div>
              <div className="text-xs text-muted-foreground">Neutro</div>
            </div>
            <div className="flex-1 p-2 rounded bg-severity-critical/10 text-center">
              <ThumbsDown className="w-4 h-4 mx-auto mb-1 text-severity-critical" />
              <div className="text-lg font-bold text-severity-critical">
                {(summary.negative_perception_ratio * 100).toFixed(0)}%
              </div>
              <div className="text-xs text-muted-foreground">Negativo</div>
            </div>
          </div>
        </div>

        {/* Top Concerns */}
        {summary.top_concerns.length > 0 && (
          <div className="pt-3 border-t">
            <div className="flex items-center gap-2 text-sm font-medium mb-2">
              <MessageCircle className="w-4 h-4" />
              Principais Preocupações
            </div>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {summary.top_concerns.slice(0, 3).map((concern, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-xs mt-1">•</span>
                  {concern}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Top Suggestions */}
        {summary.top_suggestions.length > 0 && (
          <div className="pt-3 border-t">
            <div className="flex items-center gap-2 text-sm font-medium mb-2">
              <Lightbulb className="w-4 h-4" />
              Principais Sugestões
            </div>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {summary.top_suggestions.slice(0, 3).map((suggestion, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-xs mt-1">•</span>
                  {suggestion}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
