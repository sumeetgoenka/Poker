"use client";
import { useParams } from "next/navigation";
import { useBroadcastRefetch } from "./useTableRealtime";
import { ActionBar } from "./ActionBar";
import { PokerTable } from "../../../components/PokerTable";
import { useState } from "react";

export default function TablePage() {
  const { tableId } = useParams() as { tableId: string };
  const { state, tick } = useBroadcastRefetch(tableId);
  const [showDebug, setShowDebug] = useState(false);

  const handleSeatClick = (seat: number) => {
    console.log(`Clicked seat ${seat}`);
    // TODO: Implement seat joining logic
  };

  const handleShareLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    alert('Link copied to clipboard!');
  };

  const handleJoinLiveGame = () => {
    console.log('Join live game clicked');
    // TODO: Implement join live game logic
  };

  // Determine game state
  const gameState = state.hand ? 'playing' : 'waiting';

  return (
    <div className="relative">
      <PokerTable
        players={state.players}
        pot={state.hand?.pot ?? 0}
        board={state.hand?.board ?? []}
        currentPlayer={state.hand?.to_act_seat}
        gameState={gameState}
        onSeatClick={handleSeatClick}
        onShareLink={handleShareLink}
        onJoinLiveGame={handleJoinLiveGame}
      />

      {/* Debug Panel Toggle */}
      <button
        onClick={() => setShowDebug(!showDebug)}
        className="fixed top-4 right-4 bg-gray-800 text-white px-3 py-1 rounded text-sm z-50"
      >
        {showDebug ? 'Hide Debug' : 'Show Debug'}
      </button>

      {/* Debug Panel */}
      {showDebug && (
        <div className="fixed top-16 right-4 bg-gray-900 text-white p-4 rounded-lg max-w-md max-h-96 overflow-y-auto z-40">
          <h3 className="font-bold mb-2">Debug Info</h3>
          
          <div className="mb-4">
            <h4 className="font-semibold">Players</h4>
            <ul className="text-sm">
              {state.players.map((p) => (
                <li key={p.seat}>
                  Seat {p.seat}: {p.nickname ?? "?"} — stack {p.stack} — {p.is_connected ? "🟢" : "⚪️"}
                </li>
              ))}
              {state.players.length === 0 && <li>No players yet</li>}
            </ul>
          </div>

          <div className="mb-4">
            <h4 className="font-semibold">Game State</h4>
            <div className="text-sm">
              <div>Pot: {state.hand?.pot ?? 0}</div>
              <div>Street: {state.hand?.street ?? "-"}</div>
              <div>To Act: {state.hand?.to_act_seat ?? "-"}</div>
              <div>Deadline: {state.hand?.act_deadline ?? "-"}</div>
            </div>
          </div>

          <div className="mb-4">
            <h4 className="font-semibold">Board</h4>
            <pre className="text-xs bg-gray-800 p-2 rounded">
{JSON.stringify(state.hand?.board ?? [], null, 2)}
            </pre>
          </div>

          <div className="mb-4">
            <h4 className="font-semibold">Actions (latest 10)</h4>
            <ul className="text-xs">
              {state.actions.slice(-10).map((a, i) => (
                <li key={`${a.seat}-${a.created_at}-${i}`}>
                  [{new Date(a.created_at).toLocaleTimeString()}] Seat {a.seat}: {a.action} {a.amount ?? ""}
                </li>
              ))}
              {state.actions.length === 0 && <li>No actions yet</li>}
            </ul>
          </div>

          <ActionBar tableId={tableId} onAfterSuccess={tick} isHost={true} hasHand={!!state.hand} />
        </div>
      )}
    </div>
  );
}


