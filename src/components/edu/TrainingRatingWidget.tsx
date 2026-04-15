/**
 * SISEDU - Widget de Avaliação de Treinamento
 * Permite que alunos avaliem treinamentos com estrelas e comentário opcional
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Star, MessageSquare } from 'lucide-react';
import { useMyTrainingRating, useTrainingAverageRating, useRatingMutations } from '@/hooks/useEduRatings';

interface TrainingRatingWidgetProps {
  trainingId: string;
  trainingTitle?: string;
}

export function TrainingRatingWidget({ trainingId, trainingTitle }: TrainingRatingWidgetProps) {
  const { data: myRating } = useMyTrainingRating(trainingId);
  const { average, count } = useTrainingAverageRating(trainingId);
  const { submitRating } = useRatingMutations();
  const [hoveredStar, setHoveredStar] = useState(0);
  const [selectedRating, setSelectedRating] = useState(0);
  const [comment, setComment] = useState('');
  const [showForm, setShowForm] = useState(false);

  const currentRating = myRating?.rating ?? 0;

  const handleSubmit = async () => {
    if (selectedRating === 0) return;
    await submitRating.mutateAsync({
      trainingId,
      rating: selectedRating,
      comment: comment.trim() || undefined,
    });
    setShowForm(false);
    setComment('');
  };

  const renderStars = (rating: number, interactive = false) => (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-5 w-5 cursor-${interactive ? 'pointer' : 'default'} transition-colors ${
            star <= (interactive ? (hoveredStar || selectedRating || currentRating) : rating)
              ? 'fill-yellow-400 text-yellow-400'
              : 'text-muted-foreground/30'
          }`}
          onMouseEnter={() => interactive && setHoveredStar(star)}
          onMouseLeave={() => interactive && setHoveredStar(0)}
          onClick={() => {
            if (interactive) {
              setSelectedRating(star);
              if (!showForm) setShowForm(true);
            }
          }}
        />
      ))}
    </div>
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Star className="h-4 w-4 text-yellow-400" />
            Avaliação
          </span>
          {count > 0 && (
            <Badge variant="secondary" className="text-xs">
              {average.toFixed(1)} ({count} {count === 1 ? 'avaliação' : 'avaliações'})
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {myRating ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {renderStars(myRating.rating)}
              <span className="text-sm text-muted-foreground">Sua avaliação</span>
            </div>
            {myRating.comment && (
              <p className="text-sm text-muted-foreground italic">"{myRating.comment}"</p>
            )}
            <Button variant="ghost" size="sm" onClick={() => {
              setSelectedRating(myRating.rating);
              setComment(myRating.comment ?? '');
              setShowForm(true);
            }}>
              Editar avaliação
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">O que achou deste treinamento?</p>
            {renderStars(0, true)}
            {showForm && (
              <div className="space-y-2 animate-fade-in">
                <Textarea
                  placeholder="Deixe um comentário (opcional)"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={2}
                  className="text-sm"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleSubmit}
                    disabled={selectedRating === 0 || submitRating.isPending}
                  >
                    Enviar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => { setShowForm(false); setSelectedRating(0); setComment(''); }}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Compact version for catalog cards
export function TrainingRatingBadge({ trainingId }: { trainingId: string }) {
  const { average, count } = useTrainingAverageRating(trainingId);
  if (count === 0) return null;

  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
      {average.toFixed(1)}
      <span>({count})</span>
    </span>
  );
}
