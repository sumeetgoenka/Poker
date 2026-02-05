# Poker Engine

A production-grade, framework-agnostic No-Limit Texas Hold'em poker engine written in TypeScript.

## Features

- ✅ **Complete Poker Rules**: Implements all standard No-Limit Texas Hold'em rules
- ✅ **Proper Betting Logic**: Fixes the "check when bet exists" bug
- ✅ **Side Pot Support**: Handles all-in scenarios with multiple side pots
- ✅ **Hand Evaluation**: 5/7-card hand ranking with tie-breaking
- ✅ **State Machine**: Deterministic game flow from TABLE_INIT to SHOWDOWN
- ✅ **Type Safety**: Fully typed with comprehensive interfaces
- ✅ **Test Coverage**: Extensive test suite covering edge cases
- ✅ **Framework Agnostic**: Pure TypeScript with no external dependencies

## Quick Start

```typescript
import { Table } from './engine/table';
import { PlayerActionType } from './engine/types';

// Create a table
const table = new Table({
  sbSize: 10,
  bbSize: 20,
  maxPlayers: 6,
  actTimeoutMs: 30000
});

// Seat players
table.seatPlayer('player1', 'Alice', 1000, 0);
table.seatPlayer('player2', 'Bob', 1000, 1);

// Start a hand
table.startHand();

// Get legal actions for a player
const actions = table.getLegalActions('player1');
console.log(actions); // { canFold: true, canCheck: true, callAmount: 0, ... }

// Execute an action
table.act('player1', { type: PlayerActionType.CHECK });

// Handle timeouts
table.onTimeout('player2'); // Auto-folds or auto-checks
```

## Architecture

### Core Modules

- **`types.ts`** - TypeScript interfaces and enums
- **`cards.ts`** - Deck management and card operations
- **`handEval.ts`** - Hand evaluation and ranking
- **`sidePots.ts`** - Side pot calculation and distribution
- **`betting.ts`** - Betting logic and validation
- **`stateMachine.ts`** - Game state transitions
- **`utils.ts`** - Utility functions
- **`table.ts`** - Main Table class with public API

### Key Features

#### 1. Proper Betting Logic
```typescript
// ❌ BUG: This was allowing check when bet exists
if (player.committedThisStreet === betCtx.highestBet) {
  actions.canCheck = true;
}

// ✅ FIXED: Now correctly validates
const actions = getLegalActions(player, betCtx, players);
// canCheck is only true when no outstanding bet
```

#### 2. Side Pot Support
```typescript
// Handles complex all-in scenarios
const pots = buildPots(players);
// Creates multiple pots with different caps
// Distributes winnings correctly
```

#### 3. Hand Evaluation
```typescript
// Evaluates best 5-card hand from 7 cards
const handRank = evaluateHand(holeCards, board);
// Returns rank (1-9) and kickers for comparison
```

## Testing

```bash
# Run tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

## API Reference

### Table Class

#### Constructor
```typescript
new Table(config: TableConfig)
```

#### Methods
- `seatPlayer(playerId: string, name: string, stack: ChipAmount, seat: number): void`
- `startHand(): void`
- `getState(): TableState`
- `getLegalActions(playerId: string): LegalActions`
- `act(playerId: string, action: PlayerAction): void`
- `onTimeout(playerId: string): void`

#### Event Callbacks
- `onStateChange(callback: (event: GameEvent) => void): void`
- `onStreetEnd(callback: (event: GameEvent) => void): void`
- `onShowdown(callback: (event: GameEvent) => void): void`
- `onPayout(callback: (event: GameEvent) => void): void`

### Types

```typescript
interface LegalActions {
  canFold: boolean;
  canCheck: boolean;
  callAmount: ChipAmount;
  minRaiseTo: ChipAmount;
  canAllIn: boolean;
  maxBet: ChipAmount;
}

interface PlayerAction {
  type: PlayerActionType;
  amount?: ChipAmount;
}
```

## Rules Implemented

1. **Blinds**: Rotate dealer, post SB/BB (heads-up: button posts SB)
2. **Turn Order**: Preflop starts left of BB, postflop starts left of button
3. **Betting**: Track committedThisStreet, validate min-raises, handle all-ins
4. **Side Pots**: Build on-demand when all-ins occur
5. **Showdown**: Last aggressor shows first, evaluate hands, distribute pots
6. **Win by Fold**: Award total pot to last remaining player
7. **Timeouts**: Auto-fold when facing bet, auto-check when no bet

## Edge Cases Covered

- Multiway all-ins with correct side pot distribution
- Min-raise reopening vs not reopening action
- Heads-up blind and turn order correctness
- Win-by-fold at each street
- Exact split pots and odd chip handling
- Insufficient chips for bets/raises
- Invalid actions and turn order violations

## License

MIT License - see LICENSE file for details.