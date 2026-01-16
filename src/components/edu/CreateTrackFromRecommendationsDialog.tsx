import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useEduTrackMutations } from "@/hooks/useEdu";
import type { PersonalizedRecommendation } from "@/hooks/useStudentProfile";
import { BookOpen, GraduationCap, Video } from "lucide-react";

interface CreateTrackFromRecommendationsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recommendations: PersonalizedRecommendation[];
  defaultName?: string;
}

export function CreateTrackFromRecommendationsDialog({
  open,
  onOpenChange,
  recommendations,
  defaultName = "Minha trilha recomendada",
}: CreateTrackFromRecommendationsDialogProps) {
  const navigate = useNavigate();
  const { createTrackWithTrainings } = useEduTrackMutations();

  const trainingRecommendations = useMemo(() => {
    const trainings = recommendations
      .filter((r) => r.recommendation_type !== "track")
      .map((r) => ({
        id: r.id,
        training_id: r.entity_id,
        pillar: r.training?.pillar,
        type: r.recommendation_type,
        title: r.training?.title ?? "Treinamento",
        relevance_score: r.relevance_score,
      }));

    const seen = new Set<string>();
    return trainings.filter((t) => {
      if (!t.training_id) return false;
      if (seen.has(t.training_id)) return false;
      seen.add(t.training_id);
      return true;
    });
  }, [recommendations]);

  const initialTrainingIds = useMemo(
    () => trainingRecommendations.map((t) => t.training_id),
    [trainingRecommendations]
  );

  const [name, setName] = useState(defaultName);
  const [description, setDescription] = useState<string>(
    "Trilha criada a partir das recomendações do seu Perfil de Aprendizado."
  );
  const [selectedTrainingIds, setSelectedTrainingIds] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    setName(defaultName);
    setSelectedTrainingIds(initialTrainingIds);
  }, [open, defaultName, initialTrainingIds]);

  const canCreate = name.trim().length > 0 && selectedTrainingIds.length > 0;

  const toggleTraining = (trainingId: string) => {
    setSelectedTrainingIds((prev) =>
      prev.includes(trainingId) ? prev.filter((id) => id !== trainingId) : [...prev, trainingId]
    );
  };

  const handleCreate = async () => {
    if (!canCreate) return;

    const newTrack = await createTrackWithTrainings.mutateAsync({
      track: {
        name: name.trim(),
        description: description.trim() || undefined,
      },
      trainingIds: selectedTrainingIds,
    });

    onOpenChange(false);
    navigate(`/edu/trilha/${newTrack.id}`);
  };

  const isSubmitting = createTrackWithTrainings.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Criar trilha com essas sugestões</DialogTitle>
          <DialogDescription>
            Selecione os cursos/lives recomendados e crie uma trilha para acompanhar seu progresso.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-2">
          {trainingRecommendations.length === 0 ? (
            <div className="rounded-md border p-4 text-sm text-muted-foreground">
              Nenhuma recomendação de curso/live encontrada para montar uma trilha.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nome da trilha</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Minha trilha personalizada" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Descrição (opcional)</label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Uma trilha baseada nas minhas recomendações"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium">
                    Itens da trilha ({selectedTrainingIds.length}/{trainingRecommendations.length})
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedTrainingIds(initialTrainingIds)}
                    disabled={trainingRecommendations.length === 0}
                  >
                    Selecionar tudo
                  </Button>
                </div>

                <div className="rounded-md border overflow-hidden">
                  <div className="max-h-56 overflow-y-auto">
                    {trainingRecommendations.map((t) => {
                      const isLive = t.type === "live";
                      const Icon = isLive ? Video : BookOpen;
                      const checked = selectedTrainingIds.includes(t.training_id);

                      return (
                        <button
                          type="button"
                          key={t.training_id}
                          className={`w-full text-left flex items-start gap-3 p-3 border-b last:border-b-0 hover:bg-muted/50 ${
                            checked ? "bg-primary/5" : ""
                          }`}
                          onClick={() => toggleTraining(t.training_id)}
                        >
                          <Checkbox checked={checked} className="mt-1" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <Badge variant="outline" className="text-xs">
                                {isLive ? "Live" : "Curso"}
                              </Badge>
                              {t.pillar && (
                                <Badge variant="outline" className="text-xs">
                                  {t.pillar}
                                </Badge>
                              )}
                              <span className="text-xs text-muted-foreground">{Math.round(t.relevance_score)}% match</span>
                            </div>
                            <div className="flex items-center gap-2 min-w-0">
                              <Icon className="h-4 w-4 text-muted-foreground" />
                              <p className="font-medium text-sm truncate">{t.title}</p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-shrink-0 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleCreate} disabled={!canCreate || isSubmitting}>
            {isSubmitting ? (
              <>
                <GraduationCap className="mr-2 h-4 w-4 animate-pulse" />
                Criando...
              </>
            ) : (
              <>
                <GraduationCap className="mr-2 h-4 w-4" />
                Criar trilha
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
