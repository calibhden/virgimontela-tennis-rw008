import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.95.0";

const allowedOrigins = new Set([
  "https://www.virgimontela.org",
  "https://virgimontela.org",
  "http://localhost:3000",
  "http://localhost:8000",
]);

function corsHeaders(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": origin && allowedOrigins.has(origin) ? origin : "https://www.virgimontela.org",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function jsonResponse(origin: string | null, body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
  });
}

function getSecretKey() {
  const modernKeys = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (modernKeys) {
    try {
      const parsed = JSON.parse(modernKeys);
      if (parsed.default) return parsed.default as string;
    } catch {
      // Continue to the legacy server-only key during the migration period.
    }
  }
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("Origin");
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(origin) });
  if (req.method !== "POST") return jsonResponse(origin, { error: "Metode tidak diizinkan." }, 405);

  try {
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) return jsonResponse(origin, { error: "Silakan login kembali." }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const secretKey = getSecretKey();
    if (!supabaseUrl || !secretKey) return jsonResponse(origin, { error: "Konfigurasi layanan belum lengkap." }, 500);

    const adminClient = createClient(supabaseUrl, secretKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const token = authHeader.slice("Bearer ".length);
    const { data: userData, error: userError } = await adminClient.auth.getUser(token);
    if (userError || !userData.user) return jsonResponse(origin, { error: "Sesi tidak valid. Silakan login kembali." }, 401);

    const { data: caller, error: callerError } = await adminClient
      .from("profiles")
      .select("id,role,is_active")
      .eq("id", userData.user.id)
      .single();
    if (callerError || caller?.role !== "global_admin" || !caller.is_active) {
      return jsonResponse(origin, { error: "Hanya Admin Global yang dapat mengundang admin." }, 403);
    }

    const payload = await req.json();
    const email = String(payload.email || "").trim().toLowerCase();
    const fullName = String(payload.fullName || "").trim().slice(0, 100);
    const role = String(payload.role || "");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return jsonResponse(origin, { error: "Alamat email tidak valid." }, 400);
    if (!new Set(["scheduling_admin", "global_admin"]).has(role)) return jsonResponse(origin, { error: "Peran admin tidak valid." }, 400);

    const { data: existingProfiles, error: existingError } = await adminClient
      .from("profiles")
      .select("id,email")
      .ilike("email", email)
      .limit(1);
    if (existingError) throw existingError;

    let targetUserId = existingProfiles?.[0]?.id as string | undefined;
    let status = "updated";
    if (!targetUserId) {
      const { data: invited, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
        redirectTo: "https://www.virgimontela.org/tennis",
        data: fullName ? { full_name: fullName } : {},
      });
      if (inviteError || !invited.user) throw inviteError || new Error("Undangan gagal dibuat.");
      targetUserId = invited.user.id;
      status = "invited";
    }

    const { error: updateError } = await adminClient
      .from("profiles")
      .update({ role, is_active: true, ...(fullName ? { full_name: fullName } : {}) })
      .eq("id", targetUserId);
    if (updateError) throw updateError;

    await adminClient.from("audit_events").insert({
      actor_id: userData.user.id,
      entity_type: "profile",
      entity_id: targetUserId,
      action: status === "invited" ? "invite_admin" : "update_admin_access",
      detail: { email, role },
    });

    return jsonResponse(origin, { status, email, role });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Undangan gagal dikirim.";
    return jsonResponse(origin, { error: message }, 400);
  }
});
