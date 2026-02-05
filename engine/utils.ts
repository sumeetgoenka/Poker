import { Player, TableState, ChipAmount } from './types';

/**
 * Gets the next active player index in turn order
 */
export function getNextActivePlayerIndex(
  players: Player[],
  currentIndex: number,
  dealerIndex: number,
  street: 'PRE_FLOP' | 'FLOP' | 'TURN' | 'RIVER'
): number {
  const activePlayers = players.filter(p => p.inHand && !p.isAllIn);
  
  if (activePlayers.length <= 1) {
    return -1; // No more players to act
  }
  
  // Determine starting position based on street
  let startIndex: number;
  if (street === 'PRE_FLOP') {
    // Preflop: start left of big blind (or button if heads-up)
    const bigBlindIndex = getBigBlindIndex(players, dealerIndex);
    startIndex = (bigBlindIndex + 1) % players.length;
  } else {
    // Postflop: start left of button (heads-up: dealer acts first)
    startIndex = isHeadsUp(players) ? dealerIndex : (dealerIndex + 1) % players.length;
  }
  
  // Find next active player from start position
  for (let i = 0; i < players.length; i++) {
    const checkIndex = (startIndex + i) % players.length;
    const player = players[checkIndex];
    
    if (player.inHand && !player.isAllIn) {
      return checkIndex;
    }
  }
  
  return -1;
}

/**
 * Gets the big blind player index
 */
export function getBigBlindIndex(players: Player[], dealerIndex: number): number {
  if (players.length === 0) {
    return 0;
  }
  if (isHeadsUp(players)) {
    return getNextEligibleIndex(players, dealerIndex);
  }
  const sbIndex = getSmallBlindIndex(players, dealerIndex);
  return getNextEligibleIndex(players, sbIndex);
}

/**
 * Gets the small blind player index
 */
export function getSmallBlindIndex(players: Player[], dealerIndex: number): number {
  if (players.length === 0) {
    return 0;
  }
  if (isHeadsUp(players)) {
    return dealerIndex;
  }
  return getNextEligibleIndex(players, dealerIndex);
}

/**
 * Checks if a betting round is complete
 */
export function isBettingRoundComplete(
  players: Player[],
  highestBet: ChipAmount
): boolean {
  const activePlayers = players.filter(p => p.inHand && !p.isAllIn);
  
  if (activePlayers.length <= 1) {
    return true;
  }
  
  // All active players must have matched the highest bet
  return activePlayers.every(p => p.committedThisStreet === highestBet);
}

/**
 * Gets the number of active players (not folded, not all-in)
 */
export function getActivePlayerCount(players: Player[]): number {
  return players.filter(p => p.inHand && !p.isAllIn).length;
}

/**
 * Gets the number of players still in the hand
 */
export function getPlayersInHandCount(players: Player[]): number {
  return players.filter(p => p.inHand).length;
}

/**
 * Checks if the hand should end due to insufficient players
 */
export function shouldEndHand(players: Player[]): boolean {
  return getPlayersInHandCount(players) <= 1;
}

/**
 * Gets the last remaining player (winner by fold)
 */
export function getLastRemainingPlayer(players: Player[]): Player | null {
  const playersInHand = players.filter(p => p.inHand);
  return playersInHand.length === 1 ? playersInHand[0] : null;
}

/**
 * Validates that a seat number is valid
 */
export function isValidSeat(seat: number, maxPlayers: number): boolean {
  return seat >= 0 && seat < maxPlayers;
}

/**
 * Checks if a seat is occupied
 */
export function isSeatOccupied(players: Player[], seat: number): boolean {
  return players.some(p => p.seat === seat);
}

/**
 * Gets the next available seat
 */
export function getNextAvailableSeat(players: Player[], maxPlayers: number): number | null {
  for (let seat = 0; seat < maxPlayers; seat++) {
    if (!isSeatOccupied(players, seat)) {
      return seat;
    }
  }
  return null;
}

/**
 * Gets player by ID
 */
export function getPlayerById(players: Player[], playerId: string): Player | null {
  return players.find(p => p.id === playerId) || null;
}

/**
 * Gets player by seat number
 */
export function getPlayerBySeat(players: Player[], seat: number): Player | null {
  return players.find(p => p.seat === seat) || null;
}

/**
 * Sorts players by seat number
 */
export function sortPlayersBySeat(players: Player[]): Player[] {
  return [...players].sort((a, b) => a.seat - b.seat);
}

/**
 * Gets the total pot amount from all player contributions
 */
export function getTotalPotAmount(players: Player[]): ChipAmount {
  return players.reduce((total, player) => total + player.totalCommitted, 0);
}

/**
 * Resets all players for a new hand
 */
export function resetPlayersForNewHand(players: Player[]): void {
  for (const player of players) {
    player.inHand = player.stack > 0;
    player.isAllIn = false;
    player.holeCards = [];
    player.committedThisStreet = 0;
    player.totalCommitted = 0;
  }
}

/**
 * Advances the dealer button
 */
export function advanceDealerButton(players: Player[], currentDealerIndex: number): number {
  if (players.length === 0) {
    return 0;
  }
  const next = getNextEligibleIndex(players, currentDealerIndex);
  return next === -1 ? currentDealerIndex : next;
}

/**
 * Checks if the game is heads-up (2 players)
 */
export function isHeadsUp(players: Player[]): boolean {
  return players.length === 2;
}

function getNextEligibleIndex(players: Player[], startIndex: number): number {
  if (players.length === 0) {
    return -1;
  }
  for (let i = 1; i <= players.length; i++) {
    const idx = (startIndex + i) % players.length;
    if (players[idx].stack > 0) {
      return idx;
    }
  }
  return -1;
}

/**
 * Gets the street name from table state
 */
export function getStreetFromState(state: TableState): 'PRE_FLOP' | 'FLOP' | 'TURN' | 'RIVER' {
  switch (state) {
    case TableState.PRE_FLOP:
      return 'PRE_FLOP';
    case TableState.FLOP:
      return 'FLOP';
    case TableState.TURN:
      return 'TURN';
    case TableState.RIVER:
      return 'RIVER';
    default:
      return 'PRE_FLOP';
  }
}

/**
 * Validates chip amounts
 */
export function validateChipAmount(amount: ChipAmount): boolean {
  return Number.isInteger(amount) && amount >= 0;
}

/**
 * Clamps a chip amount to valid range
 */
export function clampChipAmount(amount: ChipAmount, max: ChipAmount): ChipAmount {
  return Math.max(0, Math.min(amount, max));
}

/**
 * Formats chip amount for display
 */
export function formatChipAmount(amount: ChipAmount): string {
  return amount.toLocaleString();
}

/**
 * Checks if two players are the same
 */
export function playersEqual(player1: Player, player2: Player): boolean {
  return player1.id === player2.id;
}

/**
 * Creates a deep copy of a player
 */
export function clonePlayer(player: Player): Player {
  return {
    ...player,
    holeCards: [...player.holeCards]
  };
}

/**
 * Creates a deep copy of an array of players
 */
export function clonePlayers(players: Player[]): Player[] {
  return players.map(clonePlayer);
}
