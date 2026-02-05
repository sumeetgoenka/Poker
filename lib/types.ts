export interface Player {
  seat: number;
  nickname: string;
  user_id?: string;
  is_connected?: boolean;
  stack: number;
  bet: number;
  folded: boolean;
  acted: boolean;
  is_allin: boolean;
}

export interface HandState {
  id: string;
  table_id: string;
  dealer_seat: number;
  actor_seat: number | null;
  act_deadline: string | null;
  board: string[];
  pot: number;
  street: 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';
  action_log: Array<{
    seat: number;
    action: string;
    amount?: number;
  }>;
}

export interface TableConfig {
  id: string;
  small_blind: number;
  big_blind: number;
  max_players: number;
  default_stack: number;
}

export interface PrivateHole {
  cards: string[];
}

export interface GameState {
  table: TableConfig | null;
  hand: HandState | null;
  players: Player[];
  myHoleCards: string[] | null;
  mySeat: number | null;
}

export type PlayerAction = 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'allin';
