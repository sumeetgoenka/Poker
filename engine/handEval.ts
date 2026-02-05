import { Card, HandRank, Rank, Suit } from './types';
import { getRankValue } from './cards';

/**
 * Evaluates the best 5-card hand from 7 cards (2 hole + 5 community)
 */
export function evaluateHand(holeCards: Card[], board: Card[]): HandRank {
  if (holeCards.length !== 2) {
    throw new Error('Must have exactly 2 hole cards');
  }
  
  if (board.length > 5) {
    throw new Error('Board cannot have more than 5 cards');
  }
  
  const allCards = [...holeCards, ...board];
  const bestHand = getBestFiveCardHand(allCards);
  
  return evaluateFiveCardHand(bestHand);
}

/**
 * Gets all possible 5-card combinations from 7 cards and returns the best one
 */
function getBestFiveCardHand(cards: Card[]): Card[] {
  if (cards.length < 5) {
    throw new Error('Need at least 5 cards to evaluate');
  }
  
  if (cards.length === 5) {
    return cards;
  }
  
  // Generate all combinations of 5 cards from the available cards
  const combinations = getCombinations(cards, 5);
  
  // Evaluate each combination and return the best one
  let bestHand = combinations[0];
  let bestRank = evaluateFiveCardHand(bestHand);
  
  for (let i = 1; i < combinations.length; i++) {
    const currentRank = evaluateFiveCardHand(combinations[i]);
    if (compareHands(currentRank, bestRank) > 0) {
      bestHand = combinations[i];
      bestRank = currentRank;
    }
  }
  
  return bestHand;
}

/**
 * Generates all combinations of r elements from array
 */
function getCombinations<T>(arr: T[], r: number): T[][] {
  if (r === 1) return arr.map(x => [x]);
  if (r === arr.length) return [arr];
  
  const combinations: T[][] = [];
  
  for (let i = 0; i <= arr.length - r; i++) {
    const head = arr[i];
    const tailCombinations = getCombinations(arr.slice(i + 1), r - 1);
    for (const tail of tailCombinations) {
      combinations.push([head, ...tail]);
    }
  }
  
  return combinations;
}

/**
 * Evaluates a 5-card hand and returns its rank
 */
function evaluateFiveCardHand(cards: Card[]): HandRank {
  if (cards.length !== 5) {
    throw new Error('Must have exactly 5 cards to evaluate');
  }
  
  // Sort cards by rank value (descending)
  const sortedCards = [...cards].sort((a, b) => getRankValue(b.rank) - getRankValue(a.rank));
  
  // Check for straight flush
  const straightFlush = checkStraightFlush(sortedCards);
  if (straightFlush) return straightFlush;
  
  // Check for four of a kind
  const fourOfAKind = checkFourOfAKind(sortedCards);
  if (fourOfAKind) return fourOfAKind;
  
  // Check for full house
  const fullHouse = checkFullHouse(sortedCards);
  if (fullHouse) return fullHouse;
  
  // Check for flush
  const flush = checkFlush(sortedCards);
  if (flush) return flush;
  
  // Check for straight
  const straight = checkStraight(sortedCards);
  if (straight) return straight;
  
  // Check for three of a kind
  const threeOfAKind = checkThreeOfAKind(sortedCards);
  if (threeOfAKind) return threeOfAKind;
  
  // Check for two pair
  const twoPair = checkTwoPair(sortedCards);
  if (twoPair) return twoPair;
  
  // Check for one pair
  const onePair = checkOnePair(sortedCards);
  if (onePair) return onePair;
  
  // High card
  return {
    rank: 1,
    kickers: sortedCards.map(c => getRankValue(c.rank))
  };
}

function checkStraightFlush(cards: Card[]): HandRank | null {
  const flush = checkFlush(cards);
  if (!flush) return null;
  
  const straight = checkStraight(cards);
  if (!straight) return null;
  
  return {
    rank: 9,
    kickers: straight.kickers
  };
}

function checkFourOfAKind(cards: Card[]): HandRank | null {
  const rankCounts = getRankCounts(cards);
  const fourOfAKindRank = Object.keys(rankCounts).find(rank => rankCounts[rank] === 4);
  
  if (!fourOfAKindRank) return null;
  
  const kicker = cards.find(c => getRankValue(c.rank) !== parseInt(fourOfAKindRank));
  
  return {
    rank: 8,
    kickers: [parseInt(fourOfAKindRank), getRankValue(kicker!.rank)]
  };
}

function checkFullHouse(cards: Card[]): HandRank | null {
  const rankCounts = getRankCounts(cards);
  const threeOfAKindRank = Object.keys(rankCounts).find(rank => rankCounts[rank] === 3);
  const pairRank = Object.keys(rankCounts).find(rank => rankCounts[rank] === 2);
  
  if (!threeOfAKindRank || !pairRank) return null;
  
  return {
    rank: 7,
    kickers: [parseInt(threeOfAKindRank), parseInt(pairRank)]
  };
}

function checkFlush(cards: Card[]): HandRank | null {
  const suitCounts = getSuitCounts(cards);
  const flushSuit = Object.keys(suitCounts).find(suit => suitCounts[suit] === 5);
  
  if (!flushSuit) return null;
  
  const kickers = cards
    .filter(c => c.suit === flushSuit)
    .map(c => getRankValue(c.rank))
    .sort((a, b) => b - a);
  
  return {
    rank: 6,
    kickers
  };
}

function checkStraight(cards: Card[]): HandRank | null {
  const rankValues = Array.from(
    new Set(cards.map(c => getRankValue(c.rank)))
  ).sort((a, b) => b - a);

  if (rankValues.length < 5) {
    return null;
  }
  
  // Check for regular straight
  for (let i = 0; i < rankValues.length - 4; i++) {
    if (rankValues[i] - rankValues[i + 4] === 4) {
      return {
        rank: 5,
        kickers: [rankValues[i]]
      };
    }
  }
  
  // Check for A-2-3-4-5 straight (wheel)
  const wheelRanks = [14, 5, 4, 3, 2];
  const hasWheel = wheelRanks.every(rank => rankValues.includes(rank));
  if (hasWheel) {
    return {
      rank: 5,
      kickers: [5] // Ace plays low in wheel
    };
  }
  
  return null;
}

function checkThreeOfAKind(cards: Card[]): HandRank | null {
  const rankCounts = getRankCounts(cards);
  const threeOfAKindRank = Object.keys(rankCounts).find(rank => rankCounts[rank] === 3);
  
  if (!threeOfAKindRank) return null;
  
  const kickers = cards
    .filter(c => getRankValue(c.rank) !== parseInt(threeOfAKindRank))
    .map(c => getRankValue(c.rank))
    .sort((a, b) => b - a);
  
  return {
    rank: 4,
    kickers: [parseInt(threeOfAKindRank), ...kickers]
  };
}

function checkTwoPair(cards: Card[]): HandRank | null {
  const rankCounts = getRankCounts(cards);
  const pairs = Object.keys(rankCounts).filter(rank => rankCounts[rank] === 2);
  
  if (pairs.length !== 2) return null;
  
  const pairRanks = pairs.map(rank => parseInt(rank)).sort((a, b) => b - a);
  const pairRankSet = new Set(pairRanks);
  const kicker = cards.find(c => !pairRankSet.has(getRankValue(c.rank)));
  
  return {
    rank: 3,
    kickers: [...pairRanks, getRankValue(kicker!.rank)]
  };
}

function checkOnePair(cards: Card[]): HandRank | null {
  const rankCounts = getRankCounts(cards);
  const pairRank = Object.keys(rankCounts).find(rank => rankCounts[rank] === 2);
  
  if (!pairRank) return null;
  
  const kickers = cards
    .filter(c => getRankValue(c.rank) !== parseInt(pairRank))
    .map(c => getRankValue(c.rank))
    .sort((a, b) => b - a);
  
  return {
    rank: 2,
    kickers: [parseInt(pairRank), ...kickers]
  };
}

function getRankCounts(cards: Card[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const card of cards) {
    const rank = getRankValue(card.rank).toString();
    counts[rank] = (counts[rank] || 0) + 1;
  }
  return counts;
}

function getSuitCounts(cards: Card[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const card of cards) {
    counts[card.suit] = (counts[card.suit] || 0) + 1;
  }
  return counts;
}

/**
 * Compares two hands and returns:
 * -1 if hand1 < hand2
 * 0 if hand1 === hand2  
 * 1 if hand1 > hand2
 */
export function compareHands(hand1: HandRank, hand2: HandRank): number {
  if (hand1.rank !== hand2.rank) {
    return hand1.rank - hand2.rank;
  }
  
  // Compare kickers
  for (let i = 0; i < Math.max(hand1.kickers.length, hand2.kickers.length); i++) {
    const kicker1 = hand1.kickers[i] || 0;
    const kicker2 = hand2.kickers[i] || 0;
    
    if (kicker1 !== kicker2) {
      return kicker1 - kicker2;
    }
  }
  
  return 0; // Hands are equal
}

/**
 * Gets a human-readable description of a hand rank
 */
export function getHandDescription(handRank: HandRank): string {
  const descriptions = {
    1: 'High Card',
    2: 'One Pair', 
    3: 'Two Pair',
    4: 'Three of a Kind',
    5: 'Straight',
    6: 'Flush',
    7: 'Full House',
    8: 'Four of a Kind',
    9: 'Straight Flush'
  };
  
  return descriptions[handRank.rank as keyof typeof descriptions] || 'Unknown';
}
