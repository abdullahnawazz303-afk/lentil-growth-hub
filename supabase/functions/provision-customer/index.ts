// @ts-nocheck
// Supabase Edge Function: provision-customer
// Deploys via: supabase functions deploy provision-customer
//
// This function is called from the frontend (admin-only) to:
//   1. Create a Supabase Auth user with email + default password "qaisfoods"
//   2. Upsert a public.users row linking auth user → customer record
//
// Secrets required (set in Supabase Dashboard → Edge Functions → Secrets):
//   SUPABASE_URL         → your project URL
//   SUPABASE_SERVICE_ROLE_KEY → your service role key (NOT anon key)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ── 1. Verify the caller is an authenticated admin/staff user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create a regular client to verify the calling user's JWT
    const callerClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user: callerUser }, error: callerError } = await callerClient.auth.getUser();
    if (callerError || !callerUser) {
      return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify caller is admin/manager/cashier (not a customer)
    const { data: callerProfile } = await callerClient
      .from("users")
      .select("role")
      .eq("id", callerUser.id)
      .maybeSingle();

    const allowedRoles = ["admin", "manager", "cashier"];
    if (!callerProfile || !allowedRoles.includes(callerProfile.role)) {
      return new Response(JSON.stringify({ ok: false, error: "Forbidden: staff only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 2. Parse request body
    const { email, name, customer_id } = await req.json();

    if (!email || !customer_id) {
      return new Response(
        JSON.stringify({ ok: false, error: "Missing required fields: email, customer_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const cleanEmail = email.trim().toLowerCase();

    // ── 3. Use Admin client (service role) to create the auth user
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SERVICE_ROLE_KEY")!
    );

    let authUserId: string | null = null;

    // Try to create new auth user
    const { data: createData, error: createError } = await adminClient.auth.admin.createUser({
      email: cleanEmail,
      password: "qaisfoods",
      email_confirm: true,      // Skip email verification — admin is creating this
      user_metadata: {
        name:         name || "Customer",
        role:         "customer",
        account_type: "customer",
        customer_id:  customer_id,
        source:       "qaisfoods_admin",  // Flag for handle_new_user trigger
      },
    });

    if (createError) {
      // If user already exists, fetch their existing ID
      if (
        createError.message.includes("already been registered") ||
        createError.message.includes("already exists") ||
        createError.message.includes("duplicate")
      ) {
        // List users and find by email
        const { data: listData } = await adminClient.auth.admin.listUsers();
        const existing = listData?.users?.find(
          (u) => u.email?.toLowerCase() === cleanEmail
        );

        if (existing) {
          authUserId = existing.id;
          // Update their password to "qaisfoods" and link metadata
          await adminClient.auth.admin.updateUserById(existing.id, {
            password: "qaisfoods",
            user_metadata: {
              name:         name || "Customer",
              role:         "customer",
              account_type: "customer",
              customer_id:  customer_id,
              source:       "qaisfoods_admin",
            },
          });
        } else {
          return new Response(
            JSON.stringify({ ok: false, error: "Email conflict but user not found" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } else {
        return new Response(
          JSON.stringify({ ok: false, error: createError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      authUserId = createData.user?.id ?? null;
    }

    if (!authUserId) {
      return new Response(
        JSON.stringify({ ok: false, error: "Failed to obtain user ID" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 4. Upsert into public.users to link auth user → customer
    const { error: upsertError } = await adminClient
      .from("users")
      .upsert({
        id:           authUserId,
        name:         name || "Customer",
        email:        cleanEmail,
        role:         "customer",
        account_type: "customer",
        customer_id:  customer_id,
        is_active:    true,
      }, { onConflict: "id" });

    if (upsertError) {
      return new Response(
        JSON.stringify({ ok: false, error: "DB upsert failed: " + upsertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 5. Also update customers.email if not already set
    await adminClient
      .from("customers")
      .update({ email: cleanEmail })
      .eq("id", customer_id)
      .is("email", null);   // Only update if null — don't overwrite existing

    return new Response(
      JSON.stringify({ ok: true, user_id: authUserId }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({ ok: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
