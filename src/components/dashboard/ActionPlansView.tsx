import { getDateLocale } from '@/i18n/dateLocale';
import { tx } from '@/i18n/t';
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  useActionPlans, 
  useUpdateActionPlan,
  type ActionPlan 
} from "@/hooks/useActionPlans";
import { 
  ClipboardList, 
  Calendar, 
  User, 
  CheckCircle2, 
  Clock, 
  XCircle,
  Play,
  AlertTriangle,
  Target
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ActionPlansViewProps {
  assessmentId: string;
}

const STATUS_CONFIG = {
  PENDING: {
    label: tx("Pendente"),
    color: "bg-muted text-muted-foreground",
    icon: Clock,
  },
  IN_PROGRESS: {
    label: tx("Em Andamento"),
    color: "bg-primary/10 text-primary",
    icon: Play,
  },
  COMPLETED: {
    label: tx("Concluído"),
    color: "bg-green-500/10 text-green-600",
    icon: CheckCircle2,
  },
  CANCELLED: {
    label: tx("Cancelado"),
    color: "bg-destructive/10 text-destructive",
    icon: XCircle,
  },
};

const PILLAR_CONFIG = {
  RA: { label: tx("Relações Ambientais"), color: "bg-green-500/10 text-green-600 border-green-500/20" },
  OE: { label: tx("Organização Estrutural"), color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  AO: { label: tx("Ações Operacionais"), color: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
};

export function ActionPlansView({ assessmentId }: ActionPlansViewProps) {
  const { data: plans, isLoading } = useActionPlans(assessmentId);
  const updatePlan = useUpdateActionPlan();
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);
  const [completionNotes, setCompletionNotes] = useState<Record<string, string>>({});

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!plans || plans.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Target className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">{tx('Nenhum plano de ação')}</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {tx('Execute o diagnóstico para gerar planos de ação automaticamente')}
          </p>
        </CardContent>
      </Card>
    );
  }

  const handleStatusChange = (plan: ActionPlan, newStatus: ActionPlan['status']) => {
    const updates: Partial<ActionPlan> = { status: newStatus };
    
    if (newStatus === 'COMPLETED' && completionNotes[plan.id]) {
      updates.completion_notes = completionNotes[plan.id];
    }

    updatePlan.mutate({ id: plan.id, updates });
  };

  const pendingCount = plans.filter(p => p.status === 'PENDING').length;
  const inProgressCount = plans.filter(p => p.status === 'IN_PROGRESS').length;
  const completedCount = plans.filter(p => p.status === 'COMPLETED').length;

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-muted-foreground" />
              <span className="text-2xl font-bold">{plans.length}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{tx('Total de Planos')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <span className="text-2xl font-bold">{pendingCount}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{tx('Pendentes')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Play className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{inProgressCount}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{tx('Em Andamento')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span className="text-2xl font-bold">{completedCount}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{tx('Concluídos')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Plans list */}
      <div className="space-y-4">
        {plans.map((plan) => {
          const statusConfig = STATUS_CONFIG[plan.status];
          const StatusIcon = statusConfig.icon;
          const pillarConfig = plan.pillar ? PILLAR_CONFIG[plan.pillar] : null;
          const isExpanded = expandedPlan === plan.id;

          return (
            <Card 
              key={plan.id} 
              className={`transition-all ${plan.priority === 1 ? 'border-l-4 border-l-destructive' : ''}`}
            >
              <CardHeader 
                className="cursor-pointer"
                onClick={() => setExpandedPlan(isExpanded ? null : plan.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      {plan.priority === 1 && (
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                      )}
                      <CardTitle className="text-base">{tx(plan.title)}</CardTitle>
                    </div>
                    <CardDescription>{tx(plan.description)}</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {pillarConfig && (
                      <Badge variant="outline" className={pillarConfig.color}>
                        {plan.pillar}
                      </Badge>
                    )}
                    <Badge className={statusConfig.color}>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {tx(statusConfig.label)}
                    </Badge>
                  </div>
                </div>
                {plan.due_date && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground mt-2">
                    <Calendar className="h-4 w-4" />
                    <span>Prazo: {format(new Date(plan.due_date), "dd/MM/yyyy", { locale: getDateLocale() })}</span>
                  </div>
                )}
              </CardHeader>

              {isExpanded && (
                <CardContent className="space-y-4 border-t pt-4">
                  {/* Owner field */}
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={tx('Responsável pelo plano')}
                      value={plan.owner || ""}
                      onChange={(e) => {
                        updatePlan.mutate({
                          id: plan.id,
                          updates: { owner: e.target.value },
                        });
                      }}
                      className="flex-1"
                    />
                  </div>

                  {/* Status change */}
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium">{tx('Alterar status:')}</span>
                    <Select
                      value={plan.status}
                      onValueChange={(value) => handleStatusChange(plan, value as ActionPlan['status'])}
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PENDING">{tx('Pendente')}</SelectItem>
                        <SelectItem value="IN_PROGRESS">{tx('Em Andamento')}</SelectItem>
                        <SelectItem value="COMPLETED">{tx('Concluído')}</SelectItem>
                        <SelectItem value="CANCELLED">{tx('Cancelado')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Completion notes */}
                  {(plan.status === 'IN_PROGRESS' || plan.status === 'COMPLETED') && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">{tx('Notas de conclusão:')}</label>
                      <Textarea
                        placeholder={tx('Descreva as ações realizadas...')}
                        value={completionNotes[plan.id] ?? plan.completion_notes ?? ""}
                        onChange={(e) => setCompletionNotes(prev => ({
                          ...prev,
                          [plan.id]: e.target.value,
                        }))}
                        onBlur={() => {
                          if (completionNotes[plan.id] !== undefined && completionNotes[plan.id] !== plan.completion_notes) {
                            updatePlan.mutate({
                              id: plan.id,
                              updates: { completion_notes: completionNotes[plan.id] },
                            });
                          }
                        }}
                      />
                    </div>
                  )}

                  {/* Completed at */}
                  {plan.completed_at && (
                    <div className="text-sm text-muted-foreground">
                      Concluído em: {format(new Date(plan.completed_at), "dd/MM/yyyy 'às' HH:mm", { locale: getDateLocale() })}
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
