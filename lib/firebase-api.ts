import { db } from '@/lib/firebase';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  addDoc,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  writeBatch,
  runTransaction,
} from 'firebase/firestore';
import { COLLECTIONS, ERROR_MESSAGES, GAME_CONSTANTS } from './constants';
import { validateNickname, sanitizeNickname, validateTableParams } from './validation';

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

export interface TableDocument {
  small_blind: number;
  big_blind: number;
  default_stack: number;
  max_players: number;
  created_by: string;
  created_at: string;
  status: 'waiting' | 'playing' | 'finished';
}

export interface PlayerDocument {
  table_id: string;
  seat: number;
  nickname: string;
  stack: number;
  bet: number;
  folded: boolean;
  is_allin: boolean;
  is_connected: boolean;
  user_id: string;
  created_at: string;
}

export interface HandDocument {
  table_id: string;
  pot: number;
  board: string[];
  street: 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';
  actor_seat: number;
  act_deadline: string;
  action_log: Array<{
    seat: number;
    action: string;
    amount: number;
    created_at: string;
  }>;
  created_at: string;
}

/**
 * Create a new poker table
 */
export async function createTable(
  params: CreateTableParams,
  userId: string
): Promise<{ tableId: string }> {
  // Validate inputs
  const nicknameValidation = validateNickname(params.nickname);
  if (!nicknameValidation.isValid) {
    throw new Error(nicknameValidation.error);
  }

  const tableValidation = validateTableParams(params);
  if (!tableValidation.isValid) {
    throw new Error(tableValidation.error);
  }

  if (!userId) {
    throw new Error(ERROR_MESSAGES.AUTH_REQUIRED);
  }

  try {
    const tableData: TableDocument = {
      small_blind: params.smallBlind,
      big_blind: params.bigBlind,
      default_stack: params.defaultStack,
      max_players: params.maxPlayers,
      created_by: userId,
      created_at: new Date().toISOString(),
      status: 'waiting',
    };

    const docRef = await addDoc(collection(db, COLLECTIONS.TABLES), tableData);

    // Add the creator as the first player
    const playerData: PlayerDocument = {
      table_id: docRef.id,
      seat: 1,
      nickname: sanitizeNickname(params.nickname),
      stack: params.defaultStack,
      bet: 0,
      folded: false,
      is_allin: false,
      is_connected: true,
      user_id: userId,
      created_at: new Date().toISOString(),
    };

    await addDoc(collection(db, COLLECTIONS.PLAYERS), playerData);

    return { tableId: docRef.id };
  } catch (error) {
    console.error('Error creating table:', error);
    throw new Error('Failed to create table. Please try again.');
  }
}

/**
 * Join an existing table
 */
export async function joinTable(
  params: JoinTableParams,
  userId: string
): Promise<{ seat: number; player_id: string }> {
  const { tableId, nickname } = params;

  // Validate inputs
  const nicknameValidation = validateNickname(nickname);
  if (!nicknameValidation.isValid) {
    throw new Error(nicknameValidation.error);
  }

  if (!userId) {
    throw new Error(ERROR_MESSAGES.AUTH_REQUIRED);
  }

  if (!tableId) {
    throw new Error(ERROR_MESSAGES.INVALID_TABLE_ID);
  }

  try {
    // Get the table
    const tableRef = doc(db, COLLECTIONS.TABLES, tableId);
    const tableSnap = await getDoc(tableRef);

    if (!tableSnap.exists()) {
      throw new Error(ERROR_MESSAGES.TABLE_NOT_FOUND);
    }

    const tableData = tableSnap.data() as TableDocument;

    // Get all players for this table using a query (NOT all players!)
    const playersQuery = query(
      collection(db, COLLECTIONS.PLAYERS),
      where('table_id', '==', tableId)
    );
    const playersSnap = await getDocs(playersQuery);

    const existingPlayers = playersSnap.docs.map((doc) => doc.data() as PlayerDocument);

    // Check if user already has a seat
    const existingPlayer = existingPlayers.find((p) => p.user_id === userId);
    if (existingPlayer) {
      const existingPlayerDoc = playersSnap.docs.find((d) => d.data().user_id === userId);
      return {
        seat: existingPlayer.seat,
        player_id: existingPlayerDoc!.id,
      };
    }

    // Find available seat
    const usedSeats = existingPlayers.map((p) => p.seat);
    const availableSeat = Array.from(
      { length: tableData.max_players },
      (_, i) => i + 1
    ).find((seat) => !usedSeats.includes(seat));

    if (!availableSeat) {
      throw new Error(ERROR_MESSAGES.TABLE_FULL);
    }

    // Add player to the table
    const playerData: PlayerDocument = {
      table_id: tableId,
      seat: availableSeat,
      nickname: sanitizeNickname(nickname),
      stack: tableData.default_stack,
      bet: 0,
      folded: false,
      is_allin: false,
      is_connected: true,
      user_id: userId,
      created_at: new Date().toISOString(),
    };

    const playerRef = await addDoc(collection(db, COLLECTIONS.PLAYERS), playerData);

    return { seat: availableSeat, player_id: playerRef.id };
  } catch (error) {
    console.error('Error joining table:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to join table. Please try again.');
  }
}

/**
 * Start a new hand
 */
export async function startHand(params: StartHandParams): Promise<{ hand_id: string }> {
  const { table_id } = params;

  if (!table_id) {
    throw new Error(ERROR_MESSAGES.INVALID_TABLE_ID);
  }

  try {
    // Get all players at the table using a query
    const playersQuery = query(
      collection(db, COLLECTIONS.PLAYERS),
      where('table_id', '==', table_id)
    );
    const playersSnap = await getDocs(playersQuery);

    const players = playersSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Array<PlayerDocument & { id: string }>;

    if (players.length < GAME_CONSTANTS.MIN_PLAYERS) {
      throw new Error(ERROR_MESSAGES.INSUFFICIENT_PLAYERS);
    }

    // Create a new hand using batch write for atomicity
    const batch = writeBatch(db);

    const handData: HandDocument = {
      table_id,
      pot: 0,
      board: [],
      street: 'preflop',
      actor_seat: 1,
      act_deadline: new Date(
        Date.now() + GAME_CONSTANTS.ACTION_TIMEOUT_SECONDS * 1000
      ).toISOString(),
      action_log: [],
      created_at: new Date().toISOString(),
    };

    const handRef = doc(collection(db, COLLECTIONS.HANDS));
    batch.set(handRef, handData);

    // Reset player bets and status
    for (const player of players) {
      const playerRef = doc(db, COLLECTIONS.PLAYERS, player.id);
      batch.update(playerRef, {
        bet: 0,
        folded: false,
        is_allin: false,
      });
    }

    await batch.commit();

    return { hand_id: handRef.id };
  } catch (error) {
    console.error('Error starting hand:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to start hand. Please try again.');
  }
}

/**
 * Process a player action
 */
export async function playerAction(params: PlayerActionParams): Promise<{ success: boolean }> {
  const { table_id, action, amount = 0 } = params;

  if (!table_id) {
    throw new Error(ERROR_MESSAGES.INVALID_TABLE_ID);
  }

  try {
    // Get current hand using a proper query
    const handsQuery = query(
      collection(db, COLLECTIONS.HANDS),
      where('table_id', '==', table_id),
      orderBy('created_at', 'desc'),
      limit(1)
    );
    const handsSnap = await getDocs(handsQuery);

    if (handsSnap.empty) {
      throw new Error(ERROR_MESSAGES.NO_ACTIVE_HAND);
    }

    const handDoc = handsSnap.docs[0];
    const handData = handDoc.data() as HandDocument;

    // Get current player using a query
    const playersQuery = query(
      collection(db, COLLECTIONS.PLAYERS),
      where('table_id', '==', table_id)
    );
    const playersSnap = await getDocs(playersQuery);

    const players = playersSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Array<PlayerDocument & { id: string }>;

    const currentPlayer = players.find((p) => p.seat === handData.actor_seat);
    if (!currentPlayer) {
      throw new Error('Current player not found');
    }

    // Use batch write for atomic updates
    const batch = writeBatch(db);

    // Update player based on action
    const updates: Partial<PlayerDocument> = {};

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
      case 'allin':
        updates.bet = currentPlayer.stack;
        updates.stack = 0;
        updates.is_allin = true;
        break;
      default:
        throw new Error(`Invalid action: ${action}`);
    }

    if (Object.keys(updates).length > 0) {
      const playerRef = doc(db, COLLECTIONS.PLAYERS, currentPlayer.id);
      batch.update(playerRef, updates);
    }

    // Add to action log
    const actionLog = [
      ...(handData.action_log || []),
      {
        seat: currentPlayer.seat,
        action,
        amount,
        created_at: new Date().toISOString(),
      },
    ];

    const handRef = doc(db, COLLECTIONS.HANDS, handDoc.id);
    batch.update(handRef, {
      action_log: actionLog,
    });

    await batch.commit();

    return { success: true };
  } catch (error) {
    console.error('Error processing player action:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to process action. Please try again.');
  }
}

/**
 * Fetch current game state
 */
export async function fetchGameState(table_id: string): Promise<GameState> {
  if (!table_id) {
    throw new Error(ERROR_MESSAGES.INVALID_TABLE_ID);
  }

  try {
    // Get current hand using a proper query
    const handsQuery = query(
      collection(db, COLLECTIONS.HANDS),
      where('table_id', '==', table_id),
      orderBy('created_at', 'desc'),
      limit(1)
    );
    const handsSnap = await getDocs(handsQuery);
    const hand = handsSnap.empty ? null : { id: handsSnap.docs[0].id, ...handsSnap.docs[0].data() };

    // Get all players using a proper query
    const playersQuery = query(
      collection(db, COLLECTIONS.PLAYERS),
      where('table_id', '==', table_id),
      orderBy('seat', 'asc')
    );
    const playersSnap = await getDocs(playersQuery);
    const players = playersSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    return { hand, players };
  } catch (error) {
    console.error('Error fetching game state:', error);
    throw new Error('Failed to fetch game state.');
  }
}

/**
 * Fetch player's hole cards
 */
export async function fetchMyHoleCards(table_id: string, seat: number): Promise<string[] | null> {
  // For now, return null - in a real implementation, this would fetch private hole cards
  // This would require server-side functions to ensure security
  return null;
}

/**
 * Get table information
 */
export async function getTable(tableId: string): Promise<TableDocument | null> {
  if (!tableId) {
    throw new Error(ERROR_MESSAGES.INVALID_TABLE_ID);
  }

  try {
    const tableRef = doc(db, COLLECTIONS.TABLES, tableId);
    const tableSnap = await getDoc(tableRef);

    if (!tableSnap.exists()) {
      return null;
    }

    return tableSnap.data() as TableDocument;
  } catch (error) {
    console.error('Error fetching table:', error);
    throw new Error('Failed to fetch table information.');
  }
}