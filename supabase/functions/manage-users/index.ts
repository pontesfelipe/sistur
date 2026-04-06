import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Role → License plan mapping
const ROLE_TO_PLAN: Record<string, string> = {
  ADMIN: 'enterprise',
  ANALYST: 'pro',
  VIEWER: 'basic',
  ESTUDANTE: 'estudante',
  PROFESSOR: 'professor',
}

// Default features per plan
const DEFAULT_FEATURES: Record<string, Record<string, boolean>> = {
  trial: { erp: true, edu: true, games: true, reports: false, integrations: false },
  estudante: { erp: false, edu: true, games: true, reports: false, integrations: false },
  professor: { erp: false, edu: true, games: true, reports: true, integrations: false },
  basic: { erp: true, edu: true, games: true, reports: true, integrations: false },
  pro: { erp: true, edu: true, games: true, reports: true, integrations: true },
  enterprise: { erp: true, edu: true, games: true, reports: true, integrations: true },
}

// Roles that ORG_ADMIN can assign (cannot assign ADMIN or ORG_ADMIN)
const ORG_ADMIN_ASSIGNABLE_ROLES = ['ANALYST', 'VIEWER', 'ESTUDANTE', 'PROFESSOR']

/**
 * Sync a user's license to match their role.
 */
async function syncLicense(
  supabaseAdmin: any,
  userId: string,
  orgId: string,
  role: string
) {
  const plan = ROLE_TO_PLAN[role] || 'basic'
  const features = DEFAULT_FEATURES[plan] || DEFAULT_FEATURES.basic
  const isAdmin = role === 'ADMIN'

  const { data: existing } = await supabaseAdmin
    .from('licenses')
    .select('id, plan, status')
    .eq('user_id', userId)
    .single()

  if (existing) {
    await supabaseAdmin
      .from('licenses')
      .update({
        org_id: orgId,
        plan,
        features,
        expires_at: isAdmin ? null : existing.expires_at ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
  } else {
    await supabaseAdmin
      .from('licenses')
      .insert({
        user_id: userId,
        org_id: orgId,
        plan,
        status: 'active',
        activated_at: new Date().toISOString(),
        expires_at: null,
        max_users: 1,
        features,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { action, ...data } = await req.json()
    
    // Service-level user creation (for initial setup)
    if (action === 'service_create') {
      const { email, password, full_name, role, org_id, service_key } = data
      
      const setupKey = Deno.env.get('ADMIN_SETUP_KEY')?.trim()
      const providedKey = service_key?.trim()
      
      if (!setupKey || providedKey !== setupKey) {
        return new Response(JSON.stringify({ error: 'Invalid service key' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name }
      })

      if (createError) {
        return new Response(JSON.stringify({ error: createError.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      if (newUser.user && org_id) {
        await supabaseAdmin
          .from('profiles')
          .update({ org_id })
          .eq('user_id', newUser.user.id)

        await supabaseAdmin
          .from('user_roles')
          .update({ role: role || 'VIEWER', org_id })
          .eq('user_id', newUser.user.id)

        await syncLicense(supabaseAdmin, newUser.user.id, org_id, role || 'VIEWER')
      }

      return new Response(JSON.stringify({ success: true, user: newUser.user }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get the authorization header to verify the requesting user
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user: requestingUser }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !requestingUser) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Check if requesting user is ADMIN or ORG_ADMIN
    const { data: isAdmin } = await supabaseAdmin.rpc('has_role', {
      _user_id: requestingUser.id,
      _role: 'ADMIN'
    })

    const { data: isOrgAdmin } = await supabaseAdmin.rpc('has_org_admin_role', {
      _user_id: requestingUser.id,
    })

    const hasManagementAccess = isAdmin || isOrgAdmin

    if (!hasManagementAccess) {
      return new Response(JSON.stringify({ error: 'Admin or Org Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get requesting user's profile
    const { data: requesterProfile } = await supabaseAdmin
      .from('profiles')
      .select('org_id')
      .eq('user_id', requestingUser.id)
      .single()

    const requesterOrgId = requesterProfile?.org_id

    // Helper: verify ORG_ADMIN can only act on their own org's users
    const verifyOrgAdminScope = async (targetUserId: string) => {
      if (isAdmin) return true // ADMIN can do anything
      
      const { data: targetProfile } = await supabaseAdmin
        .from('profiles')
        .select('org_id')
        .eq('user_id', targetUserId)
        .single()
      
      if (targetProfile?.org_id !== requesterOrgId) {
        return false
      }
      return true
    }

    if (action === 'create') {
      const { email, password, full_name, role, org_id, system_access } = data

      if (!email || !password || !full_name || !role || !system_access) {
        return new Response(JSON.stringify({ error: 'Missing required fields' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // ORG_ADMIN can only create users in their own org
      const targetOrgId = isAdmin ? (org_id || requesterOrgId) : requesterOrgId
      
      if (!isAdmin && org_id && org_id !== requesterOrgId) {
        return new Response(JSON.stringify({ error: 'Cannot create users in other organizations' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // ORG_ADMIN cannot assign ADMIN or ORG_ADMIN roles
      if (!isAdmin && !ORG_ADMIN_ASSIGNABLE_ROLES.includes(role)) {
        return new Response(JSON.stringify({ error: 'Cannot assign this role' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Validate role based on system access
      const eduRoles = ['ESTUDANTE', 'PROFESSOR']
      const erpRoles = ['ADMIN', 'ORG_ADMIN', 'ANALYST', 'VIEWER']
      
      if (system_access === 'EDU' && !eduRoles.includes(role)) {
        return new Response(JSON.stringify({ error: 'EDU users must have role ESTUDANTE or PROFESSOR' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      
      if (system_access === 'ERP' && !erpRoles.includes(role)) {
        return new Response(JSON.stringify({ error: 'ERP users must have role ADMIN, ORG_ADMIN, ANALYST, or VIEWER' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name }
      })

      if (createError) {
        return new Response(JSON.stringify({ error: createError.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      if (newUser.user) {
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .update({ 
            org_id: targetOrgId,
            system_access: system_access,
            pending_approval: false
          })
          .eq('user_id', newUser.user.id)

        if (profileError) {
          console.error('Profile update error:', profileError)
        }

        const { data: existingRole } = await supabaseAdmin
          .from('user_roles')
          .select('user_id')
          .eq('user_id', newUser.user.id)
          .single()

        if (existingRole) {
          await supabaseAdmin
            .from('user_roles')
            .update({ role, org_id: targetOrgId })
            .eq('user_id', newUser.user.id)
        } else {
          await supabaseAdmin
            .from('user_roles')
            .insert({ user_id: newUser.user.id, role, org_id: targetOrgId })
        }

        await syncLicense(supabaseAdmin, newUser.user.id, targetOrgId, role)
      }

      return new Response(JSON.stringify({ success: true, user: newUser.user }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'update_role') {
      const { user_id, role } = data

      // ORG_ADMIN cannot assign ADMIN or ORG_ADMIN roles
      if (!isAdmin && !ORG_ADMIN_ASSIGNABLE_ROLES.includes(role)) {
        return new Response(JSON.stringify({ error: 'Cannot assign this role' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Verify scope
      if (!(await verifyOrgAdminScope(user_id))) {
        return new Response(JSON.stringify({ error: 'User not in your organization' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Cannot modify another ADMIN or ORG_ADMIN if you're only ORG_ADMIN
      if (!isAdmin) {
        const { data: targetRole } = await supabaseAdmin
          .from('user_roles')
          .select('role')
          .eq('user_id', user_id)
          .single()
        
        if (targetRole?.role === 'ADMIN' || targetRole?.role === 'ORG_ADMIN') {
          return new Response(JSON.stringify({ error: 'Cannot modify admin users' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }
      }

      const { data: targetProfile } = await supabaseAdmin
        .from('profiles')
        .select('org_id')
        .eq('user_id', user_id)
        .single()

      const { error: updateError } = await supabaseAdmin
        .from('user_roles')
        .update({ role })
        .eq('user_id', user_id)
        .eq('org_id', targetProfile?.org_id)

      if (updateError) {
        return new Response(JSON.stringify({ error: updateError.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      if (targetProfile?.org_id) {
        await syncLicense(supabaseAdmin, user_id, targetProfile.org_id, role)
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'update_system_access') {
      const { user_id, system_access } = data

      if (!['ERP', 'EDU'].includes(system_access)) {
        return new Response(JSON.stringify({ error: 'Invalid system_access value' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      if (!(await verifyOrgAdminScope(user_id))) {
        return new Response(JSON.stringify({ error: 'User not in your organization' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const { data: targetProfile } = await supabaseAdmin
        .from('profiles')
        .select('org_id')
        .eq('user_id', user_id)
        .single()

      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({ system_access })
        .eq('user_id', user_id)

      if (updateError) {
        return new Response(JSON.stringify({ error: updateError.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const { data: roleData } = await supabaseAdmin
        .from('user_roles')
        .select('role')
        .eq('user_id', user_id)
        .single()

      if (roleData && targetProfile?.org_id) {
        await syncLicense(supabaseAdmin, user_id, targetProfile.org_id, roleData.role)
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'block_user') {
      const { user_id, blocked } = data

      if (!(await verifyOrgAdminScope(user_id))) {
        return new Response(JSON.stringify({ error: 'User not in your organization' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // ORG_ADMIN cannot block ADMIN or ORG_ADMIN
      if (!isAdmin) {
        const { data: targetRole } = await supabaseAdmin
          .from('user_roles')
          .select('role')
          .eq('user_id', user_id)
          .single()
        
        if (targetRole?.role === 'ADMIN' || targetRole?.role === 'ORG_ADMIN') {
          return new Response(JSON.stringify({ error: 'Cannot block admin users' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }
      }

      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({ pending_approval: blocked })
        .eq('user_id', user_id)

      if (updateError) {
        return new Response(JSON.stringify({ error: updateError.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      if (blocked) {
        await supabaseAdmin
          .from('licenses')
          .update({ status: 'suspended', updated_at: new Date().toISOString() })
          .eq('user_id', user_id)
          .eq('status', 'active')
      } else {
        await supabaseAdmin
          .from('licenses')
          .update({ status: 'active', updated_at: new Date().toISOString() })
          .eq('user_id', user_id)
          .eq('status', 'suspended')
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'delete_user') {
      const { user_id } = data

      if (user_id === requestingUser.id) {
        return new Response(JSON.stringify({ error: 'Cannot delete yourself' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      if (!(await verifyOrgAdminScope(user_id))) {
        return new Response(JSON.stringify({ error: 'User not in your organization' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // ORG_ADMIN cannot delete ADMIN or ORG_ADMIN
      if (!isAdmin) {
        const { data: targetRole } = await supabaseAdmin
          .from('user_roles')
          .select('role')
          .eq('user_id', user_id)
          .single()
        
        if (targetRole?.role === 'ADMIN' || targetRole?.role === 'ORG_ADMIN') {
          return new Response(JSON.stringify({ error: 'Cannot delete admin users' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }
      }

      await supabaseAdmin.from('licenses').delete().eq('user_id', user_id)
      await supabaseAdmin.from('user_roles').delete().eq('user_id', user_id)
      await supabaseAdmin.from('profiles').delete().eq('user_id', user_id)

      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user_id)

      if (deleteError) {
        return new Response(JSON.stringify({ error: deleteError.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'list_pending') {
      // Only ADMIN can see all pending users
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: 'Admin access required' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const { data: pendingProfiles, error: pendingProfilesError } = await supabaseAdmin
        .from('profiles')
        .select('id, user_id, full_name, system_access, approval_requested_at')
        .eq('pending_approval', true)
        .order('approval_requested_at', { ascending: false })

      if (pendingProfilesError) {
        return new Response(JSON.stringify({ error: pendingProfilesError.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const users = await Promise.all(
        (pendingProfiles || []).map(async (profile) => {
          const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(profile.user_id)
          if (userError) {
            console.error(`Error fetching email for pending user ${profile.user_id}:`, userError)
          }
          return {
            ...profile,
            email: userData.user?.email ?? null,
          }
        })
      )

      return new Response(JSON.stringify({ users }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'list') {
      // For ORG_ADMIN, always scope to their own org
      const targetOrgId = requesterOrgId

      if (!targetOrgId) {
        return new Response(JSON.stringify({ error: 'Profile not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const { data: profiles, error: profilesError } = await supabaseAdmin
        .from('profiles')
        .select('user_id, full_name, avatar_url, created_at, system_access, pending_approval')
        .eq('org_id', targetOrgId)
        .eq('pending_approval', false)

      if (profilesError) {
        return new Response(JSON.stringify({ error: profilesError.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const { data: roles } = await supabaseAdmin
        .from('user_roles')
        .select('user_id, role')
        .eq('org_id', targetOrgId)

      const userIds = profiles?.map(p => p.user_id) || []
      const usersWithEmail = await Promise.all(
        userIds.map(async (userId) => {
          const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(userId)
          return { user_id: userId, email: user?.email }
        })
      )

      const { data: termsAcceptances } = await supabaseAdmin
        .from('terms_acceptance')
        .select('user_id, accepted_at')
        .in('user_id', userIds)

      const users = profiles?.map(p => ({
        ...p,
        email: usersWithEmail.find(u => u.user_id === p.user_id)?.email,
        role: roles?.find(r => r.user_id === p.user_id)?.role || 'VIEWER',
        system_access: p.system_access,
        is_blocked: p.pending_approval,
        terms_accepted_at: termsAcceptances?.find(t => t.user_id === p.user_id)?.accepted_at || null
      }))

      return new Response(JSON.stringify({ users }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'list_by_org') {
      const { org_id } = data

      if (!org_id) {
        return new Response(JSON.stringify({ error: 'org_id is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // ORG_ADMIN can only list their own org
      if (!isAdmin && org_id !== requesterOrgId) {
        return new Response(JSON.stringify({ error: 'Cannot list users from other organizations' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const { data: profiles, error: profilesError } = await supabaseAdmin
        .from('profiles')
        .select('user_id, full_name, avatar_url, created_at, system_access')
        .eq('org_id', org_id)
        .eq('pending_approval', false)

      if (profilesError) {
        return new Response(JSON.stringify({ error: profilesError.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const { data: roles } = await supabaseAdmin
        .from('user_roles')
        .select('user_id, role')
        .eq('org_id', org_id)

      const userIds = profiles?.map(p => p.user_id) || []
      const usersWithEmail = await Promise.all(
        userIds.map(async (userId: string) => {
          const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(userId)
          return { user_id: userId, email: user?.email }
        })
      )

      const users = profiles?.map(p => ({
        ...p,
        email: usersWithEmail.find(u => u.user_id === p.user_id)?.email,
        role: roles?.find(r => r.user_id === p.user_id)?.role || 'VIEWER',
      }))

      return new Response(JSON.stringify({ users }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'change_org') {
      // Only ADMIN can move users between orgs
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: 'Admin access required' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const { user_id, new_org_id } = data

      if (!user_id || !new_org_id) {
        return new Response(JSON.stringify({ error: 'user_id and new_org_id are required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({ org_id: new_org_id })
        .eq('user_id', user_id)

      if (profileError) {
        return new Response(JSON.stringify({ error: profileError.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .update({ org_id: new_org_id })
        .eq('user_id', user_id)

      if (roleError) {
        return new Response(JSON.stringify({ error: roleError.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      await supabaseAdmin
        .from('licenses')
        .update({ org_id: new_org_id, updated_at: new Date().toISOString() })
        .eq('user_id', user_id)

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'remove_from_org') {
      const { user_id } = data

      if (!user_id) {
        return new Response(JSON.stringify({ error: 'user_id is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      if (!(await verifyOrgAdminScope(user_id))) {
        return new Response(JSON.stringify({ error: 'User not in your organization' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      let unassignedOrgId: string

      const { data: existingOrg } = await supabaseAdmin
        .from('orgs')
        .select('id')
        .eq('name', 'Não Atribuídos')
        .single()

      if (existingOrg) {
        unassignedOrgId = existingOrg.id
      } else {
        const { data: newOrg, error: createError } = await supabaseAdmin
          .from('orgs')
          .insert({ name: 'Não Atribuídos' })
          .select('id')
          .single()

        if (createError || !newOrg) {
          return new Response(JSON.stringify({ error: 'Failed to create unassigned org' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }
        unassignedOrgId = newOrg.id
      }

      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({ org_id: unassignedOrgId })
        .eq('user_id', user_id)

      if (profileError) {
        return new Response(JSON.stringify({ error: profileError.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .update({ org_id: unassignedOrgId })
        .eq('user_id', user_id)

      if (roleError) {
        return new Response(JSON.stringify({ error: roleError.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      await supabaseAdmin
        .from('licenses')
        .update({ org_id: unassignedOrgId, updated_at: new Date().toISOString() })
        .eq('user_id', user_id)

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'get_emails') {
      const { user_ids } = data

      if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
        return new Response(JSON.stringify({ error: 'user_ids array is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const usersWithEmail = await Promise.all(
        user_ids.map(async (userId: string) => {
          const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(userId)
          return { user_id: userId, email: user?.email || null }
        })
      )

      return new Response(JSON.stringify({ users: usersWithEmail }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
