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

    const { smallBlind, bigBlind, maxPlayers, nickname, defaultStack } = await req.json();
    if (!smallBlind || !bigBlind || !maxPlayers || !nickname) {
      return new Response(JSON.stringify({ ok: false, error: "Missing required fields" }), { 
        status: 400, 
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        } 
      });
    }

    // Extract uid from Authorization JWT if present (Anonymous or authenticated)
    let hostUid: string | undefined = undefined;
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      try {
        const token = authHeader.split(" ")[1];
        const payloadB64 = token.split(".")[1];
        const json = atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/"));
        const payload = JSON.parse(json);
        hostUid = payload.sub || payload.user_id || payload.uid;
      } catch (_e) {
        // ignore decode errors; hostUid stays undefined
      }
    }

    // Create table (support both schemas)
    let tableRow: { id: string } | null = null;
    let tableErr: any = null;

    // Attempt insert for schema with host_uid/default_stack
    {
      const { data, error } = await admin
        .from("tables")
        .insert({
          small_blind: smallBlind,
          big_blind: bigBlind,
          max_players: maxPlayers,
          status: "waiting",
          host_uid: hostUid ?? "anonymous",
          default_stack: defaultStack ?? 1000,
          is_private: true,
        })
        .select("id")
        .maybeSingle();
      tableRow = data as any;
      tableErr = error;
    }

    // Fallback to minimal schema (no host_uid/default_stack/is_private)
    if (tableErr || !tableRow) {
      const { data, error } = await admin
        .from("tables")
        .insert({
          small_blind: smallBlind,
          big_blind: bigBlind,
          max_players: maxPlayers,
          status: "waiting",
        })
        .select("id")
        .maybeSingle();
      tableRow = (tableRow ?? data) as any;
      tableErr = error;
    }

    if (tableErr || !tableRow) {
      return new Response(JSON.stringify({ ok: false, error: tableErr?.message ?? "table creation failed" }), { 
        status: 500, 
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        } 
      });
    }

    // Add host as first player (support either table_players or players schema)
    let playerErr: any = null;
    {
      const { error } = await admin
        .from("table_players")
        .insert({
          table_id: tableRow.id,
          uid: hostUid ?? "anonymous",
          seat: 1,
          nickname: nickname,
          stack: defaultStack ?? 1000,
        });
      playerErr = error;
    }

    if (playerErr) {
      const { error } = await admin
        .from("players")
        .insert({
          table_id: tableRow.id,
          seat: 0,
          nickname: nickname,
          stack: defaultStack ?? 1000,
        });
      playerErr = error;
    }

    if (playerErr) {
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
