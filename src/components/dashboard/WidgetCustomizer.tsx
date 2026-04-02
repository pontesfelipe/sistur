import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Settings2, RotateCcw } from 'lucide-react';
import { AVAILABLE_WIDGETS, WidgetId } from '@/hooks/useDashboardWidgets';

interface WidgetCustomizerProps {
  isEnabled: (id: WidgetId) => boolean;
  toggleWidget: (id: WidgetId) => void;
  resetToDefaults: () => void;
  hasERPAccess: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
  overview: 'Visão Geral',
  diagnostic: 'Diagnósticos',
  projects: 'Projetos',
  learning: 'Capacitação',
};

export function WidgetCustomizer({ isEnabled, toggleWidget, resetToDefaults, hasERPAccess }: WidgetCustomizerProps) {
  const categories = ['overview', 'diagnostic', 'projects', 'learning'];

  // Filter project widgets if no ERP access
  const filteredWidgets = AVAILABLE_WIDGETS.filter(w => {
    if (w.category === 'projects' && !hasERPAccess) return false;
    return true;
  });

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Settings2 className="h-4 w-4" />
          <span className="hidden sm:inline">Personalizar</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="end">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-sm">Widgets do Dashboard</h4>
          <Button variant="ghost" size="sm" onClick={resetToDefaults} className="h-7 gap-1 text-xs text-muted-foreground">
            <RotateCcw className="h-3 w-3" />
            Resetar
          </Button>
        </div>
        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
          {categories.map(cat => {
            const widgets = filteredWidgets.filter(w => w.category === cat);
            if (widgets.length === 0) return null;
            return (
              <div key={cat}>
                <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
                  {CATEGORY_LABELS[cat]}
                </p>
                <div className="space-y-2">
                  {widgets.map(widget => (
                    <div key={widget.id} className="flex items-center justify-between gap-2">
                      <Label htmlFor={`widget-${widget.id}`} className="flex-1 cursor-pointer">
                        <span className="text-sm font-medium block">{widget.label}</span>
                        <span className="text-xs text-muted-foreground">{widget.description}</span>
                      </Label>
                      <Switch
                        id={`widget-${widget.id}`}
                        checked={isEnabled(widget.id)}
                        onCheckedChange={() => toggleWidget(widget.id)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
