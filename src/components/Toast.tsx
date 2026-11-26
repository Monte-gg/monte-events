import React from 'react';
import { CheckCircle2, Info, X } from 'lucide-react';

export interface ToastData {
  id: string;
  message: string;
  type?: 'success' | 'info';
}

interface ToastContainerProps {
  toasts: ToastData[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-20 md:bottom-6 right-4 z-[100] flex flex-col gap-2 max-w-sm w-[calc(100%-2rem)]">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="animate-slide-up flex items-center justify-between gap-3 rounded-2xl border border-[#2B7FFF]/30 bg-[#0A1E5C] dark:bg-[#13224A] px-4 py-3 text-white shadow-xl"
        >
          <div className="flex items-center gap-2.5 text-sm font-medium">
            {t.type === 'info' ? (
              <Info className="h-4 w-4 text-[#2B7FFF] shrink-0" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            )}
            <span>{t.message}</span>
          </div>
          <button
            type="button"
            onClick={() => onDismiss(t.id)}
            className="rounded-lg p-1 text-white/60 hover:bg-white/10 hover:text-white"
            aria-label="Dismiss notification"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
