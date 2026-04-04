import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  ArrowRight,
  ArrowLeft,
  Loader2,
  Shield,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { DataValidationPanel } from '@/components/official-data/DataValidationPanel';
import { EnterpriseDataEntryPanel } from '@/components/enterprise/EnterpriseDataEntryPanel';
import { DataImportPanel } from '@/components/diagnostics/DataImportPanel';
import { EnterpriseProfileStep } from '@/components/enterprise/EnterpriseProfileStep';

type DiagnosticType = 'territorial' | 'enterprise';
type DiagnosisTier = 'COMPLETE' | 'MEDIUM' | 'SMALL';

interface NovaRodadaDialogsProps {
  currentStep: number;
  diagnosticType: DiagnosticType;
  selectedDestinationData: any;
  selectedTier: DiagnosisTier;
  createdAssessmentId: string | null;
  validatedDataCount: number;
  orgId: string | null;
  onSetCurrentStep: (step: number) => void;
  onPreviousStep: () => void;
  onNextStep: () => void;
  onValidationComplete: (values: any[]) => void;
  resumeAssessmentId: string | null;
  resumeAssessment: any;
}

export function NovaRodadaDialogs({
  currentStep,
  diagnosticType,
  selectedDestinationData,
  selectedTier,
  createdAssessmentId,
  validatedDataCount,
  orgId,
  onSetCurrentStep,
  onPreviousStep,
  onNextStep,
  onValidationComplete,
  resumeAssessmentId,
  resumeAssessment,
}: NovaRodadaDialogsProps) {
  return (
    <div className="space-y-6">
      {/* Resume Banner */}
      {resumeAssessmentId && resumeAssessment && currentStep === 4 && null}

      {/* Step 4: Pre-filling / Enterprise Profile */}
      {currentStep === 4 && (
        diagnosticType === 'enterprise' ? (
          selectedDestinationData ? (
            <EnterpriseProfileStep
              destinationId={selectedDestinationData.id}
              destinationName={selectedDestinationData.name}
              onComplete={() => onSetCurrentStep(5)}
              onBack={onPreviousStep}
            />
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">Carregando destino...</p>
              </CardContent>
            </Card>
          )
        ) : (
          selectedDestinationData?.ibge_code && orgId ? (
            <DataValidationPanel
              ibgeCode={selectedDestinationData.ibge_code}
              orgId={orgId}
              destinationName={selectedDestinationData.name}
              onValidationComplete={onValidationComplete}
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
          )
        )
      )}

      {/* Step 5 Enterprise: KPI Data Entry */}
      {currentStep === 5 && diagnosticType === 'enterprise' && (
        createdAssessmentId ? (
          <EnterpriseDataEntryPanel
            assessmentId={createdAssessmentId}
            tier={selectedTier}
            onComplete={() => onSetCurrentStep(6)}
          />
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">Carregando diagnóstico...</p>
            </CardContent>
          </Card>
        )
      )}

      {/* Step 5 Territorial: Indicator Data Entry */}
      {currentStep === 5 && diagnosticType === 'territorial' && (
        createdAssessmentId ? (
          <DataImportPanel preSelectedAssessmentId={createdAssessmentId} />
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">Carregando diagnóstico...</p>
            </CardContent>
          </Card>
        )
      )}

      {/* Navigation for step 4 */}
      {currentStep === 4 && diagnosticType !== 'enterprise' && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between">
              <Button variant="outline" onClick={onPreviousStep}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
              <Button onClick={onNextStep}>
                {validatedDataCount > 0 
                  ? `Continuar (${validatedDataCount} validados)` 
                  : 'Pular para Preenchimento Manual'}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation for step 5 */}
      {currentStep === 5 && (
        <Card className="mt-4">
          <CardContent className="pt-6">
            <div className="flex justify-between">
              <Button variant="outline" onClick={onPreviousStep}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
              <Button onClick={onNextStep}>
                Continuar para Cálculo
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
