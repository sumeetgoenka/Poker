'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { TimerRing } from '@/components/TimerRing';
import { ToastContainer, ToastMessage } from '@/components/Toast';
import { PokerTable } from '@/components/PokerTable';
import { useGameStore } from '@/lib/store';
import { auth, isFirebaseConfigured } from '@/lib/firebase';
import { joinTable, startHand, playerAction, fetchGameState, fetchMyHoleCards } from '@/lib/firebase-api';

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
  const [channel, setChannel] = useState<any>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [nickname, setNickname] = useState('');
  const [hasJoined, setHasJoined] = useState(false);
  const [betAmount, setBetAmount] = useState(0);
  const [inviteLink, setInviteLink] = useState('');
  const [embedLink, setEmbedLink] = useState('');
  const [showDebug, setShowDebug] = useState(false);

  const addToast = (message: string, type: ToastMessage['type']) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Initialize auth and set invite links
  useEffect(() => {
    // Firebase auth is handled automatically
    if (typeof window !== 'undefined') {
      const base = window.location.origin;
      setInviteLink(`${base}/table/${tableId}`);
      setEmbedLink(`${base}/embed?tableId=${tableId}`);
    }
  }, [tableId]);

  // Load initial state
  const loadInitialState = useCallback(async () => {
    try {
      const { hand: initialHand, players: initialPlayers } = await fetchGameState(tableId);

      if (initialHand) setHand(initialHand);
      if (initialPlayers) setPlayers(initialPlayers);

      // Check if we're already seated
      if (isFirebaseConfigured() && auth) {
        const userId = auth.currentUser?.uid;
        const myPlayer = initialPlayers.find((p: any) => p.user_id === userId);
        if (myPlayer) {
          setMySeat(myPlayer.seat);
          setHasJoined(true);

          // Load hole cards
          const cards = await fetchMyHoleCards(tableId, myPlayer.seat);
          if (cards) setMyHoleCards(cards);
        }
      }
    } catch (err: any) {
      addToast(err.message || 'Failed to load game state', 'error');
    }
  }, [tableId, setHand, setPlayers, setMySeat, setMyHoleCards]);

  // Load initial state and set up polling
  useEffect(() => {
    loadInitialState();

    // Simple polling for now - we can enhance this later with Firebase realtime listeners
    const interval = setInterval(() => {
      loadInitialState();
    }, 2000); // Poll every 2 seconds

    return () => {
      clearInterval(interval);
    };
  }, [tableId, loadInitialState]);

  const handleJoinTable = async () => {
    if (!nickname.trim()) {
      addToast('Please enter a nickname', 'error');
      return;
    }

    if (!isFirebaseConfigured() || !auth) {
      addToast('Firebase is not configured. Please check your environment variables.', 'error');
      return;
    }

    setIsJoining(true);
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) {
        addToast('Authentication required', 'error');
        return;
      }
      const result = await joinTable({ tableId: tableId, nickname: nickname.trim() }, userId);
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

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    addToast(`${label} copied!`, 'success');
  };

  const isMyTurn = mySeat !== null && hand?.actor_seat === mySeat;
  const myPlayer = players.find((p) => p.seat === mySeat);
  const currentBet = Math.max(...players.map((p) => p.bet), 0);
  const callAmount = myPlayer ? currentBet - myPlayer.bet : 0;

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

  const handleSeatClick = (seat: number) => {
    console.log(`Clicked seat ${seat}`);
    // TODO: Implement seat joining logic
  };

  const handleShareLink = () => {
    copyToClipboard(inviteLink, 'Invite link');
  };

  const handleJoinLiveGame = () => {
    console.log('Join live game clicked');
    // TODO: Implement join live game logic
  };

  // Convert players to the format expected by PokerTable
  const pokerTablePlayers = players.map(player => ({
    seat: player.seat,
    nickname: player.nickname,
    stack: player.stack,
    is_connected: true, // Assuming connected if they're in the game
    cards: player.seat === mySeat ? (myHoleCards || undefined) : undefined,
    is_dealer: player.seat === hand?.dealer_seat,
    is_small_blind: player.seat === hand?.small_blind_seat,
    is_big_blind: player.seat === hand?.big_blind_seat,
    current_bet: player.bet,
    is_all_in: player.is_allin,
    is_folded: player.folded,
    bet: player.bet,
    acted: false,
  }));

  // Determine game state
  const gameState: 'waiting' | 'playing' = hand ? 'playing' : 'waiting';

  return (
    <div className="relative">
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
      
      <PokerTable
        players={pokerTablePlayers}
        pot={hand?.pot ?? 0}
        board={hand?.board ?? []}
        currentPlayer={hand?.actor_seat ?? undefined}
        gameState={gameState}
        onSeatClick={handleSeatClick}
        onShareLink={handleShareLink}
        onJoinLiveGame={handleJoinLiveGame}
      />

      {/* Action buttons overlay */}
      {isMyTurn && (
        <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 bg-gray-800 border border-gray-600 rounded-lg p-4 z-50">
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
              <Button onClick={() => handleAction('bet')} size="sm">
                Bet
              </Button>
              <Button onClick={() => handleAction('raise')} size="sm">
                Raise
              </Button>
            </div>
            <Button onClick={() => handleAction('allin')} variant="danger" size="sm">
              All-In
            </Button>
          </div>
        </div>
      )}

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
            <h4 className="font-semibold">Table Info</h4>
            <div className="text-sm">
              <div>Table ID: {tableId}</div>
              <div>Blinds: {table?.small_blind}/{table?.big_blind}</div>
              <div>Pot: {hand?.pot || 0}</div>
              <div>Street: {hand?.street || "-"}</div>
              <div>To Act: {hand?.actor_seat || "-"}</div>
            </div>
          </div>

          <div className="mb-4">
            <h4 className="font-semibold">Players</h4>
            <ul className="text-sm">
              {players.map((p) => (
                <li key={p.seat}>
                  Seat {p.seat}: {p.nickname} — stack {p.stack} — bet {p.bet}
                </li>
              ))}
            </ul>
          </div>

          <div className="mb-4">
            <h4 className="font-semibold">Board</h4>
            <div className="flex gap-1">
              {hand?.board.map((card, idx) => (
                <Card key={idx} card={card} size="sm" />
              ))}
            </div>
          </div>

          <div className="mb-4">
            <h4 className="font-semibold">My Cards</h4>
            <div className="flex gap-1">
              {myHoleCards?.map((card, idx) => (
                <Card key={idx} card={card} size="sm" />
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={() => copyToClipboard(tableId, 'Table ID')} size="sm">
              Copy Invite
            </Button>
            <Button onClick={() => copyToClipboard(embedLink, 'Embed link')} size="sm" variant="secondary">
              Copy Embed
            </Button>
            {!hand && <Button onClick={handleStartHand} size="sm" variant="success">Start Hand</Button>}
          </div>
        </div>
      )}
    </div>
  );
}
