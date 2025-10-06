"use client";
import { useParams } from "next/navigation";
import { useBroadcastRefetch } from "./useTableRealtime";
import { ActionBar } from "./ActionBar";

export default function TablePage() {
  const { tableId } = useParams() as { tableId: string };
  const { state, tick } = useBroadcastRefetch(tableId);

  return (
    <div style={{ padding: 16, maxWidth: 900, margin: "0 auto" }}>
      <h2>Table ID: {tableId}</h2>

      <section>
        <h3>Players</h3>
        <ul>
          {state.players.map((p) => (
            <li key={p.seat}>
              Seat {p.seat}: {p.nickname ?? "?"} — stack {p.stack} — {p.is_connected ? "🟢" : "⚪️"}
            </li>
          ))}
          {state.players.length === 0 && <li>No players yet</li>}
        </ul>
      </section>

      <section>
        <h3>Board</h3>
        <pre style={{ background: "#111", color: "#0f0", padding: 8, borderRadius: 8 }}>
{JSON.stringify(state.hand?.board ?? [], null, 2)}
        </pre>
        <div>Pot: {state.hand?.pot ?? 0}</div>
        <div>Street: {state.hand?.street ?? "-"}</div>
        <div>To Act: {state.hand?.to_act_seat ?? "-"}</div>
        <div>Deadline: {state.hand?.act_deadline ?? "-"}</div>
      </section>

      <section>
        <h3>Actions (latest 20)</h3>
        <ul>
          {state.actions.map((a, i) => (
            <li key={`${a.seat}-${a.created_at}-${i}`}>
              [{new Date(a.created_at).toLocaleTimeString()}] Seat {a.seat}: {a.action} {a.amount ?? ""}
            </li>
          ))}
          {state.actions.length === 0 && <li>No actions yet</li>}
        </ul>
      </section>

      <ActionBar tableId={tableId} onAfterSuccess={tick} />
    </div>
  );
}


