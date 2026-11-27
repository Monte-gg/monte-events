import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Play,
  Pause,
  X,
  Calendar,
  Download,
  Loader2,
  User,
  Film,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { MediaItem } from '../types';
import { downloadMediaFile } from '../lib/downloadMedia';
import { ThemeToggle } from './ThemeToggle';
import { EASE_SKIPER, SPRING_POP, SPRING_SNAPPY } from './MotionPrimitives';

interface MediaLightboxProps {
  items: MediaItem[];
  currentIndex: number;
  onChangeIndex: (nextIndex: number) => void;
  onClose: () => void;
}

export const MediaLightbox: React.FC<MediaLightboxProps> = ({
  items,
  currentIndex,
  onChangeIndex,
  onClose,
}) => {
  const [playing, setPlaying] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const item =
    currentIndex >= 0 && currentIndex < items.length
      ? items[currentIndex]
      : null;
  const hasNav = items.length > 1 && item !== null;

  const goPrev = () => {
    if (!hasNav) return;
    const prevIdx = (currentIndex - 1 + items.length) % items.length;
    setPlaying(false);
    onChangeIndex(prevIdx);
  };

  const goNext = () => {
    if (!hasNav) return;
    const nextIdx = (currentIndex + 1) % items.length;
    setPlaying(false);
    onChangeIndex(nextIdx);
  };

  useEffect(() => {
    setPlaying(false);
  }, [item?.id]);

  useEffect(() => {
    if (!item) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        goPrev();
      } else if (e.key === 'ArrowRight') {
        goNext();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [item, currentIndex, items.length]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {item && (
        <motion.div
          key="lightbox-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0A1430]/80 backdrop-blur-md p-3 sm:p-4"
          onClick={onClose}
        >
          <motion.div
            key="lightbox-dialog"
            initial={{ opacity: 0, scale: 0.9, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 8 }}
            transition={SPRING_SNAPPY}
            className="w-full max-w-2xl max-h-[92dvh] overflow-y-auto rounded-3xl border border-[#D6E6FF] dark:border-[#2B7FFF]/30 bg-white dark:bg-[#13224A] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header with ThemeToggle */}
            <div className="flex items-center justify-between gap-3 border-b border-[#D6E6FF] dark:border-[#2B7FFF]/20 px-5 py-3.5">
              <div className="flex items-center gap-2 min-w-0">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#F0F6FF] dark:bg-[#1A2D5E] text-[#1A6BFF] dark:text-[#2B7FFF]">
                  {item.type === 'video' ? (
                    <Film className="h-4 w-4" />
                  ) : (
                    <ImageIcon className="h-4 w-4" />
                  )}
                </span>
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-bold text-[#0A1E5C] dark:text-white">
                    {item.title}
                  </h3>
                  <p className="truncate text-xs text-[#0A1E5C]/60 dark:text-white/60">
                    {item.eventName}
                    {hasNav ? ` · ${currentIndex + 1} / ${items.length}` : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <ThemeToggle compact />
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full p-2 text-[#0A1E5C]/70 hover:bg-[#F0F6FF] dark:text-white/70 dark:hover:bg-[#1A2D5E] transition"
                  aria-label="Close preview"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Media Preview with Next/Prev controls */}
            <div className="relative aspect-video bg-gradient-to-br from-[#0B2E8F] via-[#1A6BFF] to-[#0A1430] flex items-center justify-center overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.22, ease: EASE_SKIPER }}
                  className="h-full w-full flex items-center justify-center"
                >
                  {item.url.startsWith('blob:') && item.type === 'video' ? (
                    <video
                      src={item.url}
                      controls
                      autoPlay
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <>
                      <img
                        src={item.url}
                        alt={item.title}
                        className={`h-full w-full object-cover transition-transform duration-500 ${
                          playing ? 'scale-105' : ''
                        }`}
                      />
                      {item.type === 'video' && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0A1430]/35">
                          <motion.button
                            type="button"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.94 }}
                            transition={SPRING_POP}
                            onClick={() => setPlaying((p) => !p)}
                            className="flex h-16 w-16 items-center justify-center rounded-full bg-[#1A6BFF] text-white shadow-xl ring-4 ring-white/30 hover:bg-[#2B7FFF]"
                          >
                            {playing ? (
                              <Pause className="h-7 w-7 fill-white" />
                            ) : (
                              <Play className="h-7 w-7 fill-white ml-1" />
                            )}
                          </motion.button>
                          <span className="mt-3 rounded-full bg-[#0A1430]/75 px-3 py-1 text-xs font-semibold text-white">
                            {playing
                              ? 'Playing preview…'
                              : `Video · ${item.duration || '0:30'}`}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Prev / Next navigation buttons */}
              {hasNav && (
                <>
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.92 }}
                    onClick={goPrev}
                    aria-label="Previous media"
                    className="absolute left-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-[#0A1430]/70 hover:bg-[#1A6BFF] text-white backdrop-blur-sm shadow-lg transition-colors"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </motion.button>
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.92 }}
                    onClick={goNext}
                    aria-label="Next media"
                    className="absolute right-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-[#0A1430]/70 hover:bg-[#1A6BFF] text-white backdrop-blur-sm shadow-lg transition-colors"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </motion.button>
                </>
              )}
            </div>

            {/* Footer metadata */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 text-xs text-[#0A1E5C]/70 dark:text-white/70">
              <div className="flex items-center gap-4">
                <span className="inline-flex items-center gap-1.5 font-medium">
                  <User className="h-3.5 w-3.5 text-[#1A6BFF] dark:text-[#2B7FFF]" />
                  {item.uploadedBy}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-[#1A6BFF] dark:text-[#2B7FFF]" />
                  {item.uploadedAt}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={downloading}
                  onClick={async () => {
                    if (!item) return;
                    setDownloading(true);
                    await downloadMediaFile(item);
                    setDownloading(false);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#1A6BFF] hover:bg-[#2B7FFF] disabled:opacity-60 px-3.5 py-1.5 text-xs font-extrabold text-white shadow-sm transition active:scale-95"
                >
                  {downloading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Download className="h-3.5 w-3.5" />
                  )}
                  {downloading ? 'Downloading…' : 'Download'}
                </button>
                <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-[#F0F6FF] dark:bg-[#1A2D5E] px-3 py-1 font-semibold text-[#1A6BFF] dark:text-[#2B7FFF]">
                  <img src="./favicon.svg" alt="" className="h-4 w-4" />
                  Monte Media Vault
                </span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};
