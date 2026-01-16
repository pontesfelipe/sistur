import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronLeft, 
  ChevronRight, 
  Sparkles, 
  User, 
  Target, 
  BookOpen, 
  Clock,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import {
  useStudentProfile,
  useGenerateRecommendations,
  OCCUPATION_AREAS,
  EXPERIENCE_LEVELS,
  THEME_OPTIONS,
  LEARNING_GOALS,
  FORMAT_OPTIONS,
  type StudentProfileInput,
} from '@/hooks/useStudentProfile';

const STEPS = [
  { id: 'intro', title: 'Bem-vindo', icon: User },
  { id: 'professional', title: 'Perfil Profissional', icon: User },
  { id: 'interests', title: 'Interesses', icon: Target },
  { id: 'preferences', title: 'Preferências', icon: BookOpen },
  { id: 'complete', title: 'Concluído', icon: CheckCircle2 },
];

const PILLARS = [
  { value: 'RA', label: 'Relações Ambientais', color: 'bg-pillar-ra', description: 'Sustentabilidade e meio ambiente' },
  { value: 'OE', label: 'Organização Estrutural', color: 'bg-pillar-oe', description: 'Governança e planejamento' },
  { value: 'AO', label: 'Ações Operacionais', color: 'bg-pillar-ao', description: 'Marketing e operações' },
];

interface StudentProfileWizardProps {
  onComplete?: () => void;
  onCancel?: () => void;
}

export function StudentProfileWizard({ onComplete, onCancel }: StudentProfileWizardProps) {
  const navigate = useNavigate();
  const { profile, saveProfile, isProfileComplete } = useStudentProfile();
  const generateRecommendations = useGenerateRecommendations();
  
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<StudentProfileInput>({
    occupation_area: profile?.occupation_area || '',
    experience_level: profile?.experience_level || '',
    job_role: profile?.job_role || '',
    interest_pillars: profile?.interest_pillars || [],
    interest_themes: profile?.interest_themes || [],
    preferred_format: profile?.preferred_format || 'mixed',
    available_hours_per_week: profile?.available_hours_per_week || 5,
    learning_goals: profile?.learning_goals || [],
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const progress = ((currentStep + 1) / STEPS.length) * 100;

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handlePillarToggle = (pillar: string) => {
    const current = formData.interest_pillars || [];
    if (current.includes(pillar)) {
      setFormData({
        ...formData,
        interest_pillars: current.filter((p) => p !== pillar),
      });
    } else {
      setFormData({
        ...formData,
        interest_pillars: [...current, pillar],
      });
    }
  };

  const handleThemeToggle = (theme: string) => {
    const current = formData.interest_themes || [];
    if (current.includes(theme)) {
      setFormData({
        ...formData,
        interest_themes: current.filter((t) => t !== theme),
      });
    } else {
      setFormData({
        ...formData,
        interest_themes: [...current, theme],
      });
    }
  };

  const handleGoalToggle = (goal: string) => {
    const current = formData.learning_goals || [];
    if (current.includes(goal)) {
      setFormData({
        ...formData,
        learning_goals: current.filter((g) => g !== goal),
      });
    } else {
      setFormData({
        ...formData,
        learning_goals: [...current, goal],
      });
    }
  };

  const handleComplete = async () => {
    setIsSubmitting(true);
    try {
      const savedProfile = await saveProfile.mutateAsync(formData);
      
      // Generate recommendations
      if (savedProfile?.id) {
        await generateRecommendations.mutateAsync(savedProfile.id);
      }
      
      handleNext();
      
      if (onComplete) {
        setTimeout(onComplete, 2000);
      }
    } catch (error) {
      console.error('Error saving profile:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const canProceed = () => {
    switch (STEPS[currentStep].id) {
      case 'intro':
        return true;
      case 'professional':
        return !!formData.occupation_area && !!formData.experience_level;
      case 'interests':
        return (formData.interest_pillars?.length || 0) > 0;
      case 'preferences':
        return true;
      default:
        return true;
    }
  };

  const renderStepContent = () => {
    switch (STEPS[currentStep].id) {
      case 'intro':
        return (
          <div className="text-center space-y-6 py-8">
            <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-10 w-10 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Personalize sua Jornada de Aprendizado</h2>
              <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                Responda algumas perguntas rápidas para que possamos recomendar 
                cursos e trilhas que se encaixem perfeitamente no seu perfil.
              </p>
            </div>
            <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>~2 minutos</span>
              </div>
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                <span>Recomendações personalizadas</span>
              </div>
            </div>
          </div>
        );

      case 'professional':
        return (
          <div className="space-y-6">
            <div>
              <Label className="text-base font-medium">Qual é sua área de atuação?</Label>
              <RadioGroup
                value={formData.occupation_area || ''}
                onValueChange={(value) => setFormData({ ...formData, occupation_area: value })}
                className="grid grid-cols-2 gap-3 mt-3"
              >
                {OCCUPATION_AREAS.map((area) => (
                  <div key={area.value}>
                    <RadioGroupItem
                      value={area.value}
                      id={`area-${area.value}`}
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor={`area-${area.value}`}
                      className="flex items-center justify-center rounded-lg border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer transition-colors"
                    >
                      {area.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div>
              <Label className="text-base font-medium">Qual seu nível de experiência?</Label>
              <RadioGroup
                value={formData.experience_level || ''}
                onValueChange={(value) => setFormData({ ...formData, experience_level: value })}
                className="grid gap-3 mt-3"
              >
                {EXPERIENCE_LEVELS.map((level) => (
                  <div key={level.value}>
                    <RadioGroupItem
                      value={level.value}
                      id={`level-${level.value}`}
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor={`level-${level.value}`}
                      className="flex flex-col items-start rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer transition-colors"
                    >
                      <span className="font-medium">{level.label}</span>
                      <span className="text-sm text-muted-foreground">{level.description}</span>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div>
              <Label htmlFor="job_role" className="text-base font-medium">
                Cargo/Função (opcional)
              </Label>
              <Input
                id="job_role"
                placeholder="Ex: Analista de Turismo, Secretário de Cultura..."
                value={formData.job_role || ''}
                onChange={(e) => setFormData({ ...formData, job_role: e.target.value })}
                className="mt-2"
              />
            </div>
          </div>
        );

      case 'interests':
        return (
          <div className="space-y-6">
            <div>
              <Label className="text-base font-medium">
                Quais pilares do turismo sustentável te interessam?
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                Selecione um ou mais pilares
              </p>
              <div className="grid gap-3 mt-3">
                {PILLARS.map((pillar) => (
                  <div
                    key={pillar.value}
                    onClick={() => handlePillarToggle(pillar.value)}
                    className={`flex items-center gap-4 rounded-lg border-2 p-4 cursor-pointer transition-colors ${
                      formData.interest_pillars?.includes(pillar.value)
                        ? 'border-primary bg-primary/5'
                        : 'border-muted hover:border-primary/50'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full ${pillar.color}`} />
                    <div className="flex-1">
                      <span className="font-medium">{pillar.label}</span>
                      <p className="text-sm text-muted-foreground">{pillar.description}</p>
                    </div>
                    <Checkbox
                      checked={formData.interest_pillars?.includes(pillar.value) || false}
                      className="pointer-events-none"
                    />
                  </div>
                ))}
              </div>
            </div>

            {(formData.interest_pillars?.length || 0) > 0 && (
              <div>
                <Label className="text-base font-medium">Temas específicos de interesse</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Selecione os temas que mais te atraem
                </p>
                <div className="space-y-4 mt-3">
                  {formData.interest_pillars?.map((pillar) => (
                    <div key={pillar}>
                      <Badge variant="outline" className="mb-2">
                        {PILLARS.find((p) => p.value === pillar)?.label}
                      </Badge>
                      <div className="flex flex-wrap gap-2">
                        {THEME_OPTIONS[pillar as keyof typeof THEME_OPTIONS]?.map((theme) => (
                          <Badge
                            key={theme.value}
                            variant={formData.interest_themes?.includes(theme.value) ? 'default' : 'outline'}
                            className="cursor-pointer"
                            onClick={() => handleThemeToggle(theme.value)}
                          >
                            {theme.label}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 'preferences':
        return (
          <div className="space-y-6">
            <div>
              <Label className="text-base font-medium">Formato de aprendizado preferido</Label>
              <RadioGroup
                value={formData.preferred_format || 'mixed'}
                onValueChange={(value) => setFormData({ ...formData, preferred_format: value })}
                className="grid grid-cols-2 gap-3 mt-3"
              >
                {FORMAT_OPTIONS.map((format) => (
                  <div key={format.value}>
                    <RadioGroupItem
                      value={format.value}
                      id={`format-${format.value}`}
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor={`format-${format.value}`}
                      className="flex items-center justify-center gap-2 rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer transition-colors"
                    >
                      <span className="text-xl">{format.icon}</span>
                      <span>{format.label}</span>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div>
              <Label className="text-base font-medium">
                Quantas horas por semana você pode dedicar aos estudos?
              </Label>
              <div className="flex items-center gap-4 mt-3">
                <Input
                  type="number"
                  min={1}
                  max={40}
                  value={formData.available_hours_per_week || 5}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      available_hours_per_week: parseInt(e.target.value) || 5,
                    })
                  }
                  className="w-24"
                />
                <span className="text-muted-foreground">horas por semana</span>
              </div>
            </div>

            <div>
              <Label className="text-base font-medium">Quais são seus objetivos de aprendizado?</Label>
              <p className="text-sm text-muted-foreground mt-1">
                Selecione todos que se aplicam
              </p>
              <div className="grid grid-cols-2 gap-3 mt-3">
                {LEARNING_GOALS.map((goal) => (
                  <div
                    key={goal.value}
                    onClick={() => handleGoalToggle(goal.value)}
                    className={`flex items-center gap-3 rounded-lg border-2 p-3 cursor-pointer transition-colors ${
                      formData.learning_goals?.includes(goal.value)
                        ? 'border-primary bg-primary/5'
                        : 'border-muted hover:border-primary/50'
                    }`}
                  >
                    <Checkbox
                      checked={formData.learning_goals?.includes(goal.value) || false}
                      className="pointer-events-none"
                    />
                    <span className="text-sm">{goal.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'complete':
        return (
          <div className="text-center space-y-6 py-8">
            <div className="mx-auto w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Perfil Criado com Sucesso!</h2>
              <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                Geramos recomendações personalizadas com base no seu perfil. 
                Explore os cursos e trilhas sugeridos para você!
              </p>
            </div>
            <Button onClick={() => navigate('/edu')} className="mt-4">
              <Sparkles className="mr-2 h-4 w-4" />
              Ver Minhas Recomendações
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.id}
                  className={`flex items-center ${index > 0 ? 'ml-2' : ''}`}
                >
                  {index > 0 && (
                    <div
                      className={`h-0.5 w-8 mr-2 ${
                        index <= currentStep ? 'bg-primary' : 'bg-muted'
                      }`}
                    />
                  )}
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      index < currentStep
                        ? 'bg-primary text-primary-foreground'
                        : index === currentStep
                        ? 'bg-primary/20 text-primary border-2 border-primary'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
              );
            })}
          </div>
          {onCancel && currentStep === 0 && (
            <Button variant="ghost" size="sm" onClick={onCancel}>
              Pular
            </Button>
          )}
        </div>
        <Progress value={progress} className="h-1" />
        <CardTitle className="mt-4">{STEPS[currentStep].title}</CardTitle>
        <CardDescription>
          {currentStep === 0 && 'Vamos personalizar sua experiência de aprendizado'}
          {currentStep === 1 && 'Conte-nos sobre sua atuação profissional'}
          {currentStep === 2 && 'Quais áreas do turismo sustentável te interessam?'}
          {currentStep === 3 && 'Como você prefere aprender?'}
          {currentStep === 4 && 'Tudo pronto!'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {renderStepContent()}

        {currentStep < STEPS.length - 1 && (
          <div className="flex justify-between mt-8">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 0}
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>

            {currentStep === STEPS.length - 2 ? (
              <Button
                onClick={handleComplete}
                disabled={!canProceed() || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Gerar Recomendações
                  </>
                )}
              </Button>
            ) : (
              <Button onClick={handleNext} disabled={!canProceed()}>
                Próximo
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
