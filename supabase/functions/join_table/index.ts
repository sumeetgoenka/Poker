// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
      },
    });
  }

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
        { status: 500, headers: { 'content-type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    const admin = createClient(SUPA_URL, SERVICE_KEY);

    const { tableId, nickname } = await req.json();
    if (!tableId || !nickname) {
      return new Response(JSON.stringify({ ok: false, error: "tableId and nickname required" }), { 
        status: 400, 
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        } 
      });
    }

    // Verify table exists and has space
    const { data: tableRow, error: tableErr } = await admin
      .from("tables")
      .select("id, max_players, status")
      .eq("id", tableId)
      .maybeSingle();

    if (tableErr || !tableRow) {
      return new Response(JSON.stringify({ ok: false, error: "table not found" }), { 
        status: 404, 
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        } 
      });
    }

    if (tableRow.status !== "waiting") {
      return new Response(JSON.stringify({ ok: false, error: "table not accepting players" }), { 
        status: 400, 
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        } 
      });
    }

    // Count current players
    const { data: players, error: playersErr } = await admin
      .from("players")
      .select("seat")
      .eq("table_id", tableId);

    if (playersErr) {
      return new Response(JSON.stringify({ ok: false, error: playersErr.message }), { 
        status: 500, 
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        } 
      });
    }

    if (players && players.length >= tableRow.max_players) {
      return new Response(JSON.stringify({ ok: false, error: "table is full" }), { 
        status: 400, 
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        } 
      });
    }

    // Find next available seat
    const occupiedSeats = players?.map(p => p.seat) || [];
    let nextSeat = 0;
    while (occupiedSeats.includes(nextSeat)) {
      nextSeat++;
    }

    // Add player
    const { data: playerRow, error: playerErr } = await admin
      .from("players")
      .insert({
        table_id: tableId,
        seat: nextSeat,
        nickname: nickname,
        stack: 1000
      })
      .select("id")
      .maybeSingle();

    if (playerErr || !playerRow) {
      return new Response(JSON.stringify({ ok: false, error: playerErr?.message ?? "player creation failed" }), { 
        status: 500, 
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        } 
      });
    }

    return new Response(JSON.stringify({ ok: true, seat: nextSeat }), { 
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      } 
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { 
      status: 500, 
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      } 
    });
  }
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/join_table' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
