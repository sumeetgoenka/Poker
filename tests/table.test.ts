import { describe, it, expect, beforeEach } from 'vitest';
import { Table } from '../engine/table';
import { TableConfig, PlayerActionType } from '../engine/types';

describe('Table', () => {
  let table: Table;
  let config: TableConfig;

  beforeEach(() => {
    config = {
      sbSize: 10,
      bbSize: 20,
      maxPlayers: 6,
      actTimeoutMs: 30000
    };
    table = new Table(config);
  });

  describe('Constructor', () => {
    it('should initialize with correct default state', () => {
      const state = table.getState();
      expect(state.state).toBe('TABLE_INIT');
      expect(state.players).toEqual([]);
      expect(state.dealerIndex).toBe(0);
      expect(state.sbSize).toBe(10);
      expect(state.bbSize).toBe(20);
    });
  });

  describe('seatPlayer', () => {
    it('should seat a player successfully', () => {
      table.seatPlayer('player1', 'Player 1', 1000, 0);
      const state = table.getState();
      
      expect(state.players).toHaveLength(1);
      expect(state.players[0].id).toBe('player1');
      expect(state.players[0].name).toBe('Player 1');
      expect(state.players[0].stack).toBe(1000);
      expect(state.players[0].seat).toBe(0);
    });

    it('should throw error for invalid seat', () => {
      expect(() => {
        table.seatPlayer('player1', 'Player 1', 1000, -1);
      }).toThrow('Invalid seat number');
      
      expect(() => {
        table.seatPlayer('player1', 'Player 1', 1000, 10);
      }).toThrow('Invalid seat number');
    });

    it('should throw error for occupied seat', () => {
      table.seatPlayer('player1', 'Player 1', 1000, 0);
      
      expect(() => {
        table.seatPlayer('player2', 'Player 2', 1000, 0);
      }).toThrow('Seat 0 is already occupied');
    });

    it('should throw error for duplicate player ID', () => {
      table.seatPlayer('player1', 'Player 1', 1000, 0);
      
      expect(() => {
        table.seatPlayer('player1', 'Player 2', 1000, 1);
      }).toThrow('Player player1 is already seated');
    });
  });

  describe('startHand', () => {
    it('should throw error with insufficient players', () => {
      expect(() => {
        table.startHand();
      }).toThrow('Need at least 2 players to start a hand');
    });

    it('should start hand with 2+ players', () => {
      table.seatPlayer('player1', 'Player 1', 1000, 0);
      table.seatPlayer('player2', 'Player 2', 1000, 1);
      
      table.startHand();
      const state = table.getState();
      
      expect(state.state).toBe('PRE_FLOP');
      expect(state.players).toHaveLength(2);
    });
  });

  describe('getLegalActions', () => {
    beforeEach(() => {
      table.seatPlayer('player1', 'Player 1', 1000, 0);
      table.seatPlayer('player2', 'Player 2', 1000, 1);
      table.startHand();
    });

    it('should return legal actions for player in hand', () => {
      const actions = table.getLegalActions('player1');
      
      expect(actions.canFold).toBe(true);
      expect(actions.canCheck).toBe(true);
      expect(actions.callAmount).toBe(0);
      expect(actions.canAllIn).toBe(true);
    });

    it('should throw error for player not in hand', () => {
      table.seatPlayer('player3', 'Player 3', 1000, 2);
      
      expect(() => {
        table.getLegalActions('player3');
      }).toThrow('Player player3 is not in the current hand');
    });
  });

  describe('act', () => {
    beforeEach(() => {
      table.seatPlayer('player1', 'Player 1', 1000, 0);
      table.seatPlayer('player2', 'Player 2', 1000, 1);
      table.startHand();
    });

    it('should execute valid action', () => {
      expect(() => {
        table.act('player2', { type: PlayerActionType.CHECK });
      }).not.toThrow();
    });

    it('should throw error for invalid action', () => {
      // Try to check when there's a bet (this should fail)
      table.act('player2', { type: PlayerActionType.BET, amount: 100 });
      
      expect(() => {
        table.act('player1', { type: PlayerActionType.CHECK });
      }).toThrow('Cannot check when there is an outstanding bet');
    });

    it('should throw error for wrong player turn', () => {
      expect(() => {
        table.act('player1', { type: PlayerActionType.CHECK });
      }).toThrow("It's not player player1's turn to act");
    });
  });

  describe('onTimeout', () => {
    beforeEach(() => {
      table.seatPlayer('player1', 'Player 1', 1000, 0);
      table.seatPlayer('player2', 'Player 2', 1000, 1);
      table.startHand();
    });

    it('should auto-fold when facing a bet', () => {
      table.act('player2', { type: PlayerActionType.BET, amount: 100 });
      
      // Player 2 should auto-fold when timed out
      table.onTimeout('player1');
      
      const state = table.getState();
      const player1 = state.players.find(p => p.id === 'player1');
      expect(player1?.inHand).toBe(false);
    });

    it('should auto-check when no bet to call', () => {
      // Move to flop with matched bets so there's no bet to call
      table.act('player2', { type: PlayerActionType.CALL });
      // Player 2 should auto-check when timed out (no bet to call)
      table.onTimeout('player2');
      
      const state = table.getState();
      expect(state.players[1].inHand).toBe(true);
    });
  });

  describe('Event Callbacks', () => {
    it('should register and call state change callback', () => {
      let eventReceived = false;
      table.onStateChange((event) => {
        if (event.type === 'STATE_CHANGE') {
          eventReceived = true;
        }
      });
      
      table.seatPlayer('player1', 'Player 1', 1000, 0);
      table.seatPlayer('player2', 'Player 2', 1000, 1);
      table.startHand();
      
      expect(eventReceived).toBe(true);
    });
  });
});
