import { Card, Suit, Rank } from './types';

/**
 * Creates a standard 52-card deck
 */
export function createDeck(): Card[] {
  const deck: Card[] = [];
  
  for (const suit of Object.values(Suit)) {
    for (const rank of Object.values(Rank)) {
      deck.push({ suit, rank });
    }
  }
  
  return deck;
}

/**
 * Shuffles a deck using Fisher-Yates algorithm
 */
export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return shuffled;
}

/**
 * Deals a specified number of cards from the deck
 */
export function dealCards(deck: Card[], count: number): { cards: Card[]; remainingDeck: Card[] } {
  if (count > deck.length) {
    throw new Error(`Cannot deal ${count} cards from deck with ${deck.length} cards`);
  }
  
  const cards = deck.slice(0, count);
  const remainingDeck = deck.slice(count);
  
  return { cards, remainingDeck };
}

/**
 * Burns a card (removes it from play)
 */
export function burnCard(deck: Card[]): { burnedCard: Card; remainingDeck: Card[] } {
  if (deck.length === 0) {
    throw new Error('Cannot burn card from empty deck');
  }
  
  const burnedCard = deck[0];
  const remainingDeck = deck.slice(1);
  
  return { burnedCard, remainingDeck };
}

/**
 * Converts a card to string representation (e.g., "Ah" for Ace of Hearts)
 */
export function cardToString(card: Card): string {
  return `${card.rank}${card.suit}`;
}

/**
 * Parses a string representation back to a card
 */
export function stringToCard(cardStr: string): Card {
  if (cardStr.length !== 2) {
    throw new Error(`Invalid card string: ${cardStr}`);
  }
  
  const rank = cardStr[0] as Rank;
  const suit = cardStr[1] as Suit;
  
  if (!Object.values(Rank).includes(rank)) {
    throw new Error(`Invalid rank: ${rank}`);
  }
  
  if (!Object.values(Suit).includes(suit)) {
    throw new Error(`Invalid suit: ${suit}`);
  }
  
  return { rank, suit };
}

/**
 * Gets the numeric value of a rank for comparison
 */
export function getRankValue(rank: Rank): number {
  const rankValues: Record<Rank, number> = {
    [Rank.TWO]: 2,
    [Rank.THREE]: 3,
    [Rank.FOUR]: 4,
    [Rank.FIVE]: 5,
    [Rank.SIX]: 6,
    [Rank.SEVEN]: 7,
    [Rank.EIGHT]: 8,
    [Rank.NINE]: 9,
    [Rank.TEN]: 10,
    [Rank.JACK]: 11,
    [Rank.QUEEN]: 12,
    [Rank.KING]: 13,
    [Rank.ACE]: 14
  };
  
  return rankValues[rank];
}

/**
 * Checks if two cards are equal
 */
export function cardsEqual(card1: Card, card2: Card): boolean {
  return card1.rank === card2.rank && card1.suit === card2.suit;
}

/**
 * Checks if a deck contains a specific card
 */
export function deckContains(deck: Card[], card: Card): boolean {
  return deck.some(c => cardsEqual(c, card));
}

/**
 * Removes a specific card from the deck
 */
export function removeCard(deck: Card[], card: Card): { removedCard: Card | null; remainingDeck: Card[] } {
  const index = deck.findIndex(c => cardsEqual(c, card));
  
  if (index === -1) {
    return { removedCard: null, remainingDeck: deck };
  }
  
  const removedCard = deck[index];
  const remainingDeck = deck.filter((_, i) => i !== index);
  
  return { removedCard, remainingDeck };
}

