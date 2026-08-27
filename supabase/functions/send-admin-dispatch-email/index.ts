import { createClient } from 'npm:@supabase/supabase-js@2'
import { sendTemplateEmailWithLog } from '../_shared/email-send-log.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Admin dispatch tool: only these operational templates may be sent.
const ALLOWED_TEMPLATES = ['access-approved', 'access-requested', 'custom-message']

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
    const { data: isAdmin, error: roleError } = await admin.rpc('has_role', {
      _user_id: caller.id,
      _role: 'ADMIN',
    })
    if (roleError) {
      console.error('Failed to verify admin role', { code: roleError.code })
      return json({ error: 'Failed to verify permissions' }, 500)
    }
    if (!isAdmin) return json({ error: 'Forbidden' }, 403)

    const body = await req.json().catch(() => ({}))
    const templateName = String(body?.templateName ?? '')
    if (!ALLOWED_TEMPLATES.includes(templateName)) {
      return json({ error: 'Template not allowed' }, 400)
    }

    const userId = typeof body?.userId === 'string' ? body.userId : ''
    if (!userId) return json({ error: 'userId is required' }, 400)

    // Recipient is resolved server-side from the profile record.
    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('email, full_name')
      .eq('user_id', userId)
      .maybeSingle()
    if (profileError) {
      console.error('Failed to read recipient profile', { code: profileError.code })
      return json({ error: 'Failed to load recipient' }, 500)
    }
    if (!profile?.email) return json({ error: 'Recipient not found' }, 404)

    const templateData: Record<string, unknown> = {}
    if (profile.full_name) templateData.userName = profile.full_name

    if (templateName === 'custom-message') {
      const subject = String(body?.subject ?? '').trim()
      const messageBody = String(body?.messageBody ?? '').trim()
      if (!subject || subject.length > 200) return json({ error: 'Invalid subject' }, 400)
      if (!messageBody || messageBody.length > 5000) return json({ error: 'Invalid message' }, 400)
      templateData.subject = subject
      templateData.messageBody = messageBody
    }

    const result = await sendTemplateEmailWithLog(templateName, profile.email, {
      templateData,
      idempotencyKey: `admin-dispatch-${templateName}-${userId}-${Date.now()}`,
    })

    return json({ success: result.sent, reason: result.sent ? undefined : result.reason })
  } catch (error) {
    console.error('send-admin-dispatch-email failed', {
      message: error instanceof Error ? error.message : 'unknown',
    })
    return json({ error: 'Failed to send email' }, 500)
  }
})
