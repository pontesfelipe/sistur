import { createClient } from 'npm:@supabase/supabase-js@2'
import { sendTemplateEmailWithLog } from '../_shared/email-send-log.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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
    const assessmentId = typeof body?.assessmentId === 'string' ? body.assessmentId : ''
    const destinationName =
      typeof body?.destinationName === 'string' && body.destinationName.trim()
        ? body.destinationName.trim().slice(0, 160)
        : 'seu diagnóstico'
    const diagnosticType = typeof body?.diagnosticType === 'string' ? body.diagnosticType : undefined
    const drops = Array.isArray(body?.drops)
      ? body.drops.slice(0, 20).map((d: any) => ({
          pillar: String(d?.pillar ?? ''),
          from: Number(d?.from ?? 0),
          to: Number(d?.to ?? 0),
          drop1: Number(d?.drop1 ?? 0),
          drop2: Number(d?.drop2 ?? 0),
        }))
      : []

    if (drops.length === 0) return json({ error: 'No regression data provided' }, 400)

    const result = await sendTemplateEmailWithLog('enterprise-regression-alert', user.email, {
      templateData: { destinationName, diagnosticType, assessmentId, drops },
      idempotencyKey: `enterprise-regression-alert-${assessmentId || user.id}-${new Date()
        .toISOString()
        .slice(0, 10)}`,
    })

    return json({ success: result.sent, reason: result.sent ? undefined : result.reason })
  } catch (error) {
    console.error('notify-enterprise-regression failed', {
      message: error instanceof Error ? error.message : 'unknown',
    })
    return json({ error: 'Failed to send email' }, 500)
  }
})
