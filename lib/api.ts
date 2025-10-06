import { supabase } from './supabase-browser';

export interface CreateTableParams {
  small_blind: number;
  big_blind: number;
  default_stack: number;
  max_players: number;
  nickname: string;
}

export interface JoinTableParams {
  table_id: string;
  nickname: string;
}

export interface StartHandParams {
  table_id: string;
}

export interface PlayerActionParams {
  table_id: string;
  action: 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'allin';
  amount?: number;
}

export async function createTable(params: CreateTableParams) {
  // Supabase edge function expects camelCase fields; map and normalize response
  const { data, error } = await supabase.functions.invoke('create_table', {
    body: {
      smallBlind: params.small_blind,
      bigBlind: params.big_blind,
      maxPlayers: params.max_players,
      nickname: params.nickname,
      defaultStack: params.default_stack,
    },
  });

  if (error) throw error;
  // Normalize to snake_case expected by callers
  if (data && typeof data === 'object' && 'tableId' in data) {
    return { ...data, table_id: (data as any).tableId };
  }
  return data;
}

export async function joinTable(params: JoinTableParams) {
  const { data, error } = await supabase.functions.invoke('join_table', {
    body: params,
  });

  if (error) throw error;
  return data;
}

export async function startHand(params: StartHandParams) {
  const { data, error } = await supabase.functions.invoke('start_hand', {
    body: params,
  });

  if (error) throw error;
  return data;
}

export async function playerAction(params: PlayerActionParams) {
  const { data, error } = await supabase.functions.invoke('player_action', {
    body: params,
  });

  if (error) throw error;
  return data;
}

// Fetch initial game state
export async function fetchGameState(tableId: string) {
  const [handResult, playersResult] = await Promise.all([
    supabase
      .from('hand')
      .select('*')
      .eq('table_id', tableId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from('players').select('*').eq('table_id', tableId),
  ]);

  return {
    hand: handResult.data,
    players: playersResult.data || [],
  };
}

// Fetch private hole cards for the player
export async function fetchMyHoleCards(tableId: string, seat: number) {
  const { data, error } = await supabase
    .from('private_holes')
    .select('cards')
    .eq('table_id', tableId)
    .eq('seat', seat)
    .single();

  if (error) {
    console.error('Failed to fetch hole cards:', error);
    return null;
  }

  return data?.cards || null;
}
