import { createClient } from 'npm:@supabase/supabase-js@2'
import { sendTemplateEmailWithLog } from '../_shared/email-send-log.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ROLES = ['VIEWER', 'ESTUDANTE', 'PROFESSOR', 'ANALYST', 'ORG_ADMIN', 'ADMIN']
const SYSTEMS = ['ERP', 'EDU']

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    if (!authHeader.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )
    const { data: userData, error: userError } = await supabase.auth.getUser()
    const user = userData?.user
    if (userError || !user?.email) return json({ error: 'Unauthorized' }, 401)

    const body = await req.json().catch(() => ({}))
    const role = ROLES.includes(body?.role) ? body.role : undefined
    const systemAccess = SYSTEMS.includes(body?.systemAccess) ? body.systemAccess : undefined
    const userName =
      typeof body?.userName === 'string' && body.userName.trim()
        ? body.userName.trim().slice(0, 120)
        : undefined

    const result = await sendTemplateEmailWithLog('access-requested', user.email, {
      templateData: { userName, role, systemAccess },
      idempotencyKey: `access-requested-${user.id}`,
    })

    return json({ success: result.sent, reason: result.sent ? undefined : result.reason })
  } catch (error) {
    console.error('notify-access-requested failed', {
      message: error instanceof Error ? error.message : 'unknown',
    })
    return json({ error: 'Failed to send email' }, 500)
  }
})
