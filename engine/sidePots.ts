import { Pot, Player, ChipAmount } from './types';

/**
 * Builds side pots based on player contributions
 * This handles the complex logic of creating multiple pots when players go all-in
 */
export function buildPots(players: Player[]): Pot[] {
  // Get all unique contribution amounts (all-in thresholds)
  const contributions = players
    .filter(p => p.totalCommitted > 0)
    .map(p => p.totalCommitted)
    .sort((a, b) => a - b);
  
  const uniqueContributions = [...new Set(contributions)];
  
  if (uniqueContributions.length === 0) {
    return [];
  }
  
  const pots: Pot[] = [];
  
  // Create a pot for each unique contribution level
  for (let i = 0; i < uniqueContributions.length; i++) {
    const currentThreshold = uniqueContributions[i];
    const previousThreshold = i > 0 ? uniqueContributions[i - 1] : 0;
    
    // Calculate eligible players for this pot
    const eligiblePlayers = players.filter(p => 
      p.totalCommitted >= currentThreshold && p.inHand
    );
    
    // Calculate pot amount
    let potAmount = 0;
    for (const player of players) {
      const contributionToThisPot = Math.min(
        player.totalCommitted - previousThreshold,
        currentThreshold - previousThreshold
      );
      potAmount += Math.max(0, contributionToThisPot);
    }
    
    if (potAmount > 0) {
      pots.push({
        cap: currentThreshold,
        amount: potAmount,
        eligiblePlayerIds: eligiblePlayers.map(p => p.id)
      });
    }
  }
  
  return pots;
}

/**
 * Distributes pot winnings to players based on hand rankings
 */
export function distributePots(
  pots: Pot[], 
  players: Player[], 
  handRankings: Map<string, { rank: number; kickers: number[] }>
): Map<string, ChipAmount> {
  const winnings = new Map<string, ChipAmount>();
  
  // Initialize winnings to 0
  for (const player of players) {
    winnings.set(player.id, 0);
  }
  
  // Distribute each pot
  for (const pot of pots) {
    if (pot.eligiblePlayerIds.length === 0) continue;
    
    // Find the best hand among eligible players
    let bestPlayers: string[] = [];
    let bestRank: { rank: number; kickers: number[] } = { rank: 0, kickers: [] };
    
    for (const playerId of pot.eligiblePlayerIds) {
      const playerRanking = handRankings.get(playerId);
      if (!playerRanking) continue;
      
      if (bestPlayers.length === 0) {
        bestPlayers = [playerId];
        bestRank = playerRanking;
      } else {
        const comparison = compareHandRankings(playerRanking, bestRank);
        if (comparison > 0) {
          bestPlayers = [playerId];
          bestRank = playerRanking;
        } else if (comparison === 0) {
          bestPlayers.push(playerId);
        }
      }
    }
    
    // Distribute pot among winners
    if (bestPlayers.length > 0) {
      const amountPerWinner = Math.floor(pot.amount / bestPlayers.length);
      const remainder = pot.amount % bestPlayers.length;
      
      for (let i = 0; i < bestPlayers.length; i++) {
        const playerId = bestPlayers[i];
        const currentWinnings = winnings.get(playerId) || 0;
        let winningsAmount = amountPerWinner;
        
        // Distribute remainder chips to first winner(s)
        if (i < remainder) {
          winningsAmount += 1;
        }
        
        winnings.set(playerId, currentWinnings + winningsAmount);
      }
    }
  }
  
  return winnings;
}

/**
 * Compares two hand rankings for winner determination
 * Returns: -1 if rank1 < rank2, 0 if equal, 1 if rank1 > rank2
 */
function compareHandRankings(
  rank1: { rank: number; kickers: number[] },
  rank2: { rank: number; kickers: number[] }
): number {
  if (rank1.rank !== rank2.rank) {
    return rank1.rank - rank2.rank;
  }
  
  // Compare kickers
  for (let i = 0; i < Math.max(rank1.kickers.length, rank2.kickers.length); i++) {
    const kicker1 = rank1.kickers[i] || 0;
    const kicker2 = rank2.kickers[i] || 0;
    
    if (kicker1 !== kicker2) {
      return kicker1 - kicker2;
    }
  }
  
  return 0; // Hands are equal
}

/**
 * Calculates the total amount in all pots
 */
export function getTotalPotAmount(pots: Pot[]): ChipAmount {
  return pots.reduce((total, pot) => total + pot.amount, 0);
}

/**
 * Gets the main pot (first pot, no cap)
 */
export function getMainPot(pots: Pot[]): Pot | null {
  return pots.length > 0 ? pots[0] : null;
}

/**
 * Gets all side pots (pots after the main pot)
 */
export function getSidePots(pots: Pot[]): Pot[] {
  return pots.slice(1);
}

/**
 * Validates that pot calculations are correct
 */
export function validatePots(pots: Pot[], players: Player[]): boolean {
  // Check that total pot amount equals total contributions
  const totalPotAmount = getTotalPotAmount(pots);
  const totalContributions = players.reduce((sum, p) => sum + p.totalCommitted, 0);
  
  if (totalPotAmount !== totalContributions) {
    return false;
  }
  
  // Check that each pot has valid eligible players
  for (const pot of pots) {
    if (pot.amount < 0) return false;
    if (pot.eligiblePlayerIds.length === 0 && pot.amount > 0) return false;
  }
  
  return true;
}
