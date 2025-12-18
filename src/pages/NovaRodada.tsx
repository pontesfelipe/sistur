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
  Loader2,
  Shield,
  Calculator,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { useDestinations } from '@/hooks/useDestinations';
import { useAssessments } from '@/hooks/useAssessments';
import { toast } from '@/hooks/use-toast';
import { DestinationFormDialog } from '@/components/destinations/DestinationFormDialog';
import { DataValidationPanel } from '@/components/official-data/DataValidationPanel';
import { useAuth } from '@/hooks/useAuth';
import { ExternalIndicatorValue, useCreateDataSnapshot } from '@/hooks/useOfficialData';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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
    title: 'Pré-preenchimento',
    description: 'Validar dados oficiais',
    icon: Shield,
  },
  {
    id: 4,
    title: 'Preenchimento',
    description: 'Complementar dados manualmente',
    icon: Database,
  },
  {
    id: 5,
    title: 'Cálculo',
    description: 'Processar diagnóstico',
    icon: Calculator,
  },
  {
    id: 6,
    title: 'Relatório',
    description: 'Gerar plano de desenvolvimento',
    icon: FileText,
  },
];

export default function NovaRodada() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [destinationMode, setDestinationMode] = useState<'select' | 'create'>('select');
  const [selectedDestination, setSelectedDestination] = useState<string>('');
  const [isDestinationFormOpen, setIsDestinationFormOpen] = useState(false);
  const [assessmentTitle, setAssessmentTitle] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [createdAssessmentId, setCreatedAssessmentId] = useState<string | null>(null);
  const [validatedDataCount, setValidatedDataCount] = useState(0);

  // Fetch user profile to get org_id
  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { destinations = [], isLoading: destinationsLoading, createDestination } = useDestinations();
  const { createAssessment } = useAssessments();
  const createDataSnapshot = useCreateDataSnapshot();

  // Get selected destination details
  const selectedDestinationData = destinations.find(d => d.id === selectedDestination);

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

  const handleValidationComplete = async (validatedValues: ExternalIndicatorValue[]) => {
    setValidatedDataCount(validatedValues.length);
    
    // Create snapshot if assessment exists
    if (createdAssessmentId && profile?.org_id) {
      await createDataSnapshot.mutateAsync({
        assessmentId: createdAssessmentId,
        values: validatedValues,
        orgId: profile.org_id,
      });
    }
    
    toast({
      title: 'Dados validados',
      description: `${validatedValues.length} indicadores validados com sucesso.`,
    });
  };

  const handleNextStep = async () => {
    if (currentStep === 1) {
      // Validate destination
      if (!selectedDestination) {
        toast({ title: 'Selecione um destino', variant: 'destructive' });
        return;
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
      // Pre-filling validation complete - proceed to manual data entry
      setCurrentStep(4);
    } else if (currentStep === 4) {
      // Go to data entry page
      navigate(`/importacoes?assessment=${createdAssessmentId}`);
    } else if (currentStep === 5) {
      // Go to assessment detail to calculate
      navigate(`/diagnosticos/${createdAssessmentId}`);
    } else if (currentStep === 6) {
      // Go to reports
      navigate(`/relatorios?assessment=${createdAssessmentId}`);
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleCreateDestination = async (data: { name: string; uf: string; ibge_code?: string | null; latitude?: number | null; longitude?: number | null }) => {
    const result = await createDestination.mutateAsync(data);
    setSelectedDestination(result.id);
    setDestinationMode('select');
    toast({ title: 'Destino criado com sucesso!' });
  };

  const canProceed = () => {
    if (currentStep === 1) {
      return !!selectedDestination;
    }
    if (currentStep === 2) return !!assessmentTitle && !!selectedDestination;
    if (currentStep === 3) {
      // Can always proceed from validation step (data is optional but encouraged)
      return true;
    }
    return true;
  };

  return (
    <AppLayout 
      title="Nova Rodada de Diagnóstico" 
      subtitle="Siga o fluxo para criar uma nova avaliação"
    >
      {/* Visual Stepper */}
      <div className="mb-8 overflow-x-auto pb-4">
        <div className="flex items-center justify-between relative min-w-[700px]">
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
      {currentStep === 3 ? (
        // Full-width validation panel
        <div className="space-y-6">
          {selectedDestinationData?.ibge_code && profile?.org_id ? (
            <DataValidationPanel
              ibgeCode={selectedDestinationData.ibge_code}
              orgId={profile.org_id}
              destinationName={selectedDestinationData.name}
              onValidationComplete={handleValidationComplete}
            />
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h4 className="font-medium mb-2">Código IBGE não disponível</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  O destino selecionado não possui código IBGE cadastrado. 
                  O pré-preenchimento automático requer o código IBGE para buscar dados oficiais.
                </p>
                <p className="text-sm text-muted-foreground">
                  Você pode prosseguir para preenchimento manual ou editar o destino para adicionar o código IBGE.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Navigation for step 3 */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={handlePreviousStep}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar
                </Button>
                <Button onClick={handleNextStep}>
                  {validatedDataCount > 0 
                    ? `Continuar (${validatedDataCount} validados)` 
                    : 'Pular para Preenchimento Manual'}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
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
                    onClick={() => {
                      setDestinationMode('create');
                      setIsDestinationFormOpen(true);
                    }}
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
                            {dest.ibge_code ? ` (IBGE: ${dest.ibge_code})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedDestinationData && !selectedDestinationData.ibge_code && (
                      <p className="text-xs text-amber-600 dark:text-amber-400">
                        ⚠️ Este destino não possui código IBGE. O pré-preenchimento automático não estará disponível.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {selectedDestination ? (
                      <div className="p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                        <p className="text-sm text-green-700 dark:text-green-300 flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4" />
                          <strong>Destino criado:</strong>{' '}
                          {destinations.find(d => d.id === selectedDestination)?.name}
                        </p>
                        <Button 
                          variant="link" 
                          className="p-0 h-auto text-green-700 dark:text-green-300"
                          onClick={() => setIsDestinationFormOpen(true)}
                        >
                          Criar outro destino
                        </Button>
                      </div>
                    ) : (
                      <div className="p-4 bg-muted/50 rounded-lg text-center">
                        <p className="text-sm text-muted-foreground mb-3">
                          Clique no botão abaixo para criar um novo destino com busca automática no IBGE.
                        </p>
                        <Button onClick={() => setIsDestinationFormOpen(true)}>
                          <Plus className="h-4 w-4 mr-2" />
                          Criar Destino
                        </Button>
                      </div>
                    )}
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
                    {selectedDestinationData?.name || 'Novo destino'}
                    {selectedDestinationData?.ibge_code && (
                      <span className="text-green-600 dark:text-green-400 ml-2">
                        ✓ Código IBGE disponível
                      </span>
                    )}
                  </p>
                </div>
              </div>
            )}

            {/* Step 4: Data Entry Info */}
            {currentStep === 4 && (
              <div className="space-y-4">
                <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                  <h4 className="font-medium mb-2">Próximo passo: Complementar dados</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Você será direcionado para a página de importação onde poderá:
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-2">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-severity-good" />
                      Importar dados adicionais via arquivo CSV
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-severity-good" />
                      Preencher dados manualmente por formulário
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-severity-good" />
                      Complementar indicadores não cobertos pelas fontes oficiais
                    </li>
                  </ul>
                </div>
                {validatedDataCount > 0 && (
                  <div className="p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                    <p className="text-sm text-green-700 dark:text-green-300 flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      <strong>{validatedDataCount} indicadores</strong> já foram pré-preenchidos e validados com dados oficiais.
                    </p>
                  </div>
                )}
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm">
                    <strong>Diagnóstico criado:</strong> {assessmentTitle}
                  </p>
                </div>
              </div>
            )}

            {/* Step 5: Calculate Info */}
            {currentStep === 5 && (
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

            {/* Step 6: Report Info */}
            {currentStep === 6 && (
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
                {currentStep < 4 ? 'Continuar' : 'Ir para ' + WORKFLOW_STEPS[currentStep - 1].title}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Destination Form Dialog */}
      <DestinationFormDialog
        open={isDestinationFormOpen}
        onOpenChange={setIsDestinationFormOpen}
        onSubmit={handleCreateDestination}
      />
    </AppLayout>
  );
}
