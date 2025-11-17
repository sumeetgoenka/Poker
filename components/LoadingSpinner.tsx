'use client';

import clsx from 'clsx';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LoadingSpinner({ size = 'md', className }: LoadingSpinnerProps) {
  return (
    <div className={clsx('flex items-center justify-center', className)}>
      <div className="relative">
        <div
          className={clsx(
            'rounded-full border-4 border-white/20 border-t-white',
            'spinner',
            {
              'h-8 w-8': size === 'sm',
              'h-12 w-12': size === 'md',
              'h-16 w-16': size === 'lg',
            }
          )}
        />
      </div>
    </div>
  );
}

export function LoadingOverlay({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="glass rounded-2xl p-8 flex flex-col items-center gap-4">
        <LoadingSpinner size="lg" />
        <p className="text-white text-lg font-medium">{message}</p>
      </div>
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="skeleton rounded-lg w-full h-24 animate-pulse" />
  );
}

export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="skeleton h-4 rounded"
          style={{ width: `${Math.random() * 30 + 70}%` }}
        />
      ))}
    </div>
  );
}
