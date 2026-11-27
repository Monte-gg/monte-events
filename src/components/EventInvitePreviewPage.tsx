import React from 'react';
import {
  ArrowRight,
  Calendar,
  MapPin,
  ShieldCheck,
  Sparkles,
  Users,
  Wallet,
} from 'lucide-react';
import { motion } from 'motion/react';
import { PublicInvitePreview } from '../types';
import { formatDateShort, formatKES } from '../data/sampleData';
import { MonteLogo } from './MonteLogo';
import { ThemeToggle } from './ThemeToggle';
import { EASE_SKIPER, MagneticButton } from './MotionPrimitives';

interface EventInvitePreviewPageProps {
  preview: PublicInvitePreview;
  isSignedIn: boolean;
  joining?: boolean;
  onJoinEvent: () => void;
  onDismiss: () => void;
}

export const EventInvitePreviewPage: React.FC<EventInvitePreviewPageProps> = ({
  preview,
  isSignedIn,
  joining = false,
  onJoinEvent,
  onDismiss,
}) => {
  const spotsLeft = Math.max(0, preview.maxGuests - preview.paidCount);

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-gradient-to-br from-[#F0F6FF] via-white to-[#D6E6FF] dark:from-[#0A1430] dark:via-[#0B1A3A] dark:to-[#0B2E8F]/40 flex flex-col items-center justify-center px-4 py-8 transition-colors duration-300">
      <div className="pointer-events-none absolute -top-24 -left-24 h-80 w-80 rounded-full bg-[#1A6BFF]/15 blur-3xl dark:bg-[#2B7FFF]/20" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-[#2B7FFF]/20 blur-3xl dark:bg-[#1A6BFF]/20" />

      <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between">
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-full border border-[#D6E6FF] dark:border-[#2B7FFF]/30 bg-white/85 dark:bg-[#13224A] px-3.5 py-1.5 text-xs font-bold text-[#0A1E5C] dark:text-white hover:border-[#1A6BFF] transition"
        >
          Back to App
        </button>
        <ThemeToggle />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.3, ease: EASE_SKIPER }}
        className="relative z-10 w-full max-w-lg mt-10 space-y-5"
      >
        <div className="flex justify-center">
          <MonteLogo size="sm" layout="horizontal" />
        </div>

        <div className="overflow-hidden rounded-3xl border border-[#D6E6FF] dark:border-[#2B7FFF]/30 bg-white dark:bg-[#13224A] shadow-monte dark:shadow-monte-dark">
          {/* Event Cover */}
          <div
            className={`relative h-48 sm:h-56 bg-gradient-to-br ${preview.coverGradient} overflow-hidden`}
          >
            {preview.coverImage && (
              <img
                src={preview.coverImage}
                alt={preview.name}
                className="h-full w-full object-cover opacity-85"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0A1430]/90 via-[#0A1430]/30 to-transparent" />
            <div className="absolute top-3.5 left-3.5 right-3.5 flex items-center justify-between gap-2">
              <span className="rounded-full bg-[#1A6BFF] px-3 py-1 text-xs font-extrabold text-white">
                {preview.customType || preview.type}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/15 backdrop-blur-sm px-3 py-1 text-xs font-bold text-white">
                <ShieldCheck className="h-3.5 w-3.5 text-[#D6E6FF]" />
                Hosted by {preview.createdBy}
              </span>
            </div>
            <div className="absolute bottom-4 left-5 right-5 text-white">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#D6E6FF]">
                You’re Invited!
              </p>
              <h1 className="text-xl sm:text-2xl font-extrabold leading-tight mt-0.5">
                {preview.name}
              </h1>
            </div>
          </div>

          {/* Details */}
          <div className="p-6 space-y-5">
            {preview.description && (
              <p className="text-xs sm:text-sm text-[#0A1E5C]/75 dark:text-white/75 leading-relaxed">
                {preview.description}
              </p>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-[#F0F6FF] dark:bg-[#0B1A3A] p-3">
                <p className="text-[11px] font-bold text-[#0A1E5C]/60 dark:text-white/60 inline-flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-[#1A6BFF]" />
                  Date
                </p>
                <p className="mt-0.5 text-sm font-extrabold text-[#0A1E5C] dark:text-white">
                  {formatDateShort(preview.date)}
                </p>
              </div>
              <div className="rounded-2xl bg-[#F0F6FF] dark:bg-[#0B1A3A] p-3">
                <p className="text-[11px] font-bold text-[#0A1E5C]/60 dark:text-white/60 inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-[#1A6BFF]" />
                  Location
                </p>
                <p className="mt-0.5 text-sm font-extrabold text-[#0A1E5C] dark:text-white truncate">
                  {preview.location}
                </p>
              </div>
              <div className="rounded-2xl bg-[#F0F6FF] dark:bg-[#0B1A3A] p-3">
                <p className="text-[11px] font-bold text-[#0A1E5C]/60 dark:text-white/60 inline-flex items-center gap-1">
                  <Wallet className="h-3.5 w-3.5 text-[#1A6BFF]" />
                  Cost / Person
                </p>
                <p className="mt-0.5 text-sm font-extrabold text-[#1A6BFF] dark:text-[#2B7FFF]">
                  {formatKES(preview.costPerPerson)}
                </p>
              </div>
              <div className="rounded-2xl bg-[#F0F6FF] dark:bg-[#0B1A3A] p-3">
                <p className="text-[11px] font-bold text-[#0A1E5C]/60 dark:text-white/60 inline-flex items-center gap-1">
                  <Users className="h-3.5 w-3.5 text-[#1A6BFF]" />
                  Availability
                </p>
                <p className="mt-0.5 text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
                  {spotsLeft} {spotsLeft === 1 ? 'spot' : 'spots'} left
                </p>
              </div>
            </div>

            <MagneticButton
              type="button"
              onClick={onJoinEvent}
              className="monte-shimmer-btn relative overflow-hidden w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-[#1A6BFF] hover:bg-[#2B7FFF] py-3.5 px-6 text-sm font-extrabold text-white shadow-monte transition-colors"
            >
              <Sparkles className="h-4 w-4" />
              <span>
                {joining
                  ? 'Joining Event…'
                  : isSignedIn
                  ? 'Join This Event'
                  : 'Sign In to Join This Event'}
              </span>
              <ArrowRight className="h-4 w-4" />
            </MagneticButton>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
