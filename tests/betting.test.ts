import { describe, it, expect, beforeEach } from 'vitest';
import { 
  getLegalActions, 
  validateAction, 
  applyAction, 
  isBettingRoundComplete 
} from '../engine/betting';
import { Player, PlayerActionType, BetContext } from '../engine/types';

describe('Betting Logic', () => {
  let players: Player[];
  let betCtx: BetContext;

  beforeEach(() => {
    players = [
      {
        id: 'player1',
        name: 'Player 1',
        stack: 1000,
        seat: 0,
        inHand: true,
        isAllIn: false,
        holeCards: [],
        committedThisStreet: 0,
        totalCommitted: 0
      },
      {
        id: 'player2',
        name: 'Player 2',
        stack: 1000,
        seat: 1,
        inHand: true,
        isAllIn: false,
        holeCards: [],
        committedThisStreet: 0,
        totalCommitted: 0
      }
    ];

    betCtx = {
      street: 'PRE_FLOP',
      toActIndex: 0,
      highestBet: 0,
      minRaiseTo: 0,
      lastAggressorId: undefined,
      openBetAllowed: true
    };
  });

  describe('getLegalActions', () => {
    it('should allow check when no bet exists', () => {
      const actions = getLegalActions(players[0], betCtx, players);
      expect(actions.canCheck).toBe(true);
      expect(actions.canFold).toBe(true);
      expect(actions.callAmount).toBe(0);
    });

    it('should NOT allow check when bet exists', () => {
      betCtx.highestBet = 100;
      players[1].committedThisStreet = 100;
      
      const actions = getLegalActions(players[0], betCtx, players);
      expect(actions.canCheck).toBe(false);
      expect(actions.callAmount).toBe(100);
    });

    it('should calculate correct call amount', () => {
      betCtx.highestBet = 100;
      players[1].committedThisStreet = 100;
      players[0].committedThisStreet = 50;
      
      const actions = getLegalActions(players[0], betCtx, players);
      expect(actions.callAmount).toBe(50);
    });

    it('should allow all-in when player has chips', () => {
      const actions = getLegalActions(players[0], betCtx, players);
      expect(actions.canAllIn).toBe(true);
    });
  });

  describe('validateAction', () => {
    it('should reject check when bet exists', () => {
      betCtx.highestBet = 100;
      players[1].committedThisStreet = 100;
      
      const action = { type: PlayerActionType.CHECK };
      const result = validateAction(players[0], action, betCtx, players);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Cannot check when there is an outstanding bet');
    });

    it('should allow check when no bet exists', () => {
      const action = { type: PlayerActionType.CHECK };
      const result = validateAction(players[0], action, betCtx, players);
      
      expect(result.isValid).toBe(true);
    });

    it('should reject bet when bet already exists', () => {
      betCtx.highestBet = 100;
      players[1].committedThisStreet = 100;
      
      const action = { type: PlayerActionType.BET, amount: 50 };
      const result = validateAction(players[0], action, betCtx, players);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Cannot bet when there is already a bet');
    });

    it('should reject insufficient bet amount', () => {
      const action = { type: PlayerActionType.BET, amount: 10 };
      const result = validateAction(players[0], action, betCtx, players);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Bet must be at least');
    });

    it('should reject insufficient chips for bet', () => {
      players[0].stack = 50;
      const action = { type: PlayerActionType.BET, amount: 100 };
      const result = validateAction(players[0], action, betCtx, players);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Insufficient chips to bet');
    });
  });

  describe('applyAction', () => {
    it('should apply fold correctly', () => {
      const action = { type: PlayerActionType.FOLD };
      const result = applyAction(players[0], action, betCtx, players);
      
      expect(result.updatedPlayer.inHand).toBe(false);
      expect(result.amountCommitted).toBe(0);
    });

    it('should apply check correctly', () => {
      const action = { type: PlayerActionType.CHECK };
      const result = applyAction(players[0], action, betCtx, players);
      
      expect(result.updatedPlayer.committedThisStreet).toBe(0);
      expect(result.amountCommitted).toBe(0);
    });

    it('should apply call correctly', () => {
      betCtx.highestBet = 100;
      players[1].committedThisStreet = 100;
      
      const action = { type: PlayerActionType.CALL };
      const result = applyAction(players[0], action, betCtx, players);
      
      expect(result.updatedPlayer.committedThisStreet).toBe(100);
      expect(result.updatedPlayer.stack).toBe(900);
      expect(result.amountCommitted).toBe(100);
    });

    it('should apply bet correctly', () => {
      const action = { type: PlayerActionType.BET, amount: 100 };
      const result = applyAction(players[0], action, betCtx, players);
      
      expect(result.updatedPlayer.committedThisStreet).toBe(100);
      expect(result.updatedPlayer.stack).toBe(900);
      expect(result.updatedBetCtx.highestBet).toBe(100);
      expect(result.updatedBetCtx.lastAggressorId).toBe(players[0].id);
    });

    it('should apply all-in correctly', () => {
      const action = { type: PlayerActionType.ALL_IN };
      const result = applyAction(players[0], action, betCtx, players);
      
      expect(result.updatedPlayer.stack).toBe(0);
      expect(result.updatedPlayer.isAllIn).toBe(true);
      expect(result.amountCommitted).toBe(1000);
    });
  });

  describe('isBettingRoundComplete', () => {
    it('should return true when only one active player', () => {
      players[1].inHand = false;
      expect(isBettingRoundComplete(players, betCtx)).toBe(true);
    });

    it('should return true when all players matched bet', () => {
      betCtx.highestBet = 100;
      players[0].committedThisStreet = 100;
      players[1].committedThisStreet = 100;
      
      expect(isBettingRoundComplete(players, betCtx)).toBe(true);
    });

    it('should return false when players have not matched bet', () => {
      betCtx.highestBet = 100;
      players[0].committedThisStreet = 50;
      players[1].committedThisStreet = 100;
      
      expect(isBettingRoundComplete(players, betCtx)).toBe(false);
    });
  });
});

