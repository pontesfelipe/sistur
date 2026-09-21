import { useState } from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tasks-shim';

import {
  Plug,
  Wrench,
  MessageSquareQuote,
  ShieldCheck,
  Copy,
  Check,
  Bot,
  ListTree,
  ClipboardList,
  GraduationCap,
  MapPin,
  Gauge,
  PlusCircle,
} from 'lucide-react';

const MCP_URL = 'https://sistur.app/mcp';

const TOOLS = [
  {
    icon: MapPin,
    name: 'list_destinations',
    title: 'Listar destinos',
    description: 'Destinos turísticos acessíveis ao usuário (com unidade/brand quando aplicável).',
  },
  {
    icon: Gauge,
    name: 'list_assessments',
    title: 'Listar diagnósticos',
    description: 'Rodadas de avaliação com nota final e classificação (Adequado, Atenção, Crítico).',
  },
  {
    icon: ListTree,
    name: 'get_assessment',
    title: 'Detalhar diagnóstico',
    description: 'Diagnóstico completo: notas por pilar (RA, OE, AO) e indicadores relevantes.',
  },
  {
    icon: ClipboardList,
    name: 'list_projects',
    title: 'Listar projetos',
    description: 'Projetos de intervenção da organização, com status e vínculo diagnóstico.',
  },
  {
    icon: ClipboardList,
    name: 'list_project_tasks',
    title: 'Listar tarefas',
    description: 'Tarefas de um projeto, com responsável, prazo e status.',
  },
  {
    icon: PlusCircle,
    name: 'create_project_task',
    title: 'Criar tarefa',
    description: 'Cria uma tarefa em um projeto existente, em nome do usuário conectado.',
  },
  {
    icon: GraduationCap,
    name: 'list_trainings',
    title: 'Listar capacitações',
    description: 'Catálogo educacional: cursos, trilhas e lives disponíveis.',
  },
];

const EXAMPLES = [
  'Liste os destinos que eu tenho acesso no SISTUR.',
  'Qual foi o resultado do diagnóstico mais recente de Barretos? Quais pilares estão em Atenção ou Crítico?',
  'Compare as notas dos pilares RA, OE e AO do último diagnóstico e sugira prioridades de ação.',
  'Liste os projetos em andamento e as tarefas atrasadas de cada um.',
  'Crie uma tarefa no projeto "Revitalização do Centro Histórico" com o título "Revisar indicadores de sinalização" e prioridade alta.',
  'Quais capacitações do catálogo servem para gestores no pilar Organização Estrutural?',
  'Monte um resumo executivo em texto do meu destino com base no último diagnóstico, pronto para colar em um e-mail.',
];

const CONNECTORS: { label: string; steps: string[] }[] = [
  {
    label: 'ChatGPT (Conectores / Developer Mode)',
    steps: [
      'Em Configurações → Conectores, escolha "Criar" ou "Adicionar conector personalizado".',
      `Informe a URL do servidor: ${MCP_URL}`,
      'Escolha a autenticação OAuth e conclua o login com a sua conta SISTUR na tela de autorização.',
      'Ative o conector na conversa e peça o que precisa — o assistente usará as ferramentas do SISTUR automaticamente.',
    ],
  },
  {
    label: 'Claude (Claude.ai / Claude Desktop)',
    steps: [
      'Em Configurações → Connectors → "Add custom connector".',
      `Cole a URL: ${MCP_URL}`,
      'Ao conectar, uma janela de login do SISTUR será aberta; entre com sua conta e aprove o acesso.',
      'Nas conversas, ative o conector SISTUR para consultar destinos, diagnósticos e projetos.',
    ],
  },
  {
    label: 'Cursor / Claude Code',
    steps: [
      'Adicione um servidor MCP do tipo HTTP (streamable) na configuração de MCP do editor.',
      `Use a URL ${MCP_URL} — a autenticação OAuth será aberta no navegador na primeira vez.`,
      'Conclua o login SISTUR e autorize o acesso; as ferramentas aparecem na lista do agente.',
    ],
  },
];

export function McpGuidePanel() {
  const [copied, setCopied] = useState(false);

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(MCP_URL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard indisponível — o usuário ainda pode ver e copiar manualmente
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plug className="h-5 w-5" />
            Conectando assistentes de IA ao SISTUR (MCP)
          </CardTitle>
          <CardDescription>
            O SISTUR expõe um servidor MCP (Model Context Protocol) que permite a assistentes de IA —
            como ChatGPT, Claude e Cursor — consultar e agir sobre os seus dados do sistema, sempre
            com o login do próprio usuário e respeitando as permissões da sua organização.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <code className="rounded-md bg-muted px-3 py-2 text-sm font-mono break-all">{MCP_URL}</code>
            <Button variant="outline" size="sm" onClick={copyUrl} className="gap-2">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copiado' : 'Copiar URL'}
            </Button>
          </div>
          <div className="flex items-start gap-3 rounded-lg border p-4">
            <ShieldCheck className="h-5 w-5 mt-0.5 shrink-0 text-primary" />
            <div className="text-sm space-y-1">
              <p className="font-medium">Seguro por padrão</p>
              <p className="text-muted-foreground">
                Cada pessoa autoriza com a própria conta SISTUR em uma tela de consentimento, e o
                assistente só enxerga os mesmos dados que essa pessoa vê dentro do sistema — nada de
                chaves fixas ou acesso cruzado entre organizações. É possível revogar o acesso a
                qualquer momento desconectando o conector no assistente de IA.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Como conectar
          </CardTitle>
          <CardDescription>
            Escolha o assistente que você usa e siga os passos. Em todos eles, o login é feito na
            tela de autorização do SISTUR — nunca compartilhe sua senha com o assistente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {CONNECTORS.map((c) => (
              <AccordionItem key={c.label} value={c.label}>
                <AccordionTrigger className="text-left">{c.label}</AccordionTrigger>
                <AccordionContent>
                  <ol className="list-decimal space-y-2 pl-5 text-sm">
                    {c.steps.map((s, i) => (
                      <li key={i} className="text-muted-foreground">
                        {s.includes(MCP_URL) ? (
                          <>
                            {s.split(MCP_URL)[0]}
                            <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">{MCP_URL}</code>
                            {s.split(MCP_URL)[1]}
                          </>
                        ) : (
                          s
                        )}
                      </li>
                    ))}
                  </ol>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Ferramentas disponíveis
          </CardTitle>
          <CardDescription>
            Tudo que o assistente pode fazer em nome de quem conectou. Dados de leitura consultam o
            que a pessoa já pode ver no SISTUR; a criação de tarefas é registrada como se tivesse
            sido feita pela própria pessoa.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {TOOLS.map((t) => (
            <div key={t.name} className="flex gap-3 rounded-lg border p-3">
              <t.icon className="h-5 w-5 mt-0.5 shrink-0 text-primary" />
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium">{t.title}</p>
                  <Badge variant="secondary" className="font-mono text-[11px]">{t.name}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{t.description}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquareQuote className="h-5 w-5" />
            Exemplos de uso
          </CardTitle>
          <CardDescription>
            Depois de conectado, basta conversar naturalmente. Exemplos de pedidos que o assistente
            consegue atender:
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {EXAMPLES.map((e, i) => (
              <li key={i} className="flex gap-2 text-sm">
                <span className="text-muted-foreground select-none">•</span>
                <span className="italic">"{e}"</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

export default McpGuidePanel;
