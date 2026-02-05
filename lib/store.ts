import { create } from 'zustand';
import { GameState, HandState, Player, TableConfig } from './types';

interface GameStore extends GameState {
  setTable: (table: TableConfig) => void;
  setHand: (hand: HandState | null) => void;
  setPlayers: (players: Player[]) => void;
  setMyHoleCards: (cards: string[] | null) => void;
  setMySeat: (seat: number | null) => void;
  updatePlayer: (seat: number, updates: Partial<Player>) => void;
  applyStateDiff: (diff: any) => void;
  reset: () => void;
}

const initialState: GameState = {
  table: null,
  hand: null,
  players: [],
  myHoleCards: null,
  mySeat: null,
};

export const useGameStore = create<GameStore>((set) => ({
  ...initialState,

  setTable: (table) => set({ table }),
  setHand: (hand) => set({ hand }),
  setPlayers: (players) => set({ players }),
  setMyHoleCards: (cards) => set({ myHoleCards: cards }),
  setMySeat: (seat) => set({ mySeat: seat }),

  updatePlayer: (seat, updates) =>
    set((state) => ({
      players: state.players.map((p) =>
        p.seat === seat ? { ...p, ...updates } : p
      ),
    })),

  applyStateDiff: (diff) =>
    set((state) => {
      const newState = { ...state };

      if (diff.hand !== undefined) {
        if (diff.hand === null) {
          newState.hand = null;
        } else {
          newState.hand = { ...(state.hand ?? {}), ...diff.hand } as HandState;
        }
      }

      if (diff.players !== undefined) {
        newState.players = diff.players;
      }

      if (diff.table !== undefined) {
        newState.table = diff.table;
      }

      if (diff.pot !== undefined && newState.hand) {
        newState.hand.pot = diff.pot;
      }

      if (diff.board !== undefined && newState.hand) {
        newState.hand.board = diff.board;
      }

      if (diff.action_log !== undefined && newState.hand) {
        newState.hand.action_log = diff.action_log;
      }

      return newState;
    }),

  reset: () => set(initialState),
}));
