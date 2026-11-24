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

    const { email, password, full_name } = await req.json();

    if (!email || !password || !full_name) {
      return new Response(
        JSON.stringify({ error: "Email, password, and full_name are required." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Check if any super_admin already exists
    const { data: existingAdmins } = await supabase
      .from("admin_accounts")
      .select("id")
      .eq("role", "super_admin")
      .limit(1);

    if (existingAdmins && existingAdmins.length > 0) {
      return new Response(
        JSON.stringify({ error: "A super admin account already exists. Use the admin portal to invite additional administrators." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Create the auth user with service role (bypasses email confirmation)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, is_admin: true },
    });

    if (authError || !authData.user) {
      return new Response(
        JSON.stringify({ error: authError?.message || "Failed to create user." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Insert into admin_accounts as super_admin
    const { error: adminError } = await supabase.from("admin_accounts").insert({
      id: authData.user.id,
      email,
      full_name,
      role: "super_admin",
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

    // Log the action
    await supabase.from("admin_audit_logs").insert({
      admin_id: authData.user.id,
      admin_email: email,
      action: "bootstrap.super_admin_created",
      resource_type: "admin",
      resource_id: authData.user.id,
      details: { full_name },
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Super admin account created. You can now sign in at the admin portal.",
        email,
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
