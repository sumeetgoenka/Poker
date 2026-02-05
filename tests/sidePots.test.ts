import { describe, it, expect } from 'vitest';
import { buildPots, distributePots, getTotalPotAmount, validatePots } from '../engine/sidePots';
import { Player } from '../engine/types';

describe('Side Pots', () => {
  describe('buildPots', () => {
    it('should create single pot when no all-ins', () => {
      const players: Player[] = [
        {
          id: 'player1',
          name: 'Player 1',
          stack: 1000,
          seat: 0,
          inHand: true,
          isAllIn: false,
          holeCards: [],
          committedThisStreet: 0,
          totalCommitted: 100
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
          totalCommitted: 100
        }
      ];
      
      const pots = buildPots(players);
      
      expect(pots).toHaveLength(1);
      expect(pots[0].amount).toBe(200);
      expect(pots[0].eligiblePlayerIds).toHaveLength(2);
    });

    it('should create multiple pots with all-ins', () => {
      const players: Player[] = [
        {
          id: 'player1',
          name: 'Player 1',
          stack: 0,
          seat: 0,
          inHand: true,
          isAllIn: true,
          holeCards: [],
          committedThisStreet: 0,
          totalCommitted: 100
        },
        {
          id: 'player2',
          name: 'Player 2',
          stack: 0,
          seat: 1,
          inHand: true,
          isAllIn: true,
          holeCards: [],
          committedThisStreet: 0,
          totalCommitted: 200
        },
        {
          id: 'player3',
          name: 'Player 3',
          stack: 500,
          seat: 2,
          inHand: true,
          isAllIn: false,
          holeCards: [],
          committedThisStreet: 0,
          totalCommitted: 200
        }
      ];
      
      const pots = buildPots(players);
      
      expect(pots).toHaveLength(2);
      expect(pots[0].amount).toBe(300); // 100 + 100 + 100 (capped at 100)
      expect(pots[0].cap).toBe(100);
      expect(pots[1].amount).toBe(200); // 100 + 100 (capped at 200)
      expect(pots[1].cap).toBe(200);
    });

    it('should handle no contributions', () => {
      const players: Player[] = [
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
        }
      ];
      
      const pots = buildPots(players);
      expect(pots).toHaveLength(0);
    });
  });

  describe('distributePots', () => {
    it('should distribute single pot to winner', () => {
      const pots = [
        {
          cap: undefined,
          amount: 200,
          eligiblePlayerIds: ['player1', 'player2']
        }
      ];
      
      const players: Player[] = [
        {
          id: 'player1',
          name: 'Player 1',
          stack: 0,
          seat: 0,
          inHand: true,
          isAllIn: false,
          holeCards: [],
          committedThisStreet: 0,
          totalCommitted: 100
        },
        {
          id: 'player2',
          name: 'Player 2',
          stack: 0,
          seat: 1,
          inHand: true,
          isAllIn: false,
          holeCards: [],
          committedThisStreet: 0,
          totalCommitted: 100
        }
      ];
      
      const handRankings = new Map([
        ['player1', { rank: 2, kickers: [14, 13, 12, 11, 10] }], // Pair of aces
        ['player2', { rank: 1, kickers: [13, 12, 11, 10, 9] }]   // King high
      ]);
      
      const winnings = distributePots(pots, players, handRankings);
      
      expect(winnings.get('player1')).toBe(200);
      expect(winnings.get('player2')).toBe(0);
    });

    it('should split pot between tied players', () => {
      const pots = [
        {
          cap: undefined,
          amount: 200,
          eligiblePlayerIds: ['player1', 'player2']
        }
      ];
      
      const players: Player[] = [
        {
          id: 'player1',
          name: 'Player 1',
          stack: 0,
          seat: 0,
          inHand: true,
          isAllIn: false,
          holeCards: [],
          committedThisStreet: 0,
          totalCommitted: 100
        },
        {
          id: 'player2',
          name: 'Player 2',
          stack: 0,
          seat: 1,
          inHand: true,
          isAllIn: false,
          holeCards: [],
          committedThisStreet: 0,
          totalCommitted: 100
        }
      ];
      
      const handRankings = new Map([
        ['player1', { rank: 2, kickers: [14, 13, 12, 11, 10] }], // Pair of aces
        ['player2', { rank: 2, kickers: [14, 13, 12, 11, 10] }]  // Same pair of aces
      ]);
      
      const winnings = distributePots(pots, players, handRankings);
      
      expect(winnings.get('player1')).toBe(100);
      expect(winnings.get('player2')).toBe(100);
    });

    it('should handle odd chips in split pot', () => {
      const pots = [
        {
          cap: undefined,
          amount: 201, // Odd amount
          eligiblePlayerIds: ['player1', 'player2']
        }
      ];
      
      const players: Player[] = [
        {
          id: 'player1',
          name: 'Player 1',
          stack: 0,
          seat: 0,
          inHand: true,
          isAllIn: false,
          holeCards: [],
          committedThisStreet: 0,
          totalCommitted: 100
        },
        {
          id: 'player2',
          name: 'Player 2',
          stack: 0,
          seat: 1,
          inHand: true,
          isAllIn: false,
          holeCards: [],
          committedThisStreet: 0,
          totalCommitted: 100
        }
      ];
      
      const handRankings = new Map([
        ['player1', { rank: 2, kickers: [14, 13, 12, 11, 10] }],
        ['player2', { rank: 2, kickers: [14, 13, 12, 11, 10] }]
      ]);
      
      const winnings = distributePots(pots, players, handRankings);
      
      // One player should get 101, the other 100
      const totalWinnings = (winnings.get('player1') || 0) + (winnings.get('player2') || 0);
      expect(totalWinnings).toBe(201);
    });
  });

  describe('getTotalPotAmount', () => {
    it('should calculate total pot amount', () => {
      const pots = [
        { cap: undefined, amount: 100, eligiblePlayerIds: ['player1'] },
        { cap: 200, amount: 50, eligiblePlayerIds: ['player2'] }
      ];
      
      const total = getTotalPotAmount(pots);
      expect(total).toBe(150);
    });
  });

  describe('validatePots', () => {
    it('should validate correct pot calculations', () => {
      const pots = [
        { cap: undefined, amount: 200, eligiblePlayerIds: ['player1', 'player2'] }
      ];
      
      const players: Player[] = [
        {
          id: 'player1',
          name: 'Player 1',
          stack: 0,
          seat: 0,
          inHand: true,
          isAllIn: false,
          holeCards: [],
          committedThisStreet: 0,
          totalCommitted: 100
        },
        {
          id: 'player2',
          name: 'Player 2',
          stack: 0,
          seat: 1,
          inHand: true,
          isAllIn: false,
          holeCards: [],
          committedThisStreet: 0,
          totalCommitted: 100
        }
      ];
      
      expect(validatePots(pots, players)).toBe(true);
    });

    it('should reject invalid pot calculations', () => {
      const pots = [
        { cap: undefined, amount: 300, eligiblePlayerIds: ['player1', 'player2'] } // Wrong amount
      ];
      
      const players: Player[] = [
        {
          id: 'player1',
          name: 'Player 1',
          stack: 0,
          seat: 0,
          inHand: true,
          isAllIn: false,
          holeCards: [],
          committedThisStreet: 0,
          totalCommitted: 100
        },
        {
          id: 'player2',
          name: 'Player 2',
          stack: 0,
          seat: 1,
          inHand: true,
          isAllIn: false,
          holeCards: [],
          committedThisStreet: 0,
          totalCommitted: 100
        }
      ];
      
      expect(validatePots(pots, players)).toBe(false);
    });
  });
});

