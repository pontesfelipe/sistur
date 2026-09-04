import { Suspense, lazy } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bot, ScrollText, ListOrdered, Sparkles } from 'lucide-react';
import { BeniContextPanel } from '@/components/settings/BeniContextPanel';

const AdminSemanticLayer = lazy(() => import('@/pages/AdminSemanticLayer'));
const ReportStructurePanel = lazy(() =>
  import('@/components/admin/ReportStructurePanel').then(m => ({ default: m.ReportStructurePanel }))
);
const ReportContextPanel = lazy(() =>
  import('@/components/admin/ReportContextPanel').then(m => ({ default: m.ReportContextPanel }))
);

const VALID_TABS = ['beni', 'contexto', 'semantica', 'estrutura'];

export default function AdminInteligencia() {
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const defaultTab = VALID_TABS.includes(tabParam || '') ? tabParam! : 'beni';

  return (
    <AppLayout
      title="Inteligência"
      subtitle="Professor Beni, contexto dos relatórios, camada semântica e estrutura de análise."
    >
      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList className="flex w-full gap-1 overflow-x-auto whitespace-nowrap justify-start">
          <TabsTrigger value="beni" className="flex items-center gap-2 shrink-0">
            <Bot className="h-4 w-4" />
            Beni
          </TabsTrigger>
          <TabsTrigger value="contexto" className="flex items-center gap-2 shrink-0">
            <Sparkles className="h-4 w-4" />
            Contexto
          </TabsTrigger>
          <TabsTrigger value="semantica" className="flex items-center gap-2 shrink-0">
            <ScrollText className="h-4 w-4" />
            Semântica
          </TabsTrigger>
          <TabsTrigger value="estrutura" className="flex items-center gap-2 shrink-0">
            <ListOrdered className="h-4 w-4" />
            Estrutura
          </TabsTrigger>
        </TabsList>

        <TabsContent value="beni" className="space-y-6">
          <BeniContextPanel />
        </TabsContent>

        <TabsContent value="contexto" className="space-y-6">
          <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Carregando contexto do relatório…</div>}>
            <ReportContextPanel />
          </Suspense>
        </TabsContent>

        <TabsContent value="semantica" className="space-y-6">
          <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Carregando camada semântica…</div>}>
            <AdminSemanticLayer embedded />
          </Suspense>
        </TabsContent>

        <TabsContent value="estrutura" className="space-y-6">
          <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Carregando estrutura do relatório…</div>}>
            <ReportStructurePanel />
          </Suspense>
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
