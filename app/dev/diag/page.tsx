"use client";
import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

const sb = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function Diag() {
  const [out, setOut] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const { data } = await sb.auth.getSession();
      if (!data.session) await sb.auth.signInAnonymously();
    })();
  }, []);

  async function call(name: string, body?: any) {
    const { data, error } = await sb.functions.invoke(name, { body });
    setOut({ name, data, error: error ? { message: error.message, status: (error as any).status ?? null } : null });
    console.log("diag result:", name, { data, error });
  }

  return (
    <div style={{ padding: 16 }}>
      <h2>Diagnostics</h2>
      <div style={{ display:"flex", gap:8, marginBottom:12 }}>
        <button onClick={() => call("diag_env")}>Check Env (server)</button>
        <button onClick={() => call("create_table", { smallBlind:10, bigBlind:20, maxPlayers:6, nickname:"Host" })}>create_table</button>
      </div>
      <pre style={{ background:"#111", color:"#0f0", padding:12, borderRadius:8, overflow:"auto" }}>
{JSON.stringify(out, null, 2)}
      </pre>
    </div>
  );
}


