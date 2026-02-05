'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { RealtimeChannel } from '@supabase/supabase-js';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { TimerRing } from '@/components/TimerRing';
import { ToastContainer, ToastMessage } from '@/components/Toast';
import { useGameStore } from '@/lib/store';
import { supabase, ensureAuth } from '@/lib/supabase-browser';
import { joinTable, startHand, playerAction, fetchGameState, fetchMyHoleCards } from '@/lib/api';

export default function TablePage() {
  const params = useParams();
  const tableId = params.tableId as string;

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
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [nickname, setNickname] = useState('');
  const [hasJoined, setHasJoined] = useState(false);
  const [betAmount, setBetAmount] = useState(0);
  const [inviteLink, setInviteLink] = useState('');
  const [embedLink, setEmbedLink] = useState('');

  const addToast = (message: string, type: ToastMessage['type']) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Initialize auth and set invite links
  useEffect(() => {
    ensureAuth().catch(() => addToast('Authentication failed', 'error'));

    if (typeof window !== 'undefined') {
      const base = window.location.origin;
      setInviteLink(`${base}/table/${tableId}`);
      setEmbedLink(`${base}/embed?tableId=${tableId}`);
    }
  }, [tableId]);

  // Load initial state
  const loadInitialState = useCallback(async () => {
    try {
      const { table: initialTable, hand: initialHand, players: initialPlayers } = await fetchGameState(tableId);

      if (initialTable) setTable(initialTable);
      if (initialHand) setHand(initialHand);
      if (initialPlayers) setPlayers(initialPlayers);

      // Check if we're already seated
      const userId = (await supabase.auth.getUser()).data.user?.id;
      const myPlayer = initialPlayers.find((p: any) => p.user_id === userId);
      if (myPlayer) {
        setMySeat(myPlayer.seat);
        setHasJoined(true);

        // Load hole cards
        const cards = await fetchMyHoleCards(tableId, myPlayer.seat);
        if (cards) setMyHoleCards(cards);
      }
    } catch (err: any) {
      addToast(err.message || 'Failed to load game state', 'error');
    }
  }, [tableId, setTable, setHand, setPlayers, setMySeat, setMyHoleCards]);

  // Subscribe to Realtime channel
  useEffect(() => {
    loadInitialState();

    const realtimeChannel = supabase.channel(`table:${tableId}`);

    realtimeChannel.on('broadcast', { event: 'state_diff' }, ({ payload }) => {
      applyStateDiff(payload);
    });

    realtimeChannel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('Subscribed to table channel');
      }
    });

    setChannel(realtimeChannel);

    return () => {
      realtimeChannel.unsubscribe();
    };
  }, [tableId, loadInitialState, applyStateDiff]);

  const handleJoinTable = async () => {
    if (!nickname.trim()) {
      addToast('Please enter a nickname', 'error');
      return;
    }

    setIsJoining(true);
    try {
      const result = await joinTable({ table_id: tableId, nickname: nickname.trim() });
      setMySeat(result.seat);
      setHasJoined(true);
      addToast('Joined table successfully!', 'success');

      // Reload state
      await loadInitialState();
    } catch (err: any) {
      addToast(err.message || 'Failed to join table', 'error');
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

  const copyToClipboard = async (text: string, label: string) => {
    try {
      if (!navigator.clipboard) {
        throw new Error('Clipboard unavailable');
      }
      await navigator.clipboard.writeText(text);
      addToast(`${label} copied!`, 'success');
    } catch (err: any) {
      addToast(err.message || 'Copy failed', 'error');
    }
  };

  const isMyTurn = mySeat !== null && hand?.actor_seat === mySeat;
  const myPlayer = players.find((p) => p.seat === mySeat);
  const currentBet = Math.max(...players.map((p) => p.bet), 0);
  const callAmount = myPlayer ? currentBet - myPlayer.bet : 0;
  const canBetOrRaise = betAmount > 0;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    (window as any).render_game_to_text = () => {
      const payload = {
        mode: hasJoined ? (hand ? 'hand' : 'lobby') : 'join',
        tableId,
        table: table
          ? {
              id: table.id,
              small_blind: table.small_blind,
              big_blind: table.big_blind,
              max_players: table.max_players,
            }
          : null,
        hand: hand
          ? {
              id: hand.id,
              pot: hand.pot,
              street: hand.street,
              actor_seat: hand.actor_seat,
              act_deadline: hand.act_deadline,
              board: hand.board,
              action_log: hand.action_log?.slice(-5) ?? [],
            }
          : null,
        players: players.map((p) => ({
          seat: p.seat,
          nickname: p.nickname,
          stack: p.stack,
          bet: p.bet,
          folded: p.folded,
          is_allin: p.is_allin,
        })),
        me: {
          seat: mySeat,
          hole_cards: myHoleCards,
        },
        coordinate_system: 'No spatial coordinates; UI-only state.',
      };
      return JSON.stringify(payload);
    };
    if (!(window as any).advanceTime) {
      (window as any).advanceTime = () => {};
    }
  }, [tableId, table, hand, players, mySeat, myHoleCards, hasJoined]);

  if (!hasJoined) {
    return (
      <div className="min-h-screen felt-gradient flex items-center justify-center p-4">
        <ToastContainer toasts={toasts} onDismiss={removeToast} />
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-8 max-w-md w-full">
          <h2 className="text-2xl font-bold mb-4">Join Table</h2>
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="Enter your nickname"
            className="w-full px-4 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-emerald-500 mb-4"
            maxLength={20}
          />
          <Button onClick={handleJoinTable} disabled={isJoining} className="w-full" size="lg">
            {isJoining ? 'Joining...' : 'Join Table'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen felt-gradient p-4">
      <ToastContainer toasts={toasts} onDismiss={removeToast} />

      {/* Header */}
      <div className="max-w-7xl mx-auto mb-4">
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 flex flex-wrap gap-4 items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Table {tableId.slice(0, 8)}</h1>
            <p className="text-sm text-white/70">
              Blinds: {table?.small_blind}/{table?.big_blind} • Pot: {hand?.pot || 0}
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => copyToClipboard(inviteLink, 'Invite link')} size="sm">
              Copy Invite
            </Button>
            <Button onClick={() => copyToClipboard(embedLink, 'Embed link')} size="sm" variant="secondary">
              Copy Embed
            </Button>
            {!hand && <Button onClick={handleStartHand} size="sm" variant="success">Start Hand</Button>}
          </div>
        </div>
      </div>

      {/* Main table area */}
      <div className="max-w-7xl mx-auto">
        <div className="bg-gradient-to-br from-felt-dark to-felt rounded-3xl p-8 min-h-[500px] relative border-8 border-amber-900/50">
          {/* Board cards */}
          {hand && hand.board.length > 0 && (
            <div className="flex justify-center gap-2 mb-8">
              {hand.board.map((card, idx) => (
                <Card key={idx} card={card} size="lg" />
              ))}
            </div>
          )}

          {/* Pot */}
          <div className="text-center mb-6">
            <div className="inline-block bg-amber-600 px-6 py-2 rounded-full font-bold text-xl">
              Pot: {hand?.pot || 0}
            </div>
          </div>

          {/* Players (arranged in circle) */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            {players.map((player) => (
              <div
                key={player.seat}
                className={`bg-white/10 backdrop-blur-sm rounded-lg p-3 ${
                  player.seat === hand?.actor_seat ? 'ring-2 ring-emerald-500' : ''
                } ${player.folded ? 'opacity-50' : ''}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold">{player.nickname}</span>
                  {player.seat === hand?.actor_seat && <TimerRing deadline={hand.act_deadline} />}
                </div>
                <div className="text-sm text-white/70">
                  Stack: {player.stack} {player.bet > 0 && `• Bet: ${player.bet}`}
                </div>
                {player.is_allin && <div className="text-xs text-red-400 mt-1">ALL-IN</div>}
              </div>
            ))}
          </div>

          {/* My hole cards */}
          {myHoleCards && myHoleCards.length > 0 && (
            <div className="flex justify-center gap-2 mb-4">
              <div className="text-sm font-medium mr-2 flex items-center">Your cards:</div>
              {myHoleCards.map((card, idx) => (
                <Card key={idx} card={card} size="md" />
              ))}
            </div>
          )}

          {/* Action log */}
          {hand?.action_log && hand.action_log.length > 0 && (
            <div className="bg-black/30 rounded-lg p-3 max-h-24 overflow-y-auto">
              <div className="text-xs space-y-1">
                {hand.action_log.slice(-5).map((log, idx) => (
                  <div key={idx}>
                    Seat {log.seat}: {log.action}
                    {log.amount ? ` ${log.amount}` : ''}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action buttons */}
        {isMyTurn && (
          <div className="mt-6 bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <div className="flex flex-wrap gap-3 items-center">
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
              <div className="flex gap-2 items-center">
                <input
                  type="number"
                  value={betAmount}
                  onChange={(e) => setBetAmount(Number(e.target.value))}
                  className="w-24 px-3 py-1.5 bg-white/20 border border-white/30 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                  min={0}
                />
                <Button onClick={() => handleAction('bet')} size="sm" disabled={!canBetOrRaise}>
                  Bet
                </Button>
                <Button onClick={() => handleAction('raise')} size="sm" disabled={!canBetOrRaise}>
                  Raise
                </Button>
              </div>
              <Button onClick={() => handleAction('allin')} variant="danger" size="sm">
                All-In
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
