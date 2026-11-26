import React, { useState } from 'react';
import { Play, Pause, X, Calendar, User, Film, Image as ImageIcon } from 'lucide-react';
import { MediaItem } from '../types';
import { ThemeToggle } from './ThemeToggle';

interface MediaLightboxProps {
  item: MediaItem | null;
  onClose: () => void;
}

export const MediaLightbox: React.FC<MediaLightboxProps> = ({ item, onClose }) => {
  const [playing, setPlaying] = useState(false);

  if (!item) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-[#0A1430]/80 backdrop-blur-md p-4"
      onClick={onClose}
    >
      <div
        className="animate-slide-up w-full max-w-2xl overflow-hidden rounded-3xl border border-[#D6E6FF] dark:border-[#2B7FFF]/30 bg-white dark:bg-[#13224A] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header with ThemeToggle */}
        <div className="flex items-center justify-between gap-3 border-b border-[#D6E6FF] dark:border-[#2B7FFF]/20 px-5 py-3.5">
          <div className="flex items-center gap-2 min-w-0">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#F0F6FF] dark:bg-[#1A2D5E] text-[#1A6BFF] dark:text-[#2B7FFF]">
              {item.type === 'video' ? <Film className="h-4 w-4" /> : <ImageIcon className="h-4 w-4" />}
            </span>
            <div className="min-w-0">
              <h3 className="truncate text-sm font-bold text-[#0A1E5C] dark:text-white">
                {item.title}
              </h3>
              <p className="truncate text-xs text-[#0A1E5C]/60 dark:text-white/60">
                {item.eventName}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <ThemeToggle compact />
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-[#0A1E5C]/70 hover:bg-[#F0F6FF] dark:text-white/70 dark:hover:bg-[#1A2D5E]"
              aria-label="Close preview"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Media Preview */}
        <div className="relative aspect-video bg-gradient-to-br from-[#0B2E8F] via-[#1A6BFF] to-[#0A1430] flex items-center justify-center overflow-hidden">
          {item.url.startsWith('blob:') && item.type === 'video' ? (
            <video src={item.url} controls autoPlay className="h-full w-full object-contain" />
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
                  <button
                    type="button"
                    onClick={() => setPlaying((p) => !p)}
                    className="flex h-16 w-16 items-center justify-center rounded-full bg-[#1A6BFF] text-white shadow-xl ring-4 ring-white/30 transition hover:scale-105 hover:bg-[#2B7FFF]"
                  >
                    {playing ? (
                      <Pause className="h-7 w-7 fill-white" />
                    ) : (
                      <Play className="h-7 w-7 fill-white ml-1" />
                    )}
                  </button>
                  <span className="mt-3 rounded-full bg-[#0A1430]/75 px-3 py-1 text-xs font-semibold text-white">
                    {playing ? 'Playing preview…' : `Video · ${item.duration || '0:30'}`}
                  </span>
                </div>
              )}
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
          <span className="rounded-full bg-[#F0F6FF] dark:bg-[#1A2D5E] px-3 py-1 font-semibold text-[#1A6BFF] dark:text-[#2B7FFF]">
            Monte Media Vault
          </span>
        </div>
      </div>
    </div>
  );
};
