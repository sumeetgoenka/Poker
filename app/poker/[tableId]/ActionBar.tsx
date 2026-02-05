"use client";
import { createBrowserSupabase } from "@/utils/supabase/browser";

const sb = createBrowserSupabase();

export function ActionBar({ tableId, onAfterSuccess, isHost, hasHand }: { tableId: string; onAfterSuccess: () => void; isHost?: boolean; hasHand?: boolean }) {
  async function startHand() {
    await sb.auth.signInAnonymously();
    const { error } = await sb.functions.invoke("start_hand", { body: { table_id: tableId } });
    if (error) { alert(error.message); return; }
    onAfterSuccess();
  }

  async function act(type: "fold" | "check" | "call" | "bet" | "raise", amount?: number) {
    await sb.auth.signInAnonymously();
    if (!hasHand) { await startHand(); }
    const { error } = await sb.functions.invoke("player_action", { body: { table_id: tableId, action: type, amount } });
    if (error) { alert(error.message); return; }
    onAfterSuccess(); // broadcast tick so everyone refetches
  }
  return (
    <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
      {isHost && <button onClick={startHand}>Start Hand</button>}
      <button onClick={() => act("fold")}>Fold</button>
      <button onClick={() => act("check")}>Check</button>
      <button onClick={() => act("call")}>Call</button>
      <button onClick={() => act("bet", 50)}>Bet 50</button>
      <button onClick={() => act("raise", 120)}>Raise 120</button>
    </div>
  );
}

