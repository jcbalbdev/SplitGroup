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
      { headers: { Authorization: `Key ${ONESIGNAL_API_KEY}` } }
    );
    if (!res.ok) return [];
    const user = await res.json();
    return (user.subscriptions || [])
      .filter((s: any) => s.enabled && s.token)
      .map((s: any) => s.id);
  } catch {
    return [];
  }
}

// Obtener nombre corto del email (parte antes del @)
function shortName(email: string): string {
  return email?.split("@")[0] || "Alguien";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    const record = payload.record;

    if (!record) {
      return new Response(JSON.stringify({ error: "No record found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Obtener nombre del grupo
    const { data: group } = await supabase
      .from("groups")
      .select("name")
      .eq("id", record.group_id)
      .single();

    // 2. paid_by ya es un email directo (ej: "d.moromisato90@gmail.com")
    const payerEmail = record.paid_by;
    const payerName = shortName(payerEmail);

    // 3. Obtener otros miembros del grupo (excluyendo quien pagó)
    const { data: members } = await supabase
      .from("group_members")
      .select("email")
      .eq("group_id", record.group_id)
      .neq("email", payerEmail);

    if (!members || members.length === 0) {
      return new Response(JSON.stringify({ message: "No members to notify" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Formatear el monto
    const amount = parseFloat(record.amount || 0).toFixed(2);

    // 5. Buscar subscription IDs activos para cada miembro
    const allSubscriptionIds: string[] = [];
    for (const member of members) {
      if (member.email) {
        const ids = await getActiveSubscriptionIds(member.email);
        allSubscriptionIds.push(...ids);
      }
    }

    if (allSubscriptionIds.length === 0) {
      return new Response(
        JSON.stringify({ message: "No active push subscriptions", members: members.map(m => m.email) }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 6. Formato de notificación similar a la in-app:
    //    Título: "d.moromisato90 · S/.10.00"
    //    Cuerpo: "Registró un gasto en karencios: prueba"
    const groupName = group?.name || "KiCode";
    const description = record.description ? `: ${record.description}` : "";

    const notification = {
      app_id: ONESIGNAL_APP_ID,
      include_subscription_ids: allSubscriptionIds,
      headings: { en: `${payerName} · S/.${amount}` },
      contents: { en: `Registró un gasto en ${groupName}${description}` },
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
