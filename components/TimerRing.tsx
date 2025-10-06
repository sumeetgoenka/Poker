'use client';

import { useEffect, useState } from 'react';

interface TimerRingProps {
  deadline: string | null;
  maxDuration?: number;
}

export function TimerRing({ deadline, maxDuration = 20 }: TimerRingProps) {
  const [remaining, setRemaining] = useState<number>(0);

  useEffect(() => {
    if (!deadline) {
      setRemaining(0);
      return;
    }

    const updateTimer = () => {
      const now = Date.now();
      const deadlineTime = new Date(deadline).getTime();
      const diff = Math.max(0, deadlineTime - now);
      setRemaining(Math.ceil(diff / 1000));
    };

    updateTimer();
    const interval = setInterval(updateTimer, 100);

    return () => clearInterval(interval);
  }, [deadline]);

  if (!deadline || remaining === 0) {
    return null;
  }

  const percentage = Math.min(100, (remaining / maxDuration) * 100);
  const circumference = 2 * Math.PI * 18;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg className="transform -rotate-90 w-12 h-12">
        <circle
          cx="24"
          cy="24"
          r="18"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="3"
          fill="none"
        />
        <circle
          cx="24"
          cy="24"
          r="18"
          stroke={remaining <= 5 ? '#ef4444' : '#10b981'}
          strokeWidth="3"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-100"
        />
      </svg>
      <div className="absolute text-sm font-bold">
        {remaining}
      </div>
    </div>
  );
}
