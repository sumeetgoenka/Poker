"use client";
import { Card } from './Card';

interface PlayerProps {
  player: {
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
    is_current_player?: boolean;
  };
  position: { x: number; y: number };
  isHovered: boolean;
  onClick: () => void;
}

export function Player({ player, position, isHovered, onClick }: PlayerProps) {
  const isOccupied = !!player;
  
  return (
    <div
      className={`absolute w-20 h-16 border-2 border-dashed border-gray-400 rounded-lg flex flex-col items-center justify-center cursor-pointer transition-all duration-200 player-card ${
        isOccupied 
          ? 'occupied' 
          : isHovered 
            ? 'seat-hover' 
            : 'hover:bg-gray-700'
      }`}
      style={{
        left: `calc(50% + ${position.x}px - 40px)`,
        top: `calc(50% + ${position.y}px - 32px)`,
      }}
      onClick={onClick}
    >
      {isOccupied ? (
        <div className="text-center text-white w-full">
          {/* Player Status Indicators */}
          <div className="flex justify-center space-x-1 mb-1">
            {player.is_dealer && (
              <div className="w-2 h-2 bg-yellow-400 rounded-full" title="Dealer"></div>
            )}
            {player.is_small_blind && (
              <div className="w-2 h-2 bg-blue-400 rounded-full" title="Small Blind"></div>
            )}
            {player.is_big_blind && (
              <div className="w-2 h-2 bg-red-400 rounded-full" title="Big Blind"></div>
            )}
            {player.is_current_player && (
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" title="Current Player"></div>
            )}
          </div>
          
          {/* Player Name */}
          <div className="text-xs player-name truncate max-w-full px-1">
            {player.nickname}
          </div>
          
          {/* Stack */}
          <div className="text-xs stack-amount">
            ${player.stack.toLocaleString()}
          </div>
          
          {/* Current Bet */}
          {player.current_bet && player.current_bet > 0 && (
            <div className="text-xs text-yellow-400 font-bold">
              ${player.current_bet}
            </div>
          )}
          
          {/* Status */}
          <div className="text-xs">
            {player.is_folded && <span className="text-red-400">FOLDED</span>}
            {player.is_all_in && <span className="text-orange-400">ALL IN</span>}
            {!player.is_connected && <span className="text-gray-400">OFFLINE</span>}
          </div>
          
          {/* Player Cards */}
          {player.cards && player.cards.length > 0 && (
            <div className="flex space-x-1 mt-1">
              {player.cards.map((card, index) => (
                <Card key={index} card={card} size="sm" />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="seat-number text-lg">{player.seat}</div>
      )}
    </div>
  );
}
