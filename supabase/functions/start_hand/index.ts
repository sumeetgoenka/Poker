// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type Json = Record<string, unknown> | unknown[] | string | number | boolean | null;

function nowPlusSeconds(seconds: number): string {
  const d = new Date(Date.now() + seconds * 1000);
  return d.toISOString();
}

function buildDeck(): string[] {
  const suits = ["S", "H", "D", "C"]; // spades, hearts, diamonds, clubs
  const ranks = ["2","3","4","5","6","7","8","9","T","J","Q","K","A"];
  const deck: string[] = [];
  for (const s of suits) for (const r of ranks) deck.push(`${r}${s}`);
  // Shuffle with crypto.getRandomValues (Fisher-Yates)
  const arr = new Uint32Array(deck.length);
  crypto.getRandomValues(arr);
  for (let i = deck.length - 1; i > 0; i--) {
    const j = arr[i] % (i + 1);
    const tmp = deck[i];
    deck[i] = deck[j];
    deck[j] = tmp;
  }
  return deck;
}

Deno.serve(async (req) => {
  try {
    const SUPA_URL =
      Deno.env.get('SUPABASE_URL') ??
      Deno.env.get('PROJECT_URL') ??
      Deno.env.get('URL');

    const SERVICE_KEY =
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ??
      Deno.env.get('SERVICE_ROLE_KEY');

    if (!SUPA_URL || !SERVICE_KEY) {
      return new Response(
        JSON.stringify({ ok:false, error: 'Server misconfig: missing SUPABASE_URL or SERVICE_ROLE_KEY' }),
        { status: 500, headers: { 'content-type': 'application/json' } }
      );
    }

    const admin = createClient(SUPA_URL, SERVICE_KEY);

    const { tableId } = await req.json();
    if (!tableId) return new Response(JSON.stringify({ ok: false, error: "tableId required" }), { status: 400, headers: { "Content-Type": "application/json" } });

    // Verify table exists
    const { data: tableRow, error: tableErr } = await admin.from("tables").select("id,status").eq("id", tableId).maybeSingle();
    if (tableErr || !tableRow) return new Response(JSON.stringify({ ok: false, error: "table not found" }), { status: 404, headers: { "Content-Type": "application/json" } });

    // Fetch players seated at this table
    const { data: players, error: playersErr } = await admin
      .from("players")
      .select("seat, id")
      .eq("table_id", tableId)
      .order("seat", { ascending: true });
    if (playersErr) return new Response(JSON.stringify({ ok: false, error: playersErr.message }), { status: 500, headers: { "Content-Type": "application/json" } });
    if (!players || players.length === 0) return new Response(JSON.stringify({ ok: false, error: "no players" }), { status: 400, headers: { "Content-Type": "application/json" } });

    // Build and deal deck
    const deck = buildDeck();
    const holes: Record<number, string[]> = {};
    for (const p of players) {
      holes[p.seat] = [deck.pop()!, deck.pop()!];
    }

    const dealerSeat = players[0].seat; // simple: first seat is dealer
    const toActSeat = players.length > 1 ? players[1].seat : dealerSeat;

    // Insert hand row
    const handInsert = {
      table_id: tableId,
      dealer_seat: dealerSeat,
      actor_seat: toActSeat,
      act_deadline: nowPlusSeconds(20),
      board: [] as Json,
      pot: 0,
      street: "preflop",
      action_log: [] as Json,
    };
    const { data: handRow, error: handErr } = await admin.from("hand").insert(handInsert).select("id").maybeSingle();
    if (handErr || !handRow) return new Response(JSON.stringify({ ok: false, error: handErr?.message ?? "hand insert failed" }), { status: 500, headers: { "Content-Type": "application/json" } });

    // Insert private holes rows
    const holesRows = Object.entries(holes).map(([seatStr, cards]) => ({
      table_id: tableId,
      seat: Number(seatStr),
      cards: cards as unknown as Json,
    }));
    const { error: holesErr } = await admin.from("private_holes").insert(holesRows);
    if (holesErr) return new Response(JSON.stringify({ ok: false, error: holesErr.message }), { status: 500, headers: { "Content-Type": "application/json" } });

    // Update table status
    const { error: tableUpdErr } = await admin.from("tables").update({ status: "in_hand" }).eq("id", tableId);
    if (tableUpdErr) return new Response(JSON.stringify({ ok: false, error: tableUpdErr.message }), { status: 500, headers: { "Content-Type": "application/json" } });

    return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});


