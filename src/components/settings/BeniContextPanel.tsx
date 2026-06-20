import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bot, ShieldAlert, BookOpen, Volume2, Ban } from 'lucide-react';

/**
 * Painel informativo (somente leitura) com as regras de conversa e o contexto
 * usado pelo Professor Beni Chat. O prompt real é mantido na edge function
 * `beni-chat` para garantir governança e evitar prompt injection pelo cliente.
 */
export function BeniContextPanel() {
  return (
    <div className="space-y-6">
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            Professor Beni — Regras de Conversa & Contexto
          </CardTitle>
          <CardDescription>
            Configuração de persona, escopo e diretrizes aplicadas ao chat do Professor Beni.
            Este painel é informativo: as regras vivem na função <code className="text-xs">beni-chat</code> e
            só podem ser alteradas por desenvolvedores autorizados.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpen className="h-4 w-4 text-primary" />
            Persona
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            <strong className="text-foreground">Professor Mario Beni</strong> — acadêmico brasileiro, autor de
            "Análise Estrutural do Turismo". Didático, paciente, apaixonado pelo turismo sustentável.
          </p>
          <p>Combina rigor acadêmico com linguagem acessível; sempre conecta teoria à prática.</p>
          <p>Idioma: <Badge variant="outline">Português brasileiro</Badge></p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Volume2 className="h-4 w-4 text-primary" />
            Formato de saída (TTS-friendly)
          </CardTitle>
          <CardDescription>
            Respostas são lidas em voz alta pelo ElevenLabs; o formato é otimizado para áudio.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
            <li>Sem markdown (sem <code>**</code>, <code>##</code>, <code>-</code>, asteriscos ou itálicos)</li>
            <li>Texto corrido, conversacional, parágrafos curtos</li>
            <li>Enumerações naturais ("primeiro… segundo… terceiro…") em vez de listas com bullets</li>
            <li>Frases claras e diretas, prontas para narração</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpen className="h-4 w-4 text-primary" />
            Base teórica injetada no contexto
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div>
            <p className="font-medium text-foreground">Três pilares do sistema turístico</p>
            <ul className="list-disc pl-5 mt-1 space-y-1">
              <li><strong>RA</strong> — Relações Ambientais (base; prioridade máxima)</li>
              <li><strong>OE</strong> — Organização Estrutural (infraestrutura)</li>
              <li><strong>AO</strong> — Ações Operacionais (governança central)</li>
            </ul>
          </div>
          <div>
            <p className="font-medium text-foreground">6 regras do Motor IGMA</p>
            <ol className="list-decimal pl-5 mt-1 space-y-1">
              <li>Limitação Estrutural do Território (RA crítico bloqueia OE)</li>
              <li>Planejamento como Ciclo Contínuo (6/12/18 meses)</li>
              <li>Alerta de Externalidades Negativas (OE↑ enquanto RA↓)</li>
              <li>Governança como Condição de Eficácia (AO crítico bloqueia OE)</li>
              <li>Território Antes do Marketing (RA e AO não críticos)</li>
              <li>Intersetorialidade Obrigatória (saúde, educação, saneamento)</li>
            </ol>
          </div>
          <div>
            <p className="font-medium text-foreground">Níveis de severidade</p>
            <div className="flex flex-wrap gap-2 mt-1">
              <Badge className="bg-severity-critico text-white">Crítico ≤ 33%</Badge>
              <Badge className="bg-severity-moderado text-white">Atenção 34–66%</Badge>
              <Badge className="bg-severity-bom text-white">Adequado ≥ 67%</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bot className="h-4 w-4 text-primary" />
            Contexto dinâmico enviado a cada chamada
          </CardTitle>
          <CardDescription>
            Quando o usuário tem um diagnóstico/treinamentos/projetos selecionados, esses dados são anexados
            ao prompt para gerar respostas personalizadas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
            <li>Diagnóstico selecionado: título, destino, status, tipo (Territorial/Empresarial), scores dos pilares, flags IGMA e interpretação</li>
            <li>Treinamentos disponíveis: título, pilar, tipo (Curso/Live)</li>
            <li>Projetos do usuário: nome, status, metodologia, destino vinculado</li>
            <li>
              <strong className="text-foreground">Diagnósticos acessíveis ao usuário</strong> (até 10 mais recentes):
              título, destino, tipo, status, score final, scores por pilar e flags IGMA — filtrados via RLS
              pelo JWT do usuário (somente o que ele pode ver na sua organização).
            </li>
            <li>
              <strong className="text-foreground">Relatórios gerados acessíveis ao usuário</strong> (até 5 mais recentes):
              destino, data, modelo de IA e trecho de até 1500 caracteres do conteúdo — também filtrados por RLS.
            </li>
          </ul>
        </CardContent>
      </Card>

      <Card className="border-destructive/30 bg-destructive/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldAlert className="h-4 w-4 text-destructive" />
            Escopo & Guardrails
          </CardTitle>
          <CardDescription>
            O Professor Beni recusa educadamente qualquer pergunta fora do escopo de turismo / SISTUR.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div>
            <p className="font-medium text-foreground">Temas permitidos</p>
            <ul className="list-disc pl-5 mt-1 space-y-1">
              <li>Turismo: planejamento, gestão, sustentabilidade, destinos, hospitalidade</li>
              <li>Metodologia sistêmica SISTUR e pilares RA/OE/AO</li>
              <li>Motor IGMA e suas 6 regras</li>
              <li>Diagnósticos territoriais e empresariais</li>
              <li>Educação e capacitação em turismo</li>
              <li>Políticas públicas, patrimônio cultural/ambiental e economia do turismo</li>
            </ul>
          </div>
          <div>
            <p className="font-medium text-foreground flex items-center gap-1">
              <Ban className="h-3.5 w-3.5" /> Temas recusados
            </p>
            <p className="mt-1">
              Programação, receitas, saúde médica, direito, matemática geral, entretenimento,
              esportes, política partidária, religião e qualquer outro tema fora do turismo.
            </p>
          </div>
          <div className="p-3 bg-muted/50 rounded border-l-2 border-destructive">
            <p className="text-xs font-medium text-foreground mb-1">Mensagem padrão de recusa:</p>
            <p className="text-xs italic">
              "Agradeço sua curiosidade, mas minha especialidade é exclusivamente a área de turismo e a
              metodologia sistêmica do SISTUR. Posso ajudá-lo com qualquer questão sobre planejamento
              turístico, diagnósticos territoriais, os pilares RA, OE e AO, ou as regras do Motor IGMA.
              Como posso ajudá-lo nessas áreas?"
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Modelo & Infraestrutura</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-1">
          <p>Modelo: <Badge variant="outline">google/gemini-3-flash-preview</Badge> via gateway de IA gerenciado</p>
          <p>Edge function: <code className="text-xs">beni-chat</code> (streaming SSE, JWT obrigatório)</p>
          <p>TTS: ElevenLabs via edge function <code className="text-xs">elevenlabs-tts</code></p>
        </CardContent>
      </Card>
    </div>
  );
}
