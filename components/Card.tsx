import clsx from 'clsx';

interface CardProps {
  card: string;
  size?: 'sm' | 'md' | 'lg';
}

export function Card({ card, size = 'md' }: CardProps) {
  if (!card || card === 'XX') {
    return (
      <div
        className={clsx(
          'bg-blue-900 border-2 border-blue-700 rounded-lg flex items-center justify-center',
          {
            'w-10 h-14 text-xs': size === 'sm',
            'w-14 h-20 text-sm': size === 'md',
            'w-16 h-24 text-base': size === 'lg',
          }
        )}
      >
        <div className="text-blue-600 font-bold">?</div>
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
        'bg-white rounded-lg flex flex-col items-center justify-center font-bold shadow-lg',
        {
          'w-10 h-14 text-xs': size === 'sm',
          'w-14 h-20 text-base': size === 'md',
          'w-16 h-24 text-lg': size === 'lg',
          'text-red-600': isRed,
          'text-black': !isRed,
        }
      )}
    >
      <div>{rank}</div>
      <div className="text-xl">{suitSymbol}</div>
    </div>
  );
}
