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
      return jsonResponse(origin, { error: "Hanya Admin Global yang dapat mengelola admin." }, 403);
    }

    const payload = await req.json();
    const action = String(payload.action || "");
    const targetUserId = String(payload.targetUserId || "");
    if (!new Set(["update_role", "delete"]).has(action)) return jsonResponse(origin, { error: "Tindakan tidak valid." }, 400);
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(targetUserId)) {
      return jsonResponse(origin, { error: "Identitas admin tidak valid." }, 400);
    }
    if (targetUserId === userData.user.id) {
      return jsonResponse(origin, { error: "Akun Anda sendiri tidak dapat diubah atau dihapus." }, 400);
    }

    const { data: target, error: targetError } = await adminClient
      .from("profiles")
      .select("id,email,full_name,role,is_active")
      .eq("id", targetUserId)
      .single();
    if (targetError || !target) return jsonResponse(origin, { error: "Akun admin tidak ditemukan." }, 404);

    const role = String(payload.role || "");
    if (action === "update_role" && !new Set(["pending", "scheduling_admin", "global_admin"]).has(role)) {
      return jsonResponse(origin, { error: "Peran admin tidak valid." }, 400);
    }

    const removesGlobalAccess = target.role === "global_admin" && target.is_active && (action === "delete" || role !== "global_admin");
    if (removesGlobalAccess) {
      const { count, error: countError } = await adminClient
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "global_admin")
        .eq("is_active", true);
      if (countError) throw countError;
      if ((count || 0) <= 1) return jsonResponse(origin, { error: "Admin Global terakhir tidak dapat dihapus atau diturunkan perannya." }, 400);
    }

    if (action === "update_role") {
      const { error: updateError } = await adminClient
        .from("profiles")
        .update({ role, is_active: true })
        .eq("id", targetUserId);
      if (updateError) throw updateError;

      await adminClient.from("audit_events").insert({
        actor_id: userData.user.id,
        entity_type: "profile",
        entity_id: targetUserId,
        action: "update_admin_access",
        detail: { email: target.email, previous_role: target.role, role },
      });
      return jsonResponse(origin, { status: "updated", email: target.email, role });
    }

    await adminClient.from("audit_events").insert({
      actor_id: userData.user.id,
      entity_type: "profile",
      entity_id: targetUserId,
      action: "delete_admin",
      detail: { email: target.email, full_name: target.full_name, role: target.role },
    });

    const { error: disableError } = await adminClient
      .from("profiles")
      .update({ role: "pending", is_active: false })
      .eq("id", targetUserId);
    if (disableError) throw disableError;

    const { error: deleteError } = await adminClient.auth.admin.deleteUser(targetUserId);
    if (deleteError) throw deleteError;

    return jsonResponse(origin, { status: "deleted", email: target.email });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Pengelolaan admin gagal.";
    return jsonResponse(origin, { error: message }, 400);
  }
});
