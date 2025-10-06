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
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ ok: false, error: "Missing env" }), { 
        status: 500, 
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        } 
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { smallBlind, bigBlind, maxPlayers, nickname } = await req.json();
    if (!smallBlind || !bigBlind || !maxPlayers || !nickname) {
      return new Response(JSON.stringify({ ok: false, error: "Missing required fields" }), { 
        status: 400, 
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        } 
      });
    }

    // Create table
    const { data: tableRow, error: tableErr } = await supabase
      .from("tables")
      .insert({
        small_blind: smallBlind,
        big_blind: bigBlind,
        max_players: maxPlayers,
        status: "waiting"
      })
      .select("id")
      .maybeSingle();

    if (tableErr || !tableRow) {
      return new Response(JSON.stringify({ ok: false, error: tableErr?.message ?? "table creation failed" }), { 
        status: 500, 
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        } 
      });
    }

    // Add host as first player
    const { data: playerRow, error: playerErr } = await supabase
      .from("players")
      .insert({
        table_id: tableRow.id,
        seat: 0,
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

    return new Response(JSON.stringify({ ok: true, tableId: tableRow.id }), { 
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

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/create_table' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
