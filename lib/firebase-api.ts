import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, collection, addDoc, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { Player, HandState } from '@/lib/types';

export interface CreateTableParams {
  smallBlind: number;
  bigBlind: number;
  defaultStack: number;
  maxPlayers: number;
  nickname: string;
}

export interface JoinTableParams {
  tableId: string;
  nickname: string;
}

export interface StartHandParams {
  table_id: string;
}

export interface PlayerActionParams {
  table_id: string;
  action: string;
  amount?: number;
}

export interface GameState {
  table: any | null;
  hand: any;
  players: any[];
}

async function getPlayersForTable(tableId: string): Promise<Array<Player & { id: string }>> {
  const playersQuery = query(
    collection(db, 'players'),
    where('table_id', '==', tableId)
  );
  const playersSnap = await getDocs(playersQuery);
  return playersSnap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Player & { id: string }));
}

async function getLatestHand(tableId: string): Promise<HandState | null> {
  const handsQuery = query(
    collection(db, 'hands'),
    where('table_id', '==', tableId),
    orderBy('created_at', 'desc'),
    limit(1)
  );
  const handsSnap = await getDocs(handsQuery);
  if (handsSnap.empty) return null;
  const docSnap = handsSnap.docs[0];
  return { id: docSnap.id, ...docSnap.data() } as HandState;
}

function getNextActiveSeat(players: any[], currentSeat: number) {
  if (players.length === 0) return null;
  const active = players.filter(p => !p.folded && (p.stack ?? 0) > 0);
  if (active.length === 0) return null;
  const seats = active.map(p => p.seat).sort((a, b) => a - b);
  const currentIndex = seats.indexOf(currentSeat);
  if (currentIndex === -1) return seats[0];
  return seats[(currentIndex + 1) % seats.length];
}

function getNextSeat(players: any[], startSeat: number) {
  const seats = players.map(p => p.seat).sort((a, b) => a - b);
  if (seats.length === 0) return null;
  const idx = seats.indexOf(startSeat);
  if (idx === -1) return seats[0];
  return seats[(idx + 1) % seats.length];
}

// Create a new table
export async function createTable(params: CreateTableParams, userId: string) {
  const tableData = {
    small_blind: params.smallBlind,
    big_blind: params.bigBlind,
    default_stack: params.defaultStack,
    max_players: params.maxPlayers,
    created_by: userId,
    created_at: new Date().toISOString(),
    status: 'waiting'
  };

  const docRef = await addDoc(collection(db, 'tables'), tableData);
  
  // Add the creator as the first player
  const playerData = {
    table_id: docRef.id,
    seat: 1,
    nickname: params.nickname,
    stack: params.defaultStack,
    bet: 0,
    folded: false,
    is_allin: false,
    is_connected: true,
    user_id: userId,
    created_at: new Date().toISOString()
  };

  await addDoc(collection(db, 'players'), playerData);
  
  return { tableId: docRef.id };
}

// Join a table
export async function joinTable(params: JoinTableParams, userId: string) {
  const { tableId, nickname } = params;
  
  // Get the table to find an available seat
  const tableRef = doc(db, 'tables', tableId);
  const tableSnap = await getDoc(tableRef);
  
  if (!tableSnap.exists()) {
    throw new Error('Table not found');
  }

  const tableData = tableSnap.data();
  
  // Find available seat (simple implementation)
  const existingPlayers = await getPlayersForTable(tableId);
  
  const usedSeats = existingPlayers.map(p => p.seat);
  const availableSeat = Array.from({ length: tableData.max_players || 6 }, (_, i) => i + 1).find(seat => !usedSeats.includes(seat));
  
  if (!availableSeat) {
    throw new Error('Table is full');
  }

  // Add player to the table
  const playerData = {
    table_id: tableId,
    seat: availableSeat,
    nickname,
    stack: tableData.default_stack || 1000,
    bet: 0,
    folded: false,
    is_allin: false,
    is_connected: true,
    user_id: userId,
    created_at: new Date().toISOString()
  };

  const playerRef = await addDoc(collection(db, 'players'), playerData);
  
  return { seat: availableSeat, player_id: playerRef.id };
}

// Start a new hand
export async function startHand(params: StartHandParams) {
  const { table_id } = params;
  
  // Get all players at the table
  const players = await getPlayersForTable(table_id);
  
  if (players.length < 2) {
    throw new Error('Need at least 2 players to start a hand');
  }

  const tableSnap = await getDoc(doc(db, 'tables', table_id));
  if (!tableSnap.exists()) {
    throw new Error('Table not found');
  }
  const tableData = tableSnap.data();

  const lastHand = await getLatestHand(table_id);
  const lastDealerSeat = lastHand?.dealer_seat ?? players[0].seat;
  const dealerSeat = getNextSeat(players, lastDealerSeat) ?? players[0].seat;
  const smallBlindSeat = getNextSeat(players, dealerSeat);
  const bigBlindSeat = smallBlindSeat ? getNextSeat(players, smallBlindSeat) : null;

  const smallBlind = tableData.small_blind ?? 10;
  const bigBlind = tableData.big_blind ?? 20;
  
  // Create a new hand
  const handData = {
    table_id,
    pot: 0,
    board: [],
    street: 'preflop',
    dealer_seat: dealerSeat,
    small_blind_seat: smallBlindSeat,
    big_blind_seat: bigBlindSeat,
    current_bet: bigBlind,
    actor_seat: bigBlindSeat ? getNextActiveSeat(players, bigBlindSeat) : null,
    act_deadline: new Date(Date.now() + 30000).toISOString(), // 30 seconds
    action_log: [],
    created_at: new Date().toISOString()
  };

  const handRef = await addDoc(collection(db, 'hands'), handData);
  
  // Reset player bets and status
  for (const player of players) {
    const updates: any = {
      bet: 0,
      folded: false,
      is_allin: false,
    };
    if (player.seat === smallBlindSeat) {
      const sbAmount = Math.min(player.stack ?? 0, smallBlind);
      updates.bet = sbAmount;
      updates.stack = Math.max(0, (player.stack ?? 0) - sbAmount);
      if (updates.stack === 0) updates.is_allin = true;
    }
    if (player.seat === bigBlindSeat) {
      const bbAmount = Math.min(player.stack ?? 0, bigBlind);
      updates.bet = bbAmount;
      updates.stack = Math.max(0, (player.stack ?? 0) - bbAmount);
      if (updates.stack === 0) updates.is_allin = true;
    }
    await updateDoc(doc(db, 'players', player.id), updates);
  }

  const initialPot = players.reduce((sum, p) => {
    if (p.seat === smallBlindSeat) return sum + Math.min(p.stack ?? 0, smallBlind);
    if (p.seat === bigBlindSeat) return sum + Math.min(p.stack ?? 0, bigBlind);
    return sum;
  }, 0);
  await updateDoc(doc(db, 'hands', handRef.id), { pot: initialPot });

  return { hand_id: handRef.id };
}

// Player action (bet, call, fold, etc.)
export async function playerAction(params: PlayerActionParams) {
  const { table_id, action, amount = 0 } = params;
  
  // Get current hand
  const handDoc = await getLatestHand(table_id);
  if (!handDoc) {
    throw new Error('No active hand found');
  }

  const handData = handDoc;
  
  // Get current player
  const players = await getPlayersForTable(table_id);
  
  const currentPlayer = players.find(p => p.seat === handData.actor_seat);
  if (!currentPlayer) {
    throw new Error('Current player not found');
  }

  // Update player based on action
  const updates: any = {};
  const currentBet = Math.max(...players.map(p => p.bet ?? 0), 0);
  let potDelta = 0;
  
  switch (action) {
    case 'fold':
      updates.folded = true;
      break;
    case 'call':
      {
        const toCall = Math.max(0, currentBet - (currentPlayer.bet ?? 0));
        const commit = Math.min(currentPlayer.stack ?? 0, toCall);
        updates.bet = (currentPlayer.bet ?? 0) + commit;
        updates.stack = Math.max(0, (currentPlayer.stack ?? 0) - commit);
        potDelta = commit;
        if (updates.stack === 0) updates.is_allin = true;
      }
      break;
    case 'bet':
      if (currentBet > 0) {
        throw new Error('Cannot bet: there is already a bet');
      }
      if (amount <= 0) {
        throw new Error('Bet must be positive');
      }
      updates.bet = amount;
      updates.stack = Math.max(0, (currentPlayer.stack ?? 0) - amount);
      potDelta = amount;
      if (updates.stack === 0) updates.is_allin = true;
      await updateDoc(doc(db, 'hands', handDoc.id), { current_bet: amount });
      break;
    case 'raise':
      if (amount <= currentBet) {
        throw new Error('Raise must be greater than current bet');
      }
      updates.bet = amount;
      updates.stack = Math.max(0, (currentPlayer.stack ?? 0) - amount);
      potDelta = Math.max(0, amount - (currentPlayer.bet ?? 0));
      if (updates.stack === 0) updates.is_allin = true;
      await updateDoc(doc(db, 'hands', handDoc.id), { current_bet: amount });
      if (updates.stack <= 0) {
        updates.is_allin = true;
      }
      break;
    case 'check':
      // No changes needed
      break;
    case 'allin':
      {
        const commit = currentPlayer.stack ?? 0;
        updates.bet = (currentPlayer.bet ?? 0) + commit;
        updates.stack = 0;
        updates.is_allin = true;
        potDelta = commit;
        if (updates.bet > currentBet) {
          await updateDoc(doc(db, 'hands', handDoc.id), { current_bet: updates.bet });
        }
      }
      break;
  }

  if (Object.keys(updates).length > 0) {
    await updateDoc(doc(db, 'players', currentPlayer.id), updates);
  }

  if (potDelta > 0) {
    await updateDoc(doc(db, 'hands', handDoc.id), {
      pot: (handData.pot ?? 0) + potDelta
    });
  }

  const updatedPlayers = await getPlayersForTable(table_id);
  const nextSeat = getNextActiveSeat(updatedPlayers, currentPlayer.seat);

  // Add to action log
  const actionLog = [...(handData.action_log || []), {
    seat: currentPlayer.seat,
    action,
    amount,
    created_at: new Date().toISOString()
  }];

  await updateDoc(doc(db, 'hands', handDoc.id), {
    action_log: actionLog,
    actor_seat: nextSeat,
    act_deadline: new Date(Date.now() + 30000).toISOString()
  });

  return { success: true };
}

// Fetch current game state
export async function fetchGameState(table_id: string): Promise<GameState> {
  const tableSnap = await getDoc(doc(db, 'tables', table_id));
  const table = tableSnap.exists() ? { id: tableSnap.id, ...tableSnap.data() } : null;

  // Get current hand
  const hand = await getLatestHand(table_id);

  // Get all players
  const players = await getPlayersForTable(table_id);

  return { table, hand, players };
}

// Fetch player's hole cards (simplified - in real poker this would be private)
export async function fetchMyHoleCards(table_id: string, seat: number) {
  // For now, return null - in a real implementation, this would fetch private hole cards
  return null;
}
