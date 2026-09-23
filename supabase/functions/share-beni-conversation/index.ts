import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { z } from 'npm:zod@3.23.8'
import { requireUser } from '../_shared/auth.ts'
import { sendTemplateEmailWithLog } from '../_shared/email-send-log.ts'

const Body = z.object({
  conversationId: z.string().uuid(),
  emails: z.array(z.string().email()).min(1).max(5),
  note: z.string().max(1000).optional().nullable(),
})

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const auth = await requireUser(req)
  if (auth instanceof Response) return auth
  const parsed = Body.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return json({ error: 'Dados inválidos', details: parsed.error.flatten().fieldErrors }, 400)
  const { conversationId, emails, note } = parsed.data
  const client = auth.client

  const { data: conv } = await client.from('beni_conversations').select('id, title').eq('id', conversationId).maybeSingle()
  if (!conv) return json({ error: 'Conversa não encontrada' }, 404)
  const { data: msgs } = await client.from('beni_chat_messages')
    .select('role, content').eq('conversation_id', conversationId).order('created_at', { ascending: true })
  const { data: profile } = await client.from('profiles').select('full_name').eq('user_id', auth.user.id).maybeSingle()
  const sender = (profile as any)?.full_name || auth.user.email || 'Um usuário do SISTUR'

  const transcript = (msgs ?? []).map((m: any) =>
    `${m.role === 'user' ? 'Pergunta' : 'Professor Beni'}: ${m.content}`).join('\n')
  const bodyText = [
    `${sender} compartilhou com você a conversa "${conv.title}" com o Professor Beni.`,
    note ? `Mensagem: ${note}` : '',
    transcript.slice(0, 40000),
  ].filter(Boolean).join('\n')

  let sent = 0
  for (const to of emails) {
    try {
      await sendTemplateEmailWithLog('custom-message', to, {
        templateData: { subject: `Conversa com o Professor Beni: ${conv.title}`, messageBody: bodyText },
        idempotencyKey: `beni-share-${conversationId}-${to}-${Date.now()}`,
      } as any)
      sent++
    } catch (e) {
      console.error('share email failed', to, e)
    }
  }
  if (sent === 0) return json({ error: 'Não foi possível enviar o e-mail.' }, 500)
  return json({ sent })
})
