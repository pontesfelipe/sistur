import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import {
  ArrowRight,
  ArrowLeft,
  Loader2,
  Shield,
  CheckCircle2,
  RefreshCw,
  Building2,
  Star,
  Info,
} from 'lucide-react';
import { DataValidationPanel } from '@/components/official-data/DataValidationPanel';
import { EnterpriseDataEntryPanel } from '@/components/enterprise/EnterpriseDataEntryPanel';
import { DataImportPanel } from '@/components/diagnostics/DataImportPanel';
import { EnterpriseProfileStep } from '@/components/enterprise/EnterpriseProfileStep';
import { PmsCsvImportPanel } from '@/components/enterprise/PmsCsvImportPanel';
import { PmsConnectionsPanel } from '@/components/enterprise/PmsConnectionsPanel';
import { useIndicators } from '@/hooks/useIndicators';
import { useAssessmentUnits } from '@/hooks/useAssessmentUnits';
import { supabase } from '@/integrations/supabase/client';

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
  expandWithMandala?: boolean;
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
  expandWithMandala = false,
  onSetCurrentStep,
  onPreviousStep,
  onNextStep,
  onValidationComplete,
  resumeAssessmentId,
  resumeAssessment,
}: NovaRodadaDialogsProps) {
  const [reviewPreFillValues, setReviewPreFillValues] = useState<Record<string, number>>({});

  // Fase 15.4 — Tabs por unidade no Step 4/5 quando o assessment é multi-unidade.
  const activeAssessmentId = createdAssessmentId ?? resumeAssessmentId ?? null;
  const { units } = useAssessmentUnits(activeAssessmentId);
  const isMultiUnit = diagnosticType === 'enterprise' && units.length > 1;
  const orderedUnits = units; // já vem com primary primeiro
  const [activeUnitId, setActiveUnitId] = useState<string | null>(null);
  useEffect(() => {
    if (!isMultiUnit) { setActiveUnitId(null); return; }
    if (!activeUnitId || !orderedUnits.find((u) => u.id === activeUnitId)) {
      setActiveUnitId(orderedUnits[0]?.id ?? null);
    }
  }, [isMultiUnit, orderedUnits, activeUnitId]);
  const activeUnit = orderedUnits.find((u) => u.id === activeUnitId) ?? null;
  const activeUnitDestination = activeUnit
    ? {
        id: activeUnit.destination_id,
        name:
          (activeUnit.unit_name && activeUnit.unit_name.trim()) ||
          activeUnit.destinations?.name ||
          'Unidade',
        ibge_code: activeUnit.destinations?.ibge_code ?? null,
      }
    : null;
  const effectiveDestinationData = isMultiUnit && activeUnitDestination
    ? activeUnitDestination
    : selectedDestinationData;

  // Persistência defensiva: assim que um bloco automático devolve valores e já
  // existe `createdAssessmentId`, faz upsert direto em `indicator_values` para
  // que a linhagem registre todas as fontes mesmo se o usuário não chegar até
  // o botão Salvar do Step 5. Cobre o gap em que valores de blocos como
  // Open-Meteo, ANAC, Reclame Aqui, OTAs etc. ficavam só em memória do wizard.
  const { indicators } = useIndicators({ scope: 'enterprise' });
  useEffect(() => {
    if (!createdAssessmentId || !indicators || indicators.length === 0) return;
    const entries = Object.entries(reviewPreFillValues);
    if (entries.length === 0) return;
    const codeToId = new Map(indicators.map((i: any) => [i.code, i.id]));
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: prof } = await supabase
        .from('profiles')
        .select('org_id, viewing_demo_org_id')
        .eq('user_id', user.id)
        .maybeSingle();
      const effOrg = prof?.viewing_demo_org_id || prof?.org_id || orgId;
      if (!effOrg) return;
      const rows = entries
        .map(([code, value]) => {
          const indicator_id = codeToId.get(code);
          if (!indicator_id || value === null || value === undefined || !Number.isFinite(Number(value))) return null;
          return {
            assessment_id: createdAssessmentId,
            indicator_id,
            org_id: effOrg,
            value_raw: Number(value),
            source: `Pré-preenchimento Automático (${code})`,
          };
        })
        .filter(Boolean) as any[];
      if (rows.length === 0) return;
      await supabase
        .from('indicator_values')
        .upsert(rows, { onConflict: 'assessment_id,indicator_id' });
    })();
  }, [reviewPreFillValues, createdAssessmentId, indicators, orgId]);

  const renderUnitTabs = (children: React.ReactNode) => {
    if (!isMultiUnit) return children;
    return (
      <Tabs value={activeUnitId ?? undefined} onValueChange={(v) => setActiveUnitId(v)} className="w-full">
        <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
          <Building2 className="h-4 w-4" />
          <span>
            Diagnóstico de rede — {orderedUnits.length} unidades. Cada aba abaixo coleta dados de uma unidade.
          </span>
        </div>
        <TabsList className="flex flex-wrap h-auto gap-1">
          {orderedUnits.map((u) => (
            <TabsTrigger key={u.id} value={u.id} className="gap-1">
              {u.is_primary && <Star className="h-3 w-3 fill-current" />}
              {(u.unit_name && u.unit_name.trim()) || u.destinations?.name || 'Unidade'}
              <span className="text-xs text-muted-foreground">
                {u.destinations?.uf ? `· ${u.destinations.uf}` : ''}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>
        {orderedUnits.map((u) => (
          <TabsContent key={u.id} value={u.id} className="mt-4">
            {activeUnitId === u.id ? children : null}
          </TabsContent>
        ))}
      </Tabs>
    );
  };

  return (
    <div className="space-y-6">
      {/* Resume Banner */}
      {resumeAssessmentId && resumeAssessment && currentStep === 4 && null}

      {/* Step 4: Pre-filling / Enterprise Profile */}
      {currentStep === 4 && (
        diagnosticType === 'enterprise' ? (
          effectiveDestinationData ? (
            renderUnitTabs(
              <EnterpriseProfileStep
                key={activeUnit?.id ?? effectiveDestinationData.id}
                destinationId={effectiveDestinationData.id}
                destinationName={effectiveDestinationData.name}
                assessmentId={activeAssessmentId}
                onComplete={() => onSetCurrentStep(5)}
                onBack={onPreviousStep}
                onReviewAutoFill={(values) => setReviewPreFillValues(prev => ({ ...prev, ...values }))}
              />
            )
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
              assessmentId={createdAssessmentId}
              includeMandala={expandWithMandala}
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
          <div className="space-y-4">
            <Button variant="outline" onClick={onPreviousStep} className="mb-2">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar ao Perfil
            </Button>
            {isMultiUnit && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Diagnóstico de rede com {orderedUnits.length} unidades. Nesta etapa, os indicadores
                  manuais são preenchidos para a unidade principal
                  {activeUnit?.unit_name ? ` (${activeUnit.unit_name})` : ''}. A coleta isolada por
                  unidade no preenchimento manual entra na próxima fase; o pré-preenchimento da etapa
                  anterior já roda por unidade individualmente.
                </AlertDescription>
              </Alert>
            )}
            {/* Fase 4 (v1.86.0) — bloco opcional de importação CSV/PMS */}
            <PmsCsvImportPanel assessmentId={createdAssessmentId} />
            {/* Fase 13 (v1.96.0) — Conectores PMS nativos (Cloudbeds em produção) */}
            {selectedDestinationData?.id && (
              <PmsConnectionsPanel destinationId={selectedDestinationData.id} />
            )}
            <EnterpriseDataEntryPanel
              assessmentId={createdAssessmentId}
              tier={selectedTier}
              onComplete={() => onSetCurrentStep(6)}
              initialAutoFillValues={reviewPreFillValues}
            />
          </div>
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

      {/* Navigation for step 5 — only for territorial (enterprise has its own nav in EnterpriseDataEntryPanel) */}
      {currentStep === 5 && diagnosticType === 'territorial' && (
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
