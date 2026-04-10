// supabase/functions/notify-expense/index.ts
// Edge Function que envía push notifications via OneSignal
// cuando se inserta un gasto nuevo en la base de datos.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ONESIGNAL_APP_ID = "964ef142-ad4c-40ef-a27b-b94de919baa3";
const ONESIGNAL_API_KEY = Deno.env.get("ONESIGNAL_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Buscar subscription IDs activos de un usuario por su external_id (email)
async function getActiveSubscriptionIds(email: string): Promise<string[]> {
  try {
    const res = await fetch(
      `https://api.onesignal.com/apps/${ONESIGNAL_APP_ID}/users/by/external_id/${encodeURIComponent(email)}`,
      {
        headers: { Authorization: `Key ${ONESIGNAL_API_KEY}` },
      }
    );
    if (!res.ok) return [];
    const user = await res.json();
    // Filtrar solo suscripciones habilitadas con token válido
    return (user.subscriptions || [])
      .filter((s: any) => s.enabled && s.token)
      .map((s: any) => s.id);
  } catch {
    return [];
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload = await req.json();

    // El webhook de Supabase envía: { type, table, record, old_record }
    const record = payload.record;
    if (!record) {
      return new Response(JSON.stringify({ error: "No record found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Obtener info del grupo
    const { data: group } = await supabase
      .from("groups")
      .select("name")
      .eq("id", record.group_id)
      .single();

    // 2. Obtener el email de quien pagó (paid_by)
    const { data: payer } = await supabase
      .from("group_members")
      .select("email")
      .eq("id", record.paid_by)
      .single();

    // 3. Obtener todos los miembros del grupo EXCEPTO quien pagó
    const { data: members } = await supabase
      .from("group_members")
      .select("email")
      .eq("group_id", record.group_id)
      .neq("id", record.paid_by);

    if (!members || members.length === 0) {
      return new Response(JSON.stringify({ message: "No members to notify" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Preparar el nombre del pagador (usar parte antes del @)
    const payerName = payer?.email?.split("@")[0] || "Alguien";

    // 5. Formatear el monto
    const amount = parseFloat(record.amount || 0).toFixed(2);

    // 6. Buscar subscription IDs activos para cada miembro
    const allSubscriptionIds: string[] = [];
    for (const member of members) {
      if (member.email) {
        const ids = await getActiveSubscriptionIds(member.email);
        allSubscriptionIds.push(...ids);
      }
    }

    if (allSubscriptionIds.length === 0) {
      return new Response(
        JSON.stringify({ message: "No active subscriptions found for members" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 7. Enviar notificación via OneSignal usando subscription IDs
    const notification = {
      app_id: ONESIGNAL_APP_ID,
      include_subscription_ids: allSubscriptionIds,
      headings: { en: group?.name || "KiCode" },
      contents: {
        en: `${payerName} registró un gasto de S/.${amount}${record.description ? `: ${record.description}` : ""}`,
      },
      url: `https://kicodeapp.vercel.app/group/${record.group_id}`,
    };

    const onesignalRes = await fetch("https://api.onesignal.com/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Key ${ONESIGNAL_API_KEY}`,
      },
      body: JSON.stringify(notification),
    });

    const result = await onesignalRes.json();

    return new Response(JSON.stringify({ success: true, onesignal: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
