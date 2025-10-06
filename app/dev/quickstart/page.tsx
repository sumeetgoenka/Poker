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

  async function createTable() {
    setErr(null); setLoading(true);
    await sb.auth.signInAnonymously();
    const { data, error } = await sb.functions.invoke("create_table", {
      body: { smallBlind: 10, bigBlind: 20, maxPlayers: 6, nickname: "Host" },
    });
    setLoading(false);
    if (error) { setErr(error.message); return; }
    setTableId(data?.tableId ?? null);
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

      {err && <p style={{ color: "tomato" }}>Error: {err}</p>}

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

