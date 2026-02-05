"use client";
import { useEffect, useRef, useState } from 'react';
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
  ownerName?: string;
  blindsLabel?: string;
  maxSeats?: number;
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
  ownerName,
  blindsLabel,
  maxSeats,
  onSeatClick,
  onShareLink,
  onJoinLiveGame 
}: PokerTableProps) {
  const [hoveredSeat, setHoveredSeat] = useState<number | null>(null);
  const tableAreaRef = useRef<HTMLDivElement | null>(null);
  const [bounds, setBounds] = useState({ width: 0, height: 0 });
  const sortedPlayers = [...players].sort((a, b) => a.seat - b.seat);
  const displayOwner = ownerName ?? '—';
  const displayBlinds = blindsLabel ?? 'NLH';
  const currentPlayerInfo = currentPlayer !== undefined
    ? sortedPlayers.find(p => p.seat === currentPlayer)
    : undefined;
  const statusLabel = gameState === 'playing' ? 'IN HAND' : gameState === 'finished' ? 'FINISHED' : 'WAITING';

  useEffect(() => {
    const el = tableAreaRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const update = () => {
      const rect = el.getBoundingClientRect();
      setBounds({ width: rect.width, height: rect.height });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const maxSeatCount = Math.max(2, maxSeats ?? 10);
  const allSeats = Array.from({ length: maxSeatCount }, (_, i) => i + 1);
  const radius = Math.max(180, Math.min(bounds.width, bounds.height) * 0.38);
  const seatSize = Math.max(72, Math.min(bounds.width, bounds.height) * 0.13);
  
  // Get player at specific seat
  const getPlayerAtSeat = (seat: number) => players.find(p => p.seat === seat);

  // Calculate seat position around the oval table
  const getSeatPosition = (seat: number) => {
    const angle = ((seat - 1) * (360 / maxSeatCount)) - 90;
    const x = Math.cos((angle * Math.PI) / 180) * radius;
    const y = Math.sin((angle * Math.PI) / 180) * (radius * 0.85);
    return { x, y };
  };

  return (
    <div className="relative w-full min-h-screen bg-gray-900 flex flex-col felt-gradient">
      {/* Top Bar */}
      <div className="flex justify-between items-center p-4 bg-black/40 border-b border-white/10 backdrop-blur">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-white tracking-wide">POKER TABLE</h1>
          <button className="px-3 py-2 bg-white/10 text-white rounded hover:bg-white/20">
            Guest
          </button>
          <button className="px-3 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-500">
            Sign In
          </button>
        </div>
        <div className="flex items-center gap-4 text-white text-sm md:text-base">
          <span>OWNER: {displayOwner}</span>
          <span>{displayBlinds}</span>
          <button className="p-2 hover:bg-gray-700 rounded">
            🔊
          </button>
        </div>
      </div>

      <div className="flex flex-1">
        {/* Left Sidebar */}
        <div className="hidden md:flex w-16 bg-black/30 border-r border-white/10 flex-col items-center py-4 space-y-4">
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
        <div className="flex-1 flex items-center justify-center relative px-4 py-6">
          {/* Poker Table */}
          <div ref={tableAreaRef} className="relative w-[min(1200px,95vw)] aspect-[16/9]">
            {/* Table Surface */}
            <div className="absolute inset-[12%] poker-table-surface rounded-[999px] border-4 border-emerald-900/60 shadow-2xl relative overflow-hidden">
              {/* Table felt texture */}
              <div className="absolute inset-0 bg-gradient-radial from-emerald-500/40 to-emerald-900/80 opacity-90"></div>
              
              {/* Community Cards */}
              {board.length > 0 && (
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-[70%] flex space-x-2">
                  {board.map((card, index) => (
                    <Card key={index} card={card} size="sm" />
                  ))}
                </div>
              )}

              {/* Pot Display */}
              {pot > 0 && (
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 translate-y-2">
                  <div className="bg-amber-500 text-black px-4 py-2 rounded-full font-bold text-lg shadow-lg border-2 border-amber-600">
                    ${pot.toLocaleString()}
                  </div>
                </div>
              )}

              {/* Game State Overlay */}
              {gameState === 'waiting' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 text-white">
                  <div className="text-center">
                    <div className="text-2xl mb-4">⏰ Waiting for others</div>
                    <div className="text-lg mb-6">No Limit Texas Hold&apos;em</div>
                    <div className="space-y-4">
                      <div>
                        <div className="mb-2">Share this link with your friends!</div>
                        <button
                          onClick={onShareLink}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded"
                        >
                          COPY LINK
                        </button>
                      </div>
                      <div className="text-sm">OR</div>
                      <button 
                        onClick={onJoinLiveGame}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded"
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
                  seat={seat}
                  player={
                    player
                      ? {
                          seat,
                          nickname: player.nickname,
                          stack: player.stack,
                          is_connected: player.is_connected ?? false,
                          cards: player.cards,
                          is_dealer: player.is_dealer,
                          is_small_blind: player.is_small_blind,
                          is_big_blind: player.is_big_blind,
                          current_bet: player.current_bet,
                          is_all_in: player.is_all_in,
                          is_folded: player.is_folded,
                          is_current_player: currentPlayer === seat,
                        }
                      : undefined
                  }
                  position={position}
                  isHovered={isHovered}
                  size={seatSize}
                  onClick={() => onSeatClick(seat)}
                  onHoverChange={(hovered) => setHoveredSeat(hovered ? seat : null)}
                />
              );
            })}
          </div>
          
          {/* Player Info Box (bottom right of table) */}
          <div className="absolute bottom-4 right-4 bg-black/50 border border-white/10 rounded-lg p-3 min-w-40 backdrop-blur">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-300">{statusLabel}</span>
            </div>
            <div className="text-white font-bold">
              {currentPlayerInfo?.nickname ?? (gameState === 'waiting' ? 'Waiting for players' : 'No active player')}
            </div>
            {currentPlayerInfo ? (
              <>
                <div className="text-gray-400 text-sm">{currentPlayerInfo.stack.toLocaleString()}</div>
                <div className="flex space-x-1 mt-1">
                  <span>😉</span>
                  <span>😘</span>
                </div>
              </>
            ) : (
              <div className="text-gray-500 text-sm">—</div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Chat Area */}
      <div className="bg-black/50 border-t border-white/10 p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center space-x-4">
            <button className="px-4 py-2 bg-white/10 text-white rounded hover:bg-white/20">
              LOG/LEDGER
            </button>
            <span className="text-white">
              Create a Free <span className="text-blue-400">Poker Club</span>
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="bg-white/10 rounded-lg px-4 py-2 flex items-center space-x-2">
              <span className="text-gray-400 text-sm">
                It&apos;s a bit quiet here. Click on the balloon and send a Message!
              </span>
              <button className="p-1 hover:bg-gray-600 rounded">💬</button>
              <button className="p-1 hover:bg-gray-600 rounded">🎤</button>
              <button className="p-1 hover:bg-gray-600 rounded">📹</button>
              <button className="px-3 py-1 bg-emerald-600 text-white rounded hover:bg-emerald-500">
                JOIN
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
