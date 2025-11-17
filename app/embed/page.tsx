'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { TimerRing } from '@/components/TimerRing';
import { ToastContainer, ToastMessage } from '@/components/Toast';
import { useGameStore } from '@/lib/store';
import { auth } from '@/lib/firebase';
import { signInAnonymously } from 'firebase/auth';
import { joinTable, startHand, playerAction, fetchGameState, fetchMyHoleCards } from '@/lib/firebase-api';

function EmbedContent() {
  const searchParams = useSearchParams();
  const tableId = searchParams.get('tableId') || '';

  const {
    table,
    hand,
    players,
    myHoleCards,
    mySeat,
    setTable,
    setHand,
    setPlayers,
    setMyHoleCards,
    setMySeat,
    applyStateDiff,
  } = useGameStore();

  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isJoining, setIsJoining] = useState(false);
  const [nickname, setNickname] = useState('');
  const [hasJoined, setHasJoined] = useState(false);
  const [betAmount, setBetAmount] = useState(0);

  const embedTitle = process.env.NEXT_PUBLIC_EMBED_TITLE || 'Poker Table';

  const addToast = (message: string, type: ToastMessage['type']) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Initialize Firebase auth
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (!auth.currentUser) {
          await signInAnonymously(auth);
        }
      } catch (err) {
        addToast('Authentication failed', 'error');
      }
    };
    initAuth();
  }, []);

  const loadInitialState = useCallback(async () => {
    if (!tableId) return;

    try {
      const { hand: initialHand, players: initialPlayers } = await fetchGameState(tableId);

      if (initialHand) setHand(initialHand);
      if (initialPlayers) setPlayers(initialPlayers);

      const userId = auth.currentUser?.uid;
      const myPlayer = initialPlayers.find((p: any) => p.user_id === userId);
      if (myPlayer) {
        setMySeat(myPlayer.seat);
        setHasJoined(true);

        const cards = await fetchMyHoleCards(tableId, myPlayer.seat);
        if (cards) setMyHoleCards(cards);
      }
    } catch (err: any) {
      addToast(err.message || 'Failed to load game state', 'error');
    }
  }, [tableId, setHand, setPlayers, setMySeat, setMyHoleCards]);

  // Load initial state and set up polling
  useEffect(() => {
    if (!tableId) return;

    loadInitialState();

    // Poll for updates every 2 seconds
    const interval = setInterval(() => {
      loadInitialState();
    }, 2000);

    return () => {
      clearInterval(interval);
    };
  }, [tableId, loadInitialState]);

  const handleJoinTable = async () => {
    if (!nickname.trim() || !tableId) {
      addToast('Please enter a nickname', 'error');
      return;
    }

    setIsJoining(true);
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) {
        addToast('Please wait for authentication', 'error');
        return;
      }

      const result = await joinTable({ tableId: tableId, nickname: nickname.trim() }, userId);
      setMySeat(result.seat);
      setHasJoined(true);
      addToast('Joined table!', 'success');

      await loadInitialState();
    } catch (err: any) {
      addToast(err.message || 'Failed to join', 'error');
    } finally {
      setIsJoining(false);
    }
  };

  const handleStartHand = async () => {
    try {
      await startHand({ table_id: tableId });
      addToast('Hand started!', 'success');
    } catch (err: any) {
      addToast(err.message || 'Failed to start hand', 'error');
    }
  };

  const handleAction = async (action: 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'allin') => {
    try {
      const params: any = { table_id: tableId, action };
      if ((action === 'bet' || action === 'raise') && betAmount > 0) {
        params.amount = betAmount;
      }

      await playerAction(params);
      setBetAmount(0);
    } catch (err: any) {
      addToast(err.message || 'Action failed', 'error');
    }
  };

  const isMyTurn = mySeat !== null && hand?.actor_seat === mySeat;
  const myPlayer = players.find((p) => p.seat === mySeat);
  const currentBet = Math.max(...players.map((p) => p.bet), 0);
  const callAmount = myPlayer ? currentBet - myPlayer.bet : 0;

  if (!tableId) {
    return (
      <div className="min-h-screen felt-gradient flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-white">Invalid table ID. Please provide ?tableId=...</p>
        </div>
      </div>
    );
  }

  if (!hasJoined) {
    return (
      <div className="min-h-screen felt-gradient flex items-center justify-center p-4">
        <ToastContainer toasts={toasts} onDismiss={removeToast} />
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 max-w-sm w-full">
          <h2 className="text-xl font-bold mb-3">{embedTitle}</h2>
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="Your nickname"
            className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-emerald-500 mb-3 text-sm"
            maxLength={20}
          />
          <Button onClick={handleJoinTable} disabled={isJoining} className="w-full">
            {isJoining ? 'Joining...' : 'Join Table'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen felt-gradient p-3">
      <ToastContainer toasts={toasts} onDismiss={removeToast} />

      {/* Minimal header */}
      <div className="mb-3">
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2 flex items-center justify-between">
          <div className="text-sm">
            <span className="font-bold">{embedTitle}</span>
            <span className="text-white/70 ml-3">
              {table?.small_blind}/{table?.big_blind} • Pot: {hand?.pot || 0}
            </span>
          </div>
          {!hand && (
            <Button onClick={handleStartHand} size="sm" variant="success">
              Start
            </Button>
          )}
        </div>
      </div>

      {/* Compact table */}
      <div className="bg-gradient-to-br from-felt-dark to-felt rounded-2xl p-4 min-h-[400px] relative border-4 border-amber-900/50">
        {/* Board */}
        {hand && hand.board.length > 0 && (
          <div className="flex justify-center gap-1 mb-4">
            {hand.board.map((card, idx) => (
              <Card key={idx} card={card} size="sm" />
            ))}
          </div>
        )}

        {/* Pot */}
        <div className="text-center mb-4">
          <div className="inline-block bg-amber-600 px-4 py-1 rounded-full font-bold text-sm">
            Pot: {hand?.pot || 0}
          </div>
        </div>

        {/* Players grid */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          {players.map((player) => (
            <div
              key={player.seat}
              className={`bg-white/10 backdrop-blur-sm rounded-lg p-2 text-sm ${
                player.seat === hand?.actor_seat ? 'ring-2 ring-emerald-500' : ''
              } ${player.folded ? 'opacity-50' : ''}`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold truncate">{player.nickname}</span>
                {player.seat === hand?.actor_seat && <TimerRing deadline={hand.act_deadline} />}
              </div>
              <div className="text-xs text-white/70">
                {player.stack} {player.bet > 0 && `• ${player.bet}`}
              </div>
            </div>
          ))}
        </div>

        {/* Hole cards */}
        {myHoleCards && myHoleCards.length > 0 && (
          <div className="flex justify-center gap-1 mb-3">
            <span className="text-xs mr-1 flex items-center">You:</span>
            {myHoleCards.map((card, idx) => (
              <Card key={idx} card={card} size="sm" />
            ))}
          </div>
        )}

        {/* Action log */}
        {hand?.action_log && hand.action_log.length > 0 && (
          <div className="bg-black/30 rounded-lg p-2 max-h-16 overflow-y-auto text-xs">
            {hand.action_log.slice(-3).map((log, idx) => (
              <div key={idx}>
                S{log.seat}: {log.action}
                {log.amount ? ` ${log.amount}` : ''}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Compact actions */}
      {isMyTurn && (
        <div className="mt-3 bg-white/10 backdrop-blur-sm rounded-lg p-2">
          <div className="flex flex-wrap gap-2 items-center text-sm">
            <Button onClick={() => handleAction('fold')} variant="danger" size="sm">
              Fold
            </Button>
            {callAmount === 0 && (
              <Button onClick={() => handleAction('check')} variant="success" size="sm">
                Check
              </Button>
            )}
            {callAmount > 0 && (
              <Button onClick={() => handleAction('call')} variant="success" size="sm">
                Call {callAmount}
              </Button>
            )}
            <input
              type="number"
              value={betAmount}
              onChange={(e) => setBetAmount(Number(e.target.value))}
              className="w-20 px-2 py-1 bg-white/20 border border-white/30 rounded text-white text-sm focus:outline-none focus:border-emerald-500"
              min={0}
            />
            <Button onClick={() => handleAction('bet')} size="sm">
              Bet
            </Button>
            <Button onClick={() => handleAction('raise')} size="sm">
              Raise
            </Button>
            <Button onClick={() => handleAction('allin')} variant="danger" size="sm">
              All-In
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function EmbedPage() {
  return (
    <Suspense fallback={<div className="min-h-screen felt-gradient flex items-center justify-center"><p>Loading...</p></div>}>
      <EmbedContent />
    </Suspense>
  );
}
