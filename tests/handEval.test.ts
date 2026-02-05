import { describe, it, expect } from 'vitest';
import { evaluateHand, compareHands, getHandDescription } from '../engine/handEval';
import { Card, Suit, Rank } from '../engine/types';

describe('Hand Evaluation', () => {
  describe('evaluateHand', () => {
    it('should evaluate high card correctly', () => {
      const holeCards: Card[] = [
        { suit: Suit.HEARTS, rank: Rank.ACE },
        { suit: Suit.CLUBS, rank: Rank.KING }
      ];
      const board: Card[] = [
        { suit: Suit.SPADES, rank: Rank.QUEEN },
        { suit: Suit.DIAMONDS, rank: Rank.JACK },
        { suit: Suit.HEARTS, rank: Rank.TEN },
        { suit: Suit.CLUBS, rank: Rank.EIGHT },
        { suit: Suit.SPADES, rank: Rank.SIX }
      ];
      
      const result = evaluateHand(holeCards, board);
      expect(result.rank).toBe(1); // High card
      expect(result.kickers[0]).toBe(14); // Ace
    });

    it('should evaluate pair correctly', () => {
      const holeCards: Card[] = [
        { suit: Suit.HEARTS, rank: Rank.ACE },
        { suit: Suit.CLUBS, rank: Rank.ACE }
      ];
      const board: Card[] = [
        { suit: Suit.SPADES, rank: Rank.QUEEN },
        { suit: Suit.DIAMONDS, rank: Rank.JACK },
        { suit: Suit.HEARTS, rank: Rank.TEN },
        { suit: Suit.CLUBS, rank: Rank.EIGHT },
        { suit: Suit.SPADES, rank: Rank.SIX }
      ];
      
      const result = evaluateHand(holeCards, board);
      expect(result.rank).toBe(2); // One pair
      expect(result.kickers[0]).toBe(14); // Ace
    });

    it('should evaluate two pair correctly', () => {
      const holeCards: Card[] = [
        { suit: Suit.HEARTS, rank: Rank.ACE },
        { suit: Suit.CLUBS, rank: Rank.KING }
      ];
      const board: Card[] = [
        { suit: Suit.SPADES, rank: Rank.ACE },
        { suit: Suit.DIAMONDS, rank: Rank.KING },
        { suit: Suit.HEARTS, rank: Rank.TEN },
        { suit: Suit.CLUBS, rank: Rank.EIGHT },
        { suit: Suit.SPADES, rank: Rank.SIX }
      ];
      
      const result = evaluateHand(holeCards, board);
      expect(result.rank).toBe(3); // Two pair
      expect(result.kickers[0]).toBe(14); // Ace
      expect(result.kickers[1]).toBe(13); // King
    });

    it('should evaluate three of a kind correctly', () => {
      const holeCards: Card[] = [
        { suit: Suit.HEARTS, rank: Rank.ACE },
        { suit: Suit.CLUBS, rank: Rank.ACE }
      ];
      const board: Card[] = [
        { suit: Suit.SPADES, rank: Rank.ACE },
        { suit: Suit.DIAMONDS, rank: Rank.KING },
        { suit: Suit.HEARTS, rank: Rank.TEN },
        { suit: Suit.CLUBS, rank: Rank.EIGHT },
        { suit: Suit.SPADES, rank: Rank.SIX }
      ];
      
      const result = evaluateHand(holeCards, board);
      expect(result.rank).toBe(4); // Three of a kind
      expect(result.kickers[0]).toBe(14); // Ace
    });

    it('should evaluate straight correctly', () => {
      const holeCards: Card[] = [
        { suit: Suit.HEARTS, rank: Rank.ACE },
        { suit: Suit.CLUBS, rank: Rank.KING }
      ];
      const board: Card[] = [
        { suit: Suit.SPADES, rank: Rank.QUEEN },
        { suit: Suit.DIAMONDS, rank: Rank.JACK },
        { suit: Suit.HEARTS, rank: Rank.TEN },
        { suit: Suit.CLUBS, rank: Rank.EIGHT },
        { suit: Suit.SPADES, rank: Rank.SIX }
      ];
      
      const result = evaluateHand(holeCards, board);
      expect(result.rank).toBe(5); // Straight
      expect(result.kickers[0]).toBe(14); // Ace high
    });

    it('should evaluate flush correctly', () => {
      const holeCards: Card[] = [
        { suit: Suit.HEARTS, rank: Rank.ACE },
        { suit: Suit.HEARTS, rank: Rank.KING }
      ];
      const board: Card[] = [
        { suit: Suit.HEARTS, rank: Rank.QUEEN },
        { suit: Suit.HEARTS, rank: Rank.JACK },
        { suit: Suit.HEARTS, rank: Rank.TEN },
        { suit: Suit.CLUBS, rank: Rank.EIGHT },
        { suit: Suit.SPADES, rank: Rank.SIX }
      ];
      
      const result = evaluateHand(holeCards, board);
      expect(result.rank).toBe(6); // Flush
      expect(result.kickers[0]).toBe(14); // Ace
    });

    it('should evaluate full house correctly', () => {
      const holeCards: Card[] = [
        { suit: Suit.HEARTS, rank: Rank.ACE },
        { suit: Suit.CLUBS, rank: Rank.ACE }
      ];
      const board: Card[] = [
        { suit: Suit.SPADES, rank: Rank.ACE },
        { suit: Suit.DIAMONDS, rank: Rank.KING },
        { suit: Suit.HEARTS, rank: Rank.KING },
        { suit: Suit.CLUBS, rank: Rank.EIGHT },
        { suit: Suit.SPADES, rank: Rank.SIX }
      ];
      
      const result = evaluateHand(holeCards, board);
      expect(result.rank).toBe(7); // Full house
      expect(result.kickers[0]).toBe(14); // Ace
      expect(result.kickers[1]).toBe(13); // King
    });

    it('should evaluate four of a kind correctly', () => {
      const holeCards: Card[] = [
        { suit: Suit.HEARTS, rank: Rank.ACE },
        { suit: Suit.CLUBS, rank: Rank.ACE }
      ];
      const board: Card[] = [
        { suit: Suit.SPADES, rank: Rank.ACE },
        { suit: Suit.DIAMONDS, rank: Rank.ACE },
        { suit: Suit.HEARTS, rank: Rank.KING },
        { suit: Suit.CLUBS, rank: Rank.EIGHT },
        { suit: Suit.SPADES, rank: Rank.SIX }
      ];
      
      const result = evaluateHand(holeCards, board);
      expect(result.rank).toBe(8); // Four of a kind
      expect(result.kickers[0]).toBe(14); // Ace
    });

    it('should evaluate straight flush correctly', () => {
      const holeCards: Card[] = [
        { suit: Suit.HEARTS, rank: Rank.ACE },
        { suit: Suit.HEARTS, rank: Rank.KING }
      ];
      const board: Card[] = [
        { suit: Suit.HEARTS, rank: Rank.QUEEN },
        { suit: Suit.HEARTS, rank: Rank.JACK },
        { suit: Suit.HEARTS, rank: Rank.TEN },
        { suit: Suit.CLUBS, rank: Rank.EIGHT },
        { suit: Suit.SPADES, rank: Rank.SIX }
      ];
      
      const result = evaluateHand(holeCards, board);
      expect(result.rank).toBe(9); // Straight flush
      expect(result.kickers[0]).toBe(14); // Ace high
    });
  });

  describe('compareHands', () => {
    it('should correctly compare different hand ranks', () => {
      const pair = { rank: 2, kickers: [14, 13, 12, 11, 10] };
      const twoPair = { rank: 3, kickers: [14, 13, 12] };
      
      expect(compareHands(twoPair, pair)).toBe(1); // Two pair beats pair
      expect(compareHands(pair, twoPair)).toBe(-1); // Pair loses to two pair
    });

    it('should correctly compare same hand ranks with different kickers', () => {
      const pair1 = { rank: 2, kickers: [14, 13, 12, 11, 10] }; // Aces
      const pair2 = { rank: 2, kickers: [13, 12, 11, 10, 9] }; // Kings
      
      expect(compareHands(pair1, pair2)).toBe(1); // Aces beat kings
      expect(compareHands(pair2, pair1)).toBe(-1); // Kings lose to aces
    });

    it('should return 0 for identical hands', () => {
      const hand1 = { rank: 2, kickers: [14, 13, 12, 11, 10] };
      const hand2 = { rank: 2, kickers: [14, 13, 12, 11, 10] };
      
      expect(compareHands(hand1, hand2)).toBe(0);
    });
  });

  describe('getHandDescription', () => {
    it('should return correct descriptions', () => {
      expect(getHandDescription({ rank: 1, kickers: [] })).toBe('High Card');
      expect(getHandDescription({ rank: 2, kickers: [] })).toBe('One Pair');
      expect(getHandDescription({ rank: 3, kickers: [] })).toBe('Two Pair');
      expect(getHandDescription({ rank: 4, kickers: [] })).toBe('Three of a Kind');
      expect(getHandDescription({ rank: 5, kickers: [] })).toBe('Straight');
      expect(getHandDescription({ rank: 6, kickers: [] })).toBe('Flush');
      expect(getHandDescription({ rank: 7, kickers: [] })).toBe('Full House');
      expect(getHandDescription({ rank: 8, kickers: [] })).toBe('Four of a Kind');
      expect(getHandDescription({ rank: 9, kickers: [] })).toBe('Straight Flush');
    });
  });
});

