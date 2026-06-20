import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Bot, ShieldAlert, BookOpen, Volume2, Pencil, Save, X, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useProfileContext } from '@/contexts/ProfileContext';

type SectionKey = 'persona' | 'output_format' | 'base_theory' | 'dynamic_context' | 'scope_guardrails';

type BeniSettings = {
  persona: string | null;
  output_format: string | null;
  base_theory: string | null;
  dynamic_context: string | null;
  scope_guardrails: string | null;
  model: string;
};

const DEFAULTS: Record<SectionKey, string> = {
  persona:
    'Professor Mario Beni — acadêmico brasileiro, autor de "Análise Estrutural do Turismo". Didático, paciente, apaixonado pelo turismo sustentável. Combina rigor acadêmico com linguagem acessível; sempre conecta teoria à prática. Idioma: Português brasileiro.',
  output_format:
    'Respostas são lidas em voz alta pelo ElevenLabs.\n- Sem markdown (sem **, ##, -, asteriscos ou itálicos)\n- Texto corrido, conversacional, parágrafos curtos\n- Enumerações naturais ("primeiro… segundo… terceiro…") em vez de listas\n- Frases claras e diretas, prontas para narração',
  base_theory:
    'Três pilares do sistema turístico:\n- RA — Relações Ambientais (base; prioridade máxima)\n- OE — Organização Estrutural (infraestrutura)\n- AO — Ações Operacionais (governança central)\n\n6 regras do Motor IGMA:\n1. Limitação Estrutural do Território (RA crítico bloqueia OE)\n2. Planejamento como Ciclo Contínuo (6/12/18 meses)\n3. Alerta de Externalidades Negativas (OE↑ enquanto RA↓)\n4. Governança como Condição de Eficácia (AO crítico bloqueia OE)\n5. Território Antes do Marketing (RA e AO não críticos)\n6. Intersetorialidade Obrigatória (saúde, educação, saneamento)\n\nSeveridade: Crítico ≤ 33% | Atenção 34–66% | Adequado ≥ 67%.',
  dynamic_context:
    'Quando o usuário tem diagnósticos/treinamentos/projetos selecionados, esses dados são anexados ao prompt:\n- Diagnóstico selecionado: título, destino, status, tipo, scores dos pilares, flags IGMA e interpretação\n- Treinamentos disponíveis: título, pilar, tipo\n- Projetos: nome, status, metodologia, destino\n- Diagnósticos acessíveis (até 10 mais recentes) via RLS\n- Relatórios gerados (até 5 mais recentes) com trecho de até 1500 caracteres, via RLS',
  scope_guardrails:
    'O Professor Beni só responde sobre turismo, metodologia SISTUR, pilares RA/OE/AO, Motor IGMA, diagnósticos territoriais/empresariais, educação em turismo, políticas públicas e patrimônio cultural/ambiental.\n\nRecusa educadamente: programação, receitas, saúde médica, direito, matemática geral, entretenimento, esportes, política partidária, religião e qualquer outro tema fora do turismo.\n\nMensagem padrão de recusa: "Agradeço sua curiosidade, mas minha especialidade é exclusivamente a área de turismo e a metodologia sistêmica do SISTUR. Posso ajudá-lo com qualquer questão sobre planejamento turístico, diagnósticos territoriais, os pilares RA, OE e AO, ou as regras do Motor IGMA. Como posso ajudá-lo nessas áreas?"',
};

const SECTION_META: Record<SectionKey, { title: string; description?: string; icon: any }> = {
  persona: { title: 'Persona', icon: BookOpen },
  output_format: { title: 'Formato de saída (TTS-friendly)', description: 'Respostas lidas em voz alta pelo ElevenLabs.', icon: Volume2 },
  base_theory: { title: 'Base teórica injetada no contexto', icon: BookOpen },
  dynamic_context: { title: 'Contexto dinâmico enviado a cada chamada', icon: Bot },
  scope_guardrails: { title: 'Escopo & Guardrails', icon: ShieldAlert },
};

const MODEL_OPTIONS: { value: string; label: string; hint: string }[] = [
  { value: 'google/gemini-3-flash-preview', label: 'Gemini 3 Flash (Preview)', hint: 'Padrão — rápido e equilibrado' },
  { value: 'google/gemini-3.5-flash', label: 'Gemini 3.5 Flash', hint: 'Mais raciocínio, ainda rápido' },
  { value: 'google/gemini-3.1-flash-lite', label: 'Gemini 3.1 Flash Lite', hint: 'Custo-eficiente, alto volume' },
  { value: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash', hint: 'Estável, multimodal' },
  { value: 'google/gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite', hint: 'Mais barato/rápido' },
  { value: 'google/gemini-2.5-pro', label: 'Gemini 2.5 Pro', hint: 'Raciocínio profundo' },
  { value: 'openai/gpt-5', label: 'GPT-5', hint: 'Forte raciocínio (mais caro)' },
  { value: 'openai/gpt-5-mini', label: 'GPT-5 Mini', hint: 'Equilíbrio de custo' },
  { value: 'openai/gpt-5-nano', label: 'GPT-5 Nano', hint: 'Rápido e barato' },
];

export function BeniContextPanel() {
  const { isAdmin } = useProfileContext();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [settings, setSettings] = useState<BeniSettings | null>(null);
  const [editing, setEditing] = useState<SectionKey | null>(null);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('beni_settings')
        .select('persona, output_format, base_theory, dynamic_context, scope_guardrails, model')
        .eq('id', true)
        .maybeSingle();
      if (error) {
        console.error(error);
        toast.error('Falha ao carregar configurações do Beni');
      }
      setSettings(
        data ?? {
          persona: null,
          output_format: null,
          base_theory: null,
          dynamic_context: null,
          scope_guardrails: null,
          model: 'google/gemini-3-flash-preview',
        },
      );
      setLoading(false);
    })();
  }, []);

  const valueFor = (key: SectionKey) => settings?.[key] ?? DEFAULTS[key];

  const startEdit = (key: SectionKey) => {
    setEditing(key);
    setDraft(valueFor(key));
  };

  const saveField = async (key: SectionKey | 'model', value: string) => {
    setSaving(key);
    const { error } = await supabase
      .from('beni_settings')
      .update({ [key]: value })
      .eq('id', true);
    setSaving(null);
    if (error) {
      toast.error(`Falha ao salvar: ${error.message}`);
      return false;
    }
    setSettings((s) => (s ? { ...s, [key]: value } as BeniSettings : s));
    toast.success('Configuração salva');
    if (key !== 'model') setEditing(null);
    return true;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Carregando configurações…
      </div>
    );
  }

  const renderSection = (key: SectionKey) => {
    const meta = SECTION_META[key];
    const Icon = meta.icon;
    const isEditing = editing === key;
    const currentValue = valueFor(key);
    return (
      <Card key={key}>
        <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <Icon className="h-4 w-4 text-primary" />
              {meta.title}
            </CardTitle>
            {meta.description && <CardDescription>{meta.description}</CardDescription>}
          </div>
          {isAdmin && !isEditing && (
            <Button size="icon" variant="ghost" onClick={() => startEdit(key)} title="Editar">
              <Pencil className="h-4 w-4" />
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <div className="space-y-2">
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={10}
                className="font-mono text-sm"
              />
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" size="sm" onClick={() => setEditing(null)} disabled={saving === key}>
                  <X className="h-4 w-4 mr-1" /> Cancelar
                </Button>
                <Button size="sm" onClick={() => saveField(key, draft)} disabled={saving === key}>
                  {saving === key ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                  Salvar
                </Button>
              </div>
            </div>
          ) : (
            <pre className="text-sm text-muted-foreground whitespace-pre-wrap font-sans leading-relaxed">
              {currentValue}
            </pre>
          )}
        </CardContent>
      </Card>
    );
  };

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
            {isAdmin
              ? ' Clique no lápis para editar cada seção. As mudanças são aplicadas imediatamente nas próximas conversas.'
              : ' Apenas administradores podem editar essas configurações.'}
          </CardDescription>
        </CardHeader>
      </Card>

      {(['persona', 'output_format', 'base_theory', 'dynamic_context', 'scope_guardrails'] as SectionKey[]).map(renderSection)}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Modelo & Infraestrutura</CardTitle>
          <CardDescription>
            Escolha qual modelo de IA o Professor Beni usará para responder. A alteração entra em vigor na próxima mensagem.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Modelo de resposta</Label>
            <Select
              value={settings?.model ?? 'google/gemini-3-flash-preview'}
              onValueChange={(v) => saveField('model', v)}
              disabled={!isAdmin || saving === 'model'}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MODEL_OPTIONS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    <div className="flex flex-col">
                      <span className="font-medium">{m.label}</span>
                      <span className="text-xs text-muted-foreground">{m.hint}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!isAdmin && (
              <p className="text-xs text-muted-foreground">Apenas administradores podem alterar o modelo.</p>
            )}
          </div>
          <div className="text-sm text-muted-foreground space-y-1 pt-2 border-t">
            <p>Edge function: <code className="text-xs">beni-chat</code> (streaming SSE, JWT obrigatório)</p>
            <p>TTS: ElevenLabs via <code className="text-xs">elevenlabs-tts</code></p>
            <p>Modelo atual: <Badge variant="outline">{settings?.model}</Badge></p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
