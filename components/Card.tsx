import clsx from 'clsx';

interface CardProps {
  card: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Card({ card, size = 'md', className }: CardProps) {
  if (!card || card === 'XX') {
    return (
      <div
        className={clsx(
          'bg-gradient-to-br from-blue-900 to-blue-800 border-2 border-blue-700 rounded-lg flex items-center justify-center',
          'shadow-xl transform transition-all duration-300 hover:scale-105',
          'card-3d',
          {
            'w-10 h-14 text-xs': size === 'sm',
            'w-14 h-20 text-sm': size === 'md',
            'w-16 h-24 text-base': size === 'lg',
          },
          className
        )}
      >
        <div className="text-blue-600 font-bold text-2xl">?</div>
      </div>
    );
  }

  const rank = card.slice(0, -1);
  const suit = card.slice(-1);

  const isRed = suit === '♥' || suit === '♦' || suit === 'h' || suit === 'd';
  const suitSymbol = suit === 'h' ? '♥' : suit === 'd' ? '♦' : suit === 'c' ? '♣' : suit === 's' ? '♠' : suit;

  return (
    <div
      className={clsx(
        'bg-white rounded-lg flex flex-col items-center justify-center font-bold',
        'shadow-2xl transform transition-all duration-300 hover:scale-105',
        'card-3d relative',
        'before:content-[""] before:absolute before:inset-0 before:rounded-lg before:bg-gradient-to-br before:from-white/20 before:to-transparent before:pointer-events-none',
        {
          'w-10 h-14 text-xs': size === 'sm',
          'w-14 h-20 text-base': size === 'md',
          'w-16 h-24 text-lg': size === 'lg',
          'text-red-600': isRed,
          'text-black': !isRed,
        },
        className
      )}
    >
      <div className="flex flex-col items-center gap-0.5">
        <div className={clsx('font-bold', {
          'text-base': size === 'sm',
          'text-xl': size === 'md',
          'text-2xl': size === 'lg',
        })}>
          {rank}
        </div>
        <div className={clsx('leading-none', {
          'text-lg': size === 'sm',
          'text-2xl': size === 'md',
          'text-3xl': size === 'lg',
        })}>
          {suitSymbol}
        </div>
      </div>

      {/* Corner indicators */}
      <div className="absolute top-1 left-1 flex flex-col items-center text-xs leading-none">
        <span>{rank}</span>
        <span className="text-base leading-none">{suitSymbol}</span>
      </div>
      <div className="absolute bottom-1 right-1 flex flex-col items-center text-xs leading-none rotate-180">
        <span>{rank}</span>
        <span className="text-base leading-none">{suitSymbol}</span>
      </div>
    </div>
  );
}
