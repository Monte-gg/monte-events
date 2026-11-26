import React from 'react';
import { CheckCircle2, Info, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { SPRING_SNAPPY } from './MotionPrimitives';

export interface ToastData {
  id: string;
  message: string;
  type?: 'success' | 'info';
}

interface ToastContainerProps {
  toasts: ToastData[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({
  toasts,
  onDismiss,
}) => {
  return (
    <div className="fixed bottom-20 md:bottom-6 right-4 z-[100] flex flex-col gap-2 max-w-sm w-[calc(100%-2rem)] pointer-events-none">
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: 24, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.95 }}
            transition={SPRING_SNAPPY}
            className="pointer-events-auto relative overflow-hidden rounded-2xl border border-[#2B7FFF]/35 bg-[#0A1E5C] dark:bg-[#13224A] px-4 py-3 text-white shadow-xl"
          >
            <div className="flex items-center justify-between gap-3">
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
                className="rounded-lg p-1 text-white/60 hover:bg-white/10 hover:text-white transition"
                aria-label="Dismiss notification"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Shrinking auto-dismiss progress bar */}
            <motion.div
              initial={{ scaleX: 1 }}
              animate={{ scaleX: 0 }}
              transition={{ duration: 3.2, ease: 'linear' }}
              style={{ transformOrigin: 'left center' }}
              className={`absolute bottom-0 left-0 right-0 h-1 ${
                t.type === 'info' ? 'bg-[#2B7FFF]' : 'bg-emerald-400'
              }`}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
