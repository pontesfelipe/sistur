import { useState, useCallback, useEffect } from 'react';

export type WidgetId =
  | 'stats'
  | 'pillar-scores'
  | 'issues'
  | 'recommendations'
  | 'workflow-status'
  | 'quick-action'
  | 'comparison'
  | 'trend'
  | 'erp-stats'
  | 'projects-overview'
  | 'pillar-progress'
  | 'cycle-evolution'
  | 'overdue-projects';

export interface WidgetConfig {
  id: WidgetId;
  label: string;
  description: string;
  defaultEnabled: boolean;
  category: 'overview' | 'diagnostic' | 'projects' | 'learning';
}

export const AVAILABLE_WIDGETS: WidgetConfig[] = [
  { id: 'stats', label: 'Estatísticas Gerais', description: 'Destinos, diagnósticos, gargalos e capacitações', defaultEnabled: true, category: 'overview' },
  { id: 'pillar-scores', label: 'Radiografia dos Pilares', description: 'Scores RA, OE, AO com gauges visuais', defaultEnabled: true, category: 'diagnostic' },
  { id: 'issues', label: 'Gargalos Identificados', description: 'Lista de problemas críticos', defaultEnabled: true, category: 'diagnostic' },
  { id: 'workflow-status', label: 'Status do Fluxo', description: 'Últimos diagnósticos e seus status', defaultEnabled: true, category: 'overview' },
  { id: 'quick-action', label: 'Ação Rápida', description: 'Atalho para novo diagnóstico', defaultEnabled: true, category: 'overview' },
  { id: 'recommendations', label: 'Recomendações Prioritárias', description: 'Sugestões de capacitação', defaultEnabled: true, category: 'learning' },
  { id: 'comparison', label: 'Comparativo de Destinos', description: 'Comparação entre destinos', defaultEnabled: true, category: 'diagnostic' },
  { id: 'trend', label: 'Tendência Temporal', description: 'Evolução ao longo do tempo', defaultEnabled: true, category: 'diagnostic' },
  { id: 'erp-stats', label: 'KPIs de Projetos', description: 'Projetos ativos, tarefas e prazos', defaultEnabled: true, category: 'projects' },
  { id: 'projects-overview', label: 'Visão de Projetos', description: 'Resumo detalhado dos projetos', defaultEnabled: false, category: 'projects' },
  { id: 'pillar-progress', label: 'Progresso por Pilar', description: 'Gráfico de progresso dos pilares por destino', defaultEnabled: false, category: 'diagnostic' },
  { id: 'cycle-evolution', label: 'Evolução dos Ciclos', description: 'Histórico de ciclos diagnósticos', defaultEnabled: false, category: 'diagnostic' },
  { id: 'overdue-projects', label: 'Projetos Atrasados', description: 'Lista de projetos com tarefas vencidas', defaultEnabled: false, category: 'projects' },
];

const STORAGE_KEY = 'sistur-dashboard-widgets';

export function useDashboardWidgets() {
  const [enabledWidgets, setEnabledWidgets] = useState<Set<WidgetId>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          // Drop any widget IDs that are no longer registered to avoid phantom entries.
          const validIds = new Set(AVAILABLE_WIDGETS.map(w => w.id));
          return new Set(parsed.filter((id): id is WidgetId => validIds.has(id as WidgetId)));
        }
      }
    } catch (err) {
      console.warn('Failed to load dashboard widget preferences:', err);
      // Clear corrupted preference so subsequent loads don't keep failing.
      try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
    }
    return new Set(AVAILABLE_WIDGETS.filter(w => w.defaultEnabled).map(w => w.id));
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...enabledWidgets]));
    } catch (err) {
      console.warn('Failed to persist dashboard widget preferences:', err);
    }
  }, [enabledWidgets]);

  const toggleWidget = useCallback((id: WidgetId) => {
    setEnabledWidgets(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const isEnabled = useCallback((id: WidgetId) => enabledWidgets.has(id), [enabledWidgets]);

  const resetToDefaults = useCallback(() => {
    setEnabledWidgets(new Set(AVAILABLE_WIDGETS.filter(w => w.defaultEnabled).map(w => w.id)));
  }, []);

  return { enabledWidgets, toggleWidget, isEnabled, resetToDefaults };
}
