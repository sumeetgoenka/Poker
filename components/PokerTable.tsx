"use client";
import { useState } from 'react';
import { Card } from './Card';
import { Player } from './Player';

interface Player {
  seat: number;
  nickname: string;
  stack: number;
  is_connected: boolean;
  cards?: string[];
  is_dealer?: boolean;
  is_small_blind?: boolean;
  is_big_blind?: boolean;
  current_bet?: number;
  is_all_in?: boolean;
  is_folded?: boolean;
}

interface PokerTableProps {
  players: Player[];
  pot: number;
  board: string[];
  currentPlayer?: number;
  gameState: 'waiting' | 'playing' | 'finished';
  onSeatClick: (seat: number) => void;
  onShareLink: () => void;
  onJoinLiveGame: () => void;
}

export function PokerTable({ 
  players, 
  pot, 
  board, 
  currentPlayer, 
  gameState,
  onSeatClick,
  onShareLink,
  onJoinLiveGame 
}: PokerTableProps) {
  const [hoveredSeat, setHoveredSeat] = useState<number | null>(null);

  // Create array of all possible seats (0-9)
  const allSeats = Array.from({ length: 10 }, (_, i) => i);
  
  // Get player at specific seat
  const getPlayerAtSeat = (seat: number) => players.find(p => p.seat === seat);

  // Calculate seat position around the oval table
  const getSeatPosition = (seat: number) => {
    const angle = (seat * 36) - 90; // 36 degrees per seat, start at top
    const radius = 220; // Distance from center - increased for better spacing
    const x = Math.cos((angle * Math.PI) / 180) * radius;
    const y = Math.sin((angle * Math.PI) / 180) * radius;
    return { x, y };
  };

  return (
    <div className="relative w-full h-screen bg-gray-900 flex flex-col">
      {/* Top Bar */}
      <div className="flex justify-between items-center p-4 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold text-white">POKER NOW</h1>
          <button className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600">
            Guest
          </button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            Sign In
          </button>
        </div>
        <div className="flex items-center space-x-4 text-white">
          <span>OWNER: HEHEEHEH</span>
          <span>NLH ~ 10/20</span>
          <button className="p-2 hover:bg-gray-700 rounded">
            🔊
          </button>
        </div>
      </div>

      <div className="flex flex-1">
        {/* Left Sidebar */}
        <div className="w-16 bg-gray-800 border-r border-gray-700 flex flex-col items-center py-4 space-y-4">
          <button className="p-3 hover:bg-gray-700 rounded" title="Options">
            ☰
          </button>
          <button className="p-3 hover:bg-gray-700 rounded" title="Leave Seat">
            ↶
          </button>
          <button className="p-3 hover:bg-gray-700 rounded" title="Away">
            👤
          </button>
        </div>

        {/* Main Table Area */}
        <div className="flex-1 flex items-center justify-center relative">
          {/* Poker Table */}
          <div className="relative">
            {/* Table Surface */}
            <div className="w-96 h-64 poker-table-surface rounded-full border-4 border-green-900 shadow-2xl relative overflow-hidden">
              {/* Table felt texture */}
              <div className="absolute inset-0 bg-gradient-radial from-green-600 to-green-900 opacity-80"></div>
              
              {/* Community Cards */}
              {board.length > 0 && (
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex space-x-2">
                  {board.map((card, index) => (
                    <Card key={index} card={card} size="sm" />
                  ))}
                </div>
              )}

              {/* Pot Display */}
              {pot > 0 && (
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 translate-y-8">
                  <div className="bg-yellow-500 text-black px-4 py-2 rounded-full font-bold text-lg shadow-lg border-2 border-yellow-600">
                    ${pot.toLocaleString()}
                  </div>
                </div>
              )}

              {/* Game State Overlay */}
              {gameState === 'waiting' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-50 text-white">
                  <div className="text-center">
                    <div className="text-2xl mb-4">⏰ Waiting for others</div>
                    <div className="text-lg mb-6">No Limit Texas Hold&apos;em</div>
                    <div className="space-y-4">
                      <div>
                        <div className="mb-2">Share this link with your friends!</div>
                        <button 
                          onClick={onShareLink}
                          className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded"
                        >
                          COPY LINK
                        </button>
                      </div>
                      <div className="text-sm">OR</div>
                      <button 
                        onClick={onJoinLiveGame}
                        className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded"
                      >
                        JOIN A LIVE GAME
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Seating Positions */}
            {allSeats.map((seat) => {
              const player = getPlayerAtSeat(seat);
              const position = getSeatPosition(seat);
              const isHovered = hoveredSeat === seat;
              
              return (
                <Player
                  key={seat}
                  player={{
                    seat,
                    nickname: player?.nickname ?? '',
                    stack: player?.stack ?? 0,
                    is_connected: player?.is_connected ?? false,
                    cards: player?.cards,
                    is_dealer: player?.is_dealer,
                    is_small_blind: player?.is_small_blind,
                    is_big_blind: player?.is_big_blind,
                    current_bet: player?.current_bet,
                    is_all_in: player?.is_all_in,
                    is_folded: player?.is_folded,
                    is_current_player: currentPlayer === seat,
                  }}
                  position={position}
                  isHovered={isHovered}
                  onClick={() => onSeatClick(seat)}
                />
              );
            })}
          </div>
          
          {/* Player Info Box (bottom right of table) */}
          <div className="absolute bottom-4 right-4 bg-gray-800 border border-gray-600 rounded-lg p-3 min-w-32">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-300">WAITING</span>
            </div>
            <div className="text-white font-bold">heheeheh</div>
            <div className="text-gray-400 text-sm">1782</div>
            <div className="flex space-x-1 mt-1">
              <span>😉</span>
              <span>😘</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Chat Area */}
      <div className="bg-gray-800 border-t border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600">
              LOG/LEDGER
            </button>
            <span className="text-white">
              Create a Free <span className="text-blue-400">Poker Club</span>
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="bg-gray-700 rounded-lg px-4 py-2 flex items-center space-x-2">
              <span className="text-gray-400 text-sm">
                It&apos;s a bit quiet here. Click on the balloon and send a Message!
              </span>
              <button className="p-1 hover:bg-gray-600 rounded">💬</button>
              <button className="p-1 hover:bg-gray-600 rounded">🎤</button>
              <button className="p-1 hover:bg-gray-600 rounded">📹</button>
              <button className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700">
                JOIN
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
