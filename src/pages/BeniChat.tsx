import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { BeniConversationSidebar } from '@/components/chat/BeniConversationSidebar';
import { ShareConversationMenu } from '@/components/chat/ShareConversationMenu';
import { useBeniConversations } from '@/hooks/useBeniConversations';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { PanelLeft, ChevronDown } from 'lucide-react';
import { BeniChatBot } from '@/components/chat/BeniChatBot';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Leaf, 
  Building2, 
  Cog, 
  BookOpen, 
  Lightbulb,
  GraduationCap,
  Info
} from 'lucide-react';

const TOPICS = [
  {
    icon: Leaf,
    title: 'Relações Ambientais (RA)',
    description: 'A base do sistema turístico: recursos naturais, patrimônio cultural e sustentabilidade',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/30'
  },
  {
    icon: Building2,
    title: 'Organização Estrutural (OE)',
    description: 'Infraestrutura turística: hotéis, transporte, sinalização e equipamentos',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 dark:bg-blue-950/30'
  },
  {
    icon: Cog,
    title: 'Ações Operacionais (AO)',
    description: 'Governança do turismo: políticas públicas, qualificação e marketing',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50 dark:bg-amber-950/30'
  },
  {
    icon: BookOpen,
    title: 'Motor IGMA',
    description: 'As 6 regras sistêmicas que governam recomendações e bloqueios',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 dark:bg-purple-950/30'
  }
];

export default function BeniChat() {
  const { conversationId } = useParams<{ conversationId?: string }>();
  const navigate = useNavigate();
  const api = useBeniConversations();
  const [drawer, setDrawer] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const active = api.conversations.find((c) => c.id === conversationId);

  const goNew = () => { setDrawer(false); navigate('/professor-beni'); };
  const sidebar = (
    <BeniConversationSidebar
      api={api}
      activeId={conversationId}
      onNew={goNew}
      onNavigate={() => setDrawer(false)}
      onDeletedActive={() => navigate('/professor-beni', { replace: true })}
    />
  );

  return (
    <AppLayout
      title="Professor Beni"
      subtitle="Assistente virtual baseado na metodologia sistêmica do turismo"
    >
      <div className="flex flex-col lg:grid lg:grid-cols-[260px_1fr_280px] gap-4">
        <aside className="hidden lg:block h-[calc(100vh-10rem)] min-h-[480px]">{sidebar}</aside>

        <div className="min-h-0 space-y-2">
          <div className="lg:hidden">
            <Sheet open={drawer} onOpenChange={setDrawer}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm"><PanelLeft className="h-4 w-4 mr-1" />Conversas e pastas</Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[300px] pt-10">{sidebar}</SheetContent>
            </Sheet>
          </div>
          <BeniChatBot
            key={conversationId ?? 'new'}
            conversationId={conversationId}
            onConversationCreated={(id) => { api.refresh(); navigate(`/professor-beni/c/${id}`, { replace: true }); }}
            onNewConversation={goNew}
            onActivity={api.refresh}
            headerExtra={active ? (
              <ShareConversationMenu conversation={active} onUpdate={(patch) => api.updateConversation(active.id, patch as any)} />
            ) : null}
          />
        </div>

        {/* Sidebar - hidden on mobile, shown on desktop */}
        <Collapsible open={infoOpen} onOpenChange={setInfoOpen} className="hidden lg:block space-y-4">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between">
              Sobre o Professor e tópicos <ChevronDown className={`h-4 w-4 transition-transform ${infoOpen ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4">
          {/* About Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-primary" />
                Sobre o Professor Beni
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-3">
              <p>
                <strong className="text-foreground">Mario Carlos Beni</strong> é professor emérito da 
                USP e autor da teoria sistêmica do turismo, base científica do SISTUR.
              </p>
              <p>
                Este assistente virtual foi treinado com os princípios e metodologias 
                desenvolvidos pelo professor ao longo de décadas de pesquisa.
              </p>
              <div className="flex flex-wrap gap-1 pt-2">
                <Badge variant="secondary" className="text-xs">Análise Estrutural</Badge>
                <Badge variant="secondary" className="text-xs">SISTUR</Badge>
                <Badge variant="secondary" className="text-xs">Motor IGMA</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Topics Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-primary" />
                Tópicos que o Professor Domina
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {TOPICS.map((topic, idx) => (
                <div 
                  key={idx}
                  className={`flex items-start gap-3 p-3 rounded-lg ${topic.bgColor}`}
                >
                  <topic.icon className={`h-5 w-5 shrink-0 ${topic.color}`} />
                  <div>
                    <p className="font-medium text-sm">{topic.title}</p>
                    <p className="text-xs text-muted-foreground">{topic.description}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* What to Ask Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Info className="h-4 w-4 text-primary" />
                O que você pode perguntar
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-3">
              <p className="text-foreground font-medium">
                O Professor Beni pode responder sobre os temas abaixo, sempre com base na metodologia SISTUR:
              </p>
              <ul className="space-y-2">
                <li className="flex gap-2">
                  <span className="shrink-0 text-primary">•</span>
                  <span><strong className="text-foreground">Seus diagnósticos:</strong> pergunte sobre diagnósticos que você já realizou. O Beni vai confirmar o nome exato antes de analisar.</span>
                </li>
                <li className="flex gap-2">
                  <span className="shrink-0 text-primary">•</span>
                  <span><strong className="text-foreground">Seus relatórios:</strong> pergunte sobre relatórios gerados no sistema. O Beni vai confirmar o nome exato antes de analisar.</span>
                </li>
                <li className="flex gap-2">
                  <span className="shrink-0 text-primary">•</span>
                  <span><strong className="text-foreground">Metodologia:</strong> conceitos dos pilares RA, OE e AO, as 6 regras do IGMA, teoria sistêmica do turismo.</span>
                </li>
                <li className="flex gap-2">
                  <span className="shrink-0 text-primary">•</span>
                  <span><strong className="text-foreground">Prescrições e cursos:</strong> recomendações de formação baseadas em indicadores em Atenção ou Crítico.</span>
                </li>
                <li className="flex gap-2">
                  <span className="shrink-0 text-primary">•</span>
                  <span><strong className="text-foreground">Turismo sustentável:</strong> boas práticas, governança, planejamento e gestão de destinos.</span>
                </li>
              </ul>
              <div className="pt-1 text-xs border-t border-border pt-2">
                <strong className="text-foreground">Limites:</strong> o Beni não responde sobre programação, saúde, política, religião ou temas fora do turismo e da metodologia SISTUR.
              </div>
            </CardContent>
          </Card>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </AppLayout>
  );
}
