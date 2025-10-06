// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2";

type Json = Record<string, unknown> | unknown[] | string | number | boolean | null;

function nowPlusSeconds(seconds: number): string {
  const d = new Date(Date.now() + seconds * 1000);
  return d.toISOString();
}

const STREETS = ["preflop", "flop", "turn", "river", "showdown"] as const;
type Street = typeof STREETS[number];

function nextStreet(street: Street): Street {
  const idx = STREETS.indexOf(street);
  return STREETS[Math.min(idx + 1, STREETS.length - 1)];
}

Deno.serve(async (req) => {
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ ok: false, error: "Missing env" }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { tableId, seat, type, amount } = await req.json();
    if (!tableId || !type) return new Response(JSON.stringify({ ok: false, error: "tableId and type required" }), { status: 400, headers: { "Content-Type": "application/json" } });

    // Verify table exists and seat is valid
    const { data: tableRow, error: tableErr } = await supabase.from("tables").select("id").eq("id", tableId).maybeSingle();
    if (tableErr || !tableRow) return new Response(JSON.stringify({ ok: false, error: "table not found" }), { status: 404, headers: { "Content-Type": "application/json" } });

    let actingSeat = seat as number | undefined;
    if (!actingSeat) {
      // Fallback: use current actor_seat from hand
      const { data: currentHand } = await supabase.from("hand").select("actor_seat").eq("table_id", tableId).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (currentHand?.actor_seat) actingSeat = currentHand.actor_seat as number;
    }
    if (!actingSeat) return new Response(JSON.stringify({ ok: false, error: "acting seat required" }), { status: 400, headers: { "Content-Type": "application/json" } });

    const { data: playerRow } = await supabase.from("players").select("seat").eq("table_id", tableId).eq("seat", actingSeat).maybeSingle();
    if (!playerRow) return new Response(JSON.stringify({ ok: false, error: "invalid seat" }), { status: 400, headers: { "Content-Type": "application/json" } });

    // Record action
    const insertAction = { table_id: tableId, seat: actingSeat, action: type, amount: amount ?? 0 } as Record<string, unknown>;
    const { error: actionErr } = await supabase.from("actions").insert(insertAction);
    if (actionErr) return new Response(JSON.stringify({ ok: false, error: actionErr.message }), { status: 500, headers: { "Content-Type": "application/json" } });

    // Load current hand
    const { data: handRow, error: handErr } = await supabase
      .from("hand").select("id,pot,street,actor_seat").eq("table_id", tableId)
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (handErr || !handRow) return new Response(JSON.stringify({ ok: false, error: handErr?.message ?? "no hand" }), { status: 400, headers: { "Content-Type": "application/json" } });

    // Update pot (simple)
    let newPot = handRow.pot ?? 0;
    if (type === "bet" || type === "raise" || type === "call") newPot += Number(amount ?? 0);

    // Find next seat (simple rotation among currently seated players)
    const { data: players } = await supabase.from("players").select("seat").eq("table_id", tableId).order("seat", { ascending: true });
    const seats = (players ?? []).map((p) => p.seat as number);
    const idx = Math.max(0, seats.indexOf(actingSeat));
    const nextSeat = seats[(idx + 1) % seats.length] ?? actingSeat;

    // Advance street on check by last seat (simplified)
    let newStreet: Street = handRow.street as Street;
    if (type === "check" && nextSeat === (players?.[0]?.seat as number)) {
      newStreet = nextStreet(newStreet);
    }

    const update = {
      pot: newPot,
      street: newStreet,
      actor_seat: nextSeat,
      act_deadline: nowPlusSeconds(20),
    };
    const { error: updErr } = await supabase.from("hand").update(update).eq("id", handRow.id);
    if (updErr) return new Response(JSON.stringify({ ok: false, error: updErr.message }), { status: 500, headers: { "Content-Type": "application/json" } });

    return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});


