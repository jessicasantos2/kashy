import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // ── Authentication: require a valid user JWT ──
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);

    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const scopeUserId = claimsData.claims.sub;

    // ── Determine target month ──
    let targetMonth: string | undefined;
    try {
      const body = await req.json();
      targetMonth = body?.month;
    } catch {
      // no body is fine
    }

    const now = new Date();
    const year = targetMonth ? parseInt(targetMonth.split("-")[0]) : now.getFullYear();
    const month = targetMonth ? parseInt(targetMonth.split("-")[1]) : now.getMonth() + 1;
    const monthStr = `${year}-${String(month).padStart(2, "0")}`;

    // Use service role client for DB operations (scoped to authenticated user)
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Fetch active recurrences for this user only
    const { data: recurrences, error: recError } = await supabase
      .from("recurrences")
      .select("*")
      .eq("user_id", scopeUserId);
    if (recError) throw recError;
    if (!recurrences || recurrences.length === 0) {
      return new Response(JSON.stringify({ generated: 0, message: "No recurrences found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch already generated transactions for this month to avoid duplicates
    const { data: existing } = await supabase
      .from("transactions")
      .select("generated_from_recurrence")
      .eq("user_id", scopeUserId)
      .gte("date", `${monthStr}-01`)
      .lte("date", `${monthStr}-31`)
      .not("generated_from_recurrence", "is", null);

    const alreadyGenerated = new Set(
      (existing ?? []).map((e: any) => e.generated_from_recurrence)
    );

    // Fetch user's accounts/cards to determine if target is account or card
    const [accRes, cardRes] = await Promise.all([
      supabase.from("accounts").select("name").eq("user_id", scopeUserId),
      supabase.from("credit_cards").select("name").eq("user_id", scopeUserId),
    ]);
    const accountNames = new Set((accRes.data ?? []).map((a: any) => a.name));
    const cardNames = new Set((cardRes.data ?? []).map((c: any) => c.name));

    // Generate transactions
    const toInsert: any[] = [];
    for (const rec of recurrences) {
      if (alreadyGenerated.has(rec.id)) continue;

      const day = Math.min(rec.day_of_month, 28);
      const date = `${monthStr}-${String(day).padStart(2, "0")}`;

      // Check start_date and end_date bounds
      if (rec.start_date && date < rec.start_date) continue;
      if (rec.end_date && date > rec.end_date) continue;

      const isCard = cardNames.has(rec.target);
      const isAccount = accountNames.has(rec.target);

      toInsert.push({
        user_id: scopeUserId,
        date,
        description: `${rec.name} (recorrência)`,
        category: rec.category,
        account: isAccount ? rec.target : null,
        card: isCard ? rec.target : null,
        value: rec.amount,
        type: "despesa",
        generated_from_recurrence: rec.id,
      });
    }

    if (toInsert.length > 0) {
      const { error: insertError } = await supabase.from("transactions").insert(toInsert);
      if (insertError) throw insertError;
    }

    return new Response(
      JSON.stringify({ generated: toInsert.length, month: monthStr }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error generating recurring transactions:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
