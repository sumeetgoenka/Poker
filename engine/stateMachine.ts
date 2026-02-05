import { 
  TableState, 
  Player, 
  Card, 
  ChipAmount, 
  HandRank 
} from './types';
import { 
  createDeck, 
  shuffleDeck, 
  dealCards, 
  burnCard 
} from './cards';
import { 
  evaluateHand, 
  compareHands 
} from './handEval';
import { 
  buildPots, 
  distributePots 
} from './sidePots';
import { 
  getNextActivePlayerIndex,
  getBigBlindIndex,
  getSmallBlindIndex,
  isBettingRoundComplete,
  shouldEndHand,
  getLastRemainingPlayer,
  resetPlayersForNewHand,
  advanceDealerButton,
  isHeadsUp,
  getStreetFromState
} from './utils';
import { 
  resetBettingContext,
  isBettingRoundComplete as isBettingComplete
} from './betting';

export interface StateMachine {
  currentState: TableState;
  players: Player[];
  dealerIndex: number;
  sbSize: ChipAmount;
  bbSize: ChipAmount;
  deck: Card[];
  board: Card[];
  pots: Array<{ cap?: ChipAmount; amount: ChipAmount; eligiblePlayerIds: string[] }>;
  betCtx: {
    street: 'PRE_FLOP' | 'FLOP' | 'TURN' | 'RIVER';
    toActIndex: number;
    highestBet: ChipAmount;
    minRaiseTo: ChipAmount;
    lastAggressorId?: string;
    openBetAllowed: boolean;
  };
  actionHistory: Array<{
    playerId: string;
    type: string;
    amount?: ChipAmount;
    street: string;
  }>;
  config: {
    ante?: ChipAmount;
    maxPlayers: number;
    actTimeoutMs?: number;
  };
}

/**
 * Transitions from TABLE_INIT to NEW_HAND
 */
export function transitionToNewHand(state: StateMachine): StateMachine {
  if (state.currentState !== TableState.TABLE_INIT) {
    throw new Error(`Cannot transition to NEW_HAND from ${state.currentState}`);
  }

  // Advance dealer button
  const newDealerIndex = advanceDealerButton(state.players, state.dealerIndex);
  
  // Reset players for new hand
  resetPlayersForNewHand(state.players);
  
  // Create and shuffle new deck
  const newDeck = shuffleDeck(createDeck());
  
  // Post blinds
  const sbIndex = getSmallBlindIndex(state.players, newDealerIndex);
  const bbIndex = getBigBlindIndex(state.players, newDealerIndex);
  
  const updatedPlayers = [...state.players];
  
  // Post small blind
  if (updatedPlayers[sbIndex]) {
    const sbAmount = Math.min(state.sbSize, updatedPlayers[sbIndex].stack);
    updatedPlayers[sbIndex].committedThisStreet = sbAmount;
    updatedPlayers[sbIndex].totalCommitted = sbAmount;
    updatedPlayers[sbIndex].stack -= sbAmount;
    if (updatedPlayers[sbIndex].stack === 0) {
      updatedPlayers[sbIndex].isAllIn = true;
    }
  }
  
  // Post big blind
  if (updatedPlayers[bbIndex]) {
    const bbAmount = Math.min(state.bbSize, updatedPlayers[bbIndex].stack);
    updatedPlayers[bbIndex].committedThisStreet = bbAmount;
    updatedPlayers[bbIndex].totalCommitted = bbAmount;
    updatedPlayers[bbIndex].stack -= bbAmount;
    if (updatedPlayers[bbIndex].stack === 0) {
      updatedPlayers[bbIndex].isAllIn = true;
    }
  }
  
  // Deal hole cards (one card at a time starting from small blind)
  let deckAfterDeal = newDeck;
  const startIndex = getSmallBlindIndex(updatedPlayers, newDealerIndex);
  for (let round = 0; round < 2; round++) {
    for (let offset = 0; offset < updatedPlayers.length; offset++) {
      const playerIndex = (startIndex + offset) % updatedPlayers.length;
      const player = updatedPlayers[playerIndex];
      if (!player.inHand) continue;

      const { cards, remainingDeck } = dealCards(deckAfterDeal, 1);
      deckAfterDeal = remainingDeck;
      player.holeCards.push(cards[0]);
    }
  }
  
  // Set up betting context
  const betCtx = resetBettingContext(updatedPlayers, 'PRE_FLOP');
  const highestBet = updatedPlayers[bbIndex]?.committedThisStreet ?? 0;
  betCtx.highestBet = highestBet;
  betCtx.minRaiseTo = highestBet * 2;
  betCtx.toActIndex = getNextActivePlayerIndex(
    updatedPlayers, 
    bbIndex, 
    newDealerIndex, 
    'PRE_FLOP'
  );
  
  return {
    ...state,
    currentState: TableState.NEW_HAND,
    players: updatedPlayers,
    dealerIndex: newDealerIndex,
    deck: deckAfterDeal,
    board: [],
    pots: [],
    betCtx,
    actionHistory: []
  };
}

/**
 * Transitions from NEW_HAND to PRE_FLOP
 */
export function transitionToPreFlop(state: StateMachine): StateMachine {
  if (state.currentState !== TableState.NEW_HAND) {
    throw new Error(`Cannot transition to PRE_FLOP from ${state.currentState}`);
  }
  
  return {
    ...state,
    currentState: TableState.PRE_FLOP
  };
}

/**
 * Transitions from PRE_FLOP to FLOP
 */
export function transitionToFlop(state: StateMachine): StateMachine {
  if (state.currentState !== TableState.PRE_FLOP) {
    throw new Error(`Cannot transition to FLOP from ${state.currentState}`);
  }
  
  // Burn one card and deal three flop cards
  const { burnedCard, remainingDeck: deck1 } = burnCard(state.deck);
  const { cards: flopCards, remainingDeck: deck2 } = dealCards(deck1, 3);
  
  // Reset betting context for flop
  const betCtx = resetBettingContext(state.players, 'FLOP');
  betCtx.minRaiseTo = state.bbSize;
  betCtx.toActIndex = getNextActivePlayerIndex(
    state.players, 
    state.dealerIndex, 
    state.dealerIndex, 
    'FLOP'
  );
  
  return {
    ...state,
    currentState: TableState.FLOP,
    deck: deck2,
    board: flopCards,
    betCtx
  };
}

/**
 * Transitions from FLOP to TURN
 */
export function transitionToTurn(state: StateMachine): StateMachine {
  if (state.currentState !== TableState.FLOP) {
    throw new Error(`Cannot transition to TURN from ${state.currentState}`);
  }
  
  // Burn one card and deal one turn card
  const { burnedCard, remainingDeck: deck1 } = burnCard(state.deck);
  const { cards: turnCard, remainingDeck: deck2 } = dealCards(deck1, 1);
  
  // Reset betting context for turn
  const betCtx = resetBettingContext(state.players, 'TURN');
  betCtx.minRaiseTo = state.bbSize;
  betCtx.toActIndex = getNextActivePlayerIndex(
    state.players, 
    state.dealerIndex, 
    state.dealerIndex, 
    'TURN'
  );
  
  return {
    ...state,
    currentState: TableState.TURN,
    deck: deck2,
    board: [...state.board, ...turnCard],
    betCtx
  };
}

/**
 * Transitions from TURN to RIVER
 */
export function transitionToRiver(state: StateMachine): StateMachine {
  if (state.currentState !== TableState.TURN) {
    throw new Error(`Cannot transition to RIVER from ${state.currentState}`);
  }
  
  // Burn one card and deal one river card
  const { burnedCard, remainingDeck: deck1 } = burnCard(state.deck);
  const { cards: riverCard, remainingDeck: deck2 } = dealCards(deck1, 1);
  
  // Reset betting context for river
  const betCtx = resetBettingContext(state.players, 'RIVER');
  betCtx.minRaiseTo = state.bbSize;
  betCtx.toActIndex = getNextActivePlayerIndex(
    state.players, 
    state.dealerIndex, 
    state.dealerIndex, 
    'RIVER'
  );
  
  return {
    ...state,
    currentState: TableState.RIVER,
    deck: deck2,
    board: [...state.board, ...riverCard],
    betCtx
  };
}

/**
 * Transitions from RIVER to SHOWDOWN
 */
export function transitionToShowdown(state: StateMachine): StateMachine {
  if (state.currentState !== TableState.RIVER) {
    throw new Error(`Cannot transition to SHOWDOWN from ${state.currentState}`);
  }
  
  return {
    ...state,
    currentState: TableState.SHOWDOWN
  };
}

/**
 * Transitions from SHOWDOWN to AWARD_POT
 */
export function transitionToAwardPot(state: StateMachine): StateMachine {
  if (state.currentState !== TableState.SHOWDOWN) {
    throw new Error(`Cannot transition to AWARD_POT from ${state.currentState}`);
  }
  
  // Build side pots
  const pots = buildPots(state.players);
  
  // Evaluate hands for all players still in hand
  const handRankings = new Map<string, HandRank>();
  for (const player of state.players) {
    if (player.inHand) {
      const handRank = evaluateHand(player.holeCards, state.board);
      handRankings.set(player.id, handRank);
    }
  }
  
  // Distribute pots
  const winnings = distributePots(pots, state.players, handRankings);
  
  // Award winnings to players
  const updatedPlayers = state.players.map(player => {
    const winningsAmount = winnings.get(player.id) || 0;
    return {
      ...player,
      stack: player.stack + winningsAmount
    };
  });
  
  return {
    ...state,
    currentState: TableState.AWARD_POT,
    players: updatedPlayers,
    pots
  };
}

/**
 * Transitions from AWARD_POT back to NEW_HAND
 */
export function transitionToNewHandFromAward(state: StateMachine): StateMachine {
  if (state.currentState !== TableState.AWARD_POT) {
    throw new Error(`Cannot transition to NEW_HAND from ${state.currentState}`);
  }
  
  // Reset for new hand
  resetPlayersForNewHand(state.players);
  
  return {
    ...state,
    currentState: TableState.NEW_HAND,
    board: [],
    pots: [],
    actionHistory: []
  };
}

/**
 * Checks if the current betting round is complete
 */
export function isCurrentBettingRoundComplete(state: StateMachine): boolean {
  return isBettingComplete(state.players, state.betCtx);
}

/**
 * Checks if the hand should end due to insufficient players
 */
export function shouldEndCurrentHand(state: StateMachine): boolean {
  return shouldEndHand(state.players);
}

/**
 * Gets the winner by fold (if only one player remains)
 */
export function getWinnerByFold(state: StateMachine): Player | null {
  return getLastRemainingPlayer(state.players);
}

/**
 * Determines the next state based on current state and game conditions
 */
export function getNextState(state: StateMachine): TableState | null {
  switch (state.currentState) {
    case TableState.TABLE_INIT:
      return TableState.NEW_HAND;
      
    case TableState.NEW_HAND:
      return TableState.PRE_FLOP;
      
    case TableState.PRE_FLOP:
      if (shouldEndCurrentHand(state)) {
        return TableState.AWARD_POT;
      }
      if (isCurrentBettingRoundComplete(state)) {
        return TableState.FLOP;
      }
      return null; // Continue betting
      
    case TableState.FLOP:
      if (shouldEndCurrentHand(state)) {
        return TableState.AWARD_POT;
      }
      if (isCurrentBettingRoundComplete(state)) {
        return TableState.TURN;
      }
      return null; // Continue betting
      
    case TableState.TURN:
      if (shouldEndCurrentHand(state)) {
        return TableState.AWARD_POT;
      }
      if (isCurrentBettingRoundComplete(state)) {
        return TableState.RIVER;
      }
      return null; // Continue betting
      
    case TableState.RIVER:
      if (shouldEndCurrentHand(state)) {
        return TableState.AWARD_POT;
      }
      if (isCurrentBettingRoundComplete(state)) {
        return TableState.SHOWDOWN;
      }
      return null; // Continue betting
      
    case TableState.SHOWDOWN:
      return TableState.AWARD_POT;
      
    case TableState.AWARD_POT:
      return TableState.NEW_HAND;
      
    default:
      return null;
  }
}
