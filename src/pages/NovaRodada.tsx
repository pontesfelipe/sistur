import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  MapPin, 
  ClipboardList, 
  Database, 
  FileText, 
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Plus,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { useDestinations } from '@/hooks/useDestinations';
import { useAssessments } from '@/hooks/useAssessments';
import { toast } from '@/hooks/use-toast';

interface WorkflowStep {
  id: number;
  title: string;
  description: string;
  icon: React.ElementType;
}

const WORKFLOW_STEPS: WorkflowStep[] = [
  {
    id: 1,
    title: 'Destino',
    description: 'Selecione ou crie um destino',
    icon: MapPin,
  },
  {
    id: 2,
    title: 'Diagnóstico',
    description: 'Configure a rodada de avaliação',
    icon: ClipboardList,
  },
  {
    id: 3,
    title: 'Preenchimento',
    description: 'Importe ou preencha os dados',
    icon: Database,
  },
  {
    id: 4,
    title: 'Cálculo',
    description: 'Processar diagnóstico',
    icon: CheckCircle2,
  },
  {
    id: 5,
    title: 'Relatório',
    description: 'Gerar plano de desenvolvimento',
    icon: FileText,
  },
];

export default function NovaRodada() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [destinationMode, setDestinationMode] = useState<'select' | 'create'>('select');
  const [selectedDestination, setSelectedDestination] = useState<string>('');
  const [newDestination, setNewDestination] = useState({ name: '', uf: '' });
  const [assessmentTitle, setAssessmentTitle] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [createdAssessmentId, setCreatedAssessmentId] = useState<string | null>(null);

  const { destinations = [], isLoading: destinationsLoading, createDestination } = useDestinations();
  const { createAssessment } = useAssessments();

  // Auto-generate assessment title when destination is selected
  useEffect(() => {
    if (selectedDestination) {
      const dest = destinations.find(d => d.id === selectedDestination);
      if (dest) {
        const year = new Date().getFullYear();
        setAssessmentTitle(`Diagnóstico ${dest.name} ${year}`);
      }
    }
  }, [selectedDestination, destinations]);

  const handleNextStep = async () => {
    if (currentStep === 1) {
      // Validate destination
      if (destinationMode === 'select' && !selectedDestination) {
        toast({ title: 'Selecione um destino', variant: 'destructive' });
        return;
      }
      if (destinationMode === 'create') {
        if (!newDestination.name) {
          toast({ title: 'Informe o nome do destino', variant: 'destructive' });
          return;
        }
        // Create new destination
        try {
          const result = await createDestination.mutateAsync({
            name: newDestination.name,
            uf: newDestination.uf || '',
          });
          setSelectedDestination(result.id);
          toast({ title: 'Destino criado com sucesso!' });
        } catch (error) {
          toast({ title: 'Erro ao criar destino', variant: 'destructive' });
          return;
        }
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      // Create assessment
      if (!assessmentTitle) {
        toast({ title: 'Informe o título do diagnóstico', variant: 'destructive' });
        return;
      }
      try {
        const result = await createAssessment.mutateAsync({
          title: assessmentTitle,
          destination_id: selectedDestination,
          period_start: periodStart || null,
          period_end: periodEnd || null,
        });
        setCreatedAssessmentId(result.id);
        toast({ title: 'Diagnóstico criado com sucesso!' });
        setCurrentStep(3);
      } catch (error) {
        toast({ title: 'Erro ao criar diagnóstico', variant: 'destructive' });
        return;
      }
    } else if (currentStep === 3) {
      // Go to data entry page
      navigate(`/importacoes?assessment=${createdAssessmentId}`);
    } else if (currentStep === 4) {
      // Go to assessment detail to calculate
      navigate(`/diagnosticos/${createdAssessmentId}`);
    } else if (currentStep === 5) {
      // Go to reports
      navigate(`/relatorios?assessment=${createdAssessmentId}`);
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const canProceed = () => {
    if (currentStep === 1) {
      if (destinationMode === 'select') return !!selectedDestination;
      return !!newDestination.name;
    }
    if (currentStep === 2) return !!assessmentTitle && !!selectedDestination;
    return true;
  };

  return (
    <AppLayout 
      title="Nova Rodada de Diagnóstico" 
      subtitle="Siga o fluxo para criar uma nova avaliação"
    >
      {/* Visual Stepper */}
      <div className="mb-8">
        <div className="flex items-center justify-between relative">
          {/* Progress Line Background */}
          <div className="absolute top-6 left-0 right-0 h-1 bg-muted" />
          {/* Progress Line Filled */}
          <div 
            className="absolute top-6 left-0 h-1 bg-primary transition-all duration-500"
            style={{ width: `${((currentStep - 1) / (WORKFLOW_STEPS.length - 1)) * 100}%` }}
          />
          
          {WORKFLOW_STEPS.map((step) => {
            const Icon = step.icon;
            const isCompleted = step.id < currentStep;
            const isCurrent = step.id === currentStep;
            const isUpcoming = step.id > currentStep;
            
            return (
              <div 
                key={step.id} 
                className="relative flex flex-col items-center z-10"
              >
                <div 
                  className={cn(
                    'w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300',
                    isCompleted && 'bg-primary text-primary-foreground',
                    isCurrent && 'bg-primary text-primary-foreground ring-4 ring-primary/30',
                    isUpcoming && 'bg-muted text-muted-foreground'
                  )}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="h-6 w-6" />
                  ) : (
                    <Icon className="h-5 w-5" />
                  )}
                </div>
                <div className="mt-2 text-center">
                  <p className={cn(
                    'text-sm font-medium',
                    isCurrent && 'text-primary',
                    isUpcoming && 'text-muted-foreground'
                  )}>
                    {step.title}
                  </p>
                  <p className="text-xs text-muted-foreground hidden md:block">
                    {step.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {(() => {
              const step = WORKFLOW_STEPS.find(s => s.id === currentStep);
              const Icon = step?.icon || MapPin;
              return (
                <>
                  <Icon className="h-5 w-5 text-primary" />
                  Passo {currentStep}: {step?.title}
                </>
              );
            })()}
          </CardTitle>
          <CardDescription>
            {WORKFLOW_STEPS.find(s => s.id === currentStep)?.description}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 1: Destination */}
          {currentStep === 1 && (
            <>
              <div className="flex gap-4 mb-4">
                <Button
                  variant={destinationMode === 'select' ? 'default' : 'outline'}
                  onClick={() => setDestinationMode('select')}
                  className="flex-1"
                >
                  Selecionar existente
                </Button>
                <Button
                  variant={destinationMode === 'create' ? 'default' : 'outline'}
                  onClick={() => setDestinationMode('create')}
                  className="flex-1"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Criar novo
                </Button>
              </div>

              {destinationMode === 'select' ? (
                <div className="space-y-2">
                  <Label>Destino turístico</Label>
                  <Select value={selectedDestination} onValueChange={setSelectedDestination}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um destino" />
                    </SelectTrigger>
                    <SelectContent>
                      {destinations.map((dest) => (
                        <SelectItem key={dest.id} value={dest.id}>
                          {dest.name} {dest.uf ? `- ${dest.uf}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Nome do destino *</Label>
                    <Input
                      placeholder="Ex: Bonito"
                      value={newDestination.name}
                      onChange={(e) => setNewDestination({ ...newDestination, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>UF (opcional)</Label>
                    <Input
                      placeholder="Ex: MS"
                      maxLength={2}
                      value={newDestination.uf}
                      onChange={(e) => setNewDestination({ ...newDestination, uf: e.target.value.toUpperCase() })}
                    />
                  </div>
                </div>
              )}
            </>
          )}

          {/* Step 2: Assessment */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Título do diagnóstico *</Label>
                <Input
                  placeholder="Ex: Diagnóstico Bonito 2024"
                  value={assessmentTitle}
                  onChange={(e) => setAssessmentTitle(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Período início (opcional)</Label>
                  <Input
                    type="date"
                    value={periodStart}
                    onChange={(e) => setPeriodStart(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Período fim (opcional)</Label>
                  <Input
                    type="date"
                    value={periodEnd}
                    onChange={(e) => setPeriodEnd(e.target.value)}
                  />
                </div>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>Destino selecionado:</strong>{' '}
                  {destinations.find(d => d.id === selectedDestination)?.name || 'Novo destino'}
                </p>
              </div>
            </div>
          )}

          {/* Step 3: Data Entry Info */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                <h4 className="font-medium mb-2">Próximo passo: Preencher dados</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Você será direcionado para a página de importação onde poderá:
                </p>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-severity-good" />
                    Importar dados via arquivo CSV
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-severity-good" />
                    Preencher dados manualmente por formulário
                  </li>
                </ul>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm">
                  <strong>Diagnóstico criado:</strong> {assessmentTitle}
                </p>
              </div>
            </div>
          )}

          {/* Step 4: Calculate Info */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <div className="p-4 bg-accent/10 rounded-lg border border-accent/20">
                <h4 className="font-medium mb-2">Calcular diagnóstico</h4>
                <p className="text-sm text-muted-foreground">
                  Após preencher os dados, você poderá calcular o diagnóstico na página de detalhes.
                  O sistema irá:
                </p>
                <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                  <li>• Normalizar os indicadores</li>
                  <li>• Calcular scores dos pilares (RA, OE, AO)</li>
                  <li>• Identificar gargalos</li>
                  <li>• Gerar prescrições de capacitação</li>
                </ul>
              </div>
            </div>
          )}

          {/* Step 5: Report Info */}
          {currentStep === 5 && (
            <div className="space-y-4">
              <div className="p-4 bg-severity-good/10 rounded-lg border border-severity-good/20">
                <h4 className="font-medium mb-2">Gerar relatório</h4>
                <p className="text-sm text-muted-foreground">
                  Com o diagnóstico calculado, você poderá gerar um plano de desenvolvimento 
                  turístico personalizado usando inteligência artificial.
                </p>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-4 border-t">
            <Button
              variant="outline"
              onClick={handlePreviousStep}
              disabled={currentStep === 1}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <Button
              onClick={handleNextStep}
              disabled={!canProceed() || createDestination.isPending || createAssessment.isPending}
            >
              {(createDestination.isPending || createAssessment.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {currentStep < 3 ? 'Continuar' : 'Ir para ' + WORKFLOW_STEPS[currentStep - 1].title}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
