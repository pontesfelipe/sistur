import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProfileContext } from '@/contexts/ProfileContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, X, BookOpen, Sparkles } from 'lucide-react';
import { getTutorialForRole, getUserTutorialRole, type TutorialStep } from '@/data/tutorialData';

interface TutorialWizardProps {
  open: boolean;
  onClose: () => void;
}

export function TutorialWizard({ open, onClose }: TutorialWizardProps) {
  const navigate = useNavigate();
  const { isAdmin, isProfessor, isEstudante, hasERPAccess } = useProfileContext();
  const userRole = getUserTutorialRole(isAdmin, isProfessor, isEstudante, hasERPAccess);

  const allSteps = useMemo(() => {
    const cats = getTutorialForRole(userRole);
    return cats.flatMap(cat => cat.steps.map(step => ({ ...step, categoryTitle: cat.title })));
  }, [userRole]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const step = allSteps[currentIndex];
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === allSteps.length - 1;

  const handleFinish = () => {
    localStorage.setItem('sistur_tutorial_seen', 'true');
    onClose();
  };

  const handleSkip = () => {
    localStorage.setItem('sistur_tutorial_seen', 'true');
    onClose();
  };

  const handleGoToPage = () => {
    if (step?.route) {
      handleFinish();
      navigate(step.route);
    }
  };

  if (!step) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleSkip(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-5 w-5 text-primary" />
            <Badge variant="outline" className="text-xs">
              {currentIndex + 1} / {allSteps.length}
            </Badge>
            <Badge variant="secondary" className="text-xs ml-auto">
              {(step as any).categoryTitle}
            </Badge>
          </div>
          <DialogTitle className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <step.icon className="h-4 w-4 text-primary" />
            </div>
            {step.title}
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed pt-2">
            {step.description}
          </DialogDescription>
        </DialogHeader>

        {/* Progress dots */}
        <div className="flex justify-center gap-1.5 py-2">
          {allSteps.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={cn(
                'h-2 rounded-full transition-all',
                i === currentIndex ? 'w-6 bg-primary' : 'w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50'
              )}
            />
          ))}
        </div>

        <DialogFooter className="flex-row justify-between sm:justify-between gap-2">
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={handleSkip}>
              Pular tutorial
            </Button>
          </div>
          <div className="flex gap-2">
            {step.route && (
              <Button variant="outline" size="sm" onClick={handleGoToPage}>
                Acessar
              </Button>
            )}
            {!isFirst && (
              <Button variant="outline" size="sm" onClick={() => setCurrentIndex(i => i - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}
            {isLast ? (
              <Button size="sm" onClick={handleFinish}>
                Concluir
              </Button>
            ) : (
              <Button size="sm" onClick={() => setCurrentIndex(i => i + 1)}>
                Próximo
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
