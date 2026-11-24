import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { token, password, full_name } = await req.json();

    if (!token || !password || !full_name) {
      return new Response(
        JSON.stringify({ error: "Token, password, and full_name are required." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (password.length < 8) {
      return new Response(
        JSON.stringify({ error: "Password must be at least 8 characters." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (full_name.trim().length < 2) {
      return new Response(
        JSON.stringify({ error: "Full name must be at least 2 characters." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Look up the invite by token
    const { data: invite, error: inviteError } = await supabase
      .from("admin_invites")
      .select("id, email, role, expires_at, accepted_at")
      .eq("token", token)
      .maybeSingle();

    if (inviteError || !invite) {
      return new Response(
        JSON.stringify({ error: "Invalid invitation token." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (invite.accepted_at) {
      return new Response(
        JSON.stringify({ error: "This invitation has already been used." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (new Date(invite.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: "This invitation has expired." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Check if an admin account already exists for this email
    const { data: existingAdmin } = await supabase
      .from("admin_accounts")
      .select("id")
      .eq("email", invite.email)
      .maybeSingle();

    if (existingAdmin) {
      return new Response(
        JSON.stringify({ error: "An admin account with this email already exists." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Create the auth user with service role (bypasses email confirmation)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: invite.email,
      password,
      email_confirm: true,
      user_metadata: { full_name, is_admin: true },
    });

    if (authError || !authData.user) {
      return new Response(
        JSON.stringify({ error: authError?.message || "Failed to create user account." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Insert into admin_accounts with the role from the invite
    const { error: adminError } = await supabase.from("admin_accounts").insert({
      id: authData.user.id,
      email: invite.email,
      full_name,
      role: invite.role,
      status: "active",
    });

    if (adminError) {
      // Clean up the auth user if admin insert failed
      await supabase.auth.admin.deleteUser(authData.user.id);
      return new Response(
        JSON.stringify({ error: adminError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Mark the invite as accepted
    await supabase
      .from("admin_invites")
      .update({ accepted_at: new Date().toISOString() })
      .eq("id", invite.id);

    // Log the action
    await supabase.from("admin_audit_logs").insert({
      admin_id: authData.user.id,
      admin_email: invite.email,
      action: "invite.accepted",
      resource_type: "invite",
      resource_id: invite.id,
      details: { full_name, role: invite.role },
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Admin account created. You can now sign in.",
        email: invite.email,
      }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
