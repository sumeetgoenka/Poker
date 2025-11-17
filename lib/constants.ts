// Game configuration constants
export const GAME_CONSTANTS = {
  MIN_PLAYERS: 2,
  MAX_PLAYERS: 9,
  DEFAULT_MAX_PLAYERS: 6,
  MIN_STACK: 100,
  MAX_STACK: 1000000,
  MIN_BLIND: 1,
  MAX_BLIND: 100000,
  ACTION_TIMEOUT_SECONDS: 30,
  POLL_INTERVAL_MS: 2000,
} as const;

// Validation constraints
export const VALIDATION = {
  NICKNAME_MIN_LENGTH: 1,
  NICKNAME_MAX_LENGTH: 20,
  TABLE_ID_LENGTH: 20,
} as const;

// Card suits and ranks
export const CARD_SUITS = {
  HEARTS: '♥',
  DIAMONDS: '♦',
  CLUBS: '♣',
  SPADES: '♠',
} as const;

export const SUIT_MAPPINGS = {
  h: CARD_SUITS.HEARTS,
  d: CARD_SUITS.DIAMONDS,
  c: CARD_SUITS.CLUBS,
  s: CARD_SUITS.SPADES,
} as const;

// Error messages
export const ERROR_MESSAGES = {
  AUTH_REQUIRED: 'Authentication required. Please sign in.',
  TABLE_NOT_FOUND: 'Table not found.',
  TABLE_FULL: 'Table is full.',
  INVALID_NICKNAME: 'Please enter a valid nickname.',
  INVALID_TABLE_ID: 'Invalid table ID.',
  INSUFFICIENT_PLAYERS: 'Need at least 2 players to start a hand.',
  NO_ACTIVE_HAND: 'No active hand found.',
  NETWORK_ERROR: 'Network error. Please check your connection.',
  UNKNOWN_ERROR: 'An unexpected error occurred.',
} as const;

// Collection names
export const COLLECTIONS = {
  TABLES: 'tables',
  PLAYERS: 'players',
  HANDS: 'hands',
} as const;
