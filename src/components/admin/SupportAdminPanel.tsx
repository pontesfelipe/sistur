import { SUPPORT_RULE_SUMMARIES } from '../../../supabase/functions/support-chat/rules';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Trash2, Plus, Check, Download } from 'lucide-react';
import { tutorialCategories } from '@/data/tutorialData';
import avatar from '@/assets/support-bot-avatar.png';
import { tx } from '@/i18n/t';

const DEFAULT_GUARDRAILS = [
  { rule_key: 'tom', title: 'Tom de voz', content: 'Cordial, direto e acolhedor. Frases curtas. Chame o usuário de você.', sort_order: 1 },
  { rule_key: 'escopo', title: 'Escopo', content: 'Somente uso da plataforma SISTUR. Dúvidas de metodologia, turismo ou interpretação de resultados vão para o Professor Beni.', sort_order: 2 },
  { rule_key: 'planos', title: 'Planos e cobrança', content: 'Não prometa descontos ou condições especiais. Oriente a página Assinatura ou um chamado.', sort_order: 3 },
  { rule_key: 'fallback', title: 'Quando não souber', content: 'Diga que ainda não tem essa resposta e sugira abrir um chamado com a equipe.', sort_order: 4 },
];

export function SupportAdminPanel() {
  const qc = useQueryClient();
  const kb = useQuery({ queryKey: ['support-kb'], queryFn: async () => (await supabase.from('support_kb_articles').select('*').order('category').order('title')).data ?? [] });
  const guards = useQuery({ queryKey: ['support-guards'], queryFn: async () => (await supabase.from('support_guardrails').select('*').order('sort_order')).data ?? [] });
  const learned = useQuery({ queryKey: ['support-learned'], queryFn: async () => (await supabase.from('support_learned_qa').select('*').order('created_at', { ascending: false }).limit(200)).data ?? [] });
  const convs = useQuery({ queryKey: ['support-convs'], queryFn: async () => (await supabase.from('support_conversations').select('status, escalated').limit(1000)).data ?? [] });

  const refresh = () => qc.invalidateQueries({ predicate: q => String(q.queryKey[0]).startsWith('support-') });

  const importTutorials = async () => {
    const existing = new Set((kb.data ?? []).map(a => a.title));
    const rows = tutorialCategories.flatMap(c => c.steps.filter(s => !existing.has(s.title)).map(s => ({
      title: s.title, category: c.title, content: s.description,
      routes: s.route ? [s.route] : [], roles: s.roles,
      keywords: s.title.toLowerCase().split(/\s+/).filter(w => w.length > 3),
      action_label: s.route ? `Abrir ${s.title}` : null, action_route: s.route ?? null, source: 'tutorial',
    })));
    if (!rows.length) return toast.info(tx('Todos os tutoriais já estão na base.'));
    const { error } = await supabase.from('support_kb_articles').insert(rows);
    error ? toast.error(error.message) : toast.success(`${rows.length} ${tx('artigos importados')}`);
    refresh();
  };

  const loadDefaultGuards = async () => {
    const { error } = await supabase.from('support_guardrails').upsert(DEFAULT_GUARDRAILS, { onConflict: 'rule_key' });
    error ? toast.error(error.message) : toast.success(tx('Diretrizes padrão carregadas'));
    refresh();
  };

  const total = convs.data?.length ?? 0;
  const resolved = convs.data?.filter(c => c.status === 'resolved').length ?? 0;
  const escalated = convs.data?.filter(c => c.escalated).length ?? 0;
  const pending = learned.data?.filter(l => l.status !== 'approved' && l.status !== 'dismissed').length ?? 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center gap-4">
          <img src={avatar} alt="Guia" width={72} height={72} className="h-18 w-18" loading="lazy" />
          <div>
            <CardTitle>{tx('Guia — Bot de Suporte')}</CardTitle>
            <CardDescription>{tx('Responde dúvidas de uso da plataforma com a base abaixo. Perguntas sem resposta e respostas bem avaliadas entram em Aprendizado para você revisar; o que for aprovado passa a ser usado nas próximas respostas.')}</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label={tx('Conversas')} value={total} />
          <Stat label={tx('Resolvidas pelo bot')} value={total ? `${Math.round((resolved / total) * 100)}%` : '—'} />
          <Stat label={tx('Viraram chamado')} value={escalated} />
          <Stat label={tx('Aguardando revisão')} value={pending} />
        </CardContent>
      </Card>

      <Tabs defaultValue="aprendizado">
        <TabsList>
          <TabsTrigger value="aprendizado">{tx('Aprendizado')} {pending > 0 && <Badge className="ml-2">{pending}</Badge>}</TabsTrigger>
          <TabsTrigger value="base">{tx('Base de conhecimento')}</TabsTrigger>
          <TabsTrigger value="guardrails">{tx('Guardrails')}</TabsTrigger>
        </TabsList>

        <TabsContent value="aprendizado" className="space-y-3">
          {(learned.data ?? []).filter(l => l.status !== 'dismissed').map(l => <LearnedItem key={l.id} item={l} onDone={refresh} />)}
          {!learned.data?.length && <p className="text-sm text-muted-foreground">{tx('Nenhuma pergunta registrada ainda.')}</p>}
        </TabsContent>

        <TabsContent value="base" className="space-y-3">
          <div className="flex gap-2">
            <Button variant="outline" onClick={importTutorials}><Download className="h-4 w-4 mr-2" />{tx('Importar tutoriais da Ajuda')}</Button>
          </div>
          <NewArticle onDone={refresh} />
          {(kb.data ?? []).map(a => (
            <Card key={a.id}>
              <CardContent className="pt-4 space-y-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium flex-1">{a.title}</p>
                  <Badge variant="secondary">{a.category}</Badge>
                  <Switch checked={a.is_active} onCheckedChange={async v => { await supabase.from('support_kb_articles').update({ is_active: v }).eq('id', a.id); refresh(); }} />
                  <Button size="icon" variant="ghost" onClick={async () => { await supabase.from('support_kb_articles').delete().eq('id', a.id); refresh(); }}><Trash2 className="h-4 w-4" /></Button>
                </div>
                <p className="text-sm text-muted-foreground">{a.content}</p>
                {a.action_route && <p className="text-xs text-muted-foreground">{tx('Atalho')}: {a.action_route}</p>}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="guardrails" className="space-y-3">
          <div className="text-sm text-muted-foreground"><p>{tx('Além destas diretrizes editáveis, o Guia sempre segue estas regras fixas:')}</p><ul className="list-disc pl-5 mt-1 space-y-1">{SUPPORT_RULE_SUMMARIES.map((r) => <li key={r}>{tx(r)}</li>)}</ul></div>
          {!guards.data?.length && <Button variant="outline" onClick={loadDefaultGuards}>{tx('Carregar diretrizes padrão')}</Button>}
          {(guards.data ?? []).map(g => <GuardItem key={g.id} item={g} onDone={refresh} />)}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="text-2xl font-semibold">{value}</p></div>;
}

function LearnedItem({ item, onDone }: { item: any; onDone: () => void }) {
  const [answer, setAnswer] = useState(item.answer ?? '');
  const save = async (status: string) => {
    const { error } = await supabase.from('support_learned_qa').update({ answer, status, updated_at: new Date().toISOString() }).eq('id', item.id);
    error ? toast.error(error.message) : toast.success(status === 'approved' ? tx('Aprovado: o Guia passa a usar esta resposta') : tx('Descartado'));
    onDone();
  };
  const label = { pending: tx('Sem resposta'), suggested: tx('Usuário aprovou'), approved: tx('Aprendido') }[item.status] ?? item.status;
  return (
    <Card>
      <CardContent className="pt-4 space-y-2">
        <div className="flex items-center gap-2">
          <p className="font-medium flex-1">{item.question}</p>
          <Badge variant={item.status === 'approved' ? 'default' : 'outline'}>{label}</Badge>
        </div>
        {item.route && <p className="text-xs text-muted-foreground">{tx('Tela')}: {item.route}</p>}
        <Textarea value={answer} onChange={e => setAnswer(e.target.value)} placeholder={tx('Escreva a resposta correta para o Guia aprender')} rows={3} />
        <div className="flex gap-2">
          <Button size="sm" disabled={!answer.trim()} onClick={() => save('approved')}><Check className="h-4 w-4 mr-1" />{tx('Aprovar')}</Button>
          <Button size="sm" variant="ghost" onClick={() => save('dismissed')}>{tx('Descartar')}</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function GuardItem({ item, onDone }: { item: any; onDone: () => void }) {
  const [content, setContent] = useState(item.content);
  return (
    <Card>
      <CardContent className="pt-4 space-y-2">
        <div className="flex items-center gap-2">
          <p className="font-medium flex-1">{item.title}</p>
          <Switch checked={item.is_active} onCheckedChange={async v => { await supabase.from('support_guardrails').update({ is_active: v }).eq('id', item.id); onDone(); }} />
        </div>
        <Textarea value={content} onChange={e => setContent(e.target.value)} rows={2} />
        <Button size="sm" variant="outline" onClick={async () => { await supabase.from('support_guardrails').update({ content, updated_at: new Date().toISOString() }).eq('id', item.id); toast.success(tx('Salvo')); onDone(); }}>{tx('Salvar')}</Button>
      </CardContent>
    </Card>
  );
}

function NewArticle({ onDone }: { onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ title: '', category: '', content: '', steps: '', action_route: '' });
  if (!open) return <Button variant="secondary" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />{tx('Novo artigo')}</Button>;
  const save = async () => {
    const { error } = await supabase.from('support_kb_articles').insert({
      title: f.title, category: f.category || 'Geral', content: f.content,
      steps: f.steps.split('\n').map(s => s.trim()).filter(Boolean),
      action_route: f.action_route || null, action_label: f.action_route ? `Abrir ${f.title}` : null,
      routes: f.action_route ? [f.action_route] : [],
      keywords: f.title.toLowerCase().split(/\s+/).filter(w => w.length > 3),
    });
    if (error) return toast.error(error.message);
    setF({ title: '', category: '', content: '', steps: '', action_route: '' }); setOpen(false); onDone();
  };
  return (
    <Card><CardContent className="pt-4 space-y-2">
      <Input placeholder={tx('Título')} value={f.title} onChange={e => setF({ ...f, title: e.target.value })} />
      <Input placeholder={tx('Categoria')} value={f.category} onChange={e => setF({ ...f, category: e.target.value })} />
      <Textarea placeholder={tx('O que é / como funciona')} value={f.content} onChange={e => setF({ ...f, content: e.target.value })} />
      <Textarea placeholder={tx('Passo a passo (um por linha)')} value={f.steps} onChange={e => setF({ ...f, steps: e.target.value })} />
      <Input placeholder={tx('Atalho para a tela (ex.: /diagnosticos)')} value={f.action_route} onChange={e => setF({ ...f, action_route: e.target.value })} />
      <div className="flex gap-2"><Button disabled={!f.title || !f.content} onClick={save}>{tx('Salvar')}</Button><Button variant="ghost" onClick={() => setOpen(false)}>{tx('Cancelar')}</Button></div>
    </CardContent></Card>
  );
}
