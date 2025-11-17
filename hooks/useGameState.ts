'use client';

import { useEffect, useState, useCallback } from 'react';
import { fetchGameState, getTable, TableDocument } from '@/lib/firebase-api';
import { GAME_CONSTANTS } from '@/lib/constants';

interface UseGameStateOptions {
  tableId: string;
  enablePolling?: boolean;
  pollInterval?: number;
}

export function useGameState({ tableId, enablePolling = true, pollInterval = GAME_CONSTANTS.POLL_INTERVAL_MS }: UseGameStateOptions) {
  const [table, setTable] = useState<TableDocument | null>(null);
  const [hand, setHand] = useState<any>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!tableId) return;

    try {
      setError(null);
      const [gameState, tableData] = await Promise.all([
        fetchGameState(tableId),
        getTable(tableId),
      ]);

      setHand(gameState.hand);
      setPlayers(gameState.players);
      setTable(tableData);
    } catch (err: any) {
      setError(err.message || 'Failed to load game state');
    } finally {
      setLoading(false);
    }
  }, [tableId]);

  useEffect(() => {
    refetch();

    if (enablePolling) {
      const interval = setInterval(refetch, pollInterval);
      return () => clearInterval(interval);
    }
  }, [refetch, enablePolling, pollInterval]);

  return {
    table,
    hand,
    players,
    loading,
    error,
    refetch,
  };
}
