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
      
      // Verify service key matches service role key
      if (service_key !== Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')) {
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

      // Get all users in the same org
      const { data: profiles, error: profilesError } = await supabaseAdmin
        .from('profiles')
        .select(`
          user_id,
          full_name,
          avatar_url,
          created_at
        `)
        .eq('org_id', profile.org_id)

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
        role: roles?.find(r => r.user_id === p.user_id)?.role || 'VIEWER'
      }))

      return new Response(JSON.stringify({ users }), {
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
