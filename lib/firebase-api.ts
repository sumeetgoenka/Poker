import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, updateDoc, collection, addDoc, query, where, getDocs, orderBy, limit } from 'firebase/firestore';

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
  hand: any;
  players: any[];
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
  const playersSnap = await getDocs(collection(db, 'players'));
  const existingPlayers = playersSnap.docs
    .map(doc => doc.data())
    .filter(player => player.table_id === tableId);
  
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
  const playersSnap = await getDocs(collection(db, 'players'));
  const players = playersSnap.docs
    .map(doc => ({ id: doc.id, ...doc.data() }))
    .filter(player => player.table_id === table_id);
  
  if (players.length < 2) {
    throw new Error('Need at least 2 players to start a hand');
  }

  // Create a new hand
  const handData = {
    table_id,
    pot: 0,
    board: [],
    street: 'preflop',
    actor_seat: 1, // Simple: first player acts first
    act_deadline: new Date(Date.now() + 30000).toISOString(), // 30 seconds
    action_log: [],
    created_at: new Date().toISOString()
  };

  const handRef = await addDoc(collection(db, 'hands'), handData);
  
  // Reset player bets and status
  for (const player of players) {
    await updateDoc(doc(db, 'players', player.id), {
      bet: 0,
      folded: false,
      is_allin: false
    });
  }

  return { hand_id: handRef.id };
}

// Player action (bet, call, fold, etc.)
export async function playerAction(params: PlayerActionParams) {
  const { table_id, action, amount = 0 } = params;
  
  // Get current hand
  const handsSnap = await getDocs(collection(db, 'hands'));
  const hands = handsSnap.docs
    .map(doc => ({ id: doc.id, ...doc.data() }))
    .filter(hand => hand.table_id === table_id)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  
  if (hands.length === 0) {
    throw new Error('No active hand found');
  }

  const handDoc = { id: hands[0].id, ...hands[0] };
  const handData = handDoc;
  
  // Get current player
  const playersSnap = await getDocs(collection(db, 'players'));
  const players = playersSnap.docs
    .map(doc => ({ id: doc.id, ...doc.data() }))
    .filter(player => player.table_id === table_id);
  
  const currentPlayer = players.find(p => p.seat === handData.actor_seat);
  if (!currentPlayer) {
    throw new Error('Current player not found');
  }

  // Update player based on action
  const updates: any = {};
  
  switch (action) {
    case 'fold':
      updates.folded = true;
      break;
    case 'call':
    case 'bet':
    case 'raise':
      updates.bet = amount;
      updates.stack = currentPlayer.stack - amount;
      if (updates.stack <= 0) {
        updates.is_allin = true;
      }
      break;
    case 'check':
      // No changes needed
      break;
  }

  if (Object.keys(updates).length > 0) {
    await updateDoc(doc(db, 'players', currentPlayer.id), updates);
  }

  // Add to action log
  const actionLog = [...(handData.action_log || []), {
    seat: currentPlayer.seat,
    action,
    amount,
    created_at: new Date().toISOString()
  }];

  await updateDoc(doc(db, 'hands', handDoc.id), {
    action_log: actionLog
  });

  return { success: true };
}

// Fetch current game state
export async function fetchGameState(table_id: string): Promise<GameState> {
  // Get current hand
  const handsSnap = await getDocs(collection(db, 'hands'));
  const hands = handsSnap.docs
    .map(doc => ({ id: doc.id, ...doc.data() }))
    .filter(hand => hand.table_id === table_id)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const hand = hands.length > 0 ? hands[0] : null;

  // Get all players
  const playersSnap = await getDocs(collection(db, 'players'));
  const players = playersSnap.docs
    .map(doc => ({ id: doc.id, ...doc.data() }))
    .filter(player => player.table_id === table_id);

  return { hand, players };
}

// Fetch player's hole cards (simplified - in real poker this would be private)
export async function fetchMyHoleCards(table_id: string, seat: number) {
  // For now, return null - in a real implementation, this would fetch private hole cards
  return null;
}