import { createClient } from 'npm:@supabase/supabase-js@2'
import { sendTemplateEmailWithLog } from '../_shared/email-send-log.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SITE_URL = 'https://sistur.app'
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    if (!authHeader.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const authClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: userData, error: userError } = await authClient.auth.getUser()
    const caller = userData?.user
    if (userError || !caller) return json({ error: 'Unauthorized' }, 401)

    const admin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    const { data: roles, error: rolesError } = await admin
      .from('user_roles')
      .select('role')
      .eq('user_id', caller.id)
    if (rolesError) {
      console.error('Failed to read caller roles', { code: rolesError.code })
      return json({ error: 'Failed to verify permissions' }, 500)
    }
    const allowed = (roles ?? []).some((r: any) => r.role === 'PROFESSOR' || r.role === 'ADMIN')
    if (!allowed) return json({ error: 'Forbidden' }, 403)

    const body = await req.json().catch(() => ({}))
    const rawEmails: unknown = body?.emails
    const message = typeof body?.message === 'string' ? body.message.slice(0, 800) : ''

    if (!Array.isArray(rawEmails) || rawEmails.length === 0) {
      return json({ error: 'Informe ao menos um e-mail' }, 400)
    }
    if (rawEmails.length > 30) {
      return json({ error: 'Máximo de 30 convites por vez' }, 400)
    }
    const emails = Array.from(
      new Set(
        rawEmails
          .filter((e): e is string => typeof e === 'string')
          .map((e) => e.trim().toLowerCase())
          .filter((e) => EMAIL_RE.test(e)),
      ),
    )
    if (emails.length === 0) return json({ error: 'Nenhum e-mail válido informado' }, 400)

    // Referral code is resolved (or created) server-side for the caller.
    let code: string | null = null
    const { data: existing } = await admin
      .from('professor_referral_codes')
      .select('code')
      .eq('professor_id', caller.id)
      .limit(1)
      .maybeSingle()
    code = existing?.code ?? null

    if (!code) {
      const generated = `PROF${Math.random().toString(36).substring(2, 8).toUpperCase()}`
      const { data: created, error: createError } = await admin
        .from('professor_referral_codes')
        .insert({ professor_id: caller.id, code: generated })
        .select('code')
        .single()
      if (createError) {
        console.error('Failed to create referral code', { code: createError.code })
        return json({ error: 'Falha ao gerar código de indicação' }, 500)
      }
      code = created.code
    }

    const { data: profile } = await admin
      .from('profiles')
      .select('full_name')
      .eq('user_id', caller.id)
      .maybeSingle()
    const professorName = profile?.full_name || 'seu professor'

    const inviteLink = `${SITE_URL}/edu/turmas?ref=${encodeURIComponent(code!)}`

    let sent = 0
    const failed: string[] = []
    for (const email of emails) {
      try {
        const messageBody = [
          `${professorName} convidou você para participar das turmas dele no SISTUR EDU.`,
          message,
          `Seu código de vínculo é ${code}.`,
          `Acesse ${inviteLink} — se você já tem conta, basta entrar; se ainda não tem, crie a sua com o mesmo e-mail e informe o código.`,
        ]
          .filter(Boolean)
          .join('\n')

        const result = await sendTemplateEmailWithLog('custom-message', email, {
          templateData: {
            subject: `Convite de ${professorName} — SISTUR EDU`,
            messageBody,
          },
          idempotencyKey: `professor-invite-${code}-${email}`,
        })
        if (result.sent) sent += 1
        else failed.push(email)
      } catch (err) {
        console.error('Invite send failed', { hasError: !!err })
        failed.push(email)
      }
    }

    return json({ success: true, sent, failed, code })
  } catch (error) {
    console.error('invite-student failed', {
      message: error instanceof Error ? error.message : 'unknown',
    })
    return json({ error: 'Falha ao enviar convites' }, 500)
  }
})
