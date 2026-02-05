import { 
  Player, 
  BetContext, 
  LegalActions, 
  PlayerAction, 
  PlayerActionType, 
  ChipAmount 
} from './types';

/**
 * Gets the legal actions available to a player
 * This is the core logic that fixes the "check when bet exists" bug
 */
export function getLegalActions(
  player: Player, 
  betCtx: BetContext, 
  players: Player[],
  bigBlindSize: ChipAmount = getBigBlindSize(players)
): LegalActions {
  const canFold = true; // Always can fold
  const callAmount = Math.max(0, betCtx.highestBet - player.committedThisStreet);
  const canCheck = callAmount === 0;
  const canAllIn = player.stack > 0;
  
  // Calculate minimum raise amount
  let minRaiseTo = betCtx.minRaiseTo;
  if (minRaiseTo <= 0) {
    if (betCtx.highestBet > 0) {
      // There's already a bet, so minimum raise is current bet + last raise size
      const lastRaiseSize = getLastRaiseSize(betCtx, bigBlindSize);
      minRaiseTo = betCtx.highestBet + lastRaiseSize;
    } else {
      // No bet yet, minimum is big blind
      minRaiseTo = bigBlindSize;
    }
  } else if (betCtx.highestBet === 0) {
    minRaiseTo = Math.max(minRaiseTo, bigBlindSize);
  }
  
  const maxBet = player.stack + player.committedThisStreet;
  
  return {
    canFold,
    canCheck,
    callAmount,
    minRaiseTo: Math.min(minRaiseTo, maxBet),
    canAllIn,
    maxBet
  };
}

/**
 * Validates a player action
 */
export function validateAction(
  player: Player,
  action: PlayerAction,
  betCtx: BetContext,
  players: Player[],
  bigBlindSize: ChipAmount = getBigBlindSize(players)
): { isValid: boolean; error?: string } {
  const legalActions = getLegalActions(player, betCtx, players, bigBlindSize);
  
  switch (action.type) {
    case PlayerActionType.FOLD:
      return { isValid: true };
      
    case PlayerActionType.CHECK:
      if (!legalActions.canCheck) {
        return { 
          isValid: false, 
          error: 'Cannot check when there is an outstanding bet' 
        };
      }
      return { isValid: true };
      
    case PlayerActionType.CALL:
      if (legalActions.callAmount === 0) {
        return { 
          isValid: false, 
          error: 'Nothing to call' 
        };
      }
      if (legalActions.callAmount > player.stack) {
        return { 
          isValid: false, 
          error: 'Insufficient chips to call' 
        };
      }
      return { isValid: true };
      
    case PlayerActionType.BET:
      if (!action.amount || action.amount <= 0) {
        return { 
          isValid: false, 
          error: 'Bet amount must be positive' 
        };
      }
      if (betCtx.highestBet > 0) {
        return { 
          isValid: false, 
          error: 'Cannot bet when there is already a bet (use raise instead)' 
        };
      }
      if (action.amount < bigBlindSize) {
        return { 
          isValid: false, 
          error: `Bet must be at least ${bigBlindSize}` 
        };
      }
      if (action.amount > player.stack) {
        return { 
          isValid: false, 
          error: 'Insufficient chips to bet' 
        };
      }
      return { isValid: true };
      
    case PlayerActionType.RAISE:
      if (!action.amount || action.amount <= 0) {
        return { 
          isValid: false, 
          error: 'Raise amount must be positive' 
        };
      }
      if (action.amount < legalActions.minRaiseTo) {
        return { 
          isValid: false, 
          error: `Raise must be at least ${legalActions.minRaiseTo}` 
        };
      }
      if (action.amount > legalActions.maxBet) {
        return { 
          isValid: false, 
          error: 'Insufficient chips to raise' 
        };
      }
      return { isValid: true };
      
    case PlayerActionType.ALL_IN:
      return { isValid: true };
      
    default:
      return { 
        isValid: false, 
        error: 'Invalid action type' 
      };
  }
}

/**
 * Applies a player action and returns updated state
 */
export function applyAction(
  player: Player,
  action: PlayerAction,
  betCtx: BetContext,
  players: Player[]
): { 
  updatedPlayer: Player; 
  updatedBetCtx: BetContext; 
  amountCommitted: ChipAmount 
} {
  const updatedPlayer = { ...player };
  const updatedBetCtx = { ...betCtx };
  let amountCommitted = 0;
  const previousHighest = betCtx.highestBet;
  
  switch (action.type) {
    case PlayerActionType.FOLD:
      updatedPlayer.inHand = false;
      break;
      
    case PlayerActionType.CHECK:
      // No chips committed
      break;
      
    case PlayerActionType.CALL:
      amountCommitted = Math.min(
        betCtx.highestBet - player.committedThisStreet,
        player.stack
      );
      updatedPlayer.committedThisStreet += amountCommitted;
      updatedPlayer.totalCommitted += amountCommitted;
      updatedPlayer.stack -= amountCommitted;
      
      if (updatedPlayer.stack === 0) {
        updatedPlayer.isAllIn = true;
      }
      break;
      
    case PlayerActionType.BET:
      {
        const targetCommit = Math.min(
          action.amount!,
          player.stack + player.committedThisStreet
        );
        amountCommitted = Math.max(0, targetCommit - player.committedThisStreet);
        updatedPlayer.committedThisStreet = targetCommit;
      }
      updatedPlayer.totalCommitted += amountCommitted;
      updatedPlayer.stack -= amountCommitted;
      
      if (updatedPlayer.stack === 0) {
        updatedPlayer.isAllIn = true;
      }
      break;
      
    case PlayerActionType.RAISE:
      {
        const targetCommit = Math.min(
          action.amount!,
          player.stack + player.committedThisStreet
        );
        amountCommitted = Math.max(0, targetCommit - player.committedThisStreet);
        updatedPlayer.committedThisStreet = targetCommit;
      }
      updatedPlayer.totalCommitted += amountCommitted;
      updatedPlayer.stack -= amountCommitted;
      
      if (updatedPlayer.stack === 0) {
        updatedPlayer.isAllIn = true;
      }
      break;
      
    case PlayerActionType.ALL_IN:
      amountCommitted = player.stack;
      updatedPlayer.committedThisStreet += amountCommitted;
      updatedPlayer.totalCommitted += amountCommitted;
      updatedPlayer.stack = 0;
      updatedPlayer.isAllIn = true;
      break;
  }

  if (updatedPlayer.committedThisStreet > previousHighest) {
    updatedBetCtx.highestBet = updatedPlayer.committedThisStreet;
    updatedBetCtx.lastAggressorId = player.id;

    const raiseSize = updatedPlayer.committedThisStreet - previousHighest;
    const minRaiseSize = Math.max(0, betCtx.minRaiseTo - previousHighest);

    if (raiseSize >= minRaiseSize) {
      updatedBetCtx.minRaiseTo = updatedBetCtx.highestBet + raiseSize;
    }
  }
  
  return { updatedPlayer, updatedBetCtx, amountCommitted };
}

/**
 * Checks if the betting round is complete
 */
export function isBettingRoundComplete(
  players: Player[],
  betCtx: BetContext
): boolean {
  const activePlayers = players.filter(p => p.inHand && !p.isAllIn);
  
  if (activePlayers.length <= 1) {
    return true;
  }
  
  // Check if all active players have matched the highest bet
  return activePlayers.every(p => p.committedThisStreet === betCtx.highestBet);
}

/**
 * Gets the next player to act
 */
export function getNextPlayerIndex(
  players: Player[],
  currentIndex: number
): number {
  const activePlayers = players.filter(p => p.inHand && !p.isAllIn);
  
  if (activePlayers.length <= 1) {
    return -1; // No more players to act
  }
  
  // Find next active player
  for (let i = 1; i < players.length; i++) {
    const nextIndex = (currentIndex + i) % players.length;
    const player = players[nextIndex];
    
    if (player.inHand && !player.isAllIn) {
      return nextIndex;
    }
  }
  
  return -1;
}

/**
 * Gets the last raise size for minimum raise calculations
 */
function getLastRaiseSize(betCtx: BetContext, bigBlindSize: ChipAmount): ChipAmount {
  // This is a simplified version - in a full implementation,
  // you'd track the last raise size in the betting context
  if (betCtx.minRaiseTo > betCtx.highestBet) {
    return betCtx.minRaiseTo - betCtx.highestBet;
  }
  return bigBlindSize;
}

/**
 * Gets the big blind size (simplified - assumes it's stored in table config)
 */
function getBigBlindSize(players: Player[]): ChipAmount {
  // In a real implementation, this would come from table configuration
  // For now, return a default value
  return 20;
}

/**
 * Resets betting context for a new street
 */
export function resetBettingContext(
  players: Player[],
  street: 'PRE_FLOP' | 'FLOP' | 'TURN' | 'RIVER'
): BetContext {
  // Reset committed this street for all players
  for (const player of players) {
    player.committedThisStreet = 0;
  }
  
  return {
    street,
    toActIndex: 0, // Will be set by caller
    highestBet: 0,
    minRaiseTo: 0,
    lastAggressorId: undefined,
    openBetAllowed: true
  };
}
