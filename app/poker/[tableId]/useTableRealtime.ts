"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { createBrowserSupabase } from "@/utils/supabase/browser";

const sb = createBrowserSupabase();

type HandRow = {
  table_id: string;
  hand_no: number;
  board: any[];
  pot: number;
  street: "preflop" | "flop" | "turn" | "river" | "showdown";
  to_act_seat: number | null;
  min_raise: number;
  act_deadline: string | null;
};
type PlayerRow = { seat: number; nickname: string | null; stack: number; is_connected: boolean };
type ActionRow = { seat: number; action: string; amount: number; created_at: string };

export type PublicState = { hand: HandRow | null; players: PlayerRow[]; actions: ActionRow[] };

export function useBroadcastRefetch(tableId: string) {
  const [state, setState] = useState<PublicState>({ hand: null, players: [], actions: [] });
  const channelRef = useRef<ReturnType<typeof sb.channel> | null>(null);

  const refetch = useCallback(async () => {
    const [handRes, playersRes, actionsRes] = await Promise.all([
      sb.from("hand").select("*").eq("table_id", tableId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      sb.from("table_players").select("seat,nickname,stack,is_connected").eq("table_id", tableId).order("seat"),
      sb.from("actions").select("seat,action,amount,created_at").eq("table_id", tableId).order("created_at", { ascending: false }).limit(20),
    ]);
    setState({
      hand: handRes.data ?? null,
      players: playersRes.data ?? [],
      actions: actionsRes.data ?? [],
    });
  }, [tableId]);

  useEffect(() => {
    // Ensure anonymous session for RLS
    (async () => {
      const { data } = await sb.auth.getSession();
      if (!data.session) await sb.auth.signInAnonymously();
    })();

    // Subscribe to broadcast 'tick'
    const ch = sb.channel(`table:${tableId}`);
    ch.on("broadcast", { event: "tick" }, () => refetch());
    ch.subscribe();
    channelRef.current = ch;

    // Initial fetch
    refetch();

    return () => { if (channelRef.current) sb.removeChannel(channelRef.current); };
  }, [tableId, refetch]);

  const tick = useCallback(() => {
    channelRef.current?.send({ type: "broadcast", event: "tick", payload: {} });
  }, []);

  return { state, refetch, tick };
}

