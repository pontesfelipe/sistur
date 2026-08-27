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

    const body = await req.json().catch(() => null)
    const kind = body?.kind
    if (kind !== 'level-up' && kind !== 'badge-earned') {
      return json({ error: 'Invalid kind' }, 400)
    }

    let result
    if (kind === 'level-up') {
      const level = Number(body?.level)
      const totalXp = Number(body?.totalXp)
      if (!Number.isFinite(level)) return json({ error: 'Invalid level' }, 400)
      result = await sendTemplateEmailWithLog('edu-level-up', user.email, {
        templateData: { level, totalXp },
        idempotencyKey: `edu-level-up-${user.id}-${level}`,
      })
    } else {
      const badgeId = String(body?.badgeId ?? '')
      const badgeTitle = String(body?.badgeTitle ?? '')
      const xpReward = Number(body?.xpReward ?? 0)
      if (!badgeId || !badgeTitle) return json({ error: 'Invalid badge' }, 400)
      result = await sendTemplateEmailWithLog('edu-badge-earned', user.email, {
        templateData: { badgeTitle, xpReward },
        idempotencyKey: `edu-badge-earned-${user.id}-${badgeId}`,
      })
    }

    return json({ success: result.sent, reason: result.sent ? undefined : result.reason })
  } catch (error) {
    console.error('notify-edu-achievement failed', {
      message: error instanceof Error ? error.message : 'unknown',
    })
    return json({ error: 'Failed to send email' }, 500)
  }
})
