import { tx } from '@/i18n/t';
import { Suspense, lazy } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bot, ScrollText, ListOrdered, Sparkles, Plug, BookOpen, LifeBuoy } from 'lucide-react';
import { BeniContextPanel } from '@/components/settings/BeniContextPanel';

const AdminSemanticLayer = lazy(() => import('@/pages/AdminSemanticLayer'));
const ReportStructurePanel = lazy(() =>
  import('@/components/admin/ReportStructurePanel').then(m => ({ default: m.ReportStructurePanel }))
);
const ReportContextPanel = lazy(() =>
  import('@/components/admin/ReportContextPanel').then(m => ({ default: m.ReportContextPanel }))
);
const McpGuidePanel = lazy(() =>
  import('@/components/admin/McpGuidePanel').then(m => ({ default: m.McpGuidePanel }))
);
const GlobalReferencesPanel = lazy(() =>
  import('@/components/admin/GlobalReferencesPanel').then(m => ({ default: m.GlobalReferencesPanel }))
);

const SupportAdminPanel = lazy(() =>
  import('@/components/admin/SupportAdminPanel').then(m => ({ default: m.SupportAdminPanel }))
);

const VALID_TABS = ['beni', 'contexto', 'semantica', 'estrutura', 'referencias', 'suporte', 'mcp'];

export default function AdminInteligencia() {
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const defaultTab = VALID_TABS.includes(tabParam || '') ? tabParam! : 'beni';

  return (
    <AppLayout
      title={tx("Inteligência")}
      subtitle={tx("Professor Beni, contexto dos relatórios, camada semântica, estrutura de análise, referências globais e integração MCP.")}
    >
      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList className="flex w-full gap-1 overflow-x-auto whitespace-nowrap justify-start">
          <TabsTrigger value="beni" className="flex items-center gap-2 shrink-0">
            <Bot className="h-4 w-4" />
            {tx("Beni")}
          </TabsTrigger>
          <TabsTrigger value="contexto" className="flex items-center gap-2 shrink-0">
            <Sparkles className="h-4 w-4" />
            {tx("Contexto")}
          </TabsTrigger>
          <TabsTrigger value="semantica" className="flex items-center gap-2 shrink-0">
            <ScrollText className="h-4 w-4" />
            {tx("Semântica")}
          </TabsTrigger>
          <TabsTrigger value="estrutura" className="flex items-center gap-2 shrink-0">
            <ListOrdered className="h-4 w-4" />
            {tx("Estrutura")}
          </TabsTrigger>
          <TabsTrigger value="referencias" className="flex items-center gap-2 shrink-0">
            <BookOpen className="h-4 w-4" />
            {tx("Referências")}
          </TabsTrigger>
          <TabsTrigger value="suporte" className="flex items-center gap-2 shrink-0">
            <LifeBuoy className="h-4 w-4" />
            {tx("Suporte")}
          </TabsTrigger>
          <TabsTrigger value="mcp" className="flex items-center gap-2 shrink-0">
            <Plug className="h-4 w-4" />
            {tx("Integração IA (MCP)")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="beni" className="space-y-6">
          <BeniContextPanel />
        </TabsContent>

        <TabsContent value="contexto" className="space-y-6">
          <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">{tx("Carregando contexto do relatório…")}</div>}>
            <ReportContextPanel />
          </Suspense>
        </TabsContent>

        <TabsContent value="semantica" className="space-y-6">
          <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">{tx("Carregando camada semântica…")}</div>}>
            <AdminSemanticLayer embedded />
          </Suspense>
        </TabsContent>

        <TabsContent value="estrutura" className="space-y-6">
          <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">{tx("Carregando estrutura do relatório…")}</div>}>
            <ReportStructurePanel />
          </Suspense>
        </TabsContent>

        <TabsContent value="referencias" className="space-y-6">
          <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">{tx("Carregando referências globais…")}</div>}>
            <GlobalReferencesPanel />
          </Suspense>
        </TabsContent>

        <TabsContent value="suporte" className="space-y-6">
          <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">{tx("Carregando suporte…")}</div>}>
            <SupportAdminPanel />
          </Suspense>
        </TabsContent>

        <TabsContent value="mcp" className="space-y-6">
          <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">{tx("Carregando guia de integração…")}</div>}>
            <McpGuidePanel />
          </Suspense>
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
