'use client';

import { useEffect, useState } from 'react';
import clsx from 'clsx';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'info' | 'error' | 'success';
}

interface ToastProps {
  toast: ToastMessage;
  onDismiss: (id: string) => void;
}

export function Toast({ toast, onDismiss }: ToastProps) {
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLeaving(true);
      setTimeout(() => onDismiss(toast.id), 300);
    }, 4000);

    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  return (
    <div
      className={clsx(
        'px-4 py-3 rounded-lg shadow-lg transition-all duration-300 max-w-sm',
        {
          'bg-blue-600 text-white': toast.type === 'info',
          'bg-red-600 text-white': toast.type === 'error',
          'bg-green-600 text-white': toast.type === 'success',
          'opacity-0 translate-x-full': isLeaving,
          'opacity-100 translate-x-0': !isLeaving,
        }
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium">{toast.message}</p>
        <button
          onClick={() => {
            setIsLeaving(true);
            setTimeout(() => onDismiss(toast.id), 300);
          }}
          className="text-white/80 hover:text-white text-xl leading-none"
        >
          ×
        </button>
      </div>
    </div>
  );
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
