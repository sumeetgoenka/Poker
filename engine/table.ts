import { 
  TableState, 
  Player, 
  PlayerAction, 
  LegalActions, 
  GameEvent, 
  TableConfig,
  ChipAmount,
  Card,
  BetContext,
  PlayerActionType
} from './types';
import { 
  getLegalActions, 
  validateAction, 
  applyAction, 
  isBettingRoundComplete,
  getNextPlayerIndex
} from './betting';
import { 
  getNextActivePlayerIndex,
  getPlayerById,
  shouldEndHand,
  getLastRemainingPlayer,
  resetPlayersForNewHand,
  advanceDealerButton,
  getSmallBlindIndex as getSmallBlindIndexForPlayers,
  getBigBlindIndex as getBigBlindIndexForPlayers
} from './utils';
import { buildPots, distributePots } from './sidePots';
import { evaluateHand } from './handEval';
import {
  createDeck,
  shuffleDeck as shufflePokerDeck,
  dealCards as dealFromDeck,
  burnCard as burnFromDeck
} from './cards';

export class Table {
  private state: TableState;
  private players: Player[];
  private dealerIndex: number;
  private sbSize: ChipAmount;
  private bbSize: ChipAmount;
  private deck: Card[];
  private board: Card[];
  private pots: Array<{ cap?: ChipAmount; amount: ChipAmount; eligiblePlayerIds: string[] }>;
  private betCtx: {
    street: 'PRE_FLOP' | 'FLOP' | 'TURN' | 'RIVER';
    toActIndex: number;
    highestBet: ChipAmount;
    minRaiseTo: ChipAmount;
    lastAggressorId?: string;
    openBetAllowed: boolean;
  };
  private actionHistory: Array<{
    playerId: string;
    type: string;
    amount?: ChipAmount;
    street: string;
  }>;
  private config: TableConfig;
  private eventCallbacks: Map<string, (event: GameEvent) => void> = new Map();

  constructor(config: TableConfig) {
    this.state = TableState.TABLE_INIT;
    this.players = [];
    this.dealerIndex = 0;
    this.sbSize = config.sbSize;
    this.bbSize = config.bbSize;
    this.deck = [];
    this.board = [];
    this.pots = [];
    this.betCtx = {
      street: 'PRE_FLOP',
      toActIndex: 0,
      highestBet: 0,
      minRaiseTo: 0,
      lastAggressorId: undefined,
      openBetAllowed: true
    };
    this.actionHistory = [];
    this.config = config;
  }

  /**
   * Seats a player at the table
   */
  public seatPlayer(playerId: string, name: string, stack: ChipAmount, seat: number): void {
    if (seat < 0 || seat >= this.config.maxPlayers) {
      throw new Error(`Invalid seat number: ${seat}`);
    }
    
    if (this.players.some(p => p.seat === seat)) {
      throw new Error(`Seat ${seat} is already occupied`);
    }
    
    if (this.players.some(p => p.id === playerId)) {
      throw new Error(`Player ${playerId} is already seated`);
    }
    
    const player: Player = {
      id: playerId,
      name,
      stack,
      seat,
      inHand: false,
      isAllIn: false,
      holeCards: [],
      committedThisStreet: 0,
      totalCommitted: 0
    };

    const currentDealerSeat = this.players[this.dealerIndex]?.seat;
    this.players.push(player);
    this.players.sort((a, b) => a.seat - b.seat);
    if (currentDealerSeat !== undefined) {
      const newDealerIndex = this.players.findIndex(p => p.seat === currentDealerSeat);
      if (newDealerIndex >= 0) {
        this.dealerIndex = newDealerIndex;
      }
    }
    this.emitEvent({
      type: 'PLAYER_ACTION',
      data: { action: 'SEAT_PLAYER', playerId, seat }
    });
  }

  /**
   * Starts a new hand
   */
  public startHand(): void {
    if (this.state !== TableState.TABLE_INIT && this.state !== TableState.AWARD_POT) {
      throw new Error(`Cannot start hand from state: ${this.state}`);
    }
    
    const eligiblePlayers = this.players.filter(p => p.stack > 0);
    if (eligiblePlayers.length < 2) {
      throw new Error('Need at least 2 players to start a hand');
    }
    
    // Transition through states
    this.transitionToNewHand();
    this.transitionToPreFlop();
    
    this.emitEvent({
      type: 'STATE_CHANGE',
      data: { newState: this.state }
    });
  }

  /**
   * Gets the current game state
   */
  public getState(): {
    state: TableState;
    players: Player[];
    dealerIndex: number;
    sbSize: ChipAmount;
    bbSize: ChipAmount;
    deck: Card[];
    board: Card[];
    pots: Array<{ cap?: ChipAmount; amount: ChipAmount; eligiblePlayerIds: string[] }>;
    betCtx: BetContext;
    actionHistory: Array<{
      playerId: string;
      type: string;
      amount?: ChipAmount;
      street: string;
    }>;
    config: TableConfig;
  } {
    return {
      state: this.state,
      players: [...this.players],
      dealerIndex: this.dealerIndex,
      sbSize: this.sbSize,
      bbSize: this.bbSize,
      deck: [...this.deck],
      board: [...this.board],
      pots: [...this.pots],
      betCtx: { ...this.betCtx },
      actionHistory: [...this.actionHistory],
      config: { ...this.config }
    };
  }

  /**
   * Gets legal actions for a player
   */
  public getLegalActions(playerId: string): LegalActions {
    if (![TableState.PRE_FLOP, TableState.FLOP, TableState.TURN, TableState.RIVER].includes(this.state)) {
      throw new Error(`Cannot get legal actions in state: ${this.state}`);
    }
    const player = getPlayerById(this.players, playerId);
    if (!player) {
      throw new Error(`Player ${playerId} not found`);
    }
    
    if (!player.inHand) {
      throw new Error(`Player ${playerId} is not in the current hand`);
    }
    
    return getLegalActions(player, this.betCtx, this.players, this.bbSize);
  }

  /**
   * Executes a player action
   */
  public act(playerId: string, action: PlayerAction): void {
    if (![TableState.PRE_FLOP, TableState.FLOP, TableState.TURN, TableState.RIVER].includes(this.state)) {
      throw new Error(`Cannot act in state: ${this.state}`);
    }
    const player = getPlayerById(this.players, playerId);
    if (!player) {
      throw new Error(`Player ${playerId} not found`);
    }
    
    if (!player.inHand) {
      throw new Error(`Player ${playerId} is not in the current hand`);
    }
    
    const playerIndex = this.players.findIndex(p => p.id === playerId);
    if (this.betCtx.toActIndex !== playerIndex) {
      throw new Error(`It's not player ${playerId}'s turn to act`);
    }
    
    // Validate action
    const validation = validateAction(player, action, this.betCtx, this.players, this.bbSize);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }
    
    // Apply action
    const { updatedPlayer, updatedBetCtx, amountCommitted } = applyAction(
      player, 
      action, 
      this.betCtx, 
      this.players
    );
    
    // Update player in array
    this.players[playerIndex] = updatedPlayer;
    this.betCtx = updatedBetCtx;
    
    // Add to action history
    this.actionHistory.push({
      playerId,
      type: action.type,
      amount: action.amount,
      street: this.betCtx.street
    });
    
    this.emitEvent({
      type: 'PLAYER_ACTION',
      data: { playerId, action, amountCommitted }
    });
    
    // Check if betting round is complete
    if (isBettingRoundComplete(this.players, this.betCtx)) {
      this.handleBettingRoundComplete();
    } else {
      // Move to next player
      this.betCtx.toActIndex = getNextPlayerIndex(this.players, this.betCtx.toActIndex);
    }
    
    // Check if hand should end
    if (shouldEndHand(this.players)) {
      this.handleHandEnd();
    }
  }

  /**
   * Handles timeout for a player
   */
  public onTimeout(playerId: string): void {
    const player = getPlayerById(this.players, playerId);
    if (!player) {
      throw new Error(`Player ${playerId} not found`);
    }
    
    if (!player.inHand) {
      return;
    }
    
    const playerIndex = this.players.findIndex(p => p.id === playerId);
    if (this.betCtx.toActIndex !== playerIndex) {
      return;
    }
    
    // Auto-fold if there's a bet to call, otherwise auto-check
    const legalActions = getLegalActions(player, this.betCtx, this.players);
    const action: PlayerAction = legalActions.callAmount > 0 
      ? { type: PlayerActionType.FOLD }
      : { type: PlayerActionType.CHECK };
    
    this.act(playerId, action);
  }

  /**
   * Registers an event callback
   */
  public onStateChange(callback: (event: GameEvent) => void): void {
    this.eventCallbacks.set('STATE_CHANGE', callback);
  }

  public onStreetEnd(callback: (event: GameEvent) => void): void {
    this.eventCallbacks.set('STREET_END', callback);
  }

  public onShowdown(callback: (event: GameEvent) => void): void {
    this.eventCallbacks.set('SHOWDOWN', callback);
  }

  public onPayout(callback: (event: GameEvent) => void): void {
    this.eventCallbacks.set('PAYOUT', callback);
  }

  private emitEvent(event: GameEvent): void {
    const callback = this.eventCallbacks.get(event.type);
    if (callback) {
      callback(event);
    }
  }

  private transitionToNewHand(): void {
    // Advance dealer button
    this.dealerIndex = advanceDealerButton(this.players, this.dealerIndex);
    
    // Reset players for new hand
    resetPlayersForNewHand(this.players);

    // Clear previous hand state
    this.board = [];
    this.pots = [];
    this.actionHistory = [];
    
    // Create and shuffle new deck
    this.deck = this.shuffleDeck();
    
    // Post blinds
    this.postBlinds();
    
    // Deal hole cards
    this.dealHoleCards();
    
    const bigBlindIndex = this.getBigBlindIndex();
    const highestBet = this.players[bigBlindIndex]?.committedThisStreet ?? 0;

    // Set up betting context
    this.betCtx = {
      street: 'PRE_FLOP',
      toActIndex: this.getNextActivePlayerIndex('PRE_FLOP'),
      highestBet,
      minRaiseTo: highestBet * 2,
      lastAggressorId: undefined,
      openBetAllowed: true
    };
    
    this.state = TableState.NEW_HAND;
  }

  private transitionToPreFlop(): void {
    this.state = TableState.PRE_FLOP;
  }

  private transitionToFlop(): void {
    // Burn one card and deal flop
    this.burnCard();
    const flopCards = this.dealCards(3);
    this.board = flopCards;
    
    // Reset betting context
    this.betCtx = {
      street: 'FLOP',
      toActIndex: this.getNextActivePlayerIndex('FLOP'),
      highestBet: 0,
      minRaiseTo: this.bbSize,
      lastAggressorId: undefined,
      openBetAllowed: true
    };
    
    this.state = TableState.FLOP;
    this.emitEvent({ type: 'STREET_END', data: { street: 'FLOP' } });
  }

  private transitionToTurn(): void {
    // Burn one card and deal turn
    this.burnCard();
    const turnCard = this.dealCards(1);
    this.board = [...this.board, ...turnCard];
    
    // Reset betting context
    this.betCtx = {
      street: 'TURN',
      toActIndex: this.getNextActivePlayerIndex('TURN'),
      highestBet: 0,
      minRaiseTo: this.bbSize,
      lastAggressorId: undefined,
      openBetAllowed: true
    };
    
    this.state = TableState.TURN;
    this.emitEvent({ type: 'STREET_END', data: { street: 'TURN' } });
  }

  private transitionToRiver(): void {
    // Burn one card and deal river
    this.burnCard();
    const riverCard = this.dealCards(1);
    this.board = [...this.board, ...riverCard];
    
    // Reset betting context
    this.betCtx = {
      street: 'RIVER',
      toActIndex: this.getNextActivePlayerIndex('RIVER'),
      highestBet: 0,
      minRaiseTo: this.bbSize,
      lastAggressorId: undefined,
      openBetAllowed: true
    };
    
    this.state = TableState.RIVER;
    this.emitEvent({ type: 'STREET_END', data: { street: 'RIVER' } });
  }

  private transitionToShowdown(): void {
    this.state = TableState.SHOWDOWN;
    this.emitEvent({ type: 'SHOWDOWN', data: { board: this.board } });
  }

  private transitionToAwardPot(): void {
    // Build side pots
    this.pots = buildPots(this.players);
    
    // Evaluate hands and distribute winnings
    const handRankings = new Map<string, any>();
    for (const player of this.players) {
      if (player.inHand) {
        const handRank = evaluateHand(player.holeCards, this.board);
        handRankings.set(player.id, handRank);
      }
    }
    
    const winnings = distributePots(this.pots, this.players, handRankings);
    
    // Award winnings
    for (const player of this.players) {
      const winningsAmount = winnings.get(player.id) || 0;
      player.stack += winningsAmount;
    }
    
    this.state = TableState.AWARD_POT;
    this.emitEvent({ type: 'PAYOUT', data: { winnings } });
  }

  private handleBettingRoundComplete(): void {
    // Reset committed this street for all players
    for (const player of this.players) {
      player.committedThisStreet = 0;
    }
    
    // Transition to next street
    switch (this.state) {
      case TableState.PRE_FLOP:
        this.transitionToFlop();
        break;
      case TableState.FLOP:
        this.transitionToTurn();
        break;
      case TableState.TURN:
        this.transitionToRiver();
        break;
      case TableState.RIVER:
        this.transitionToShowdown();
        this.transitionToAwardPot();
        break;
    }
  }

  private handleHandEnd(): void {
    const winner = getLastRemainingPlayer(this.players);
    if (winner) {
      // Award all chips to winner
      const totalPot = this.players.reduce((sum, p) => sum + p.totalCommitted, 0);
      winner.stack += totalPot;
      this.pots = buildPots(this.players);
      
      this.emitEvent({
        type: 'PAYOUT',
        data: { winner: winner.id, amount: totalPot }
      });
    }
    this.state = TableState.AWARD_POT;
  }

  private shuffleDeck(): Card[] {
    return shufflePokerDeck(createDeck());
  }

  private postBlinds(): void {
    const sbIndex = this.getSmallBlindIndex();
    const bbIndex = this.getBigBlindIndex();
    
    // Post small blind
    if (this.players[sbIndex]) {
      const sbAmount = Math.min(this.sbSize, this.players[sbIndex].stack);
      this.players[sbIndex].committedThisStreet = sbAmount;
      this.players[sbIndex].totalCommitted = sbAmount;
      this.players[sbIndex].stack -= sbAmount;
      if (this.players[sbIndex].stack === 0) {
        this.players[sbIndex].isAllIn = true;
      }
    }
    
    // Post big blind
    if (this.players[bbIndex]) {
      const bbAmount = Math.min(this.bbSize, this.players[bbIndex].stack);
      this.players[bbIndex].committedThisStreet = bbAmount;
      this.players[bbIndex].totalCommitted = bbAmount;
      this.players[bbIndex].stack -= bbAmount;
      if (this.players[bbIndex].stack === 0) {
        this.players[bbIndex].isAllIn = true;
      }
    }
  }

  private dealHoleCards(): void {
    const startIndex = this.getSmallBlindIndex();
    for (let round = 0; round < 2; round++) {
      for (let offset = 0; offset < this.players.length; offset++) {
        const playerIndex = (startIndex + offset) % this.players.length;
        const player = this.players[playerIndex];
        if (!player.inHand) continue;

        const { cards, remainingDeck } = dealFromDeck(this.deck, 1);
        this.deck = remainingDeck;
        player.holeCards.push(cards[0]);
      }
    }
  }

  private dealCards(count: number): Card[] {
    const { cards, remainingDeck } = dealFromDeck(this.deck, count);
    this.deck = remainingDeck;
    return cards;
  }

  private burnCard(): void {
    const { remainingDeck } = burnFromDeck(this.deck);
    this.deck = remainingDeck;
  }

  private getNextActivePlayerIndex(street: 'PRE_FLOP' | 'FLOP' | 'TURN' | 'RIVER' = this.betCtx.street): number {
    return getNextActivePlayerIndex(
      this.players,
      this.dealerIndex,
      this.dealerIndex,
      street
    );
  }

  private getSmallBlindIndex(): number {
    return getSmallBlindIndexForPlayers(this.players, this.dealerIndex);
  }

  private getBigBlindIndex(): number {
    return getBigBlindIndexForPlayers(this.players, this.dealerIndex);
  }
}
