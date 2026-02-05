export type ChipAmount = number; // integer chips

export enum TableState {
  TABLE_INIT = 'TABLE_INIT',
  NEW_HAND = 'NEW_HAND', 
  PRE_FLOP = 'PRE_FLOP',
  FLOP = 'FLOP',
  TURN = 'TURN',
  RIVER = 'RIVER',
  SHOWDOWN = 'SHOWDOWN',
  AWARD_POT = 'AWARD_POT'
}

export enum PlayerActionType { 
  FOLD = 'FOLD', 
  CHECK = 'CHECK', 
  CALL = 'CALL', 
  BET = 'BET', 
  RAISE = 'RAISE', 
  ALL_IN = 'ALL_IN' 
}

export enum Suit {
  HEARTS = 'h',
  DIAMONDS = 'd', 
  CLUBS = 'c',
  SPADES = 's'
}

export enum Rank {
  TWO = '2',
  THREE = '3', 
  FOUR = '4',
  FIVE = '5',
  SIX = '6',
  SEVEN = '7',
  EIGHT = '8',
  NINE = '9',
  TEN = 'T',
  JACK = 'J',
  QUEEN = 'Q',
  KING = 'K',
  ACE = 'A'
}

export interface Card {
  suit: Suit;
  rank: Rank;
}

export interface Player {
  id: string;
  name: string;
  stack: ChipAmount;        // chips behind
  seat: number;
  inHand: boolean;          // folded or not
  isAllIn: boolean;
  holeCards: Card[];        // length 2 once dealt
  committedThisStreet: ChipAmount; // contribution in current betting round
  totalCommitted: ChipAmount;      // cumulative this hand
}

export interface Pot {
  cap?: ChipAmount;        // max contribution from any single player to this pot (for side pots)
  amount: ChipAmount;
  eligiblePlayerIds: string[]; // players who contributed to this pot and can win it
}

export interface BetContext {
  street: 'PRE_FLOP' | 'FLOP' | 'TURN' | 'RIVER';
  toActIndex: number;        // pointer into seating order (next actor)
  highestBet: ChipAmount;    // current street max contribution (relative)
  minRaiseTo: ChipAmount;    // "to" amount required for a legal raise
  lastAggressorId?: string;  // who created last raise (for showdown reveal order)
  openBetAllowed: boolean;   // true on postflop when no bet has been made yet
}

export interface Table {
  state: TableState;
  players: Player[];         // seated, ordered by seat (0..n-1)
  dealerIndex: number;
  sbSize: ChipAmount;
  bbSize: ChipAmount;
  deck: Card[];
  board: Card[];             // 0..5 community
  pots: Pot[];               // main pot + optional side pots (in order of creation)
  betCtx: BetContext;
  actionHistory: Array<{
    playerId: string;
    type: PlayerActionType;
    amount?: ChipAmount;
    street: string;
  }>;
  config: { 
    ante?: ChipAmount; 
    maxPlayers: number; 
    actTimeoutMs?: number; 
  };
}

export interface LegalActions {
  canFold: boolean;
  canCheck: boolean;
  callAmount: ChipAmount;
  minRaiseTo: ChipAmount;
  canAllIn: boolean;
  maxBet: ChipAmount;
}

export interface PlayerAction {
  type: PlayerActionType;
  amount?: ChipAmount;
}

export interface GameEvent {
  type: 'STATE_CHANGE' | 'STREET_END' | 'SHOWDOWN' | 'PAYOUT' | 'PLAYER_ACTION';
  data: any;
}

export interface HandRank {
  rank: number; // 1 = high card, 2 = pair, ..., 9 = straight flush
  kickers: number[]; // for tie-breaking
}

export interface TableConfig {
  sbSize: ChipAmount;
  bbSize: ChipAmount;
  ante?: ChipAmount;
  maxPlayers: number;
  actTimeoutMs?: number;
}

