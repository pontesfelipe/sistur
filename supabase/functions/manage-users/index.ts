import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
      
      // Verify setup key
      const setupKey = Deno.env.get('ADMIN_SETUP_KEY')?.trim()
      const providedKey = service_key?.trim()
      
      console.log(`Setup key exists: ${!!setupKey}, length: ${setupKey?.length}`)
      console.log(`Provided key exists: ${!!providedKey}, length: ${providedKey?.length}`)
      
      if (!setupKey || providedKey !== setupKey) {
        return new Response(JSON.stringify({ error: 'Invalid service key' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      console.log(`Creating user: ${email} with role ${role}`)

      // Create the user
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name }
      })

      if (createError) {
        console.error('Create error:', createError)
        return new Response(JSON.stringify({ error: createError.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      if (newUser.user && org_id) {
        // Update the new user's profile to be in the specified org
        await supabaseAdmin
          .from('profiles')
          .update({ org_id })
          .eq('user_id', newUser.user.id)

        // Update user role
        await supabaseAdmin
          .from('user_roles')
          .update({ role: role || 'VIEWER', org_id })
          .eq('user_id', newUser.user.id)
      }

      console.log(`User created successfully: ${newUser.user?.id}`)
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

    // Verify the requesting user is an admin
    const token = authHeader.replace('Bearer ', '')
    const { data: { user: requestingUser }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !requestingUser) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Check if requesting user is admin
    const { data: isAdmin } = await supabaseAdmin.rpc('has_role', {
      _user_id: requestingUser.id,
      _role: 'ADMIN'
    })

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'create') {
      const { email, password, full_name, role } = data

      // Create the user
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

      // Get the requesting user's org_id
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('org_id')
        .eq('user_id', requestingUser.id)
        .single()

      if (profile && newUser.user) {
        // Update the new user's profile to be in the same org
        await supabaseAdmin
          .from('profiles')
          .update({ org_id: profile.org_id })
          .eq('user_id', newUser.user.id)

        // Update user role if not ADMIN (default is ADMIN from trigger)
        if (role && role !== 'ADMIN') {
          await supabaseAdmin
            .from('user_roles')
            .update({ role, org_id: profile.org_id })
            .eq('user_id', newUser.user.id)
        } else {
          await supabaseAdmin
            .from('user_roles')
            .update({ org_id: profile.org_id })
            .eq('user_id', newUser.user.id)
        }
      }

      return new Response(JSON.stringify({ success: true, user: newUser.user }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'update_role') {
      const { user_id, role } = data

      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('org_id')
        .eq('user_id', requestingUser.id)
        .single()

      const { error: updateError } = await supabaseAdmin
        .from('user_roles')
        .update({ role })
        .eq('user_id', user_id)
        .eq('org_id', profile?.org_id)

      if (updateError) {
        return new Response(JSON.stringify({ error: updateError.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
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

      const { data: adminProfile } = await supabaseAdmin
        .from('profiles')
        .select('org_id')
        .eq('user_id', requestingUser.id)
        .single()

      // Verify target user is in the same org
      const { data: targetProfile } = await supabaseAdmin
        .from('profiles')
        .select('org_id')
        .eq('user_id', user_id)
        .single()

      if (targetProfile?.org_id !== adminProfile?.org_id) {
        return new Response(JSON.stringify({ error: 'User not in your organization' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

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

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'block_user') {
      const { user_id, blocked } = data

      const { data: adminProfile } = await supabaseAdmin
        .from('profiles')
        .select('org_id')
        .eq('user_id', requestingUser.id)
        .single()

      // Verify target user is in the same org
      const { data: targetProfile } = await supabaseAdmin
        .from('profiles')
        .select('org_id')
        .eq('user_id', user_id)
        .single()

      if (targetProfile?.org_id !== adminProfile?.org_id) {
        return new Response(JSON.stringify({ error: 'User not in your organization' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Block by setting pending_approval back to true (effectively blocks access)
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

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'delete_user') {
      const { user_id } = data

      const { data: adminProfile } = await supabaseAdmin
        .from('profiles')
        .select('org_id')
        .eq('user_id', requestingUser.id)
        .single()

      // Verify target user is in the same org
      const { data: targetProfile } = await supabaseAdmin
        .from('profiles')
        .select('org_id')
        .eq('user_id', user_id)
        .single()

      if (targetProfile?.org_id !== adminProfile?.org_id) {
        return new Response(JSON.stringify({ error: 'User not in your organization' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Prevent self-deletion
      if (user_id === requestingUser.id) {
        return new Response(JSON.stringify({ error: 'Cannot delete yourself' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Delete user_roles first
      await supabaseAdmin
        .from('user_roles')
        .delete()
        .eq('user_id', user_id)

      // Delete profile
      await supabaseAdmin
        .from('profiles')
        .delete()
        .eq('user_id', user_id)

      // Delete auth user
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

    if (action === 'list') {
      // Get the requesting user's org_id
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('org_id')
        .eq('user_id', requestingUser.id)
        .single()

      if (!profile) {
        return new Response(JSON.stringify({ error: 'Profile not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Get all users in the same org (excluding pending users - they appear in pending panel)
      const { data: profiles, error: profilesError } = await supabaseAdmin
        .from('profiles')
        .select(`
          user_id,
          full_name,
          avatar_url,
          created_at,
          system_access,
          pending_approval
        `)
        .eq('org_id', profile.org_id)
        .eq('pending_approval', false)

      if (profilesError) {
        return new Response(JSON.stringify({ error: profilesError.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Get roles for these users
      const { data: roles } = await supabaseAdmin
        .from('user_roles')
        .select('user_id, role')
        .eq('org_id', profile.org_id)

      // Get emails from auth.users
      const userIds = profiles?.map(p => p.user_id) || []
      const usersWithEmail = await Promise.all(
        userIds.map(async (userId) => {
          const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(userId)
          return { user_id: userId, email: user?.email }
        })
      )

      // Combine data
      const users = profiles?.map(p => ({
        ...p,
        email: usersWithEmail.find(u => u.user_id === p.user_id)?.email,
        role: roles?.find(r => r.user_id === p.user_id)?.role || 'VIEWER',
        system_access: p.system_access,
        is_blocked: p.pending_approval
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

      // Get all users in the specified org
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

      // Get roles for these users
      const { data: roles } = await supabaseAdmin
        .from('user_roles')
        .select('user_id, role')
        .eq('org_id', org_id)

      // Get emails from auth.users
      const userIds = profiles?.map(p => p.user_id) || []
      const usersWithEmail = await Promise.all(
        userIds.map(async (userId) => {
          const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(userId)
          return { user_id: userId, email: user?.email }
        })
      )

      // Combine data
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
      const { user_id, new_org_id } = data

      if (!user_id || !new_org_id) {
        return new Response(JSON.stringify({ error: 'user_id and new_org_id are required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Update user's profile org
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

      // Update user's role org
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

      // Get or create an "unassigned" org
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

      // Move user to unassigned org
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

      return new Response(JSON.stringify({ success: true }), {
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
