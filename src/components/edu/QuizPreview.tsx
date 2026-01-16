import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  HelpCircle, 
  CheckCircle, 
  XCircle, 
  Lightbulb,
  ChevronRight,
  ChevronLeft,
  RotateCcw,
} from 'lucide-react';
import { PILLAR_INFO, type Pillar } from '@/types/sistur';

interface QuizOption {
  option_id: string;
  option_label: string;
  option_text: string;
  is_correct: boolean;
  feedback_text?: string | null;
}

interface QuizQuestion {
  quiz_id: string;
  stem: string;
  question_type: 'multiple_choice' | 'true_false' | 'essay';
  pillar: Pillar;
  difficulty?: number;
  explanation?: string | null;
  options?: QuizOption[];
}

interface QuizPreviewProps {
  questions: QuizQuestion[];
  onComplete?: (score: number, total: number) => void;
  showAnswersImmediately?: boolean;
}

export function QuizPreview({
  questions,
  onComplete,
  showAnswersImmediately = true,
}: QuizPreviewProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showResults, setShowResults] = useState<Record<string, boolean>>({});
  const [essayAnswers, setEssayAnswers] = useState<Record<string, string>>({});
  const [isComplete, setIsComplete] = useState(false);

  const currentQuestion = questions[currentIndex];
  const totalQuestions = questions.length;

  const handleAnswer = (questionId: string, optionId: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: optionId }));
    
    if (showAnswersImmediately) {
      setShowResults(prev => ({ ...prev, [questionId]: true }));
    }
  };

  const handleEssayChange = (questionId: string, text: string) => {
    setEssayAnswers(prev => ({ ...prev, [questionId]: text }));
  };

  const handleNext = () => {
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      // Calculate final score
      let correct = 0;
      questions.forEach(q => {
        if (q.question_type !== 'essay') {
          const selectedOption = q.options?.find(o => o.option_id === answers[q.quiz_id]);
          if (selectedOption?.is_correct) correct++;
        }
      });
      setIsComplete(true);
      onComplete?.(correct, totalQuestions);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const handleReset = () => {
    setCurrentIndex(0);
    setAnswers({});
    setShowResults({});
    setEssayAnswers({});
    setIsComplete(false);
  };

  const getSelectedAnswer = (questionId: string) => answers[questionId];
  const isAnswered = (questionId: string) => !!answers[questionId] || !!essayAnswers[questionId];
  const isCorrect = (questionId: string) => {
    const question = questions.find(q => q.quiz_id === questionId);
    const selectedOption = question?.options?.find(o => o.option_id === answers[questionId]);
    return selectedOption?.is_correct;
  };

  const getDifficultyLabel = (difficulty?: number) => {
    if (!difficulty) return null;
    if (difficulty <= 1) return { label: 'Fácil', color: 'bg-green-500/20 text-green-700' };
    if (difficulty <= 2) return { label: 'Médio', color: 'bg-yellow-500/20 text-yellow-700' };
    return { label: 'Difícil', color: 'bg-red-500/20 text-red-700' };
  };

  if (isComplete) {
    const correctCount = questions.filter(q => {
      if (q.question_type === 'essay') return false;
      const selected = q.options?.find(o => o.option_id === answers[q.quiz_id]);
      return selected?.is_correct;
    }).length;
    const percentage = Math.round((correctCount / totalQuestions) * 100);

    return (
      <Card>
        <CardHeader className="text-center">
          <div className={`mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-4 ${
            percentage >= 70 ? 'bg-green-500/20 text-green-600' : 'bg-red-500/20 text-red-600'
          }`}>
            {percentage >= 70 ? (
              <CheckCircle className="h-10 w-10" />
            ) : (
              <XCircle className="h-10 w-10" />
            )}
          </div>
          <CardTitle className="text-2xl">
            {percentage >= 70 ? 'Parabéns!' : 'Continue estudando!'}
          </CardTitle>
          <CardDescription>
            Você acertou {correctCount} de {totalQuestions} questões ({percentage}%)
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Button onClick={handleReset}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Tentar Novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!currentQuestion) {
    return (
      <Card className="py-12">
        <CardContent className="text-center">
          <HelpCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Nenhuma questão disponível</p>
        </CardContent>
      </Card>
    );
  }

  const difficulty = getDifficultyLabel(currentQuestion.difficulty);
  const showResult = showResults[currentQuestion.quiz_id];
  const selectedAnswer = getSelectedAnswer(currentQuestion.quiz_id);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Badge className={`${
              currentQuestion.pillar === 'RA' ? 'bg-emerald-500/20 text-emerald-700' :
              currentQuestion.pillar === 'OE' ? 'bg-blue-500/20 text-blue-700' :
              'bg-amber-500/20 text-amber-700'
            }`}>
              {PILLAR_INFO[currentQuestion.pillar].name}
            </Badge>
            {difficulty && (
              <Badge className={difficulty.color}>{difficulty.label}</Badge>
            )}
          </div>
          <span className="text-sm text-muted-foreground">
            Questão {currentIndex + 1} de {totalQuestions}
          </span>
        </div>
        <CardTitle className="text-lg leading-relaxed">
          {currentQuestion.stem}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {currentQuestion.question_type === 'essay' ? (
          <Textarea
            placeholder="Digite sua resposta..."
            value={essayAnswers[currentQuestion.quiz_id] || ''}
            onChange={(e) => handleEssayChange(currentQuestion.quiz_id, e.target.value)}
            rows={6}
          />
        ) : (
          <RadioGroup
            value={selectedAnswer}
            onValueChange={(value) => handleAnswer(currentQuestion.quiz_id, value)}
            className="space-y-3"
          >
            {currentQuestion.options?.map((option) => {
              const isSelected = selectedAnswer === option.option_id;
              const showFeedback = showResult && isSelected;
              
              return (
                <div
                  key={option.option_id}
                  className={`flex items-start space-x-3 p-4 rounded-lg border transition-all ${
                    showFeedback
                      ? option.is_correct
                        ? 'border-green-500 bg-green-500/10'
                        : 'border-red-500 bg-red-500/10'
                      : isSelected
                        ? 'border-primary bg-primary/5'
                        : 'border-muted hover:border-primary/50'
                  }`}
                >
                  <RadioGroupItem 
                    value={option.option_id} 
                    id={option.option_id}
                    disabled={showResult}
                  />
                  <div className="flex-1">
                    <Label 
                      htmlFor={option.option_id}
                      className="text-sm cursor-pointer"
                    >
                      <span className="font-semibold mr-2">{option.option_label}.</span>
                      {option.option_text}
                    </Label>
                    {showFeedback && option.feedback_text && (
                      <p className="mt-2 text-sm text-muted-foreground">
                        {option.feedback_text}
                      </p>
                    )}
                  </div>
                  {showFeedback && (
                    <div className="ml-auto">
                      {option.is_correct ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600" />
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </RadioGroup>
        )}

        {/* Explanation */}
        {showResult && currentQuestion.explanation && (
          <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
            <div className="flex items-start gap-2">
              <Lightbulb className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <p className="font-medium text-blue-700 text-sm">Explicação</p>
                <p className="text-sm text-blue-600/80 mt-1">
                  {currentQuestion.explanation}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={handlePrev}
            disabled={currentIndex === 0}
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Anterior
          </Button>
          <Button
            onClick={handleNext}
            disabled={!isAnswered(currentQuestion.quiz_id)}
          >
            {currentIndex === totalQuestions - 1 ? 'Finalizar' : 'Próxima'}
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
