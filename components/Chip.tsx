'use client';

import clsx from 'clsx';
import { formatChips } from '@/lib/utils';

interface ChipProps {
  value: number;
  color?: 'red' | 'blue' | 'green' | 'black' | 'purple' | 'orange';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const chipColors = {
  red: 'from-red-600 to-red-700 border-red-400',
  blue: 'from-blue-600 to-blue-700 border-blue-400',
  green: 'from-green-600 to-green-700 border-green-400',
  black: 'from-gray-800 to-gray-900 border-gray-600',
  purple: 'from-purple-600 to-purple-700 border-purple-400',
  orange: 'from-orange-600 to-orange-700 border-orange-400',
};

export function Chip({ value, color = 'red', size = 'md', className }: ChipProps) {
  return (
    <div
      className={clsx(
        'relative rounded-full bg-gradient-to-br shadow-lg',
        'border-4 flex items-center justify-center font-bold',
        'transform transition-all duration-300 hover:scale-110',
        chipColors[color],
        {
          'w-8 h-8 text-xs border-2': size === 'sm',
          'w-12 h-12 text-sm': size === 'md',
          'w-16 h-16 text-base': size === 'lg',
        },
        className
      )}
    >
      {/* Outer ring effect */}
      <div className="absolute inset-1 rounded-full border-2 border-white/30" />

      {/* Inner circle */}
      <div
        className={clsx(
          'rounded-full bg-white/20 flex items-center justify-center',
          {
            'w-5 h-5': size === 'sm',
            'w-7 h-7': size === 'md',
            'w-10 h-10': size === 'lg',
          }
        )}
      >
        <span className="text-white drop-shadow-lg">
          {value >= 1000 ? formatChips(value) : value}
        </span>
      </div>

      {/* Decorative dots */}
      <div className="absolute inset-0">
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
          <div
            key={deg}
            className={clsx('absolute w-1 h-1 bg-white/40 rounded-full', {
              'top-0.5': deg === 0 || deg === 315 || deg === 45,
              'bottom-0.5': deg === 135 || deg === 180 || deg === 225,
              'left-0.5': deg === 225 || deg === 270 || deg === 315,
              'right-0.5': deg === 45 || deg === 90 || deg === 135,
            })}
            style={{
              transform: `rotate(${deg}deg) translateY(-${size === 'sm' ? '14' : size === 'md' ? '20' : '28'}px)`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

export function ChipStack({ chips, className }: { chips: number[]; className?: string }) {
  return (
    <div className={clsx('relative chip-stack', className)}>
      {chips.slice(0, 5).map((value, index) => (
        <div
          key={index}
          className="absolute left-1/2 -translate-x-1/2"
          style={{
            top: `${index * -3}px`,
            zIndex: index,
          }}
        >
          <Chip
            value={value}
            color={
              value >= 500
                ? 'black'
                : value >= 100
                ? 'purple'
                : value >= 50
                ? 'blue'
                : value >= 25
                ? 'green'
                : 'red'
            }
            size="md"
          />
        </div>
      ))}
      {chips.length > 5 && (
        <div
          className="absolute left-1/2 -translate-x-1/2 text-xs text-white/80"
          style={{ top: '-18px', zIndex: 5 }}
        >
          +{chips.length - 5}
        </div>
      )}
    </div>
  );
}

export function BetDisplay({ amount, className }: { amount: number; className?: string }) {
  return (
    <div
      className={clsx(
        'inline-flex items-center gap-2 px-4 py-2 rounded-full',
        'bg-gradient-to-r from-yellow-500/90 to-amber-600/90',
        'backdrop-blur-sm shadow-lg',
        'border-2 border-yellow-400/50',
        'font-bold text-white',
        className
      )}
    >
      <Chip value={amount >= 100 ? 100 : amount >= 25 ? 25 : 5} size="sm" />
      <span className="text-lg">${formatChips(amount)}</span>
    </div>
  );
}
