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

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const authClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: userData, error: userError } = await authClient.auth.getUser()
    const caller = userData?.user
    if (userError || !caller) return json({ error: 'Unauthorized' }, 401)

    const admin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    const { data: callerRoles, error: rolesError } = await admin
      .from('user_roles')
      .select('role, org_id')
      .eq('user_id', caller.id)
    if (rolesError) {
      console.error('Failed to read caller roles', { code: rolesError.code })
      return json({ error: 'Failed to verify permissions' }, 500)
    }

    const body = await req.json().catch(() => ({}))
    const profileId = typeof body?.profileId === 'string' ? body.profileId : ''
    if (!profileId) return json({ error: 'profileId is required' }, 400)

    // Recipient is derived from trusted data, never from the browser.
    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('user_id, full_name, org_id')
      .eq('id', profileId)
      .maybeSingle()
    if (profileError) {
      console.error('Failed to read profile', { code: profileError.code })
      return json({ error: 'Failed to load recipient' }, 500)
    }
    if (!profile?.user_id) return json({ error: 'Recipient not found' }, 404)

    const { data: authUser, error: authUserError } = await admin.auth.admin.getUserById(
      profile.user_id,
    )
    if (authUserError || !authUser?.user?.email) {
      console.error('Failed to resolve recipient email', { hasError: !!authUserError })
      return json({ error: 'Recipient not found' }, 404)
    }
    const recipientEmail = authUser.user.email

    const isGlobalAdmin = (callerRoles ?? []).some((r: any) => r.role === 'ADMIN')
    const isOrgAdmin = (callerRoles ?? []).some(
      (r: any) => r.role === 'ORG_ADMIN' && r.org_id === profile.org_id,
    )
    if (!isGlobalAdmin && !isOrgAdmin) return json({ error: 'Forbidden' }, 403)

    const role = ROLES.includes(body?.role) ? body.role : undefined
    const systemAccess = SYSTEMS.includes(body?.systemAccess) ? body.systemAccess : undefined

    const result = await sendTemplateEmailWithLog('access-approved', recipientEmail, {
      templateData: { userName: profile.full_name || undefined, role, systemAccess },
      idempotencyKey: `access-approved-${profileId}`,
    })

    return json({ success: result.sent, reason: result.sent ? undefined : result.reason })
  } catch (error) {
    console.error('notify-access-approved failed', {
      message: error instanceof Error ? error.message : 'unknown',
    })
    return json({ error: 'Failed to send email' }, 500)
  }
})
