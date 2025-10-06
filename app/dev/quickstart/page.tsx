"use client";
import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

const sb = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function Quickstart() {
  const [tableId, setTableId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [joinLoading, setJoinLoading] = useState(false);

  async function createTable() {
    setErr(null); setLoading(true);
    
    try {
      // Sign in anonymously first
      const { data: authData, error: authError } = await sb.auth.signInAnonymously();
      if (authError) {
        setErr(`Auth error: ${authError.message}`);
        setLoading(false);
        return;
      }
      
      // Get fresh session and access token
      const { data: sessionData, error: sessionError } = await sb.auth.getSession();
      if (sessionError || !sessionData?.session?.access_token) {
        setErr(`Session error: ${sessionError?.message ?? "No valid session"}`);
        setLoading(false);
        return;
      }
      
      const { data, error } = await sb.functions.invoke("create_table", {
        body: { smallBlind: 10, bigBlind: 20, maxPlayers: 6, nickname: "Host" },
        headers: { Authorization: `Bearer ${sessionData.session.access_token}` }
      });
      
      setLoading(false);
      if (error) {
        const errorData = error as any;
        setErr(`Status: ${errorData?.status ?? "unknown"} | Message: ${error.message} | Details: ${JSON.stringify(errorData)}`);
        console.error("create_table error:", error);
        return;
      }
      setTableId(data?.tableId ?? null);
    } catch (e) {
      setLoading(false);
      setErr(`Unexpected error: ${String(e)}`);
      console.error("Unexpected error:", e);
    }
  }

  async function joinTable() {
    if (!tableId) {
      setErr("No table ID available to join");
      return;
    }
    
    setErr(null); setJoinLoading(true);
    
    try {
      // Sign in anonymously first
      const { data: authData, error: authError } = await sb.auth.signInAnonymously();
      if (authError) {
        setErr(`Auth error: ${authError.message}`);
        setJoinLoading(false);
        return;
      }
      
      // Get fresh session and access token
      const { data: sessionData, error: sessionError } = await sb.auth.getSession();
      if (sessionError || !sessionData?.session?.access_token) {
        setErr(`Session error: ${sessionError?.message ?? "No valid session"}`);
        setJoinLoading(false);
        return;
      }
      
      const { data, error } = await sb.functions.invoke("join_table", {
        body: { tableId, nickname: "Player" },
        headers: { Authorization: `Bearer ${sessionData.session.access_token}` }
      });
      
      setJoinLoading(false);
      if (error) {
        const errorData = error as any;
        setErr(`Status: ${errorData?.status ?? "unknown"} | Message: ${error.message} | Details: ${JSON.stringify(errorData)}`);
        console.error("join_table error:", error);
        return;
      }
      console.log("Joined table successfully:", data);
    } catch (e) {
      setJoinLoading(false);
      setErr(`Unexpected error: ${String(e)}`);
      console.error("Unexpected error:", e);
    }
  }

  return (
    <div style={{ padding: 16 }}>
      <h2>Quickstart</h2>
      <ol>
        <li>Paste the SQL from <code>supabase/sql/poker_schema.sql</code> into Supabase &rarr; SQL Editor and run it.</li>
        <li>Ensure Auth &rarr; Providers &rarr; Anonymous is enabled.</li>
      </ol>

      <button onClick={createTable} disabled={loading}>
        {loading ? "Creating..." : "Create Test Table"}
      </button>

      {tableId && (
        <div style={{ marginTop: 16 }}>
          <button onClick={joinTable} disabled={joinLoading}>
            {joinLoading ? "Joining..." : "Join Test Table"}
          </button>
        </div>
      )}

      {err && <pre style={{whiteSpace:"pre-wrap", color:"tomato"}}>{err}</pre>}

      {tableId && (
        <p>
          Table created! Open:{" "}
          <a href={`/poker/${tableId}`} style={{ textDecoration: "underline" }}>
            /poker/{tableId}
          </a>
        </p>
      )}
    </div>
  );
}

