import React, { useMemo, useRef, useState } from 'react';
import { Film, Image as ImageIcon, Play, UploadCloud } from 'lucide-react';
import { MediaItem, MonteEvent, UserProfile } from '../types';
import { AnimatePresence, motion } from 'motion/react';
import { uploadFileToStorage } from '../lib/monteService';
import { ThemeToggle } from './ThemeToggle';
import { EASE_SKIPER, SPRING_POP, SPRING_SNAPPY } from './MotionPrimitives';

interface MediaVaultPageProps {
  events: MonteEvent[];
  media: MediaItem[];
  user: UserProfile;
  onUploadMedia: (eventId: string, items: MediaItem[]) => void;
  onSelectMedia: (item: MediaItem) => void;
  onShowToast: (msg: string) => void;
}

export const MediaVaultPage: React.FC<MediaVaultPageProps> = ({
  events,
  media,
  user,
  onUploadMedia,
  onSelectMedia,
  onShowToast,
}) => {
  const [kindFilter, setKindFilter] = useState<'all' | 'photo' | 'video'>('all');
  const [eventFilter, setEventFilter] = useState<string>('all');
  const [uploadTargetId, setUploadTargetId] = useState<string>(events[0]?.id || '');
  const fileRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    return media.filter((m) => {
      if (kindFilter !== 'all' && m.type !== kindFilter) return false;
      if (eventFilter !== 'all' && m.eventId !== eventFilter) return false;
      return true;
    });
  }, [media, kindFilter, eventFilter]);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (user.memberSince === 'Preview Mode') {
      onUploadMedia(uploadTargetId || 'preview', []);
      return;
    }
    const targetEvent = events.find((e) => e.id === uploadTargetId) || events[0];
    if (!targetEvent) return;
    const fileArray = Array.from(files);
    const newItems: MediaItem[] = await Promise.all(
      fileArray.map(async (file, idx) => {
        const isVideo = file.type.startsWith('video/');
        const publicUrl = await uploadFileToStorage(file, `events/${targetEvent.id}`);
        return {
          id: `vault-${Date.now()}-${idx}`,
          eventId: targetEvent.id,
          eventName: targetEvent.name,
          type: isVideo ? 'video' : 'photo',
          url: publicUrl,
          thumbnail: isVideo
            ? 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80'
            : publicUrl,
          title: file.name.replace(/\.[^/.]+$/, ''),
          uploadedBy: user.name,
          uploadedAt: 'Just now',
          duration: isVideo ? '0:28' : undefined,
        };
      })
    );
    onUploadMedia(targetEvent.id, newItems);
    onShowToast(`Added ${newItems.length} item(s) to ${targetEvent.name}!`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-slide-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0A1E5C] dark:text-white">
            Your Media Vault
          </h1>
          <p className="text-xs sm:text-sm text-[#0A1E5C]/65 dark:text-white/65">
            Videos &amp; photos from all your Monte Events rooms live here.
          </p>
        </div>
        <div className="hidden sm:block">
          <ThemeToggle />
        </div>
      </div>

      {/* Upload bar */}
      <div className="rounded-3xl border-2 border-dashed border-[#1A6BFF]/40 bg-white dark:bg-[#13224A] p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <input
          ref={fileRef}
          type="file"
          accept="image/*,video/*"
          multiple
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
        />
        <div className="flex items-center gap-3.5">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#F0F6FF] dark:bg-[#0B1A3A] text-[#1A6BFF] dark:text-[#2B7FFF]">
            <UploadCloud className="h-6 w-6" />
          </span>
          <div>
            <h2 className="text-sm sm:text-base font-extrabold text-[#0A1E5C] dark:text-white">
              Upload memories to an Event Room
            </h2>
            <p className="text-xs text-[#0A1E5C]/65 dark:text-white/65">
              Pick the event below and drop photos or videos straight into the shared vault.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <select
            value={uploadTargetId}
            onChange={(e) => setUploadTargetId(e.target.value)}
            className="rounded-xl border border-[#D6E6FF] dark:border-[#2B7FFF]/30 bg-[#F0F6FF] dark:bg-[#0B1A3A] px-3 py-2.5 text-xs font-bold text-[#0A1E5C] dark:text-white focus:outline-none"
          >
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-xl bg-[#1A6BFF] hover:bg-[#2B7FFF] px-5 py-2.5 text-xs sm:text-sm font-extrabold text-white shadow-sm transition"
          >
            <UploadCloud className="h-4 w-4" />
            Upload Files
          </button>
        </div>
      </div>

      {/* Filters with gliding active pill */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-[#D6E6FF] dark:border-[#2B7FFF]/25 bg-white dark:bg-[#13224A] p-1">
          {(['all', 'photo', 'video'] as const).map((k) => {
            const active = kindFilter === k;
            return (
              <button
                key={k}
                type="button"
                onClick={() => setKindFilter(k)}
                className={`relative inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-extrabold capitalize transition-colors ${
                  active
                    ? 'text-white'
                    : 'text-[#0A1E5C]/75 dark:text-white/75 hover:text-[#1A6BFF] dark:hover:text-[#2B7FFF]'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="media-filter-pill"
                    transition={SPRING_SNAPPY}
                    className="absolute inset-0 rounded-full bg-[#1A6BFF] shadow-sm"
                  />
                )}
                <span className="relative z-10 inline-flex items-center gap-1.5">
                  {k === 'photo' && <ImageIcon className="h-3.5 w-3.5" />}
                  {k === 'video' && <Film className="h-3.5 w-3.5" />}
                  {k === 'all' ? 'All Media' : `${k}s`}
                </span>
              </button>
            );
          })}
        </div>

        <select
          value={eventFilter}
          onChange={(e) => setEventFilter(e.target.value)}
          className="rounded-full border border-[#D6E6FF] dark:border-[#2B7FFF]/30 bg-white dark:bg-[#13224A] px-4 py-1.5 text-xs font-bold text-[#0A1E5C] dark:text-white focus:outline-none"
        >
          <option value="all">All Events</option>
          {events.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
      </div>

      {/* Animated Reflow & Cross-Fade Grid or Empty State */}
      {filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-[#D6E6FF] dark:border-[#2B7FFF]/30 bg-white dark:bg-[#13224A] p-12 text-center space-y-2">
          <p className="text-sm font-extrabold text-[#0A1E5C] dark:text-white">
            No media uploaded yet
          </p>
          <p className="text-xs text-[#0A1E5C]/65 dark:text-white/65">
            {events.length === 0
              ? 'Create an event room first, then upload photos and videos from your events.'
              : 'Select an event above and upload photos or videos to populate your vault.'}
          </p>
        </div>
      ) : (
        <motion.div
          layout
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
        >
        <AnimatePresence mode="popLayout">
          {filtered.map((item) => (
            <motion.button
              layout
              key={item.id}
              type="button"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              whileHover={{ y: -3, scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              transition={{ duration: 0.24, ease: EASE_SKIPER }}
              onClick={() => onSelectMedia(item)}
              className="group relative aspect-[4/3] overflow-hidden rounded-2xl border border-[#D6E6FF] dark:border-[#2B7FFF]/25 bg-[#0B2E8F] text-left shadow-sm"
            >
              <img
                src={item.thumbnail}
                alt={item.title}
                className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0A1430]/85 via-transparent to-transparent" />
              {item.type === 'video' && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <motion.span
                    whileHover={{ scale: 1.2 }}
                    transition={SPRING_POP}
                    className="flex h-12 w-12 items-center justify-center rounded-full bg-[#1A6BFF]/90 text-white shadow-lg ring-4 ring-white/30 group-hover:scale-115 transition-transform"
                  >
                    <Play className="h-5 w-5 fill-white ml-0.5" />
                  </motion.span>
                </div>
              )}
              {item.duration && (
                <span className="absolute top-2.5 right-2.5 rounded-full bg-[#0A1430]/75 px-2.5 py-0.5 text-[10px] font-bold text-white">
                  {item.duration}
                </span>
              )}
              <div className="absolute bottom-3 left-3 right-3">
                <p className="truncate text-xs sm:text-sm font-bold text-white">
                  {item.title}
                </p>
                <p className="truncate text-[11px] text-white/75">
                  {item.eventName} • {item.uploadedBy}
                </p>
              </div>
            </motion.button>
          ))}
        </AnimatePresence>
      </motion.div>
      )}
    </div>
  );
};
