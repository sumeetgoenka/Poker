"use client";
import { Card } from './Card';

interface PlayerProps {
  seat: number;
  player?: {
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
  size?: number;
  onClick: () => void;
  onHoverChange?: (hovered: boolean) => void;
}

export function Player({ seat, player, position, isHovered, size, onClick, onHoverChange }: PlayerProps) {
  const isOccupied = !!player;
  const seatWidth = size ?? 88;
  const seatHeight = Math.round((size ?? 88) * 0.78);
  
  return (
    <div
      className={`absolute border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer transition-all duration-200 player-card ${
        isOccupied 
          ? 'occupied border-gray-500' 
          : isHovered 
            ? 'seat-hover' 
            : 'hover:bg-gray-700 border-gray-500'
      }`}
      data-current={player?.is_current_player ? 'true' : 'false'}
      style={{
        left: `calc(50% + ${position.x}px - ${Math.round(seatWidth / 2)}px)`,
        top: `calc(50% + ${position.y}px - ${Math.round(seatHeight / 2)}px)`,
        width: seatWidth,
        height: seatHeight,
        boxShadow: player?.is_current_player ? '0 0 20px rgba(16,185,129,0.6)' : undefined,
        borderColor: player?.is_current_player ? 'rgba(16,185,129,0.9)' : undefined,
      }}
      onClick={onClick}
      onMouseEnter={() => onHoverChange?.(true)}
      onMouseLeave={() => onHoverChange?.(false)}
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
            {player?.nickname || `Seat ${seat}`}
          </div>
          
          {/* Stack */}
          <div className="text-xs stack-amount">
            ${player?.stack?.toLocaleString() ?? '0'}
          </div>
          
          {/* Current Bet */}
          {player?.current_bet && player.current_bet > 0 && (
            <div className="text-xs text-yellow-400 font-bold">
              ${player.current_bet}
            </div>
          )}
          
          {/* Status */}
          <div className="text-xs">
            {player?.is_folded && <span className="text-red-400">FOLDED</span>}
            {player?.is_all_in && <span className="text-orange-400">ALL IN</span>}
            {player?.is_connected === false && <span className="text-gray-400">OFFLINE</span>}
          </div>
          
          {/* Player Cards */}
          {player?.cards && player.cards.length > 0 && (
            <div className="flex space-x-1 mt-1">
              {player.cards.map((card, index) => (
                <Card key={index} card={card} size="sm" />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="seat-number text-sm">
          <div>Seat {seat}</div>
          <div className="text-[10px] text-gray-400 mt-1">Click to sit</div>
        </div>
      )}
    </div>
  );
}
