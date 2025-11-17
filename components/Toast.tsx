'use client';

import { useEffect, useState } from 'react';
import clsx from 'clsx';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'info' | 'error' | 'success' | 'warning';
}

interface ToastProps {
  toast: ToastMessage;
  onDismiss: (id: string) => void;
}

const toastIcons = {
  info: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  success: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  error: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  warning: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
};

export function Toast({ toast, onDismiss }: ToastProps) {
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLeaving(true);
      setTimeout(() => onDismiss(toast.id), 300);
    }, 5000);

    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  return (
    <div
      className={clsx(
        'px-4 py-3 rounded-xl shadow-2xl transition-all duration-300 max-w-sm backdrop-blur-sm',
        'border-2',
        {
          'bg-blue-600/90 border-blue-400 text-white': toast.type === 'info',
          'bg-red-600/90 border-red-400 text-white': toast.type === 'error',
          'bg-green-600/90 border-green-400 text-white': toast.type === 'success',
          'bg-yellow-600/90 border-yellow-400 text-white': toast.type === 'warning',
          'toast-exit': isLeaving,
          'toast-enter': !isLeaving,
        }
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {toastIcons[toast.type]}
        </div>
        <p className="text-sm font-medium flex-1">{toast.message}</p>
        <button
          onClick={() => {
            setIsLeaving(true);
            setTimeout(() => onDismiss(toast.id), 300);
          }}
          className="flex-shrink-0 text-white/80 hover:text-white text-xl leading-none transition-colors"
          aria-label="Dismiss"
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
